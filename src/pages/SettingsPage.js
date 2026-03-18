import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function SettingsPage() {
  const [pgOwner, setPgOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const photoRef = useRef();
  const qrRef = useRef();

  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', pgName: '', address: '', city: '', state: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    upiId: '', qrCodeUrl: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const user = auth.currentUser;

  const planDetails = {
    basic: { name: 'Basic Plan', price: '₹499/month', color: '#4f46e5', bg: '#eef2ff', features: ['Up to 20 tenants', 'Rent Management', 'Electricity Bills', 'Basic Reports'] },
    standard: { name: 'Standard Plan', price: '₹999/month', color: '#059669', bg: '#ecfdf5', features: ['Up to 50 tenants', 'All Basic features', 'PDF Reports', 'WhatsApp Reminders'] },
    premium: { name: 'Premium Plan', price: '₹1999/month', color: '#d97706', bg: '#fffbeb', features: ['Unlimited tenants', 'All Standard features', 'Multi-property', 'Priority Support'] },
  };

  const fetchOwner = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'pgOwners', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setPgOwner(data);
        setProfileForm({
          name: data.name || '',
          phone: data.phone || '',
          pgName: data.pgName || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
        });
        setPaymentForm({
          upiId: data.upiId || '',
          qrCodeUrl: data.qrCodeUrl || '',
        });
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchOwner(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!profileForm.name) return showError('Name is required!');
    if (!profileForm.pgName) return showError('PG Name is required!');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pgOwners', user.uid), {
        name: profileForm.name,
        phone: profileForm.phone,
        pgName: profileForm.pgName,
        address: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
      });
      showSuccess('✅ Profile updated successfully!');
      fetchOwner();
    } catch (err) { showError('Failed to update profile!'); }
    setSaving(false);
  };

  // Save payment details
  const handleSavePayment = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pgOwners', user.uid), {
        upiId: paymentForm.upiId,
        qrCodeUrl: paymentForm.qrCodeUrl,
      });
      showSuccess('✅ Payment details updated!');
    } catch (err) { showError('Failed to update payment details!'); }
    setSaving(false);
  };

  // Upload profile photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showError('Photo must be under 2MB!');
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profilePhotos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'pgOwners', user.uid), { photoUrl: url });
      showSuccess('✅ Profile photo updated!');
      fetchOwner();
    } catch (err) { showError('Failed to upload photo!'); }
    setUploadingPhoto(false);
  };

  // Upload QR code
  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showError('QR Code must be under 2MB!');
    setUploadingQR(true);
    try {
      const storageRef = ref(storage, `qrCodes/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPaymentForm({ ...paymentForm, qrCodeUrl: url });
      await updateDoc(doc(db, 'pgOwners', user.uid), { qrCodeUrl: url });
      showSuccess('✅ QR Code uploaded!');
      fetchOwner();
    } catch (err) { showError('Failed to upload QR Code!'); }
    setUploadingQR(false);
  };

  // Change password
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) return showError('Enter current password!');
    if (!passwordForm.newPassword) return showError('Enter new password!');
    if (passwordForm.newPassword.length < 6) return showError('Password must be at least 6 characters!');
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      return showError('Passwords do not match!');
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('✅ Password changed successfully!');
    } catch (err) {
      if (err.code === 'auth/wrong-password') showError('Current password is incorrect!');
      else showError('Failed to change password!');
    }
    setSaving(false);
  };

  const currentPlan = pgOwner?.plan || 'basic';
  const plan = planDetails[currentPlan] || planDetails.basic;

  const tabs = [
    { id: 'profile', label: '👤 Profile', icon: '👤' },
    { id: 'payment', label: '💳 Payment', icon: '💳' },
    { id: 'password', label: '🔒 Password', icon: '🔒' },
    { id: 'plan', label: '⭐ Plan', icon: '⭐' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>Manage your PG and account settings</p>
        </div>
      </div>

      {/* Success / Error messages */}
      {successMsg && (
        <div style={styles.successBanner}>{successMsg}</div>
      )}
      {errorMsg && (
        <div style={styles.errorBanner}>{errorMsg}</div>
      )}

      <div style={styles.layout}>
        {/* Sidebar Tabs */}
        <div style={styles.tabSidebar}>
          {/* Profile Card */}
          {pgOwner && (
            <div style={styles.profileCard}>
              <div style={styles.photoWrapper}>
                {pgOwner.photoUrl ? (
                  <img src={pgOwner.photoUrl} alt="Profile"
                    style={styles.profilePhoto} />
                ) : (
                  <div style={styles.profileAvatar}>
                    {pgOwner.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button style={styles.photoEditBtn}
                  onClick={() => photoRef.current.click()}>
                  {uploadingPhoto ? '...' : '📷'}
                </button>
                <input ref={photoRef} type="file"
                  accept="image/*" style={{ display: 'none' }}
                  onChange={handlePhotoUpload} />
              </div>
              <div style={styles.profileCardName}>{pgOwner.name}</div>
              <div style={styles.profileCardPg}>{pgOwner.pgName}</div>
              <div style={{ ...styles.planTag, background: plan.bg, color: plan.color }}>
                ⭐ {plan.name}
              </div>
            </div>
          )}

          {/* Tab buttons */}
          {tabs.map(({ id, label }) => (
            <button key={id}
              style={{ ...styles.tabBtn, ...(activeTab === id ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : (
            <>
              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>👤 Profile Information</h2>
                  <p style={styles.cardSubtitle}>Update your personal and PG details</p>

                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Owner Name *</label>
                      <input style={styles.input} type="text"
                        placeholder="Your full name"
                        value={profileForm.name}
                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Phone Number</label>
                      <input style={styles.input} type="tel"
                        placeholder="10-digit mobile number"
                        value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                    </div>
                    <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>PG Name *</label>
                      <input style={styles.input} type="text"
                        placeholder="Name of your PG"
                        value={profileForm.pgName}
                        onChange={e => setProfileForm({ ...profileForm, pgName: e.target.value })} />
                    </div>
                    <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>PG Address</label>
                      <input style={styles.input} type="text"
                        placeholder="Full address"
                        value={profileForm.address}
                        onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>City</label>
                      <input style={styles.input} type="text"
                        placeholder="City"
                        value={profileForm.city}
                        onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>State</label>
                      <input style={styles.input} type="text"
                        placeholder="State"
                        value={profileForm.state}
                        onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} />
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div style={styles.emailInfo}>
                      📧 {user?.email} (cannot be changed)
                    </div>
                    <button style={styles.saveBtn}
                      onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : '💾 Save Profile'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PAYMENT TAB ── */}
              {activeTab === 'payment' && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>💳 Payment Details</h2>
                  <p style={styles.cardSubtitle}>Tenants will use these details to pay rent</p>

                  <div style={styles.formGrid}>
                    <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>UPI ID</label>
                      <input style={styles.input} type="text"
                        placeholder="e.g. yourname@upi or 9876543210@paytm"
                        value={paymentForm.upiId}
                        onChange={e => setPaymentForm({ ...paymentForm, upiId: e.target.value })} />
                    </div>
                  </div>

                  {/* QR Code Upload */}
                  <div style={styles.qrSection}>
                    <label style={styles.label}>Payment QR Code</label>
                    <div style={styles.qrBox}>
                      {paymentForm.qrCodeUrl ? (
                        <div style={styles.qrPreview}>
                          <img src={paymentForm.qrCodeUrl} alt="QR Code"
                            style={styles.qrImage} />
                          <button style={styles.qrChangeBtn}
                            onClick={() => qrRef.current.click()}>
                            🔄 Change QR Code
                          </button>
                        </div>
                      ) : (
                        <div style={styles.qrUploadBox}
                          onClick={() => qrRef.current.click()}>
                          <div style={styles.qrUploadIcon}>📱</div>
                          <div style={styles.qrUploadText}>
                            {uploadingQR ? 'Uploading...' : 'Click to upload QR Code'}
                          </div>
                          <div style={styles.qrUploadSub}>
                            PNG, JPG up to 2MB
                          </div>
                        </div>
                      )}
                      <input ref={qrRef} type="file"
                        accept="image/*" style={{ display: 'none' }}
                        onChange={handleQRUpload} />
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div />
                    <button style={styles.saveBtn}
                      onClick={handleSavePayment} disabled={saving}>
                      {saving ? 'Saving...' : '💾 Save Payment Details'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PASSWORD TAB ── */}
              {activeTab === 'password' && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>🔒 Change Password</h2>
                  <p style={styles.cardSubtitle}>Keep your account secure</p>

                  <div style={styles.formGridSingle}>
                    <div style={styles.field}>
                      <label style={styles.label}>Current Password</label>
                      <input style={styles.input} type="password"
                        placeholder="Enter current password"
                        value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>New Password</label>
                      <input style={styles.input} type="password"
                        placeholder="Minimum 6 characters"
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Confirm New Password</label>
                      <input style={styles.input} type="password"
                        placeholder="Re-enter new password"
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                    </div>
                  </div>

                  <div style={styles.passwordTips}>
                    <div style={styles.tipTitle}>💡 Password Tips</div>
                    <div style={styles.tip}>✅ At least 6 characters</div>
                    <div style={styles.tip}>✅ Mix letters and numbers</div>
                    <div style={styles.tip}>✅ Don't share with anyone</div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div />
                    <button style={styles.saveBtn}
                      onClick={handleChangePassword} disabled={saving}>
                      {saving ? 'Changing...' : '🔒 Change Password'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PLAN TAB ── */}
              {activeTab === 'plan' && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>⭐ Plan & Subscription</h2>
                  <p style={styles.cardSubtitle}>Your current plan and available upgrades</p>

                  {/* Current Plan */}
                  <div style={{ ...styles.currentPlanBox, background: plan.bg, border: `2px solid ${plan.color}` }}>
                    <div style={styles.currentPlanLeft}>
                      <div style={{ ...styles.currentPlanBadge, color: plan.color }}>
                        CURRENT PLAN
                      </div>
                      <div style={{ ...styles.currentPlanName, color: plan.color }}>
                        {plan.name}
                      </div>
                      <div style={styles.currentPlanPrice}>{plan.price}</div>
                    </div>
                    <div style={styles.currentPlanFeatures}>
                      {plan.features.map(f => (
                        <div key={f} style={styles.featureItem}>✅ {f}</div>
                      ))}
                    </div>
                  </div>

                  {/* All Plans */}
                  <h3 style={styles.allPlansTitle}>Available Plans</h3>
                  <div style={styles.plansGrid}>
                    {Object.entries(planDetails).map(([key, p]) => (
                      <div key={key} style={{
                        ...styles.planCard,
                        border: currentPlan === key
                          ? `2px solid ${p.color}`
                          : '1.5px solid #e2e8f0',
                        background: currentPlan === key ? p.bg : 'white',
                      }}>
                        {currentPlan === key && (
                          <div style={{ ...styles.activePlanTag, background: p.color }}>
                            ✓ Active
                          </div>
                        )}
                        <div style={{ ...styles.planName, color: p.color }}>{p.name}</div>
                        <div style={styles.planPrice}>{p.price}</div>
                        <div style={styles.planFeaturesList}>
                          {p.features.map(f => (
                            <div key={f} style={styles.planFeature}>✅ {f}</div>
                          ))}
                        </div>
                        {currentPlan !== key && (
                          <button style={{ ...styles.upgradeBtn, background: p.color }}>
                            Upgrade to {p.name}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={styles.supportNote}>
                    📞 To upgrade your plan, contact us at support@pgpilots.in
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '0' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  successBanner: { background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#059669', padding: '14px 20px', borderRadius: '12px', fontWeight: '600', marginBottom: '20px', fontSize: '14px' },
  errorBanner: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '14px 20px', borderRadius: '12px', fontWeight: '600', marginBottom: '20px', fontSize: '14px' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  tabSidebar: { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  profileCard: { background: 'white', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '8px' },
  photoWrapper: { position: 'relative', display: 'inline-block', marginBottom: '12px' },
  profilePhoto: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0' },
  profileAvatar: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '28px' },
  photoEditBtn: { position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderRadius: '50%', background: '#1e293b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profileCardName: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  profileCardPg: { fontSize: '12px', color: '#94a3b8', marginTop: '2px', marginBottom: '10px' },
  planTag: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  tabBtn: { padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#64748b', textAlign: 'left' },
  tabBtnActive: { background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none' },
  content: { flex: 1 },
  card: { background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' },
  cardSubtitle: { color: '#94a3b8', fontSize: '13px', marginBottom: '24px', marginTop: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  formGridSingle: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' },
  emailInfo: { fontSize: '13px', color: '#94a3b8' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  qrSection: { marginBottom: '24px' },
  qrBox: { marginTop: '8px' },
  qrPreview: { display: 'flex', alignItems: 'center', gap: '20px' },
  qrImage: { width: '120px', height: '120px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px' },
  qrChangeBtn: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  qrUploadBox: { border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' },
  qrUploadIcon: { fontSize: '40px', marginBottom: '8px' },
  qrUploadText: { fontSize: '14px', fontWeight: '600', color: '#475569' },
  qrUploadSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  passwordTips: { background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px' },
  tipTitle: { fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' },
  tip: { fontSize: '13px', color: '#64748b', marginBottom: '4px' },
  currentPlanBox: { borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  currentPlanLeft: { flex: 1 },
  currentPlanBadge: { fontSize: '11px', fontWeight: '800', letterSpacing: '1px', marginBottom: '6px' },
  currentPlanName: { fontSize: '22px', fontWeight: '800', marginBottom: '4px' },
  currentPlanPrice: { fontSize: '16px', color: '#64748b', fontWeight: '600' },
  currentPlanFeatures: { flex: 1 },
  featureItem: { fontSize: '13px', color: '#475569', marginBottom: '6px' },
  allPlansTitle: { fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' },
  planCard: { borderRadius: '14px', padding: '20px', position: 'relative', overflow: 'hidden' },
  activePlanTag: { position: 'absolute', top: '12px', right: '12px', color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' },
  planName: { fontSize: '15px', fontWeight: '800', marginBottom: '4px' },
  planPrice: { fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '12px' },
  planFeaturesList: { marginBottom: '16px' },
  planFeature: { fontSize: '12px', color: '#475569', marginBottom: '4px' },
  upgradeBtn: { width: '100%', padding: '10px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  supportNote: { fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '10px' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
};

export default SettingsPage;