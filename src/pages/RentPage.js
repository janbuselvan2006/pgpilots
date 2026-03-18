import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .rent-root {
    font-family: 'DM Sans', sans-serif;
    background: #f0f2f8;
    min-height: 100vh;
  }

  /* ── Top bar ── */
  .rent-topbar {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    padding: 20px 20px 28px;
    position: relative;
    overflow: hidden;
  }
  .rent-topbar::after {
    content: '';
    position: absolute;
    width: 220px; height: 220px;
    border-radius: 50%;
    background: rgba(233,69,96,0.12);
    top: -70px; right: -50px;
    pointer-events: none;
  }
  .rent-topbar-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative; z-index: 1;
  }
  .rent-page-title {
    font-size: 22px; font-weight: 800;
    color: #fff; margin: 0 0 3px;
  }
  .rent-page-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }
  .rent-penalty-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    padding: 7px 14px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    position: relative; z-index: 1;
  }
  .rent-penalty-pill-label {
    font-size: 12px; font-weight: 700;
    color: rgba(255,255,255,0.8);
  }
  .rp-toggle {
    width: 36px; height: 20px;
    border-radius: 99px;
    position: relative;
    transition: background 0.3s;
    flex-shrink: 0;
  }
  .rp-knob {
    position: absolute;
    top: 2px;
    width: 16px; height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* ── Stats strip ── */
  .rent-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin: -14px 16px 0;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    position: relative; z-index: 2;
  }
  .rent-stat {
    padding: 12px 6px;
    text-align: center;
    border-right: 1px solid #f1f5f9;
  }
  .rent-stat:last-child { border-right: none; }
  .rent-stat-icon { font-size: 16px; margin-bottom: 2px; }
  .rent-stat-num { font-size: 13px; font-weight: 800; line-height: 1.1; }
  .rent-stat-label {
    font-size: 8px; color: #94a3b8;
    font-weight: 600; margin-top: 2px;
    text-transform: uppercase; letter-spacing: 0.3px;
  }

  /* ── Content ── */
  .rent-content { padding: 20px 16px 100px; }

  /* ── Tabs ── */
  .rent-tabs {
    display: flex;
    background: white;
    border-radius: 14px;
    padding: 4px;
    gap: 4px;
    margin-bottom: 18px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .rent-tab {
    flex: 1;
    padding: 10px 8px;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    background: transparent;
    color: #94a3b8;
    font-family: inherit;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .rent-tab.active {
    background: linear-gradient(135deg, #e94560, #0f3460);
    color: white;
  }

  /* ── Section header ── */
  .rent-section-title {
    font-size: 13px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin: 0 0 10px;
    display: flex; align-items: center; gap: 6px;
  }
  .rent-section-count {
    background: currentColor;
    color: white;
    width: 20px; height: 20px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center; justify-content: center;
    font-size: 11px;
    opacity: 0.9;
  }
  .rent-section-wrap { margin-bottom: 20px; }

  /* ── Tenant rent card ── */
  .trc {
    background: white;
    border-radius: 16px;
    margin-bottom: 10px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .trc-accent {
    height: 4px;
  }
  .trc-body { padding: 14px; }
  .trc-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .trc-left { display: flex; align-items: center; gap: 10px; }
  .trc-avatar {
    width: 42px; height: 42px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 18px;
    flex-shrink: 0;
  }
  .trc-name { font-size: 15px; font-weight: 800; color: #1e293b; }
  .trc-sub { font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 2px; }
  .trc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .trc-status-badge {
    font-size: 11px; font-weight: 700;
    padding: 4px 10px; border-radius: 20px;
    white-space: nowrap;
  }
  .trc-amount { font-size: 18px; font-weight: 800; color: #1e293b; }
  .trc-amount-sub { font-size: 10px; color: #94a3b8; font-weight: 500; }

  /* Info pills row */
  .trc-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }
  .trc-pill {
    font-size: 11px; font-weight: 600;
    padding: 3px 9px; border-radius: 20px;
    background: #f1f5f9; color: #475569;
  }
  .trc-pill.warning { background: #fffbeb; color: #d97706; }
  .trc-pill.danger  { background: #fef2f2; color: #dc2626; }
  .trc-pill.info    { background: #ecfeff; color: #0891b2; }
  .trc-pill.success { background: #ecfdf5; color: #059669; }

  /* Breakdown bar */
  .trc-breakdown {
    background: #f8fafc;
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
  }
  .trc-bd-item { font-size: 11px; color: #64748b; font-weight: 500; }
  .trc-bd-item span { font-weight: 700; color: #1e293b; }

  /* Collect button */
  .trc-collect-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 12px;
    font-size: 14px; font-weight: 700;
    color: white;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s, transform 0.1s;
  }
  .trc-collect-btn:active { transform: scale(0.98); opacity: 0.9; }

  /* ── History filters ── */
  .rent-filter-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    margin-bottom: 10px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .rent-filter-scroll::-webkit-scrollbar { display: none; }
  .rent-filter-label {
    font-size: 10px; font-weight: 800;
    color: #94a3b8; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 6px;
  }
  .rent-filter-chip {
    white-space: nowrap;
    padding: 7px 14px;
    border-radius: 20px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 12px; font-weight: 600;
    color: #64748b;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .rent-filter-chip.active {
    background: #1a1a2e;
    color: white;
    border-color: #1a1a2e;
  }
  .rent-search {
    width: 100%;
    padding: 13px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px; font-family: inherit;
    background: white;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 12px;
    -webkit-appearance: none;
    transition: border-color 0.2s;
  }
  .rent-search:focus { border-color: #e94560; }

  .rent-result-count {
    font-size: 12px; color: #94a3b8;
    margin-bottom: 12px; font-weight: 500;
  }

  /* ── History payment cards (mobile-first) ── */
  .hc {
    background: white; border-radius: 16px;
    padding: 14px; margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .hc-top {
    display: flex; justify-content: space-between;
    align-items: flex-start; margin-bottom: 10px;
  }
  .hc-left { display: flex; align-items: center; gap: 10px; }
  .hc-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 16px; flex-shrink: 0;
  }
  .hc-name { font-size: 14px; font-weight: 800; color: #1e293b; }
  .hc-sub  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .hc-right { text-align: right; flex-shrink: 0; }
  .hc-amount { font-size: 18px; font-weight: 800; }
  .hc-method {
    font-size: 10px; font-weight: 700;
    padding: 3px 8px; border-radius: 20px;
    background: #eef2ff; color: #4f46e5;
    display: inline-block; margin-top: 3px;
  }
  .hc-tags {
    display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px;
  }
  .hc-tag {
    font-size: 10px; font-weight: 700;
    padding: 3px 8px; border-radius: 20px;
  }
  .hc-breakdown {
    font-size: 11px; color: #94a3b8;
    padding: 8px 10px; background: #f8fafc;
    border-radius: 8px; line-height: 1.6;
  }
  .hc-date { font-size: 11px; color: #b0bec5; margin-top: 5px; }
  .hc-notes { font-size: 11px; color: #94a3b8; margin-top: 4px; font-style: italic; }

  /* ── History card ── */
  .hc {
    background: white;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 10px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.05);
  }
  .hc-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .hc-left { display: flex; align-items: center; gap: 10px; }
  .hc-avatar {
    width: 38px; height: 38px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 15px;
    flex-shrink: 0;
  }
  .hc-name { font-size: 14px; font-weight: 700; color: #1e293b; }
  .hc-sub  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .hc-right { text-align: right; }
  .hc-amount { font-size: 17px; font-weight: 800; }
  .hc-method {
    font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 20px;
    background: #eef2ff; color: #4f46e5;
    display: inline-block; margin-top: 3px;
  }
  .hc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .hc-tag {
    font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 20px;
  }
  .hc-breakdown {
    font-size: 11px; color: #94a3b8;
    padding: 8px 10px;
    background: #f8fafc;
    border-radius: 8px;
  }
  .hc-date { font-size: 11px; color: #94a3b8; margin-top: 4px; }

  /* ── Empty / Loading ── */
  .rent-empty {
    text-align: center; padding: 50px 20px;
    background: white; border-radius: 18px;
  }
  .rent-empty-icon { font-size: 48px; margin-bottom: 12px; }
  .rent-empty-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
  .rent-empty-sub { font-size: 13px; color: #94a3b8; margin: 0; }
  .rent-loading { text-align: center; padding: 50px; color: #94a3b8; }
  .rent-spinner {
    width: 30px; height: 30px;
    border: 3px solid #e2e8f0;
    border-top-color: #e94560;
    border-radius: 50%;
    animation: rspin 0.7s linear infinite;
    margin: 0 auto 12px;
  }
  @keyframes rspin { to { transform: rotate(360deg); } }

  /* ── Bottom sheet overlay ── */
  .bso {
    position: fixed; inset: 0;
    background: rgba(15,20,40,0.55);
    z-index: 100;
    backdrop-filter: blur(2px);
    animation: bsFadeIn 0.2s ease;
  }
  @keyframes bsFadeIn { from { opacity: 0; } to { opacity: 1; } }

  .bs {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: white;
    border-radius: 24px 24px 0 0;
    z-index: 101;
    max-height: 94dvh;
    overflow-y: auto;
    animation: bsSlideUp 0.3s cubic-bezier(0.32,0.72,0,1);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
  }
  @keyframes bsSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @media (min-width: 640px) {
    .bs {
      left: 50%; right: auto;
      width: 540px;
      border-radius: 24px;
      bottom: 50%;
      transform: translate(-50%, 50%);
      animation: bsZoomIn 0.25s cubic-bezier(0.32,0.72,0,1);
      max-height: 90vh;
    }
    @keyframes bsZoomIn {
      from { opacity: 0; transform: translate(-50%, 50%) scale(0.95); }
      to   { opacity: 1; transform: translate(-50%, 50%) scale(1); }
    }
  }
  .bs-handle {
    width: 40px; height: 4px;
    background: #e2e8f0; border-radius: 99px;
    margin: 12px auto 0;
  }
  .bs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px 8px;
  }
  .bs-title { font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0; }
  .bs-close {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: #f1f5f9; border: none;
    font-size: 14px; color: #64748b;
    cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .bs-body { padding: 12px 20px 96px; }

  /* Payment sheet */
  .pay-tenant-box {
    display: flex; align-items: center; gap: 12px;
    background: #f8fafc; border-radius: 14px;
    padding: 14px; margin-bottom: 16px;
  }
  .pay-ta {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 18px;
    flex-shrink: 0;
    background: linear-gradient(135deg, #4f46e5, #0891b2);
  }
  .pay-tname { font-size: 15px; font-weight: 800; color: #1e293b; }
  .pay-tsub { font-size: 12px; color: #94a3b8; }
  .pay-tpartial { font-size: 12px; color: #d97706; font-weight: 600; margin-top: 2px; }

  .pay-breakdown {
    background: #f8fafc;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 14px;
    border: 1px solid #e2e8f0;
  }
  .pay-bd-row {
    display: flex; justify-content: space-between;
    font-size: 13px; color: #475569;
    margin-bottom: 8px;
  }
  .pay-bd-total {
    border-top: 1px solid #e2e8f0;
    padding-top: 8px; margin-top: 4px;
    font-weight: 800; color: #1e293b;
    font-size: 15px;
  }
  .pay-partial-warn {
    background: #fffbeb; border: 1px solid #fde68a;
    border-radius: 12px; padding: 11px 14px;
    font-size: 13px; color: #d97706; font-weight: 600;
    margin-bottom: 14px;
  }

  /* Form fields */
  .pf-field { margin-bottom: 14px; }
  .pf-label {
    display: block; font-size: 11px; font-weight: 700;
    color: #64748b; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 6px;
  }
  .pf-input {
    width: 100%;
    padding: 13px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
    transition: border-color 0.2s;
  }
  .pf-input:focus { border-color: #e94560; background: white; }
  .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pf-seg { display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; gap: 3px; }
  .pf-seg-btn {
    flex: 1; padding: 9px 4px;
    border: none; border-radius: 8px;
    font-size: 12px; font-weight: 700;
    cursor: pointer; background: transparent;
    color: #94a3b8; font-family: inherit;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .pf-seg-btn.active { background: white; color: #e94560; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

  .pf-save-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #e94560, #0f3460);
    color: white; border: none;
    border-radius: 14px; font-size: 15px;
    font-weight: 700; font-family: inherit;
    cursor: pointer; margin-top: 6px;
    box-shadow: 0 4px 14px rgba(233,69,96,0.3);
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s, transform 0.1s;
  }
  .pf-save-btn:active { transform: scale(0.98); opacity: 0.9; }
  .pf-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Penalty sheet */
  .pen-toggle-row {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 20px;
    padding: 14px;
    background: #f8fafc; border-radius: 14px;
  }
  .pen-toggle-label { font-size: 15px; font-weight: 700; color: #1e293b; }
  .pen-toggle-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .pen-toggle {
    width: 48px; height: 26px;
    border-radius: 99px;
    position: relative; cursor: pointer;
    transition: background 0.3s; flex-shrink: 0;
  }
  .pen-knob {
    position: absolute; top: 3px;
    width: 20px; height: 20px;
    background: white; border-radius: 50%;
    transition: transform 0.3s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .pen-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
  .pen-preview {
    background: #fff5f5; border: 1px solid #fecaca;
    border-radius: 14px; padding: 14px;
    font-size: 13px; color: #475569;
    line-height: 1.8; margin-bottom: 16px;
  }
  .pen-preview-title { font-size: 12px; font-weight: 800; color: #dc2626; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .pen-save-btn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #e94560, #0f3460);
    color: white; border: none; border-radius: 14px;
    font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  @media (min-width: 640px) {
    .rent-stats { margin: -14px 24px 0; }
    .rent-content { padding: 24px 24px 40px; }
  }
`;

export default function RentPage() {
  const [tenants, setTenants]     = useState([]);
  const [payments, setPayments]   = useState([]);
  const [elecBills, setElecBills] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentSheet, setShowPaymentSheet]   = useState(false);
  const [showPenaltySheet, setShowPenaltySheet]   = useState(false);
  const [selectedTenant, setSelectedTenant]       = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth]   = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyAmount, setPenaltyAmount]   = useState('');
  const [gracePeriod, setGracePeriod]       = useState('');

  const [form, setForm] = useState({
    amount: '', paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0], notes: '',
  });

  const user     = auth.currentUser;
  const today    = new Date(); today.setHours(0,0,0,0);
  const thisMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const thisYear  = new Date().getFullYear().toString();

  const fetchData = async () => {
    setLoading(true);
    try {
      const tSnap = await getDocs(query(collection(db,'tenants'), where('ownerId','==',user.uid)));
      setTenants(tSnap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.status!=='deleted'));
      const pSnap = await getDocs(query(collection(db,'payments'), where('ownerId','==',user.uid)));
      setPayments(pSnap.docs.map(d=>({id:d.id,...d.data()})));
      const eSnap = await getDocs(query(collection(db,'electricityBills'),
        where('ownerId','==',user.uid), where('month','==',thisMonth), where('year','==',thisYear)));
      setElecBills(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      const ownerDoc = await getDoc(doc(db,'pgOwners',user.uid));
      if (ownerDoc.exists()) {
        const d = ownerDoc.data();
        setPenaltyEnabled(d.penaltyEnabled === true);
        if (d.penaltyAmount !== undefined) setPenaltyAmount(d.penaltyAmount.toString());
        if (d.gracePeriod  !== undefined) setGracePeriod(d.gracePeriod.toString());
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getElecShare = (t) => {
    const b = elecBills.find(b=>b.roomNumber===t.roomNumber);
    if (!b) return 0;
    return Math.round((b.amount||0)/(b.tenantCount||1));
  };
  const hasElecBill = (t) => elecBills.some(b=>b.roomNumber===t.roomNumber);

  const getDueDate = (t) => {
    if (!t.checkIn) return null;
    const d = new Date(t.checkIn);
    return new Date(today.getFullYear(), today.getMonth(), d.getDate());
  };
  const getDaysDiff = (t) => {
    const due = getDueDate(t);
    if (!due) return 999;
    return Math.floor((due-today)/(1000*60*60*24));
  };

  const getPenaltyForDate = (t, payDate) => {
    if (!penaltyEnabled || !t.checkIn) return 0;
    const dueDay = new Date(t.checkIn).getDate();
    const pd = new Date(payDate);
    const due = new Date(pd.getFullYear(), pd.getMonth(), dueDay);
    const diff = Math.floor((pd-due)/(1000*60*60*24));
    if (diff <= 0) return 0; // paid on or before due date → no penalty
    return Math.max(0, diff-(parseInt(gracePeriod)||0)) * (parseInt(penaltyAmount)||0);
  };

  // ── FIX: Check if tenant already paid this month (any payment recorded)
  // If they have a completed payment this month, DON'T add penalty on top
  // Penalty is only charged based on WHEN they paid (payment date vs due date)
  // If already paid, use the penalty that was recorded AT TIME of payment
  const getThisMonthCompletedPenalty = (tid) => {
    // Find completed payment this month and return the penalty that was recorded
    const completedPmt = payments.find(p => {
      const pd = new Date(p.paymentDate);
      return p.tenantId===tid &&
        pd.getMonth()===today.getMonth() &&
        pd.getFullYear()===today.getFullYear() &&
        p.isCompleted===true;
    });
    return completedPmt ? (completedPmt.penaltyAmount || 0) : null;
    // Returns null = not yet paid, number = already paid (use recorded penalty)
  };

  const getPenaltyDisplay = (t) => {
    if (!penaltyEnabled) return 0;

    // If tenant already completed payment this month → use RECORDED penalty from payment
    // (could be ₹0 if they paid on time — never recalculate from today)
    const completedPenalty = getThisMonthCompletedPenalty(t.id);
    if (completedPenalty !== null) return completedPenalty;

    // Not paid yet → only show penalty if actually overdue TODAY
    const d = getDaysDiff(t);
    if (d >= 0) return 0; // due today or future → no penalty
    return Math.max(0, Math.abs(d)-(parseInt(gracePeriod)||0)) * (parseInt(penaltyAmount)||0);
  };

  // Penalty is only relevant to SHOW on card if tenant is overdue (not paid, past due date)
  // On-time payers or future-due tenants → never show penalty pill
  const shouldShowPenaltyOnCard = (t) => {
    if (!penaltyEnabled) return false;
    if (isPaid(t)) {
      // Only show if their recorded payment actually had penalty
      const rec = getThisMonthCompletedPenalty(t.id);
      return rec !== null && rec > 0;
    }
    // Unpaid → show only if overdue
    return getDaysDiff(t) < 0;
  };

  const getThisMonthPaid = (tid) => payments.filter(p=>{
    const pd = new Date(p.paymentDate);
    return p.tenantId===tid && pd.getMonth()===today.getMonth() && pd.getFullYear()===today.getFullYear();
  }).reduce((a,p)=>a+(p.amount||0),0);

  const getTotalDue = (t) => (t.monthlyRent||0) + getElecShare(t) + getPenaltyDisplay(t);
  const getBalance  = (t) => Math.max(0, getTotalDue(t) - getThisMonthPaid(t.id));
  const isPaid      = (t) => getBalance(t) === 0;
  const isPartial   = (t) => { const p=getThisMonthPaid(t.id); return p>0 && p<getTotalDue(t); };

  const unpaid = tenants.filter(t=>!isPaid(t));
  const lateTenants     = unpaid.filter(t=>getDaysDiff(t)<0).sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn));
  const todayTenants    = unpaid.filter(t=>getDaysDiff(t)===0);
  const upcomingTenants = unpaid.filter(t=>getDaysDiff(t)>0).sort((a,b)=>getDaysDiff(a)-getDaysDiff(b));
  const paidTenants     = tenants.filter(t=>isPaid(t));

  const totalExpected  = tenants.reduce((a,t)=>a+getTotalDue(t),0); // rent + elec + penalty(if overdue)
  const totalCollected = tenants.reduce((a,t)=>a+getThisMonthPaid(t.id),0);
  const totalPending   = Math.max(0, totalExpected-totalCollected);

  const handleRecordPayment = (t) => {
    setSelectedTenant(t);
    setForm({ amount: getBalance(t).toString(), paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0], notes: '' });
    setShowPaymentSheet(true);
  };

  const livePenalty  = selectedTenant ? getPenaltyForDate(selectedTenant, form.paymentDate) : 0;
  const liveElec     = selectedTenant ? getElecShare(selectedTenant) : 0;
  const liveTotalDue = selectedTenant
    ? Math.max(0, (selectedTenant.monthlyRent||0)+liveElec+livePenalty - getThisMonthPaid(selectedTenant.id))
    : 0;

  const handleSavePayment = async () => {
    const amt = parseInt(form.amount);
    if (!amt || amt<=0) return alert('Enter a valid amount!');
    if (amt > liveTotalDue) return alert(`Amount cannot exceed ₹${liveTotalDue.toLocaleString()}`);
    const prevPaid = getThisMonthPaid(selectedTenant.id);
    const newTotal = prevPaid + amt;
    const fullAmt  = (selectedTenant.monthlyRent||0)+liveElec+livePenalty;
    setSaving(true);
    try {
      await addDoc(collection(db,'payments'), {
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        roomNumber: selectedTenant.roomNumber,
        amount: amt,
        rentAmount: selectedTenant.monthlyRent||0,
        electricityShare: liveElec,
        penaltyAmount: livePenalty,
        fullAmount: fullAmt,
        previouslyPaid: prevPaid,
        newTotal,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        paymentTime: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
        recordedAt: new Date().toISOString(),
        month: new Date(form.paymentDate).toLocaleString('en-US',{month:'long'}),
        year: new Date(form.paymentDate).getFullYear().toString(),
        notes: form.notes,
        isPartial: amt < liveTotalDue,
        isCompleted: newTotal >= fullAmt,
        type: 'Rent', ownerId: user.uid, createdAt: new Date(),
      });
      setShowPaymentSheet(false);
      setSelectedTenant(null);
      fetchData();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const savePenaltySettings = async () => {
    try {
      await updateDoc(doc(db,'pgOwners',user.uid), {
        penaltyEnabled,
        penaltyAmount: parseInt(penaltyAmount)||0,
        gracePeriod: parseInt(gracePeriod)||0,
      });
      setShowPenaltySheet(false);
      fetchData();
    } catch(e) { console.error(e); }
  };

  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  const filteredPayments = payments.filter(p=>{
    const ms  = !search      || p.tenantName?.toLowerCase().includes(search.toLowerCase()) || p.roomNumber?.includes(search);
    const mm  = !filterMonth || p.month === filterMonth;
    const mmt = !filterMethod|| p.paymentMethod === filterMethod;
    return ms && mm && mmt;
  }).sort((a,b)=>{
    const at = a.recordedAt ? new Date(a.recordedAt) : new Date(a.paymentDate);
    const bt = b.recordedAt ? new Date(b.recordedAt) : new Date(b.paymentDate);
    return bt - at;
  });

  // ── Tenant Card Component ──
  const TenantCard = ({ tenant, status }) => {
    const daysDiff  = getDaysDiff(tenant);
    const balance   = getBalance(tenant);
    const paid      = getThisMonthPaid(tenant.id);
    const partial   = isPartial(tenant);
    const penalty   = getPenaltyDisplay(tenant);
    const elec      = getElecShare(tenant);
    const showPenalty = shouldShowPenaltyOnCard(tenant); // ← only show for late/overdue
    const accentColor =
      status==='late'     ? '#dc2626' :
      status==='today'    ? '#d97706' :
      status==='paid'     ? '#059669' : '#4f46e5';
    const avatarBg =
      status==='late'  ? 'linear-gradient(135deg,#dc2626,#9f1239)' :
      status==='today' ? 'linear-gradient(135deg,#d97706,#b45309)' :
      status==='paid'  ? 'linear-gradient(135deg,#059669,#0891b2)' :
                         'linear-gradient(135deg,#4f46e5,#0891b2)';

    return (
      <div className="trc">
        <div className="trc-accent" style={{ background: accentColor }} />
        <div className="trc-body">
          <div className="trc-top">
            <div className="trc-left">
              <div className="trc-avatar" style={{ background: avatarBg }}>
                {tenant.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="trc-name">{tenant.name}</div>
                <div className="trc-sub">Room {tenant.roomNumber} · Bed {tenant.bedNumber||'—'}</div>
              </div>
            </div>
            <div className="trc-right">
              {status==='late'     && <div className="trc-status-badge" style={{background:'#fef2f2',color:'#dc2626'}}>🔴 {Math.abs(daysDiff)}d overdue</div>}
              {status==='today'    && <div className="trc-status-badge" style={{background:'#fffbeb',color:'#d97706'}}>🟡 Due Today</div>}
              {status==='upcoming' && <div className="trc-status-badge" style={{background:'#ecfdf5',color:'#059669'}}>🟢 {daysDiff}d left</div>}
              {status==='paid'     && <div className="trc-status-badge" style={{background:'#ecfdf5',color:'#059669'}}>✅ Paid</div>}
              <div className="trc-amount" style={{ color: accentColor }}>
                ₹{(status==='paid' ? getTotalDue(tenant) : balance).toLocaleString()}
              </div>
              <div className="trc-amount-sub">{status==='paid' ? 'paid' : 'due'}</div>
            </div>
          </div>

          {/* Info pills */}
          <div className="trc-pills">
            <span className="trc-pill">📅 Due {getDueDate(tenant)?.getDate()}th</span>
            {elec > 0 && <span className="trc-pill info">⚡ ₹{elec.toLocaleString()}</span>}
            {!hasElecBill(tenant) && <span className="trc-pill warning">⚠️ No elec bill</span>}
            {showPenalty && penalty > 0 && <span className="trc-pill danger">🔴 Late penalty ₹{penalty.toLocaleString()}</span>}
            {partial && <span className="trc-pill warning">⚠️ Partial ₹{paid.toLocaleString()} paid</span>}
          </div>

          {/* Breakdown */}
          <div className="trc-breakdown">
            <div className="trc-bd-item">Rent <span>₹{(tenant.monthlyRent||0).toLocaleString()}</span></div>
            {elec > 0 && <div className="trc-bd-item">Elec <span>₹{elec.toLocaleString()}</span></div>}
            {showPenalty && penalty > 0 && <div className="trc-bd-item">Late Penalty <span style={{color:'#dc2626'}}>₹{penalty.toLocaleString()}</span></div>}
            <div className="trc-bd-item">Total <span>₹{getTotalDue(tenant).toLocaleString()}</span></div>
          </div>

          {status !== 'paid' && (
            <button className="trc-collect-btn"
              style={{ background: status==='late'
                ? 'linear-gradient(135deg,#dc2626,#9f1239)'
                : status==='today'
                ? 'linear-gradient(135deg,#d97706,#b45309)'
                : 'linear-gradient(135deg,#e94560,#0f3460)' }}
              onClick={() => handleRecordPayment(tenant)}>
              💰 {partial ? 'Collect Balance' : 'Collect Rent'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, color, items, status }) => items.length === 0 ? null : (
    <div className="rent-section-wrap">
      <div className="rent-section-title" style={{ color }}>
        {title}
        <span className="rent-section-count" style={{ background: color }}>
          <span style={{ color: 'white' }}>{items.length}</span>
        </span>
      </div>
      {items.map(t => <TenantCard key={t.id} tenant={t} status={status} />)}
    </div>
  );

  return (
    <>
      <style>{css}</style>
      <div className="rent-root">

        {/* Top bar */}
        <div className="rent-topbar">
          <div className="rent-topbar-row">
            <div>
              <h1 className="rent-page-title">Rent</h1>
              <p className="rent-page-sub">
                {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
              </p>
            </div>
            <div className="rent-penalty-pill" onClick={() => setShowPenaltySheet(true)}>
              <span className="rent-penalty-pill-label">⚡ Penalty</span>
              <div className="rp-toggle" style={{ background: penaltyEnabled ? '#e94560' : 'rgba(255,255,255,0.2)' }}>
                <div className="rp-knob" style={{ transform: penaltyEnabled ? 'translateX(18px)' : 'translateX(2px)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="rent-stats">
          {[
            { label:'Expected', value:`₹${totalExpected.toLocaleString()}`,  color:'#4f46e5', icon:'💰' },
            { label:'Collected', value:`₹${totalCollected.toLocaleString()}`, color:'#059669', icon:'✅' },
            { label:'Pending', value:`₹${totalPending.toLocaleString()}`,     color:'#dc2626', icon:'⏳' },
            { label:'Paid', value:`${paidTenants.length}/${tenants.length}`, color:'#d97706', icon:'👥' },
          ].map(({label,value,color,icon}) => (
            <div key={label} className="rent-stat">
              <div className="rent-stat-icon">{icon}</div>
              <div className="rent-stat-num" style={{ color }}>{value}</div>
              <div className="rent-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="rent-content">

          {/* Tabs */}
          <div className="rent-tabs">
            {[{id:'overview',label:'📊 Overview'},{id:'history',label:'📋 History'}].map(({id,label})=>(
              <button key={id} className={`rent-tab${activeTab===id?' active':''}`}
                onClick={()=>setActiveTab(id)}>{label}</button>
            ))}
          </div>

          {/* Overview */}
          {activeTab==='overview' && (
            loading ? (
              <div className="rent-loading"><div className="rent-spinner"/>Loading…</div>
            ) : tenants.length===0 ? (
              <div className="rent-empty">
                <div className="rent-empty-icon">💰</div>
                <p className="rent-empty-title">No tenants yet</p>
                <p className="rent-empty-sub">Add tenants to start tracking rent</p>
              </div>
            ) : (
              <>
                <Section title="🟡 Due Today" color="#d97706" items={todayTenants} status="today" />
                <Section title="🔴 Overdue" color="#dc2626" items={lateTenants} status="late" />
                <Section title="🟢 Upcoming" color="#4f46e5" items={upcomingTenants} status="upcoming" />
                <Section title="✅ Paid This Month" color="#059669" items={paidTenants} status="paid" />
              </>
            )
          )}

          {/* History */}
          {activeTab==='history' && (
            <div>
              {/* Search */}
              <input className="rent-search" type="text"
                placeholder="🔍 Search by name or room…"
                value={search} onChange={e=>setSearch(e.target.value)} />

              {/* Month filter chips */}
              <div className="rent-filter-label">Month</div>
              <div className="rent-filter-scroll">
                <button className={`rent-filter-chip${!filterMonth?' active':''}`}
                  onClick={()=>setFilterMonth('')}>All</button>
                {months.map(m=>(
                  <button key={m}
                    className={`rent-filter-chip${filterMonth===m?' active':''}`}
                    onClick={()=>setFilterMonth(filterMonth===m?'':m)}>
                    {m.slice(0,3)}
                  </button>
                ))}
              </div>

              {/* Method filter chips */}
              <div className="rent-filter-label">Method</div>
              <div className="rent-filter-scroll">
                <button className={`rent-filter-chip${!filterMethod?' active':''}`}
                  onClick={()=>setFilterMethod('')}>All</button>
                {['Cash','UPI','Bank Transfer','Card'].map(m=>(
                  <button key={m}
                    className={`rent-filter-chip${filterMethod===m?' active':''}`}
                    onClick={()=>setFilterMethod(filterMethod===m?'':m)}>
                    {m}
                  </button>
                ))}
              </div>

              <div className="rent-result-count" style={{marginTop:'10px'}}>
                {filteredPayments.length} payment{filteredPayments.length!==1?'s':''}
                {filteredPayments.filter(p=>p.isPartial&&!p.isCompleted).length>0 &&
                  <span style={{color:'#d97706',fontWeight:'600'}}> · {filteredPayments.filter(p=>p.isPartial&&!p.isCompleted).length} partial</span>}
              </div>

              {filteredPayments.length===0 ? (
                <div className="rent-empty">
                  <div className="rent-empty-icon">📋</div>
                  <p className="rent-empty-title">No payments found</p>
                  <p className="rent-empty-sub">Try clearing filters</p>
                </div>
              ) : (
                filteredPayments.map(p=>(
                  <div key={p.id} className="hc" style={{
                    background:   p.isCompleted ? '#f0fdf4' : p.isPartial ? '#fffbeb' : 'white',
                    borderLeft: `4px solid ${p.isCompleted?'#059669':p.isPartial?'#d97706':'#4f46e5'}`,
                  }}>
                    {/* Top row: avatar + name + amount */}
                    <div className="hc-top">
                      <div className="hc-left">
                        <div className="hc-avatar" style={{
                          background: p.isCompleted
                            ? 'linear-gradient(135deg,#059669,#0891b2)'
                            : p.isPartial
                            ? 'linear-gradient(135deg,#d97706,#b45309)'
                            : 'linear-gradient(135deg,#4f46e5,#0891b2)',
                        }}>
                          {p.tenantName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="hc-name">{p.tenantName}</div>
                          <div className="hc-sub">Room {p.roomNumber} · {p.month} {p.year}</div>
                        </div>
                      </div>
                      <div className="hc-right">
                        <div className="hc-amount" style={{
                          color: p.isCompleted?'#059669': p.isPartial?'#d97706':'#4f46e5'
                        }}>
                          ₹{p.amount?.toLocaleString()}
                        </div>
                        <div className="hc-method">{p.paymentMethod}</div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="hc-tags">
                      {p.isCompleted && <span className="hc-tag" style={{background:'#dcfce7',color:'#059669'}}>✅ Complete</span>}
                      {p.isPartial && !p.isCompleted && <span className="hc-tag" style={{background:'#fffbeb',color:'#d97706'}}>⚠️ Partial</span>}
                      {p.penaltyAmount>0 && <span className="hc-tag" style={{background:'#fef2f2',color:'#dc2626'}}>🔴 Penalty</span>}
                      {p.electricityShare>0 && <span className="hc-tag" style={{background:'#ecfeff',color:'#0891b2'}}>⚡ Elec</span>}
                    </div>

                    {/* Breakdown pill */}
                    <div className="hc-breakdown">
                      🏠 Rent ₹{(p.rentAmount||0).toLocaleString()}
                      {p.electricityShare>0 && <span style={{color:'#0891b2'}}> · ⚡ ₹{p.electricityShare.toLocaleString()}</span>}
                      {p.penaltyAmount>0 && <span style={{color:'#dc2626'}}> · 🔴 ₹{p.penaltyAmount.toLocaleString()}</span>}
                      {p.isPartial && (
                        <span style={{color:'#d97706',display:'block',marginTop:'3px'}}>
                          Paid ₹{p.newTotal?.toLocaleString()} of ₹{p.fullAmount?.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Date + time */}
                    <div className="hc-date">
                      📅 {p.paymentDate}
                      {p.paymentTime && <span> · 🕐 {p.paymentTime}</span>}
                    </div>
                    {p.notes && <div className="hc-notes">📝 {p.notes}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Collect Payment Sheet ── */}
        {showPaymentSheet && selectedTenant && (
          <>
            <div className="bso" onClick={()=>setShowPaymentSheet(false)} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="bs-header">
                <h2 className="bs-title">💰 Collect Rent</h2>
                <button className="bs-close" onClick={()=>setShowPaymentSheet(false)}>✕</button>
              </div>
              <div className="bs-body">

                <div className="pay-tenant-box">
                  <div className="pay-ta">{selectedTenant.name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="pay-tname">{selectedTenant.name}</div>
                    <div className="pay-tsub">Room {selectedTenant.roomNumber} · ₹{selectedTenant.monthlyRent?.toLocaleString()}/mo</div>
                    {isPartial(selectedTenant) && (
                      <div className="pay-tpartial">
                        Already paid ₹{getThisMonthPaid(selectedTenant.id).toLocaleString()} · Balance ₹{liveTotalDue.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pay-breakdown">
                  <div className="pay-bd-row"><span>🏠 Monthly Rent</span><span>₹{(selectedTenant.monthlyRent||0).toLocaleString()}</span></div>
                  <div className="pay-bd-row">
                    <span>⚡ Electricity</span>
                    <span style={{color: liveElec>0?'#d97706':'#94a3b8'}}>
                      {liveElec>0 ? `₹${liveElec.toLocaleString()}` : '⚠️ Not added'}
                    </span>
                  </div>
                  <div className="pay-bd-row">
                    <span>🔴 Penalty</span>
                    <span style={{color: livePenalty>0?'#dc2626':'#94a3b8'}}>
                      {livePenalty>0 ? `₹${livePenalty.toLocaleString()}` : penaltyEnabled?'✅ None':'—'}
                    </span>
                  </div>
                  {getThisMonthPaid(selectedTenant.id)>0 && (
                    <div className="pay-bd-row"><span>Already Paid</span><span style={{color:'#059669'}}>−₹{getThisMonthPaid(selectedTenant.id).toLocaleString()}</span></div>
                  )}
                  <div className="pay-bd-row pay-bd-total"><span>Balance Due</span><span>₹{liveTotalDue.toLocaleString()}</span></div>
                </div>

                {form.amount && parseInt(form.amount)<liveTotalDue && parseInt(form.amount)>0 && (
                  <div className="pay-partial-warn">
                    ⚠️ Partial — remaining after this: ₹{(liveTotalDue-parseInt(form.amount)).toLocaleString()}
                  </div>
                )}

                <div className="pf-field">
                  <label className="pf-label">Amount (₹) — Due: ₹{liveTotalDue.toLocaleString()}</label>
                  <input className="pf-input" type="number" inputMode="numeric"
                    placeholder="Enter amount"
                    value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
                </div>

                <div className="pf-row">
                  <div className="pf-field">
                    <label className="pf-label">Payment Date <span style={{color:'#e94560'}}>*</span></label>
                    <input className="pf-input" type="date" value={form.paymentDate}
                      onChange={e=>{
                        const nd = e.target.value;
                        const np = getPenaltyForDate(selectedTenant,nd);
                        const ne = getElecShare(selectedTenant);
                        const nb = Math.max(0,(selectedTenant.monthlyRent||0)+ne+np-getThisMonthPaid(selectedTenant.id));
                        setForm(prev=>({...prev,paymentDate:nd,amount:nb.toString()}));
                      }} />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Notes</label>
                    <input className="pf-input" type="text" placeholder="e.g. via GPay"
                      value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label">Payment Method</label>
                  <div className="pf-seg">
                    {['Cash','UPI','Bank Transfer','Card'].map(m=>(
                      <button key={m} className={`pf-seg-btn${form.paymentMethod===m?' active':''}`}
                        onClick={()=>setForm({...form,paymentMethod:m})}>{m}</button>
                    ))}
                  </div>
                </div>

                <button className="pf-save-btn" onClick={handleSavePayment} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Payment'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Penalty Settings Sheet ── */}
        {showPenaltySheet && (
          <>
            <div className="bso" onClick={()=>setShowPenaltySheet(false)} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="bs-header">
                <h2 className="bs-title">⚡ Penalty Settings</h2>
                <button className="bs-close" onClick={()=>setShowPenaltySheet(false)}>✕</button>
              </div>
              <div className="bs-body">

                <div className="pen-toggle-row">
                  <div>
                    <div className="pen-toggle-label">Late Payment Penalty</div>
                    <div className="pen-toggle-sub">
                      {penaltyEnabled ? `₹${penaltyAmount||0}/day after ${gracePeriod||0} day grace` : 'Tap to enable'}
                    </div>
                  </div>
                  <div className="pen-toggle"
                    style={{ background: penaltyEnabled ? '#e94560' : '#e2e8f0' }}
                    onClick={()=>setPenaltyEnabled(!penaltyEnabled)}>
                    <div className="pen-knob" style={{ transform: penaltyEnabled ? 'translateX(26px)' : 'translateX(3px)' }} />
                  </div>
                </div>

                {penaltyEnabled && (
                  <>
                    <div className="pen-fields">
                      <div className="pf-field">
                        <label className="pf-label">💰 Penalty per day (₹)</label>
                        <input className="pf-input" type="number" inputMode="numeric"
                          placeholder="e.g. 50"
                          value={penaltyAmount} onChange={e=>setPenaltyAmount(e.target.value)} />
                      </div>
                      <div className="pf-field">
                        <label className="pf-label">🕐 Grace Period (days)</label>
                        <input className="pf-input" type="number" inputMode="numeric"
                          placeholder="e.g. 3"
                          value={gracePeriod} onChange={e=>setGracePeriod(e.target.value)} />
                      </div>
                    </div>

                    <div className="pen-preview">
                      <div className="pen-preview-title">📊 Example</div>
                      Due: 1st · Paid: 8th · Grace: {gracePeriod||0} days<br/>
                      Overdue days: {Math.max(0,7-(parseInt(gracePeriod)||0))}<br/>
                      Penalty: {Math.max(0,7-(parseInt(gracePeriod)||0))} × ₹{penaltyAmount||0} = <strong>₹{Math.max(0,7-(parseInt(gracePeriod)||0))*(parseInt(penaltyAmount)||0)}</strong><br/>
                      <strong>✅ No penalty if paid on or before due date</strong>
                    </div>
                  </>
                )}

                <button className="pen-save-btn" onClick={savePenaltySettings}>
                  ✅ Save Settings
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}