import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, getDocs, doc,
  updateDoc, deleteDoc, query, where
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

function AdminPanel() {
  const [owners, setOwners] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 3000);
  };

  // Update owner field
  const updateOwner = async (ownerId, fields) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pgOwners', ownerId), fields);
      showSuccess('✅ Updated successfully!');
      // Update local state immediately
      setOwners(prev => prev.map(o =>
        o.id === ownerId ? { ...o, ...fields } : o
      ));
      // Update selected owner if open
      if (selectedOwner?.id === ownerId) {
        setSelectedOwner(prev => ({ ...prev, ...fields }));
      }
    } catch (err) {
      showError('Failed to update!');
    }
    setSaving(false);
  };

  // Delete owner
  const deleteOwner = async (owner) => {
    const confirm1 = window.confirm(
      `⚠️ DELETE ACCOUNT\n\nAre you sure you want to delete:\n${owner.name} - ${owner.pgName}\n\nThis will delete ALL their data!\nThis cannot be undone!`
    );
    if (!confirm1) return;
    const confirm2 = window.confirm(
      `⚠️ FINAL WARNING\n\nThis will permanently delete:\n✗ Owner profile\n✗ All their rooms\n✗ All their tenants\n✗ All their payments\n✗ All electricity bills\n\nPress OK to confirm.`
    );
    if (!confirm2) return;

    setSaving(true);
    try {
      // Delete all rooms
      const rq = query(collection(db, 'rooms'), where('ownerId', '==', owner.id));
      const rSnap = await getDocs(rq);
      for (const d of rSnap.docs) await deleteDoc(doc(db, 'rooms', d.id));

      // Delete all tenants
      const tq = query(collection(db, 'tenants'), where('ownerId', '==', owner.id));
      const tSnap = await getDocs(tq);
      for (const d of tSnap.docs) await deleteDoc(doc(db, 'tenants', d.id));

      // Delete all payments
      const pq = query(collection(db, 'payments'), where('ownerId', '==', owner.id));
      const pSnap = await getDocs(pq);
      for (const d of pSnap.docs) await deleteDoc(doc(db, 'payments', d.id));

      // Delete all electricity bills
      const eq = query(collection(db, 'electricityBills'), where('ownerId', '==', owner.id));
      const eSnap = await getDocs(eq);
      for (const d of eSnap.docs) await deleteDoc(doc(db, 'electricityBills', d.id));

      // Delete owner profile
      await deleteDoc(doc(db, 'pgOwners', owner.id));

      showSuccess('🗑️ Owner and ALL data deleted!');
      setSelectedOwner(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Failed to delete! Check console.');
    }
    setSaving(false);
  };

  // Extend trial
  const extendTrial = async (owner, days) => {
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(days));
    await updateOwner(owner.id, {
      plan: 'trial',
      isActive: true,
      trialEnd: newTrialEnd.toISOString().split('T')[0],
    });
  };

  // Get trial days left
  const getTrialDaysLeft = (owner) => {
    if (!owner.trialEnd) return 0;
    const end = new Date(owner.trialEnd);
    const today = new Date();
    return Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
  };

  // Stats
  const totalOwners = owners.filter(o => !o.isAdmin).length;
  const activeOwners = owners.filter(o => !o.isAdmin && o.isActive !== false).length;
  const blockedOwners = owners.filter(o => !o.isAdmin && o.isActive === false).length;
  const totalTenants = allTenants.length;
  const thisMonth = new Date().toLocaleString('default', { month: 'long' });
  const thisYear = new Date().getFullYear().toString();
  const monthlyRevenue = allPayments
    .filter(p => p.month === thisMonth && p.year === thisYear)
    .reduce((a, p) => a + (p.amount || 0), 0);

  const planCounts = {
    trial: owners.filter(o => !o.isAdmin && o.plan === 'trial').length,
    basic: owners.filter(o => !o.isAdmin && o.plan === 'basic').length,
    standard: owners.filter(o => !o.isAdmin && o.plan === 'standard').length,
    premium: owners.filter(o => !o.isAdmin && o.plan === 'premium').length,
  };

  // Filter owners
  const filteredOwners = owners.filter(o => {
    if (o.isAdmin) return false;
    const matchSearch = !search ||
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.pgName?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = !filterPlan || o.plan === filterPlan;
    const matchStatus = !filterStatus ||
      (filterStatus === 'active' && o.isActive !== false) ||
      (filterStatus === 'blocked' && o.isActive === false);
    return matchSearch && matchPlan && matchStatus;
  });

  const getOwnerTenants = (ownerId) => allTenants.filter(t => t.ownerId === ownerId);
  const getOwnerRevenue = (ownerId) => allPayments
    .filter(p => p.ownerId === ownerId && p.month === thisMonth && p.year === thisYear)
    .reduce((a, p) => a + (p.amount || 0), 0);

  const planColors = {
    trial: '#d97706', basic: '#4f46e5',
    standard: '#059669', premium: '#dc2626',
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div style={styles.wrapper}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.logo}>🔐 Admin Panel</div>
          <div style={styles.adminBadge}>Super Admin</div>
        </div>
        <nav style={styles.nav}>
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'owners', icon: '👥', label: 'PG Owners' },
            { id: 'revenue', icon: '💰', label: 'Revenue' },
          ].map(({ id, icon, label }) => (
            <div key={id}
              style={{ ...styles.navItem, ...(activeTab === id ? styles.navActive : {}) }}
              onClick={() => setActiveTab(id)}>
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <h1 style={styles.pageTitle}>
            {activeTab === 'dashboard' && '📊 Admin Dashboard'}
            {activeTab === 'owners' && '👥 PG Owners'}
            {activeTab === 'revenue' && '💰 Revenue'}
          </h1>
          <div style={styles.topBarRight}>
            <div style={styles.topDate}>
              {new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
            <button style={styles.refreshBtn} onClick={fetchData}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {successMsg && <div style={styles.successBanner}>{successMsg}</div>}
        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        {loading ? (
          <div style={styles.loading}>Loading admin data...</div>
        ) : (
          <>
            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Stats */}
                <div style={styles.statsGrid}>
                  {[
                    { label: 'Total Owners', value: totalOwners, icon: '👥', color: '#4f46e5', bg: '#eef2ff' },
                    { label: 'Active Owners', value: activeOwners, icon: '✅', color: '#059669', bg: '#ecfdf5' },
                    { label: 'Blocked Owners', value: blockedOwners, icon: '🔴', color: '#dc2626', bg: '#fef2f2' },
                    { label: 'Total Tenants', value: totalTenants, icon: '🏠', color: '#d97706', bg: '#fffbeb' },
                  ].map(({ label, value, icon, color, bg }) => (
                    <div key={label} style={{ ...styles.statCard, background: bg }}>
                      <div style={styles.statIcon}>{icon}</div>
                      <div style={{ ...styles.statValue, color }}>{value}</div>
                      <div style={styles.statLabel}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Revenue + Plan breakdown */}
                <div style={styles.rowGrid}>
                  <div style={styles.card}>
                    <h2 style={styles.cardTitle}>💰 This Month Revenue</h2>
                    <div style={styles.bigRevenue}>
                      ₹{monthlyRevenue.toLocaleString()}
                    </div>
                    <div style={styles.revenueMonth}>{thisMonth} {thisYear}</div>
                  </div>

                  <div style={styles.card}>
                    <h2 style={styles.cardTitle}>📊 Plan Breakdown</h2>
                    {Object.entries(planCounts).map(([plan, count]) => (
                      <div key={plan} style={styles.planRow}>
                        <div style={styles.planRowLeft}>
                          <div style={{
                            ...styles.planDot,
                            background: planColors[plan] || '#94a3b8'
                          }} />
                          <span style={styles.planRowName}>
                            {plan.charAt(0).toUpperCase() + plan.slice(1)}
                          </span>
                        </div>
                        <div style={styles.planRowRight}>
                          <div style={styles.planBar}>
                            <div style={{
                              ...styles.planBarFill,
                              width: totalOwners > 0 ? `${(count / totalOwners) * 100}%` : '0%',
                              background: planColors[plan] || '#94a3b8',
                            }} />
                          </div>
                          <span style={styles.planCount}>{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent owners */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>🆕 Recent Signups</h2>
                  <div style={styles.recentList}>
                    {owners
                      .filter(o => !o.isAdmin)
                      .slice(-5)
                      .reverse()
                      .map(owner => (
                        <div key={owner.id} style={styles.recentRow}>
                          <div style={styles.recentLeft}>
                            <div style={styles.recentAvatar}>
                              {owner.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={styles.recentName}>{owner.name}</div>
                              <div style={styles.recentPg}>{owner.pgName}</div>
                            </div>
                          </div>
                          <div style={styles.recentRight}>
                            <div style={{
                              ...styles.planBadge,
                              background: planColors[owner.plan] || '#94a3b8'
                            }}>
                              {owner.plan || 'trial'}
                            </div>
                            <div style={{
                              ...styles.statusDot,
                              background: owner.isActive === false ? '#dc2626' : '#059669'
                            }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── OWNERS TAB ── */}
            {activeTab === 'owners' && (
              <div>
                {/* Filters */}
                <div style={styles.filterRow}>
                  <input style={styles.searchInput} type="text"
                    placeholder="🔍 Search by name, PG or email..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <select style={styles.filterSelect} value={filterPlan}
                    onChange={e => setFilterPlan(e.target.value)}>
                    <option value="">All Plans</option>
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                  <select style={styles.filterSelect} value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  {(search || filterPlan || filterStatus) && (
                    <button style={styles.clearBtn} onClick={() => {
                      setSearch(''); setFilterPlan(''); setFilterStatus('');
                    }}>✕ Clear</button>
                  )}
                </div>

                <div style={styles.resultCount}>
                  {filteredOwners.length} owners found
                </div>

                {/* Owners list */}
                <div style={styles.ownersList}>
                  {filteredOwners.map(owner => {
                    const ownerTenants = getOwnerTenants(owner.id);
                    const ownerRevenue = getOwnerRevenue(owner.id);
                    const trialDays = getTrialDaysLeft(owner);
                    const isBlocked = owner.isActive === false;

                    return (
                      <div key={owner.id} style={{
                        ...styles.ownerCard,
                        borderLeft: `4px solid ${isBlocked ? '#dc2626' :
                          planColors[owner.plan] || '#94a3b8'}`,
                        opacity: isBlocked ? 0.85 : 1,
                      }}>
                        <div style={styles.ownerCardTop}>
                          <div style={styles.ownerLeft}>
                            <div style={{
                              ...styles.ownerAvatar,
                              background: isBlocked
                                ? 'linear-gradient(135deg, #dc2626, #9f1239)'
                                : 'linear-gradient(135deg, #e94560, #0f3460)'
                            }}>
                              {owner.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={styles.ownerName}>{owner.name}</div>
                              <div style={styles.ownerPg}>{owner.pgName}</div>
                              <div style={styles.ownerEmail}>{owner.email}</div>
                              {owner.city && (
                                <div style={styles.ownerCity}>
                                  📍 {owner.city}, {owner.state}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={styles.ownerRight}>
                            {/* Plan badge */}
                            <div style={{
                              ...styles.planBadge,
                              background: planColors[owner.plan] || '#94a3b8'
                            }}>
                              {(owner.plan || 'trial').toUpperCase()}
                            </div>

                            {/* Status */}
                            <div style={{
                              ...styles.statusBadge,
                              background: isBlocked ? '#fef2f2' : '#ecfdf5',
                              color: isBlocked ? '#dc2626' : '#059669',
                            }}>
                              {isBlocked ? '🔴 Blocked' : '✅ Active'}
                            </div>

                            {/* Trial days */}
                            {owner.plan === 'trial' && (
                              <div style={styles.trialDays}>
                                ⏳ {trialDays} days left
                              </div>
                            )}

                            {/* Stats */}
                            <div style={styles.ownerStats}>
                              <span>👥 {ownerTenants.length} tenants</span>
                              <span>💰 ₹{ownerRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={styles.ownerActions}>
                          <button style={styles.viewBtn}
                            onClick={() => {
                              setSelectedOwner(owner);
                            }}>
                            👁️ View Details
                          </button>

                          {isBlocked ? (
                            <button style={styles.activateBtn}
                              onClick={() => updateOwner(owner.id, { isActive: true })}>
                              ✅ Unblock
                            </button>
                          ) : (
                            <button style={styles.blockBtn}
                              onClick={() => updateOwner(owner.id, { isActive: false })}>
                              🔴 Block
                            </button>
                          )}

                          <select style={styles.planSelect}
                            value={owner.plan || 'trial'}
                            onChange={e => updateOwner(owner.id, { plan: e.target.value })}>
                            <option value="trial">Trial</option>
                            <option value="basic">Basic</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>

                          <button style={styles.deleteBtn}
                            onClick={() => deleteOwner(owner)}>
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── REVENUE TAB ── */}
            {activeTab === 'revenue' && (
              <div>
                <div style={styles.statsGrid}>
                  {[
                    { label: 'This Month', value: `₹${monthlyRevenue.toLocaleString()}`, icon: '💰', color: '#059669', bg: '#ecfdf5' },
                    { label: 'Total Payments', value: allPayments.length, icon: '📋', color: '#4f46e5', bg: '#eef2ff' },
                    { label: 'Avg per Owner', value: `₹${totalOwners > 0 ? Math.round(monthlyRevenue / totalOwners).toLocaleString() : 0}`, icon: '📊', color: '#d97706', bg: '#fffbeb' },
                    { label: 'Total Tenants', value: totalTenants, icon: '👥', color: '#dc2626', bg: '#fef2f2' },
                  ].map(({ label, value, icon, color, bg }) => (
                    <div key={label} style={{ ...styles.statCard, background: bg }}>
                      <div style={styles.statIcon}>{icon}</div>
                      <div style={{ ...styles.statValue, color }}>{value}</div>
                      <div style={styles.statLabel}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>💰 Revenue by Owner — {thisMonth} {thisYear}</h2>
                  <div style={styles.revenueList}>
                    {owners
                      .filter(o => !o.isAdmin)
                      .map(owner => ({
                        ...owner,
                        revenue: getOwnerRevenue(owner.id),
                        tenants: getOwnerTenants(owner.id).length,
                      }))
                      .sort((a, b) => b.revenue - a.revenue)
                      .map(owner => (
                        <div key={owner.id} style={styles.revenueRow}>
                          <div style={styles.revenueLeft}>
                            <div style={styles.revenueAvatar}>
                              {owner.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={styles.revenueName}>{owner.name}</div>
                              <div style={styles.revenuePg}>
                                {owner.pgName} • {owner.tenants} tenants
                              </div>
                            </div>
                          </div>
                          <div style={styles.revenueRight}>
                            <div style={styles.revenueAmount}>
                              ₹{owner.revenue.toLocaleString()}
                            </div>
                            <div style={{
                              ...styles.planBadge,
                              background: planColors[owner.plan] || '#94a3b8'
                            }}>
                              {owner.plan || 'trial'}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Owner Detail Modal */}
        {selectedOwner && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>👤 Owner Details</h3>
                <button style={styles.closeBtn}
                  onClick={() => setSelectedOwner(null)}>✕</button>
              </div>

              <div style={styles.detailGrid}>
                {/* Left */}
                <div>
                  <div style={styles.detailAvatar}>
                    {selectedOwner.name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.detailName}>{selectedOwner.name}</div>
                  <div style={styles.detailPg}>{selectedOwner.pgName}</div>

                  <div style={styles.detailInfo}>
                    <div style={styles.detailRow}>
                      <span>📧</span><span>{selectedOwner.email}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span>📱</span><span>{selectedOwner.phone || 'Not set'}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span>📍</span>
                      <span>{selectedOwner.city || 'Not set'}, {selectedOwner.state || ''}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span>👥</span>
                      <span>{getOwnerTenants(selectedOwner.id).length} tenants</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span>💰</span>
                      <span>₹{getOwnerRevenue(selectedOwner.id).toLocaleString()} this month</span>
                    </div>
                  </div>
                </div>

                {/* Right - Actions */}
                <div style={styles.detailActions}>
                  <div style={styles.actionSection}>
                    <div style={styles.actionLabel}>📋 Change Plan</div>
                    <select style={styles.actionSelect}
                      value={selectedOwner.plan || 'trial'}
                      onChange={e => updateOwner(selectedOwner.id, { plan: e.target.value })}>
                      <option value="trial">Trial</option>
                      <option value="basic">Basic — ₹499/mo</option>
                      <option value="standard">Standard — ₹999/mo</option>
                      <option value="premium">Premium — ₹1999/mo</option>
                    </select>
                  </div>

                  <div style={styles.actionSection}>
                    <div style={styles.actionLabel}>⏳ Extend Trial</div>
                    <div style={styles.trialExtendRow}>
                      {[7, 14, 30].map(days => (
                        <button key={days} style={styles.trialBtn}
                          onClick={() => extendTrial(selectedOwner, days)}>
                          +{days} days
                        </button>
                      ))}
                    </div>
                    {selectedOwner.trialEnd && (
                      <div style={styles.trialEndDate}>
                        Trial ends: {selectedOwner.trialEnd}
                        ({getTrialDaysLeft(selectedOwner)} days left)
                      </div>
                    )}
                  </div>

                  <div style={styles.actionSection}>
                    <div style={styles.actionLabel}>⚡ Account Status</div>
                    <div style={styles.statusBtns}>
                      <button style={styles.activateBtn}
                        onClick={() => updateOwner(selectedOwner.id, { isActive: true })}>
                        ✅ Activate
                      </button>
                      <button style={styles.blockBtn}
                        onClick={() => updateOwner(selectedOwner.id, { isActive: false })}>
                        🔴 Block
                      </button>
                    </div>
                  </div>

                  <div style={styles.actionSection}>
                    <div style={styles.actionLabel}>🗑️ Danger Zone</div>
                    <button style={styles.deleteBtnFull}
                      onClick={() => deleteOwner(selectedOwner)}>
                      🗑️ Delete This Account
                    </button>
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

const styles = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" },
  sidebar: { width: '240px', background: '#1e293b', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 },
  sidebarTop: { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logo: { color: 'white', fontSize: '18px', fontWeight: '800', marginBottom: '8px' },
  adminBadge: { background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
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
  planRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  planRowLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  planDot: { width: '10px', height: '10px', borderRadius: '50%' },
  planRowName: { fontSize: '13px', color: '#475569', fontWeight: '600' },
  planRowRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  planBar: { width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' },
  planBarFill: { height: '100%', borderRadius: '99px' },
  planCount: { fontSize: '13px', fontWeight: '700', color: '#1e293b', minWidth: '20px', textAlign: 'right' },
  recentList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '10px' },
  recentLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  recentAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px' },
  recentName: { fontSize: '13px', fontWeight: '700', color: '#1e293b' },
  recentPg: { fontSize: '12px', color: '#94a3b8' },
  recentRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  planBadge: { padding: '3px 10px', borderRadius: '20px', color: 'white', fontSize: '10px', fontWeight: '700' },
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
  trialDays: { fontSize: '12px', color: '#d97706', fontWeight: '600' },
  ownerStats: { display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' },
  ownerActions: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
  viewBtn: { padding: '8px 14px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  activateBtn: { padding: '8px 14px', background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  blockBtn: { padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  planSelect: { padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12px', background: 'white', cursor: 'pointer' },
  deleteBtn: { padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginLeft: 'auto' },
  loading: { textAlign: 'center', padding: '80px', color: '#94a3b8', fontSize: '16px' },
  revenueList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  revenueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '12px' },
  revenueLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  revenueAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px' },
  revenueName: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
  revenuePg: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  revenueRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  revenueAmount: { fontSize: '16px', fontWeight: '800', color: '#059669' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  detailAvatar: { width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '26px', marginBottom: '12px' },
  detailName: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  detailPg: { fontSize: '14px', color: '#64748b', marginBottom: '16px' },
  detailInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  detailRow: { display: 'flex', gap: '10px', fontSize: '13px', color: '#475569' },
  detailActions: { display: 'flex', flexDirection: 'column', gap: '16px' },
  actionSection: { background: '#f8fafc', borderRadius: '12px', padding: '16px' },
  actionLabel: { fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' },
  actionSelect: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: 'white', cursor: 'pointer' },
  trialExtendRow: { display: 'flex', gap: '8px' },
  trialBtn: { padding: '8px 14px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  trialEndDate: { fontSize: '12px', color: '#94a3b8', marginTop: '8px' },
  statusBtns: { display: 'flex', gap: '8px' },
  deleteBtnFull: { width: '100%', padding: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
};

export default AdminPanel;