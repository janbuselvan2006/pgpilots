import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .rent-root { font-family: 'DM Sans', sans-serif; background: #f0f2f8; min-height: 100vh; }

  .rent-topbar { background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); padding: 20px 20px 28px; position: relative; overflow: hidden; }
  .rent-topbar::after { content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%; background: rgba(233,69,96,0.12); top: -70px; right: -50px; pointer-events: none; }
  .rent-topbar-row { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .rent-page-title { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 3px; }
  .rent-page-sub   { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; }
  .rent-penalty-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 7px 14px; cursor: pointer; -webkit-tap-highlight-color: transparent; position: relative; z-index: 1; }
  .rent-penalty-pill-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); }
  .rp-toggle { width: 36px; height: 20px; border-radius: 99px; position: relative; transition: background 0.3s; flex-shrink: 0; }
  .rp-knob   { position: absolute; top: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }

  .rent-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin: -14px 16px 0; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); position: relative; z-index: 2; }
  .rent-stat  { padding: 12px 6px; text-align: center; border-right: 1px solid #f1f5f9; }
  .rent-stat:last-child { border-right: none; }
  .rent-stat-icon  { font-size: 16px; margin-bottom: 2px; }
  .rent-stat-num   { font-size: 13px; font-weight: 800; line-height: 1.1; }
  .rent-stat-label { font-size: 8px; color: #94a3b8; font-weight: 600; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }

  .rent-content { padding: 20px 16px 100px; }

  .rent-tabs { display: flex; background: white; border-radius: 14px; padding: 4px; gap: 4px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .rent-tab  { flex: 1; padding: 10px 8px; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; background: transparent; color: #94a3b8; font-family: inherit; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
  .rent-tab.active { background: linear-gradient(135deg, #e94560, #0f3460); color: white; }

  .rent-section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px; display: flex; align-items: center; gap: 6px; }
  .rent-section-count { background: currentColor; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; opacity: 0.9; }
  .rent-section-wrap { margin-bottom: 20px; }

  .trc         { background: white; border-radius: 16px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
  .trc-accent  { height: 4px; }
  .trc-body    { padding: 14px; }
  .trc-top     { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .trc-left    { display: flex; align-items: center; gap: 10px; }
  .trc-avatar  { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; flex-shrink: 0; }
  .trc-name    { font-size: 15px; font-weight: 800; color: #1e293b; }
  .trc-sub     { font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 2px; }
  .trc-right   { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .trc-status-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
  .trc-amount      { font-size: 18px; font-weight: 800; color: #1e293b; }
  .trc-amount-sub  { font-size: 10px; color: #94a3b8; font-weight: 500; }

  .trc-pills { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .trc-pill  { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; background: #f1f5f9; color: #475569; }
  .trc-pill.warning { background: #fffbeb; color: #d97706; }
  .trc-pill.danger  { background: #fef2f2; color: #dc2626; }
  .trc-pill.info    { background: #ecfeff; color: #0891b2; }
  .trc-pill.success { background: #ecfdf5; color: #059669; }

  .trc-breakdown { background: #f8fafc; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
  .trc-bd-item   { font-size: 11px; color: #64748b; font-weight: 500; }
  .trc-bd-item span { font-weight: 700; color: #1e293b; }

  .trc-collect-btn { width: 100%; padding: 12px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; color: white; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; transition: opacity 0.15s, transform 0.1s; }
  .trc-collect-btn:active { transform: scale(0.98); opacity: 0.9; }

  .rent-filter-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 10px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .rent-filter-scroll::-webkit-scrollbar { display: none; }
  .rent-filter-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .rent-filter-chip  { white-space: nowrap; padding: 7px 14px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: white; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; flex-shrink: 0; transition: all 0.15s; }
  .rent-filter-chip.active { background: #1a1a2e; color: white; border-color: #1a1a2e; }
  .rent-search { width: 100%; padding: 13px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; background: white; outline: none; box-sizing: border-box; margin-bottom: 12px; -webkit-appearance: none; transition: border-color 0.2s; }
  .rent-search:focus { border-color: #e94560; }
  .rent-result-count { font-size: 12px; color: #94a3b8; margin-bottom: 12px; font-weight: 500; }

  .hc { background: white; border-radius: 14px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.05); }
  .hc-top    { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .hc-left   { display: flex; align-items: center; gap: 10px; }
  .hc-avatar { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 15px; flex-shrink: 0; }
  .hc-name   { font-size: 14px; font-weight: 700; color: #1e293b; }
  .hc-sub    { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .hc-right  { text-align: right; }
  .hc-amount { font-size: 17px; font-weight: 800; }
  .hc-method { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: #eef2ff; color: #4f46e5; display: inline-block; margin-top: 3px; }
  .hc-tags   { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .hc-tag    { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
  .hc-breakdown { font-size: 11px; color: #94a3b8; padding: 8px 10px; background: #f8fafc; border-radius: 8px; }
  .hc-date   { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .hc-notes  { font-size: 11px; color: #94a3b8; margin-top: 4px; font-style: italic; }

  .rent-empty       { text-align: center; padding: 50px 20px; background: white; border-radius: 18px; }
  .rent-empty-icon  { font-size: 48px; margin-bottom: 12px; }
  .rent-empty-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
  .rent-empty-sub   { font-size: 13px; color: #94a3b8; margin: 0; }
  .rent-loading     { text-align: center; padding: 50px; color: #94a3b8; }
  .rent-spinner     { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: #e94560; border-radius: 50%; animation: rspin 0.7s linear infinite; margin: 0 auto 12px; }
  @keyframes rspin  { to { transform: rotate(360deg); } }

  .rent-no-pg { text-align: center; padding: 60px 20px; background: white; border-radius: 20px; margin: 20px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }

  .bso { position: fixed; inset: 0; background: rgba(15,20,40,0.55); z-index: 100; backdrop-filter: blur(2px); animation: bsFadeIn 0.2s ease; }
  @keyframes bsFadeIn { from { opacity: 0; } to { opacity: 1; } }
  .bs { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-radius: 24px 24px 0 0; z-index: 101; max-height: 94dvh; overflow-y: auto; animation: bsSlideUp 0.3s cubic-bezier(0.32,0.72,0,1); padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px); }
  @keyframes bsSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @media (min-width: 640px) {
    .bs { left: 50%; right: auto; width: 540px; border-radius: 24px; bottom: 50%; transform: translate(-50%, 50%); animation: bsZoomIn 0.25s cubic-bezier(0.32,0.72,0,1); max-height: 90vh; }
    @keyframes bsZoomIn { from { opacity: 0; transform: translate(-50%, 50%) scale(0.95); } to { opacity: 1; transform: translate(-50%, 50%) scale(1); } }
    .rent-stats   { margin: -14px 24px 0; }
    .rent-content { padding: 24px 24px 40px; }
  }
  .bs-handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 99px; margin: 12px auto 0; }
  .bs-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px 8px; }
  .bs-title  { font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0; }
  .bs-close  { width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; border: none; font-size: 14px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; -webkit-tap-highlight-color: transparent; }
  .bs-body   { padding: 12px 20px 96px; }

  .pay-tenant-box { display: flex; align-items: center; gap: 12px; background: #f8fafc; border-radius: 14px; padding: 14px; margin-bottom: 16px; }
  .pay-ta    { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; flex-shrink: 0; background: linear-gradient(135deg, #4f46e5, #0891b2); }
  .pay-tname { font-size: 15px; font-weight: 800; color: #1e293b; }
  .pay-tsub  { font-size: 12px; color: #94a3b8; }
  .pay-tpartial { font-size: 12px; color: #d97706; font-weight: 600; margin-top: 2px; }

  .pay-breakdown   { background: #f8fafc; border-radius: 14px; padding: 14px; margin-bottom: 14px; border: 1px solid #e2e8f0; }
  .pay-bd-row      { display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 8px; }
  .pay-bd-total    { border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 4px; font-weight: 800; color: #1e293b; font-size: 15px; }
  .pay-partial-warn { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 11px 14px; font-size: 13px; color: #d97706; font-weight: 600; margin-bottom: 14px; }

  .pf-field { margin-bottom: 14px; }
  .pf-label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .pf-input { width: 100%; padding: 13px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; font-family: inherit; color: #1a1a2e; background: #fafbff; outline: none; box-sizing: border-box; -webkit-appearance: none; transition: border-color 0.2s; }
  .pf-input:focus { border-color: #e94560; background: white; }
  .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pf-seg { display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; gap: 3px; }
  .pf-seg-btn { flex: 1; padding: 9px 4px; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent; color: #94a3b8; font-family: inherit; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
  .pf-seg-btn.active { background: white; color: #e94560; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .pf-save-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #e94560, #0f3460); color: white; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 6px; box-shadow: 0 4px 14px rgba(233,69,96,0.3); -webkit-tap-highlight-color: transparent; transition: opacity 0.2s, transform 0.1s; }
  .pf-save-btn:active   { transform: scale(0.98); opacity: 0.9; }
  .pf-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .pen-toggle-row   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 14px; background: #f8fafc; border-radius: 14px; }
  .pen-toggle-label { font-size: 15px; font-weight: 700; color: #1e293b; }
  .pen-toggle-sub   { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .pen-toggle  { width: 48px; height: 26px; border-radius: 99px; position: relative; cursor: pointer; transition: background 0.3s; flex-shrink: 0; }
  .pen-knob    { position: absolute; top: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
  .pen-fields  { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
  .pen-preview { background: #fff5f5; border: 1px solid #fecaca; border-radius: 14px; padding: 14px; font-size: 13px; color: #475569; line-height: 1.8; margin-bottom: 16px; }
  .pen-preview-title { font-size: 12px; font-weight: 800; color: #dc2626; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .pen-save-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #e94560, #0f3460); color: white; border: none; border-radius: 14px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }

  .hc-invoice-btn {
    margin-top: 10px; padding: 10px 14px; background: #1a1a2e; color: white;
    border: none; border-radius: 10px; font-size: 11px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 6px;
    width: fit-content; transition: background 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .hc-invoice-btn:hover { background: #e94560; }
  .hc-invoice-btn:active { transform: scale(0.96); }

  /* Table Style for History */
  .rent-table-wrap { overflow-x: auto; background: white; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
  .rent-table { width: 100%; border-collapse: collapse; min-width: 800px; }
  .rent-table th { background: #f8fafc; padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #e2e8f0; }
  .rent-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }
  .rent-table tr:last-child td { border-bottom: none; }
  .rent-table tr:hover { background: #fbfcfe; }
  .rt-name { font-weight: 800; color: #1a1a2e; }
  .rt-sub  { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .rt-amt  { font-weight: 800; font-size: 14px; }
  .rt-badge { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
  .rt-method { font-size: 11px; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 3px 8px; border-radius: 6px; }
  .rt-action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #1a1a2e; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
  .rt-action-btn:hover { background: #e94560; transform: translateY(-1px); }
  .rt-action-btn:active { transform: scale(0.9); }

  .rt-sortable { cursor: pointer; user-select: none; }
  .rt-sortable:hover { background: #f1f5f9 !important; color: #e94560; }

  .rt-collect-btn { padding: 8px 12px; background: #059669; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .rt-collect-btn:hover { background: #047857; transform: translateY(-1px); }
  .rt-pay-btn { padding: 8px 12px; background: #d97706; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .rt-pay-btn:hover { background: #b45309; transform: translateY(-1px); }
`;

// ✅ Now accepts pgId, allPgIds, pgs, and ownerId props
export default function RentPage({ pgId, allPgIds, pgs, ownerId }) {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [elecBills, setElecBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showPenaltySheet, setShowPenaltySheet] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState('');
  const [filterMonth, setFilterMonth]   = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [sortOrder, setSortOrder]       = useState('desc');
  const [ovSortOrder, setOvSortOrder]   = useState('asc'); // for Overview tab
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');

  const [form, setForm] = useState({
    amount: '', paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0], notes: '',
  });

  const user = auth.currentUser;
  const effectiveOwnerId = ownerId || user?.uid;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const thisYear = new Date().getFullYear().toString();

  const fetchData = async () => {
    if (!user || !pgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const isAll = pgId === '__all__';
      const targetIds = isAll ? allPgIds : [pgId];
      if (!targetIds || targetIds.length === 0) { setLoading(false); return; }

      const [tSnap, pSnap, eSnap] = await Promise.all([
        getDocs(query(collection(db, 'tenants'), where('ownerId', '==', effectiveOwnerId))),
        getDocs(query(collection(db, 'payments'), where('ownerId', '==', effectiveOwnerId))),
        getDocs(query(collection(db, 'electricityBills'), where('ownerId', '==', effectiveOwnerId), where('month', '==', thisMonth), where('year', '==', thisYear))),
      ]);

      const allT = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allP = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allE = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isAll) {
        setTenants(allT.filter(t => t.status !== 'deleted'));
        setPayments(allP);
        setElecBills(allE);
      } else {
        const filterByPg = (item) => (item.pgId || effectiveOwnerId) === pgId;
        setTenants(allT.filter(filterByPg).filter(t => t.status !== 'deleted'));
        setPayments(allP.filter(filterByPg));
        setElecBills(allE.filter(filterByPg));
      }

      const ownerDoc = await getDoc(doc(db, 'pgOwners', effectiveOwnerId));
      if (ownerDoc.exists()) {
        const d = ownerDoc.data();
        setPenaltyEnabled(d.penaltyEnabled === true);
        if (d.penaltyAmount !== undefined) setPenaltyAmount(d.penaltyAmount.toString());
        if (d.gracePeriod !== undefined) setGracePeriod(d.gracePeriod.toString());
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [pgId]);

  const getPgName = (id) => pgs?.find(p => p.pgId === id || p.id === id)?.pgName || 'PG';

  const getElecShare = (t) => { const b = elecBills.find(b => b.roomNumber === t.roomNumber); return b ? Math.round((b.amount || 0) / (b.tenantCount || 1)) : 0; };
  const hasElecBill = (t) => elecBills.some(b => b.roomNumber === t.roomNumber);
  const getDueDate = (t) => { if (!t.checkIn) return null; const d = new Date(t.checkIn); return new Date(today.getFullYear(), today.getMonth(), d.getDate()); };
  const getDaysDiff = (t) => { const due = getDueDate(t); if (!due) return 999; return Math.floor((due - today) / (1000 * 60 * 60 * 24)); };

  const getPenaltyForDate = (t, payDate) => {
    if (!penaltyEnabled || !t.checkIn) return 0;
    const dueDay = new Date(t.checkIn).getDate();
    const pd = new Date(payDate);
    const due = new Date(pd.getFullYear(), pd.getMonth(), dueDay);
    const diff = Math.floor((pd - due) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 0;
    return Math.max(0, diff - (parseInt(gracePeriod) || 0)) * (parseInt(penaltyAmount) || 0);
  };

  const getThisMonthCompletedPenalty = (tid) => {
    const completedPmt = payments.find(p => {
      const pd = new Date(p.paymentDate);
      return p.tenantId === tid &&
        pd.getMonth() === today.getMonth() &&
        pd.getFullYear() === today.getFullYear() &&
        p.isCompleted === true;
    });
    return completedPmt ? (completedPmt.penaltyAmount || 0) : null;
  };

  const getPenaltyDisplay = (t) => {
    if (!penaltyEnabled) return 0;
    const completedPenalty = getThisMonthCompletedPenalty(t.id);
    if (completedPenalty !== null) return completedPenalty;
    const d = getDaysDiff(t);
    if (d >= 0) return 0;
    return Math.max(0, Math.abs(d) - (parseInt(gracePeriod) || 0)) * (parseInt(penaltyAmount) || 0);
  };

  const shouldShowPenaltyOnCard = (t) => {
    if (!penaltyEnabled) return false;
    if (isPaid(t)) { const rec = getThisMonthCompletedPenalty(t.id); return rec !== null && rec > 0; }
    return getDaysDiff(t) < 0;
  };

  const getThisMonthPaid = (tid) => payments.filter(p => {
    const pd = new Date(p.paymentDate);
    return p.tenantId === tid && pd.getMonth() === today.getMonth() && pd.getFullYear() === today.getFullYear();
  }).reduce((a, p) => a + (p.amount || 0), 0);

  const getTotalDue = (t) => (t.monthlyRent || 0) + getElecShare(t) + getPenaltyDisplay(t);
  const getBalance = (t) => Math.max(0, getTotalDue(t) - getThisMonthPaid(t.id));
  const isPaid = (t) => getBalance(t) === 0;
  const isPartial = (t) => { const p = getThisMonthPaid(t.id); return p > 0 && p < getTotalDue(t); };

  const unpaid = tenants.filter(t => !isPaid(t));
  const lateTenants     = unpaid.filter(t => getDaysDiff(t) < 0).sort((a,b)=>getDaysDiff(a)-getDaysDiff(b));
  const todayTenants    = unpaid.filter(t => getDaysDiff(t) === 0);
  const upcomingTenants = unpaid.filter(t => getDaysDiff(t) > 0).sort((a,b)=>getDaysDiff(a)-getDaysDiff(b));
  const paidTenants     = tenants.filter(t => isPaid(t));

  const totalExpected = tenants.reduce((a, t) => a + getTotalDue(t), 0);
  const totalCollected = tenants.reduce((a, t) => a + getThisMonthPaid(t.id), 0);
  const totalPending = Math.max(0, totalExpected - totalCollected);

  // Ledger Calculations
  const currMonth = new Date().toLocaleString('default', { month: 'long' });
  const currYear  = new Date().getFullYear().toString();
  
  const rentDues = [...lateTenants, ...todayTenants, ...upcomingTenants].sort((a,b) => {
    const da = getDaysDiff(a); 
    const db = getDaysDiff(b);
    return ovSortOrder === 'desc' ? db - da : da - db;
  });

  const pendingElecTenants = tenants.filter(t => {
      if (t.status === 'deleted' || isPaid(t)) return false;
      return elecBills.some(b => b.roomNumber === t.roomNumber);
  }).map(t => {
      const bill = elecBills.find(b => b.roomNumber === t.roomNumber);
      const share = bill ? Math.round(bill.amount / (bill.tenantCount || 1)) : 0;
      return { ...t, elecAmount: share, billMonth: bill?.month };
  }).sort((a,b) => (ovSortOrder === 'desc' ? b.elecAmount - a.elecAmount : a.elecAmount - b.elecAmount));

  const handleRecordPayment = (t) => {
    if (pgId === '__all__') return alert('Please select a specific PG to collect rent.');
    setSelectedTenant(t);
    setForm({ amount: getBalance(t).toString(), paymentMethod: 'Cash', paymentDate: new Date().toISOString().split('T')[0], notes: '' });
    setShowPaymentSheet(true);
  };

  const livePenalty = selectedTenant ? getPenaltyForDate(selectedTenant, form.paymentDate) : 0;
  const liveElec = selectedTenant ? getElecShare(selectedTenant) : 0;
  const liveTotalDue = selectedTenant ? Math.max(0, (selectedTenant.monthlyRent || 0) + liveElec + livePenalty - getThisMonthPaid(selectedTenant.id)) : 0;

  const handleSavePayment = async () => {
    const amt = parseInt(form.amount);
    if (!amt || amt <= 0) return alert('Enter a valid amount!');
    if (amt > liveTotalDue) return alert(`Amount cannot exceed ₹${liveTotalDue.toLocaleString('en-IN')}`);
    const prevPaid = getThisMonthPaid(selectedTenant.id);
    const newTotal = prevPaid + amt;
    const fullAmt = (selectedTenant.monthlyRent || 0) + liveElec + livePenalty;
    setSaving(true);
    try {
      await addDoc(collection(db, 'payments'), {
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        roomNumber: selectedTenant.roomNumber,
        amount: amt,
        rentAmount: selectedTenant.monthlyRent || 0,
        electricityShare: liveElec,
        penaltyAmount: livePenalty,
        fullAmount: fullAmt,
        previouslyPaid: prevPaid,
        newTotal,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        paymentTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        recordedAt: new Date().toISOString(),
        month: new Date(form.paymentDate).toLocaleString('en-US', { month: 'long' }),
        year: new Date(form.paymentDate).getFullYear().toString(),
        notes: form.notes,
        isPartial: amt < liveTotalDue,
        isCompleted: newTotal >= fullAmt,
        type: 'Rent',
        ownerId: effectiveOwnerId,
        pgId: selectedTenant.pgId,
        createdAt: new Date(),
      });
      setShowPaymentSheet(false);
      setSelectedTenant(null);
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const generateInvoicePDF = async (p) => {
    const doc = new jsPDF();
    const pg = pgs?.find(pgItem => pgItem.pgId === p.pgId || pgItem.id === p.pgId);
    const pgName = pg?.pgName || 'PGpilots';
    const pgAddr = [pg?.address, pg?.city, pg?.state].filter(Boolean).join(', ');
    const receiptId = p.id?.toUpperCase() || 'N/A';
    const securityHash = btoa(`${p.id}-${p.amount}-${p.tenantName}`).slice(0, 16);

    // Header
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(pgName, 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (pgAddr) doc.text(pgAddr, 14, 28);
    
    doc.setFontSize(18);
    doc.text('OFFICIAL RECEIPT', 196, 22, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`VERIFIED SYSTEM RECORD`, 196, 28, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Receipt ID: ${receiptId.slice(-12)}`, 196, 34, { align: 'right' });

    // Details Grid
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TENANT DETAILS', 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${p.tenantName}`, 14, 62);
    doc.text(`Room: ${p.roomNumber}`, 14, 68);

    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT INFO', 120, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${p.paymentDate}`, 120, 62);
    doc.text(`Method: ${p.paymentMethod}`, 120, 68);
    doc.text(`Status: ${p.isCompleted ? 'Complete Payment' : 'Partial Payment'}`, 120, 74);

    // Breakdown Table
    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Amount']],
      body: [
        ['Monthly Rent', `Rs. ${(p.rentAmount || 0).toLocaleString('en-IN')}`],
        p.electricityShare > 0 ? ['Electricity Maintenance', `Rs. ${p.electricityShare.toLocaleString('en-IN')}`] : null,
        p.penaltyAmount > 0 ? ['Late Payment Penalty', `Rs. ${p.penaltyAmount.toLocaleString('en-IN')}`] : null,
      ].filter(Boolean),
      foot: [['Total Expected', `Rs. ${(p.fullAmount || ( (p.rentAmount||0)+(p.electricityShare||0)+(p.penaltyAmount||0) )).toLocaleString('en-IN')}`]],
      headStyles: { fillColor: [26, 26, 46], textColor: 255 },
      footStyles: { fillColor: [248, 250, 252], textColor: 26, fontStyle: 'bold' },
      theme: 'grid',
      styles: { fontSize: 10 }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    
    // Summary
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`AMOUNT PAID: Rs. ${(p.amount || 0).toLocaleString('en-IN')}`, 14, finalY);
    
    if (p.isPartial && !p.isCompleted) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`Remaining Balance: Rs. ${( (p.fullAmount || 0) - (p.newTotal || 0) ).toLocaleString('en-IN')}`, 14, finalY + 8);
    }

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    if (p.notes) doc.text(`Notes: ${p.notes}`, 14, finalY + 22);

    // --- SECURITY SECTION ---
    const qrData = `RECEIPT VERIFICATION\nID: ${p.id}\nTenant: ${p.tenantName}\nAmount: Rs. ${p.amount}\nDate: ${p.paymentDate}\nPG: ${pgName}`;
    try {
      const qrUrl = await QRCode.toDataURL(qrData);
      doc.addImage(qrUrl, 'PNG', 160, finalY - 5, 35, 35);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('SCAN TO VERIFY', 177.5, finalY + 32, { align: 'center' });
    } catch (e) { console.error("QR Error", e); }

    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Security Hash: ${securityHash}`, 14, 275);
    doc.text(`Digital Signature: ${btoa(p.id || '').slice(0, 32)}`, 14, 279);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text('CAUTION: This receipt is valid only if the Receipt ID exists in the PGpilots owner dashboard.', 105, 287, { align: 'center' });
    doc.text('© Powered by PGpilots Security Module', 105, 292, { align: 'center' });

    doc.save(`Invoice_${p.tenantName?.replace(/\s+/g,'_')}_${p.paymentDate}.pdf`);
  };

  const savePenaltySettings = async () => {
    try {
      await updateDoc(doc(db, 'pgOwners', effectiveOwnerId), {
        penaltyEnabled,
        penaltyAmount: parseInt(penaltyAmount) || 0,
        gracePeriod: parseInt(gracePeriod) || 0,
      });
      setShowPenaltySheet(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const filteredPayments = payments.filter(p => {
    const ms = !search || 
               p.tenantName?.toLowerCase().includes(search.toLowerCase()) || 
               p.roomNumber?.includes(search) ||
               p.id?.toLowerCase().includes(search.toLowerCase());
    const mm = !filterMonth || p.month === filterMonth;
    const mmt = !filterMethod || p.paymentMethod === filterMethod;
    return ms && mm && mmt;
  }).sort((a, b) => {
    const at = a.recordedAt ? new Date(a.recordedAt) : new Date(a.paymentDate);
    const bt = b.recordedAt ? new Date(b.recordedAt) : new Date(b.paymentDate);
    return sortOrder === 'desc' ? bt - at : at - bt;
  });

  const TenantCard = ({ tenant, status }) => {
    const daysDiff = getDaysDiff(tenant);
    const balance = getBalance(tenant);
    const paid = getThisMonthPaid(tenant.id);
    const partial = isPartial(tenant);
    const penalty = getPenaltyDisplay(tenant);
    const elec = getElecShare(tenant);
    const showPenalty = shouldShowPenaltyOnCard(tenant);
    const accentColor = status === 'late' ? '#dc2626' : status === 'today' ? '#d97706' : status === 'paid' ? '#059669' : '#4f46e5';
    const avatarBg = status === 'late' ? 'linear-gradient(135deg,#dc2626,#9f1239)' : status === 'today' ? 'linear-gradient(135deg,#d97706,#b45309)' : status === 'paid' ? 'linear-gradient(135deg,#059669,#0891b2)' : 'linear-gradient(135deg,#4f46e5,#0891b2)';

    return (
      <div className="trc">
        <div className="trc-accent" style={{ background: accentColor }} />
        <div className="trc-body">
          <div className="trc-top">
            <div className="trc-left">
              <div className="trc-avatar" style={{ background: avatarBg }}>{tenant.name?.charAt(0).toUpperCase()}</div>
              <div>
                <div className="trc-name">{tenant.name}</div>
                <div className="trc-sub">Room {tenant.roomNumber} · Bed {tenant.bedNumber || '—'}</div>
                {pgId === '__all__' && <div className="trc-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(tenant.pgId)}</div>}
              </div>
            </div>
            <div className="trc-right">
              {status === 'late' && <div className="trc-status-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>🔴 {Math.abs(daysDiff)}d overdue</div>}
              {status === 'today' && <div className="trc-status-badge" style={{ background: '#fffbeb', color: '#d97706' }}>🟡 Due Today</div>}
              {status === 'upcoming' && <div className="trc-status-badge" style={{ background: '#ecfdf5', color: '#059669' }}>🟢 {daysDiff}d left</div>}
              {status === 'paid' && <div className="trc-status-badge" style={{ background: '#ecfdf5', color: '#059669' }}>✅ Paid</div>}
              <div className="trc-amount" style={{ color: accentColor }}>
                ₹{(status === 'paid' ? getTotalDue(tenant) : balance).toLocaleString('en-IN')}
              </div>
              <div className="trc-amount-sub">{status === 'paid' ? 'paid' : 'due'}</div>
            </div>
          </div>

          <div className="trc-pills">
            <span className="trc-pill">📅 Due {getDueDate(tenant)?.getDate()}th</span>
            {elec > 0 && <span className="trc-pill info">⚡ ₹{elec.toLocaleString('en-IN')}</span>}
            {!hasElecBill(tenant) && <span className="trc-pill warning">⚠️ No elec bill</span>}
            {showPenalty && penalty > 0 && <span className="trc-pill danger">🔴 Late penalty ₹{penalty.toLocaleString('en-IN')}</span>}
            {partial && <span className="trc-pill warning">⚠️ Partial ₹{paid.toLocaleString('en-IN')} paid</span>}
          </div>

          <div className="trc-breakdown">
            <div className="trc-bd-item">Rent <span>₹{(tenant.monthlyRent || 0).toLocaleString('en-IN')}</span></div>
            {elec > 0 && <div className="trc-bd-item">Elec <span>₹{elec.toLocaleString('en-IN')}</span></div>}
            {showPenalty && penalty > 0 && <div className="trc-bd-item">Late Penalty <span style={{ color: '#dc2626' }}>₹{penalty.toLocaleString('en-IN')}</span></div>}
            <div className="trc-bd-item">Total <span>₹{getTotalDue(tenant).toLocaleString('en-IN')}</span></div>
          </div>

          {status !== 'paid' && (
            <button className="trc-collect-btn"
              style={{ background: status === 'late' ? 'linear-gradient(135deg,#dc2626,#9f1239)' : status === 'today' ? 'linear-gradient(135deg,#d97706,#b45309)' : 'linear-gradient(135deg,#e94560,#0f3460)' }}
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

        <div className="rent-topbar">
          <div className="rent-topbar-row">
            <div>
              <h1 className="rent-page-title">Rent</h1>
              <p className="rent-page-sub">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="rent-penalty-pill" onClick={() => setShowPenaltySheet(true)}>
              <span className="rent-penalty-pill-label">⚡ Penalty</span>
              <div className="rp-toggle" style={{ background: penaltyEnabled ? '#e94560' : 'rgba(255,255,255,0.2)' }}>
                <div className="rp-knob" style={{ transform: penaltyEnabled ? 'translateX(18px)' : 'translateX(2px)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rent-stats">
          {[
            { label: 'Expected', value: `₹${totalExpected.toLocaleString('en-IN')}`, color: '#4f46e5', icon: '💰' },
            { label: 'Collected', value: `₹${totalCollected.toLocaleString('en-IN')}`, color: '#059669', icon: '✅' },
            { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: '#dc2626', icon: '⏳' },
            { label: 'Paid', value: `${paidTenants.length}/${tenants.length}`, color: '#d97706', icon: '👥' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="rent-stat">
              <div className="rent-stat-icon">{icon}</div>
              <div className="rent-stat-num" style={{ color }}>{value}</div>
              <div className="rent-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="rent-content">
          <div className="rent-tabs">
            {[{ id: 'overview', label: '📊 Overview' }, { id: 'history', label: '📋 History' }].map(({ id, label }) => (
              <button key={id} className={`rent-tab${activeTab === id ? ' active' : ''}`}
                onClick={() => setActiveTab(id)}>{label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            loading ? (
              <div className="rent-loading"><div className="rent-spinner" />Loading…</div>
            ) : tenants.length === 0 ? (
              <div className="rent-empty">
                <div className="rent-empty-icon">💰</div>
                <p className="rent-empty-title">No tenants yet</p>
                <p className="rent-empty-sub">Add tenants to start tracking rent</p>
              </div>
            ) : (
              <>
                {/* --- RENT DUES TABLE --- */}
                <div className="rent-section" style={{ marginTop: '10px' }}>
                  <div className="rent-section-title">💰 Rent Ledger ({rentDues.length})</div>
                  {rentDues.length === 0 ? (
                    <div className="rent-empty" style={{ padding: '40px' }}><div className="rent-empty-icon">✅</div><p className="rent-empty-title">All rent collected!</p></div>
                  ) : (
                    <div className="rent-table-wrap">
                      <table className="rent-table">
                        <thead>
                          <tr>
                            <th className="rt-sortable" onClick={() => setOvSortOrder(ovSortOrder === 'desc' ? 'asc' : 'desc')}>
                              Urgency {ovSortOrder === 'desc' ? '🔽' : '🔼'}
                            </th>
                            <th>Tenant & Room</th>
                            <th>Amount Due</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentDues.map(t => {
                            const diff = getDaysDiff(t);
                            const balance = getBalance(t);
                            const color = diff < 0 ? '#dc2626' : diff === 0 ? '#d97706' : '#4f46e5';
                            return (
                              <tr key={t.id}>
                                <td>
                                  <div style={{ fontWeight: '800', color }}>
                                    {diff < 0 ? `${Math.abs(diff)}d Overdue` : diff === 0 ? 'Due Today' : `${diff}d Left`}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Due {getDueDate(t)?.getDate()}th</div>
                                </td>
                                <td>
                                  <div className="rt-name">{t.name}</div>
                                  <div className="rt-sub">Room {t.roomNumber}</div>
                                </td>
                                <td className="rt-amt" style={{ color }}>
                                  ₹{balance.toLocaleString('en-IN')}
                                  <div style={{ fontSize: '9px', fontWeight: 'normal', marginTop: '2px' }}>
                                    {isPartial(t) && <span style={{ color: '#059669' }}>Paid ₹{getThisMonthPaid(t.id).toLocaleString('en-IN')}</span>}
                                    {getElecShare(t) > 0 && <span style={{ color: '#d97706', marginLeft: isPartial(t) ? '4px' : 0 }}>+ ₹{getElecShare(t)} Elec</span>}
                                  </div>
                                </td>
                                <td>
                                  <button className="rt-collect-btn" onClick={() => handleRecordPayment(t)}>Collect</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* --- PAID SECTION --- */}
                <div className="rent-section" style={{ marginTop: '30px', opacity: 0.8 }}>
                    <div className="rent-section-title" style={{ color: '#059669' }}>✅ Recently Paid ({paidTenants.length})</div>
                    <div className="rent-table-wrap">
                        <table className="rent-table">
                            <thead>
                                <tr>
                                    <th>Tenant & Room</th>
                                    <th>Total Paid</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paidTenants.slice(0, 5).map(t => (
                                    <tr key={t.id}>
                                        <td>
                                            <div className="rt-name">{t.name}</div>
                                            <div className="rt-sub">Room {t.roomNumber}</div>
                                        </td>
                                        <td className="rt-amt" style={{ color: '#059669' }}>₹{getTotalDue(t).toLocaleString('en-IN')}</td>
                                        <td><span className="rt-badge" style={{ background: '#ecfdf5', color: '#059669' }}>Complete</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </>
            )
          )}

          {activeTab === 'history' && (
            <div>
              <input className="rent-search" type="text"
                placeholder="🔍 Search by name or room…"
                value={search} onChange={e => setSearch(e.target.value)} />

              <div className="rent-filter-label">Month</div>
              <div className="rent-filter-scroll">
                <button className={`rent-filter-chip${!filterMonth ? ' active' : ''}`} onClick={() => setFilterMonth('')}>All</button>
                {months.map(m => (
                  <button key={m} className={`rent-filter-chip${filterMonth === m ? ' active' : ''}`}
                    onClick={() => setFilterMonth(filterMonth === m ? '' : m)}>{m.slice(0, 3)}</button>
                ))}
              </div>

              <div className="rent-filter-label">Method</div>
              <div className="rent-filter-scroll">
                <button className={`rent-filter-chip${!filterMethod ? ' active' : ''}`} onClick={() => setFilterMethod('')}>All</button>
                {['Cash', 'UPI', 'Bank Transfer', 'Card'].map(m => (
                  <button key={m} className={`rent-filter-chip${filterMethod === m ? ' active' : ''}`}
                    onClick={() => setFilterMethod(filterMethod === m ? '' : m)}>{m}</button>
                ))}
              </div>

              <div className="rent-result-count" style={{ marginTop: '10px' }}>
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
                {filteredPayments.filter(p => p.isPartial && !p.isCompleted).length > 0 &&
                  <span style={{ color: '#d97706', fontWeight: '600' }}> · {filteredPayments.filter(p => p.isPartial && !p.isCompleted).length} partial</span>}
              </div>

              {filteredPayments.length === 0 ? (
                <div className="rent-empty">
                  <div className="rent-empty-icon">📋</div>
                  <p className="rent-empty-title">No payments found</p>
                  <p className="rent-empty-sub">Try clearing filters</p>
                </div>
              ) : (
                <div className="rent-table-wrap">
                  <table className="rent-table">
                    <thead>
                      <tr>
                        <th className="rt-sortable" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                          Date & Time {sortOrder === 'desc' ? '🔽' : '🔼'}
                        </th>
                        <th>Tenant & Room</th>
                        <th>Month</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: '700' }}>{p.paymentDate}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{p.paymentTime || '—'}</div>
                          </td>
                          <td>
                            <div className="rt-name">{p.tenantName}</div>
                            <div className="rt-sub">Room {p.roomNumber}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600', color: '#475569' }}>{p.month} {p.year}</div>
                          </td>
                          <td>
                            <div className="rt-amt" style={{ color: p.isCompleted ? '#059669' : p.isPartial ? '#d97706' : '#4f46e5' }}>
                              ₹{p.amount?.toLocaleString('en-IN')}
                            </div>
                            {p.isPartial && <div style={{ fontSize: '9px', color: '#94a3b8' }}>of ₹{p.fullAmount?.toLocaleString('en-IN')}</div>}
                          </td>
                          <td>
                            <span className="rt-method">{p.paymentMethod}</span>
                          </td>
                          <td>
                            {p.isCompleted ? (
                              <span className="rt-badge" style={{ background: '#ecfdf5', color: '#059669' }}>Complete</span>
                            ) : (
                              <span className="rt-badge" style={{ background: '#fffbeb', color: '#d97706' }}>Partial</span>
                            )}
                          </td>
                          <td>
                            <button className="rt-action-btn" onClick={() => generateInvoicePDF(p)} title="Generate Invoice">
                              📄
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collect Payment Sheet */}
        {showPaymentSheet && selectedTenant && (
          <>
            <div className="bso" onClick={() => setShowPaymentSheet(false)} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="bs-header">
                <h2 className="bs-title">💰 Collect Rent</h2>
                <button className="bs-close" onClick={() => setShowPaymentSheet(false)}>✕</button>
              </div>
              <div className="bs-body">
                <div className="pay-tenant-box">
                  <div className="pay-ta">{selectedTenant.name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="pay-tname">{selectedTenant.name}</div>
                    <div className="pay-tsub">Room {selectedTenant.roomNumber} · ₹{selectedTenant.monthlyRent?.toLocaleString('en-IN')}/mo</div>
                    {isPartial(selectedTenant) && (
                      <div className="pay-tpartial">Already paid ₹{getThisMonthPaid(selectedTenant.id).toLocaleString('en-IN')} · Balance ₹{liveTotalDue.toLocaleString('en-IN')}</div>
                    )}
                  </div>
                </div>

                <div className="pay-breakdown">
                  <div className="pay-bd-row"><span>🏠 Monthly Rent</span><span>₹{(selectedTenant.monthlyRent || 0).toLocaleString('en-IN')}</span></div>
                  <div className="pay-bd-row"><span>⚡ Electricity</span><span style={{ color: liveElec > 0 ? '#d97706' : '#94a3b8' }}>{liveElec > 0 ? `₹${liveElec.toLocaleString('en-IN')}` : '⚠️ Not added'}</span></div>
                  <div className="pay-bd-row"><span>🔴 Penalty</span><span style={{ color: livePenalty > 0 ? '#dc2626' : '#94a3b8' }}>{livePenalty > 0 ? `₹${livePenalty.toLocaleString('en-IN')}` : penaltyEnabled ? '✅ None' : '—'}</span></div>
                  {getThisMonthPaid(selectedTenant.id) > 0 && (
                    <div className="pay-bd-row"><span>Already Paid</span><span style={{ color: '#059669' }}>−₹{getThisMonthPaid(selectedTenant.id).toLocaleString('en-IN')}</span></div>
                  )}
                  <div className="pay-bd-row pay-bd-total"><span>Balance Due</span><span>₹{liveTotalDue.toLocaleString('en-IN')}</span></div>
                </div>

                {form.amount && parseInt(form.amount) < liveTotalDue && parseInt(form.amount) > 0 && (
                  <div className="pay-partial-warn">⚠️ Partial — remaining after this: ₹{(liveTotalDue - parseInt(form.amount)).toLocaleString('en-IN')}</div>
                )}

                <div className="pf-field">
                  <label className="pf-label">Amount (₹) — Due: ₹{liveTotalDue.toLocaleString('en-IN')}</label>
                  <input className="pf-input" type="number" inputMode="numeric" placeholder="Enter amount"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>

                <div className="pf-row">
                  <div className="pf-field">
                    <label className="pf-label">Payment Date *</label>
                    <input className="pf-input" type="date" value={form.paymentDate}
                      onChange={e => {
                        const nd = e.target.value;
                        const np = getPenaltyForDate(selectedTenant, nd);
                        const ne = getElecShare(selectedTenant);
                        const nb = Math.max(0, (selectedTenant.monthlyRent || 0) + ne + np - getThisMonthPaid(selectedTenant.id));
                        setForm(prev => ({ ...prev, paymentDate: nd, amount: nb.toString() }));
                      }} />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Notes</label>
                    <input className="pf-input" type="text" placeholder="e.g. via GPay"
                      value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label">Payment Method</label>
                  <div className="pf-seg">
                    {['Cash', 'UPI', 'Bank Transfer', 'Card'].map(m => (
                      <button key={m} className={`pf-seg-btn${form.paymentMethod === m ? ' active' : ''}`}
                        onClick={() => setForm({ ...form, paymentMethod: m })}>{m}</button>
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

        {/* Penalty Settings Sheet */}
        {showPenaltySheet && (
          <>
            <div className="bso" onClick={() => setShowPenaltySheet(false)} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="bs-header">
                <h2 className="bs-title">⚡ Penalty Settings</h2>
                <button className="bs-close" onClick={() => setShowPenaltySheet(false)}>✕</button>
              </div>
              <div className="bs-body">
                <div className="pen-toggle-row">
                  <div>
                    <div className="pen-toggle-label">Late Payment Penalty</div>
                    <div className="pen-toggle-sub">{penaltyEnabled ? `₹${penaltyAmount || 0}/day after ${gracePeriod || 0} day grace` : 'Tap to enable'}</div>
                  </div>
                  <div className="pen-toggle" style={{ background: penaltyEnabled ? '#e94560' : '#e2e8f0' }}
                    onClick={() => setPenaltyEnabled(!penaltyEnabled)}>
                    <div className="pen-knob" style={{ transform: penaltyEnabled ? 'translateX(26px)' : 'translateX(3px)' }} />
                  </div>
                </div>

                {penaltyEnabled && (
                  <>
                    <div className="pen-fields">
                      <div className="pf-field">
                        <label className="pf-label">💰 Penalty per day (₹)</label>
                        <input className="pf-input" type="number" inputMode="numeric" placeholder="e.g. 50"
                          value={penaltyAmount} onChange={e => setPenaltyAmount(e.target.value)} />
                      </div>
                      <div className="pf-field">
                        <label className="pf-label">🕐 Grace Period (days)</label>
                        <input className="pf-input" type="number" inputMode="numeric" placeholder="e.g. 3"
                          value={gracePeriod} onChange={e => setGracePeriod(e.target.value)} />
                      </div>
                    </div>
                    <div className="pen-preview">
                      <div className="pen-preview-title">📊 Example</div>
                      Due: 1st · Paid: 8th · Grace: {gracePeriod || 0} days<br />
                      Overdue days: {Math.max(0, 7 - (parseInt(gracePeriod) || 0))}<br />
                      Penalty: {Math.max(0, 7 - (parseInt(gracePeriod) || 0))} × ₹{penaltyAmount || 0} = <strong>₹{Math.max(0, 7 - (parseInt(gracePeriod) || 0)) * (parseInt(penaltyAmount) || 0)}</strong><br />
                      <strong>✅ No penalty if paid on or before due date</strong>
                    </div>
                  </>
                )}

                <button className="pen-save-btn" onClick={() => {
                  if (pgId === '__all__') return alert('Please select a specific PG to change settings.');
                  savePenaltySettings();
                }}>✅ Save Settings</button>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}