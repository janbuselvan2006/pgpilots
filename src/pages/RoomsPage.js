import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, query, where
} from 'firebase/firestore';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .rooms-root {
    font-family: 'DM Sans', sans-serif;
    background: #f0f2f8;
    min-height: 100vh;
    padding: 0;
  }

  .rooms-topbar {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    padding: 20px 20px 28px;
    position: relative;
    overflow: hidden;
  }
  .rooms-topbar::after {
    content: '';
    position: absolute;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(233,69,96,0.15);
    top: -60px; right: -40px;
    pointer-events: none;
  }
  .rooms-topbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative; z-index: 1;
  }
  .rooms-page-title { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 2px; }
  .rooms-page-sub   { font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 500; }
  .rooms-add-fab {
    width: 44px; height: 44px; border-radius: 14px;
    background: #e94560; border: none; color: white; font-size: 22px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 4px 14px rgba(233,69,96,0.45);
    -webkit-tap-highlight-color: transparent; flex-shrink: 0;
    transition: transform 0.15s;
  }
  .rooms-add-fab:active { transform: scale(0.92); }

  .rooms-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; margin: -14px 16px 0;
    background: white; border-radius: 16px; overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1); position: relative; z-index: 2;
  }
  .rooms-stat { padding: 14px 8px; text-align: center; border-right: 1px solid #f1f5f9; }
  .rooms-stat:last-child { border-right: none; }
  .rooms-stat-num   { font-size: 20px; font-weight: 800; line-height: 1; }
  .rooms-stat-label { font-size: 9px; color: #94a3b8; font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.3px; }

  .rooms-content { padding: 20px 16px 100px; }

  .rooms-grid { display: flex; flex-direction: column; gap: 14px; }
  @media (min-width: 640px)  { .rooms-grid { display: grid; grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) {
    .rooms-grid { grid-template-columns: repeat(3, 1fr); }
    .rooms-content { padding: 24px 24px 40px; }
    .rooms-stats { margin: -14px 24px 0; }
  }

  .room-card { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.07); transition: transform 0.2s; }
  .room-card:active { transform: scale(0.99); }

  .room-card-header { padding: 16px 16px 12px; display: flex; justify-content: space-between; align-items: flex-start; }
  .room-num-badge {
    background: linear-gradient(135deg, #1a1a2e, #0f3460);
    color: white; font-size: 13px; font-weight: 800;
    padding: 6px 14px; border-radius: 10px; letter-spacing: 0.5px;
  }
  .room-status-badge { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; }

  .room-chips { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 16px 14px; }
  .room-chip  { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; background: #f1f5f9; color: #475569; }

  .bed-section { margin: 0 16px 14px; background: #f8fafc; border-radius: 12px; padding: 12px; }
  .bed-section-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .bed-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
  .bed-dot {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: white; transition: transform 0.15s;
  }
  .bed-legend { display: flex; gap: 14px; }
  .bed-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #94a3b8; font-weight: 600; }
  .bed-legend-dot  { width: 8px; height: 8px; border-radius: 3px; }

  .occ-bar-wrap { padding: 0 16px 14px; }
  .occ-bar-row  { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .occ-bar-text { font-size: 12px; color: #94a3b8; font-weight: 500; }
  .occ-bar-pct  { font-size: 12px; font-weight: 800; color: #1e293b; }
  .occ-bar-bg   { height: 5px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
  .occ-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }

  .room-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #f8fafc; }
  .room-rent     { font-size: 17px; font-weight: 800; color: #1e293b; }
  .room-rent-sub { font-size: 10px; color: #94a3b8; font-weight: 500; }
  .room-delete-btn {
    padding: 7px 14px; background: #fef2f2; color: #dc2626;
    border: none; border-radius: 10px; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent;
  }
  .room-delete-btn:active { opacity: 0.7; }

  .rooms-empty { text-align: center; padding: 60px 20px; background: white; border-radius: 20px; margin-top: 8px; }
  .rooms-empty-icon  { font-size: 52px; margin-bottom: 14px; }
  .rooms-empty-title { font-size: 17px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
  .rooms-empty-sub   { font-size: 13px; color: #94a3b8; margin: 0 0 24px; }
  .rooms-empty-btn {
    padding: 13px 28px;
    background: linear-gradient(135deg, #e94560, #0f3460);
    color: white; border: none; border-radius: 12px;
    font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
  }

  .rooms-loading { text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 14px; }
  .rooms-spinner {
    width: 32px; height: 32px; border: 3px solid #e2e8f0;
    border-top-color: #e94560; border-radius: 50%;
    animation: spin 0.7s linear infinite; margin: 0 auto 14px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sheet-overlay {
    position: fixed; inset: 0; background: rgba(15,20,40,0.5);
    z-index: 100; backdrop-filter: blur(2px); animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: white; border-radius: 24px 24px 0 0;
    z-index: 101; max-height: 92dvh; overflow-y: auto;
    animation: slideUp 0.32s cubic-bezier(0.32,0.72,0,1);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

  @media (min-width: 640px) {
    .sheet {
      left: 50%; right: auto; width: 520px; border-radius: 24px;
      bottom: 50%; transform: translate(-50%, 50%);
      animation: zoomIn 0.25s cubic-bezier(0.32,0.72,0,1); max-height: 88vh;
    }
    @keyframes zoomIn {
      from { opacity: 0; transform: translate(-50%, 50%) scale(0.95); }
      to   { opacity: 1; transform: translate(-50%, 50%) scale(1); }
    }
  }

  .sheet-handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 99px; margin: 12px auto 0; }
  .sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 4px; }
  .sheet-title  { font-size: 18px; font-weight: 800; color: #1a1a2e; margin: 0; }
  .sheet-close  {
    width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9;
    border: none; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent; color: #64748b; font-family: inherit;
  }
  .sheet-body { padding: 16px 20px 96px; }

  .sf-field { margin-bottom: 14px; }
  .sf-label {
    display: block; font-size: 11px; font-weight: 700; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
  }
  .sf-input {
    width: 100%; padding: 13px 14px; border: 1.5px solid #e2e8f0;
    border-radius: 12px; font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff; outline: none;
    box-sizing: border-box; -webkit-appearance: none; transition: border-color 0.2s;
  }
  .sf-input:focus { border-color: #e94560; background: #fff; }
  .sf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .sf-segment { display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; gap: 3px; }
  .sf-seg-btn {
    flex: 1; padding: 9px 4px; border: none; border-radius: 8px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    background: transparent; color: #94a3b8; font-family: inherit;
    transition: all 0.2s; -webkit-tap-highlight-color: transparent;
  }
  .sf-seg-btn.active { background: white; color: #e94560; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

  .sf-stepper {
    display: flex; align-items: center; gap: 0;
    background: #f1f5f9; border-radius: 12px; overflow: hidden; border: 1.5px solid #e2e8f0;
  }
  .sf-step-btn {
    width: 44px; height: 46px; border: none; background: transparent;
    font-size: 20px; color: #475569; cursor: pointer; font-family: inherit;
    -webkit-tap-highlight-color: transparent; flex-shrink: 0;
  }
  .sf-step-btn:active { background: #e2e8f0; }
  .sf-step-val { flex: 1; text-align: center; font-size: 18px; font-weight: 800; color: #1a1a2e; }

  .sf-save-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #e94560, #0f3460);
    color: white; border: none; border-radius: 14px;
    font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer;
    margin-top: 8px; box-shadow: 0 4px 14px rgba(233,69,96,0.3);
    -webkit-tap-highlight-color: transparent; transition: opacity 0.2s, transform 0.1s;
  }
  .sf-save-btn:active   { transform: scale(0.98); opacity: 0.9; }
  .sf-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .del-sheet { padding: 20px 20px 32px; text-align: center; }
  .del-icon  { font-size: 44px; margin-bottom: 12px; }
  .del-title { font-size: 17px; font-weight: 800; color: #1e293b; margin: 0 0 6px; }
  .del-sub   { font-size: 13px; color: #94a3b8; margin: 0 0 24px; }
  .del-btn-row { display: flex; gap: 10px; }
  .del-cancel  { flex: 1; padding: 13px; background: #f1f5f9; color: #64748b; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .del-confirm { flex: 1; padding: 13px; background: #dc2626; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }

  /* No PG selected warning */
  .rooms-no-pg {
    text-align: center; padding: 60px 20px; background: white;
    border-radius: 20px; margin: 20px 16px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
`;

// ✅ Now accepts pgId prop from Dashboard
export default function Rooms({ pgId }) {
  const [rooms, setRooms]           = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    roomNumber: '', floor: '', roomType: 'Single',
    totalBeds: 1, rentPerBed: '', bathType: 'Shared', acType: 'Non-AC',
  });

  const user = auth.currentUser;

  const fetchData = async () => {
    // ✅ Guard: need both user and pgId
    if (!user || !pgId) { setLoading(false); return; }
    setLoading(true);
    try {
      // ✅ Query by pgId instead of ownerId
      const rSnap = await getDocs(query(collection(db, 'rooms'),   where('pgId', '==', pgId)));
      setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const tSnap = await getDocs(query(collection(db, 'tenants'), where('pgId', '==', pgId)));
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'deleted'));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ✅ Re-fetch whenever pgId changes (user switches PG)
  useEffect(() => { fetchData(); }, [pgId]);

  const resetForm = () => setForm({
    roomNumber: '', floor: '', roomType: 'Single',
    totalBeds: 1, rentPerBed: '', bathType: 'Shared', acType: 'Non-AC',
  });

  const handleAdd = async () => {
    if (!form.roomNumber.trim() || !form.rentPerBed) return alert('Please fill all required fields!');
    if (!pgId) return alert('No PG selected. Please select a PG from the dashboard.');
    setSaving(true);
    try {
      await addDoc(collection(db, 'rooms'), {
        ...form,
        totalBeds:    parseInt(form.totalBeds),
        rentPerBed:   parseInt(form.rentPerBed),
        occupiedBeds: 0,
        ownerId:      user.uid,  // keep for backward compat
        pgId:         pgId,      // ✅ new field for multi-PG
        createdAt:    new Date(),
      });
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err) { console.error(err); alert('Something went wrong!'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, 'rooms', deleteTarget));
    setDeleteTarget(null);
    fetchData();
  };

  const getOccupiedBeds = (roomNumber) =>
    tenants
      .filter(t => t.roomNumber === roomNumber)
      .map(t => parseInt(t.bedNumber))
      .filter(n => !isNaN(n));

  const totalBedsCount    = rooms.reduce((a, r) => a + r.totalBeds, 0);
  const occupiedBedsCount = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);
  const vacantBedsCount   = totalBedsCount - occupiedBedsCount;

  const SegControl = ({ field, options }) => (
    <div className="sf-segment">
      {options.map(o => (
        <button key={o} className={`sf-seg-btn${form[field] === o ? ' active' : ''}`}
          onClick={() => setForm({ ...form, [field]: o })}>
          {o}
        </button>
      ))}
    </div>
  );

  // ✅ Show warning if no PG selected
  if (!pgId) {
    return (
      <>
        <style>{css}</style>
        <div className="rooms-no-pg">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>No PG Selected</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Please select a PG from the dashboard to manage rooms.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="rooms-root">

        {/* Top bar */}
        <div className="rooms-topbar">
          <div className="rooms-topbar-row">
            <div>
              <h1 className="rooms-page-title">Rooms</h1>
              <p className="rooms-page-sub">{rooms.length} rooms · {vacantBedsCount} beds available</p>
            </div>
            <button className="rooms-add-fab" onClick={() => { resetForm(); setShowForm(true); }}>＋</button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="rooms-stats">
          {[
            { label: 'Rooms',    value: rooms.length,      color: '#4f46e5' },
            { label: 'Beds',     value: totalBedsCount,    color: '#0891b2' },
            { label: 'Occupied', value: occupiedBedsCount, color: '#dc2626' },
            { label: 'Vacant',   value: vacantBedsCount,   color: '#059669' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rooms-stat">
              <div className="rooms-stat-num" style={{ color }}>{value}</div>
              <div className="rooms-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="rooms-content">
          {loading ? (
            <div className="rooms-loading">
              <div className="rooms-spinner" />
              Loading rooms…
            </div>
          ) : rooms.length === 0 ? (
            <div className="rooms-empty">
              <div className="rooms-empty-icon">🛏️</div>
              <p className="rooms-empty-title">No rooms yet</p>
              <p className="rooms-empty-sub">Add your first room to get started</p>
              <button className="rooms-empty-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                ➕ Add First Room
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map(room => {
                const vacant         = room.totalBeds - (room.occupiedBeds || 0);
                const occupancyPct   = Math.round(((room.occupiedBeds || 0) / room.totalBeds) * 100);
                const occupiedBedNos = getOccupiedBeds(room.roomNumber);
                const isFull         = vacant === 0;

                return (
                  <div key={room.id} className="room-card">
                    <div className="room-card-header">
                      <div className="room-num-badge">Room {room.roomNumber}</div>
                      <div className="room-status-badge" style={{
                        background: isFull ? '#fef2f2' : '#ecfdf5',
                        color:      isFull ? '#dc2626' : '#059669',
                      }}>
                        {isFull ? '🔴 Full' : `🟢 ${vacant} Free`}
                      </div>
                    </div>

                    <div className="room-chips">
                      {room.floor && <span className="room-chip">📍 {room.floor} Floor</span>}
                      <span className="room-chip">{room.roomType}</span>
                      <span className="room-chip">{room.bathType}</span>
                      <span className="room-chip">{room.acType}</span>
                    </div>

                    <div className="bed-section">
                      <div className="bed-section-title">🛏️ Bed Status</div>
                      <div className="bed-grid">
                        {Array.from({ length: room.totalBeds }, (_, i) => {
                          const bedNum     = i + 1;
                          const isOccupied = occupiedBedNos.includes(bedNum);
                          const tenant     = tenants.find(
                            t => t.roomNumber === room.roomNumber && parseInt(t.bedNumber) === bedNum
                          );
                          return (
                            <div key={bedNum} className="bed-dot"
                              title={isOccupied ? `Bed ${bedNum}: ${tenant?.name || 'Occupied'}` : `Bed ${bedNum}: Vacant`}
                              style={{
                                background: isOccupied ? '#dc2626' : '#059669',
                                boxShadow:  isOccupied ? '0 2px 8px rgba(220,38,38,0.35)' : '0 2px 8px rgba(5,150,105,0.35)',
                              }}>
                              {bedNum}
                            </div>
                          );
                        })}
                      </div>
                      <div className="bed-legend">
                        <div className="bed-legend-item">
                          <div className="bed-legend-dot" style={{ background: '#059669' }} />Vacant
                        </div>
                        <div className="bed-legend-item">
                          <div className="bed-legend-dot" style={{ background: '#dc2626' }} />Occupied
                        </div>
                      </div>
                    </div>

                    <div className="occ-bar-wrap">
                      <div className="occ-bar-row">
                        <span className="occ-bar-text">{room.occupiedBeds || 0} of {room.totalBeds} beds</span>
                        <span className="occ-bar-pct">{occupancyPct}%</span>
                      </div>
                      <div className="occ-bar-bg">
                        <div className="occ-bar-fill" style={{
                          width:      `${occupancyPct}%`,
                          background: occupancyPct === 100 ? '#dc2626' : 'linear-gradient(90deg,#e94560,#4f46e5)',
                        }} />
                      </div>
                    </div>

                    <div className="room-footer">
                      <div>
                        <span className="room-rent">₹{room.rentPerBed.toLocaleString()}</span>
                        <span className="room-rent-sub"> /bed/mo</span>
                      </div>
                      <button className="room-delete-btn" onClick={() => setDeleteTarget(room.id)}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Room Sheet */}
        {showForm && (
          <>
            <div className="sheet-overlay" onClick={() => setShowForm(false)} />
            <div className="sheet">
              <div className="sheet-handle" />
              <div className="sheet-header">
                <h2 className="sheet-title">Add New Room</h2>
                <button className="sheet-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="sheet-body">
                <div className="sf-row">
                  <div className="sf-field">
                    <label className="sf-label">Room Number *</label>
                    <input className="sf-input" type="text" placeholder="101"
                      value={form.roomNumber}
                      onChange={e => setForm({ ...form, roomNumber: e.target.value })} />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">Floor</label>
                    <input className="sf-input" type="text" placeholder="Ground / 1st"
                      value={form.floor}
                      onChange={e => setForm({ ...form, floor: e.target.value })} />
                  </div>
                </div>

                <div className="sf-field">
                  <label className="sf-label">Rent per Bed (₹) *</label>
                  <input className="sf-input" type="number" inputMode="numeric" placeholder="5000"
                    value={form.rentPerBed}
                    onChange={e => setForm({ ...form, rentPerBed: e.target.value })} />
                </div>

                <div className="sf-field">
                  <label className="sf-label">Total Beds</label>
                  <div className="sf-stepper">
                    <button className="sf-step-btn"
                      onClick={() => setForm({ ...form, totalBeds: Math.max(1, form.totalBeds - 1) })}>−</button>
                    <span className="sf-step-val">{form.totalBeds}</span>
                    <button className="sf-step-btn"
                      onClick={() => setForm({ ...form, totalBeds: Math.min(20, form.totalBeds + 1) })}>+</button>
                  </div>
                </div>

                <div className="sf-field">
                  <label className="sf-label">Room Type</label>
                  <SegControl field="roomType" options={['Single', 'Double', 'Triple', 'Dorm']} />
                </div>

                <div className="sf-row">
                  <div className="sf-field">
                    <label className="sf-label">Bathroom</label>
                    <SegControl field="bathType" options={['Shared', 'Attached']} />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">AC Type</label>
                    <SegControl field="acType" options={['AC', 'Non-AC']} />
                  </div>
                </div>

                <button className="sf-save-btn" onClick={handleAdd} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Room'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirm Sheet */}
        {deleteTarget && (
          <>
            <div className="sheet-overlay" onClick={() => setDeleteTarget(null)} />
            <div className="sheet">
              <div className="sheet-handle" />
              <div className="del-sheet">
                <div className="del-icon">🗑️</div>
                <p className="del-title">Delete this room?</p>
                <p className="del-sub">This action cannot be undone.</p>
                <div className="del-btn-row">
                  <button className="del-cancel"  onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button className="del-confirm" onClick={handleDelete}>Yes, Delete</button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}