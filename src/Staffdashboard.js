import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { useNavigate } from 'react-router-dom';
import {
  collection, collectionGroup, query, where, getDocs,
} from 'firebase/firestore';

// ─── Sub-page imports (reuse owner pages, just pass pgId) ───
import RoomsPage       from './pages/RoomsPage';
import TenantsPage     from './pages/TenantsPage';
import RentPage        from './pages/RentPage';
import ElectricityPage from './pages/ElectricityPage';
import ReportsPage     from './pages/ReportsPage';
import AppIcon from './components/AppIcon';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sd-root { font-family:'DM Sans',sans-serif; background:#f0f2f8; min-height:100dvh; }

  /* ── Mobile Header ── */
  .sd-mobile-header {
    display: flex; position: fixed; top: 0; left: 0; right: 0;
    height: 56px; background: linear-gradient(135deg,#1a1a2e,#0f3460);
    align-items: center; justify-content: space-between;
    padding: 0 16px; z-index: 500; box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .sd-mobile-logo { color: white; font-size: 15px; font-weight: 800; }
  .sd-mobile-right { display: flex; align-items: center; gap: 8px; }
  .sd-staff-badge {
    background: linear-gradient(135deg,#667eea,#764ba2);
    color: white; font-size: 10px; font-weight: 800;
    padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;
  }
  .sd-logout-btn {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    color: white; border-radius: 10px; padding: 6px 12px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: inherit; -webkit-tap-highlight-color: transparent;
  }

  /* ── Main ── */
  .sd-main { padding-top: 56px; padding-bottom: 70px; }

  /* ── Dashboard Home ── */
  .sd-dash-topbar {
    background: linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
    padding: 20px 20px 32px; position: relative; overflow: hidden;
  }
  .sd-dash-topbar::after {
    content:''; position:absolute; width:200px; height:200px; border-radius:50%;
    background:rgba(102,126,234,0.15); top:-60px; right:-40px; pointer-events:none;
  }
  .sd-greeting { font-size: 20px; font-weight: 800; color: white; position: relative; z-index: 1; }
  .sd-date     { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 3px; position: relative; z-index: 1; }

  .sd-pg-chip {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px; padding: 12px 16px; margin-top: 14px; position: relative; z-index: 1;
  }
  .sd-pg-icon {
    width: 24px; height: 24px;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .sd-pg-name { font-size: 15px; font-weight: 800; color: white; }
  .sd-pg-code { font-size: 11px; color: rgba(233,69,96,0.9); font-weight: 800; margin-top: 2px; letter-spacing: 1px; }
  .sd-pg-role { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }

  /* Stats */
  .sd-stats-strip {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 0; background: white; border-radius: 16px; overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    margin: -14px 16px 0; position: relative; z-index: 2;
  }
  .sd-stat-tile { padding: 12px 6px; text-align: center; border-right: 1px solid #f1f5f9; }
  .sd-stat-tile:last-child { border-right: none; }
  .sd-stat-icon  {
    width: 18px; height: 18px; margin: 0 auto 6px;
    display: flex; align-items: center; justify-content: center;
  }
  .sd-stat-val   { font-size: 15px; font-weight: 800; line-height: 1; }
  .sd-stat-label { font-size: 8px; color: #94a3b8; font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.3px; }

  /* Quick actions */
  .sd-content { padding: 20px 16px 24px; }
  .sd-section-title { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
  .sd-quick-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 24px; }
  .sd-quick-btn {
    background: white; border-radius: 16px; padding: 16px 12px;
    border: none; cursor: pointer; font-family: inherit;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    transition: transform 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .sd-quick-btn:active { transform: scale(0.97); }
  .sd-quick-icon  {
    width: 24px; height: 24px;
    display: flex; align-items: center; justify-content: center;
  }
  .sd-quick-label { font-size: 11px; font-weight: 700; text-align: center; }

  /* Recent tenants */
  .sd-tenant-card {
    background: white; border-radius: 16px; padding: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .sd-tenant-avatar {
    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg,#e94560,#0f3460);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 18px;
  }
  .sd-tenant-name { font-size: 14px; font-weight: 700; color: #1a1a2e; }
  .sd-tenant-sub  { font-size: 12px; color: #64748b; margin-top: 2px; }
  .sd-tenant-rent { font-size: 13px; font-weight: 700; color: #059669; margin-top: 2px; }
  .sd-tenant-badge { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 20px; flex-shrink: 0; margin-left: auto; }

  /* Loading / Error */
  .sd-loading { text-align: center; padding: 80px 20px; color: #94a3b8; }
  .sd-spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #667eea; border-radius: 50%; animation: sdspin 0.7s linear infinite; margin: 0 auto 14px; }
  @keyframes sdspin { to { transform: rotate(360deg); } }

  .sd-error-box {
    background: #fef2f2; border: 1.5px solid #fecaca;
    border-radius: 16px; padding: 28px 20px; text-align: center; margin: 20px 16px;
  }
  .sd-error-icon {
    width: 40px; height: 40px; margin: 0 auto 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .sd-error-text { font-size: 15px; font-weight: 700; color: #dc2626; margin-bottom: 6px; }
  .sd-error-sub  { font-size: 13px; color: #94a3b8; }

  .sd-empty { text-align: center; padding: 40px 20px; background: white; border-radius: 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
  .sd-empty-icon {
    width: 40px; height: 40px; margin: 0 auto 10px;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Bottom Nav ── */
  .sd-bottom-nav {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0;
    background: white; border-top: 1px solid #e2e8f0;
    z-index: 200; padding: 6px 0 env(safe-area-inset-bottom,6px);
    justify-content: space-around;
  }
  .sd-nav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 4px 8px;
    color: #94a3b8; min-width: 52px; font-family: inherit;
    -webkit-tap-highlight-color: transparent; transition: color 0.15s;
  }
  .sd-nav-btn.active { color: #667eea; }
  .sd-nav-icon  {
    width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
  }
  .sd-nav-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
`;

export default function StaffDashboard() {
  const navigate    = useNavigate();
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [staffInfo, setStaffInfo]   = useState(null);
  const [tenants, setTenants]       = useState([]);
  const [rooms, setRooms]           = useState([]);
  const [payments, setPayments]     = useState([]);

  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  useEffect(() => { initStaff(); }, []);

  const initStaff = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { navigate('/staff-login', { replace: true }); return; }

      // ✅ FIX: Query the staff SUBCOLLECTION across all pgOwners
      // Your actual Firestore path: pgOwners/{ownerId}/staff/{docId}
      const staffSnap = await getDocs(
        query(collectionGroup(db, 'staff'), where('staffUid', '==', currentUser.uid))
      );

      if (staffSnap.empty) {
        setError('Staff account not found. Contact your PG owner.');
        setLoading(false); return;
      }

      const staffDoc = staffSnap.docs[0].data();
      const {
        ownerId,
        pgId,
        pgName  = '',
        pgCode  = '',
        name    = 'Staff',   // ✅ name is already in the staff doc (e.g. "Kavya")
        isActive = true,
      } = staffDoc;

      if (!isActive) {
        setError('Your staff access has been revoked. Contact your PG owner.');
        setLoading(false); return;
      }

      setStaffInfo({ ownerId, pgId, pgName, pgCode, name });

      // Load dashboard stats using the pgId from staff doc
      await loadDashboardData(pgId);

    } catch (e) {
      console.error('StaffDashboard error:', e);
      setError('Failed to load: ' + e.message);
    }
    setLoading(false);
  };

  // ✅ Only needs pgId now — no ownerId needed for queries
  const loadDashboardData = async (pgId) => {
    try {
      const [tSnap, rSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'tenants'),  where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'rooms'),    where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'payments'), where('pgId', '==', pgId))),
      ]);
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'deleted'));
      setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('loadDashboardData error:', e);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    sessionStorage.clear();
    navigate('/staff-login', { replace: true });
  };

  const handleMenu = (menu) => { setActiveMenu(menu); };

  // ── Stats ──
  const thisMonth      = new Date().toLocaleString('en-US', { month: 'long' });
  const thisYear       = new Date().getFullYear().toString();
  const totalBeds      = rooms.reduce((a, r) => a + (r.totalBeds || 0), 0);
  const occupiedBeds   = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);
  const vacantBeds     = totalBeds - occupiedBeds;
  const monthlyRevenue = payments
    .filter(p => p.month === thisMonth && p.year === thisYear)
    .reduce((a, p) => a + (p.amount || 0), 0);
  const pendingCount = (() => {
    const todayDay = new Date().getDate();
    return tenants.filter(t => {
      if (!t.checkIn) return false;
      const dueDay = new Date(t.checkIn).getDate();
      if (todayDay < dueDay) return false;
      const paid = payments
        .filter(p => p.tenantId === t.id && p.month === thisMonth && p.year === thisYear)
        .reduce((a, p) => a + (p.amount || 0), 0);
      return paid < (t.monthlyRent || 0);
    }).length;
  })();

  const menuItems = [
    { icon: <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><rect x="4" y="4" width="10" height="8" rx="3" fill="currentColor" opacity="0.8" /><rect x="18" y="4" width="10" height="14" rx="3" fill="currentColor" /><rect x="4" y="16" width="10" height="12" rx="3" fill="currentColor" /><rect x="18" y="22" width="10" height="6" rx="3" fill="currentColor" opacity="0.8" /></svg>, label:'Dashboard'   },
    { icon:'🛏️', label:'Rooms'       },
    { icon:'👥', label:'Tenants'     },
    { icon:'💰', label:'Rent'        },
    { icon:'⚡', label:'Electricity' },
    { icon:'📈', label:'Reports'     },
  ];

  const quickActions = [
    { icon:'➕', label:'Add Tenant',   menu:'Tenants',     accent:'#4f46e5' },
    { icon:'🛏️', label:'Add Room',     menu:'Rooms',       accent:'#059669' },
    { icon:'💰', label:'Collect Rent', menu:'Rent',        accent:'#d97706' },
    { icon:'⚡', label:'Electricity',  menu:'Electricity', accent:'#dc2626' },
  ];

  const refinedMenuItems = [
    { icon: <AppIcon name="dashboard" size={16} />, label: 'Dashboard' },
    { icon: <AppIcon name="rooms" size={18} />, label: 'Rooms' },
    { icon: <AppIcon name="tenants" size={18} />, label: 'Tenants' },
    { icon: <AppIcon name="rent" size={18} />, label: 'Rent' },
    { icon: <AppIcon name="electricity" size={18} />, label: 'Electricity' },
    { icon: <AppIcon name="reports" size={18} />, label: 'Reports' },
  ];

  const refinedQuickActions = [
    { icon: <AppIcon name="add" size={22} />, label: 'Add Tenant', menu: 'Tenants', accent: '#4f46e5' },
    { icon: <AppIcon name="rooms" size={22} />, label: 'Add Room', menu: 'Rooms', accent: '#059669' },
    { icon: <AppIcon name="rent" size={22} />, label: 'Collect Rent', menu: 'Rent', accent: '#d97706' },
    { icon: <AppIcon name="electricity" size={22} />, label: 'Electricity', menu: 'Electricity', accent: '#dc2626' },
  ];

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="sd-loading">
          <div className="sd-spinner"/>
          Loading your PG…
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{css}</style>
        <div className="sd-error-box">
          <div className="sd-error-icon">⚠️</div>
          <div className="sd-error-text">{error}</div>
          <div className="sd-error-sub">Contact your PG owner for help.</div>
          <button onClick={handleLogout} style={{ marginTop:'16px', padding:'11px 24px', background:'#e94560', color:'white', border:'none', borderRadius:'10px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>
            Back to Login
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="sd-root">

        {/* ── Mobile Header ── */}
        <div className="sd-mobile-header">
          <div className="sd-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="10" height="8" rx="3" fill="#00E599" />
              <rect x="18" y="4" width="10" height="14" rx="3" fill="#fff" />
              <rect x="4" y="16" width="10" height="12" rx="3" fill="#fff" />
              <rect x="18" y="22" width="10" height="6" rx="3" fill="#00E599" />
            </svg>
            {staffInfo?.pgName || 'PGpilots'}
          </div>
          <div className="sd-mobile-right">
            <span className="sd-staff-badge">STAFF</span>
            <button className="sd-logout-btn" onClick={handleLogout}><AppIcon name="logout" size={16} /></button>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="sd-main">

          {/* ── Sub pages ── */}
          {activeMenu === 'Rooms'       && <RoomsPage       pgId={staffInfo?.pgId} ownerId={staffInfo?.ownerId} />}
          {activeMenu === 'Tenants'     && <TenantsPage     pgId={staffInfo?.pgId} ownerId={staffInfo?.ownerId} />}
          {activeMenu === 'Rent'        && <RentPage        pgId={staffInfo?.pgId} ownerId={staffInfo?.ownerId} />}
          {activeMenu === 'Electricity' && <ElectricityPage pgId={staffInfo?.pgId} ownerId={staffInfo?.ownerId} />}
          {activeMenu === 'Reports'     && <ReportsPage     pgId={staffInfo?.pgId} ownerId={staffInfo?.ownerId} />}

          {/* ── Dashboard Home ── */}
          {activeMenu === 'Dashboard' && (
            <>
              <div className="sd-dash-topbar">
                <div className="sd-greeting">Welcome, {staffInfo?.name || 'Staff'}</div>
                <div className="sd-date">{today}</div>
                <div className="sd-pg-chip">
                  <span className="sd-pg-icon">
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="4" width="10" height="8" rx="3" fill="#00E599" />
                      <rect x="18" y="4" width="10" height="14" rx="3" fill="#fff" />
                      <rect x="4" y="16" width="10" height="12" rx="3" fill="#fff" />
                      <rect x="18" y="22" width="10" height="6" rx="3" fill="#00E599" />
                    </svg>
                  </span>
                  <div>
                    <div className="sd-pg-name">{staffInfo?.pgName || '—'}</div>
                    {staffInfo?.pgCode && <div className="sd-pg-code" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AppIcon name="key" size={12} /> {staffInfo.pgCode}</div>}
                    <div className="sd-pg-role">Staff Access</div>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="sd-stats-strip">
                {[
                  { icon: <AppIcon name="tenants" size={18} />, label:'Tenants',   val: tenants.length,                         color:'#4f46e5' },
                  { icon: <AppIcon name="rooms" size={18} />, label:'Vacant',    val: vacantBeds,                             color:'#059669' },
                  { icon:'💰', label:'Collected', val:`₹${monthlyRevenue.toLocaleString('en-IN')}`,  color:'#d97706' },
                  { icon: <AppIcon name="pending" size={18} />, label:'Pending',   val: pendingCount,                           color:'#dc2626' },
                ].map(({ icon, label, val, color }) => (
                  <div key={label} className="sd-stat-tile">
                    <div className="sd-stat-icon">{icon}</div>
                    <div className="sd-stat-val" style={{ color }}>{val}</div>
                    <div className="sd-stat-label">{label}</div>
                  </div>
                ))}
              </div>

              <div className="sd-content">
                {/* Quick Actions */}
                <div className="sd-section-title">Quick Actions</div>
                <div className="sd-quick-grid">
                  {refinedQuickActions.map(({ icon, label, menu, accent }) => (
                    <button key={label} className="sd-quick-btn" onClick={() => handleMenu(menu)}>
                      <div className="sd-quick-icon">{icon}</div>
                      <div className="sd-quick-label" style={{ color: accent }}>{label}</div>
                    </button>
                  ))}
                </div>

                {/* Recent Tenants */}
                <div className="sd-section-title">Recent Tenants</div>
                {tenants.length === 0 ? (
                  <div className="sd-empty">
                    <div className="sd-empty-icon"><AppIcon name="tenants" size={40} /></div>
                    <div style={{ fontSize:'14px', fontWeight:'600', color:'#64748b' }}>No tenants yet</div>
                  </div>
                ) : tenants.slice(0, 5).map(t => {
                  const paid = payments
                    .filter(p => p.tenantId === t.id && p.month === thisMonth && p.year === thisYear)
                    .reduce((a, p) => a + (p.amount || 0), 0);
                  const isPaid = paid >= (t.monthlyRent || 0);
                  return (
                    <div key={t.id} className="sd-tenant-card">
                      <div className="sd-tenant-avatar">{(t.name || 'T').charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div className="sd-tenant-name">{t.name}</div>
                        <div className="sd-tenant-sub">Room {t.roomNumber || '—'} · Bed {t.bedNumber || '—'}</div>
                        <div className="sd-tenant-rent">₹{(t.monthlyRent || 0).toLocaleString('en-IN')}/mo</div>
                      </div>
                      <span className="sd-tenant-badge" style={{
                        background: isPaid ? '#ecfdf5' : '#fef2f2',
                        color:      isPaid ? '#059669' : '#dc2626',
                      }}>
                        {isPaid ? 'Paid' : 'Due'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Bottom Nav ── */}
        <div className="sd-bottom-nav">
          {refinedMenuItems.slice(0, 4).map(({ icon, label }) => (
            <button key={label}
              className={`sd-nav-btn${activeMenu === label ? ' active' : ''}`}
              onClick={() => handleMenu(label)}>
              <span className="sd-nav-icon">{icon}</span>
              <span className="sd-nav-label">{label}</span>
            </button>
          ))}
          <button
            className={`sd-nav-btn${(activeMenu === 'Electricity' || activeMenu === 'Reports') ? ' active' : ''}`}
            onClick={() => {
              if (activeMenu === 'Electricity') handleMenu('Reports');
              else handleMenu('Electricity');
            }}>
            <span className="sd-nav-icon">
              {activeMenu === 'Reports' ? <AppIcon name="reports" size={18} /> : <AppIcon name="electricity" size={18} />}
            </span>
            <span className="sd-nav-label">
              {activeMenu === 'Reports' ? 'Reports' : 'More'}
            </span>
          </button>
        </div>

      </div>
    </>
  );
}

