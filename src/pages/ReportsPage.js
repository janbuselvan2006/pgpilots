import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ReportsPage() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [elecBills, setElecBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('rent');
  const [filterMonth, setFilterMonth] = useState(
    new Date().toLocaleString('default', { month: 'long' })
  );
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString()
  );
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [periodMode, setPeriodMode] = useState('monthly');
  const [stayFilter, setStayFilter] = useState('all');

  // Penalty settings loaded from Firestore
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [gracePeriod, setGracePeriod] = useState(0);

  const user = auth.currentUser;
  const today = new Date();
  today.setHours(0,0,0,0);

  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const tq = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
      const tSnap = await getDocs(tq);
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const rq = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
      const rSnap = await getDocs(rq);
      setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const pq = query(collection(db, 'payments'), where('ownerId', '==', user.uid));
      const pSnap = await getDocs(pq);
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const eq = query(collection(db, 'electricityBills'), where('ownerId', '==', user.uid));
      const eSnap = await getDocs(eq);
      setElecBills(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load penalty settings
      const ownerDoc = await getDoc(doc(db, 'pgOwners', user.uid));
      if (ownerDoc.exists()) {
        const data = ownerDoc.data();
        setPenaltyEnabled(data.penaltyEnabled || false);
        setPenaltyAmount(data.penaltyAmount || 0);
        setGracePeriod(data.gracePeriod || 0);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Days stayed
  const getDaysStayed = (tenant) => {
    const checkIn = tenant.checkIn ? new Date(tenant.checkIn) : null;
    if (!checkIn) return 0;
    const checkOut = tenant.status === 'deleted' && tenant.deletedAt
      ? new Date(tenant.deletedAt) : new Date();
    return Math.max(0, Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
  };

  const getDaysLabel = (days) => {
    if (days === 0) return '0 days';
    if (days < 7) return `${days} day${days > 1 ? 's' : ''}`;
    if (days < 30) {
      const w = Math.floor(days / 7), d = days % 7;
      return `${w} week${w > 1 ? 's' : ''}${d > 0 ? ` ${d}d` : ''}`;
    }
    const m = Math.floor(days / 30), d = days % 30;
    return `${m} month${m > 1 ? 's' : ''}${d > 0 ? ` ${d}d` : ''}`;
  };

  const getCheckOutDate = (tenant) => {
    if (tenant.status === 'deleted' && tenant.deletedAt)
      return new Date(tenant.deletedAt).toLocaleDateString('en-IN');
    return null;
  };

  const getFilteredPayments = () => {
    return payments.filter(p => {
      if (periodMode === 'monthly') return p.month === filterMonth && p.year === filterYear;
      const pd = new Date(p.paymentDate);
      const start = customStart ? new Date(customStart) : null;
      const end = customEnd ? new Date(customEnd) : null;
      if (start && pd < start) return false;
      if (end && pd > end) return false;
      return true;
    }).sort((a, b) => {
      const aTime = a.recordedAt ? new Date(a.recordedAt) : new Date(a.paymentDate);
      const bTime = b.recordedAt ? new Date(b.recordedAt) : new Date(b.paymentDate);
      return bTime - aTime;
    });
  };

  const getFilteredElecBills = () => {
    return elecBills.filter(b => {
      if (periodMode === 'monthly') return b.month === filterMonth && b.year === filterYear;
      const bd = new Date(b.readingDate);
      const start = customStart ? new Date(customStart) : null;
      const end = customEnd ? new Date(customEnd) : null;
      if (start && bd < start) return false;
      if (end && bd > end) return false;
      return true;
    });
  };

  const getPeriodLabel = () => {
    if (periodMode === 'monthly') return `${filterMonth} ${filterYear}`;
    if (customStart && customEnd) return `${customStart} to ${customEnd}`;
    return 'Custom Period';
  };

  const activeTenants = tenants.filter(t => t.status !== 'deleted');

  // ─── PERIOD HELPERS ───
  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });
  const currentYearStr = now.getFullYear().toString();

  const isCurrentMonth = periodMode === 'monthly'
    && filterMonth === currentMonthName
    && filterYear === currentYearStr;

  // Get the last day of selected month/year
  const getSelectedMonthEnd = () => {
    const monthIndex = ['January','February','March','April','May','June',
      'July','August','September','October','November','December']
      .indexOf(filterMonth);
    return new Date(parseInt(filterYear), monthIndex + 1, 0); // last day of month
  };

  // Get the first day of selected month/year
  const getSelectedMonthStart = () => {
    const monthIndex = ['January','February','March','April','May','June',
      'July','August','September','October','November','December']
      .indexOf(filterMonth);
    return new Date(parseInt(filterYear), monthIndex, 1);
  };

  // Tenants who were active DURING the selected month
  // = checked in on or before end of that month
  // AND (still active OR moved out after start of that month)
  const getTenantsForSelectedMonth = () => {
    if (periodMode !== 'monthly') return activeTenants;
    const monthEnd = getSelectedMonthEnd();
    const monthStart = getSelectedMonthStart();
    return tenants.filter(t => {
      if (!t.checkIn) return false;
      const checkIn = new Date(t.checkIn);
      if (checkIn > monthEnd) return false; // checked in after selected month
      if (t.status === 'deleted' && t.deletedAt) {
        const movedOut = new Date(t.deletedAt);
        if (movedOut < monthStart) return false; // moved out before selected month
      }
      return true;
    });
  };

  // ─── PENALTY CALC ───
  // Penalty only applies when viewing CURRENT month
  // For past months, penalty was collected as part of payment — don't recalculate
  const getDaysDiff = (tenant) => {
    if (!tenant.checkIn) return 999;
    const checkIn = new Date(tenant.checkIn);
    const dueDay = checkIn.getDate();
    const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    return Math.floor((thisMonthDue - today) / (1000 * 60 * 60 * 24));
  };

  const getTenantPenalty = (tenant) => {
    if (!penaltyEnabled) return 0;
    if (!isCurrentMonth) return 0; // ✅ past/future months = NO penalty
    const daysDiff = getDaysDiff(tenant);
    if (daysDiff >= 0) return 0;
    const overdueDays = Math.abs(daysDiff);
    const penaltyDays = Math.max(0, overdueDays - (gracePeriod || 0));
    return penaltyDays * (penaltyAmount || 0);
  };

  // ─── RENT REPORT ───
  const rentPayments = getFilteredPayments();

  // Tenants for this selected month (not just current active)
  const tenantsForPeriod = getTenantsForSelectedMonth();

  // Total collected this period
  const totalRentCollected = rentPayments.reduce((a, p) => a + (p.amount || 0), 0);

  // Per-tenant paid amount this period
  const getTenantPaidThisPeriod = (tenantId) => {
    return rentPayments
      .filter(p => p.tenantId === tenantId)
      .reduce((a, p) => a + (p.amount || 0), 0);
  };

  // Per-tenant total due = rent + penalty (penalty only for current month)
  const getTenantTotalDue = (tenant) => {
    return (tenant.monthlyRent || 0) + getTenantPenalty(tenant);
  };

  // ✅ Expected = tenants who were active THAT month × their rent
  // ✅ Penalty only added for current month
  const totalRentExpected = tenantsForPeriod.reduce((a, t) => a + getTenantTotalDue(t), 0);
  const totalPenaltyAmount = tenantsForPeriod.reduce((a, t) => a + getTenantPenalty(t), 0);
  const totalPending = Math.max(0, totalRentExpected - totalRentCollected);

  // Payment counts
  const fullPayments = rentPayments.filter(p => !p.isPartial).length;
  const partialPayments = rentPayments.filter(p => p.isPartial).length;

  // Tenant wise status for report
  const tenantRentStatus = tenantsForPeriod.map(tenant => {
    const paid = getTenantPaidThisPeriod(tenant.id);
    const penalty = getTenantPenalty(tenant);
    const totalDue = getTenantTotalDue(tenant);
    const balance = Math.max(0, totalDue - paid);
    const paymentCount = rentPayments.filter(p => p.tenantId === tenant.id).length;
    let status = 'unpaid';
    if (paid >= totalDue) status = 'paid';
    else if (paid > 0) status = 'partial';
    return { ...tenant, paid, penalty, totalDue, balance, paymentCount, status };
  }).sort((a, b) => {
    const order = { unpaid: 0, partial: 1, paid: 2 };
    return order[a.status] - order[b.status];
  });

  const paidCount = tenantRentStatus.filter(t => t.status === 'paid').length;
  const partialCount = tenantRentStatus.filter(t => t.status === 'partial').length;
  const unpaidCount = tenantRentStatus.filter(t => t.status === 'unpaid').length;
  const penaltyTenants = tenantRentStatus.filter(t => t.penalty > 0);

  // ─── ELECTRICITY ───
  const elecBillsFiltered = getFilteredElecBills();
  const totalElecBilled = elecBillsFiltered.reduce((a, b) => a + (b.amount || 0), 0);

  // ─── OCCUPANCY ───
  const totalBeds = rooms.reduce((a, r) => a + (r.totalBeds || 0), 0);
  const occupiedBeds = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const vacantRooms = rooms.filter(r => (r.occupiedBeds || 0) < r.totalBeds);
  const totalVacantBeds = rooms.reduce((a, r) => a + Math.max(0, r.totalBeds - (r.occupiedBeds || 0)), 0);

  // ─── TENANT HISTORY ───
  const allTenantsSorted = [...tenants].sort((a, b) => {
    const aDate = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.checkIn || 0);
    const bDate = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.checkIn || 0);
    return bDate - aDate;
  });

  const stayFilters = [
    { id: 'all', label: '👥 All' },
    { id: '1-3', label: '1–3 Days' },
    { id: 'week', label: '4–7 Days' },
    { id: 'month', label: '1–4 Weeks' },
    { id: 'long', label: '1+ Month' },
  ];

  const historyTenants = allTenantsSorted.filter(t => {
    const days = getDaysStayed(t);
    if (stayFilter === 'all') return true;
    if (stayFilter === '1-3') return days >= 1 && days <= 3;
    if (stayFilter === 'week') return days >= 4 && days <= 7;
    if (stayFilter === 'month') return days > 7 && days <= 30;
    if (stayFilter === 'long') return days > 30;
    return true;
  });

  // ─── PDF ───
  const downloadPDF = (reportType) => {
    const pdf = new jsPDF();
    const period = getPeriodLabel();
    pdf.setFillColor(233, 69, 96);
    pdf.rect(0, 0, 210, 35, 'F');
    pdf.setTextColor(255,255,255);
    pdf.setFontSize(20); pdf.setFont('helvetica','bold');
    pdf.text('PG Manager', 14, 15);
    pdf.setFontSize(12); pdf.setFont('helvetica','normal');
    pdf.text(`${reportType} Report — ${period}`, 14, 25);
    pdf.setTextColor(0,0,0);
    let y = 45;

    if (reportType === 'Rent Collection') {
      // Stat boxes
      const stats = [
        { label: 'Expected', value: `Rs. ${totalRentExpected.toLocaleString()}`, color: [79,70,229], bg: [238,242,255] },
        { label: 'Collected', value: `Rs. ${totalRentCollected.toLocaleString()}`, color: [5,150,105], bg: [236,253,245] },
        { label: 'Pending', value: `Rs. ${totalPending.toLocaleString()}`, color: [220,38,38], bg: [254,242,242] },
        { label: 'Penalty', value: `Rs. ${totalPenaltyAmount.toLocaleString()}`, color: [220,38,38], bg: [254,242,242] },
        { label: 'Payments', value: `${rentPayments.length} total`, color: [217,119,6], bg: [255,251,235] },
      ];
      stats.forEach((s, i) => {
        const x = 14 + (i % 3) * 62;
        const rowY = i < 3 ? y : y + 38;
        pdf.setFillColor(...s.bg);
        pdf.rect(x, rowY, 58, 30, 'F');
        pdf.setFontSize(9); pdf.setTextColor(100,100,100); pdf.setFont('helvetica','normal');
        pdf.text(s.label, x+4, rowY+10);
        pdf.setFontSize(12); pdf.setTextColor(...s.color); pdf.setFont('helvetica','bold');
        pdf.text(s.value, x+4, rowY+22);
      });
      y += 80;

      // Penalty tenants
      if (penaltyEnabled && penaltyTenants.length > 0) {
        pdf.setFontSize(12); pdf.setFont('helvetica','bold'); pdf.setTextColor(220,38,38);
        pdf.text(`Penalty Tenants (${penaltyTenants.length})`, 14, y); y += 6;
        autoTable(pdf, {
          startY: y,
          head: [['Tenant','Room','Base Rent','Penalty','Total Due','Paid','Balance']],
          body: penaltyTenants.map(t => [
            t.name, `Room ${t.roomNumber}`,
            `Rs. ${(t.monthlyRent||0).toLocaleString()}`,
            `Rs. ${t.penalty.toLocaleString()}`,
            `Rs. ${t.totalDue.toLocaleString()}`,
            `Rs. ${t.paid.toLocaleString()}`,
            `Rs. ${t.balance.toLocaleString()}`,
          ]),
          headStyles: { fillColor: [220,38,38], textColor: 255 },
          alternateRowStyles: { fillColor: [254,242,242] },
          styles: { fontSize: 9 },
        });
        y = pdf.lastAutoTable.finalY + 10;
      }

      pdf.setFontSize(12); pdf.setFont('helvetica','bold'); pdf.setTextColor(0,0,0);
      pdf.text('Payment Details', 14, y); y += 6;
      autoTable(pdf, {
        startY: y,
        head: [['Tenant','Room','Amount','Method','Date','Type']],
        body: rentPayments.map(p => [
          p.tenantName, `Room ${p.roomNumber}`,
          `Rs. ${p.amount?.toLocaleString()}`,
          p.paymentMethod, p.paymentDate,
          p.isPartial ? 'Partial' : 'Full',
        ]),
        headStyles: { fillColor: [233,69,96], textColor: 255 },
        alternateRowStyles: { fillColor: [248,250,252] },
        styles: { fontSize: 9 },
      });

      const unpaid = tenantRentStatus.filter(t => t.status !== 'paid');
      if (unpaid.length > 0) {
        const fy = pdf.lastAutoTable.finalY + 10;
        pdf.setFontSize(12); pdf.setFont('helvetica','bold'); pdf.setTextColor(220,38,38);
        pdf.text('Pending / Partial Tenants', 14, fy);
        autoTable(pdf, {
          startY: fy + 6,
          head: [['Tenant','Room','Rent','Penalty','Paid','Balance','Status']],
          body: unpaid.map(t => [
            t.name, `Room ${t.roomNumber}`,
            `Rs. ${(t.monthlyRent||0).toLocaleString()}`,
            t.penalty > 0 ? `Rs. ${t.penalty.toLocaleString()}` : '-',
            `Rs. ${t.paid.toLocaleString()}`,
            `Rs. ${t.balance.toLocaleString()}`,
            t.status === 'partial' ? 'Partial' : 'Unpaid',
          ]),
          headStyles: { fillColor: [220,38,38], textColor: 255 },
          alternateRowStyles: { fillColor: [254,242,242] },
          styles: { fontSize: 9 },
        });
      }
    }

    if (reportType === 'Tenant History') {
      pdf.setFontSize(12); pdf.setTextColor(0,0,0); pdf.setFont('helvetica','bold');
      pdf.text(`Total Records: ${historyTenants.length}`, 14, y); y += 10;
      autoTable(pdf, {
        startY: y,
        head: [['Name','Room','Check-In','Check-Out','Days Stayed','Status']],
        body: historyTenants.map(t => [
          t.name, `Room ${t.roomNumber}`, t.checkIn || '-',
          getCheckOutDate(t) || 'Still staying',
          getDaysLabel(getDaysStayed(t)),
          t.status === 'deleted' ? 'Moved Out' : 'Active',
        ]),
        headStyles: { fillColor: [8,145,178], textColor: 255 },
        alternateRowStyles: { fillColor: [248,250,252] },
        styles: { fontSize: 9 },
      });
    }

    if (reportType === 'Electricity') {
      pdf.setFillColor(255,251,235);
      pdf.rect(14, y, 85, 30, 'F');
      pdf.setFontSize(10); pdf.setTextColor(100,100,100);
      pdf.text('Total Billed', 18, y+10);
      pdf.setFontSize(14); pdf.setTextColor(217,119,6); pdf.setFont('helvetica','bold');
      pdf.text(`Rs. ${totalElecBilled.toLocaleString()}`, 18, y+22);
      y += 40;
      autoTable(pdf, {
        startY: y,
        head: [['Room','Month','Amount','Tenants','Reading Date','Status']],
        body: elecBillsFiltered.map(b => [
          `Room ${b.roomNumber}`, `${b.month} ${b.year}`,
          `Rs. ${b.amount?.toLocaleString()}`,
          b.tenantCount || 0, b.readingDate,
          b.isPaid ? 'Collected' : 'Pending',
        ]),
        headStyles: { fillColor: [217,119,6], textColor: 255 },
        alternateRowStyles: { fillColor: [255,251,235] },
        styles: { fontSize: 9 },
      });
    }

    if (reportType === 'Occupancy') {
      autoTable(pdf, {
        startY: y,
        head: [['Name','Room','Check-In','Monthly Rent','Phone']],
        body: activeTenants.map(t => [
          t.name, `Room ${t.roomNumber}`, t.checkIn,
          `Rs. ${(t.monthlyRent||0).toLocaleString()}`, t.phone || '-',
        ]),
        headStyles: { fillColor: [79,70,229], textColor: 255 },
        alternateRowStyles: { fillColor: [248,250,252] },
        styles: { fontSize: 9 },
      });
    }

    if (reportType === 'Vacant Rooms') {
      pdf.setFontSize(12); pdf.setTextColor(0,0,0); pdf.setFont('helvetica','bold');
      pdf.text(`Total Vacant Beds: ${totalVacantBeds}`, 14, y); y += 10;
      autoTable(pdf, {
        startY: y,
        head: [['Room','Floor','Type','Total','Occupied','Vacant','Rent/Bed']],
        body: vacantRooms.map(r => [
          `Room ${r.roomNumber}`, r.floor || '-', r.roomType || '-',
          r.totalBeds, r.occupiedBeds || 0,
          r.totalBeds - (r.occupiedBeds || 0),
          `Rs. ${(r.rentPerBed||0).toLocaleString()}`,
        ]),
        headStyles: { fillColor: [5,150,105], textColor: 255 },
        alternateRowStyles: { fillColor: [236,253,245] },
        styles: { fontSize: 9 },
      });
    }

    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8); pdf.setTextColor(150,150,150);
      pdf.text(`Generated by PG Manager • ${new Date().toLocaleDateString('en-IN')} • Page ${i} of ${pageCount}`,
        14, pdf.internal.pageSize.height - 10);
    }
    pdf.save(`${reportType}-Report-${period}.pdf`);
  };

  const reportTypes = [
    { id: 'rent', label: '💰 Rent Collection', color: '#4f46e5', bg: '#eef2ff' },
    { id: 'electricity', label: '⚡ Electricity', color: '#d97706', bg: '#fffbeb' },
    { id: 'occupancy', label: '👥 Occupancy', color: '#059669', bg: '#ecfdf5' },
    { id: 'vacant', label: '🛏️ Vacant Rooms', color: '#dc2626', bg: '#fef2f2' },
    { id: 'history', label: '📋 Tenant History', color: '#0891b2', bg: '#ecfeff' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports & Analytics</h1>
          <p style={styles.subtitle}>View and download detailed reports</p>
        </div>
      </div>

      {/* Period Filter */}
      <div style={styles.periodBox}>
        <div style={styles.periodToggle}>
          <button style={{ ...styles.toggleBtn, ...(periodMode === 'monthly' ? styles.toggleActive : {}) }}
            onClick={() => setPeriodMode('monthly')}>📅 Monthly</button>
          <button style={{ ...styles.toggleBtn, ...(periodMode === 'custom' ? styles.toggleActive : {}) }}
            onClick={() => setPeriodMode('custom')}>📆 Custom Range</button>
        </div>
        {periodMode === 'monthly' && (
          <div style={styles.periodFilters}>
            <select style={styles.filterSelect} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              {months.map(m => <option key={m}>{m}</option>)}
            </select>
            <select style={styles.filterSelect} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              {['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        )}
        {periodMode === 'custom' && (
          <div style={styles.periodFilters}>
            <div style={styles.dateField}>
              <label style={styles.dateLabel}>From</label>
              <input style={styles.filterSelect} type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div style={styles.dateField}>
              <label style={styles.dateLabel}>To</label>
              <input style={styles.filterSelect} type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Report Tabs */}
      <div style={styles.reportTabs}>
        {reportTypes.map(({ id, label, color, bg }) => (
          <button key={id} style={{
            ...styles.reportTab,
            background: activeReport === id ? bg : 'white',
            color: activeReport === id ? color : '#64748b',
            border: activeReport === id ? `2px solid ${color}` : '1.5px solid #e2e8f0',
          }} onClick={() => setActiveReport(id)}>{label}</button>
        ))}
      </div>

      {loading ? <div style={styles.loading}>Loading...</div> : (
        <>
          {/* ── RENT REPORT ── */}
          {activeReport === 'rent' && (
            <div style={styles.reportCard}>
              <div style={styles.reportCardHeader}>
                <div>
                  <h2 style={styles.reportTitle}>💰 Rent Collection Report</h2>
                  <p style={styles.reportPeriod}>{getPeriodLabel()}</p>
                </div>
                <button style={styles.downloadBtn} onClick={() => downloadPDF('Rent Collection')}>⬇️ Download PDF</button>
              </div>

              {/* 5 Stat Cards */}
              <div style={styles.summaryGrid5}>
                {[
                  { label: 'Total Expected', value: `₹${totalRentExpected.toLocaleString()}`, color: '#4f46e5', bg: '#eef2ff', icon: '💰' },
                  { label: 'Total Collected', value: `₹${totalRentCollected.toLocaleString()}`, color: '#059669', bg: '#ecfdf5', icon: '✅' },
                  { label: 'Total Pending', value: `₹${totalPending.toLocaleString()}`, color: '#dc2626', bg: '#fef2f2', icon: '⏳' },
                  { label: 'Penalty Amt', value: `₹${totalPenaltyAmount.toLocaleString()}`, color: penaltyEnabled ? '#dc2626' : '#94a3b8', bg: penaltyEnabled ? '#fef2f2' : '#f8fafc', icon: '🔴' },
                  { label: 'No. of Payments', value: rentPayments.length, color: '#d97706', bg: '#fffbeb', icon: '📋' },
                ].map(({ label, value, color, bg, icon }) => (
                  <div key={label} style={{ ...styles.summaryCard, background: bg }}>
                    <div style={styles.summaryIcon}>{icon}</div>
                    <div style={{ ...styles.summaryValue, color }}>{value}</div>
                    <div style={styles.summaryLabel}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Payment count breakdown */}
              <div style={styles.paymentBreakdownRow}>
                <div style={styles.breakdownChip}>
                  <span style={{ color: '#059669', fontWeight: '700' }}>✅ {fullPayments}</span> Full Payments
                </div>
                <div style={styles.breakdownChip}>
                  <span style={{ color: '#d97706', fontWeight: '700' }}>⚠️ {partialPayments}</span> Partial Payments
                </div>
                <div style={styles.breakdownChip}>
                  <span style={{ color: '#059669', fontWeight: '700' }}>✅ {paidCount}</span> Fully Paid Tenants
                </div>
                <div style={styles.breakdownChip}>
                  <span style={{ color: '#d97706', fontWeight: '700' }}>⚠️ {partialCount}</span> Partial Tenants
                </div>
                <div style={styles.breakdownChip}>
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>❌ {unpaidCount}</span> Unpaid Tenants
                </div>
              </div>

              {/* Penalty Tenants Section */}
              {penaltyEnabled && penaltyTenants.length > 0 && (
                <>
                  <h3 style={{ ...styles.tableTitle, color: '#dc2626', marginTop: '24px' }}>
                    🔴 Tenants with Penalty ({penaltyTenants.length})
                  </h3>
                  <div style={styles.table}>
                    <div style={{ ...styles.tableHeader, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                      <span>Tenant</span><span>Room</span><span>Base Rent</span>
                      <span>🔴 Penalty</span><span>Total Due</span><span>Paid</span><span>Balance</span>
                    </div>
                    {penaltyTenants.map(t => (
                      <div key={t.id} style={{ ...styles.tableRow, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', background: '#fff5f5', borderLeft: '3px solid #dc2626' }}>
                        <span style={styles.tableName}>{t.name}</span>
                        <span>Room {t.roomNumber}</span>
                        <span style={{ color: '#64748b' }}>₹{(t.monthlyRent||0).toLocaleString()}</span>
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>₹{t.penalty.toLocaleString()}</span>
                        <span style={{ color: '#1e293b', fontWeight: '700' }}>₹{t.totalDue.toLocaleString()}</span>
                        <span style={{ color: '#059669' }}>₹{t.paid.toLocaleString()}</span>
                        <span style={{ color: t.balance > 0 ? '#dc2626' : '#059669', fontWeight: '700' }}>₹{t.balance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Tenant-wise full breakdown */}
              <h3 style={{ ...styles.tableTitle, marginTop: '24px' }}>
                👥 Tenant-wise Breakdown ({activeTenants.length})
              </h3>
              <div style={styles.table}>
                <div style={{ ...styles.tableHeader, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                  <span>Tenant</span><span>Room</span><span>Monthly Rent</span>
                  <span>Penalty</span><span>Total Due</span><span>Paid</span><span>Status</span>
                </div>
                {tenantRentStatus.map(t => (
                  <div key={t.id} style={{
                    ...styles.tableRow,
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                    background: t.status === 'paid' ? '#f0fdf4' : t.status === 'partial' ? '#fffbeb' : '#fef2f2',
                  }}>
                    <span style={styles.tableName}>
                      {t.name}
                      <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>
                        {t.paymentCount} payment{t.paymentCount !== 1 ? 's' : ''}
                      </span>
                    </span>
                    <span>Room {t.roomNumber}</span>
                    <span style={{ color: '#64748b' }}>₹{(t.monthlyRent||0).toLocaleString()}</span>
                    <span style={{ color: t.penalty > 0 ? '#dc2626' : '#94a3b8', fontWeight: t.penalty > 0 ? '700' : '400' }}>
                      {t.penalty > 0 ? `₹${t.penalty.toLocaleString()}` : '—'}
                    </span>
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>₹{t.totalDue.toLocaleString()}</span>
                    <span style={{ color: '#059669' }}>₹{t.paid.toLocaleString()}</span>
                    <span>
                      <div style={{
                        ...styles.typeTag,
                        background: t.status === 'paid' ? '#dcfce7' : t.status === 'partial' ? '#fffbeb' : '#fef2f2',
                        color: t.status === 'paid' ? '#059669' : t.status === 'partial' ? '#d97706' : '#dc2626',
                      }}>
                        {t.status === 'paid' ? '✅ Paid' : t.status === 'partial' ? '⚠️ Partial' : '❌ Unpaid'}
                      </div>
                    </span>
                  </div>
                ))}
              </div>

              {/* Payments received table */}
              <h3 style={{ ...styles.tableTitle, marginTop: '24px' }}>
                📋 All Payments ({rentPayments.length})
              </h3>
              {rentPayments.length === 0 ? (
                <div style={styles.noData}>No payments found for this period</div>
              ) : (
                <div style={styles.table}>
                  <div style={styles.tableHeader}>
                    <span>Tenant</span><span>Room</span><span>Amount</span>
                    <span>Method</span><span>Date & Time</span><span>Type</span>
                  </div>
                  {rentPayments.map(p => (
                    <div key={p.id} style={styles.tableRow}>
                      <span style={styles.tableName}>{p.tenantName}</span>
                      <span>Room {p.roomNumber}</span>
                      <span style={{ color: '#059669', fontWeight: '700' }}>₹{p.amount?.toLocaleString()}</span>
                      <span>{p.paymentMethod}</span>
                      <span style={{ color: '#94a3b8' }}>
                        {p.paymentDate}
                        {p.paymentTime && <span style={{ display: 'block', fontSize: '11px' }}>🕐 {p.paymentTime}</span>}
                      </span>
                      <span>
                        <div style={{ ...styles.typeTag, background: p.isPartial ? '#fffbeb' : '#ecfdf5', color: p.isPartial ? '#d97706' : '#059669' }}>
                          {p.isPartial ? '⚠️ Partial' : '✅ Full'}
                        </div>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ELECTRICITY */}
          {activeReport === 'electricity' && (
            <div style={styles.reportCard}>
              <div style={styles.reportCardHeader}>
                <div>
                  <h2 style={styles.reportTitle}>⚡ Electricity Bill Report</h2>
                  <p style={styles.reportPeriod}>{getPeriodLabel()}</p>
                </div>
                <button style={{ ...styles.downloadBtn, background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                  onClick={() => downloadPDF('Electricity')}>⬇️ Download PDF</button>
              </div>
              <div style={styles.summaryGrid}>
                {[
                  { label: 'Total Billed', value: `₹${totalElecBilled.toLocaleString()}`, color: '#d97706', bg: '#fffbeb' },
                  { label: 'Rooms Billed', value: elecBillsFiltered.length, color: '#4f46e5', bg: '#eef2ff' },
                  { label: 'Collected', value: elecBillsFiltered.filter(b => b.isPaid).length, color: '#059669', bg: '#ecfdf5' },
                  { label: 'Pending', value: elecBillsFiltered.filter(b => !b.isPaid).length, color: '#dc2626', bg: '#fef2f2' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ ...styles.summaryCard, background: bg }}>
                    <div style={{ ...styles.summaryValue, color }}>{value}</div>
                    <div style={styles.summaryLabel}>{label}</div>
                  </div>
                ))}
              </div>
              <h3 style={styles.tableTitle}>⚡ Bill Details</h3>
              {elecBillsFiltered.length === 0 ? <div style={styles.noData}>No electricity bills for this period</div> : (
                <div style={styles.table}>
                  <div style={{ ...styles.tableHeader, gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <span>Room</span><span>Month</span><span>Amount</span>
                    <span>Tenants</span><span>Reading Date</span><span>Status</span>
                  </div>
                  {elecBillsFiltered.map(b => (
                    <div key={b.id} style={{ ...styles.tableRow, gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr' }}>
                      <span style={styles.tableName}>Room {b.roomNumber}</span>
                      <span>{b.month} {b.year}</span>
                      <span style={{ color: '#d97706', fontWeight: '700' }}>₹{b.amount?.toLocaleString()}</span>
                      <span>{b.tenantCount}</span>
                      <span style={{ color: '#94a3b8' }}>{b.readingDate}</span>
                      <span>
                        <div style={{ ...styles.typeTag, background: b.isPaid ? '#ecfdf5' : '#fef2f2', color: b.isPaid ? '#059669' : '#dc2626' }}>
                          {b.isPaid ? '✅ Done' : '⏳ Pending'}
                        </div>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OCCUPANCY */}
          {activeReport === 'occupancy' && (
            <div style={styles.reportCard}>
              <div style={styles.reportCardHeader}>
                <div>
                  <h2 style={styles.reportTitle}>👥 Tenant Occupancy Report</h2>
                  <p style={styles.reportPeriod}>Current Status</p>
                </div>
                <button style={{ ...styles.downloadBtn, background: 'linear-gradient(135deg, #059669, #0891b2)' }}
                  onClick={() => downloadPDF('Occupancy')}>⬇️ Download PDF</button>
              </div>
              <div style={styles.summaryGrid}>
                {[
                  { label: 'Total Beds', value: totalBeds, color: '#4f46e5', bg: '#eef2ff' },
                  { label: 'Occupied', value: occupiedBeds, color: '#059669', bg: '#ecfdf5' },
                  { label: 'Vacant', value: totalBeds - occupiedBeds, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Occupancy Rate', value: `${occupancyRate}%`, color: '#d97706', bg: '#fffbeb' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ ...styles.summaryCard, background: bg }}>
                    <div style={{ ...styles.summaryValue, color }}>{value}</div>
                    <div style={styles.summaryLabel}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={styles.occupancyBarBox}>
                <div style={styles.occupancyBarLabel}>
                  <span>Occupancy</span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>{occupancyRate}%</span>
                </div>
                <div style={styles.occupancyBarBg}>
                  <div style={{ ...styles.occupancyBarFill, width: `${occupancyRate}%`, background: occupancyRate >= 80 ? '#059669' : occupancyRate >= 50 ? '#d97706' : '#dc2626' }} />
                </div>
              </div>
              <h3 style={styles.tableTitle}>👥 Active Tenants ({activeTenants.length})</h3>
              <div style={styles.table}>
                <div style={{ ...styles.tableHeader, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                  <span>Name</span><span>Room</span><span>Check-In</span>
                  <span>Monthly Rent</span><span>Phone</span>
                </div>
                {activeTenants.map(t => (
                  <div key={t.id} style={{ ...styles.tableRow, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                    <span style={styles.tableName}>{t.name}</span>
                    <span>Room {t.roomNumber}</span>
                    <span style={{ color: '#94a3b8' }}>{t.checkIn}</span>
                    <span style={{ color: '#4f46e5', fontWeight: '700' }}>₹{(t.monthlyRent||0).toLocaleString()}</span>
                    <span>{t.phone || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VACANT */}
          {activeReport === 'vacant' && (
            <div style={styles.reportCard}>
              <div style={styles.reportCardHeader}>
                <div>
                  <h2 style={styles.reportTitle}>🛏️ Vacant Rooms Report</h2>
                  <p style={styles.reportPeriod}>Current Status</p>
                </div>
                <button style={{ ...styles.downloadBtn, background: 'linear-gradient(135deg, #dc2626, #9f1239)' }}
                  onClick={() => downloadPDF('Vacant Rooms')}>⬇️ Download PDF</button>
              </div>
              <div style={styles.summaryGrid}>
                {[
                  { label: 'Total Rooms', value: rooms.length, color: '#4f46e5', bg: '#eef2ff' },
                  { label: 'Vacant Rooms', value: vacantRooms.length, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Vacant Beds', value: totalVacantBeds, color: '#d97706', bg: '#fffbeb' },
                  { label: 'Revenue Lost', value: `₹${vacantRooms.reduce((a,r) => a+((r.totalBeds-(r.occupiedBeds||0))*(r.rentPerBed||0)),0).toLocaleString()}`, color: '#dc2626', bg: '#fef2f2' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ ...styles.summaryCard, background: bg }}>
                    <div style={{ ...styles.summaryValue, color }}>{value}</div>
                    <div style={styles.summaryLabel}>{label}</div>
                  </div>
                ))}
              </div>
              <h3 style={styles.tableTitle}>🛏️ Rooms with Vacant Beds</h3>
              {vacantRooms.length === 0 ? (
                <div style={{ ...styles.noData, color: '#059669' }}>🎉 All beds are occupied!</div>
              ) : (
                <div style={styles.table}>
                  <div style={{ ...styles.tableHeader, gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <span>Room</span><span>Floor</span><span>Type</span>
                    <span>Total</span><span>Occupied</span><span>Vacant</span><span>Rent/Bed</span>
                  </div>
                  {vacantRooms.map(r => (
                    <div key={r.id} style={{ ...styles.tableRow, gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr', background: '#fef2f2' }}>
                      <span style={styles.tableName}>Room {r.roomNumber}</span>
                      <span>{r.floor || '-'}</span><span>{r.roomType || '-'}</span>
                      <span>{r.totalBeds}</span>
                      <span style={{ color: '#059669' }}>{r.occupiedBeds || 0}</span>
                      <span style={{ color: '#dc2626', fontWeight: '700' }}>{r.totalBeds-(r.occupiedBeds||0)}</span>
                      <span style={{ color: '#4f46e5' }}>₹{(r.rentPerBed||0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TENANT HISTORY */}
          {activeReport === 'history' && (
            <div style={styles.reportCard}>
              <div style={styles.reportCardHeader}>
                <div>
                  <h2 style={styles.reportTitle}>📋 Tenant History</h2>
                  <p style={styles.reportPeriod}>All tenants — latest first • {historyTenants.length} records</p>
                </div>
                <button style={{ ...styles.downloadBtn, background: 'linear-gradient(135deg, #0891b2, #0f3460)' }}
                  onClick={() => downloadPDF('Tenant History')}>⬇️ Download PDF</button>
              </div>
              <div style={styles.summaryGrid}>
                {[
                  { label: 'Total Ever', value: tenants.length, color: '#4f46e5', bg: '#eef2ff' },
                  { label: 'Currently Active', value: activeTenants.length, color: '#059669', bg: '#ecfdf5' },
                  { label: 'Moved Out', value: tenants.filter(t => t.status === 'deleted').length, color: '#dc2626', bg: '#fef2f2' },
                  {
                    label: 'Avg Stay',
                    value: (() => {
                      const moved = tenants.filter(t => t.status === 'deleted');
                      if (!moved.length) return '—';
                      const avg = moved.reduce((a, t) => a + getDaysStayed(t), 0) / moved.length;
                      return getDaysLabel(Math.round(avg));
                    })(),
                    color: '#d97706', bg: '#fffbeb'
                  },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ ...styles.summaryCard, background: bg }}>
                    <div style={{ ...styles.summaryValue, color }}>{value}</div>
                    <div style={styles.summaryLabel}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={styles.stayFilterRow}>
                <span style={styles.stayFilterLabel}>🔍 Filter by stay:</span>
                <div style={styles.stayFilterBtns}>
                  {stayFilters.map(({ id, label }) => (
                    <button key={id} style={{
                      ...styles.stayFilterBtn,
                      background: stayFilter === id ? '#0891b2' : 'white',
                      color: stayFilter === id ? 'white' : '#64748b',
                      border: stayFilter === id ? '2px solid #0891b2' : '1.5px solid #e2e8f0',
                    }} onClick={() => setStayFilter(id)}>{label}</button>
                  ))}
                </div>
              </div>
              {historyTenants.length === 0 ? (
                <div style={styles.noData}>No tenants found for this filter</div>
              ) : (
                <div style={styles.table}>
                  <div style={{ ...styles.tableHeader, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
                    <span>Tenant</span><span>Room</span><span>Check-In</span>
                    <span>Check-Out</span><span>Days Stayed</span><span>Status</span>
                  </div>
                  {historyTenants.map(t => {
                    const days = getDaysStayed(t);
                    const checkOut = getCheckOutDate(t);
                    const isMovedOut = t.status === 'deleted';
                    return (
                      <div key={t.id} style={{
                        ...styles.tableRow,
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                        background: isMovedOut ? '#fafafa' : '#f8fafc',
                        opacity: isMovedOut ? 0.85 : 1,
                      }}>
                        <span style={styles.tableName}>
                          {t.name}
                          <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>📞 {t.phone || '-'}</span>
                        </span>
                        <span>Room {t.roomNumber}</span>
                        <span style={{ color: '#059669', fontWeight: '600' }}>{t.checkIn || '-'}</span>
                        <span style={{ color: isMovedOut ? '#dc2626' : '#94a3b8' }}>{checkOut || '—'}</span>
                        <span style={{ color: '#4f46e5', fontWeight: '700' }}>{getDaysLabel(days)}</span>
                        <span>
                          <div style={{ ...styles.typeTag, background: isMovedOut ? '#fef2f2' : '#ecfdf5', color: isMovedOut ? '#dc2626' : '#059669' }}>
                            {isMovedOut ? '🚪 Moved Out' : '✅ Active'}
                          </div>
                        </span>
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
  );
}

const styles = {
  container: { padding: '0' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  periodBox: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  periodToggle: { display: 'flex', gap: '8px' },
  toggleBtn: { padding: '8px 18px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#64748b' },
  toggleActive: { background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none' },
  periodFilters: { display: 'flex', gap: '12px', alignItems: 'center' },
  filterSelect: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc', cursor: 'pointer' },
  dateField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  dateLabel: { fontSize: '11px', fontWeight: '600', color: '#94a3b8' },
  reportTabs: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  reportTab: { padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  reportCard: { background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  reportCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  reportTitle: { fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 },
  reportPeriod: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  downloadBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '28px' },
  summaryGrid5: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '14px', marginBottom: '20px' },
  summaryCard: { borderRadius: '12px', padding: '16px', textAlign: 'center' },
  summaryIcon: { fontSize: '22px', marginBottom: '6px' },
  summaryValue: { fontSize: '20px', fontWeight: '800', marginBottom: '4px' },
  summaryLabel: { color: '#64748b', fontSize: '12px' },
  paymentBreakdownRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' },
  breakdownChip: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', color: '#475569' },
  stayFilterRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  stayFilterLabel: { fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' },
  stayFilterBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  stayFilterBtn: { padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  occupancyBarBox: { background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px' },
  occupancyBarLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' },
  occupancyBarBg: { height: '12px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' },
  occupancyBarFill: { height: '100%', borderRadius: '99px', transition: 'width 0.5s ease' },
  tableTitle: { fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', marginTop: 0 },
  table: { display: 'flex', flexDirection: 'column', gap: '4px' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#1e293b', alignItems: 'center' },
  tableName: { fontWeight: '600' },
  typeTag: { padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  noData: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
};

export default ReportsPage;