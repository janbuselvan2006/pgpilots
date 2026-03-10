import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

function RentPage() {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const user = auth.currentUser;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tq = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
      const tSnap = await getDocs(tq);
      const tenantsData = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTenants(tenantsData);

      const pq = query(collection(db, 'payments'), where('ownerId', '==', user.uid));
      const pSnap = await getDocs(pq);
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Get due date for tenant this month
  const getDueDate = (tenant) => {
    const checkIn = new Date(tenant.checkIn);
    const dueDay = checkIn.getDate();
    const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
    // If due date already passed this month, next due is same day next month
    return due;
  };

  // Get days difference (negative = overdue, 0 = today, positive = upcoming)
  const getDaysDiff = (tenant) => {
    const due = getDueDate(tenant);
    const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Check if tenant paid this month
  const isPaidThisMonth = (tenantId) => {
    const now = new Date();
    return payments.some(p => {
      const pd = new Date(p.paymentDate);
      return p.tenantId === tenantId &&
        pd.getMonth() === now.getMonth() &&
        pd.getFullYear() === now.getFullYear() &&
        p.type === 'Rent';
    });
  };

  // Get tenant's total pending amount (unpaid months)
  const getTotalPending = (tenant) => {
    if (!tenant.checkIn) return tenant.monthlyRent || 0;
    const checkIn = new Date(tenant.checkIn);
    const monthsDiff = (today.getFullYear() - checkIn.getFullYear()) * 12 +
      (today.getMonth() - checkIn.getMonth()) + 1;
    const totalPaidMonths = payments.filter(p =>
      p.tenantId === tenant.id && p.type === 'Rent'
    ).length;
    const unpaidMonths = Math.max(0, monthsDiff - totalPaidMonths);
    return unpaidMonths * (tenant.monthlyRent || 0);
  };

  // Categorize tenants
  const unpaidTenants = tenants.filter(t => !isPaidThisMonth(t.id));
  const lateTenants = unpaidTenants
    .filter(t => getDaysDiff(t) < 0)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  const todayTenants = unpaidTenants
    .filter(t => getDaysDiff(t) === 0)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  const upcomingTenants = unpaidTenants
    .filter(t => getDaysDiff(t) > 0)
    .sort((a, b) => getDaysDiff(a) - getDaysDiff(b));
  const paidTenants = tenants
    .filter(t => isPaidThisMonth(t.id))
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  // Stats
  const totalExpected = tenants.reduce((a, t) => a + (t.monthlyRent || 0), 0);
  const totalCollected = paidTenants.reduce((a, t) => a + (t.monthlyRent || 0), 0);
  const totalPending = unpaidTenants.reduce((a, t) => a + (t.monthlyRent || 0), 0);

  const handleRecordPayment = (tenant) => {
    setSelectedTenant(tenant);
    setForm({
      amount: tenant.monthlyRent?.toString() || '',
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowPaymentForm(true);
  };

  const handleSavePayment = async () => {
    if (!form.amount) return alert('Please enter amount!');
    setSaving(true);
    try {
      await addDoc(collection(db, 'payments'), {
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        roomNumber: selectedTenant.roomNumber,
        amount: parseInt(form.amount),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        month: new Date(form.paymentDate).toLocaleString('default', { month: 'long' }),
        year: new Date(form.paymentDate).getFullYear().toString(),
        notes: form.notes,
        type: 'Rent',
        ownerId: user.uid,
        createdAt: new Date(),
      });
      setShowPaymentForm(false);
      setSelectedTenant(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  // Tenant Card Component
  const TenantRentCard = ({ tenant, status }) => {
    const daysDiff = getDaysDiff(tenant);
    const dueDate = getDueDate(tenant);
    const totalPendingAmt = getTotalPending(tenant);

    return (
      <div style={{
        ...styles.rentCard,
        borderLeft: `4px solid ${
          status === 'late' ? '#dc2626' :
          status === 'today' ? '#d97706' :
          status === 'paid' ? '#059669' : '#4f46e5'
        }`
      }}>
        <div style={styles.cardTop}>
          <div style={styles.cardLeft}>
            <div style={{
              ...styles.avatar,
              background: status === 'paid'
                ? 'linear-gradient(135deg, #059669, #0891b2)'
                : status === 'late'
                ? 'linear-gradient(135deg, #dc2626, #9f1239)'
                : status === 'today'
                ? 'linear-gradient(135deg, #d97706, #b45309)'
                : 'linear-gradient(135deg, #4f46e5, #0891b2)'
            }}>
              {tenant.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.tenantName}>{tenant.name}</div>
              <div style={styles.tenantSub}>
                Room {tenant.roomNumber} • Joined {tenant.checkIn}
              </div>
              <div style={styles.tenantSub}>
                📅 Due every {dueDate.getDate()}th of month
              </div>
            </div>
          </div>

          <div style={styles.cardRight}>
            {/* Status Badge */}
            {status === 'late' && (
              <div style={styles.lateBadge}>
                🔴 {Math.abs(daysDiff)} days overdue
              </div>
            )}
            {status === 'today' && (
              <div style={styles.todayBadge}>
                🟡 Due Today!
              </div>
            )}
            {status === 'upcoming' && (
              <div style={styles.upcomingBadge}>
                🟢 Due in {daysDiff} days
              </div>
            )}
            {status === 'paid' && (
              <div style={styles.paidBadge}>
                ✅ Paid
              </div>
            )}

            {/* Amount */}
            <div style={styles.rentAmount}>
              ₹{(tenant.monthlyRent || 0).toLocaleString()}
              <span style={styles.rentSub}>/month</span>
            </div>

            {/* Total Pending */}
            {status !== 'paid' && totalPendingAmt > 0 && (
              <div style={styles.totalPending}>
                Total due: ₹{totalPendingAmt.toLocaleString()}
              </div>
            )}

            {/* Collect Button */}
            {status !== 'paid' && (
              <button style={{
                ...styles.collectBtn,
                background: status === 'late'
                  ? 'linear-gradient(135deg, #dc2626, #9f1239)'
                  : 'linear-gradient(135deg, #e94560, #0f3460)'
              }}
                onClick={() => handleRecordPayment(tenant)}>
                💰 Collect Rent
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Rent Management</h1>
          <p style={styles.subtitle}>
            {new Date().toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Expected', value: `₹${totalExpected.toLocaleString()}`, color: '#4f46e5', bg: '#eef2ff', icon: '💰' },
          { label: 'Collected', value: `₹${totalCollected.toLocaleString()}`, color: '#059669', bg: '#ecfdf5', icon: '✅' },
          { label: 'Pending', value: `₹${totalPending.toLocaleString()}`, color: '#dc2626', bg: '#fef2f2', icon: '⏳' },
          { label: 'Paid / Total', value: `${paidTenants.length}/${tenants.length}`, color: '#d97706', bg: '#fffbeb', icon: '👥' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ ...styles.statCard, background: bg }}>
            <div style={styles.statIcon}>{icon}</div>
            <div style={{ ...styles.statValue, color }}>{value}</div>
            <div style={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'history', label: '📋 History' },
        ].map(({ id, label }) => (
          <button key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedTenant && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>💰 Record Payment</h3>
              <button style={styles.closeBtn} onClick={() => setShowPaymentForm(false)}>✕</button>
            </div>
            <div style={styles.tenantInfoBox}>
              <div style={styles.tiAvatar}>
                {selectedTenant.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={styles.tiName}>{selectedTenant.name}</div>
                <div style={styles.tiSub}>Room {selectedTenant.roomNumber} • ₹{selectedTenant.monthlyRent?.toLocaleString()}/month</div>
              </div>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Amount (₹)</label>
                <input style={styles.input} type="number"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Date</label>
                <input style={styles.input} type="date"
                  value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Method</label>
                <select style={styles.input} value={form.paymentMethod}
                  onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                  {['Cash', 'UPI', 'Bank Transfer', 'Card'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <input style={styles.input} type="text" placeholder="Optional"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowPaymentForm(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSavePayment} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : tenants.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>💰</div>
              <p style={styles.emptyText}>No tenants found</p>
              <p style={styles.emptySub}>Add tenants first!</p>
            </div>
          ) : (
            <>
              {/* Late */}
              {lateTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#dc2626' }}>
                    🔴 Overdue ({lateTenants.length})
                  </h2>
                  {lateTenants.map(t => <TenantRentCard key={t.id} tenant={t} status="late" />)}
                </div>
              )}

              {/* Today */}
              {todayTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#d97706' }}>
                    🟡 Due Today ({todayTenants.length})
                  </h2>
                  {todayTenants.map(t => <TenantRentCard key={t.id} tenant={t} status="today" />)}
                </div>
              )}

              {/* Upcoming */}
              {upcomingTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#4f46e5' }}>
                    🟢 Upcoming ({upcomingTenants.length})
                  </h2>
                  {upcomingTenants.map(t => <TenantRentCard key={t.id} tenant={t} status="upcoming" />)}
                </div>
              )}

              {/* Paid */}
              {paidTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#059669' }}>
                    ✅ Paid This Month ({paidTenants.length})
                  </h2>
                  {paidTenants.map(t => <TenantRentCard key={t.id} tenant={t} status="paid" />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 All Payment History</h2>
          {payments.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <p style={styles.emptyText}>No payments recorded yet</p>
            </div>
          ) : (
            <div style={styles.historyList}>
              {payments
                .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                .map(payment => (
                  <div key={payment.id} style={styles.historyCard}>
                    <div style={styles.historyLeft}>
                      <div style={styles.historyAvatar}>
                        {payment.tenantName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.historyName}>{payment.tenantName}</div>
                        <div style={styles.historySub}>Room {payment.roomNumber} • {payment.month} {payment.year}</div>
                      </div>
                    </div>
                    <div style={styles.historyRight}>
                      <div style={styles.historyAmount}>₹{payment.amount?.toLocaleString()}</div>
                      <div style={styles.methodTag}>{payment.paymentMethod}</div>
                      <div style={styles.historyDate}>{payment.paymentDate}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { borderRadius: '14px', padding: '20px', textAlign: 'center' },
  statIcon: { fontSize: '28px', marginBottom: '8px' },
  statValue: { fontSize: '22px', fontWeight: '800', marginBottom: '4px' },
  statLabel: { color: '#64748b', fontSize: '13px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: { padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#64748b' },
  tabActive: { background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none' },
  section: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', marginTop: 0 },
  rentCard: { background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #e2e8f0' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px', flexShrink: 0 },
  tenantName: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  tenantSub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  lateBadge: { padding: '4px 12px', borderRadius: '20px', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '700' },
  todayBadge: { padding: '4px 12px', borderRadius: '20px', background: '#fffbeb', color: '#d97706', fontSize: '12px', fontWeight: '700' },
  upcomingBadge: { padding: '4px 12px', borderRadius: '20px', background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '700' },
  paidBadge: { padding: '4px 12px', borderRadius: '20px', background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '700' },
  rentAmount: { fontSize: '20px', fontWeight: '800', color: '#1e293b' },
  rentSub: { fontSize: '12px', color: '#94a3b8', fontWeight: '400' },
  totalPending: { fontSize: '12px', color: '#dc2626', fontWeight: '600' },
  collectBtn: { padding: '8px 16px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px' },
  tenantInfoBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px' },
  tiAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px' },
  tiName: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  tiSub: { fontSize: '13px', color: '#94a3b8' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  modalFooter: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { padding: '12px 24px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '40px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' },
  emptySub: { color: '#94a3b8', fontSize: '14px', margin: 0 },
  historyList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  historyCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' },
  historyLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px' },
  historyName: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
  historySub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  historyRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyAmount: { fontSize: '16px', fontWeight: '800', color: '#059669' },
  methodTag: { padding: '4px 10px', background: '#eef2ff', color: '#4f46e5', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  historyDate: { fontSize: '12px', color: '#94a3b8' },
};

export default RentPage;