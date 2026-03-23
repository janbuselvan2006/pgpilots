import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

const FEATURES = [
  { key: 'electricity', label: 'Electricity Bills',   icon: '⚡', desc: 'Track & manage electricity usage' },
  { key: 'payments',    label: 'Payments / Rent',     icon: '💳', desc: 'Rent collection & payment history' },
  { key: 'rooms',       label: 'Rooms Management',    icon: '🛏️', desc: 'Add, edit, manage rooms & beds' },
  { key: 'tenants',     label: 'Tenant Management',   icon: '👥', desc: 'Tenant profiles & onboarding' },
  { key: 'reports',     label: 'Reports / Analytics', icon: '📊', desc: 'Revenue reports & analytics' },
];
const DEFAULT_FEATURES = { electricity: true, payments: true, rooms: true, tenants: true, reports: true };

// ✅ Added maxPGs to defaults
const DEFAULT_LIMITS = { maxTenants: 50, maxRooms: 20, maxReportsPerMonth: 5, maxPGs: 1 };

// ✅ Added maxPGs to limit fields
const LIMIT_FIELDS = [
  { key: 'maxTenants',         label: 'Max Tenants',              icon: '👥', desc: 'Total tenants owner can add',          unit: 'tenants',      min: 1,  max: 500, step: 5  },
  { key: 'maxRooms',           label: 'Max Rooms',                icon: '🛏️', desc: 'Total rooms owner can create',         unit: 'rooms',        min: 1,  max: 200, step: 5  },
  { key: 'maxPGs',             label: 'Max PGs',                  icon: '🏠', desc: 'How many PGs this owner can add',      unit: 'PGs',          min: 1,  max: 20,  step: 1  },
  { key: 'maxReportsPerMonth', label: 'Report Downloads / Month', icon: '📊', desc: 'Report downloads allowed per month',   unit: 'downloads/mo', min: 1,  max: 100, step: 1  },
];

// ✅ Plan-based default PG limits
const PLAN_PG_LIMITS = { trial: 1, basic: 1, starter: 1, growth: 3, pro: 999, premium: 5, standard: 3 };

