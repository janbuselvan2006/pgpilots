import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .el-root { font-family:'DM Sans',sans-serif; background:#f0f2f8; min-height:100vh; }

  .el-topbar { background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%); padding:20px 20px 28px; position:relative; overflow:hidden; }
  .el-topbar::after { content:''; position:absolute; width:200px; height:200px; border-radius:50%; background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none; }
  .el-topbar-row { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; }
  .el-page-title { font-size:22px; font-weight:800; color:#fff; margin:0 0 3px; }
  .el-page-sub   { font-size:12px; color:rgba(255,255,255,0.5); font-weight:500; }
  .el-add-fab    { width:44px; height:44px; border-radius:14px; background:#e94560; border:none; color:white; font-size:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 14px rgba(233,69,96,0.45); -webkit-tap-highlight-color:transparent; flex-shrink:0; transition:transform 0.15s; }
  .el-add-fab:active { transform:scale(0.92); }

  .el-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin:-14px 16px 0; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); position:relative; z-index:2; }
  .el-stat  { padding:12px 6px; text-align:center; border-right:1px solid #f1f5f9; }
  .el-stat:last-child { border-right:none; }
  .el-stat-icon  { font-size:14px; margin-bottom:2px; }
  .el-stat-num   { font-size:13px; font-weight:800; line-height:1.1; }
  .el-stat-label { font-size:8px; color:#94a3b8; font-weight:600; margin-top:2px; text-transform:uppercase; letter-spacing:0.3px; }

  .el-content { padding:20px 16px 100px; }

  .el-tabs { display:flex; background:white; border-radius:14px; padding:4px; gap:4px; margin-bottom:18px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
  .el-tab  { flex:1; padding:10px 8px; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; background:transparent; color:#94a3b8; font-family:inherit; transition:all 0.2s; -webkit-tap-highlight-color:transparent; }
  .el-tab.active { background:linear-gradient(135deg,#e94560,#0f3460); color:white; }

  .el-info-banner { background:linear-gradient(135deg,#fffbeb,#fef3c7); border:1px solid #fde68a; border-radius:14px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:flex-start; gap:10px; }
  .el-info-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
  .el-info-text { font-size:12px; color:#92400e; font-weight:500; line-height:1.6; }
  .el-info-text strong { font-weight:700; }

  .el-bill-card   { background:white; border-radius:18px; margin-bottom:14px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
  .el-bill-header { background:linear-gradient(135deg,#1a1a2e,#0f3460); padding:14px 16px; display:flex; justify-content:space-between; align-items:center; }
  .el-bill-room  { font-size:16px; font-weight:800; color:white; }
  .el-bill-sub   { font-size:11px; color:rgba(255,255,255,0.55); margin-top:2px; }
  .el-bill-badge { background:rgba(233,69,96,0.2); border:1px solid rgba(233,69,96,0.4); color:white; font-size:15px; font-weight:800; padding:6px 14px; border-radius:20px; }
  .el-bill-body  { padding:14px; }

  .el-tenant-row { display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:12px; margin-bottom:8px; }
  .el-tenant-row:last-child { margin-bottom:0; }
  .el-tr-left   { display:flex; align-items:center; gap:10px; }
  .el-tr-avatar { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:15px; flex-shrink:0; }
  .el-tr-name   { font-size:14px; font-weight:700; color:#1e293b; }
  .el-tr-bd     { font-size:11px; color:#94a3b8; margin-top:2px; }
  .el-tr-right  { text-align:right; }
  .el-tr-elec   { font-size:16px; font-weight:800; color:#d97706; }
  .el-tr-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; margin-top:4px; display:inline-block; }
  .el-per-head  { margin-top:10px; padding:10px 12px; background:#f8fafc; border-radius:10px; font-size:12px; color:#64748b; font-weight:600; display:flex; justify-content:space-between; }

  .el-empty       { text-align:center; padding:50px 20px; background:white; border-radius:18px; }
  .el-empty-icon  { font-size:48px; margin-bottom:12px; }
  .el-empty-title { font-size:16px; font-weight:700; color:#1e293b; margin:0 0 6px; }
  .el-empty-sub   { font-size:13px; color:#94a3b8; margin:0 0 24px; }
  .el-empty-btn   { padding:13px 28px; background:linear-gradient(135deg,#e94560,#0f3460); color:white; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }
  .el-loading     { text-align:center; padding:50px; color:#94a3b8; font-size:14px; }
  .el-spinner     { width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#e94560; border-radius:50%; animation:elspin 0.7s linear infinite; margin:0 auto 12px; }
  @keyframes elspin { to { transform:rotate(360deg); } }

  .el-no-pg { text-align:center; padding:60px 20px; background:white; border-radius:20px; margin:20px 16px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }

  .el-history-group  { margin-bottom:20px; }
  .el-history-period { font-size:11px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:0.5px; padding:5px 12px; background:#eef2ff; border-radius:20px; display:inline-block; margin-bottom:10px; }
  .el-history-card   { background:white; border-radius:14px; padding:14px; margin-bottom:8px; box-shadow:0 1px 6px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center; }
  .el-hc-left   { display:flex; align-items:center; gap:10px; }
  .el-hc-icon   { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#d97706,#b45309); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .el-hc-room   { font-size:14px; font-weight:700; color:#1e293b; }
  .el-hc-sub    { font-size:11px; color:#94a3b8; margin-top:2px; }
  .el-hc-notes  { font-size:11px; color:#64748b; margin-top:2px; font-style:italic; }
  .el-hc-right  { text-align:right; }
  .el-hc-amount { font-size:16px; font-weight:800; color:#d97706; }
  .el-hc-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; margin-top:4px; display:inline-block; }

  .bso { position:fixed; inset:0; background:rgba(15,20,40,0.55); z-index:100; backdrop-filter:blur(2px); animation:elFade 0.2s ease; }
  @keyframes elFade { from{opacity:0}to{opacity:1} }
  .bs { position:fixed; bottom:0; left:0; right:0; background:white; border-radius:24px 24px 0 0; z-index:101; max-height:94dvh; overflow-y:auto; animation:elUp 0.3s cubic-bezier(0.32,0.72,0,1); padding-bottom:env(safe-area-inset-bottom,24px); }
  @keyframes elUp { from{transform:translateY(100%)}to{transform:translateY(0)} }
  @media(min-width:640px){
    .bs { left:50%; right:auto; width:520px; border-radius:24px; bottom:50%; transform:translate(-50%,50%); animation:elZoom 0.25s cubic-bezier(0.32,0.72,0,1); max-height:90vh; }
    @keyframes elZoom { from{opacity:0;transform:translate(-50%,50%) scale(0.95)}to{opacity:1;transform:translate(-50%,50%) scale(1)} }
    .el-stats   { margin:-14px 24px 0; }
    .el-content { padding:24px 24px 40px; }
  }
  .bs-handle { width:40px; height:4px; background:#e2e8f0; border-radius:99px; margin:12px auto 0; }
  .bs-header { display:flex; justify-content:space-between; align-items:center; padding:14px 20px 8px; position:sticky; top:0; background:white; z-index:1; border-bottom:1px solid #f1f5f9; }
  .bs-title  { font-size:17px; font-weight:800; color:#1a1a2e; margin:0; }
  .bs-close  { width:32px; height:32px; border-radius:50%; background:#f1f5f9; border:none; font-size:14px; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; -webkit-tap-highlight-color:transparent; }
  .bs-body   { padding:16px 20px 96px; }

  .ef-field  { margin-bottom:14px; }
  .ef-label  { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }
  .ef-input  { width:100%; padding:13px 14px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:15px; font-family:inherit; color:#1a1a2e; background:#fafbff; outline:none; box-sizing:border-box; -webkit-appearance:none; transition:border-color 0.2s; }
  .ef-input:focus { border-color:#e94560; background:white; }
  .ef-row    { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  .ef-month-scroll { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .ef-month-scroll::-webkit-scrollbar { display:none; }
  .ef-month-chip { white-space:nowrap; padding:8px 14px; border-radius:20px; border:1.5px solid #e2e8f0; background:white; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:all 0.15s; }
  .ef-month-chip.active { background:#1a1a2e; color:white; border-color:#1a1a2e; }

  .ef-preview        { background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px; margin-bottom:16px; }
  .ef-preview-title  { font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; }
  .ef-preview-total  { display:flex; justify-content:space-between; font-size:14px; color:#1e293b; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #e2e8f0; }
  .ef-preview-total span:last-child { font-weight:800; }
  .ef-preview-tenant { display:flex; justify-content:space-between; align-items:center; padding:10px; background:white; border-radius:10px; margin-bottom:6px; border:1px solid #e2e8f0; }
  .ef-pt-name  { font-size:13px; font-weight:700; color:#1e293b; }
  .ef-pt-bd    { font-size:11px; color:#94a3b8; margin-top:2px; }
  .ef-pt-total { font-size:14px; font-weight:800; color:#4f46e5; }

  .ef-save-btn { width:100%; padding:15px; background:linear-gradient(135deg,#e94560,#0f3460); color:white; border:none; border-radius:14px; font-size:15px; font-weight:700; font-family:inherit; cursor:pointer; margin-top:6px; box-shadow:0 4px 14px rgba(233,69,96,0.3); -webkit-tap-highlight-color:transparent; transition:opacity 0.2s,transform 0.1s; }
  .ef-save-btn:active   { transform:scale(0.98); opacity:0.9; }
  .ef-save-btn:disabled { opacity:0.6; cursor:not-allowed; }
`;

// ✅ Now accepts pgId prop from Dashboard
export default function ElectricityPage({ pgId }) {
  const [rooms, setRooms]       = useState([]);
  const [tenants, setTenants]   = useState([]);
  const [bills, setBills]       = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState('bills');
  const [form, setForm] = useState({
    roomNumber: '', amount: '',
    month:  new Date().toLocaleString('default', { month: 'long' }),
    year:   new Date().getFullYear().toString(),
    notes:  '', readingDate: new Date().toISOString().split('T')[0],
  });

  const user         = auth.currentUser;
  const months       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear  = new Date().getFullYear().toString();

  const fetchData = async () => {
    // ✅ Guard: need both user and pgId
    if (!user || !pgId) { setLoading(false); return; }
    setLoading(true);
    try {
      // ✅ All queries use pgId
      const [rSnap, tSnap, bSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'rooms'),            where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'tenants'),          where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'electricityBills'), where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'payments'),         where('pgId', '==', pgId))),
      ]);
      setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBills(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ✅ Re-fetch whenever pgId changes
  useEffect(() => { fetchData(); }, [pgId]);

  const getTenantsInRoom = (rn) =>
    tenants.filter(t => t.roomNumber === rn && t.status !== 'deleted' && t.status !== 'inactive');

  const getRoomBill = (rn, m, y) =>
    bills.find(b => b.roomNumber === rn && b.month === m && b.year === y);

  const isRentCollected = (tenantId, month, year) =>
    payments.some(p => {
      const pd = new Date(p.paymentDate);
      return p.tenantId === tenantId &&
        pd.toLocaleString('default', { month: 'long' }) === month &&
        pd.getFullYear().toString() === year &&
        p.isCompleted === true;
    });

  const handleAddBill = async () => {
    if (!form.roomNumber) return alert('Please select a room!');
    if (!form.amount || parseInt(form.amount) <= 0) return alert('Please enter valid amount!');
    if (!pgId) return alert('No PG selected!');
    if (getRoomBill(form.roomNumber, form.month, form.year))
      return alert(`Bill already added for Room ${form.roomNumber} in ${form.month} ${form.year}!`);
    const rt = getTenantsInRoom(form.roomNumber);
    setSaving(true);
    try {
      // ✅ Save with both ownerId and pgId
      await addDoc(collection(db, 'electricityBills'), {
        roomNumber:   form.roomNumber,
        amount:       parseInt(form.amount),
        month:        form.month,
        year:         form.year,
        notes:        form.notes,
        readingDate:  form.readingDate,
        tenantCount:  rt.length,
        tenantIds:    rt.map(t => t.id),
        tenantNames:  rt.map(t => t.name),
        isPaid:       false,
        paidTenantIds: [],
        ownerId:      user.uid,   // backward compat
        pgId:         pgId,       // ✅ multi-PG
        createdAt:    new Date().toISOString(),
      });
      setShowForm(false);
      setForm({
        roomNumber: '', amount: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year:  new Date().getFullYear().toString(),
        notes: '', readingDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const thisMonthBills = bills.filter(b => b.month === currentMonth && b.year === currentYear);
  const totalBilled    = thisMonthBills.reduce((a, b) => a + (b.amount || 0), 0);
  const roomsBilled    = thisMonthBills.length;
  const totalTenants   = thisMonthBills.reduce((a, b) => a + (b.tenantCount || 0), 0);
  const collectedCount = thisMonthBills.reduce((a, b) =>
    a + (b.tenantIds || []).filter(tid => isRentCollected(tid, b.month, b.year)).length, 0);

  const previewTenants = form.roomNumber ? getTenantsInRoom(form.roomNumber) : [];
  const perTenant      = previewTenants.length > 0 ? Math.round(parseInt(form.amount || 0) / previewTenants.length) : 0;

  // ✅ Show warning if no PG selected
  if (!pgId) {
    return (
      <>
        <style>{css}</style>
        <div className="el-no-pg">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>No PG Selected</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Please select a PG from the dashboard.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="el-root">

        <div className="el-topbar">
          <div className="el-topbar-row">
            <div>
              <h1 className="el-page-title">Electricity</h1>
              <p className="el-page-sub">{roomsBilled}/{rooms.length} rooms billed · {currentMonth}</p>
            </div>
            <button className="el-add-fab" onClick={() => setShowForm(true)}>⚡</button>
          </div>
        </div>

        <div className="el-stats">
          {[
            { label:'Billed',    value:`₹${(totalBilled/1000).toFixed(1)}k`,   color:'#d97706', icon:'⚡' },
            { label:'Rooms',     value:`${roomsBilled}/${rooms.length}`,         color:'#4f46e5', icon:'🏠' },
            { label:'Collected', value:`${collectedCount}/${totalTenants}`,      color:'#059669', icon:'✅' },
            { label:'Pending',   value:`${totalTenants - collectedCount}`,       color:'#dc2626', icon:'⏳' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="el-stat">
              <div className="el-stat-icon">{icon}</div>
              <div className="el-stat-num" style={{ color }}>{value}</div>
              <div className="el-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="el-content">
          <div className="el-info-banner">
            <span className="el-info-icon">💡</span>
            <div className="el-info-text">
              <strong>Electricity is collected via the Rent page.</strong> When you collect Rent + Electricity from a tenant, it's automatically marked as collected here. No separate collection needed!
            </div>
          </div>

          <div className="el-tabs">
            {[{ id:'bills', label:'⚡ Current Bills' }, { id:'history', label:'📋 History' }].map(({ id, label }) => (
              <button key={id} className={`el-tab${activeTab === id ? ' active' : ''}`}
                onClick={() => setActiveTab(id)}>{label}</button>
            ))}
          </div>

          {activeTab === 'bills' && (
            loading ? (
              <div className="el-loading"><div className="el-spinner" />Loading…</div>
            ) : thisMonthBills.length === 0 ? (
              <div className="el-empty">
                <div className="el-empty-icon">⚡</div>
                <p className="el-empty-title">No bills for {currentMonth}</p>
                <p className="el-empty-sub">Tap ⚡ to add room electricity charges</p>
                <button className="el-empty-btn" onClick={() => setShowForm(true)}>⚡ Add Bill</button>
              </div>
            ) : (
              thisMonthBills.map(bill => {
                const rt      = tenants.filter(t => t.roomNumber === bill.roomNumber && t.status !== 'deleted');
                const perHead = rt.length > 0 ? Math.round((bill.amount || 0) / rt.length) : (bill.amount || 0);
                return (
                  <div key={bill.id} className="el-bill-card">
                    <div className="el-bill-header">
                      <div>
                        <div className="el-bill-room">Room {bill.roomNumber}</div>
                        <div className="el-bill-sub">{bill.month} {bill.year} · {bill.readingDate}{bill.notes && ` · ${bill.notes}`}</div>
                      </div>
                      <div className="el-bill-badge">⚡ ₹{bill.amount?.toLocaleString()}</div>
                    </div>
                    <div className="el-bill-body">
                      {rt.length === 0 ? (
                        <div style={{ color:'#94a3b8', fontSize:'13px', padding:'8px', textAlign:'center' }}>No active tenants in this room</div>
                      ) : (
                        rt.map(tenant => {
                          const collected = isRentCollected(tenant.id, bill.month, bill.year);
                          return (
                            <div key={tenant.id} className="el-tenant-row" style={{
                              background: collected ? '#f0fdf4' : '#fffbeb',
                              border:     `1px solid ${collected ? '#bbf7d0' : '#fde68a'}`,
                            }}>
                              <div className="el-tr-left">
                                <div className="el-tr-avatar" style={{
                                  background: collected
                                    ? 'linear-gradient(135deg,#059669,#0891b2)'
                                    : 'linear-gradient(135deg,#d97706,#b45309)',
                                }}>
                                  {tenant.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="el-tr-name">{tenant.name}</div>
                                  <div className="el-tr-bd">🏠 ₹{(tenant.monthlyRent||0).toLocaleString()} + ⚡ ₹{perHead.toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="el-tr-right">
                                <div className="el-tr-elec">₹{perHead.toLocaleString()}</div>
                                <div className="el-tr-status" style={{
                                  background: collected ? '#dcfce7' : '#fef9c3',
                                  color:      collected ? '#059669' : '#d97706',
                                }}>
                                  {collected ? '✅ Collected' : '⏳ Via Rent'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {rt.length > 1 && (
                        <div className="el-per-head">
                          <span>⚡ Per tenant share</span>
                          <span style={{ color:'#d97706', fontWeight:'800' }}>₹{perHead.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'history' && (
            bills.length === 0 ? (
              <div className="el-empty">
                <div className="el-empty-icon">📋</div>
                <p className="el-empty-title">No history yet</p>
                <p className="el-empty-sub">Added bills will appear here</p>
              </div>
            ) : (
              [...new Set(bills.map(b => `${b.month} ${b.year}`))]
                .sort((a, b) => new Date(b) - new Date(a))
                .map(period => {
                  const [mon, yr] = period.split(' ');
                  const pb = bills.filter(b => `${b.month} ${b.year}` === period);
                  return (
                    <div key={period} className="el-history-group">
                      <div className="el-history-period">{period}</div>
                      {pb.map(bill => {
                        const allCollected = (bill.tenantIds || []).length > 0 &&
                          (bill.tenantIds || []).every(tid => isRentCollected(tid, mon, yr));
                        return (
                          <div key={bill.id} className="el-history-card">
                            <div className="el-hc-left">
                              <div className="el-hc-icon">⚡</div>
                              <div>
                                <div className="el-hc-room">Room {bill.roomNumber}</div>
                                <div className="el-hc-sub">{bill.tenantCount} tenant{bill.tenantCount !== 1 ? 's' : ''} · {bill.readingDate}</div>
                                {bill.notes && <div className="el-hc-notes">📝 {bill.notes}</div>}
                              </div>
                            </div>
                            <div className="el-hc-right">
                              <div className="el-hc-amount">₹{bill.amount?.toLocaleString()}</div>
                              <div className="el-hc-status" style={{
                                background: allCollected ? '#dcfce7' : '#fef2f2',
                                color:      allCollected ? '#059669' : '#dc2626',
                              }}>
                                {allCollected ? '✅ Collected' : '⏳ Pending'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
            )
          )}
        </div>

        {/* Add Bill Sheet */}
        {showForm && (
          <>
            <div className="bso" onClick={() => setShowForm(false)} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="bs-header">
                <h2 className="bs-title">⚡ Add Electricity Bill</h2>
                <button className="bs-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="bs-body">

                <div className="ef-field">
                  <label className="ef-label">Select Room *</label>
                  <select className="ef-input" value={form.roomNumber}
                    onChange={e => setForm({ ...form, roomNumber: e.target.value })}>
                    <option value="">-- Select Room --</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.roomNumber}>
                        Room {r.roomNumber} · {getTenantsInRoom(r.roomNumber).length} tenants
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ef-field">
                  <label className="ef-label">Total Bill Amount (₹) *</label>
                  <input className="ef-input" type="number" inputMode="numeric" placeholder="e.g. 600"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>

                <div className="ef-field">
                  <label className="ef-label">Month</label>
                  <div className="ef-month-scroll">
                    {months.map(m => (
                      <button key={m} className={`ef-month-chip${form.month === m ? ' active' : ''}`}
                        onClick={() => setForm({ ...form, month: m })}>{m.slice(0, 3)}</button>
                    ))}
                  </div>
                </div>

                <div className="ef-row">
                  <div className="ef-field">
                    <label className="ef-label">Year</label>
                    <input className="ef-input" type="number" inputMode="numeric"
                      value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
                  </div>
                  <div className="ef-field">
                    <label className="ef-label">Reading Date</label>
                    <input className="ef-input" type="date"
                      value={form.readingDate} onChange={e => setForm({ ...form, readingDate: e.target.value })} />
                  </div>
                </div>

                <div className="ef-field">
                  <label className="ef-label">Notes (optional)</label>
                  <input className="ef-input" type="text" placeholder="e.g. High usage month"
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>

                {form.roomNumber && form.amount && parseInt(form.amount) > 0 && (
                  <div className="ef-preview">
                    <div className="ef-preview-title">📋 Preview · {form.month} {form.year}</div>
                    <div className="ef-preview-total">
                      <span>Room {form.roomNumber} Total</span>
                      <span>₹{parseInt(form.amount).toLocaleString()}</span>
                    </div>
                    {previewTenants.length === 0 ? (
                      <div style={{ color:'#dc2626', fontSize:'13px', fontWeight:'600' }}>⚠️ No active tenants in this room!</div>
                    ) : previewTenants.map(t => (
                      <div key={t.id} className="ef-preview-tenant">
                        <div>
                          <div className="ef-pt-name">👤 {t.name}</div>
                          <div className="ef-pt-bd">Rent ₹{(t.monthlyRent||0).toLocaleString()} + Elec ₹{perTenant.toLocaleString()}</div>
                        </div>
                        <div className="ef-pt-total">₹{((t.monthlyRent||0)+perTenant).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="ef-save-btn" onClick={handleAddBill} disabled={saving}>
                  {saving ? 'Saving…' : '⚡ Add Bill'}
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}