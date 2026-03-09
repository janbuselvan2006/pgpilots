import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Rooms from './RoomsPage';
import Tenants from './TenantsPage';

function Dashboard() {
  const [pgOwner, setPgOwner] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOwner = async () => {
      const user = auth.currentUser;
      if (user) {
        const snap = await getDoc(doc(db, 'pgOwners', user.uid));
        if (snap.exists()) setPgOwner(snap.data());
      }
    };
    fetchOwner();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
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
    { icon: '👥', label: 'Total Tenants', value: '0', color: '#4f46e5', bg: '#eef2ff' },
    { icon: '🛏️', label: 'Vacant Beds', value: '0', color: '#059669', bg: '#ecfdf5' },
    { icon: '💰', label: 'Monthly Revenue', value: '₹0', color: '#d97706', bg: '#fffbeb' },
    { icon: '⏳', label: 'Pending Rents', value: '0', color: '#dc2626', bg: '#fef2f2' },
  ];

  const quickActions = [
    { icon: '➕', label: 'Add Tenant', color: '#4f46e5', menu: 'Tenants' },
    { icon: '🛏️', label: 'Add Room', color: '#059669', menu: 'Rooms' },
    { icon: '💰', label: 'Record Payment', color: '#d97706', menu: 'Rent' },
    { icon: '⚡', label: 'Add Electricity Bill', color: '#dc2626', menu: 'Electricity' },
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.logo}>🏠 PG Manager</div>
          {pgOwner && (
            <div style={styles.ownerBox}>
              <div style={styles.avatar}>{pgOwner.name?.charAt(0).toUpperCase()}</div>
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
              onClick={() => setActiveMenu(label)}>
              <span style={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>{activeMenu}</h1>
            <p style={styles.pageSubtitle}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={styles.topBarRight}>
            <div style={styles.planBadge}>⭐ Basic Plan</div>
          </div>
        </div>

        {/* Rooms Page */}
        {activeMenu === 'Rooms' && <Rooms />}
        {activeMenu === 'Tenants' && <Tenants />}

        {/* Dashboard Home */}
        {activeMenu === 'Dashboard' && (
          <>
            {/* Stats */}
            <div style={styles.statsGrid}>
              {stats.map(({ icon, label, value, color, bg }) => (
                <div key={label} style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: bg, color }}>{icon}</div>
                  <div>
                    <div style={styles.statValue}>{value}</div>
                    <div style={styles.statLabel}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Quick Actions</h2>
              <div style={styles.actionsGrid}>
                {quickActions.map(({ icon, label, color, menu }) => (
                  <button key={label}
                    onClick={() => setActiveMenu(menu)}
                    style={{ ...styles.actionBtn, borderColor: color, color }}>
                    <span style={styles.actionIcon}>{icon}</span>
                    <span style={styles.actionLabel}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <p style={styles.emptyText}>No activity yet</p>
                <p style={styles.emptySubText}>Start by adding your rooms and tenants</p>
              </div>
            </div>
          </>
        )}

        {/* Placeholder for other pages */}
        {!['Dashboard', 'Rooms'].includes(activeMenu) && (
          <div style={styles.section}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🚧</div>
              <p style={styles.emptyText}>{activeMenu} — Coming Soon!</p>
              <p style={styles.emptySubText}>We are building this feature</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f1f5f9' },
  sidebar: { width: '260px', background: '#1e293b', display: 'flex', flexDirection: 'column', padding: '0', position: 'fixed', height: '100vh', overflowY: 'auto' },
  sidebarTop: { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logo: { color: 'white', fontSize: '20px', fontWeight: '800', marginBottom: '20px', letterSpacing: '0.5px' },
  ownerBox: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px' },
  ownerName: { color: 'white', fontSize: '14px', fontWeight: '600' },
  ownerPg: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' },
  nav: { padding: '16px 12px', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', marginBottom: '4px' },
  navItemActive: { background: 'rgba(233,69,96,0.15)', color: '#e94560', fontWeight: '600' },
  navIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  logoutBtn: { margin: '12px', padding: '12px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  main: { marginLeft: '260px', flex: 1, padding: '32px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  pageTitle: { fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: 0 },
  pageSubtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  planBadge: { background: '#fef9c3', color: '#854d0e', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  statCard: { background: 'white', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  statIcon: { width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
  statValue: { fontSize: '26px', fontWeight: '800', color: '#1e293b' },
  statLabel: { color: '#94a3b8', fontSize: '13px', marginTop: '2px' },
  section: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', marginTop: 0 },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  actionBtn: { padding: '20px 16px', borderRadius: '12px', border: '1.5px solid', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  actionIcon: { fontSize: '28px' },
  actionLabel: { fontSize: '13px', fontWeight: '600' },
  emptyState: { textAlign: 'center', padding: '40px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { color: '#1e293b', fontWeight: '600', fontSize: '16px', margin: '0 0 8px 0' },
  emptySubText: { color: '#94a3b8', fontSize: '14px', margin: 0 },
};

export default Dashboard;