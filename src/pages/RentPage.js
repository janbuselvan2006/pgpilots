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
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterType, setFilterType] = useState('');
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
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const pq = query(collection(db, 'payments'), where('ownerId', '==', user.uid));
      const pSnap = await getDocs(pq);
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Get due date based on check-in date
  const getDueDate = (tenant) => {
    if (!tenant.checkIn) return null;
    const checkIn = new Date(tenant.checkIn);
    const dueDay = checkIn.getDate();
    const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    return thisMonthDue;
  };

  // Get days diff from today
  const getDaysDiff = (tenant) => {
    const due = getDueDate(tenant);
    if (!due) return 999;
    return Math.floor((due - today) / (1000 * 60 * 60 * 24));
  };

  // Get this month's total paid amount
  const getThisMonthPaid = (tenantId) => {
    const now = new Date();
    return payments
      .filter(p => {
        const pd = new Date(p.paymentDate);
        return p.tenantId === tenantId &&
          pd.getMonth() === now.getMonth() &&
          pd.getFullYear() === now.getFullYear() &&
          p.type === 'Rent';
      })
      .reduce((a, p) => a + (p.amount || 0), 0);
  };

  // Get this month's balance
  const getThisMonthBalance = (tenant) => {
    const paid = getThisMonthPaid(tenant.id);
    return Math.max(0, (tenant.monthlyRent || 0) - paid);
  };

  // Check if fully paid this month
  const isFullyPaidThisMonth = (tenant) => {
    return getThisMonthBalance(tenant) === 0;
  };

  // Check if partially paid this month
  const isPartiallyPaid = (tenant) => {
    const paid = getThisMonthPaid(tenant.id);
    return paid > 0 && paid < (tenant.monthlyRent || 0);
  };

  // Categorize tenants
  const unpaidTenants = tenants.filter(t => !isFullyPaidThisMonth(t));

  // Late = due date passed and not fully paid
  const lateTenants = unpaidTenants
    .filter(t => getDaysDiff(t) < 0)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  // Today = due date is today
  const todayTenants = unpaidTenants
    .filter(t => getDaysDiff(t) === 0)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  // Upcoming = due date in future
  const upcomingTenants = unpaidTenants
    .filter(t => getDaysDiff(t) > 0)
    .sort((a, b) => getDaysDiff(a) - getDaysDiff(b));

  // Paid = fully paid this month
  const paidTenants = tenants
    .filter(t => isFullyPaidThisMonth(t))
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  // Stats
  const totalExpected = tenants.reduce((a, t) => a + (t.monthlyRent || 0), 0);
  const totalCollected = tenants.reduce((a, t) => a + getThisMonthPaid(t.id), 0);
  const totalPending = tenants.reduce((a, t) => a + getThisMonthBalance(t), 0);

  const handleRecordPayment = (tenant) => {
    const balance = getThisMonthBalance(tenant);
    setSelectedTenant(tenant);
    setForm({
      amount: balance.toString(),
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowPaymentForm(true);
  };

  const handleSavePayment = async () => {
    if (!form.amount || parseInt(form.amount) <= 0)
      return alert('Please enter a valid amount!');

    const balance = getThisMonthBalance(selectedTenant);
    const enteredAmount = parseInt(form.amount);

    if (enteredAmount > balance)
      return alert(`Amount cannot exceed balance of ₹${balance.toLocaleString()}!`);

    const isPartial = enteredAmount < balance;
    const previouslyPaid = getThisMonthPaid(selectedTenant.id);
    const newTotal = previouslyPaid + enteredAmount;
    const isNowComplete = newTotal >= (selectedTenant.monthlyRent || 0);

    setSaving(true);
    try {
      await addDoc(collection(db, 'payments'), {
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        roomNumber: selectedTenant.roomNumber,
        amount: enteredAmount,
        fullAmount: selectedTenant.monthlyRent || 0,
        previouslyPaid,
        newTotal,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        month: new Date(form.paymentDate).toLocaleString('default', { month: 'long' }),
        year: new Date(form.paymentDate).getFullYear().toString(),
        notes: form.notes,
        isPartial,
        isCompleted: isNowComplete,
        type: 'Rent',
        ownerId: user.uid,
        createdAt: new Date(),
      });
      setShowPaymentForm(false);
      setSelectedTenant(null);
      fetchData();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  const filteredPayments = payments.filter(p => {
    const matchSearch = !search ||
      p.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
      p.roomNumber?.includes(search);
    const matchMonth = !filterMonth || p.month === filterMonth;
    const matchYear = !filterYear || p.year === filterYear;
    const matchMethod = !filterMethod || p.paymentMethod === filterMethod;
    const matchType = !filterType ||
      (filterType === 'partial' && p.isPartial) ||
      (filterType === 'completed' && p.isCompleted) ||
      (filterType === 'full' && !p.isPartial);
    return matchSearch && matchMonth && matchYear && matchMethod && matchType;
  }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  // Tenant Card
  const TenantRentCard = ({ tenant, status }) => {
    const daysDiff = getDaysDiff(tenant);
    const dueDate = getDueDate(tenant);
    const balance = getThisMonthBalance(tenant);
    const paid = getThisMonthPaid(tenant.id);
    const isPartial = isPartiallyPaid(tenant);

    return (
      <div style={{
        ...styles.rentCard,
        borderLeft: `4px solid ${
          status === 'late' ? '#dc2626' :
          status === 'today' ? '#d97706' :
          status === 'paid' ? '#059669' : '#4f46e5'
        }`,
        background: isPartial ? '#fffdf0' : '#f8fafc',
      }}>
        <div style={styles.cardTop}>
          <div style={styles.cardLeft}>
            <div style={{
              ...styles.avatar,
              background:
                status === 'paid' ? 'linear-gradient(135deg, #059669, #0891b2)' :
                status === 'late' ? 'linear-gradient(135deg, #dc2626, #9f1239)' :
                status === 'today' ? 'linear-gradient(135deg, #d97706, #b45309)' :
                'linear-gradient(135deg, #4f46e5, #0891b2)'
            }}>
              {tenant.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.tenantName}>{tenant.name}</div>
              <div style={styles.tenantSub}>
                🛏️ Room {tenant.roomNumber}
              </div>
              <div style={styles.tenantSub}>
                📅 Check-in: {tenant.checkIn} | Due every {dueDate?.getDate()}th
              </div>
              {isPartial && (
                <div style={styles.partialInfo}>
                  ⚠️ Partially paid: ₹{paid.toLocaleString()} of ₹{(tenant.monthlyRent || 0).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div style={styles.cardRight}>
            {/* Status badge */}
            {status === 'late' && (
              <div style={styles.lateBadge}>
                🔴 {Math.abs(daysDiff)} day{Math.abs(daysDiff) !== 1 ? 's' : ''} overdue
              </div>
            )}
            {status === 'today' && (
              <div style={styles.todayBadge}>🟡 Due Today</div>
            )}
            {status === 'upcoming' && (
              <div style={styles.upcomingBadge}>
                🟢 Due in {daysDiff} day{daysDiff !== 1 ? 's' : ''}
              </div>
            )}
            {status === 'paid' && (
              <div style={styles.paidBadge}>✅ Paid</div>
            )}

            {/* Show balance only */}
            <div style={styles.rentAmount}>
              ₹{(status === 'paid' ? tenant.monthlyRent : balance).toLocaleString()}
              <span style={styles.rentSub}>
                {status === 'paid' ? ' paid' : ' due'}
              </span>
            </div>

            {/* Collect button */}
            {status !== 'paid' && (
              <button style={{
                ...styles.collectBtn,
                background: status === 'late'
                  ? 'linear-gradient(135deg, #dc2626, #9f1239)'
                  : status === 'today'
                  ? 'linear-gradient(135deg, #d97706, #b45309)'
                  : 'linear-gradient(135deg, #e94560, #0f3460)'
              }} onClick={() => handleRecordPayment(tenant)}>
                💰 {isPartial ? 'Collect Balance' : 'Collect Rent'}
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
            onClick={() => setActiveTab(id)}>{label}
          </button>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentForm && selectedTenant && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>💰 Collect Rent</h3>
              <button style={styles.closeBtn}
                onClick={() => setShowPaymentForm(false)}>✕</button>
            </div>

            <div style={styles.tenantInfoBox}>
              <div style={styles.tiAvatar}>
                {selectedTenant.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={styles.tiName}>{selectedTenant.name}</div>
                <div style={styles.tiSub}>
                  Room {selectedTenant.roomNumber} •
                  Monthly: ₹{selectedTenant.monthlyRent?.toLocaleString()}
                </div>
                {isPartiallyPaid(selectedTenant) && (
                  <div style={styles.tiPartial}>
                    Already paid: ₹{getThisMonthPaid(selectedTenant.id).toLocaleString()} •
                    Balance: ₹{getThisMonthBalance(selectedTenant).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Partial warning */}
            {form.amount &&
              parseInt(form.amount) < getThisMonthBalance(selectedTenant) &&
              parseInt(form.amount) > 0 && (
              <div style={styles.partialWarning}>
                ⚠️ Partial payment! Balance after this:
                ₹{(getThisMonthBalance(selectedTenant) - parseInt(form.amount)).toLocaleString()}
              </div>
            )}

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Amount (₹) — Balance: ₹{getThisMonthBalance(selectedTenant).toLocaleString()}
                </label>
                <input style={{
                  ...styles.input,
                  borderColor: form.amount &&
                    parseInt(form.amount) < getThisMonthBalance(selectedTenant)
                    ? '#d97706' : '#e2e8f0'
                }} type="number" placeholder="Enter amount"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Date</label>
                <input style={styles.input} type="date"
                  value={form.paymentDate}
                  onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
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
                <input style={styles.input} type="text"
                  placeholder="e.g. Paid via GPay"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn}
                onClick={() => setShowPaymentForm(false)}>Cancel</button>
              <button style={styles.saveBtn}
                onClick={handleSavePayment} disabled={saving}>
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
              {/* Today */}
              {todayTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#d97706' }}>
                    🟡 Due Today ({todayTenants.length})
                  </h2>
                  {todayTenants.map(t => (
                    <TenantRentCard key={t.id} tenant={t} status="today" />
                  ))}
                </div>
              )}

              {/* Late */}
              {lateTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#dc2626' }}>
                    🔴 Overdue ({lateTenants.length})
                  </h2>
                  {lateTenants.map(t => (
                    <TenantRentCard key={t.id} tenant={t} status="late" />
                  ))}
                </div>
              )}

              {/* Upcoming */}
              {upcomingTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#4f46e5' }}>
                    🟢 Upcoming ({upcomingTenants.length})
                  </h2>
                  {upcomingTenants.map(t => (
                    <TenantRentCard key={t.id} tenant={t} status="upcoming" />
                  ))}
                </div>
              )}

              {/* Paid */}
              {paidTenants.length > 0 && (
                <div style={styles.section}>
                  <h2 style={{ ...styles.sectionTitle, color: '#059669' }}>
                    ✅ Paid This Month ({paidTenants.length})
                  </h2>
                  {paidTenants.map(t => (
                    <TenantRentCard key={t.id} tenant={t} status="paid" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Payment History</h2>

          {/* Filters */}
          <div style={styles.filterRow}>
            <input style={styles.searchInput} type="text"
              placeholder="🔍 Search by name or room..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select style={styles.filterSelect} value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {months.map(m => <option key={m}>{m}</option>)}
            </select>
            <select style={styles.filterSelect} value={filterYear}
              onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
            </select>
            <select style={styles.filterSelect} value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}>
              <option value="">All Methods</option>
              {['Cash','UPI','Bank Transfer','Card'].map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select style={styles.filterSelect} value={filterType}
              onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="full">Full Payment</option>
              <option value="partial">Partial Payment</option>
              <option value="completed">Completed Month</option>
            </select>
            {(search || filterMonth || filterYear || filterMethod || filterType) && (
              <button style={styles.clearBtn} onClick={() => {
                setSearch(''); setFilterMonth('');
                setFilterYear(''); setFilterMethod(''); setFilterType('');
              }}>✕ Clear</button>
            )}
          </div>

          {/* Result count */}
          <div style={styles.resultCount}>
            Showing {filteredPayments.length} of {payments.length} payments
            {filteredPayments.filter(p => p.isPartial).length > 0 && (
              <span style={styles.partialCount}>
                • {filteredPayments.filter(p => p.isPartial).length} partial
              </span>
            )}
          </div>

          {filteredPayments.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <p style={styles.emptyText}>No payments found</p>
            </div>
          ) : (
            <div style={styles.historyList}>
              {filteredPayments.map(payment => (
                <div key={payment.id} style={{
                  ...styles.historyCard,
                  background: payment.isCompleted ? '#f0fdf4' :
                    payment.isPartial ? '#fffbeb' : '#f8fafc',
                  border: payment.isCompleted ? '1px solid #bbf7d0' :
                    payment.isPartial ? '1px solid #fde68a' : '1px solid #e2e8f0',
                }}>
                  <div style={styles.historyLeft}>
                    <div style={{
                      ...styles.historyAvatar,
                      background: payment.isCompleted
                        ? 'linear-gradient(135deg, #059669, #0891b2)'
                        : payment.isPartial
                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                        : 'linear-gradient(135deg, #4f46e5, #0891b2)'
                    }}>
                      {payment.tenantName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={styles.historyName}>
                        {payment.tenantName}
                        {payment.isCompleted && (
                          <span style={styles.completedTag}>✅ Month Complete</span>
                        )}
                        {payment.isPartial && !payment.isCompleted && (
                          <span style={styles.partialTag}>⚠️ Partial</span>
                        )}
                      </div>
                      <div style={styles.historySub}>
                        Room {payment.roomNumber} • {payment.month} {payment.year}
                      </div>
                      {/* Show payment progress */}
                      {payment.isPartial && (
                        <div style={styles.progressInfo}>
                          Paid: ₹{payment.newTotal?.toLocaleString()} of ₹{payment.fullAmount?.toLocaleString()}
                        </div>
                      )}
                      {payment.notes && (
                        <div style={styles.historyNotes}>📝 {payment.notes}</div>
                      )}
                    </div>
                  </div>
                  <div style={styles.historyRight}>
                    <div>
                      <div style={{
                        ...styles.historyAmount,
                        color: payment.isCompleted ? '#059669' :
                          payment.isPartial ? '#d97706' : '#4f46e5'
                      }}>
                        ₹{payment.amount?.toLocaleString()}
                      </div>
                      {payment.isPartial && (
                        <div style={styles.fullAmountSub}>
                          of ₹{payment.fullAmount?.toLocaleString()}
                        </div>
                      )}
                    </div>
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
  header: { marginBottom: '24px' },
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
  sectionTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '16px', marginTop: 0 },
  rentCard: { borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #e2e8f0' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px', flexShrink: 0 },
  tenantName: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  tenantSub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  partialInfo: { fontSize: '12px', color: '#d97706', fontWeight: '600', marginTop: '4px' },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  lateBadge: { padding: '4px 12px', borderRadius: '20px', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '700' },
  todayBadge: { padding: '4px 12px', borderRadius: '20px', background: '#fffbeb', color: '#d97706', fontSize: '12px', fontWeight: '700' },
  upcomingBadge: { padding: '4px 12px', borderRadius: '20px', background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '700' },
  paidBadge: { padding: '4px 12px', borderRadius: '20px', background: '#ecfdf5', color: '#059669', fontSize: '12px', fontWeight: '700' },
  rentAmount: { fontSize: '20px', fontWeight: '800', color: '#1e293b' },
  rentSub: { fontSize: '12px', color: '#94a3b8', fontWeight: '400' },
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
  tiPartial: { fontSize: '12px', color: '#d97706', fontWeight: '600', marginTop: '4px' },
  partialWarning: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#d97706', fontWeight: '600', marginBottom: '16px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  modalFooter: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { padding: '12px 24px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  filterSelect: { padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc', cursor: 'pointer' },
  clearBtn: { padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  resultCount: { fontSize: '13px', color: '#94a3b8', marginBottom: '16px' },
  partialCount: { color: '#d97706', fontWeight: '600' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '40px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' },
  emptySub: { color: '#94a3b8', fontSize: '14px', margin: 0 },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px' },
  historyLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyAvatar: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px', flexShrink: 0 },
  historyName: { fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  completedTag: { fontSize: '11px', background: '#dcfce7', color: '#059669', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' },
  partialTag: { fontSize: '11px', background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' },
  historySub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  progressInfo: { fontSize: '12px', color: '#d97706', fontWeight: '600', marginTop: '2px' },
  historyNotes: { fontSize: '12px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' },
  historyRight: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
  historyAmount: { fontSize: '16px', fontWeight: '800', textAlign: 'right' },
  fullAmountSub: { fontSize: '11px', color: '#94a3b8', textAlign: 'right' },
  methodTag: { padding: '4px 10px', background: '#eef2ff', color: '#4f46e5', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  historyDate: { fontSize: '12px', color: '#94a3b8' },
};

export default RentPage;