function AdminPanel() {
  const [owners, setOwners]           = useState([]);
  const [allTenants, setAllTenants]   = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [search, setSearch]           = useState('');
  const [filterPlan, setFilterPlan]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [togglingFeature, setTogglingFeature] = useState(null);
  const [editingLimits, setEditingLimits]     = useState({});
  const [savingLimits, setSavingLimits]       = useState({});
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const oSnap = await getDocs(collection(db, 'pgOwners'));
      setOwners(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const tSnap = await getDocs(collection(db, 'tenants'));
      setAllTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const pSnap = await getDocs(collection(db, 'payments'));
      setAllPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const showSuccess = msg => { setSuccessMsg(msg); setErrorMsg('');   setTimeout(() => setSuccessMsg(''), 3000); };
  const showError   = msg => { setErrorMsg(msg);   setSuccessMsg(''); setTimeout(() => setErrorMsg(''),   3000); };

  const getOwnerFeatures  = owner => ({ ...DEFAULT_FEATURES, ...(owner.features || {}) });
  const getOwnerLimits    = owner => ({ ...DEFAULT_LIMITS,   ...(owner.limits   || {}) });
  const getEditingLimits  = owner => editingLimits[owner.id] || getOwnerLimits(owner);

  const setLimitField = (ownerId, key, value) => {
    const owner = owners.find(o => o.id === ownerId);
    setEditingLimits(prev => ({ ...prev, [ownerId]: { ...getEditingLimits(owner), [key]: parseInt(value) || 0 } }));
  };

  const saveLimits = async ownerId => {
    setSavingLimits(prev => ({ ...prev, [ownerId]: true }));
    try {
      const owner  = owners.find(o => o.id === ownerId);
      const limits = getEditingLimits(owner);
      await updateDoc(doc(db, 'pgOwners', ownerId), { limits });
      setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, limits } : o));
      if (selectedOwner?.id === ownerId) setSelectedOwner(prev => ({ ...prev, limits }));
      setEditingLimits(prev => { const n = { ...prev }; delete n[ownerId]; return n; });
      showSuccess('✅ Limits saved!');
    } catch (err) { showError('Failed to save limits!'); }
    setSavingLimits(prev => ({ ...prev, [ownerId]: false }));
  };

  const resetLimits = async ownerId => {
    setSavingLimits(prev => ({ ...prev, [ownerId]: true }));
    try {
      await updateDoc(doc(db, 'pgOwners', ownerId), { limits: DEFAULT_LIMITS });
      setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, limits: DEFAULT_LIMITS } : o));
      if (selectedOwner?.id === ownerId) setSelectedOwner(prev => ({ ...prev, limits: DEFAULT_LIMITS }));
      setEditingLimits(prev => { const n = { ...prev }; delete n[ownerId]; return n; });
      showSuccess('🔄 Limits reset to defaults!');
    } catch (err) { showError('Failed to reset!'); }
    setSavingLimits(prev => ({ ...prev, [ownerId]: false }));
  };

  const toggleFeature = async (ownerId, featureKey, currentValue) => {
    setTogglingFeature(featureKey + ownerId);
    try {
      const owner       = owners.find(o => o.id === ownerId);
      const newFeatures = { ...getOwnerFeatures(owner), [featureKey]: !currentValue };
      await updateDoc(doc(db, 'pgOwners', ownerId), { features: newFeatures });
      setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, features: newFeatures } : o));
      if (selectedOwner?.id === ownerId) setSelectedOwner(prev => ({ ...prev, features: newFeatures }));
      showSuccess(`${!currentValue ? '✅ Enabled' : '🔴 Disabled'} ${FEATURES.find(f => f.key === featureKey)?.label}!`);
    } catch (err) { showError('Failed to update feature!'); }
    setTogglingFeature(null);
  };

  const setAllFeatures = async (ownerId, enabled) => {
    setSaving(true);
    try {
      const all = Object.fromEntries(FEATURES.map(f => [f.key, enabled]));
      await updateDoc(doc(db, 'pgOwners', ownerId), { features: all });
      setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, features: all } : o));
      if (selectedOwner?.id === ownerId) setSelectedOwner(prev => ({ ...prev, features: all }));
      showSuccess(enabled ? '✅ All features enabled!' : '🔴 All features disabled!');
    } catch (err) { showError('Failed!'); }
    setSaving(false);
  };

  const updateOwner = async (ownerId, fields) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pgOwners', ownerId), fields);
      showSuccess('✅ Updated!');
      setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, ...fields } : o));
      if (selectedOwner?.id === ownerId) setSelectedOwner(prev => ({ ...prev, ...fields }));
    } catch (err) { showError('Failed to update!'); }
    setSaving(false);
  };

  // ✅ When plan changes, auto-update maxPGs limit to match plan
  const updatePlan = async (ownerId, plan) => {
    const owner      = owners.find(o => o.id === ownerId);
    const curLimits  = getOwnerLimits(owner);
    const newMaxPGs  = PLAN_PG_LIMITS[plan] ?? 1;
    const newLimits  = { ...curLimits, maxPGs: newMaxPGs };
    await updateDoc(doc(db, 'pgOwners', ownerId), { plan, limits: newLimits });
    showSuccess(`✅ Plan updated to ${plan}! Max PGs set to ${newMaxPGs}.`);
    setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, plan, limits: newLimits } : o));
    if (selectedOwner?.id === ownerId) setSelectedOwner(prev => ({ ...prev, plan, limits: newLimits }));
  };

  const deleteOwner = async owner => {
    if (!window.confirm(`DELETE ${owner.name}?\n\nThis cannot be undone.`)) return;
    if (!window.confirm(`FINAL WARNING: All data will be deleted. OK?`)) return;
    setSaving(true);
    try {
      for (const col of ['rooms', 'tenants', 'payments', 'electricityBills']) {
        const snap = await getDocs(query(collection(db, col), where('ownerId', '==', owner.id)));
        for (const d of snap.docs) await deleteDoc(doc(db, col, d.id));
      }
      await deleteDoc(doc(db, 'pgOwners', owner.id));
      showSuccess('🗑️ Deleted!'); setSelectedOwner(null); fetchData();
    } catch (err) { showError('Failed to delete!'); }
    setSaving(false);
  };

  const extendTrial = async (owner, days) => {
    const d = new Date(); d.setDate(d.getDate() + parseInt(days));
    await updateOwner(owner.id, { plan: 'trial', isActive: true, trialEnd: d.toISOString().split('T')[0] });
  };
  const getTrialDaysLeft = owner => {
    if (!owner.trialEnd) return 0;
    return Math.max(0, Math.ceil((new Date(owner.trialEnd) - new Date()) / 86400000));
  };

  const nonAdmin       = owners.filter(o => !o.isAdmin);
  const totalOwners    = nonAdmin.length;
  const activeOwners   = nonAdmin.filter(o => o.isActive !== false).length;
  const blockedOwners  = nonAdmin.filter(o => o.isActive === false).length;
  const totalTenants   = allTenants.length;
  const thisMonth      = new Date().toLocaleString('default', { month: 'long' });
  const thisYear       = new Date().getFullYear().toString();
  const monthlyRevenue = allPayments.filter(p => p.month === thisMonth && p.year === thisYear).reduce((a, p) => a + (p.amount || 0), 0);
  const planCounts     = { trial: nonAdmin.filter(o => o.plan==='trial').length, basic: nonAdmin.filter(o => o.plan==='basic').length, standard: nonAdmin.filter(o => o.plan==='standard').length, premium: nonAdmin.filter(o => o.plan==='premium').length };
  const planColors     = { trial: '#d97706', basic: '#4f46e5', standard: '#059669', premium: '#dc2626', starter: '#4f46e5', growth: '#059669', pro: '#dc2626' };

  const filteredOwners = nonAdmin.filter(o => {
    const ms = !search       || o.name?.toLowerCase().includes(search.toLowerCase()) || o.pgName?.toLowerCase().includes(search.toLowerCase()) || o.email?.toLowerCase().includes(search.toLowerCase());
    const mp = !filterPlan   || o.plan === filterPlan;
    const mx = !filterStatus || (filterStatus==='active' && o.isActive!==false) || (filterStatus==='blocked' && o.isActive===false);
    return ms && mp && mx;
  });

  const getOwnerTenants = id => allTenants.filter(t => t.ownerId === id);
  const getOwnerRevenue = id => allPayments.filter(p => p.ownerId===id && p.month===thisMonth && p.year===thisYear).reduce((a, p) => a + (p.amount || 0), 0);
  const enabledCount    = owner => { const f = getOwnerFeatures(owner); return FEATURES.filter(ft => f[ft.key]).length; };

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const ToggleSwitch = ({ isOn, isLoading, onToggle }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <div onClick={() => !isLoading && onToggle()} style={{ width:'42px', height:'22px', borderRadius:'11px', background: isOn ? '#059669':'#e2e8f0', position:'relative', cursor: isLoading?'not-allowed':'pointer', opacity: isLoading?0.6:1, transition:'background 0.2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:'3px', left: isOn?'22px':'2px', width:'16px', height:'16px', borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize:'11px', fontWeight:'700', color: isOn?'#059669':'#94a3b8', minWidth:'28px' }}>
        {isLoading ? '...' : isOn ? 'ON' : 'OFF'}
      </span>
    </div>
  );

  const UsageBar = ({ used, max }) => {
    const pct   = max > 0 ? Math.min((used/max)*100, 100) : 0;
    const color = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#4f46e5';
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <div style={{ flex:1, height:'6px', background:'#e2e8f0', borderRadius:'99px', overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'99px', transition:'width 0.3s' }} />
        </div>
        <span style={{ fontSize:'11px', fontWeight:'700', color, minWidth:'48px', textAlign:'right' }}>{used}/{max}</span>
      </div>
    );
  };

  return (
    <div style={s.wrapper}>
      <div style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>🔐 Admin Panel</div>
          <div style={s.adminBadge}>Super Admin</div>
        </div>
        <nav style={s.nav}>
          {[
            { id:'dashboard', icon:'📊', label:'Dashboard'       },
            { id:'owners',    icon:'👥', label:'PG Owners'       },
            { id:'features',  icon:'🎛️', label:'Feature Control' },
            { id:'limits',    icon:'📏', label:'Usage Limits'    },
            { id:'revenue',   icon:'💰', label:'Revenue'         },
          ].map(({ id, icon, label }) => (
            <div key={id} style={{ ...s.navItem, ...(activeTab===id ? s.navActive:{}) }} onClick={() => setActiveTab(id)}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
      </div>

      <div style={s.main}>
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>
            {activeTab==='dashboard' && '📊 Admin Dashboard'}
            {activeTab==='owners'    && '👥 PG Owners'}
            {activeTab==='features'  && '🎛️ Feature Control'}
            {activeTab==='limits'    && '📏 Usage Limits'}
            {activeTab==='revenue'   && '💰 Revenue'}
          </h1>
          <div style={s.topBarRight}>
            <span style={s.topDate}>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span>
            <button style={s.refreshBtn} onClick={fetchData}>🔄 Refresh</button>
          </div>
        </div>

        {successMsg && <div style={s.successBanner}>{successMsg}</div>}
        {errorMsg   && <div style={s.errorBanner}>{errorMsg}</div>}

        {loading ? <div style={s.loading}>Loading...</div> : <>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={s.statsGrid}>
                {[
                  { label:'Total Owners',   value:totalOwners,  icon:'👥', color:'#4f46e5', bg:'#eef2ff' },
                  { label:'Active Owners',  value:activeOwners, icon:'✅', color:'#059669', bg:'#ecfdf5' },
                  { label:'Blocked Owners', value:blockedOwners,icon:'🔴', color:'#dc2626', bg:'#fef2f2' },
                  { label:'Total Tenants',  value:totalTenants, icon:'🏠', color:'#d97706', bg:'#fffbeb' },
                ].map(({ label,value,icon,color,bg }) => (
                  <div key={label} style={{ ...s.statCard, background:bg }}>
                    <div style={s.statIcon}>{icon}</div>
                    <div style={{ ...s.statValue, color }}>{value}</div>
                    <div style={s.statLabel}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={s.rowGrid}>
                <div style={s.card}>
                  <h2 style={s.cardTitle}>💰 This Month Revenue</h2>
                  <div style={s.bigRevenue}>₹{monthlyRevenue.toLocaleString()}</div>
                  <div style={s.revenueMonth}>{thisMonth} {thisYear}</div>
                </div>
                <div style={s.card}>
                  <h2 style={s.cardTitle}>📊 Plan Breakdown</h2>
                  {Object.entries(planCounts).map(([plan, count]) => (
                    <div key={plan} style={s.planRow}>
                      <div style={s.planRowLeft}><div style={{ ...s.planDot, background:planColors[plan] }}/><span style={s.planRowName}>{plan.charAt(0).toUpperCase()+plan.slice(1)}</span></div>
                      <div style={s.planRowRight}>
                        <div style={s.planBar}><div style={{ ...s.planBarFill, width: totalOwners>0?`${(count/totalOwners)*100}%`:'0%', background:planColors[plan] }}/></div>
                        <span style={s.planCount}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={s.card}>
                <h2 style={s.cardTitle}>🆕 Recent Signups</h2>
                <div style={s.recentList}>
                  {nonAdmin.slice(-5).reverse().map(owner => (
                    <div key={owner.id} style={s.recentRow}>
                      <div style={s.recentLeft}>
                        <div style={s.recentAvatar}>{owner.name?.charAt(0).toUpperCase()}</div>
                        <div><div style={s.recentName}>{owner.name}</div><div style={s.recentPg}>{owner.pgName}</div></div>
                      </div>
                      <div style={s.recentRight}>
                        <div style={{ ...s.planBadge, background:planColors[owner.plan]||'#94a3b8' }}>{owner.plan||'trial'}</div>
                        <div style={{ ...s.statusDot, background: owner.isActive===false?'#dc2626':'#059669' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── OWNERS ── */}
          {activeTab === 'owners' && (
            <div>
              <div style={s.filterRow}>
                <input style={s.searchInput} type="text" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}/>
                <select style={s.filterSelect} value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                  <option value="">All Plans</option>
                  <option value="trial">Trial</option><option value="starter">Starter</option>
                  <option value="growth">Growth</option><option value="pro">Pro</option>
                </select>
                <select style={s.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="active">Active</option><option value="blocked">Blocked</option>
                </select>
                {(search||filterPlan||filterStatus) && <button style={s.clearBtn} onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatus(''); }}>✕ Clear</button>}
              </div>
              <div style={s.resultCount}>{filteredOwners.length} owners found</div>
              <div style={s.ownersList}>
                {filteredOwners.map(owner => {
                  const isBlocked = owner.isActive === false;
                  const features  = getOwnerFeatures(owner);
                  const limits    = getOwnerLimits(owner);
                  const tc        = getOwnerTenants(owner.id).length;
                  return (
                    <div key={owner.id} style={{ ...s.ownerCard, borderLeft:`4px solid ${isBlocked?'#dc2626':planColors[owner.plan]||'#94a3b8'}`, opacity:isBlocked?0.85:1 }}>
                      <div style={s.ownerCardTop}>
                        <div style={s.ownerLeft}>
                          <div style={{ ...s.ownerAvatar, background: isBlocked?'linear-gradient(135deg,#dc2626,#9f1239)':'linear-gradient(135deg,#e94560,#0f3460)' }}>{owner.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={s.ownerName}>{owner.name}</div>
                            <div style={s.ownerPg}>{owner.pgName}</div>
                            <div style={s.ownerEmail}>{owner.email}</div>
                            {owner.city && <div style={s.ownerCity}>📍 {owner.city}, {owner.state}</div>}
                            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'8px' }}>
                              {FEATURES.map(f => (
                                <span key={f.key} style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'600', background:features[f.key]?'#ecfdf5':'#fef2f2', color:features[f.key]?'#059669':'#dc2626', border:`1px solid ${features[f.key]?'#bbf7d0':'#fecaca'}` }}>{f.icon} {f.label.split(' ')[0]}</span>
                              ))}
                            </div>
                            <div style={{ display:'flex', gap:'12px', marginTop:'6px', fontSize:'11px', color:'#94a3b8' }}>
                              <span>👥 {tc}/{limits.maxTenants} tenants</span>
                              <span>🏠 max {limits.maxPGs} PGs</span>
                              <span>🛏️ max {limits.maxRooms} rooms</span>
                            </div>
                          </div>
                        </div>
                        <div style={s.ownerRight}>
                          <div style={{ ...s.planBadge, background:planColors[owner.plan]||'#94a3b8' }}>{(owner.plan||'trial').toUpperCase()}</div>
                          <div style={{ ...s.statusBadge, background:isBlocked?'#fef2f2':'#ecfdf5', color:isBlocked?'#dc2626':'#059669' }}>{isBlocked?'🔴 Blocked':'✅ Active'}</div>
                          {owner.plan==='trial' && <div style={s.trialDays}>⏳ {getTrialDaysLeft(owner)} days left</div>}
                          <div style={s.ownerStats}><span>💰 ₹{getOwnerRevenue(owner.id).toLocaleString()}</span></div>
                        </div>
                      </div>
                      <div style={s.ownerActions}>
                        <button style={s.viewBtn} onClick={() => setSelectedOwner(owner)}>👁️ View Details</button>
                        {isBlocked
                          ? <button style={s.activateBtn} onClick={() => updateOwner(owner.id, { isActive:true })}>✅ Unblock</button>
                          : <button style={s.blockBtn}    onClick={() => updateOwner(owner.id, { isActive:false })}>🔴 Block</button>}
                        {/* ✅ Plan change now auto-updates maxPGs */}
                        <select style={s.planSelect} value={owner.plan||'trial'} onChange={e => updatePlan(owner.id, e.target.value)}>
                          <option value="trial">Trial (1 PG)</option>
                          <option value="starter">Starter (1 PG)</option>
                          <option value="growth">Growth (3 PGs)</option>
                          <option value="pro">Pro (Unlimited)</option>
                        </select>
                        <button style={s.deleteBtn} onClick={() => deleteOwner(owner)}>🗑️ Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FEATURE CONTROL ── */}
          {activeTab === 'features' && (
            <div>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'12px', padding:'14px 18px', marginBottom:'20px', display:'flex', gap:'12px' }}>
                <span style={{ fontSize:'18px' }}>💡</span>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#1e40af', marginBottom:'4px' }}>How Feature Control Works</div>
                  <div style={{ fontSize:'13px', color:'#3b82f6' }}>Toggle ON/OFF per owner. When disabled, the owner sees a locked screen. Changes are instant.</div>
                </div>
              </div>
              <input style={{ ...s.searchInput, marginBottom:'16px', maxWidth:'400px', display:'block' }} type="text" placeholder="🔍 Search owner..." value={search} onChange={e => setSearch(e.target.value)}/>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {filteredOwners.map(owner => {
                  const features  = getOwnerFeatures(owner);
                  const isBlocked = owner.isActive === false;
                  return (
                    <div key={owner.id} style={{ background:'white', borderRadius:'14px', padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', borderLeft:`4px solid ${planColors[owner.plan]||'#94a3b8'}`, opacity:isBlocked?0.75:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{ ...s.ownerAvatar, width:'40px', height:'40px', fontSize:'16px', background:'linear-gradient(135deg,#e94560,#0f3460)', flexShrink:0 }}>{owner.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={{ fontSize:'15px', fontWeight:'700', color:'#1e293b' }}>{owner.name}</div>
                            <div style={{ fontSize:'12px', color:'#94a3b8' }}>{owner.pgName} • {owner.email}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                          <div style={{ ...s.planBadge, background:planColors[owner.plan]||'#94a3b8' }}>{(owner.plan||'trial').toUpperCase()}</div>
                          <span style={{ fontSize:'12px', color:'#94a3b8' }}>{enabledCount(owner)}/{FEATURES.length} on</span>
                          <button style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', background:'#ecfdf5', color:'#059669', border:'1px solid #bbf7d0' }} disabled={saving} onClick={() => setAllFeatures(owner.id, true)}>✅ All On</button>
                          <button style={{ padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }} disabled={saving} onClick={() => setAllFeatures(owner.id, false)}>🔴 All Off</button>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'10px' }}>
                        {FEATURES.map(feature => {
                          const isOn      = features[feature.key];
                          const isLoading = togglingFeature === feature.key + owner.id;
                          return (
                            <div key={feature.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:'10px', gap:'10px', background:isOn?'#f0fdf4':'#fff', border:`1px solid ${isOn?'#bbf7d0':'#e2e8f0'}`, transition:'background 0.2s' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1 }}>
                                <span style={{ fontSize:'20px' }}>{feature.icon}</span>
                                <div>
                                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#1e293b' }}>{feature.label}</div>
                                  <div style={{ fontSize:'11px', color:'#94a3b8' }}>{feature.desc}</div>
                                </div>
                              </div>
                              <ToggleSwitch isOn={isOn} isLoading={isLoading} onToggle={() => toggleFeature(owner.id, feature.key, isOn)}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── USAGE LIMITS ── */}
          {activeTab === 'limits' && (
            <div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'12px', padding:'14px 18px', marginBottom:'20px', display:'flex', gap:'12px' }}>
                <span style={{ fontSize:'18px' }}>📏</span>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#92400e', marginBottom:'4px' }}>How Usage Limits Work</div>
                  <div style={{ fontSize:'13px', color:'#b45309' }}>Set custom limits per owner. <strong>maxPGs</strong> controls how many PGs they can add. Auto-updates when you change their plan.</div>
                </div>
              </div>
              <input style={{ ...s.searchInput, marginBottom:'16px', maxWidth:'400px', display:'block' }} type="text" placeholder="🔍 Search owner..." value={search} onChange={e => setSearch(e.target.value)}/>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {filteredOwners.map(owner => {
                  const limits    = getOwnerLimits(owner);
                  const editing   = getEditingLimits(owner);
                  const isSaving  = savingLimits[owner.id];
                  const isDirty   = !!editingLimits[owner.id];
                  const isBlocked = owner.isActive === false;
                  const tc        = getOwnerTenants(owner.id).length;
                  const usageMap  = { maxTenants: tc, maxRooms: 0, maxPGs: owner.pgCount || 0, maxReportsPerMonth: owner.reportsDownloadedThisMonth || 0 };
                  return (
                    <div key={owner.id} style={{ background:'white', borderRadius:'14px', padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', borderLeft:`4px solid ${planColors[owner.plan]||'#94a3b8'}`, opacity:isBlocked?0.75:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{ ...s.ownerAvatar, width:'40px', height:'40px', fontSize:'16px', background:'linear-gradient(135deg,#e94560,#0f3460)', flexShrink:0 }}>{owner.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={{ fontSize:'15px', fontWeight:'700', color:'#1e293b' }}>{owner.name}</div>
                            <div style={{ fontSize:'12px', color:'#94a3b8' }}>{owner.pgName} • {owner.email}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ ...s.planBadge, background:planColors[owner.plan]||'#94a3b8' }}>{(owner.plan||'trial').toUpperCase()}</div>
                          {isDirty && <span style={{ fontSize:'11px', color:'#d97706', fontWeight:'600' }}>● Unsaved changes</span>}
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px', marginBottom:'16px' }}>
                        {LIMIT_FIELDS.map(field => {
                          const currentVal = editing[field.key];
                          const usedVal    = usageMap[field.key] || 0;
                          const changed    = isDirty && editing[field.key] !== limits[field.key];
                          return (
                            <div key={field.key} style={{ background: field.key==='maxPGs'?'#eff6ff':'#f8fafc', borderRadius:'12px', padding:'16px', border:`1px solid ${field.key==='maxPGs'?'#bfdbfe':'#e2e8f0'}` }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                                <span style={{ fontSize:'18px' }}>{field.icon}</span>
                                <div>
                                  <div style={{ fontSize:'13px', fontWeight:'700', color:'#1e293b' }}>{field.label}{field.key==='maxPGs'&&<span style={{ fontSize:'10px', background:'#dbeafe', color:'#1e40af', padding:'2px 6px', borderRadius:'4px', marginLeft:'6px', fontWeight:'600' }}>NEW</span>}</div>
                                  <div style={{ fontSize:'11px', color:'#94a3b8' }}>{field.desc}</div>
                                </div>
                              </div>
                              <div style={{ marginBottom:'12px' }}>
                                <div style={{ fontSize:'11px', color:'#94a3b8', marginBottom:'4px' }}>Current usage</div>
                                <UsageBar used={usedVal} max={currentVal}/>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <span style={{ fontSize:'12px', color:'#64748b', fontWeight:'600', minWidth:'36px' }}>Limit:</span>
                                <input
                                  type="number" min={field.min} max={field.max} step={field.step} value={currentVal}
                                  onChange={e => setLimitField(owner.id, field.key, e.target.value)}
                                  style={{ width:'80px', padding:'6px 10px', borderRadius:'8px', border:`1.5px solid ${changed?'#f59e0b':'#e2e8f0'}`, fontSize:'14px', fontWeight:'700', color:'#1e293b', background:'white', outline:'none', textAlign:'center' }}
                                />
                                <span style={{ fontSize:'12px', color:'#94a3b8' }}>{field.unit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                        <button onClick={() => saveLimits(owner.id)} disabled={!isDirty||isSaving}
                          style={{ padding:'10px 20px', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:(!isDirty||isSaving)?'not-allowed':'pointer', background:isDirty?'#4f46e5':'#e2e8f0', color:isDirty?'white':'#94a3b8', border:'none', opacity:isSaving?0.6:1 }}>
                          {isSaving ? '⏳ Saving...' : '💾 Save Limits'}
                        </button>
                        <button onClick={() => resetLimits(owner.id)} disabled={isSaving}
                          style={{ padding:'10px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer', background:'#f1f5f9', color:'#64748b', border:'1px solid #e2e8f0' }}>
                          🔄 Reset Defaults
                        </button>
                        {isDirty && (
                          <button onClick={() => setEditingLimits(prev => { const n = { ...prev }; delete n[owner.id]; return n; })}
                            style={{ padding:'10px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>
                            ✕ Discard
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── REVENUE ── */}
          {activeTab === 'revenue' && (
            <div>
              <div style={s.statsGrid}>
                {[
                  { label:'This Month',     value:`₹${monthlyRevenue.toLocaleString()}`, icon:'💰', color:'#059669', bg:'#ecfdf5' },
                  { label:'Total Payments', value:allPayments.length,                    icon:'📋', color:'#4f46e5', bg:'#eef2ff' },
                  { label:'Avg per Owner',  value:`₹${totalOwners>0?Math.round(monthlyRevenue/totalOwners).toLocaleString():0}`, icon:'📊', color:'#d97706', bg:'#fffbeb' },
                  { label:'Total Tenants',  value:totalTenants,                          icon:'👥', color:'#dc2626', bg:'#fef2f2' },
                ].map(({ label,value,icon,color,bg }) => (
                  <div key={label} style={{ ...s.statCard, background:bg }}>
                    <div style={s.statIcon}>{icon}</div>
                    <div style={{ ...s.statValue, color }}>{value}</div>
                    <div style={s.statLabel}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={s.card}>
                <h2 style={s.cardTitle}>💰 Revenue by Owner — {thisMonth} {thisYear}</h2>
                <div style={s.revenueList}>
                  {nonAdmin.map(o => ({ ...o, revenue: getOwnerRevenue(o.id), tenants: getOwnerTenants(o.id).length }))
                    .sort((a, b) => b.revenue - a.revenue).map(owner => (
                    <div key={owner.id} style={s.revenueRow}>
                      <div style={s.revenueLeft}>
                        <div style={s.revenueAvatar}>{owner.name?.charAt(0).toUpperCase()}</div>
                        <div><div style={s.revenueName}>{owner.name}</div><div style={s.revenuePg}>{owner.pgName} • {owner.tenants} tenants</div></div>
                      </div>
                      <div style={s.revenueRight}>
                        <div style={s.revenueAmount}>₹{owner.revenue.toLocaleString()}</div>
                        <div style={{ ...s.planBadge, background:planColors[owner.plan]||'#94a3b8' }}>{owner.plan||'trial'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>}

        {/* ── MODAL ── */}
        {selectedOwner && (
          <div style={s.modalOverlay}>
            <div style={s.modal}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>👤 {selectedOwner.name}</h3>
                <button style={s.closeBtn} onClick={() => setSelectedOwner(null)}>✕</button>
              </div>
              <div style={s.detailGrid}>
                <div>
                  <div style={s.detailAvatar}>{selectedOwner.name?.charAt(0).toUpperCase()}</div>
                  <div style={s.detailName}>{selectedOwner.name}</div>
                  <div style={s.detailPg}>{selectedOwner.pgName}</div>
                  <div style={s.detailInfo}>
                    {[['📧', selectedOwner.email], ['📱', selectedOwner.phone||'Not set'], ['📍', `${selectedOwner.city||'Not set'}, ${selectedOwner.state||''}`], ['👥', `${getOwnerTenants(selectedOwner.id).length} tenants`], ['💰', `₹${getOwnerRevenue(selectedOwner.id).toLocaleString()} this month`]].map(([icon, val]) => (
                      <div key={icon} style={s.detailRow}><span>{icon}</span><span>{val}</span></div>
                    ))}
                  </div>
                  <div style={{ marginTop:'20px' }}>
                    <div style={{ fontSize:'12px', fontWeight:'700', color:'#64748b', textTransform:'uppercase', marginBottom:'12px' }}>📏 Usage Limits</div>
                    {LIMIT_FIELDS.map(field => {
                      const limits  = getOwnerLimits(selectedOwner);
                      const usedMap = { maxTenants: getOwnerTenants(selectedOwner.id).length, maxRooms: 0, maxPGs: selectedOwner.pgCount||0, maxReportsPerMonth: selectedOwner.reportsDownloadedThisMonth||0 };
                      return (
                        <div key={field.key} style={{ marginBottom:'12px' }}>
                          <div style={{ fontSize:'12px', color:'#64748b', marginBottom:'4px' }}>{field.icon} {field.label}</div>
                          <UsageBar used={usedMap[field.key]||0} max={limits[field.key]}/>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:'20px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:'700', color:'#64748b', textTransform:'uppercase' }}>🎛️ Features</div>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button style={{ padding:'4px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:'600', cursor:'pointer', background:'#ecfdf5', color:'#059669', border:'1px solid #bbf7d0' }} onClick={() => setAllFeatures(selectedOwner.id, true)}>All On</button>
                        <button style={{ padding:'4px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:'600', cursor:'pointer', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }} onClick={() => setAllFeatures(selectedOwner.id, false)}>All Off</button>
                      </div>
                    </div>
                    {FEATURES.map(feature => {
                      const feats     = getOwnerFeatures(selectedOwner);
                      const isOn      = feats[feature.key];
                      const isLoading = togglingFeature === feature.key + selectedOwner.id;
                      return (
                        <div key={feature.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:'10px', marginBottom:'6px', background:isOn?'#f0fdf4':'#fef9f9', border:`1px solid ${isOn?'#bbf7d0':'#fecaca'}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}><span>{feature.icon}</span><span style={{ fontSize:'13px', fontWeight:'600', color:'#1e293b' }}>{feature.label}</span></div>
                          <ToggleSwitch isOn={isOn} isLoading={isLoading} onToggle={() => toggleFeature(selectedOwner.id, feature.key, isOn)}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={s.detailActions}>
                  <div style={s.actionSection}>
                    <div style={s.actionLabel}>📋 Change Plan</div>
                    {/* ✅ Plan change also updates maxPGs */}
                    <select style={s.actionSelect} value={selectedOwner.plan||'trial'} onChange={e => updatePlan(selectedOwner.id, e.target.value)}>
                      <option value="trial">Trial (1 PG)</option>
                      <option value="starter">Starter (1 PG) — ₹299/mo</option>
                      <option value="growth">Growth (3 PGs) — ₹599/mo</option>
                      <option value="pro">Pro (Unlimited) — ₹999/mo</option>
                    </select>
                    <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'6px' }}>
                      🏠 Current maxPGs: <strong>{getOwnerLimits(selectedOwner).maxPGs}</strong>
                    </div>
                  </div>
                  <div style={s.actionSection}>
                    <div style={s.actionLabel}>⏳ Extend Trial</div>
                    <div style={s.trialExtendRow}>{[7, 14, 30].map(days => <button key={days} style={s.trialBtn} onClick={() => extendTrial(selectedOwner, days)}>+{days} days</button>)}</div>
                    {selectedOwner.trialEnd && <div style={s.trialEndDate}>Ends: {selectedOwner.trialEnd} ({getTrialDaysLeft(selectedOwner)} days left)</div>}
                  </div>
                  <div style={s.actionSection}>
                    <div style={s.actionLabel}>⚡ Account Status</div>
                    <div style={s.statusBtns}>
                      <button style={s.activateBtn} onClick={() => updateOwner(selectedOwner.id, { isActive:true })}>✅ Activate</button>
                      <button style={s.blockBtn}    onClick={() => updateOwner(selectedOwner.id, { isActive:false })}>🔴 Block</button>
                    </div>
                  </div>
                  <div style={s.actionSection}>
                    <div style={s.actionLabel}>🗑️ Danger Zone</div>
                    <button style={s.deleteBtnFull} onClick={() => deleteOwner(selectedOwner)}>🗑️ Delete This Account</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrapper:       { display:'flex', minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Segoe UI',sans-serif" },
  sidebar:       { width:'240px', background:'#1e293b', display:'flex', flexDirection:'column', position:'fixed', height:'100vh', zIndex:100 },
  sidebarTop:    { padding:'24px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  logo:          { color:'white', fontSize:'18px', fontWeight:'800', marginBottom:'8px' },
  adminBadge:    { background:'linear-gradient(135deg,#e94560,#0f3460)', color:'white', padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', display:'inline-block' },
  nav:           { padding:'16px 12px', flex:1 },
  navItem:       { display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderRadius:'10px', color:'rgba(255,255,255,0.6)', fontSize:'14px', cursor:'pointer', marginBottom:'4px' },
  navActive:     { background:'rgba(233,69,96,0.15)', color:'#e94560', fontWeight:'600' },
  logoutBtn:     { margin:'12px', padding:'12px', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'13px' },
  main:          { marginLeft:'240px', flex:1, padding:'32px' },
  topBar:        { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'28px' },
  pageTitle:     { fontSize:'24px', fontWeight:'800', color:'#1e293b', margin:0 },
  topBarRight:   { display:'flex', alignItems:'center', gap:'12px' },
  topDate:       { color:'#94a3b8', fontSize:'13px' },
  refreshBtn:    { padding:'8px 16px', background:'white', border:'1.5px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  successBanner: { background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#059669', padding:'12px 16px', borderRadius:'10px', marginBottom:'20px', fontWeight:'600' },
  errorBanner:   { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px 16px', borderRadius:'10px', marginBottom:'20px', fontWeight:'600' },
  statsGrid:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' },
  statCard:      { borderRadius:'14px', padding:'20px', textAlign:'center' },
  statIcon:      { fontSize:'28px', marginBottom:'8px' },
  statValue:     { fontSize:'24px', fontWeight:'800', marginBottom:'4px' },
  statLabel:     { color:'#64748b', fontSize:'13px' },
  rowGrid:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'24px' },
  card:          { background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:'24px' },
  cardTitle:     { fontSize:'16px', fontWeight:'700', color:'#1e293b', marginBottom:'20px', marginTop:0 },
  bigRevenue:    { fontSize:'40px', fontWeight:'800', color:'#059669' },
  revenueMonth:  { color:'#94a3b8', fontSize:'13px', marginTop:'4px' },
  planRow:       { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' },
  planRowLeft:   { display:'flex', alignItems:'center', gap:'8px' },
  planDot:       { width:'10px', height:'10px', borderRadius:'50%' },
  planRowName:   { fontSize:'13px', color:'#475569', fontWeight:'600' },
  planRowRight:  { display:'flex', alignItems:'center', gap:'8px' },
  planBar:       { width:'100px', height:'6px', background:'#e2e8f0', borderRadius:'99px', overflow:'hidden' },
  planBarFill:   { height:'100%', borderRadius:'99px' },
  planCount:     { fontSize:'13px', fontWeight:'700', color:'#1e293b', minWidth:'20px', textAlign:'right' },
  recentList:    { display:'flex', flexDirection:'column', gap:'12px' },
  recentRow:     { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f8fafc', borderRadius:'10px' },
  recentLeft:    { display:'flex', alignItems:'center', gap:'12px' },
  recentAvatar:  { width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#e94560,#0f3460)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'700', fontSize:'14px' },
  recentName:    { fontSize:'13px', fontWeight:'700', color:'#1e293b' },
  recentPg:      { fontSize:'12px', color:'#94a3b8' },
  recentRight:   { display:'flex', alignItems:'center', gap:'8px' },
  planBadge:     { padding:'3px 10px', borderRadius:'20px', color:'white', fontSize:'10px', fontWeight:'700' },
  statusDot:     { width:'8px', height:'8px', borderRadius:'50%' },
  filterRow:     { display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' },
  searchInput:   { flex:1, minWidth:'200px', padding:'10px 14px', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'14px', outline:'none', background:'white' },
  filterSelect:  { padding:'10px 14px', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'13px', outline:'none', background:'white', cursor:'pointer' },
  clearBtn:      { padding:'10px 16px', borderRadius:'10px', border:'none', background:'#fef2f2', color:'#dc2626', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  resultCount:   { fontSize:'13px', color:'#94a3b8', marginBottom:'16px' },
  ownersList:    { display:'flex', flexDirection:'column', gap:'12px' },
  ownerCard:     { background:'white', borderRadius:'14px', padding:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  ownerCardTop:  { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' },
  ownerLeft:     { display:'flex', alignItems:'flex-start', gap:'12px' },
  ownerAvatar:   { width:'48px', height:'48px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'700', fontSize:'20px', flexShrink:0 },
  ownerName:     { fontSize:'16px', fontWeight:'700', color:'#1e293b' },
  ownerPg:       { fontSize:'13px', color:'#64748b', marginTop:'2px' },
  ownerEmail:    { fontSize:'12px', color:'#94a3b8', marginTop:'2px' },
  ownerCity:     { fontSize:'12px', color:'#94a3b8', marginTop:'2px' },
  ownerRight:    { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' },
  statusBadge:   { padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' },
  trialDays:     { fontSize:'12px', color:'#d97706', fontWeight:'600' },
  ownerStats:    { display:'flex', gap:'12px', fontSize:'12px', color:'#64748b' },
  ownerActions:  { display:'flex', gap:'8px', flexWrap:'wrap', paddingTop:'16px', borderTop:'1px solid #f1f5f9' },
  viewBtn:       { padding:'8px 14px', background:'#eef2ff', color:'#4f46e5', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  activateBtn:   { padding:'8px 14px', background:'#ecfdf5', color:'#059669', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  blockBtn:      { padding:'8px 14px', background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  planSelect:    { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'12px', background:'white', cursor:'pointer' },
  deleteBtn:     { padding:'8px 14px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', marginLeft:'auto' },
  loading:       { textAlign:'center', padding:'80px', color:'#94a3b8', fontSize:'16px' },
  revenueList:   { display:'flex', flexDirection:'column', gap:'12px' },
  revenueRow:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px', background:'#f8fafc', borderRadius:'12px' },
  revenueLeft:   { display:'flex', alignItems:'center', gap:'12px' },
  revenueAvatar: { width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#e94560,#0f3460)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'700', fontSize:'16px' },
  revenueName:   { fontSize:'14px', fontWeight:'700', color:'#1e293b' },
  revenuePg:     { fontSize:'12px', color:'#94a3b8', marginTop:'2px' },
  revenueRight:  { display:'flex', alignItems:'center', gap:'12px' },
  revenueAmount: { fontSize:'16px', fontWeight:'800', color:'#059669' },
  modalOverlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' },
  modal:         { background:'white', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'780px', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' },
  modalTitle:    { fontSize:'18px', fontWeight:'700', color:'#1e293b', margin:0 },
  closeBtn:      { background:'#f1f5f9', border:'none', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', fontSize:'14px' },
  detailGrid:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' },
  detailAvatar:  { width:'64px', height:'64px', borderRadius:'50%', background:'linear-gradient(135deg,#e94560,#0f3460)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'800', fontSize:'26px', marginBottom:'12px' },
  detailName:    { fontSize:'18px', fontWeight:'800', color:'#1e293b' },
  detailPg:      { fontSize:'14px', color:'#64748b', marginBottom:'16px' },
  detailInfo:    { display:'flex', flexDirection:'column', gap:'8px' },
  detailRow:     { display:'flex', gap:'10px', fontSize:'13px', color:'#475569' },
  detailActions: { display:'flex', flexDirection:'column', gap:'16px' },
  actionSection: { background:'#f8fafc', borderRadius:'12px', padding:'16px' },
  actionLabel:   { fontSize:'12px', fontWeight:'700', color:'#64748b', marginBottom:'10px', textTransform:'uppercase' },
  actionSelect:  { width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'14px', background:'white', cursor:'pointer' },
  trialExtendRow:{ display:'flex', gap:'8px' },
  trialBtn:      { padding:'8px 14px', background:'#fffbeb', color:'#d97706', border:'1px solid #fde68a', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  trialEndDate:  { fontSize:'12px', color:'#94a3b8', marginTop:'8px' },
  statusBtns:    { display:'flex', gap:'8px' },
  deleteBtnFull: { width:'100%', padding:'10px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
};

export default AdminPanel;