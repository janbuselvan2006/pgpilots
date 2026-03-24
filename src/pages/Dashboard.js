import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
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
    display: flex; min-height: 100dvh;
    font-family: 'DM Sans', sans-serif; background: #f0f2f8;
  }

  /* ── SIDEBAR ── */
  .db-sidebar {
    width: 260px; background: linear-gradient(180deg,#1a1a2e 0%,#0f3460 100%);
    display: flex; flex-direction: column;
    position: fixed; height: 100vh; overflow-y: auto;
    z-index: 400; transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); flex-shrink: 0;
  }
  .db-sidebar-top {
    padding: 28px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .db-sidebar-logo {
    color: white; font-size: 20px; font-weight: 800; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }
  .db-owner-box { display: flex; align-items: center; gap: 12px; }
  .db-owner-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg,#e94560,#c1253f);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 16px; flex-shrink: 0;
  }
  .db-owner-name { color: white; font-size: 14px; font-weight: 700; }
  .db-owner-pg   { color: rgba(255,255,255,0.45); font-size: 11px; margin-top: 2px; }

  /* ── PG Switcher ── */
  .db-pg-switcher {
    margin: 14px 20px 0;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px; padding: 10px 12px;
  }
  .db-pg-switcher-label {
    font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.4);
    text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;
  }
  .db-pg-select {
    width: 100%; background: transparent; border: none; outline: none;
    color: white; font-size: 13px; font-weight: 700; font-family: inherit;
    cursor: pointer; appearance: none; -webkit-appearance: none;
  }
  .db-pg-select option { background: #1a1a2e; color: white; }
  .db-pg-add-btn {
    width: 100%; margin-top: 8px; padding: 7px;
    background: rgba(233,69,96,0.15); border: 1px dashed rgba(233,69,96,0.4);
    border-radius: 8px; color: #e94560; font-size: 11px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: background 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .db-pg-add-btn:hover { background: rgba(233,69,96,0.25); }

  .db-nav { padding: 14px 10px; flex: 1; overflow-y: auto; scrollbar-width: none; }
  .db-nav::-webkit-scrollbar { display: none; }
  .db-nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; border-radius: 12px;
    color: rgba(255,255,255,0.55); font-size: 14px;
    cursor: pointer; margin-bottom: 3px;
    transition: all 0.15s; font-weight: 500;
    -webkit-tap-highlight-color: transparent;
  }
  .db-nav-item:hover  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
  .db-nav-item.active { background: rgba(233,69,96,0.18); color: #e94560; font-weight: 700; }
  .db-nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }

  .db-logout-btn {
    margin: 0 12px; margin-bottom: max(16px,env(safe-area-inset-bottom,16px));
    padding: 14px; background: rgba(233,69,96,0.15);
    color: #e94560; border: 1px solid rgba(233,69,96,0.3); border-radius: 12px;
    cursor: pointer; font-size: 14px; font-weight: 700; font-family: inherit;
    transition: background 0.2s; display: flex; align-items: center;
    justify-content: center; gap: 8px; flex-shrink: 0;
  }
  .db-logout-btn:hover { background: rgba(233,69,96,0.25); }

  /* ── MOBILE HEADER ── */
  .db-mobile-header {
    display: none; position: fixed; top: 0; left: 0; right: 0;
    height: 56px; background: linear-gradient(135deg,#1a1a2e,#0f3460);
    align-items: center; justify-content: space-between;
    padding: 0 16px; z-index: 500; box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .db-hamburger {
    background: rgba(255,255,255,0.1); border: none; color: white;
    font-size: 18px; cursor: pointer; width: 36px; height: 36px;
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .db-mobile-logo { color: white; font-size: 15px; font-weight: 800; }
  .db-mobile-pg-name {
    color: rgba(255,255,255,0.7); font-size: 10px; font-weight: 600;
    text-align: center; max-width: 120px; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .db-plan-badge {
    background: #fef9c3; color: #854d0e;
    padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800;
  }

  /* ── OVERLAY ── */
  .db-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(15,20,40,0.6); z-index: 350;
    backdrop-filter: blur(2px); animation: dbFade 0.2s ease;
  }
  @keyframes dbFade { from{opacity:0}to{opacity:1} }

  /* ── MAIN ── */
  .db-main { flex: 1; margin-left: 260px; min-width: 0; overflow-x: hidden; }

  .db-desktop-topbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 32px 0; margin-bottom: 24px;
  }
  .db-desktop-title { font-size: 26px; font-weight: 800; color: #1e293b; }
  .db-desktop-sub   { font-size: 13px; color: #94a3b8; margin-top: 4px; }
  .db-desktop-badge {
    background: #fef9c3; color: #854d0e;
    padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
  }

  .db-page-content { padding: 0 32px 40px; }

  /* ── DASHBOARD HOME ── */
  .db-dash-topbar {
    background: linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
    padding: 20px 20px 32px; position: relative; overflow: hidden; display: none;
  }
  .db-dash-topbar::after {
    content:''; position:absolute; width:200px; height:200px; border-radius:50%;
    background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none;
  }
  .db-dash-greeting { font-size:20px; font-weight:800; color:white; position:relative; z-index:1; }
  .db-dash-sub      { font-size:12px; color:rgba(255,255,255,0.5); margin-top:3px; position:relative; z-index:1; }

  /* Mobile PG switcher pill */
  .db-mobile-pg-pill {
    display: none; position: relative; z-index: 1;
    margin-top: 12px; align-items: center; gap: 8px;
  }
  .db-mobile-pg-pill select {
    background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px; color: white; font-size: 12px; font-weight: 700;
    padding: 5px 12px; font-family: inherit; outline: none;
    appearance: none; -webkit-appearance: none; cursor: pointer;
  }
  .db-mobile-pg-pill select option { background: #1a1a2e; }
  .db-mobile-pg-pill-add {
    background: rgba(233,69,96,0.2); border: 1px solid rgba(233,69,96,0.4);
    border-radius: 20px; color: #e94560; font-size: 11px; font-weight: 700;
    padding: 5px 10px; font-family: inherit; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* Stats */
  .db-stats-strip {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 0; background: white; border-radius: 16px; overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 24px;
  }
  .db-stat-tile {
    padding: 18px 12px; text-align: center;
    border-right: 1px solid #f1f5f9; transition: background 0.2s; cursor: pointer;
  }
  .db-stat-tile:last-child { border-right: none; }
  .db-stat-icon  { font-size: 20px; margin-bottom: 6px; }
  .db-stat-value { font-size: 18px; font-weight: 800; line-height: 1; }
  .db-stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

  /* Quick actions */
  .db-section-title {
    font-size: 14px; font-weight: 800; color: #1e293b;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;
  }
  .db-quick-grid {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 12px; margin-bottom: 28px;
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

  /* Pending payments */
  .db-pending-card {
    background: white; border-radius: 18px; overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 24px;
  }
  .db-pending-header {
    padding: 16px 20px; display: flex; justify-content: space-between;
    align-items: center; border-bottom: 1px solid #f1f5f9;
  }
  .db-pending-title { font-size: 14px; font-weight: 800; color: #1e293b; }
  .db-pending-count {
    background: #fee2e2; color: #dc2626;
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
  }
  .db-pending-row {
    padding: 12px 20px; display: flex; align-items: center;
    gap: 12px; border-bottom: 1px solid #f8fafc;
  }
  .db-pending-row:last-child { border-bottom: none; }
  .db-pending-avatar {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg,#fee2e2,#fecaca);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: #dc2626;
  }
  .db-pending-name  { font-size: 13px; font-weight: 700; color: #1e293b; }
  .db-pending-room  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .db-pending-amt   { margin-left: auto; font-size: 13px; font-weight: 800; color: #dc2626; }

  /* Recent activity */
  .db-activity-card {
    background: white; border-radius: 18px; overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 14px;
  }
  .db-activity-header {
    padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
    font-size: 14px; font-weight: 800; color: #1e293b;
  }
  .db-activity-row {
    padding: 12px 20px; display: flex; align-items: center;
    gap: 12px; border-bottom: 1px solid #f8fafc;
  }
  .db-activity-row:last-child { border-bottom: none; }
  .db-activity-dot {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 16px;
  }
  .db-activity-text  { font-size: 13px; font-weight: 600; color: #1e293b; }
  .db-activity-time  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .db-activity-empty {
    padding: 40px 20px; text-align: center;
    background: white; border-radius: 18px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }

  /* Overview */
  .db-overview-grid {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .db-overview-card {
    background: white; border-radius: 18px; padding: 18px 18px 16px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    display: flex; flex-direction: column; gap: 10px;
  }
  .db-overview-head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  .db-overview-title {
    font-size: 15px; font-weight: 800; color: #1e293b;
  }
  .db-overview-sub {
    font-size: 12px; color: #94a3b8; margin-top: 2px;
  }
  .db-overview-pill {
    background: #eef2ff; color: #4338ca;
    padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .db-overview-meta {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px; margin-top: 2px;
  }
  .db-overview-meta-item {
    background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px;
    padding: 10px 12px;
  }
  .db-overview-meta-label {
    font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .db-overview-meta-value {
    font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 4px;
  }
  .db-overview-actions {
    display: flex; gap: 10px; margin-top: 2px;
  }
  .db-overview-btn {
    flex: 1; padding: 10px 12px; border-radius: 12px; border: none;
    font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit;
  }
  .db-overview-btn.primary { background: #e94560; color: white; }
  .db-overview-btn.ghost   { background: #f1f5f9; color: #64748b; }
  .db-overview-empty {
    padding: 40px 20px; text-align: center;
    background: white; border-radius: 18px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }

  /* ── BOTTOM NAV ── */
  .db-bottom-nav {
    display: none; position: fixed; bottom: 0; left: 0; right: 0;
    background: white; border-top: 1px solid #e2e8f0;
    z-index: 200; padding: 6px 0 env(safe-area-inset-bottom,6px);
    justify-content: space-around;
  }
  .db-bottom-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 4px 8px;
    color: #94a3b8; min-width: 56px; font-family: inherit;
    -webkit-tap-highlight-color: transparent; transition: color 0.15s;
  }
  .db-bottom-btn.active { color: #e94560; }
  .db-bottom-icon  { font-size: 20px; }
  .db-bottom-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ── Add PG Modal ── */
  .db-modal-bg {
    position: fixed; inset: 0; background: rgba(15,20,40,0.6);
    z-index: 600; display: flex; align-items: center; justify-content: center;
    padding: 20px; backdrop-filter: blur(4px);
  }
  .db-modal {
    background: white; border-radius: 20px; padding: 28px 24px;
    width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .db-modal-title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
  .db-modal-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 20px; }
  .db-modal-field { margin-bottom: 14px; }
  .db-modal-label { display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; }
  .db-modal-input {
    width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0;
    border-radius: 10px; font-size: 14px; font-family: inherit;
    color: #1e293b; background: #fafbff; outline: none;
    transition: border-color 0.2s;
  }
  .db-modal-input:focus { border-color: #e94560; }
  .db-modal-row { display: flex; gap: 10px; margin-top: 6px; }
  .db-modal-btn {
    flex: 1; padding: 13px;
    background: linear-gradient(135deg,#e94560,#c1253f);
    color: white; border: none; border-radius: 12px;
    font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
  }
  .db-modal-cancel {
    flex: 1; padding: 13px; background: #f1f5f9;
    color: #64748b; border: none; border-radius: 12px;
    font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
  }

  /* ── MOBILE BREAKPOINT ── */
  @media (max-width: 768px) {
    .db-sidebar { transform: translateX(-100%); }
    .db-sidebar.open { transform: translateX(0); }
    .db-mobile-header { display: flex; }
    .db-overlay.open  { display: block; }
    .db-main { margin-left: 0; padding-top: 56px; padding-bottom: 70px; }
    .db-desktop-topbar { display: none; }
    .db-page-content { padding: 0; }
    .db-bottom-nav { display: flex; }
    .db-dash-topbar { display: block; }
    .db-mobile-pg-pill { display: flex; }

    .db-stats-strip {
      margin: -14px 16px 0; position: relative; z-index: 2; border-radius: 14px;
    }
    .db-stat-tile  { padding: 12px 6px; }
    .db-stat-icon  { font-size: 15px; margin-bottom: 3px; }
    .db-stat-value { font-size: 14px; }
    .db-stat-label { font-size: 8px; }
    .db-dash-content { padding: 20px 16px 24px; }
    .db-quick-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
    .db-quick-btn  { padding: 16px 10px; border-radius: 14px; }
    .db-quick-icon { font-size: 24px; }
    .db-overview-grid { grid-template-columns: 1fr; }
  }

  @media (min-width: 769px) {
    .db-dash-content { padding: 0; }
    .db-stats-strip  { margin-bottom: 24px; }
  }
`;

// ── Helper: time ago
const timeAgo = (date) => {
  if (!date) return '';
  const d   = date?.toDate ? date.toDate() : new Date(date);
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60)   return 'Just now';
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400)return `${Math.floor(sec/3600)}h ago`;
  return `${Math.floor(sec/86400)}d ago`;
};

export default function Dashboard() {
  const ALL_PGS_ID = '__all__';
  const [pgOwner, setPgOwner]         = useState(null);
  const [pgs, setPgs]                 = useState([]);
  const [selectedPgId, setSelectedPgId] = useState(null);
  const [selectedPg, setSelectedPg]   = useState(null);
  const [activeMenu, setActiveMenu]   = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddPg, setShowAddPg]     = useState(false);
  const [dashStats, setDashStats]     = useState({ totalTenants:0, vacantBeds:0, monthlyRevenue:0, pendingRents:0 });
  const [pendingList, setPendingList] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Add PG form
  const [newPgName, setNewPgName]   = useState('');
  const [newPgCity, setNewPgCity]   = useState('');
  const [newPgState, setNewPgState] = useState('');
  const [addingPg, setAddingPg]     = useState(false);

  const navigate = useNavigate();
  const isAllSelected = selectedPgId === ALL_PGS_ID;

  // ── Fetch all PGs for this owner
  const fetchPGs = async (user) => {
    // ✅ Try new subcollection first (multi-PG structure)
    const subSnap = await getDocs(collection(db, 'pgOwners', user.uid, 'pgs'));
    if (!subSnap.empty) {
      const list = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPgs(list);
      return list;
    }
    // ✅ Fallback: old single-PG structure — treat root doc as single PG
    const rootSnap = await getDoc(doc(db, 'pgOwners', user.uid));
    if (rootSnap.exists()) {
      const data = rootSnap.data();
      const fallback = [{ id: user.uid, ...data }];
      setPgs(fallback);
      return fallback;
    }
    return [];
  };

  // ── Fetch dashboard stats for selected PG
  const fetchStatsForPgIds = async (pgIds) => {
    if (!pgIds || pgIds.length === 0) return { tenants: [], rooms: [], payments: [] };
    const [tSnaps, rSnaps, pSnaps] = await Promise.all([
      Promise.all(pgIds.map(id => getDocs(query(collection(db, 'tenants'),  where('pgId', '==', id))))),
      Promise.all(pgIds.map(id => getDocs(query(collection(db, 'rooms'),    where('pgId', '==', id))))),
      Promise.all(pgIds.map(id => getDocs(query(collection(db, 'payments'), where('pgId', '==', id))))),
    ]);

    const tenants  = tSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
    const rooms    = rSnaps.flatMap(s => s.docs.map(d => d.data()));
    const payments = pSnaps.flatMap(s => s.docs.map(d => d.data()));
    return { tenants, rooms, payments };
  };

  const fetchStats = useCallback(async (pgId, ownerId) => {
    if (!pgId || !ownerId) return;
    setStatsLoading(true);
    try {
      const pgIds = pgId === ALL_PGS_ID ? pgs.map(p => p.id) : [pgId];
      const { tenants: allTenants, rooms, payments } = await fetchStatsForPgIds(pgIds);

      const tenants = allTenants.filter(t => t.status !== 'deleted');

      const totalBeds    = rooms.reduce((a, r) => a + (r.totalBeds    || 0), 0);
      const occupiedBeds = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);

      const thisMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const thisYear  = new Date().getFullYear().toString();
      const todayDay  = new Date().getDate();

      const pending = [];
      tenants.forEach(t => {
        if (!t.checkIn) return;
        const dueDay = new Date(t.checkIn).getDate();
        if (todayDay < dueDay) return;
        const paid = payments
          .filter(p => (p.tenantId === t.id || p.tenantName === t.name) && p.month === thisMonth && p.year === thisYear)
          .reduce((a, p) => a + (p.amount || 0), 0);
        if (paid < (t.monthlyRent || 0)) {
          pending.push({
            name: t.name,
            room: t.roomNumber || t.room || '—',
            due:  (t.monthlyRent || 0) - paid,
            initial: (t.name || 'T').charAt(0).toUpperCase(),
          });
        }
      });

      // Recent activity — latest 5 tenants by check-in
      const sorted = [...tenants].sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return db_ - da;
      }).slice(0, 5);

      setRecentActivity(sorted.map(t => ({
        icon: '👤',
        bg:   '#eff6ff',
        text: `${t.name} joined — Room ${t.roomNumber || t.room || '?'}`,
        time: timeAgo(t.createdAt),
      })));

      setPendingList(pending.slice(0, 5));
      setDashStats({
        totalTenants:   tenants.length,
        vacantBeds:     totalBeds - occupiedBeds,
        monthlyRevenue: tenants.reduce((a, t) => a + (t.monthlyRent || 0), 0),
        pendingRents:   pending.length,
      });
    } catch (e) { console.error(e); }
    setStatsLoading(false);
  }, [pgs]);

  // ── Auth + initial data load
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'pgOwners', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.isActive === false) {
            await signOut(auth); navigate('/login');
            alert('Your account has been blocked.'); return;
          }
          setPgOwner(data);
        }
        const list = await fetchPGs(user);
        if (list.length > 0) {
          setSelectedPgId(list[0].id);
          setSelectedPg(list[0]);
          fetchStats(list[0].id, user.uid);
        }
      } catch (e) { console.error(e); }
    });
    return () => unsub();
  }, []);

  // ── When selected PG changes, reload stats
  useEffect(() => {
    if (!selectedPgId || !auth.currentUser) return;
    const pg = pgs.find(p => p.id === selectedPgId);
    setSelectedPg(pg || null);
    fetchStats(selectedPgId, auth.currentUser.uid);
  }, [selectedPgId]);

  // ── Back button handler
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (activeMenu !== 'Dashboard') {
        setActiveMenu('Dashboard');
        setSidebarOpen(false);
        window.history.pushState(null, '', window.location.href);
      } else {
        navigate('/', { replace: true });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeMenu]);

  const handleMenu = (label) => {
    if (label === 'Overview') {
      setSelectedPgId(ALL_PGS_ID);
      setActiveMenu('Dashboard');
      setSidebarOpen(false);
      if (auth.currentUser) fetchStats(ALL_PGS_ID, auth.currentUser.uid);
      return;
    }
    setActiveMenu(label);
    setSidebarOpen(false);
    if (label === 'Dashboard' && selectedPgId && auth.currentUser) {
      fetchStats(selectedPgId, auth.currentUser.uid);
    }
  };

  const openPgDashboard = (pgId) => {
    setSelectedPgId(pgId);
    setActiveMenu('Dashboard');
    setSidebarOpen(false);
    if (auth.currentUser) {
      fetchStats(pgId, auth.currentUser.uid);
    }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  // ── Add new PG
  const handleAddPg = async () => {
    if (!newPgName.trim() || !newPgCity.trim()) return;
    setAddingPg(true);
    try {
      const user = auth.currentUser;
      const { doc: fsDoc, setDoc: fsSetDoc, collection: fsColl } = await import('firebase/firestore');

      // Generate PG code
      const letters = newPgName.replace(/\s+/g,'').toUpperCase().slice(0,3).padEnd(3,'X');
      const digits  = Math.floor(100 + Math.random() * 900);
      const code    = `${letters}${digits}`;

      const pgRef = fsDoc(fsColl(db, 'pgOwners', user.uid, 'pgs'));
      const newPg = {
        pgId: pgRef.id,
        pgName: newPgName.trim(),
        city:   newPgCity.trim(),
        state:  newPgState.trim(),
        pgCode: code,
        plan:   selectedPg?.plan || 'trial',
        isActive: true,
        createdAt: new Date(),
      };
      await fsSetDoc(pgRef, newPg);

      const updated = [...pgs, { id: pgRef.id, ...newPg }];
      setPgs(updated);
      setSelectedPgId(pgRef.id);
      setShowAddPg(false);
      setNewPgName(''); setNewPgCity(''); setNewPgState('');
    } catch (e) { console.error(e); }
    setAddingPg(false);
  };

  const menuItems = [
    {icon:'🗂️',label:'Overview'},
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
    {icon:'👥', label:'Tenants', value: statsLoading ? '…' : dashStats.totalTenants,                            color:'#4f46e5', menu:'Tenants'},
    {icon:'🛏️', label:'Vacant',  value: statsLoading ? '…' : dashStats.vacantBeds,                             color:'#059669', menu:'Rooms'},
    {icon:'💰', label:'Revenue', value: statsLoading ? '…' : `₹${(dashStats.monthlyRevenue/1000).toFixed(1)}k`,color:'#d97706', menu:'Rent'},
    {icon:'⏳', label:'Pending', value: statsLoading ? '…' : dashStats.pendingRents,                           color:'#dc2626', menu:'Rent'},
  ];

  const quickActions = [
    {icon:'➕', label:'Add Tenant',     menu:'Tenants',     accent:'#4f46e5'},
    {icon:'🛏️', label:'Add Room',       menu:'Rooms',       accent:'#059669'},
    {icon:'💰', label:'Record Payment', menu:'Rent',        accent:'#d97706'},
    {icon:'⚡', label:'Electricity',    menu:'Electricity', accent:'#dc2626'},
  ];

  const knownPages = ['Overview','Dashboard','Rooms','Tenants','Rent','Electricity','Reports','Settings'];

  const PgSwitcherSelect = ({ className }) => (
    <select
      className={className}
      value={selectedPgId || ''}
      onChange={e => {
        const next = e.target.value;
        if (next === ALL_PGS_ID) setActiveMenu('Dashboard');
        setSelectedPgId(next);
      }}
    >
      <option value={ALL_PGS_ID}>All PGs (Overview)</option>
      {pgs.map(pg => (
        <option key={pg.id} value={pg.id}>{pg.pgName} — {pg.city}</option>
      ))}
    </select>
  );

  return (
    <>
      <style>{css}</style>
      <div className="db-root">

        {/* ── Mobile Header ── */}
        <div className="db-mobile-header">
          <button className="db-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <div style={{textAlign:'center'}}>
            <div className="db-mobile-logo">🏠 PGpilots</div>
            <div className="db-mobile-pg-name">{isAllSelected ? 'All PGs' : (selectedPg?.pgName || '')}</div>
          </div>
          <div className="db-plan-badge">⭐ {isAllSelected ? 'All' : (selectedPg?.plan ? selectedPg.plan.charAt(0).toUpperCase() + selectedPg.plan.slice(1) : 'Trial')}</div>
        </div>

        {/* ── Overlay ── */}
        <div className={`db-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <div className={`db-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="db-sidebar-top">
            <div className="db-sidebar-logo">🏠 PGpilots</div>
            {pgOwner && (
              <div className="db-owner-box">
                <div className="db-owner-avatar">
                  {(pgOwner.ownerName || pgOwner.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="db-owner-name">{pgOwner.ownerName || pgOwner.name}</div>
                  <div className="db-owner-pg">{isAllSelected ? 'All PGs' : (selectedPg?.pgName || pgOwner.pgName)}</div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Multi-PG switcher in sidebar */}
          {pgs.length > 0 && (
            <div className="db-pg-switcher">
              <div className="db-pg-switcher-label">🏠 Active PG</div>
              <PgSwitcherSelect className="db-pg-select" />
            </div>
          )}
          <div style={{padding:'8px 20px 0'}}>
            <button className="db-pg-add-btn" onClick={() => { setShowAddPg(true); setSidebarOpen(false); }}>
              ＋ Add New PG
            </button>
          </div>

          <nav className="db-nav">
            {menuItems.map(({ icon, label }) => (
              <div key={label}
                className={`db-nav-item${activeMenu === label ? ' active' : ''}`}
                onClick={() => handleMenu(label)}>
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
                {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              {/* Desktop PG switcher */}
              {pgs.length > 1 && (
                <select
                  value={selectedPgId || ''}
                  onChange={e => {
                    const next = e.target.value;
                    if (next === ALL_PGS_ID) setActiveMenu('Dashboard');
                    setSelectedPgId(next);
                  }}
                  style={{
                    padding:'8px 14px', borderRadius:'10px',
                    border:'1.5px solid #e2e8f0', fontSize:'13px',
                    fontWeight:'700', color:'#1e293b', background:'white',
                    cursor:'pointer', outline:'none', fontFamily:'inherit',
                  }}
                >
                  <option value={ALL_PGS_ID}>All PGs (Overview)</option>
                  {pgs.map(pg => (
                    <option key={pg.id} value={pg.id}>{pg.pgName} — {pg.city}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowAddPg(true)}
                style={{
                  padding:'8px 16px', borderRadius:'10px',
                  background:'#e94560', color:'white', border:'none',
                  fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit',
                }}
              >
                ＋ Add PG
              </button>
              <div className="db-desktop-badge">
                ⭐ {isAllSelected ? 'All' : (selectedPg?.plan ? selectedPg.plan.charAt(0).toUpperCase() + selectedPg.plan.slice(1) : 'Trial')} Plan
              </div>
            </div>
          </div>

          <div className="db-page-content">

            {/* ── Routed pages ── */}
            {activeMenu === 'Rooms'       && <Rooms       pgId={selectedPgId} />}
            {activeMenu === 'Tenants'     && <Tenants     pgId={selectedPgId} />}
            {activeMenu === 'Rent'        && <RentPage    pgId={selectedPgId} />}
            {activeMenu === 'Electricity' && <ElectricityPage pgId={selectedPgId} />}
            {activeMenu === 'Reports'     && <ReportsPage pgId={selectedPgId} />}
            {activeMenu === 'Settings'    && <SettingsPage pgId={selectedPgId} />}

            {/* ── Overview (All PGs) ── */}
            {activeMenu === 'Overview' && (
              <div className="db-dash-content">
                <div className="db-section-title">All PGs</div>
                {pgs.length > 0 ? (
                  <div className="db-overview-grid">
                    {pgs.map(pg => (
                      <div key={pg.id} className="db-overview-card">
                        <div className="db-overview-head">
                          <div>
                            <div className="db-overview-title">{pg.pgName || 'Untitled PG'}</div>
                            <div className="db-overview-sub">
                              {[pg.city, pg.state].filter(Boolean).join(', ') || 'Location not set'}
                            </div>
                          </div>
                          <div className="db-overview-pill">
                            {pg.plan ? pg.plan.charAt(0).toUpperCase() + pg.plan.slice(1) : 'Trial'}
                          </div>
                        </div>
                        <div className="db-overview-meta">
                          <div className="db-overview-meta-item">
                            <div className="db-overview-meta-label">PG Code</div>
                            <div className="db-overview-meta-value">{pg.pgCode || '—'}</div>
                          </div>
                          <div className="db-overview-meta-item">
                            <div className="db-overview-meta-label">Status</div>
                            <div className="db-overview-meta-value">{pg.isActive === false ? 'Inactive' : 'Active'}</div>
                          </div>
                        </div>
                        <div className="db-overview-actions">
                          <button className="db-overview-btn ghost" onClick={() => setSelectedPgId(pg.id)}>
                            Set Active
                          </button>
                          <button className="db-overview-btn primary" onClick={() => openPgDashboard(pg.id)}>
                            Open Dashboard
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="db-overview-empty">
                    <div style={{ fontSize:'40px', marginBottom:'10px' }}>🏠</div>
                    <p style={{ fontSize:'15px', fontWeight:'700', color:'#1e293b', margin:'0 0 4px' }}>No PGs yet</p>
                    <p style={{ fontSize:'13px', color:'#94a3b8', margin:0 }}>Add your first PG to get started</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Dashboard Home ── */}
            {activeMenu === 'Dashboard' && (
              <>
                {/* Mobile hero */}
                <div className="db-dash-topbar">
                  <div className="db-dash-greeting">
                    👋 {pgOwner ? `Hey, ${(pgOwner.ownerName || pgOwner.name || '').split(' ')[0]}!` : 'Welcome back!'}
                  </div>
                  <div className="db-dash-sub">
                    {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
                  </div>
                  {/* ✅ Mobile PG switcher */}
                  <div className="db-mobile-pg-pill">
                    <PgSwitcherSelect className="" />
                    <button className="db-mobile-pg-pill-add" onClick={() => setShowAddPg(true)}>＋ PG</button>
                  </div>
                </div>

                <div className="db-dash-content">
                  {/* Stats */}
                  <div className="db-stats-strip">
                    {statTiles.map(({ icon, label, value, color, menu }) => (
                      <div key={label} className="db-stat-tile" onClick={() => handleMenu(menu)}>
                        <div className="db-stat-icon">{icon}</div>
                        <div className="db-stat-value" style={{ color }}>{value}</div>
                        <div className="db-stat-label">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: '20px' }} />

                  {/* Quick actions */}
                  <div className="db-section-title">Quick Actions</div>
                  <div className="db-quick-grid">
                    {quickActions.map(({ icon, label, menu, accent }) => (
                      <button key={label} className="db-quick-btn" onClick={() => handleMenu(menu)}>
                        <div className="db-quick-icon">{icon}</div>
                        <div className="db-quick-label" style={{ color: accent }}>{label}</div>
                      </button>
                    ))}
                  </div>

                  {/* ✅ Pending payments */}
                  {pendingList.length > 0 && (
                    <>
                      <div className="db-section-title">Pending Payments</div>
                      <div className="db-pending-card">
                        <div className="db-pending-header">
                          <div className="db-pending-title">⏳ Rent Due</div>
                          <div className="db-pending-count">{pendingList.length} tenants</div>
                        </div>
                        {pendingList.map((p, i) => (
                          <div key={i} className="db-pending-row">
                            <div className="db-pending-avatar">{p.initial}</div>
                            <div>
                              <div className="db-pending-name">{p.name}</div>
                              <div className="db-pending-room">Room {p.room}</div>
                            </div>
                            <div className="db-pending-amt">₹{p.due.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ✅ Recent activity */}
                  <div className="db-section-title">Recent Activity</div>
                  {recentActivity.length > 0 ? (
                    <div className="db-activity-card">
                      <div className="db-activity-header">Latest Updates</div>
                      {recentActivity.map((a, i) => (
                        <div key={i} className="db-activity-row">
                          <div className="db-activity-dot" style={{ background: a.bg }}>{a.icon}</div>
                          <div>
                            <div className="db-activity-text">{a.text}</div>
                            <div className="db-activity-time">{a.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-activity-empty">
                      <div style={{ fontSize:'40px', marginBottom:'10px' }}>📋</div>
                      <p style={{ fontSize:'15px', fontWeight:'700', color:'#1e293b', margin:'0 0 4px' }}>No activity yet</p>
                      <p style={{ fontSize:'13px', color:'#94a3b8', margin:0 }}>Start by adding rooms and tenants</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Coming soon */}
            {!knownPages.includes(activeMenu) && (
              <div style={{ padding:'20px 16px' }}>
                <div style={{ background:'white', borderRadius:'18px', padding:'60px 20px', textAlign:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize:'48px', marginBottom:'14px' }}>🚧</div>
                  <div style={{ fontSize:'17px', fontWeight:'700', color:'#1e293b', marginBottom:'6px' }}>{activeMenu}</div>
                  <div style={{ fontSize:'13px', color:'#94a3b8' }}>This feature is coming soon!</div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <div className="db-bottom-nav">
          {menuItems.slice(0, 4).map(({ icon, label }) => (
            <button key={label}
              className={`db-bottom-btn${activeMenu === label ? ' active' : ''}`}
              onClick={() => handleMenu(label)}>
              <span className="db-bottom-icon">{icon}</span>
              <span className="db-bottom-label">{label}</span>
            </button>
          ))}
          <button
            className={`db-bottom-btn${sidebarOpen ? ' active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="db-bottom-icon">⋯</span>
            <span className="db-bottom-label">More</span>
          </button>
        </div>

        {/* ── Add PG Modal ── */}
        {showAddPg && (
          <div className="db-modal-bg" onClick={() => setShowAddPg(false)}>
            <div className="db-modal" onClick={e => e.stopPropagation()}>
              <div className="db-modal-title">🏠 Add New PG</div>
              <div className="db-modal-sub">This will appear in your PG switcher</div>
              <div className="db-modal-field">
                <label className="db-modal-label">PG / Hostel Name *</label>
                <input className="db-modal-input" placeholder="Sunrise PG"
                  value={newPgName} onChange={e => setNewPgName(e.target.value)} />
              </div>
              <div className="db-modal-field">
                <label className="db-modal-label">City *</label>
                <input className="db-modal-input" placeholder="Chennai"
                  value={newPgCity} onChange={e => setNewPgCity(e.target.value)} />
              </div>
              <div className="db-modal-field">
                <label className="db-modal-label">State</label>
                <input className="db-modal-input" placeholder="Tamil Nadu"
                  value={newPgState} onChange={e => setNewPgState(e.target.value)} />
              </div>
              <div className="db-modal-row">
                <button className="db-modal-cancel" onClick={() => setShowAddPg(false)}>Cancel</button>
                <button className="db-modal-btn" onClick={handleAddPg} disabled={addingPg}>
                  {addingPg ? 'Adding…' : 'Add PG →'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
