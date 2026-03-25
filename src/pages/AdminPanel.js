import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function AdminPanel() {
  const [owners, setOwners] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [billingSettings, setBillingSettings] = useState({ price_per_bed: 8 });
  const [newPrice, setNewPrice] = useState('');
  const [ownerPriceInputs, setOwnerPriceInputs] = useState({});
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const oSnap = await getDocs(collection(db, 'pgOwners'));
      let ownersList = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fetch PG counts and actual beds counts for each owner
      for (let owner of ownersList) {
        const pSnap = await getDocs(collection(db, 'pgOwners', owner.id, 'pgs'));
        owner.totalPGs = pSnap.size;
        owner.branchPGsCount = Math.max(0, pSnap.size - 1);
        
        // Also ensure bed count is accurate by summing rooms if needed, or just relying on current_bed_count
        let bedCount = 0;
        let usedBeds = 0;
        const rSnap = await getDocs(query(collection(db, 'rooms'), where('ownerId', '==', owner.id)));
        rSnap.forEach(r => {
          bedCount += (r.data().totalBeds || 0);
          usedBeds += (r.data().occupiedBeds || 0);
        });
        owner.actualBedCount = bedCount;
        owner.usedBedCount = usedBeds;
      }
      setOwners(ownersList);
      
      const tSnap = await getDocs(collection(db, 'tenants'));
      setAllTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const pSnap = await getDocs(collection(db, 'payments'));
      setAllPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const bSnap = await getDoc(doc(db, 'settings', 'billing'));
      if (bSnap.exists()) setBillingSettings(bSnap.data());
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const showSuccess = msg => { setSuccessMsg(msg); setErrorMsg(''); setTimeout(() => setSuccessMsg(''), 3000); };
  const showError = msg => { setErrorMsg(msg); setSuccessMsg(''); setTimeout(() => setErrorMsg(''), 3000); };

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

  const saveBillingPrice = async () => {
    if (!newPrice) return showError('Enter a valid price');
    setSaving(true);
    try {
      const effectiveDate = new Date();
      effectiveDate.setMonth(effectiveDate.getMonth() + 1);
      effectiveDate.setDate(1); // 1st of next month
      
      const updates = { 
        price_per_bed: parseFloat(newPrice),
        effective_date: effectiveDate.toISOString().split('T')[0]
      };
      
      await updateDoc(doc(db, 'settings', 'billing'), updates);
      setBillingSettings(updates);
      setNewPrice('');
      showSuccess(`✅ Price updated! New price ₹${newPrice} applies from ${updates.effective_date}`);
    } catch (err) { 
      // If doc doesn't exist, create it
      try {
        const { setDoc } = await import('firebase/firestore');
        const effectiveDate = new Date();
        effectiveDate.setMonth(effectiveDate.getMonth() + 1);
        effectiveDate.setDate(1);
        const updates = { 
          price_per_bed: parseFloat(newPrice),
          effective_date: effectiveDate.toISOString().split('T')[0]
        };
        await setDoc(doc(db, 'settings', 'billing'), updates);
        setBillingSettings(updates);
        setNewPrice('');
        showSuccess('✅ Global price set!');
      } catch (e) {
        showError('Failed to update price'); 
      }
    }
    setSaving(false);
  };

  const nonAdmin = owners.filter(o => !o.isAdmin);
  const totalOwners = nonAdmin.length;
  const activeOwners = nonAdmin.filter(o => o.isActive !== false).length;
  const blockedOwners = nonAdmin.filter(o => o.isActive === false).length;
  const totalTenants = allTenants.length;
  const thisMonth = new Date().toLocaleString('default', { month: 'long' });
  const thisYear = new Date().getFullYear().toString();
  const monthlyRevenue = allPayments.filter(p => p.month === thisMonth && p.year === thisYear).reduce((a, p) => a + (p.amount || 0), 0);

  const filteredOwners = nonAdmin.filter(o => {
    const ms = !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.pgName?.toLowerCase().includes(search.toLowerCase()) || o.email?.toLowerCase().includes(search.toLowerCase());
    const mx = !filterStatus || (filterStatus === 'active' && o.isActive !== false) || (filterStatus === 'blocked' && o.isActive === false);
    return ms && mx;
  });

  const getOwnerTenants = id => allTenants.filter(t => t.ownerId === id);
  const getOwnerRevenue = id => allPayments.filter(p => p.ownerId === id && p.month === thisMonth && p.year === thisYear).reduce((a, p) => a + (p.amount || 0), 0);
  const getOwnerBilling = owner => {
    const current = owner.current_beds ?? owner.current_bed_count ?? 0;
    const peak = owner.max_beds_this_month ?? owner.max_bed_count_this_month ?? current;
    const pricePerBed = owner.price_per_bed || billingSettings.price_per_bed || 0;
    return { current, peak, pricePerBed, est: peak * pricePerBed };
  };
  const selectedOwnerBilling = selectedOwner ? getOwnerBilling(selectedOwner) : null;

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  return (
    <div style={s.wrapper}>
      <div style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>🔐 Admin Panel</div>
          <div style={s.adminBadge}>Super Admin</div>
        </div>
        <nav style={s.nav}>
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'owners', icon: '👥', label: 'PG Owners' },
            { id: 'revenue', icon: '💰', label: 'Revenue' },
            { id: 'billing', icon: '💳', label: 'Billing Settings' },
          ].map(({ id, icon, label }) => (
            <div key={id} style={{ ...s.navItem, ...(activeTab === id ? s.navActive : {}) }} onClick={() => setActiveTab(id)}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
      </div>

      <div style={s.main}>
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>
            {activeTab === 'dashboard' && '📊 Admin Dashboard'}
            {activeTab === 'owners' && '👥 PG Owners'}
            {activeTab === 'revenue' && '💰 Revenue'}
            {activeTab === 'billing' && '💳 Billing Settings'}
          </h1>
          <div style={s.topBarRight}>
            <span style={s.topDate}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <button style={s.refreshBtn} onClick={fetchData}>🔄 Refresh</button>
          </div>
        </div>

        {successMsg && <div style={s.successBanner}>{successMsg}</div>}
        {errorMsg && <div style={s.errorBanner}>{errorMsg}</div>}

        {loading ? <div style={s.loading}>Loading...</div> : <>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={s.statsGrid}>
                {[
                  { label: 'Total Owners', value: totalOwners, icon: '👥', color: '#4f46e5', bg: '#eef2ff' },
                  { label: 'Active Owners', value: activeOwners, icon: '✅', color: '#059669', bg: '#ecfdf5' },
                  { label: 'Blocked Owners', value: blockedOwners, icon: '🔴', color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Total Tenants', value: totalTenants, icon: '🏠', color: '#d97706', bg: '#fffbeb' },
                ].map(({ label, value, icon, color, bg }) => (
                  <div key={label} style={{ ...s.statCard, background: bg }}>
                    <div style={s.statIcon}>{icon}</div>
                    <div style={{ ...s.statValue, color }}>{value}</div>
                    <div style={s.statLabel}>{label}</div>
                  </div>
                ))}
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
                        <div style={{ ...s.statusDot, background: owner.isActive === false ? '#dc2626' : '#059669' }} />
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
                <input style={s.searchInput} type="text" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
<select style={s.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="active">Active</option><option value="blocked">Blocked</option>
                </select>
                {(search || filterStatus) && <button style={s.clearBtn} onClick={() => { setSearch(''); setFilterStatus(''); }}>✕ Clear</button>}
              </div>
              <div style={s.resultCount}>{filteredOwners.length} owners found</div>
              <div style={s.ownersList}>
                {filteredOwners.map(owner => {
                  const isBlocked = owner.isActive === false;
                  const tc = getOwnerTenants(owner.id).length;
                  const totalPGs = owner.totalPGs || 0;
                  const branchCount = owner.branchPGsCount || Math.max(0, totalPGs - 1);
                  const mainCount = totalPGs > 0 ? 1 : 0;
                  const currentBeds = owner.current_beds ?? owner.current_bed_count ?? owner.actualBedCount ?? 0;
                  const peakBeds = owner.max_beds_this_month ?? owner.max_bed_count_this_month ?? currentBeds;
                  const pricePerBed = owner.price_per_bed || billingSettings.price_per_bed || 0;
                  const estBill = peakBeds * pricePerBed;
                  return (
                    <div key={owner.id} style={{ ...s.ownerCard, borderLeft: `4px solid ${isBlocked ? '#dc2626' : '#4f46e5'}`, opacity: isBlocked ? 0.85 : 1 }}>
                      <div style={s.ownerCardTop}>
                        <div style={s.ownerLeft}>
                          <div style={{ ...s.ownerAvatar, background: isBlocked ? 'linear-gradient(135deg,#dc2626,#9f1239)' : 'linear-gradient(135deg,#e94560,#0f3460)' }}>{owner.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={s.ownerName}>{owner.name}</div>
                            <div style={s.ownerPg}>{owner.pgName}</div>
                            <div style={s.ownerEmail}>{owner.email}</div>
                            {owner.city && <div style={s.ownerCity}>📍 {owner.city}, {owner.state}</div>}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                              <span>👥 {tc} tenants</span>
                              <span>🏠 Main: {mainCount} • Branches: {branchCount}</span>
                              <span>🛏️ {currentBeds} current • peak {peakBeds}</span>
                              <span>💳 ₹{estBill.toLocaleString()}/mo • ₹{pricePerBed}/bed</span>
                            </div>
                          </div>
                        </div>
                        <div style={s.ownerRight}>
                          <div style={{ ...s.statusBadge, background: isBlocked ? '#fef2f2' : '#ecfdf5', color: isBlocked ? '#dc2626' : '#059669' }}>{isBlocked ? '🔴 Blocked' : '✅ Active'}</div>
                          <div style={s.ownerStats}><span>💰 ₹{getOwnerRevenue(owner.id).toLocaleString()}</span></div>
                        </div>
                      </div>
                      <div style={s.ownerActions}>
                        <button style={s.viewBtn} onClick={() => setSelectedOwner(owner)}>👁️ View Details</button>
                        {isBlocked
                          ? <button style={s.activateBtn} onClick={() => updateOwner(owner.id, { isActive: true })}>✅ Unblock</button>
                          : <button style={s.blockBtn} onClick={() => updateOwner(owner.id, { isActive: false })}>🔴 Block</button>}
                        <button style={s.deleteBtn} onClick={() => deleteOwner(owner)}>🗑️ Delete</button>
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
                  { label: 'This Month', value: `₹${monthlyRevenue.toLocaleString()}`, icon: '💰', color: '#059669', bg: '#ecfdf5' },
                  { label: 'Total Payments', value: allPayments.length, icon: '📋', color: '#4f46e5', bg: '#eef2ff' },
                  { label: 'Avg per Owner', value: `₹${totalOwners > 0 ? Math.round(monthlyRevenue / totalOwners).toLocaleString() : 0}`, icon: '📊', color: '#d97706', bg: '#fffbeb' },
                  { label: 'Total Tenants', value: totalTenants, icon: '👥', color: '#dc2626', bg: '#fef2f2' },
                ].map(({ label, value, icon, color, bg }) => (
                  <div key={label} style={{ ...s.statCard, background: bg }}>
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
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </>}

          {/* ── BILLING SETTINGS ── */}
          {activeTab === 'billing' && (
            <div style={{ maxWidth: '600px' }}>
              <div style={s.card}>
                <h2 style={s.cardTitle}>💰 Pay-As-You-Go Configuration</h2>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>Current Price per Bed</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>₹{billingSettings.price_per_bed} / mo</div>
                  {billingSettings.effective_date && (
                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600', marginTop: '6px' }}>
                      📅 Effective from: {billingSettings.effective_date}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                    <strong>Note:</strong> Billing applies to the total peak beds across all PGs (Main + Branches) owned by the owner, not per separate PG.
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Update Price per Bed (₹)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="number" 
                      style={s.searchInput} 
                      placeholder="e.g. 8" 
                      value={newPrice} 
                      onChange={e => setNewPrice(e.target.value)}
                    />
                    <button 
                      style={{ ...s.viewBtn, background: '#4f46e5', color: 'white', padding: '10px 24px' }}
                      onClick={saveBillingPrice}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Set Price'}
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>
                    * Note: Price changes will automatically apply from the 1st of next month.
                  </p>
                </div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>ℹ️</span>
                <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>Billing Logic</div>
                  Owners are billed based on their <strong>peak bed count</strong> during the month. 
                  Adding beds increases the monthly bill instantly. Reducing beds will reflect in next month's bill.
                  Invoices are generated on the 1st of every month automatically.
                </div>
              </div>
            </div>
          )}

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
                    {[['📧', selectedOwner.email], ['📱', selectedOwner.phone || 'Not set'], ['📍', `${selectedOwner.city || 'Not set'}, ${selectedOwner.state || ''}`], ['👥', `${getOwnerTenants(selectedOwner.id).length} tenants`], ['💰', `₹${getOwnerRevenue(selectedOwner.id).toLocaleString()} this month`]].map(([icon, val]) => (
                      <div key={icon} style={s.detailRow}><span>{icon}</span><span>{val}</span></div>
                    ))}
                  </div>
                                    <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Billing Snapshot</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Current Beds</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{selectedOwnerBilling?.current ?? 0}</div>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Peak This Month</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{selectedOwnerBilling?.peak ?? 0}</div>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Price / Bed</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>₹{selectedOwnerBilling?.pricePerBed ?? 0}</div>
                      </div>
                      <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#9a3412', textTransform: 'uppercase', fontWeight: '700' }}>Est. Bill</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#9a3412' }}>₹{(selectedOwnerBilling?.est ?? 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={s.detailActions}>
                                    <div style={s.actionSection}>
                    <div style={s.actionLabel}>Billing Override</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Leave blank to use the global price.</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        style={{ ...s.actionSelect, padding: '8px 10px' }}
                        type="number"
                        placeholder={`Global: ₹${billingSettings.price_per_bed || 0}`}
                        value={ownerPriceInputs[selectedOwner.id] ?? selectedOwner.price_per_bed ?? ''}
                        onChange={e => setOwnerPriceInputs(prev => ({ ...prev, [selectedOwner.id]: e.target.value }))}
                      />
                      <button style={s.viewBtn} onClick={() => updateOwner(selectedOwner.id, { price_per_bed: ownerPriceInputs[selectedOwner.id] ? parseFloat(ownerPriceInputs[selectedOwner.id]) : null })}>
                        Save
                      </button>
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
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI',sans-serif" },
  sidebar: { width: '240px', background: '#1e293b', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 },
  sidebarTop: { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logo: { color: 'white', fontSize: '18px', fontWeight: '800', marginBottom: '8px' },
  adminBadge: { background: 'linear-gradient(135deg,#e94560,#0f3460)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  nav: { padding: '16px 12px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', marginBottom: '4px' },
  navActive: { background: 'rgba(233,69,96,0.15)', color: '#e94560', fontWeight: '600' },
  logoutBtn: { margin: '12px', padding: '12px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' },
  main: { marginLeft: '240px', flex: 1, padding: '32px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  pageTitle: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  topDate: { color: '#94a3b8', fontSize: '13px' },
  refreshBtn: { padding: '8px 16px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  successBanner: { background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#059669', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' },
  errorBanner: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { borderRadius: '14px', padding: '20px', textAlign: 'center' },
  statIcon: { fontSize: '28px', marginBottom: '8px' },
  statValue: { fontSize: '24px', fontWeight: '800', marginBottom: '4px' },
  statLabel: { color: '#64748b', fontSize: '13px' },
  rowGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
  card: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '24px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', marginTop: 0 },
  bigRevenue: { fontSize: '40px', fontWeight: '800', color: '#059669' },
  revenueMonth: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  recentList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '10px' },
  recentLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  recentAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#e94560,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px' },
  recentName: { fontSize: '13px', fontWeight: '700', color: '#1e293b' },
  recentPg: { fontSize: '12px', color: '#94a3b8' },
  recentRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white' },
  filterSelect: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: 'white', cursor: 'pointer' },
  clearBtn: { padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  resultCount: { fontSize: '13px', color: '#94a3b8', marginBottom: '16px' },
  ownersList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  ownerCard: { background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  ownerCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  ownerLeft: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  ownerAvatar: { width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px', flexShrink: 0 },
  ownerName: { fontSize: '16px', fontWeight: '700', color: '#1e293b' },
  ownerPg: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
  ownerEmail: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  ownerCity: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  ownerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  ownerStats: { display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' },
  ownerActions: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
  viewBtn: { padding: '8px 14px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  activateBtn: { padding: '8px 14px', background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  blockBtn: { padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginLeft: 'auto' },
  loading: { textAlign: 'center', padding: '80px', color: '#94a3b8', fontSize: '16px' },
  revenueList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  revenueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '12px' },
  revenueLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  revenueAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#e94560,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px' },
  revenueName: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
  revenuePg: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  revenueRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  revenueAmount: { fontSize: '16px', fontWeight: '800', color: '#059669' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  detailAvatar: { width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,#e94560,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '26px', marginBottom: '12px' },
  detailName: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  detailPg: { fontSize: '14px', color: '#64748b', marginBottom: '16px' },
  detailInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  detailRow: { display: 'flex', gap: '10px', fontSize: '13px', color: '#475569' },
  detailActions: { display: 'flex', flexDirection: 'column', gap: '16px' },
  actionSection: { background: '#f8fafc', borderRadius: '12px', padding: '16px' },
  actionLabel: { fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' },
  actionSelect: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: 'white', cursor: 'pointer' },
  statusBtns: { display: 'flex', gap: '8px' },
  deleteBtnFull: { width: '100%', padding: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
};

export default AdminPanel;















