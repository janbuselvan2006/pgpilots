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

function Dashboard() {
  const [pgOwner, setPgOwner] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dashStats, setDashStats] = useState({
    totalTenants: 0,
    vacantBeds: 0,
    monthlyRevenue: 0,
    pendingRents: 0,
  });
  const navigate = useNavigate();

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch stats function
  const fetchStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const tq = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
    const tSnap = await getDocs(tq);
    const tenants = tSnap.docs.map(d => d.data());

    const rq = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
    const rSnap = await getDocs(rq);
    const rooms = rSnap.docs.map(d => d.data());

    const totalTenants = tenants.length;
    const totalBeds = rooms.reduce((a, r) => a + r.totalBeds, 0);
    const occupiedBeds = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);
    const vacantBeds = totalBeds - occupiedBeds;
    const monthlyRevenue = tenants.reduce((a, t) => a + (t.monthlyRent || 0), 0);

    setDashStats({ totalTenants, vacantBeds, monthlyRevenue, pendingRents: 0 });
  };

  // Fetch owner + stats on load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch PG owner details
        const snap = await getDoc(doc(db, 'pgOwners', user.uid));
        if (snap.exists()) setPgOwner(snap.data());
        // Fetch stats
        fetchStats();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleMenuClick = (label) => {
    setActiveMenu(label);
    setSidebarOpen(false);
    if (label === 'Dashboard') fetchStats();
  };

  const menuItems = [
    { icon: '📊', label: 'Dashboard' },
    { icon: '🛏️', label: 'Rooms' },
    { icon: '👥', label: 'Tenants' },
    { icon: '💰', label: 'Rent' },
    { icon: '⚡', label: 'Electricity' },
    { icon: '🍽️', label: 'Food Menu' },
    { icon: '📄', label: 'ID Proofs' },
    { icon: '📈', label: 'Reports' },
    { icon: '🔔', label: 'Notifications' },
    { icon: '⚙️', label: 'Settings' },
  ];

  const stats = [
    { icon: '👥', label: 'Total Tenants', value: dashStats.totalTenants, color: '#4f46e5', bg: '#eef2ff' },
    { icon: '🛏️', label: 'Vacant Beds', value: dashStats.vacantBeds, color: '#059669', bg: '#ecfdf5' },
    { icon: '💰', label: 'Monthly Revenue', value: `₹${dashStats.monthlyRevenue.toLocaleString()}`, color: '#d97706', bg: '#fffbeb' },
    { icon: '⏳', label: 'Pending Rents', value: dashStats.pendingRents, color: '#dc2626', bg: '#fef2f2' },
  ];

  const quickActions = [
    { icon: '➕', label: 'Add Tenant', color: '#4f46e5', menu: 'Tenants' },
    { icon: '🛏️', label: 'Add Room', color: '#059669', menu: 'Rooms' },
    { icon: '💰', label: 'Record Payment', color: '#d97706', menu: 'Rent' },
    { icon: '⚡', label: 'Electricity Bill', color: '#dc2626', menu: 'Electricity' },
  ];

  const showSidebar = !isMobile || sidebarOpen;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f1f5f9' }}>

      {/* Mobile Header */}
      {isMobile && (
        <div style={styles.mobileHeader}>
          <button style={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <div style={styles.mobileLogo}>🏠 PG Manager</div>
          <div style={styles.mobilePlan}>⭐ Basic</div>
        </div>
      )}

      {/* Overlay */}
      {isMobile && sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div style={{
          ...styles.sidebar,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        }}>
          <div style={styles.sidebarTop}>
            <div style={styles.logo}>🏠 PG Manager</div>
            {pgOwner && (
              <div style={styles.ownerBox}>
                <div style={styles.avatar}>
                  {pgOwner.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.ownerName}>{pgOwner.name}</div>
                  <div style={styles.ownerPg}>{pgOwner.pgName}</div>
                </div>
              </div>
            )}
          </div>
          <nav style={styles.nav}>
            {menuItems.map(({ icon, label }) => (
              <div key={label}
                style={{ ...styles.navItem, ...(activeMenu === label ? styles.navItemActive : {}) }}
                onClick={() => handleMenuClick(label)}>
                <span style={styles.navIcon}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        ...styles.main,
        marginLeft: isMobile ? '0' : '260px',
        paddingTop: isMobile ? '76px' : '32px',
        paddingBottom: isMobile ? '80px' : '32px',
      }}>

        {/* Desktop Top Bar */}
        {!isMobile && (
          <div style={styles.topBar}>
            <div>
              <h1 style={styles.pageTitle}>{activeMenu}</h1>
              <p style={styles.pageSubtitle}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long', year: 'numeric',
                  month: 'long', day: 'numeric'
                })}
              </p>
            </div>
            <div style={styles.planBadge}>⭐ Basic Plan</div>
          </div>
        )}

        {/* Mobile Page Title */}
        {isMobile && (
          <h1 style={{ ...styles.pageTitle, marginBottom: '20px' }}>{activeMenu}</h1>
        )}

        {/* Pages */}
        {activeMenu === 'Rooms' && <Rooms />}
        {activeMenu === 'Tenants' && <Tenants />}
        {activeMenu === 'Rent' && <RentPage />}
        {activeMenu === 'Electricity' && <ElectricityPage />}
        {activeMenu === 'Reports' && <ReportsPage />}
        {activeMenu === 'Settings' && <SettingsPage />}

        {/* Dashboard Home */}
        {activeMenu === 'Dashboard' && (
          <>
            <div style={{
              ...styles.statsGrid,
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            }}>
              {stats.map(({ icon, label, value, color, bg }) => (
                <div key={label} style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: bg, color }}>{icon}</div>
                  <div>
                    <div style={{ ...styles.statValue, fontSize: isMobile ? '20px' : '26px' }}>{value}</div>
                    <div style={styles.statLabel}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Quick Actions</h2>
              <div style={{
                ...styles.actionsGrid,
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              }}>
                {quickActions.map(({ icon, label, color, menu }) => (
                  <button key={label}
                    onClick={() => handleMenuClick(menu)}
                    style={{ ...styles.actionBtn, borderColor: color, color }}>
                    <span style={styles.actionIcon}>{icon}</span>
                    <span style={styles.actionLabel}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <p style={styles.emptyText}>No activity yet</p>
                <p style={styles.emptySubText}>Start by adding rooms and tenants</p>
              </div>
            </div>
          </>
        )}

        {/* Coming Soon */}
        {!['Dashboard', 'Rooms', 'Tenants', 'Rent','Electricity','Reports',"Settings"].includes(activeMenu) && (
          <div style={styles.section}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🚧</div>
              <p style={styles.emptyText}>{activeMenu} — Coming Soon!</p>
              <p style={styles.emptySubText}>We are building this feature</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div style={styles.bottomNav}>
          {menuItems.slice(0, 5).map(({ icon, label }) => (
            <button key={label}
              style={{ ...styles.bottomNavItem, ...(activeMenu === label ? styles.bottomNavActive : {}) }}
              onClick={() => handleMenuClick(label)}>
              <span style={styles.bottomNavIcon}>{icon}</span>
              <span style={styles.bottomNavLabel}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  mobileHeader: {
    position: 'fixed', top: 0, left: 0, right: 0,
    height: '60px', background: '#1e293b',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100,
  },
  hamburger: {
    background: 'none', border: 'none',
    color: 'white', fontSize: '22px', cursor: 'pointer',
  },
  mobileLogo: { color: 'white', fontSize: '16px', fontWeight: '800' },
  mobilePlan: {
    background: '#fef9c3', color: '#854d0e',
    padding: '4px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: '700',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 150,
  },
  sidebar: {
    width: '260px', background: '#1e293b',
    display: 'flex', flexDirection: 'column',
    position: 'fixed', height: '100vh', overflowY: 'auto',
    zIndex: 200, transition: 'transform 0.3s ease',
  },
  sidebarTop: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logo: { color: 'white', fontSize: '20px', fontWeight: '800', marginBottom: '20px' },
  ownerBox: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #0f3460)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: '700', fontSize: '16px',
  },
  ownerName: { color: 'white', fontSize: '14px', fontWeight: '600' },
  ownerPg: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' },
  nav: { padding: '16px 12px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '11px 14px', borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)', fontSize: '14px',
    cursor: 'pointer', marginBottom: '4px',
  },
  navItemActive: { background: 'rgba(233,69,96,0.15)', color: '#e94560', fontWeight: '600' },
  navIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  logoutBtn: {
    margin: '12px', padding: '12px',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.6)',
    border: 'none', borderRadius: '10px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  },
  main: { flex: 1, padding: '32px' },
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '32px',
  },
  pageTitle: { fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: 0 },
  pageSubtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  planBadge: {
    background: '#fef9c3', color: '#854d0e',
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700',
  },
  statsGrid: { display: 'grid', gap: '20px', marginBottom: '32px' },
  statCard: {
    background: 'white', borderRadius: '16px', padding: '24px',
    display: 'flex', alignItems: 'center', gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  statIcon: {
    width: '52px', height: '52px', borderRadius: '14px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '22px', flexShrink: 0,
  },
  statValue: { fontWeight: '800', color: '#1e293b' },
  statLabel: { color: '#94a3b8', fontSize: '13px', marginTop: '2px' },
  section: {
    background: 'white', borderRadius: '16px', padding: '24px',
    marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '16px', fontWeight: '700',
    color: '#1e293b', marginBottom: '20px', marginTop: 0,
  },
  actionsGrid: { display: 'grid', gap: '16px' },
  actionBtn: {
    padding: '20px 16px', borderRadius: '12px',
    border: '1.5px solid', background: 'white',
    cursor: 'pointer', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: '8px',
  },
  actionIcon: { fontSize: '28px' },
  actionLabel: { fontSize: '13px', fontWeight: '600' },
  emptyState: { textAlign: 'center', padding: '40px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { color: '#1e293b', fontWeight: '600', fontSize: '16px', margin: '0 0 8px 0' },
  emptySubText: { color: '#94a3b8', fontSize: '14px', margin: 0 },
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'white', borderTop: '1px solid #e2e8f0',
    padding: '8px 0', zIndex: 100,
    display: 'flex', justifyContent: 'space-around',
  },
  bottomNavItem: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '4px',
    background: 'none', border: 'none',
    cursor: 'pointer', padding: '4px 8px',
    color: '#94a3b8', minWidth: '60px',
  },
  bottomNavActive: { color: '#e94560' },
  bottomNavIcon: { fontSize: '20px' },
  bottomNavLabel: { fontSize: '10px', fontWeight: '600' },
};

export default Dashboard;