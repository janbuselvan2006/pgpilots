import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, query, where
} from 'firebase/firestore';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roomNumber: '', floor: '', roomType: 'Single',
    totalBeds: '1', rentPerBed: '', bathType: 'Shared', acType: 'Non-AC'
  });

  const user = auth.currentUser;

  const fetchRooms = async () => {
    setLoading(true);
    const q = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setRooms(data);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, [user.uid]);

  const handleAdd = async () => {
    if (!form.roomNumber || !form.rentPerBed) return alert('Please fill all required fields!');
    setSaving(true);
    await addDoc(collection(db, 'rooms'), {
      ...form,
      totalBeds: parseInt(form.totalBeds),
      rentPerBed: parseInt(form.rentPerBed),
      occupiedBeds: 0,
      ownerId: user.uid,
      createdAt: new Date(),
    });
    setForm({ roomNumber: '', floor: '', roomType: 'Single', totalBeds: '1', rentPerBed: '', bathType: 'Shared', acType: 'Non-AC' });
    setShowForm(false);
    setSaving(false);
    fetchRooms();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this room?')) return;
    await deleteDoc(doc(db, 'rooms', id));
    fetchRooms();
  };

  const totalBeds = rooms.reduce((a, r) => a + r.totalBeds, 0);
  const occupiedBeds = rooms.reduce((a, r) => a + (r.occupiedBeds || 0), 0);
  const vacantBeds = totalBeds - occupiedBeds;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Room Management</h1>
          <p style={styles.subtitle}>Manage all your rooms and beds</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '➕ Add Room'}
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Rooms', value: rooms.length, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Total Beds', value: totalBeds, color: '#0891b2', bg: '#ecfeff' },
          { label: 'Occupied Beds', value: occupiedBeds, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Vacant Beds', value: vacantBeds, color: '#059669', bg: '#ecfdf5' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ ...styles.statCard, background: bg }}>
            <div style={{ ...styles.statValue, color }}>{value}</div>
            <div style={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Add Room Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Add New Room</h3>
          <div style={styles.formGrid}>
            {[
              { label: 'Room Number *', key: 'roomNumber', type: 'text', ph: 'e.g. 101' },
              { label: 'Floor', key: 'floor', type: 'text', ph: 'e.g. Ground, 1st' },
              { label: 'Rent per Bed (₹) *', key: 'rentPerBed', type: 'number', ph: 'e.g. 5000' },
              { label: 'Total Beds', key: 'totalBeds', type: 'number', ph: '1' },
            ].map(({ label, key, type, ph }) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input style={styles.input} type={type} placeholder={ph}
                  value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            {[
              { label: 'Room Type', key: 'roomType', options: ['Single', 'Double', 'Triple', 'Dormitory'] },
              { label: 'Bathroom', key: 'bathType', options: ['Shared', 'Attached'] },
              { label: 'AC Type', key: 'acType', options: ['AC', 'Non-AC'] },
            ].map(({ label, key, options }) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <select style={styles.input} value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button style={styles.saveBtn} onClick={handleAdd} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Room'}
          </button>
        </div>
      )}

      {/* Rooms List */}
      {loading ? (
        <div style={styles.loading}>Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🛏️</div>
          <p style={styles.emptyText}>No rooms added yet</p>
          <p style={styles.emptySub}>Click "Add Room" to get started</p>
        </div>
      ) : (
        <div style={styles.roomsGrid}>
          {rooms.map(room => {
            const vacant = room.totalBeds - (room.occupiedBeds || 0);
            const occupancyPct = Math.round(((room.occupiedBeds || 0) / room.totalBeds) * 100);
            return (
              <div key={room.id} style={styles.roomCard}>
                <div style={styles.roomHeader}>
                  <div style={styles.roomNumber}>Room {room.roomNumber}</div>
                  <div style={{ ...styles.badge, background: vacant > 0 ? '#ecfdf5' : '#fef2f2', color: vacant > 0 ? '#059669' : '#dc2626' }}>
                    {vacant > 0 ? `${vacant} Vacant` : 'Full'}
                  </div>
                </div>
                <div style={styles.roomDetails}>
                  {[
                    ['Floor', room.floor || 'N/A'],
                    ['Type', room.roomType],
                    ['Bathroom', room.bathType],
                    ['AC', room.acType],
                  ].map(([k, v]) => (
                    <div key={k} style={styles.detail}>
                      <span style={styles.detailKey}>{k}</span>
                      <span style={styles.detailVal}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={styles.bedBar}>
                  <div style={styles.bedBarInfo}>
                    <span style={styles.bedText}>🛏️ {room.occupiedBeds || 0}/{room.totalBeds} beds</span>
                    <span style={styles.bedPct}>{occupancyPct}%</span>
                  </div>
                  <div style={styles.barBg}>
                    <div style={{ ...styles.barFill, width: `${occupancyPct}%`, background: occupancyPct === 100 ? '#dc2626' : '#4f46e5' }} />
                  </div>
                </div>
                <div style={styles.roomFooter}>
                  <div style={styles.rent}>₹{room.rentPerBed.toLocaleString()}<span style={styles.rentSub}>/bed/month</span></div>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(room.id)}>🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { color: '#94a3b8', fontSize: '13px', marginTop: '4px' },
  addBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { borderRadius: '14px', padding: '20px', textAlign: 'center' },
  statValue: { fontSize: '32px', fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: '13px', marginTop: '4px' },
  formCard: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  formTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginTop: 0, marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  saveBtn: { marginTop: '20px', padding: '12px 32px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' },
  emptySub: { color: '#94a3b8', fontSize: '14px', margin: 0 },
  roomsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' },
  roomCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  roomHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  roomNumber: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  roomDetails: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' },
  detail: { display: 'flex', flexDirection: 'column' },
  detailKey: { fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  detailVal: { fontSize: '13px', color: '#1e293b', fontWeight: '600', marginTop: '2px' },
  bedBar: { marginBottom: '16px' },
  bedBarInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  bedText: { fontSize: '13px', color: '#64748b' },
  bedPct: { fontSize: '13px', fontWeight: '700', color: '#1e293b' },
  barBg: { height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s' },
  roomFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
  rent: { fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  rentSub: { fontSize: '11px', color: '#94a3b8', fontWeight: '400' },
  deleteBtn: { padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
};

export default Rooms;