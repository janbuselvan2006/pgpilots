import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Rooms from './RoomsPage';
import Tenants from './TenantsPage';
import RentPage from './RentPage';
import ElectricityPage from './ElectricityPage';
import ReportsPage from './ReportsPage';
import SettingsPage from './SettingsPage';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .db-root {
    display: flex;
    min-height: 100dvh;
    font-family: 'DM Sans', sans-serif;
    background: #f0f2f8;
  }

  /* ─────────────────────────────────────────
     SIDEBAR (desktop only)
  ───────────────────────────────────────── */
  .db-sidebar {
    width: 260px;
    background: linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    z-index: 400;
    transition: transform 0.3s cubic-bezier(0.32,0.72,0,1);
    flex-shrink: 0;
  }
  .db-sidebar-top {
    padding: 28px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .db-sidebar-logo {
    color: white; font-size: 20px; font-weight: 800; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }
  .db-owner-box {
    display: flex; align-items: center; gap: 12px;
  }
  .db-owner-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg,#e94560,#c1253f);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 16px; flex-shrink: 0;
  }
  .db-owner-name { color: white; font-size: 14px; font-weight: 700; }
  .db-owner-pg   { color: rgba(255,255,255,0.45); font-size: 11px; margin-top: 2px; }

  .db-nav { padding: 14px 10px; flex: 1; }
  .db-nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; border-radius: 12px;
    color: rgba(255,255,255,0.55); font-size: 14px;
    cursor: pointer; margin-bottom: 3px;
    transition: all 0.15s; font-weight: 500;
    -webkit-tap-highlight-color: transparent;
  }
  .db-nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
  .db-nav-item.active { background: rgba(233,69,96,0.18); color: #e94560; font-weight: 700; }
  .db-nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }

  .db-logout-btn {
    margin: 12px; padding: 12px; background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.55); border: none; border-radius: 12px;
    cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit;
    transition: background 0.2s;
  }
  .db-logout-btn:hover { background: rgba(255,255,255,0.1); }

  /* ─────────────────────────────────────────
     MOBILE HEADER
  ───────────────────────────────────────── */
  .db-mobile-header {
    display: none;
    position: fixed; top: 0; left: 0; right: 0;
    height: 56px;
    background: linear-gradient(135deg,#1a1a2e,#0f3460);
    align-items: center; justify-content: space-between;
    padding: 0 16px; z-index: 500;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .db-hamburger {
    background: rgba(255,255,255,0.1); border: none; color: white;
    font-size: 18px; cursor: pointer; width: 36px; height: 36px;
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .db-mobile-logo { color: white; font-size: 15px; font-weight: 800; }
  .db-plan-badge {
    background: #fef9c3; color: #854d0e;
    padding: 4px 10px; border-radius: 20px;
    font-size: 10px; font-weight: 800;
  }

  /* ─────────────────────────────────────────
     OVERLAY
  ───────────────────────────────────────── */
  .db-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(15,20,40,0.6);
    z-index: 350; backdrop-filter: blur(2px);
    animation: dbFade 0.2s ease;
  }
  @keyframes dbFade { from{opacity:0}to{opacity:1} }

  /* ─────────────────────────────────────────
     MAIN CONTENT
  ───────────────────────────────────────── */
  .db-main {
    flex: 1;
    margin-left: 260px;
    min-width: 0;
    overflow-x: hidden;
  }

  /* ── Desktop top bar ── */
  .db-desktop-topbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 32px 0;
    margin-bottom: 24px;
  }
  .db-desktop-title { font-size: 26px; font-weight: 800; color: #1e293b; }
  .db-desktop-sub   { font-size: 13px; color: #94a3b8; margin-top: 4px; }
  .db-desktop-badge {
    background: #fef9c3; color: #854d0e;
    padding: 6px 14px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
  }

  /* ── Page content padding ── */
  .db-page-content {
    padding: 0 32px 40px;
  }

  /* ─────────────────────────────────────────
     DASHBOARD HOME
  ───────────────────────────────────────── */
  .db-dash-topbar {
    background: linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
    padding: 20px 20px 32px;
    position: relative; overflow: hidden;
    display: none;
  }
  .db-dash-topbar::after {
    content:''; position:absolute; width:200px; height:200px; border-radius:50%;
    background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none;
  }
  .db-dash-greeting { font-size:20px; font-weight:800; color:white; position:relative; z-index:1; }
  .db-dash-sub      { font-size:12px; color:rgba(255,255,255,0.5); margin-top:3px; position:relative; z-index:1; }

  /* Stats grid */
  .db-stats-strip {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 0; background: white; border-radius: 16px; overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    margin-bottom: 24px;
  }
  .db-stat-tile {
    padding: 18px 12px; text-align: center;
    border-right: 1px solid #f1f5f9;
    transition: background 0.2s;
  }
  .db-stat-tile:last-child { border-right: none; }
  .db-stat-icon  { font-size: 20px; margin-bottom: 6px; }
  .db-stat-value { font-size: 18px; font-weight: 800; line-height: 1; }
  .db-stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

  /* Quick actions */
  .db-section-title {
    font-size: 14px; font-weight: 800; color: #1e293b;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 14px;
  }
  .db-quick-grid {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 12px; margin-bottom: 24px;
  }
  .db-quick-btn {
    background: white; border-radius: 16px; padding: 18px 12px;
    border: none; cursor: pointer; font-family: inherit;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    transition: transform 0.15s, box-shadow 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .db-quick-btn:active { transform: scale(0.97); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .db-quick-icon  { font-size: 26px; }
  .db-quick-label { font-size: 11px; font-weight: 700; color: #475569; text-align: center; }

  /* Recent activity */
  .db-activity-card {
    background: white; border-radius: 18px; overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 14px;
  }
  .db-activity-empty {
    padding: 40px 20px; text-align: center;
    background: white; border-radius: 18px;
  }
  .db-activity-empty-icon  { font-size: 40px; margin-bottom: 10px; }
  .db-activity-empty-title { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
  .db-activity-empty-sub   { font-size: 13px; color: #94a3b8; margin: 0; }

  /* Coming soon */
  .db-coming-soon {
    background: white; border-radius: 18px; padding: 60px 20px;
    text-align: center; margin: 20px 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }

  /* ─────────────────────────────────────────
     BOTTOM NAV (mobile only)
  ───────────────────────────────────────── */
  .db-bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: white; border-top: 1px solid #e2e8f0;
    z-index: 200; padding: 6px 0 env(safe-area-inset-bottom,6px);
    justify-content: space-around;
  }
  .db-bottom-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 4px 8px;
    color: #94a3b8; min-width: 56px; font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.15s;
  }
  .db-bottom-btn.active { color: #e94560; }
  .db-bottom-icon  { font-size: 20px; }
  .db-bottom-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ─────────────────────────────────────────
     MOBILE BREAKPOINT
  ───────────────────────────────────────── */
  @media (max-width: 768px) {
    .db-sidebar { transform: translateX(-100%); }
    .db-sidebar.open { transform: translateX(0); }
    .db-mobile-header { display: flex; }
    .db-overlay.open  { display: block; }
    .db-main {
      margin-left: 0;
      padding-top: 56px;
      padding-bottom: 70px;
    }
    .db-desktop-topbar { display: none; }
    .db-page-content { padding: 0; }
    .db-bottom-nav { display: flex; }
    .db-dash-topbar { display: block; }

    /* Mobile stats: full width strip */
    .db-stats-strip {
      margin: -14px 16px 0;
      position: relative; z-index: 2;
      border-radius: 14px;
    }
    .db-stat-tile { padding: 12px 6px; }
    .db-stat-icon  { font-size: 15px; margin-bottom: 3px; }
    .db-stat-value { font-size: 14px; }
    .db-stat-label { font-size: 8px; }

    /* Mobile dash content */
    .db-dash-content { padding: 20px 16px 24px; }

    /* Mobile quick actions: 2x2 */
    .db-quick-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
    .db-quick-btn  { padding: 16px 10px; border-radius: 14px; }
    .db-quick-icon { font-size: 24px; }
  }

  @media (min-width: 769px) {
    .db-dash-content { padding: 0; }
    .db-stats-strip  { margin-bottom: 24px; }
  }
`;

export default function Dashboard() {
  const [pgOwner, setPgOwner]   = useState(null);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashStats, setDashStats] = useState({ totalTenants:0, vacantBeds:0, monthlyRevenue:0, pendingRents:0 });
  const navigate = useNavigate();

  const fetchStats = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const [tSnap,rSnap,pSnap] = await Promise.all([
        getDocs(query(collection(db,'tenants'),  where('ownerId','==',user.uid))),
        getDocs(query(collection(db,'rooms'),    where('ownerId','==',user.uid))),
        getDocs(query(collection(db,'payments'), where('ownerId','==',user.uid))),
      ]);
      const tenants  = tSnap.docs.map(d=>d.data()).filter(t=>t.status!=='deleted');
      const rooms    = rSnap.docs.map(d=>d.data());
      const payments = pSnap.docs.map(d=>d.data());

      const totalBeds    = rooms.reduce((a,r)=>a+(r.totalBeds||0),0);
      const occupiedBeds = rooms.reduce((a,r)=>a+(r.occupiedBeds||0),0);
      const thisMonth    = new Date().toLocaleString('en-US',{month:'long'});
      const thisYear     = new Date().getFullYear().toString();
      const todayDay     = new Date().getDate();

      let pendingRents = 0;
      tenants.forEach(t=>{
        if (!t.checkIn) return;
        const dueDay = new Date(t.checkIn).getDate();
        if (todayDay < dueDay) return;
        const paid = payments
          .filter(p=>(p.tenantId===t.id||p.tenantName===t.name) && p.month===thisMonth && p.year===thisYear)
          .reduce((a,p)=>a+(p.amount||0),0);
        if (paid < (t.monthlyRent||0)) pendingRents++;
      });

      setDashStats({
        totalTenants:   tenants.length,
        vacantBeds:     totalBeds - occupiedBeds,
        monthlyRevenue: tenants.reduce((a,t)=>a+(t.monthlyRent||0),0),
        pendingRents,
      });
    } catch(e){ console.error(e); }
  };

  useEffect(()=>{
    const unsub = auth.onAuthStateChanged(async(user)=>{
      if (user) {
        const snap = await getDoc(doc(db,'pgOwners',user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.isActive===false) {
            await signOut(auth); navigate('/login');
            alert('Your account has been blocked.'); return;
          }
          setPgOwner(data);
        }
        fetchStats();
      }
    });
    return ()=>unsub();
  },[]);

  const handleMenu = (label) => {
    setActiveMenu(label);
    setSidebarOpen(false);
    if (label==='Dashboard') fetchStats();
  };

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const menuItems = [
    {icon:'📊',label:'Dashboard'},
    {icon:'🛏️',label:'Rooms'},
    {icon:'👥',label:'Tenants'},
    {icon:'💰',label:'Rent'},
    {icon:'⚡',label:'Electricity'},
    {icon:'🍽️',label:'Food Menu'},
    {icon:'📄',label:'ID Proofs'},
    {icon:'📈',label:'Reports'},
    {icon:'🔔',label:'Notifications'},
    {icon:'⚙️',label:'Settings'},
  ];

  const statTiles = [
    {icon:'👥', label:'Tenants',  value:dashStats.totalTenants,                               color:'#4f46e5'},
    {icon:'🛏️', label:'Vacant',   value:dashStats.vacantBeds,                                 color:'#059669'},
    {icon:'💰', label:'Revenue',  value:`₹${(dashStats.monthlyRevenue/1000).toFixed(0)}k`,    color:'#d97706'},
    {icon:'⏳', label:'Pending',  value:dashStats.pendingRents,                               color:'#dc2626'},
  ];

  const quickActions = [
    {icon:'➕',label:'Add Tenant',    menu:'Tenants',     accent:'#4f46e5'},
    {icon:'🛏️',label:'Add Room',      menu:'Rooms',       accent:'#059669'},
    {icon:'💰',label:'Record Payment',menu:'Rent',        accent:'#d97706'},
    {icon:'⚡',label:'Electricity',   menu:'Electricity', accent:'#dc2626'},
  ];

  const knownPages = ['Dashboard','Rooms','Tenants','Rent','Electricity','Reports','Settings'];

  return (
    <>
      <style>{css}</style>
      <div className="db-root">

        {/* ── Mobile Header ── */}
        <div className="db-mobile-header">
          <button className="db-hamburger" onClick={()=>setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <div className="db-mobile-logo">🏠 PGpilots</div>
          <div className="db-plan-badge">⭐ Basic</div>
        </div>

        {/* ── Overlay ── */}
        <div className={`db-overlay${sidebarOpen?' open':''}`} onClick={()=>setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <div className={`db-sidebar${sidebarOpen?' open':''}`}>
          <div className="db-sidebar-top">
            <div className="db-sidebar-logo">🏠 PGpilots</div>
            {pgOwner && (
              <div className="db-owner-box">
                <div className="db-owner-avatar">
                  {(pgOwner.ownerName||pgOwner.name||'P')?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="db-owner-name">{pgOwner.ownerName||pgOwner.name}</div>
                  <div className="db-owner-pg">{pgOwner.pgName}</div>
                </div>
              </div>
            )}
          </div>
          <nav className="db-nav">
            {menuItems.map(({icon,label})=>(
              <div key={label}
                className={`db-nav-item${activeMenu===label?' active':''}`}
                onClick={()=>handleMenu(label)}>
                <span className="db-nav-icon">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <button className="db-logout-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>

        {/* ── Main ── */}
        <div className="db-main">

          {/* Desktop top bar */}
          <div className="db-desktop-topbar">
            <div>
              <div className="db-desktop-title">{activeMenu}</div>
              <div className="db-desktop-sub">
                {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
              </div>
            </div>
            <div className="db-desktop-badge">⭐ Basic Plan</div>
          </div>

          {/* Page content wrapper */}
          <div className="db-page-content">

            {/* ── Routed pages (each has their own topbar) ── */}
            {activeMenu==='Rooms'       && <Rooms />}
            {activeMenu==='Tenants'     && <Tenants />}
            {activeMenu==='Rent'        && <RentPage />}
            {activeMenu==='Electricity' && <ElectricityPage />}
            {activeMenu==='Reports'     && <ReportsPage />}
            {activeMenu==='Settings'    && <SettingsPage />}

            {/* ── Dashboard Home ── */}
            {activeMenu==='Dashboard' && (
              <>
                {/* Mobile hero (hidden on desktop via CSS) */}
                <div className="db-dash-topbar">
                  <div className="db-dash-greeting">
                    👋 {pgOwner ? `Hey, ${(pgOwner.ownerName||pgOwner.name||'').split(' ')[0]}!` : 'Welcome back!'}
                  </div>
                  <div className="db-dash-sub">
                    {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                  </div>
                </div>

                <div className="db-dash-content">
                  {/* Stats strip */}
                  <div className="db-stats-strip">
                    {statTiles.map(({icon,label,value,color})=>(
                      <div key={label} className="db-stat-tile">
                        <div className="db-stat-icon">{icon}</div>
                        <div className="db-stat-value" style={{color}}>{value}</div>
                        <div className="db-stat-label">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile spacing after strip */}
                  <div style={{height:'20px'}} />

                  {/* Quick actions */}
                  <div className="db-section-title">Quick Actions</div>
                  <div className="db-quick-grid">
                    {quickActions.map(({icon,label,menu,accent})=>(
                      <button key={label} className="db-quick-btn" onClick={()=>handleMenu(menu)}>
                        <div className="db-quick-icon">{icon}</div>
                        <div className="db-quick-label" style={{color:accent}}>{label}</div>
                      </button>
                    ))}
                  </div>

                  {/* Recent activity */}
                  <div className="db-section-title">Recent Activity</div>
                  <div className="db-activity-empty">
                    <div className="db-activity-empty-icon">📋</div>
                    <p className="db-activity-empty-title">No activity yet</p>
                    <p className="db-activity-empty-sub">Start by adding rooms and tenants</p>
                  </div>
                </div>
              </>
            )}

            {/* ── Coming Soon ── */}
            {!knownPages.includes(activeMenu) && (
              <div style={{padding:'20px 16px'}}>
                <div className="db-coming-soon">
                  <div style={{fontSize:'48px',marginBottom:'14px'}}>🚧</div>
                  <div style={{fontSize:'17px',fontWeight:'700',color:'#1e293b',marginBottom:'6px'}}>{activeMenu}</div>
                  <div style={{fontSize:'13px',color:'#94a3b8'}}>This feature is coming soon!</div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <div className="db-bottom-nav">
          {menuItems.slice(0,5).map(({icon,label})=>(
            <button key={label}
              className={`db-bottom-btn${activeMenu===label?' active':''}`}
              onClick={()=>handleMenu(label)}>
              <span className="db-bottom-icon">{icon}</span>
              <span className="db-bottom-label">{label}</span>
            </button>
          ))}
        </div>

      </div>
    </>
  );
}