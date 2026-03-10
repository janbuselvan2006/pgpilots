import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

function ElectricityPage() {
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('bills');
  const [form, setForm] = useState({
    roomNumber: '',
    amount: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    notes: '',
    readingDate: new Date().toISOString().split('T')[0],
  });

  const user = auth.currentUser;

  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const rq = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
      const rSnap = await getDocs(rq);
      setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const tq = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
      const tSnap = await getDocs(tq);
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const bq = query(collection(db, 'electricityBills'), where('ownerId', '==', user.uid));
      const bSnap = await getDocs(bq);
      setBills(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Get tenants for a room
  const getTenantsInRoom = (roomNumber) => {
    return tenants.filter(t => t.roomNumber === roomNumber && t.status !== 'inactive');
  };

  // Get electricity bill for a tenant this entry
  const getTenantElecBill = (roomNumber, billId) => {
    return bills.find(b => b.id === billId && b.roomNumber === roomNumber);
  };

  // Check if room already has bill for this month/year
  const getRoomBill = (roomNumber, month, year) => {
    return bills.find(b =>
      b.roomNumber === roomNumber &&
      b.month === month &&
      b.year === year
    );
  };

  const handleAddBill = async () => {
    if (!form.roomNumber) return alert('Please select a room!');
    if (!form.amount || parseInt(form.amount) <= 0) return alert('Please enter valid amount!');

    // Check duplicate
    const existing = getRoomBill(form.roomNumber, form.month, form.year);
    if (existing) return alert(`Bill already added for Room ${form.roomNumber} in ${form.month} ${form.year}!`);

    const roomTenants = getTenantsInRoom(form.roomNumber);

    setSaving(true);
    try {
      await addDoc(collection(db, 'electricityBills'), {
        roomNumber: form.roomNumber,
        amount: parseInt(form.amount),
        month: form.month,
        year: form.year,
        notes: form.notes,
        readingDate: form.readingDate,
        tenantCount: roomTenants.length,
        tenantIds: roomTenants.map(t => t.id),
        tenantNames: roomTenants.map(t => t.name),
        isPaid: false,
        paidTenantIds: [],
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
      });
      setShowAddForm(false);
      setForm({
        roomNumber: '',
        amount: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear().toString(),
        notes: '',
        readingDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // Mark electricity as collected for a tenant
  const markElecPaid = async (bill, tenantId) => {
    const newPaidIds = [...(bill.paidTenantIds || []), tenantId];
    const allPaid = newPaidIds.length >= (bill.tenantIds?.length || 1);
    try {
      await updateDoc(doc(db, 'electricityBills', bill.id), {
        paidTenantIds: newPaidIds,
        isPaid: allPaid,
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  // Stats
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();
  const thisMonthBills = bills.filter(b => b.month === currentMonth && b.year === currentYear);
  const totalBilled = thisMonthBills.reduce((a, b) => a + (b.amount || 0), 0);
  const totalCollected = thisMonthBills
    .reduce((a, b) => a + ((b.paidTenantIds?.length || 0) * b.amount), 0);
  const totalPending = thisMonthBills
    .filter(b => !b.isPaid)
    .reduce((a, b) => a + (b.amount || 0), 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Electricity Bills</h1>
          <p style={styles.subtitle}>Manage room-wise electricity charges</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddForm(true)}>
          ⚡ Add Bill
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Billed', value: `₹${totalBilled.toLocaleString()}`, color: '#4f46e5', bg: '#eef2ff', icon: '⚡' },
          { label: 'Collected', value: `₹${totalCollected.toLocaleString()}`, color: '#059669', bg: '#ecfdf5', icon: '✅' },
          { label: 'Pending', value: `₹${totalPending.toLocaleString()}`, color: '#dc2626', bg: '#fef2f2', icon: '⏳' },
          { label: 'Rooms Billed', value: `${thisMonthBills.length}/${rooms.length}`, color: '#d97706', bg: '#fffbeb', icon: '🏠' },
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
          { id: 'bills', label: '⚡ Current Bills' },
          { id: 'history', label: '📋 History' },
        ].map(({ id, label }) => (
          <button key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}>{label}
          </button>
        ))}
      </div>

      {/* Add Bill Modal */}
      {showAddForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>⚡ Add Electricity Bill</h3>
              <button style={styles.closeBtn} onClick={() => setShowAddForm(false)}>✕</button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Select Room</label>
                <select style={styles.input} value={form.roomNumber}
                  onChange={e => setForm({ ...form, roomNumber: e.target.value })}>
                  <option value="">-- Select Room --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.roomNumber}>
                      Room {r.roomNumber} ({getTenantsInRoom(r.roomNumber).length} tenants)
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Bill Amount (₹)</label>
                <input style={styles.input} type="number"
                  placeholder="e.g. 300"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Month</label>
                <select style={styles.input} value={form.month}
                  onChange={e => setForm({ ...form, month: e.target.value })}>
                  {months.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Year</label>
                <input style={styles.input} type="number"
                  value={form.year}
                  onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Reading Date</label>
                <input style={styles.input} type="date"
                  value={form.readingDate}
                  onChange={e => setForm({ ...form, readingDate: e.target.value })} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Notes</label>
                <input style={styles.input} type="text"
                  placeholder="Optional"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            {/* Preview */}
            {form.roomNumber && form.amount && (
              <div style={styles.preview}>
                <div style={styles.previewTitle}>📋 Bill Preview</div>
                <div style={styles.previewRow}>
                  <span>Room {form.roomNumber}</span>
                  <span style={{ fontWeight: '700' }}>₹{parseInt(form.amount || 0).toLocaleString()}</span>
                </div>
                {getTenantsInRoom(form.roomNumber).map(t => (
                  <div key={t.id} style={styles.previewTenant}>
                    <span>👤 {t.name}</span>
                    <div style={styles.previewAmounts}>
                      <span style={styles.previewRent}>Rent: ₹{(t.monthlyRent || 0).toLocaleString()}</span>
                      <span style={styles.previewElec}>⚡ ₹{parseInt(form.amount || 0).toLocaleString()}</span>
                      <span style={styles.previewTotal}>
                        Total: ₹{((t.monthlyRent || 0) + parseInt(form.amount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {getTenantsInRoom(form.roomNumber).length === 0 && (
                  <div style={{ color: '#dc2626', fontSize: '13px' }}>
                    ⚠️ No active tenants in this room!
                  </div>
                )}
              </div>
            )}

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowAddForm(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleAddBill} disabled={saving}>
                {saving ? 'Saving...' : '⚡ Add Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Bills Tab */}
      {activeTab === 'bills' && (
        <div>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : thisMonthBills.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>⚡</div>
              <p style={styles.emptyText}>No bills added for {currentMonth}</p>
              <p style={styles.emptySub}>Click "Add Bill" to enter room electricity charges</p>
            </div>
          ) : (
            thisMonthBills.map(bill => {
              const roomTenants = tenants.filter(t => t.roomNumber === bill.roomNumber);
              return (
                <div key={bill.id} style={styles.billCard}>
                  {/* Room Header */}
                  <div style={styles.billRoomHeader}>
                    <div style={styles.billRoomLeft}>
                      <div style={styles.roomIcon}>🏠</div>
                      <div>
                        <div style={styles.billRoomName}>Room {bill.roomNumber}</div>
                        <div style={styles.billRoomSub}>
                          {bill.month} {bill.year} • {bill.readingDate}
                        </div>
                      </div>
                    </div>
                    <div style={styles.billRoomRight}>
                      <div style={styles.billAmount}>⚡ ₹{bill.amount?.toLocaleString()}</div>
                      {bill.notes && (
                        <div style={styles.billNotes}>📝 {bill.notes}</div>
                      )}
                    </div>
                  </div>

                  {/* Tenant wise breakdown */}
                  <div style={styles.tenantBreakdown}>
                    {roomTenants.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '13px', padding: '8px' }}>
                        No active tenants in this room
                      </div>
                    ) : (
                      roomTenants.map(tenant => {
                        const isPaid = bill.paidTenantIds?.includes(tenant.id);
                        const totalBill = (tenant.monthlyRent || 0) + (bill.amount || 0);
                        return (
                          <div key={tenant.id} style={{
                            ...styles.tenantBillRow,
                            background: isPaid ? '#f0fdf4' : '#fffbeb',
                            border: isPaid ? '1px solid #bbf7d0' : '1px solid #fde68a',
                          }}>
                            <div style={styles.tenantBillLeft}>
                              <div style={{
                                ...styles.tenantAvatar,
                                background: isPaid
                                  ? 'linear-gradient(135deg, #059669, #0891b2)'
                                  : 'linear-gradient(135deg, #d97706, #b45309)'
                              }}>
                                {tenant.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={styles.tenantBillName}>{tenant.name}</div>
                                <div style={styles.tenantBillBreakdown}>
                                  🏠 Rent: ₹{(tenant.monthlyRent || 0).toLocaleString()}
                                  &nbsp;+&nbsp;
                                  ⚡ Elec: ₹{(bill.amount || 0).toLocaleString()}
                                  &nbsp;=&nbsp;
                                  <strong>₹{totalBill.toLocaleString()}</strong>
                                </div>
                              </div>
                            </div>
                            <div style={styles.tenantBillRight}>
                              <div style={styles.totalBillAmt}>
                                ₹{totalBill.toLocaleString()}
                              </div>
                              {isPaid ? (
                                <div style={styles.paidTag}>✅ Collected</div>
                              ) : (
                                <button style={styles.collectBtn}
                                  onClick={() => markElecPaid(bill, tenant.id)}>
                                  💰 Collect
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Electricity Bill History</h2>
          {bills.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <p style={styles.emptyText}>No history yet</p>
            </div>
          ) : (
            [...new Set(bills.map(b => `${b.month} ${b.year}`))]
              .sort((a, b) => new Date(b) - new Date(a))
              .map(period => {
                const periodBills = bills.filter(b => `${b.month} ${b.year}` === period);
                return (
                  <div key={period} style={styles.historyGroup}>
                    <div style={styles.historyGroupTitle}>{period}</div>
                    {periodBills.map(bill => (
                      <div key={bill.id} style={styles.historyCard}>
                        <div style={styles.historyLeft}>
                          <div style={styles.historyIcon}>⚡</div>
                          <div>
                            <div style={styles.historyRoom}>Room {bill.roomNumber}</div>
                            <div style={styles.historySub}>
                              {bill.tenantCount} tenant{bill.tenantCount !== 1 ? 's' : ''} •
                              Reading: {bill.readingDate}
                            </div>
                            {bill.notes && (
                              <div style={styles.historyNotes}>📝 {bill.notes}</div>
                            )}
                          </div>
                        </div>
                        <div style={styles.historyRight}>
                          <div style={styles.historyAmount}>
                            ₹{bill.amount?.toLocaleString()}
                          </div>
                          <div style={{
                            ...styles.historyStatus,
                            background: bill.isPaid ? '#dcfce7' : '#fef2f2',
                            color: bill.isPaid ? '#059669' : '#dc2626',
                          }}>
                            {bill.isPaid ? '✅ Collected' : '⏳ Pending'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
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
  addBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
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
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  preview: { background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' },
  previewTitle: { fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '12px' },
  previewRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#1e293b', marginBottom: '8px' },
  previewTenant: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'white', borderRadius: '8px', marginBottom: '6px', border: '1px solid #e2e8f0' },
  previewAmounts: { display: 'flex', gap: '12px', alignItems: 'center' },
  previewRent: { fontSize: '12px', color: '#64748b' },
  previewElec: { fontSize: '12px', color: '#d97706', fontWeight: '600' },
  previewTotal: { fontSize: '13px', color: '#4f46e5', fontWeight: '800' },
  modalFooter: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '12px 24px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  billCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  billRoomHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' },
  billRoomLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  roomIcon: { fontSize: '32px' },
  billRoomName: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  billRoomSub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  billRoomRight: { textAlign: 'right' },
  billAmount: { fontSize: '20px', fontWeight: '800', color: '#d97706' },
  billNotes: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  tenantBreakdown: { display: 'flex', flexDirection: 'column', gap: '10px' },
  tenantBillRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '12px' },
  tenantBillLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  tenantAvatar: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px', flexShrink: 0 },
  tenantBillName: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
  tenantBillBreakdown: { fontSize: '12px', color: '#64748b', marginTop: '3px' },
  tenantBillRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  totalBillAmt: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  paidTag: { padding: '4px 12px', background: '#dcfce7', color: '#059669', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  collectBtn: { padding: '8px 16px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' },
  emptySub: { color: '#94a3b8', fontSize: '14px', margin: 0 },
  historyGroup: { marginBottom: '24px' },
  historyGroupTitle: { fontSize: '14px', fontWeight: '700', color: '#4f46e5', marginBottom: '12px', padding: '6px 12px', background: '#eef2ff', borderRadius: '8px', display: 'inline-block' },
  historyCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e2e8f0' },
  historyLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyIcon: { fontSize: '28px' },
  historyRoom: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
  historySub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  historyNotes: { fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' },
  historyRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyAmount: { fontSize: '16px', fontWeight: '800', color: '#d97706' },
  historyStatus: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
};

export default ElectricityPage;