import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .rp-root { font-family:'DM Sans',sans-serif; background:#f0f2f8; min-height:100vh; }

  .rp-topbar { background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%); padding:20px 20px 28px; position:relative; overflow:hidden; }
  .rp-topbar::after { content:''; position:absolute; width:200px; height:200px; border-radius:50%; background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none; }
  .rp-topbar-row { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; }
  .rp-page-title { font-size:22px; font-weight:800; color:#fff; margin:0 0 3px; }
  .rp-page-sub   { font-size:12px; color:rgba(255,255,255,0.5); font-weight:500; }

  .rp-content { padding:16px 16px 100px; }
  @media(min-width:640px){ .rp-content{ padding:24px 24px 40px; } }

  .rp-period-box { background:white; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
  .rp-period-seg { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:3px; margin-bottom:14px; }
  .rp-period-btn { flex:1; padding:9px 8px; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; background:transparent; color:#94a3b8; font-family:inherit; transition:all 0.2s; -webkit-tap-highlight-color:transparent; }
  .rp-period-btn.active { background:white; color:#e94560; box-shadow:0 1px 4px rgba(0,0,0,0.1); }

  .rp-month-scroll { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:10px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .rp-month-scroll::-webkit-scrollbar { display:none; }
  .rp-month-chip { white-space:nowrap; padding:7px 12px; border-radius:20px; border:1.5px solid #e2e8f0; background:white; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:all 0.15s; }
  .rp-month-chip.active { background:#1a1a2e; color:white; border-color:#1a1a2e; }

  .rp-year-row  { display:flex; gap:6px; }
  .rp-year-chip { padding:7px 14px; border-radius:20px; border:1.5px solid #e2e8f0; background:white; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent; transition:all 0.15s; }
  .rp-year-chip.active { background:#1a1a2e; color:white; border-color:#1a1a2e; }

  .rp-custom-row   { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .rp-custom-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:5px; }
  .rp-custom-input { width:100%; padding:11px 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:inherit; background:#fafbff; outline:none; box-sizing:border-box; -webkit-appearance:none; }
  .rp-custom-input:focus { border-color:#e94560; }

  .rp-type-scroll { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; margin-bottom:16px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .rp-type-scroll::-webkit-scrollbar { display:none; }
  .rp-type-chip { white-space:nowrap; padding:9px 16px; border-radius:20px; border:1.5px solid #e2e8f0; background:white; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; font-family:inherit; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:all 0.15s; }

  .rp-card        { background:white; border-radius:18px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06); margin-bottom:16px; }
  .rp-card-header { padding:16px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #f1f5f9; }
  .rp-card-title  { font-size:16px; font-weight:800; color:#1e293b; margin:0 0 3px; }
  .rp-card-period { font-size:11px; color:#94a3b8; }
  .rp-dl-btn      { padding:9px 14px; border:none; border-radius:12px; color:white; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:opacity 0.15s,transform 0.1s; }
  .rp-dl-btn:active { transform:scale(0.96); opacity:0.9; }

  .rp-stats-strip { display:grid; gap:0; overflow:hidden; }
  .rp-stat-tile   { padding:14px 10px; text-align:center; border-right:1px solid #f1f5f9; }
  .rp-stat-tile:last-child { border-right:none; }
  .rp-stat-icon  { font-size:18px; margin-bottom:4px; }
  .rp-stat-val   { font-size:12px; font-weight:800; line-height:1.2; word-break:break-all; }
  .rp-stat-label { font-size:9px; color:#94a3b8; font-weight:600; margin-top:3px; text-transform:uppercase; letter-spacing:0.3px; }

  .rp-section-title { font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin:16px 16px 10px; }

  .rp-chips-row { display:flex; flex-wrap:wrap; gap:6px; padding:0 16px 14px; }
  .rp-chip { font-size:11px; font-weight:600; padding:5px 12px; border-radius:20px; background:#f1f5f9; color:#475569; }

  .rp-tenant-row  { margin:0 16px 8px; padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; }
  .rp-tr-left     { display:flex; align-items:center; gap:10px; }
  .rp-tr-avatar   { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:14px; }
  .rp-tr-name     { font-size:13px; font-weight:700; color:#1e293b; }
  .rp-tr-sub      { font-size:10px; color:#94a3b8; margin-top:2px; }
  .rp-tr-right    { text-align:right; flex-shrink:0; }
  .rp-tr-amount   { font-size:14px; font-weight:800; }
  .rp-tr-tag      { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; margin-top:3px; display:inline-block; }

  .rp-payment-row { margin:0 16px 6px; padding:12px; background:#f8fafc; border-radius:10px; display:flex; justify-content:space-between; align-items:center; }
  .rp-pr-name     { font-size:13px; font-weight:700; color:#1e293b; }
  .rp-pr-sub      { font-size:10px; color:#94a3b8; margin-top:2px; }
  .rp-pr-amount   { font-size:14px; font-weight:800; color:#059669; }
  .rp-pr-method   { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; background:#eef2ff; color:#4f46e5; margin-top:3px; display:inline-block; }

  .rp-occ-bar       { margin:0 16px 16px; }
  .rp-occ-bar-row   { display:flex; justify-content:space-between; font-size:12px; color:#64748b; margin-bottom:6px; }
  .rp-occ-bar-bg    { height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
  .rp-occ-bar-fill  { height:100%; border-radius:99px; transition:width 0.5s; }

  .rp-stay-scroll { display:flex; gap:6px; overflow-x:auto; padding:0 16px 12px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .rp-stay-scroll::-webkit-scrollbar { display:none; }
  .rp-stay-chip { white-space:nowrap; padding:6px 12px; border-radius:20px; border:1.5px solid #e2e8f0; background:white; font-size:11px; font-weight:600; color:#64748b; cursor:pointer; font-family:inherit; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
  .rp-stay-chip.active { background:#0891b2; color:white; border-color:#0891b2; }

  .rp-empty       { text-align:center; padding:40px 20px; }
  .rp-empty-icon  { font-size:40px; margin-bottom:10px; }
  .rp-empty-title { font-size:14px; font-weight:700; color:#94a3b8; }
  .rp-loading     { text-align:center; padding:50px; }
  .rp-spinner     { width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#e94560; border-radius:50%; animation:rpspin 0.7s linear infinite; margin:0 auto 12px; }
  @keyframes rpspin { to{transform:rotate(360deg)} }

  .rp-penalty-banner { margin:0 16px 12px; padding:10px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:12px; font-size:12px; color:#dc2626; font-weight:600; line-height:1.6; }
  .rp-pb { padding-bottom:16px; }

  .rp-no-pg { text-align:center; padding:60px 20px; background:white; border-radius:20px; margin:20px 16px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
`;

// ✅ Now accepts pgId, allPgIds, pgs, and ownerId props
export default function ReportsPage({ pgId, allPgIds, pgs, ownerId }) {
  const [tenants, setTenants]     = useState([]);
  const [rooms, setRooms]         = useState([]);
  const [payments, setPayments]   = useState([]);
  const [elecBills, setElecBills] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeReport, setActiveReport] = useState('rent');
  const [filterMonth, setFilterMonth]   = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [filterYear, setFilterYear]     = useState(new Date().getFullYear().toString());
  const [customStart, setCustomStart]   = useState('');
  const [customEnd, setCustomEnd]       = useState('');
  const [periodMode, setPeriodMode]     = useState('monthly');
  const [stayFilter, setStayFilter]     = useState('all');
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyAmount, setPenaltyAmount]   = useState(0);
  const [gracePeriod, setGracePeriod]       = useState(0);

  const user   = auth.currentUser;
  const effectiveOwnerId = ownerId || user?.uid;
  
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years  = ['2024','2025','2026','2027'];

  const fetchData = async () => {
    // ✅ Guard: need both user and pgId
    if (!user || !pgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const isAll = pgId === '__all__';

      const [tSnap, rSnap, pSnap, eSnap, oD] = await Promise.all([
        getDocs(query(collection(db, 'tenants'), where('ownerId', '==', effectiveOwnerId))),
        getDocs(query(collection(db, 'rooms'), where('ownerId', '==', effectiveOwnerId))),
        getDocs(query(collection(db, 'payments'), where('ownerId', '==', effectiveOwnerId))),
        getDocs(query(collection(db, 'electricityBills'), where('ownerId', '==', effectiveOwnerId))),
        getDoc(doc(db, 'pgOwners', effectiveOwnerId)),
      ]);

      const allT = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allR = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allP = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allE = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isAll) {
        setTenants(allT);
        setRooms(allR);
        setPayments(allP);
        setElecBills(allE);
      } else {
        const filterByPg = (item) => (item.pgId || effectiveOwnerId) === pgId;
        setTenants(allT.filter(filterByPg));
        setRooms(allR.filter(filterByPg));
        setPayments(allP.filter(filterByPg));
        setElecBills(allE.filter(filterByPg));
      }
      if (oD.exists()) {
        const d = oD.data();
        setPenaltyEnabled(d.penaltyEnabled || false);
        setPenaltyAmount(d.penaltyAmount || 0);
        setGracePeriod(d.gracePeriod || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ✅ Re-fetch whenever pgId changes
  useEffect(() => { fetchData(); }, [pgId]);

  const getPgName = (id) => pgs?.find(p => p.pgId === id || p.id === id)?.pgName || 'PG';

  const getDaysStayed = (t) => {
    const ci = t.checkIn ? new Date(t.checkIn) : null;
    if (!ci) return 0;
    const co = t.status === 'deleted' && t.deletedAt ? new Date(t.deletedAt) : new Date();
    return Math.max(0, Math.floor((co - ci) / (1000 * 60 * 60 * 24)));
  };
  const getDaysLabel = (d) => {
    if (!d) return '0 days';
    if (d < 7)  return `${d}d`;
    if (d < 30) { const w = Math.floor(d/7), r = d%7; return `${w}w${r ? ` ${r}d` : ''}`; }
    const m = Math.floor(d/30), r = d%30; return `${m}mo${r ? ` ${r}d` : ''}`;
  };
  const getCheckOut = (t) => t.status === 'deleted' && t.deletedAt
    ? new Date(t.deletedAt).toLocaleDateString('en-IN') : null;

  const getMonthStart = () => { const i = months.indexOf(filterMonth); return new Date(parseInt(filterYear), i, 1); };
  const getMonthEnd   = () => { const i = months.indexOf(filterMonth); return new Date(parseInt(filterYear), i + 1, 0); };

  const now = new Date();
  const isCurrentMonth = periodMode === 'monthly' &&
    filterMonth === now.toLocaleString('en-US', { month: 'long' }) &&
    filterYear  === now.getFullYear().toString();

  const getDaysDiff = (t) => {
    if (!t.checkIn) return 999;
    const dueDay = new Date(t.checkIn).getDate();
    const due    = new Date(today.getFullYear(), today.getMonth(), dueDay);
    return Math.floor((due - today) / (1000 * 60 * 60 * 24));
  };

  const getFilteredPayments = () => payments.filter(p => {
    if (periodMode === 'monthly') return p.month === filterMonth && p.year === filterYear;
    const pd = new Date(p.paymentDate);
    const s  = customStart ? new Date(customStart) : null;
    const e  = customEnd   ? new Date(customEnd)   : null;
    if (s && pd < s) return false;
    if (e && pd > e) return false;
    return true;
  }).sort((a, b) => {
    const at = a.recordedAt ? new Date(a.recordedAt) : new Date(a.paymentDate);
    const bt = b.recordedAt ? new Date(b.recordedAt) : new Date(b.paymentDate);
    return bt - at;
  });

  const getFilteredElec = () => elecBills.filter(b => {
    if (periodMode === 'monthly') return b.month === filterMonth && b.year === filterYear;
    const bd = new Date(b.readingDate);
    const s  = customStart ? new Date(customStart) : null;
    const e  = customEnd   ? new Date(customEnd)   : null;
    if (s && bd < s) return false;
    if (e && bd > e) return false;
    return true;
  });

  const getTenantsForPeriod = () => {
    if (periodMode !== 'monthly') return tenants.filter(t => t.status !== 'deleted');
    const ms = getMonthStart(), me = getMonthEnd();
    return tenants.filter(t => {
      if (!t.checkIn) return false;
      const ci = new Date(t.checkIn);
      if (ci > me) return false;
      if (t.status === 'deleted' && t.deletedAt && new Date(t.deletedAt) < ms) return false;
      return true;
    });
  };

  const getPeriodLabel = () => {
    if (periodMode === 'monthly') return `${filterMonth} ${filterYear}`;
    if (customStart && customEnd) return `${customStart} to ${customEnd}`;
    return 'Custom Period';
  };

  const rentPmts         = getFilteredPayments();
  const tenantsForPeriod = getTenantsForPeriod();

  const getTenantPenalty = (t) => {
    if (!penaltyEnabled) return 0;
    const completedPmt = rentPmts.find(p => p.tenantId === t.id && p.isCompleted === true);
    if (completedPmt) return completedPmt.penaltyAmount || 0;
    if (!isCurrentMonth) return 0;
    const d = getDaysDiff(t);
    if (d >= 0) return 0;
    return Math.max(0, Math.abs(d) - (gracePeriod || 0)) * (penaltyAmount || 0);
  };

  const getElecShareForTenant = (t) => {
    const bill = getFilteredElec().find(b => b.roomNumber === t.roomNumber);
    return bill ? Math.round((bill.amount || 0) / (bill.tenantCount || 1)) : 0;
  };

  const getTenantPaid = (tid)  => rentPmts.filter(p => p.tenantId === tid).reduce((a, p) => a + (p.amount || 0), 0);
  const getTenantDue  = (t)    => (t.monthlyRent || 0) + getElecShareForTenant(t) + getTenantPenalty(t);

  const totalCollected = rentPmts.reduce((a, p) => a + (p.amount || 0), 0);
  const totalExpected  = tenantsForPeriod.reduce((a, t) => a + getTenantDue(t), 0);
  const totalPenalty   = tenantsForPeriod.reduce((a, t) => a + getTenantPenalty(t), 0);
  const totalPending   = Math.max(0, totalExpected - totalCollected);

  const tenantStatus = tenantsForPeriod.map(t => {
    const paid   = getTenantPaid(t.id);
    const pen    = getTenantPenalty(t);
    const elec   = getElecShareForTenant(t);
    const due    = getTenantDue(t);
    const bal    = Math.max(0, due - paid);
    const cnt    = rentPmts.filter(p => p.tenantId === t.id).length;
    const status = paid >= due ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    const showPen = pen > 0;
    return { ...t, paid, pen, elec, due, bal, cnt, status, showPen };
  }).sort((a, b) => ({ unpaid:0, partial:1, paid:2 }[a.status] - ({ unpaid:0, partial:1, paid:2 }[b.status])));

  const paidCount    = tenantStatus.filter(t => t.status === 'paid').length;
  const partialCount = tenantStatus.filter(t => t.status === 'partial').length;
  const unpaidCount  = tenantStatus.filter(t => t.status === 'unpaid').length;
  const penTenants   = tenantStatus.filter(t => t.showPen);

  const elecFiltered    = getFilteredElec();
  const totalElecBilled = elecFiltered.reduce((a, b) => a + (b.amount || 0), 0);

  const activeTenants = tenants.filter(t => t.status !== 'deleted');
  const totalBeds     = rooms.reduce((a, r) => a + (r.totalBeds || 0), 0);
  const occupiedBeds  = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);
  const occupancyPct  = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const vacantRooms   = rooms.filter(r => (r.occupiedBeds || 0) < r.totalBeds);
  const totalVacant   = rooms.reduce((a, r) => a + Math.max(0, r.totalBeds - (r.occupiedBeds || 0)), 0);

  const allSorted = [...tenants].sort((a, b) => {
    const aD = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.checkIn || 0);
    const bD = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.checkIn || 0);
    return bD - aD;
  });
  const stayFilters = [{ id:'all', label:'All' }, { id:'1-3', label:'1–3d' }, { id:'week', label:'4–7d' }, { id:'month', label:'1–4w' }, { id:'long', label:'1m+' }];
  const historyTenants = allSorted.filter(t => {
    const d = getDaysStayed(t);
    if (stayFilter === 'all')   return true;
    if (stayFilter === '1-3')   return d >= 1 && d <= 3;
    if (stayFilter === 'week')  return d >= 4 && d <= 7;
    if (stayFilter === 'month') return d > 7  && d <= 30;
    if (stayFilter === 'long')  return d > 30;
    return true;
  });

  const downloadPDF = (type) => {
    const pdf    = new jsPDF();
    const period = getPeriodLabel();
    pdf.setFillColor(233, 69, 96); pdf.rect(0, 0, 210, 35, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
    pdf.text('PGpilots', 14, 15); pdf.setFontSize(12); pdf.setFont('helvetica', 'normal');
    pdf.text(`${type} Report — ${period}`, 14, 25); pdf.setTextColor(0, 0, 0);
    let y = 45;

    if (type === 'Rent Collection') {
      const stats = [
        { label:'Expected',  value:`Rs. ${totalExpected.toLocaleString('en-IN')}`,  color:[79,70,229],  bg:[238,242,255] },
        { label:'Collected', value:`Rs. ${totalCollected.toLocaleString('en-IN')}`, color:[5,150,105],  bg:[236,253,245] },
        { label:'Pending',   value:`Rs. ${totalPending.toLocaleString('en-IN')}`,   color:[220,38,38],  bg:[254,242,242] },
        { label:'Penalty',   value:`Rs. ${totalPenalty.toLocaleString('en-IN')}`,   color:[220,38,38],  bg:[254,242,242] },
        { label:'Payments',  value:`${rentPmts.length} total`,               color:[217,119,6],  bg:[255,251,235] },
      ];
      stats.forEach((s, i) => {
        const x = 14 + (i % 3) * 62, ry = i < 3 ? y : y + 38;
        pdf.setFillColor(...s.bg); pdf.rect(x, ry, 58, 30, 'F');
        pdf.setFontSize(9); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'normal');
        pdf.text(s.label, x + 4, ry + 10);
        pdf.setFontSize(12); pdf.setTextColor(...s.color); pdf.setFont('helvetica', 'bold');
        pdf.text(s.value, x + 4, ry + 22);
      });
      y += 80;
      if (penaltyEnabled && penTenants.length > 0) {
        pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(220, 38, 38);
        pdf.text(`Penalty Tenants (${penTenants.length})`, 14, y); y += 6;
        autoTable(pdf, { startY: y, head:[['Tenant','Room','Rent','Penalty','Total','Paid','Balance']], body: penTenants.map(t => [t.name, `Room ${t.roomNumber}`, `Rs.${(t.monthlyRent||0).toLocaleString('en-IN')}`, `Rs.${t.pen.toLocaleString('en-IN')}`, `Rs.${t.due.toLocaleString('en-IN')}`, `Rs.${t.paid.toLocaleString('en-IN')}`, `Rs.${t.bal.toLocaleString('en-IN')}`]), headStyles:{fillColor:[220,38,38],textColor:255}, alternateRowStyles:{fillColor:[254,242,242]}, styles:{fontSize:9} });
        y = pdf.lastAutoTable.finalY + 10;
      }
      pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
      pdf.text('Payment Details', 14, y); y += 6;
      autoTable(pdf, { startY: y, head:[['Tenant','Room','Amount','Method','Date','Type']], body: rentPmts.map(p => [p.tenantName, `Room ${p.roomNumber}`, `Rs.${p.amount?.toLocaleString('en-IN')}`, p.paymentMethod, p.paymentDate, p.isPartial ? 'Partial' : 'Full']), headStyles:{fillColor:[233,69,96],textColor:255}, alternateRowStyles:{fillColor:[248,250,252]}, styles:{fontSize:9} });
      const unpaid = tenantStatus.filter(t => t.status !== 'paid');
      if (unpaid.length > 0) {
        const fy = pdf.lastAutoTable.finalY + 10;
        pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(220, 38, 38);
        pdf.text('Pending Tenants', 14, fy);
        autoTable(pdf, { startY: fy + 6, head:[['Tenant','Room','Rent','Penalty','Paid','Balance','Status']], body: unpaid.map(t => [t.name, `Room ${t.roomNumber}`, `Rs.${(t.monthlyRent||0).toLocaleString('en-IN')}`, t.pen > 0 ? `Rs.${t.pen.toLocaleString('en-IN')}` : '-', `Rs.${t.paid.toLocaleString('en-IN')}`, `Rs.${t.bal.toLocaleString('en-IN')}`, t.status === 'partial' ? 'Partial' : 'Unpaid']), headStyles:{fillColor:[220,38,38],textColor:255}, alternateRowStyles:{fillColor:[254,242,242]}, styles:{fontSize:9} });
      }
    }
    if (type === 'Tenant History') {
      autoTable(pdf, { startY: y, head:[['Name','Room','Check-In','Check-Out','Days','Status']], body: historyTenants.map(t => [t.name, `Room ${t.roomNumber}`, t.checkIn||'-', getCheckOut(t)||'Still staying', getDaysLabel(getDaysStayed(t)), t.status==='deleted'?'Moved Out':'Active']), headStyles:{fillColor:[8,145,178],textColor:255}, alternateRowStyles:{fillColor:[248,250,252]}, styles:{fontSize:9} });
    }
    if (type === 'Electricity') {
      autoTable(pdf, { startY: y, head:[['Room','Month','Amount','Tenants','Reading Date','Status']], body: elecFiltered.map(b => [`Room ${b.roomNumber}`, `${b.month} ${b.year}`, `Rs.${b.amount?.toLocaleString('en-IN')}`, b.tenantCount||0, b.readingDate, b.isPaid?'Collected':'Pending']), headStyles:{fillColor:[217,119,6],textColor:255}, alternateRowStyles:{fillColor:[255,251,235]}, styles:{fontSize:9} });
    }
    if (type === 'Occupancy') {
      autoTable(pdf, { startY: y, head:[['Name','Room','Check-In','Rent','Phone']], body: activeTenants.map(t => [t.name, `Room ${t.roomNumber}`, t.checkIn, `Rs.${(t.monthlyRent||0).toLocaleString('en-IN')}`, t.phone||'-']), headStyles:{fillColor:[79,70,229],textColor:255}, alternateRowStyles:{fillColor:[248,250,252]}, styles:{fontSize:9} });
    }
    if (type === 'Vacant Rooms') {
      autoTable(pdf, { startY: y, head:[['Room','Floor','Type','Total','Occupied','Vacant','Rent/Bed']], body: vacantRooms.map(r => [`Room ${r.roomNumber}`, r.floor||'-', r.roomType||'-', r.totalBeds, r.occupiedBeds||0, r.totalBeds-(r.occupiedBeds||0), `Rs.${(r.rentPerBed||0).toLocaleString('en-IN')}`]), headStyles:{fillColor:[5,150,105],textColor:255}, alternateRowStyles:{fillColor:[236,253,245]}, styles:{fontSize:9} });
    }
    const pc = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
      pdf.text(`PGpilots • ${new Date().toLocaleDateString('en-IN')} • Page ${i}/${pc}`, 14, pdf.internal.pageSize.height - 10);
    }
    pdf.save(`${type}-${period}.pdf`);
  };

  const reportTypes = [
    { id:'rent',        label:'💰 Rent',       color:'#4f46e5', dlColor:'linear-gradient(135deg,#e94560,#0f3460)' },
    { id:'electricity', label:'⚡ Electricity', color:'#d97706', dlColor:'linear-gradient(135deg,#d97706,#b45309)' },
    { id:'occupancy',   label:'👥 Occupancy',   color:'#059669', dlColor:'linear-gradient(135deg,#059669,#0891b2)' },
    { id:'vacant',      label:'🛏️ Vacant',      color:'#dc2626', dlColor:'linear-gradient(135deg,#dc2626,#9f1239)' },
    { id:'history',     label:'📋 History',     color:'#0891b2', dlColor:'linear-gradient(135deg,#0891b2,#0f3460)' },
  ];
  const activeType = reportTypes.find(r => r.id === activeReport);

  const StatusTag = ({ status }) => {
    const cfg = status==='paid' ? { bg:'#dcfce7', color:'#059669', label:'✅ Paid' }
      : status==='partial'      ? { bg:'#fffbeb', color:'#d97706', label:'⚠️ Partial' }
      :                           { bg:'#fef2f2', color:'#dc2626', label:'❌ Unpaid' };
    return <span className="rp-tr-tag" style={{ background:cfg.bg, color:cfg.color }}>{cfg.label}</span>;
  };

  // ✅ Show warning if no PG selected
  if (!pgId) {
    return (
      <>
        <style>{css}</style>
        <div className="rp-no-pg">
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🏠</div>
          <div style={{ fontSize:'16px', fontWeight:'700', color:'#1e293b', marginBottom:'6px' }}>No PG Selected</div>
          <div style={{ fontSize:'13px', color:'#94a3b8' }}>Please select a PG from the dashboard.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="rp-root">
        <div className="rp-topbar">
          <div className="rp-topbar-row">
            <div>
              <h1 className="rp-page-title">Reports</h1>
              <p className="rp-page-sub">{getPeriodLabel()} · {activeType?.label}</p>
            </div>
          </div>
        </div>

        <div className="rp-content">
          <div className="rp-period-box">
            <div className="rp-period-seg">
              {[{ id:'monthly', label:'📅 Monthly' }, { id:'custom', label:'📆 Custom' }].map(({ id, label }) => (
                <button key={id} className={`rp-period-btn${periodMode===id?' active':''}`} onClick={() => setPeriodMode(id)}>{label}</button>
              ))}
            </div>
            {periodMode === 'monthly' && (
              <>
                <div className="rp-month-scroll">
                  {months.map(m => (
                    <button key={m} className={`rp-month-chip${filterMonth===m?' active':''}`} onClick={() => setFilterMonth(m)}>{m.slice(0, 3)}</button>
                  ))}
                </div>
                <div className="rp-year-row">
                  {years.map(y => (
                    <button key={y} className={`rp-year-chip${filterYear===y?' active':''}`} onClick={() => setFilterYear(y)}>{y}</button>
                  ))}
                </div>
              </>
            )}
            {periodMode === 'custom' && (
              <div className="rp-custom-row">
                <div><div className="rp-custom-label">From</div><input className="rp-custom-input" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div>
                <div><div className="rp-custom-label">To</div><input className="rp-custom-input" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>
              </div>
            )}
          </div>

          <div className="rp-type-scroll">
            {reportTypes.map(({ id, label, color }) => (
              <button key={id} className="rp-type-chip"
                style={{ background:activeReport===id?color:'white', color:activeReport===id?'white':'#64748b', borderColor:activeReport===id?color:'#e2e8f0' }}
                onClick={() => setActiveReport(id)}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="rp-loading"><div className="rp-spinner" />Loading…</div>
          ) : (
            <>
              {/* RENT */}
              {activeReport === 'rent' && (
                <div className="rp-card">
                  <div className="rp-card-header">
                    <div><div className="rp-card-title">💰 Rent Collection</div><div className="rp-card-period">{getPeriodLabel()}</div></div>
                    <button className="rp-dl-btn" style={{ background:activeType.dlColor }} onClick={() => downloadPDF('Rent Collection')}>⬇️ PDF</button>
                  </div>
                  <div className="rp-stats-strip" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
                    {[
                      { icon:'💰', label:'Expected',  val:`₹${totalExpected.toLocaleString('en-IN')}`,  color:'#4f46e5' },
                      { icon:'✅', label:'Collected',  val:`₹${totalCollected.toLocaleString('en-IN')}`, color:'#059669' },
                      { icon:'⏳', label:'Pending',    val:`₹${totalPending.toLocaleString('en-IN')}`,   color:'#dc2626' },
                      { icon:'🔴', label:'Penalty',    val:`₹${totalPenalty.toLocaleString('en-IN')}`,   color:penaltyEnabled?'#dc2626':'#94a3b8' },
                      { icon:'📋', label:'Payments',   val:rentPmts.length,                       color:'#d97706' },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} className="rp-stat-tile"><div className="rp-stat-icon">{icon}</div><div className="rp-stat-val" style={{ color }}>{val}</div><div className="rp-stat-label">{label}</div></div>
                    ))}
                  </div>
                  <div className="rp-chips-row">
                    <span className="rp-chip">✅ {paidCount} paid</span>
                    <span className="rp-chip">⚠️ {partialCount} partial</span>
                    <span className="rp-chip">❌ {unpaidCount} unpaid</span>
                    <span className="rp-chip">📋 {rentPmts.filter(p => !p.isPartial).length} full payments</span>
                    <span className="rp-chip">⚠️ {rentPmts.filter(p => p.isPartial).length} partial payments</span>
                  </div>
                  {penaltyEnabled && penTenants.length > 0 && (
                    <div className="rp-penalty-banner">🔴 {penTenants.length} tenant{penTenants.length!==1?'s':''} with late penalty · Total ₹{totalPenalty.toLocaleString('en-IN')}</div>
                  )}
                  <div className="rp-section-title">👥 Tenant Breakdown ({tenantStatus.length})</div>
                  {tenantStatus.map(t => (
                    <div key={t.id} className="rp-tenant-row" style={{ background:t.status==='paid'?'#f0fdf4':t.status==='partial'?'#fffbeb':'#fef2f2', borderLeft:`3px solid ${t.status==='paid'?'#059669':t.status==='partial'?'#d97706':'#dc2626'}` }}>
                      <div className="rp-tr-left">
                        <div className="rp-tr-avatar" style={{ background:t.status==='paid'?'linear-gradient(135deg,#059669,#0891b2)':t.status==='partial'?'linear-gradient(135deg,#d97706,#b45309)':'linear-gradient(135deg,#dc2626,#9f1239)' }}>{t.name?.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="rp-tr-name">{t.name}</div>
                          <div className="rp-tr-sub">Room {t.roomNumber} · {t.cnt} payment{t.cnt!==1?'s':''}{t.elec>0&&<span style={{color:'#0891b2'}}> · ⚡ ₹{t.elec.toLocaleString('en-IN')}</span>}{t.showPen&&<span style={{color:'#dc2626'}}> · 🔴 ₹{t.pen.toLocaleString('en-IN')}</span>}</div>
                          {pgId === '__all__' && <div className="rp-tr-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(t.pgId)}</div>}
                        </div>
                      </div>
                      <div className="rp-tr-right">
                        <div className="rp-tr-amount" style={{ color:t.status==='paid'?'#059669':t.status==='partial'?'#d97706':'#dc2626' }}>₹{t.status==='paid'?t.due.toLocaleString('en-IN'):t.bal.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize:'9px', color:'#94a3b8', marginTop:'2px' }}>{t.status==='paid'?'paid':`of ₹${t.due.toLocaleString('en-IN')}`}</div>
                        <StatusTag status={t.status} />
                      </div>
                    </div>
                  ))}
                  <div className="rp-section-title">📋 All Payments ({rentPmts.length})</div>
                  {rentPmts.length === 0 ? (
                    <div className="rp-empty rp-pb"><div className="rp-empty-icon">📋</div><div className="rp-empty-title">No payments this period</div></div>
                  ) : (
                    <div className="rp-pb">
                      {rentPmts.map(p => (
                        <div key={p.id} className="rp-payment-row" style={{ background:p.isCompleted?'#f0fdf4':p.isPartial?'#fffbeb':'#f8fafc' }}>
                          <div>
                            <div className="rp-pr-name">{p.tenantName}</div>
                            <div className="rp-pr-sub">Room {p.roomNumber} · {p.paymentDate}{p.paymentTime&&` · ${p.paymentTime}`}</div>
                            {pgId === '__all__' && <div className="rp-pr-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(p.pgId)}</div>}
                          </div>
                          <div style={{ textAlign:'right' }}><div className="rp-pr-amount" style={{ color:p.isCompleted?'#059669':p.isPartial?'#d97706':'#4f46e5' }}>₹{p.amount?.toLocaleString('en-IN')}</div><div className="rp-pr-method">{p.paymentMethod}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ELECTRICITY */}
              {activeReport === 'electricity' && (
                <div className="rp-card">
                  <div className="rp-card-header">
                    <div><div className="rp-card-title">⚡ Electricity Bills</div><div className="rp-card-period">{getPeriodLabel()}</div></div>
                    <button className="rp-dl-btn" style={{ background:activeType.dlColor }} onClick={() => downloadPDF('Electricity')}>⬇️ PDF</button>
                  </div>
                  <div className="rp-stats-strip" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
                    {[
                      { icon:'⚡', label:'Billed',    val:`₹${totalElecBilled.toLocaleString('en-IN')}`,    color:'#d97706' },
                      { icon:'🏠', label:'Rooms',     val:elecFiltered.length,                        color:'#4f46e5' },
                      { icon:'✅', label:'Collected', val:elecFiltered.filter(b=>b.isPaid).length,    color:'#059669' },
                      { icon:'⏳', label:'Pending',   val:elecFiltered.filter(b=>!b.isPaid).length,   color:'#dc2626' },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} className="rp-stat-tile"><div className="rp-stat-icon">{icon}</div><div className="rp-stat-val" style={{ color }}>{val}</div><div className="rp-stat-label">{label}</div></div>
                    ))}
                  </div>
                  <div className="rp-section-title">⚡ Bill Details</div>
                  {elecFiltered.length === 0 ? (
                    <div className="rp-empty rp-pb"><div className="rp-empty-icon">⚡</div><div className="rp-empty-title">No bills this period</div></div>
                  ) : (
                    <div className="rp-pb">
                      {elecFiltered.map(b => (
                        <div key={b.id} className="rp-payment-row" style={{ background:b.isPaid?'#f0fdf4':'#fffbeb' }}>
                          <div>
                            <div className="rp-pr-name">Room {b.roomNumber}</div>
                            <div className="rp-pr-sub">{b.month} {b.year} · {b.tenantCount} tenants · {b.readingDate}</div>
                            {b.notes&&<div className="rp-pr-sub">📝 {b.notes}</div>}
                            {pgId === '__all__' && <div className="rp-pr-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(b.pgId)}</div>}
                          </div>
                          <div style={{ textAlign:'right' }}><div className="rp-pr-amount" style={{ color:'#d97706' }}>₹{b.amount?.toLocaleString('en-IN')}</div><span className="rp-tr-tag" style={{ background:b.isPaid?'#dcfce7':'#fef2f2', color:b.isPaid?'#059669':'#dc2626' }}>{b.isPaid?'✅ Done':'⏳ Pending'}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OCCUPANCY */}
              {activeReport === 'occupancy' && (
                <div className="rp-card">
                  <div className="rp-card-header">
                    <div><div className="rp-card-title">👥 Occupancy Report</div><div className="rp-card-period">Current Status</div></div>
                    <button className="rp-dl-btn" style={{ background:activeType.dlColor }} onClick={() => downloadPDF('Occupancy')}>⬇️ PDF</button>
                  </div>
                  <div className="rp-stats-strip" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
                    {[
                      { icon:'🛏️', label:'Total Beds', val:totalBeds,            color:'#4f46e5' },
                      { icon:'✅', label:'Occupied',   val:occupiedBeds,          color:'#059669' },
                      { icon:'🔴', label:'Vacant',     val:totalBeds-occupiedBeds, color:'#dc2626' },
                      { icon:'📊', label:'Rate',       val:`${occupancyPct}%`,    color:'#d97706' },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} className="rp-stat-tile"><div className="rp-stat-icon">{icon}</div><div className="rp-stat-val" style={{ color }}>{val}</div><div className="rp-stat-label">{label}</div></div>
                    ))}
                  </div>
                  <div className="rp-occ-bar">
                    <div className="rp-occ-bar-row"><span>Occupancy Rate</span><span style={{ color:'#059669', fontWeight:'800' }}>{occupancyPct}%</span></div>
                    <div className="rp-occ-bar-bg"><div className="rp-occ-bar-fill" style={{ width:`${occupancyPct}%`, background:occupancyPct>=80?'#059669':occupancyPct>=50?'#d97706':'#dc2626' }}/></div>
                  </div>
                  <div className="rp-section-title">👥 Active Tenants ({activeTenants.length})</div>
                  <div className="rp-pb">
                    {activeTenants.map(t => (
                      <div key={t.id} className="rp-tenant-row" style={{ background:'#f0fdf4', borderLeft:'3px solid #059669' }}>
                        <div className="rp-tr-left">
                          <div className="rp-tr-avatar" style={{ background:'linear-gradient(135deg,#4f46e5,#0891b2)' }}>{t.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="rp-tr-name">{t.name}</div>
                            <div className="rp-tr-sub">Room {t.roomNumber} · {t.checkIn||'—'}</div>
                            {pgId === '__all__' && <div className="rp-tr-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(t.pgId)}</div>}
                          </div>
                        </div>
                        <div className="rp-tr-right"><div className="rp-tr-amount" style={{ color:'#4f46e5' }}>₹{(t.monthlyRent||0).toLocaleString('en-IN')}</div><div style={{ fontSize:'9px', color:'#94a3b8' }}>per month</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VACANT */}
              {activeReport === 'vacant' && (
                <div className="rp-card">
                  <div className="rp-card-header">
                    <div><div className="rp-card-title">🛏️ Vacant Rooms</div><div className="rp-card-period">Current Status</div></div>
                    <button className="rp-dl-btn" style={{ background:activeType.dlColor }} onClick={() => downloadPDF('Vacant Rooms')}>⬇️ PDF</button>
                  </div>
                  <div className="rp-stats-strip" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
                    {[
                      { icon:'🏠', label:'Total Rooms',  val:rooms.length,      color:'#4f46e5' },
                      { icon:'🔴', label:'Vacant Rooms', val:vacantRooms.length, color:'#dc2626' },
                      { icon:'🛏️', label:'Vacant Beds',  val:totalVacant,        color:'#d97706' },
                      { icon:'💸', label:'Rev. Lost',    val:`₹${vacantRooms.reduce((a,r)=>a+((r.totalBeds-(r.occupiedBeds||0))*(r.rentPerBed||0)),0).toLocaleString('en-IN')}`, color:'#dc2626' },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} className="rp-stat-tile"><div className="rp-stat-icon">{icon}</div><div className="rp-stat-val" style={{ color }}>{val}</div><div className="rp-stat-label">{label}</div></div>
                    ))}
                  </div>
                  <div className="rp-section-title">🛏️ Rooms with Vacant Beds</div>
                  {vacantRooms.length === 0 ? (
                    <div className="rp-empty rp-pb"><div className="rp-empty-icon">🎉</div><div className="rp-empty-title" style={{ color:'#059669' }}>All beds are occupied!</div></div>
                  ) : (
                    <div className="rp-pb">
                      {vacantRooms.map(r => {
                        const vacant = r.totalBeds - (r.occupiedBeds || 0);
                        return (
                          <div key={r.id} className="rp-tenant-row" style={{ background:'#fef2f2', borderLeft:'3px solid #dc2626' }}>
                            <div className="rp-tr-left">
                              <div className="rp-tr-avatar" style={{ background:'linear-gradient(135deg,#dc2626,#9f1239)' }}>{r.roomNumber}</div>
                              <div>
                                <div className="rp-tr-name">Room {r.roomNumber}</div>
                                <div className="rp-tr-sub">{r.floor||'—'} · {r.roomType} · {r.bathType} · {r.acType}</div>
                                {pgId === '__all__' && <div className="rp-tr-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(r.pgId)}</div>}
                              </div>
                            </div>
                            <div className="rp-tr-right">
                              <div className="rp-tr-amount" style={{ color:'#dc2626' }}>🔴 {vacant} vacant</div>
                              <div style={{ fontSize:'9px', color:'#94a3b8' }}>of {r.totalBeds} beds</div>
                              <div style={{ fontSize:'11px', color:'#4f46e5', fontWeight:'700', marginTop:'2px' }}>₹{(r.rentPerBed||0).toLocaleString('en-IN')}/bed</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* HISTORY */}
              {activeReport === 'history' && (
                <div className="rp-card">
                  <div className="rp-card-header">
                    <div><div className="rp-card-title">📋 Tenant History</div><div className="rp-card-period">{historyTenants.length} records</div></div>
                    <button className="rp-dl-btn" style={{ background:activeType.dlColor }} onClick={() => downloadPDF('Tenant History')}>⬇️ PDF</button>
                  </div>
                  <div className="rp-stats-strip" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
                    {[
                      { icon:'👥', label:'Total',     val:tenants.length,                                    color:'#4f46e5' },
                      { icon:'✅', label:'Active',    val:activeTenants.length,                              color:'#059669' },
                      { icon:'🚪', label:'Moved Out', val:tenants.filter(t=>t.status==='deleted').length,   color:'#dc2626' },
                      { icon:'📅', label:'Avg Stay',  val:(() => { const m = tenants.filter(t=>t.status==='deleted'); if (!m.length) return '—'; return getDaysLabel(Math.round(m.reduce((a,t)=>a+getDaysStayed(t),0)/m.length)); })(), color:'#d97706' },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} className="rp-stat-tile"><div className="rp-stat-icon">{icon}</div><div className="rp-stat-val" style={{ color }}>{val}</div><div className="rp-stat-label">{label}</div></div>
                    ))}
                  </div>
                  <div className="rp-stay-scroll">
                    {stayFilters.map(({ id, label }) => (
                      <button key={id} className={`rp-stay-chip${stayFilter===id?' active':''}`} onClick={() => setStayFilter(id)}>{label}</button>
                    ))}
                  </div>
                  <div className="rp-section-title">Records ({historyTenants.length})</div>
                  {historyTenants.length === 0 ? (
                    <div className="rp-empty rp-pb"><div className="rp-empty-icon">📋</div><div className="rp-empty-title">No records found</div></div>
                  ) : (
                    <div className="rp-pb">
                      {historyTenants.map(t => {
                        const days = getDaysStayed(t), co = getCheckOut(t), out = t.status === 'deleted';
                        return (
                          <div key={t.id} className="rp-tenant-row" style={{ background:out?'#fafafa':'#f8fafc', borderLeft:`3px solid ${out?'#dc2626':'#059669'}`, opacity:out?0.9:1 }}>
                            <div className="rp-tr-left">
                              <div className="rp-tr-avatar" style={{ background:out?'linear-gradient(135deg,#dc2626,#9f1239)':'linear-gradient(135deg,#059669,#0891b2)' }}>{t.name?.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="rp-tr-name">{t.name}</div>
                                <div className="rp-tr-sub">Room {t.roomNumber} · In: {t.checkIn||'—'}{co&&<span style={{color:'#dc2626'}}> · Out: {co}</span>}</div>
                                {pgId === '__all__' && <div className="rp-tr-sub" style={{ color: '#0f3460', fontWeight: '800', marginTop: '2px' }}>🏠 {getPgName(t.pgId)}</div>}
                              </div>
                            </div>
                            <div className="rp-tr-right">
                              <div className="rp-tr-amount" style={{ color:'#4f46e5', fontSize:'13px' }}>{getDaysLabel(days)}</div>
                              <span className="rp-tr-tag" style={{ background:out?'#fef2f2':'#ecfdf5', color:out?'#dc2626':'#059669' }}>{out?'🚪 Moved Out':'✅ Active'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}