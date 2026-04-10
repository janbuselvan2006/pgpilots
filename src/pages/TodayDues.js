import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const DEFAULT_TEMPLATE = `🏠 PGPilots

Hi {{name}},

Your rent of ₹{{amount}} is due today.

Please complete the payment today to avoid any late charges.

For any queries, feel free to reply to this message.

Thank you,  
Team PGPilots`;

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .td-root {
    font-family: 'DM Sans', sans-serif; background: #f0f2f8; min-height: 100vh;
  }

  .td-topbar {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    padding: 24px 20px 32px; position: relative; overflow: hidden;
  }
  .td-topbar::after {
    content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%;
    background: rgba(233,69,96,0.12); top: -70px; right: -50px; pointer-events: none;
  }
  .td-topbar-row { position: relative; z-index: 1; }
  .td-page-title { font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 4px; }
  .td-page-sub   { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 500; }

  .td-card {
    background: white; border-radius: 20px; padding: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-bottom: 24px;
  }

  .td-content { padding: 0 16px 100px; margin-top: -16px; position: relative; z-index: 3; }

  .td-template-box {
    margin-bottom: 24px; border: 1.5px solid #e2e8f0; border-radius: 16px;
    padding: 16px; background: #fff;
  }
  .td-template-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
  }
  .td-template-title {
    font-size: 14px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .td-template-area {
    width: 100%; min-height: 180px; border: 1px solid #f1f5f9; border-radius: 12px;
    padding: 14px; font-family: inherit; font-size: 14px; color: #475569;
    resize: vertical; outline: none; background: #f8fafc;
  }
  .td-template-area:focus { border-color: #4f46e5; background: #fff; }

  .td-list-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  }
  .td-list-title {
    font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px;
  }
  .td-list-count {
    background: #e94560; color: white; padding: 2px 10px; border-radius: 20px; font-size: 12px;
  }

  .due-row {
    background: white; border-radius: 18px; margin-bottom: 12px; display: flex;
    align-items: center; padding: 14px 18px; gap: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    border: 1px solid transparent; transition: all 0.2s;
  }
  .due-row.sent { opacity: 0.6; background: #f1f5f9; }
  .due-row:hover { border-color: #e2e8f0; transform: translateY(-1px); }

  .due-check {
    width: 24px; height: 24px; border-radius: 8px; border: 2.5px solid #cbd5e1;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; position: relative; flex-shrink: 0;
  }
  .due-check.checked { background: #059669; border-color: #059669; }
  .due-check.checked::after {
    content: '✓'; color: white; font-weight: 900; font-size: 14px;
  }

  .due-avatar {
    width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 18px;
    background: linear-gradient(135deg, #4f46e5, #0891b2);
  }

  .due-info { flex: 1; min-width: 0; }
  .due-name { font-size: 15px; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .due-phone { font-size: 12px; color: #94a3b8; font-weight: 500; margin-top: 2px; }

  .due-amounts { text-align: right; margin-right: 12px; }
  .due-total { font-size: 15px; font-weight: 800; color: #1e293b; }
  .due-sub   { font-size: 10px; color: #94a3b8; font-weight: 500; margin-top: 2px; }

  .due-copy-btn {
    padding: 10px 16px; border-radius: 12px; border: none; font-size: 13px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 6px; transition: all 0.15s;
    background: #eef2ff; color: #4f46e5;
  }
  .due-copy-btn:hover { background: #4f46e5; color: white; }
  .due-copy-btn:active { transform: scale(0.95); }
  .due-copy-btn.copied { background: #ecfdf5; color: #059669; }

  .td-empty {
    text-align: center; padding: 60px 20px; background: white; border-radius: 20px;
  }
  .td-empty-icon { font-size: 48px; margin-bottom: 12px; }
  .td-empty-title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
  .td-empty-sub { font-size: 14px; color: #94a3b8; }

  .td-reset-btn {
    background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 8px;
    font-size: 11px; font-weight: 700; color: #64748b; cursor: pointer;
  }
  .td-reset-btn:hover { background: #e2e8f0; color: #1e293b; }

  .td-loading { text-align: center; padding: 80px 20px; color: #94a3b8; }
  .td-spinner {
    width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #e94560;
    border-radius: 50%; animation: tdspin 0.8s linear infinite; margin: 0 auto 16px;
  }
  @keyframes tdspin { to { transform: rotate(360deg); } }

  .td-list-actions {
    display: flex; gap: 8px; align-items: center;
  }
  .td-action-btn {
    padding: 6px 12px; border-radius: 10px; border: none; font-size: 11px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 4px; transition: all 0.15s;
    background: #fff; color: #475569; border: 1.5px solid #e2e8f0;
  }
  .td-action-btn:hover { border-color: #4f46e5; color: #4f46e5; }
  .td-action-btn.active { background: #ecfdf5; color: #059669; border-color: #059669; }

  .due-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .due-copy-btn.phone { background: #ecfdf5; color: #059669; }
  .due-copy-btn.phone:hover { background: #059669; color: white; }

  .mini-copy-btn {
    border: none; background: rgba(79,70,229,0.08); color: #4f46e5;
    padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;
    cursor: pointer; font-family: inherit; margin-left: 6px;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .mini-copy-btn:hover { background: #4f46e5; color: white; }

  @media (max-width: 640px) {
    .due-amounts { display: none; }
    .due-copy-btn span { display: none; }
    .due-copy-btn { padding: 10px; }
    .td-page-title { font-size: 20px; }
    .td-list-actions { flex-direction: column; align-items: flex-end; }
  }
`;

export default function TodayDues({ pgId }) {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [elecBills, setElecBills] = useState([]);
  const [sentStatus, setSentStatus] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [template, setTemplate] = useState(() => {
    return localStorage.getItem('pgp_rent_template') || DEFAULT_TEMPLATE;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const thisYear = new Date().getFullYear().toString();

  useEffect(() => {
    const savedStatus = localStorage.getItem(`pgp_sent_v2_${todayStr}`);
    if (savedStatus) setSentStatus(JSON.parse(savedStatus));
  }, [todayStr]);

  const fetchData = async () => {
    if (!pgId) return;
    setLoading(true);
    try {
      const todayDate = new Date().getDate();

      const [tSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'tenants'), where('pgId', '==', pgId))),
        getDocs(query(collection(db, 'payments'), 
          where('pgId', '==', pgId),
          where('month', '==', thisMonth),
          where('year', '==', thisYear)
        ))
      ]);

      const allTenants = tSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'deleted');
      const allPmts    = pSnap.docs.map(d => d.data());

      const dueToday = allTenants.filter(t => {
        if (!t.checkIn || !t.reminderRequestedAt) return false;
        
        // Hide if already paid full rent this month
        const hasPaid = allPmts.some(p => p.tenantId === t.id && p.isCompleted);
        if (hasPaid) return false;

        const reqDate = t.reminderRequestedAt.toDate ? t.reminderRequestedAt.toDate() : new Date(t.reminderRequestedAt);
        return reqDate.toDateString() === new Date().toDateString();
      });

      const eSnap = await getDocs(query(collection(db, 'electricityBills'),
        where('pgId', '==', pgId),
        where('month', '==', thisMonth),
        where('year', '==', thisYear)
      ));
      const eBills = eSnap.docs.map(d => d.data());

      setTenants(dueToday);
      setElecBills(eBills);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [pgId]);

  const getElec = (t) => {
    const b = elecBills.find(b => b.roomNumber === t.roomNumber);
    return b ? Math.round((b.amount || 0) / (b.tenantCount || 1)) : 0;
  };

  const saveTemplate = (val) => {
    setTemplate(val);
    localStorage.setItem('pgp_rent_template', val);
  };

  const resetTemplate = () => {
    saveTemplate(DEFAULT_TEMPLATE);
  };

  const toggleCheck = (tid) => {
    const next = { ...sentStatus, [tid]: !sentStatus[tid] };
    setSentStatus(next);
    localStorage.setItem(`pgp_sent_v2_${todayStr}`, JSON.stringify(next));
  };

  const handleCopy = (t) => {
    const rent = t.monthlyRent || 0;
    const elec = getElec(t);
    const total = rent + elec;

    let msg = template
      .replace(/{{name}}/g, t.name || 'Tenant')
      .replace(/{{amount}}/g, total.toLocaleString('en-IN'))
      .replace(/{{rent}}/g, rent.toLocaleString('en-IN'))
      .replace(/{{electricity}}/g, elec.toLocaleString('en-IN'));

    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleCopyPhone = (t) => {
    navigator.clipboard.writeText(t.phone);
    setCopiedId('phone-' + t.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAllMsgs = () => {
    if (tenants.length === 0) return;
    const allMsgs = tenants.map(t => {
      const rent = t.monthlyRent || 0;
      const elec = getElec(t);
      const total = rent + elec;
      return template
        .replace(/{{name}}/g, t.name || 'Tenant')
        .replace(/{{amount}}/g, total.toLocaleString('en-IN'))
        .replace(/{{rent}}/g, rent.toLocaleString('en-IN'))
        .replace(/{{electricity}}/g, elec.toLocaleString('en-IN'));
    }).join('\n\n---------------------------\n\n');
    
    navigator.clipboard.writeText(allMsgs).then(() => {
      setCopiedId('all-msgs');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCopyPhoneList = () => {
    if (tenants.length === 0) return;
    const phones = tenants.map(t => t.phone).join(', ');
    navigator.clipboard.writeText(phones).then(() => {
      setCopiedId('phones');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (!pgId) return <div className="td-root" style={{ padding: 40, textAlign: 'center' }}>Please select a PG.</div>;

  return (
    <>
      <style>{css}</style>
      <div className="td-root">
        <div className="td-topbar">
          <div className="td-topbar-row">
            <h1 className="td-page-title">Payment Dues</h1>
            <p className="td-page-sub">Remind tenants whose rent is due today</p>
          </div>
        </div>

        <div className="td-content">
          <div className="td-card">
            <div className="td-template-header">
              <div className="td-template-title">Message Template</div>
              <button className="td-reset-btn" onClick={resetTemplate}>Reset Default</button>
            </div>
            <textarea
              className="td-template-area"
              value={template}
              onChange={e => saveTemplate(e.target.value)}
              placeholder="Hi {{name}}, Your rent of ₹{{amount}} is due today..."
            />
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
              Available variables: <b>{`{{name}}`}</b>, <b>{`{{amount}}`}</b> (Total), <b>{`{{rent}}`}</b>, <b>{`{{electricity}}`}</b>
            </div>
          </div>

          <div className="td-list-header">
            <div className="td-list-title">
              Due Today <span className="td-list-count">{tenants.length}</span>
            </div>
            <div className="td-list-actions">
              <button className={`td-action-btn${copiedId === 'all-msgs' ? ' active' : ''}`} onClick={handleCopyAllMsgs}>
                {copiedId === 'all-msgs' ? '✅ Copied' : '📋 Copy All Msgs'}
              </button>
              <button className={`td-action-btn${copiedId === 'phones' ? ' active' : ''}`} onClick={handleCopyPhoneList}>
                {copiedId === 'phones' ? '✅ Copied' : '📞 Copy All Phones'}
              </button>
              <div style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="td-loading">
              <div className="td-spinner" />
              Checking dues…
            </div>
          ) : tenants.length === 0 ? (
            <div className="td-empty">
              <div className="td-empty-icon">🎉</div>
              <div className="td-empty-title">No Dues Today!</div>
              <div className="td-empty-sub">All tenants joining on this date are all set.</div>
            </div>
          ) : (
            <div>
              {tenants.map(t => {
                const isSent = !!sentStatus[t.id];
                const rent = t.monthlyRent || 0;
                const elec = getElec(t);
                const total = rent + elec;
                const isCopied = copiedId === t.id;

                return (
                  <div key={t.id} className={`due-row${isSent ? ' sent' : ''}`}>
                    <div className={`due-check${isSent ? ' checked' : ''}`} onClick={() => toggleCheck(t.id)} title="Mark as sent" />

                    <div className="due-avatar">
                      {t.name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="due-info">
                      <div className="due-name">{t.name}</div>
                      <div className="due-phone" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span 
                          onClick={() => handleCopyPhone(t)} 
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Click to copy"
                        >
                          📞 {t.phone}
                        </span>
                        <button className="mini-copy-btn" onClick={() => handleCopyPhone(t)}>
                          {copiedId === 'phone-' + t.id ? '✅ Copied' : '📋 Copy'}
                        </button>
                        <span>• Room {t.roomNumber}</span>
                        {t.pgName && <span>• {t.pgName}</span>}
                      </div>
                    </div>

                    <div className="due-amounts">
                      <div className="due-total">₹{total.toLocaleString('en-IN')}</div>
                      <div className="due-sub">Rent + Elec</div>
                    </div>

                    <div className="due-actions">
                      <button className={`due-copy-btn phone ${copiedId === 'phone-' + t.id ? ' copied' : ''}`} onClick={() => handleCopyPhone(t)}>
                        {copiedId === 'phone-' + t.id ? '✅' : '📞'}
                        <span>{copiedId === 'phone-' + t.id ? 'Copied' : 'Copy Phone'}</span>
                      </button>
                      <button className={`due-copy-btn${isCopied ? ' copied' : ''}`} onClick={() => handleCopy(t)}>
                        {isCopied ? '✅' : '📋'}
                        <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
