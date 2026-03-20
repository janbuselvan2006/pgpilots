import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .st-root { font-family:'DM Sans',sans-serif; background:#f0f2f8; min-height:100vh; }

  /* ── Top bar ── */
  .st-topbar {
    background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
    padding:20px 20px 28px; position:relative; overflow:hidden;
  }
  .st-topbar::after {
    content:''; position:absolute; width:200px; height:200px; border-radius:50%;
    background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none;
  }
  .st-topbar-row { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; }
  .st-page-title { font-size:22px; font-weight:800; color:#fff; margin:0 0 3px; }
  .st-page-sub   { font-size:12px; color:rgba(255,255,255,0.5); font-weight:500; }

  /* ── Profile chip in topbar ── */
  .st-profile-chip {
    display:flex; align-items:center; gap:10px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
    border-radius:14px; padding:10px 14px; position:relative; z-index:1;
    margin-top:16px;
  }
  .st-profile-avatar {
    width:44px; height:44px; border-radius:12px;
    background:linear-gradient(135deg,#e94560,#0f3460);
    display:flex; align-items:center; justify-content:center;
    color:white; font-weight:800; font-size:18px; flex-shrink:0; overflow:hidden;
  }
  .st-profile-avatar img { width:100%; height:100%; object-fit:cover; }
  .st-profile-name { font-size:14px; font-weight:800; color:white; }
  .st-profile-pg   { font-size:11px; color:rgba(255,255,255,0.5); margin-top:2px; }
  .st-plan-tag     { font-size:10px; font-weight:800; padding:3px 10px; border-radius:20px; display:inline-block; margin-top:4px; }
  .st-photo-btn {
    margin-left:auto; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2);
    color:white; border-radius:10px; padding:7px 12px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent;
    white-space:nowrap;
  }

  /* ── Content ── */
  .st-content { padding:16px 16px 100px; }

  /* ── Tab strip ── */
  .st-tabs {
    display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:18px;
    -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  .st-tabs::-webkit-scrollbar { display:none; }
  .st-tab {
    white-space:nowrap; padding:10px 18px; border-radius:20px;
    border:1.5px solid #e2e8f0; background:white;
    font-size:13px; font-weight:700; color:#64748b;
    cursor:pointer; font-family:inherit; flex-shrink:0;
    -webkit-tap-highlight-color:transparent; transition:all 0.15s;
  }
  .st-tab.active { background:linear-gradient(135deg,#e94560,#0f3460); color:white; border-color:transparent; }

  /* ── Alert banners ── */
  .st-success { background:#f0fdf4; border:1px solid #bbf7d0; color:#059669; padding:12px 16px; border-radius:12px; font-weight:600; margin-bottom:14px; font-size:13px; }
  .st-error   { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px 16px; border-radius:12px; font-weight:600; margin-bottom:14px; font-size:13px; }

  /* ── Section card ── */
  .st-card { background:white; border-radius:18px; padding:20px; margin-bottom:14px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
  .st-card-title { font-size:16px; font-weight:800; color:#1a1a2e; margin:0 0 4px; }
  .st-card-sub   { font-size:12px; color:#94a3b8; margin-bottom:18px; }

  /* ── Form fields ── */
  .st-field { margin-bottom:14px; }
  .st-label { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }
  .st-input {
    width:100%; padding:13px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit; color:#1a1a2e; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition:border-color 0.2s;
  }
  .st-input:focus { border-color:#e94560; background:white; }
  .st-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  /* Pass wrap */
  .st-pass-wrap { position:relative; }
  .st-pass-input {
    width:100%; padding:13px 48px 13px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit; color:#1a1a2e; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none; transition:border-color 0.2s;
  }
  .st-pass-input:focus { border-color:#e94560; background:white; }
  .st-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:18px; user-select:none; -webkit-tap-highlight-color:transparent; }

  /* ── Save button ── */
  .st-save-btn {
    width:100%; padding:15px;
    background:linear-gradient(135deg,#e94560,#0f3460);
    color:white; border:none; border-radius:14px;
    font-size:15px; font-weight:700; font-family:inherit;
    cursor:pointer; margin-top:6px;
    box-shadow:0 4px 14px rgba(233,69,96,0.3);
    -webkit-tap-highlight-color:transparent;
    transition:opacity 0.2s,transform 0.1s;
  }
  .st-save-btn:active { transform:scale(0.98); opacity:0.9; }
  .st-save-btn:disabled { opacity:0.6; cursor:not-allowed; }

  /* ── Email info ── */
  .st-email-info { font-size:12px; color:#94a3b8; padding:10px 14px; background:#f8fafc; border-radius:10px; margin-bottom:14px; }

  /* ── QR upload ── */
  .st-qr-upload {
    border:2px dashed #e2e8f0; border-radius:14px; padding:28px 20px;
    text-align:center; cursor:pointer; background:#fafbff;
    -webkit-tap-highlight-color:transparent;
  }
  .st-qr-upload:active { background:#f1f5f9; }
  .st-qr-icon  { font-size:36px; margin-bottom:8px; }
  .st-qr-text  { font-size:14px; font-weight:700; color:#475569; }
  .st-qr-sub   { font-size:12px; color:#94a3b8; margin-top:4px; }
  .st-qr-preview { display:flex; align-items:center; gap:16px; }
  .st-qr-img { width:100px; height:100px; object-fit:contain; border:1px solid #e2e8f0; border-radius:12px; padding:6px; }
  .st-qr-change { padding:10px 16px; background:#f1f5f9; color:#475569; border:none; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; -webkit-tap-highlight-color:transparent; }

  /* ── Password tips ── */
  .st-tips { background:#f8fafc; border-radius:12px; padding:14px; margin-bottom:14px; }
  .st-tip-title { font-size:12px; font-weight:800; color:#475569; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.3px; }
  .st-tip { font-size:13px; color:#64748b; margin-bottom:4px; }

  /* ── Plan cards ── */
  .st-current-plan {
    border-radius:16px; padding:18px; margin-bottom:18px;
    display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;
  }
  .st-cp-badge { font-size:10px; font-weight:800; letter-spacing:1px; margin-bottom:4px; text-transform:uppercase; }
  .st-cp-name  { font-size:20px; font-weight:800; margin-bottom:4px; }
  .st-cp-price { font-size:14px; color:#64748b; font-weight:600; }
  .st-cp-features { display:flex; flex-direction:column; gap:4px; }
  .st-cp-feature  { font-size:13px; color:#475569; }

  .st-plans-grid { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
  @media(min-width:640px){ .st-plans-grid { display:grid; grid-template-columns:repeat(3,1fr); } }

  .st-plan-card { border-radius:14px; padding:18px; position:relative; overflow:hidden; }
  .st-plan-active-tag { position:absolute; top:10px; right:10px; color:white; font-size:10px; font-weight:800; padding:3px 8px; border-radius:20px; }
  .st-plan-name  { font-size:14px; font-weight:800; margin-bottom:3px; }
  .st-plan-price { font-size:13px; color:#64748b; font-weight:600; margin-bottom:10px; }
  .st-plan-features { margin-bottom:14px; }
  .st-plan-feat  { font-size:12px; color:#475569; margin-bottom:3px; }
  .st-upgrade-btn { width:100%; padding:10px; color:white; border:none; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent; }

  .st-support { font-size:13px; color:#94a3b8; text-align:center; padding:14px; background:#f8fafc; border-radius:10px; }

  /* ── Loading ── */
  .st-loading { text-align:center; padding:50px; color:#94a3b8; }
  .st-spinner { width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#e94560; border-radius:50%; animation:stspin 0.7s linear infinite; margin:0 auto 12px; }
  @keyframes stspin { to{transform:rotate(360deg)} }

  @media(min-width:640px){
    .st-content { padding:24px 24px 60px; }
  }
`;

export default function SettingsPage() {
  const [pgOwner, setPgOwner]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingQR, setUploadingQR]       = useState(false);

  // show/hide password toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const photoRef = useRef();
  const qrRef    = useRef();

  const [profileForm, setProfileForm] = useState({
    name:'', phone:'', pgName:'', address:'', city:'', state:'',
  });
  const [paymentForm, setPaymentForm] = useState({ upiId:'', qrCodeUrl:'' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword:'', newPassword:'', confirmPassword:'',
  });

  const user = auth.currentUser;

  const planDetails = {
    trial:    { name:'Trial Plan',    price:'Free · 14 days',  color:'#64748b', bg:'#f8fafc',  features:['All features','Up to 50 tenants','14 day trial'] },
    basic:    { name:'Basic Plan',    price:'₹499/month',      color:'#4f46e5', bg:'#eef2ff',  features:['Up to 20 tenants','Rent Management','Electricity Bills','Basic Reports'] },
    standard: { name:'Standard Plan', price:'₹999/month',      color:'#059669', bg:'#ecfdf5',  features:['Up to 50 tenants','All Basic features','PDF Reports','WhatsApp Reminders'] },
    premium:  { name:'Premium Plan',  price:'₹1999/month',     color:'#d97706', bg:'#fffbeb',  features:['Unlimited tenants','All Standard features','Multi-property','Priority Support'] },
  };

  const fetchOwner = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db,'pgOwners',user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setPgOwner(d);
        setProfileForm({ name:d.ownerName||d.name||'', phone:d.phone||'', pgName:d.pgName||'', address:d.address||'', city:d.city||'', state:d.state||'' });
        setPaymentForm({ upiId:d.upiId||'', qrCodeUrl:d.qrCodeUrl||'' });
      }
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{ fetchOwner(); },[]);

  const showOk  = (msg) => { setSuccessMsg(msg); setErrorMsg('');   setTimeout(()=>setSuccessMsg(''),3000); };
  const showErr = (msg) => { setErrorMsg(msg);   setSuccessMsg(''); setTimeout(()=>setErrorMsg(''),4000); };

  const handleSaveProfile = async () => {
    if (!profileForm.name)   return showErr('Name is required!');
    if (!profileForm.pgName) return showErr('PG Name is required!');
    setSaving(true);
    try {
      await updateDoc(doc(db,'pgOwners',user.uid), {
        ownerName:profileForm.name, name:profileForm.name,
        phone:profileForm.phone, pgName:profileForm.pgName,
        address:profileForm.address, city:profileForm.city, state:profileForm.state,
      });
      showOk('✅ Profile updated successfully!');
      fetchOwner();
    } catch { showErr('Failed to update profile!'); }
    setSaving(false);
  };

  const handleSavePayment = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,'pgOwners',user.uid), { upiId:paymentForm.upiId, qrCodeUrl:paymentForm.qrCodeUrl });
      showOk('✅ Payment details updated!');
    } catch { showErr('Failed to update payment details!'); }
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return showErr('Photo must be under 2MB!');
    setUploadingPhoto(true);
    try {
      const r = ref(storage,`profilePhotos/${user.uid}`);
      await uploadBytes(r,file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db,'pgOwners',user.uid),{photoUrl:url});
      showOk('✅ Profile photo updated!');
      fetchOwner();
    } catch { showErr('Failed to upload photo!'); }
    setUploadingPhoto(false);
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return showErr('QR Code must be under 2MB!');
    setUploadingQR(true);
    try {
      const r = ref(storage,`qrCodes/${user.uid}`);
      await uploadBytes(r,file);
      const url = await getDownloadURL(r);
      setPaymentForm(p=>({...p,qrCodeUrl:url}));
      await updateDoc(doc(db,'pgOwners',user.uid),{qrCodeUrl:url});
      showOk('✅ QR Code uploaded!');
      fetchOwner();
    } catch { showErr('Failed to upload QR Code!'); }
    setUploadingQR(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) return showErr('Enter current password!');
    if (!passwordForm.newPassword)      return showErr('Enter new password!');
    if (passwordForm.newPassword.length < 6) return showErr('Password must be at least 6 characters!');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return showErr('Passwords do not match!');
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);
      setPasswordForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      showOk('✅ Password changed successfully!');
    } catch(err) {
      if (err.code==='auth/wrong-password') showErr('Current password is incorrect!');
      else showErr('Failed to change password!');
    }
    setSaving(false);
  };

  const currentPlan = pgOwner?.plan || 'basic';
  const plan = planDetails[currentPlan] || planDetails.basic;

  const tabs = [
    {id:'profile',  label:'👤 Profile'},
    {id:'payment',  label:'💳 Payment'},
    {id:'password', label:'🔒 Password'},
    {id:'plan',     label:'⭐ Plan'},
  ];

  return (
    <>
      <style>{css}</style>
      <div className="st-root">

        {/* Top bar */}
        <div className="st-topbar">
          <div className="st-topbar-row">
            <div>
              <h1 className="st-page-title">Settings</h1>
              <p className="st-page-sub">Manage your account &amp; PG details</p>
            </div>
          </div>

          {/* Profile chip */}
          {pgOwner && (
            <div className="st-profile-chip">
              <div className="st-profile-avatar">
                {pgOwner.photoUrl
                  ? <img src={pgOwner.photoUrl} alt="profile"/>
                  : (pgOwner.ownerName||pgOwner.name||'P').charAt(0).toUpperCase()
                }
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div className="st-profile-name">{pgOwner.ownerName||pgOwner.name}</div>
                <div className="st-profile-pg">{pgOwner.pgName}</div>
                <span className="st-plan-tag" style={{background:plan.bg,color:plan.color}}>
                  ⭐ {plan.name}
                </span>
              </div>
              <button className="st-photo-btn" onClick={()=>photoRef.current.click()}>
                {uploadingPhoto ? '⏳' : '📷 Photo'}
              </button>
              <input ref={photoRef} type="file" accept="image/*"
                style={{display:'none'}} onChange={handlePhotoUpload} />
            </div>
          )}
        </div>

        <div className="st-content">

          {/* Alerts */}
          {successMsg && <div className="st-success">{successMsg}</div>}
          {errorMsg   && <div className="st-error">{errorMsg}</div>}

          {/* Tab strip */}
          <div className="st-tabs">
            {tabs.map(({id,label})=>(
              <button key={id} className={`st-tab${activeTab===id?' active':''}`}
                onClick={()=>setActiveTab(id)}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="st-loading"><div className="st-spinner"/>Loading…</div>
          ) : (
            <>

              {/* ── PROFILE ── */}
              {activeTab==='profile' && (
                <div className="st-card">
                  <h2 className="st-card-title">👤 Profile Information</h2>
                  <p className="st-card-sub">Update your personal and PG details</p>

                  <div className="st-row">
                    <div className="st-field">
                      <label className="st-label">Owner Name *</label>
                      <input className="st-input" type="text" placeholder="Your full name"
                        value={profileForm.name}
                        onChange={e=>setProfileForm(p=>({...p,name:e.target.value}))} />
                    </div>
                    <div className="st-field">
                      <label className="st-label">Phone Number</label>
                      <input className="st-input" type="tel" inputMode="numeric" placeholder="9876543210"
                        value={profileForm.phone}
                        onChange={e=>setProfileForm(p=>({...p,phone:e.target.value}))} />
                    </div>
                  </div>

                  <div className="st-field">
                    <label className="st-label">PG Name *</label>
                    <input className="st-input" type="text" placeholder="Name of your PG"
                      value={profileForm.pgName}
                      onChange={e=>setProfileForm(p=>({...p,pgName:e.target.value}))} />
                  </div>

                  <div className="st-field">
                    <label className="st-label">PG Address</label>
                    <input className="st-input" type="text" placeholder="Full address"
                      value={profileForm.address}
                      onChange={e=>setProfileForm(p=>({...p,address:e.target.value}))} />
                  </div>

                  <div className="st-row">
                    <div className="st-field">
                      <label className="st-label">City</label>
                      <input className="st-input" type="text" placeholder="Chennai"
                        value={profileForm.city}
                        onChange={e=>setProfileForm(p=>({...p,city:e.target.value}))} />
                    </div>
                    <div className="st-field">
                      <label className="st-label">State</label>
                      <input className="st-input" type="text" placeholder="Tamil Nadu"
                        value={profileForm.state}
                        onChange={e=>setProfileForm(p=>({...p,state:e.target.value}))} />
                    </div>
                  </div>

                  <div className="st-email-info">
                    📧 {user?.email || `${pgOwner?.phone}@pgpilots.in`} &nbsp;·&nbsp; Cannot be changed
                  </div>

                  <button className="st-save-btn" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save Profile'}
                  </button>
                </div>
              )}

              {/* ── PAYMENT ── */}
              {activeTab==='payment' && (
                <div className="st-card">
                  <h2 className="st-card-title">💳 Payment Details</h2>
                  <p className="st-card-sub">Tenants will use these details to pay rent</p>

                  <div className="st-field">
                    <label className="st-label">UPI ID</label>
                    <input className="st-input" type="text"
                      placeholder="yourname@upi or 9876543210@paytm"
                      value={paymentForm.upiId}
                      onChange={e=>setPaymentForm(p=>({...p,upiId:e.target.value}))} />
                  </div>

                  <div className="st-field">
                    <label className="st-label">Payment QR Code</label>
                    {paymentForm.qrCodeUrl ? (
                      <div className="st-qr-preview">
                        <img src={paymentForm.qrCodeUrl} alt="QR" className="st-qr-img"/>
                        <button className="st-qr-change" onClick={()=>qrRef.current.click()}>
                          🔄 Change QR
                        </button>
                      </div>
                    ) : (
                      <div className="st-qr-upload" onClick={()=>qrRef.current.click()}>
                        <div className="st-qr-icon">📱</div>
                        <div className="st-qr-text">
                          {uploadingQR ? '⏳ Uploading…' : 'Tap to upload QR Code'}
                        </div>
                        <div className="st-qr-sub">PNG, JPG · Max 2MB</div>
                      </div>
                    )}
                    <input ref={qrRef} type="file" accept="image/*"
                      style={{display:'none'}} onChange={handleQRUpload} />
                  </div>

                  <button className="st-save-btn" onClick={handleSavePayment} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save Payment Details'}
                  </button>
                </div>
              )}

              {/* ── PASSWORD ── */}
              {activeTab==='password' && (
                <div className="st-card">
                  <h2 className="st-card-title">🔒 Change Password</h2>
                  <p className="st-card-sub">Keep your account secure with a strong password</p>

                  <div className="st-field">
                    <label className="st-label">Current Password</label>
                    <div className="st-pass-wrap">
                      <input className="st-pass-input"
                        type={showCurrent?'text':'password'}
                        placeholder="Enter current password"
                        value={passwordForm.currentPassword}
                        onChange={e=>setPasswordForm(p=>({...p,currentPassword:e.target.value}))} />
                      <span className="st-eye" onClick={()=>setShowCurrent(v=>!v)}>
                        {showCurrent?'🙈':'👁️'}
                      </span>
                    </div>
                  </div>

                  <div className="st-field">
                    <label className="st-label">New Password</label>
                    <div className="st-pass-wrap">
                      <input className="st-pass-input"
                        type={showNew?'text':'password'}
                        placeholder="Minimum 6 characters"
                        value={passwordForm.newPassword}
                        onChange={e=>setPasswordForm(p=>({...p,newPassword:e.target.value}))} />
                      <span className="st-eye" onClick={()=>setShowNew(v=>!v)}>
                        {showNew?'🙈':'👁️'}
                      </span>
                    </div>
                    {/* Strength bar */}
                    {passwordForm.newPassword && (
                      <div style={{marginTop:'6px'}}>
                        <div style={{height:'4px',borderRadius:'99px',background:'#e2e8f0',overflow:'hidden'}}>
                          <div style={{
                            height:'100%',borderRadius:'99px',transition:'width 0.3s',
                            width: passwordForm.newPassword.length>=10?'100%':passwordForm.newPassword.length>=6?'60%':'30%',
                            background: passwordForm.newPassword.length>=10?'#059669':passwordForm.newPassword.length>=6?'#d97706':'#dc2626',
                          }}/>
                        </div>
                        <div style={{fontSize:'11px',color:'#94a3b8',marginTop:'3px'}}>
                          {passwordForm.newPassword.length>=10?'💪 Strong':passwordForm.newPassword.length>=6?'⚠️ Medium':'❌ Weak'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="st-field">
                    <label className="st-label">Confirm New Password</label>
                    <div className="st-pass-wrap">
                      <input className="st-pass-input"
                        type={showConfirm?'text':'password'}
                        placeholder="Re-enter new password"
                        value={passwordForm.confirmPassword}
                        onChange={e=>setPasswordForm(p=>({...p,confirmPassword:e.target.value}))} />
                      <span className="st-eye" onClick={()=>setShowConfirm(v=>!v)}>
                        {showConfirm?'🙈':'👁️'}
                      </span>
                    </div>
                    {passwordForm.confirmPassword && (
                      <div style={{fontSize:'11px',marginTop:'4px',
                        color:passwordForm.newPassword===passwordForm.confirmPassword?'#059669':'#dc2626',
                        fontWeight:'600'}}>
                        {passwordForm.newPassword===passwordForm.confirmPassword?'✅ Passwords match':'❌ Passwords do not match'}
                      </div>
                    )}
                  </div>

                  <div className="st-tips">
                    <div className="st-tip-title">💡 Tips</div>
                    <div className="st-tip">✅ At least 6 characters</div>
                    <div className="st-tip">✅ Mix letters and numbers</div>
                    <div className="st-tip">✅ Don't share with anyone</div>
                  </div>

                  <button className="st-save-btn" onClick={handleChangePassword} disabled={saving}>
                    {saving ? 'Changing…' : '🔒 Change Password'}
                  </button>
                </div>
              )}

              {/* ── PLAN ── */}
              {activeTab==='plan' && (
                <div className="st-card">
                  <h2 className="st-card-title">⭐ Plan &amp; Subscription</h2>
                  <p className="st-card-sub">Your current plan and available upgrades</p>

                  {/* Current plan highlight */}
                  <div className="st-current-plan"
                    style={{background:plan.bg, border:`2px solid ${plan.color}`}}>
                    <div>
                      <div className="st-cp-badge" style={{color:plan.color}}>Current Plan</div>
                      <div className="st-cp-name"  style={{color:plan.color}}>{plan.name}</div>
                      <div className="st-cp-price">{plan.price}</div>
                    </div>
                    <div className="st-cp-features">
                      {plan.features.map(f=>(
                        <div key={f} className="st-cp-feature">✅ {f}</div>
                      ))}
                    </div>
                  </div>

                  {/* All plans */}
                  <div style={{fontSize:'13px',fontWeight:'800',color:'#1e293b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'12px'}}>
                    Available Plans
                  </div>
                  <div className="st-plans-grid">
                    {Object.entries(planDetails).filter(([k])=>k!=='trial').map(([key,p])=>(
                      <div key={key} className="st-plan-card" style={{
                        border: currentPlan===key?`2px solid ${p.color}`:'1.5px solid #e2e8f0',
                        background: currentPlan===key?p.bg:'white',
                      }}>
                        {currentPlan===key && (
                          <div className="st-plan-active-tag" style={{background:p.color}}>✓ Active</div>
                        )}
                        <div className="st-plan-name"  style={{color:p.color}}>{p.name}</div>
                        <div className="st-plan-price">{p.price}</div>
                        <div className="st-plan-features">
                          {p.features.map(f=><div key={f} className="st-plan-feat">✅ {f}</div>)}
                        </div>
                        {currentPlan!==key && (
                          <button className="st-upgrade-btn" style={{background:p.color}}>
                            Upgrade →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="st-support">
                    📞 To upgrade, contact us at <strong>support@pgpilots.in</strong>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </>
  );
}