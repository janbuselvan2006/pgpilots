import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, query, where, updateDoc
} from 'firebase/firestore';

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '',
    company: '', roomNumber: '', bedNumber: '',
    monthlyRent: '', deposit: '', checkIn: '',
    idType: 'Aadhaar', idNumber: '',
    emergencyContact: '', emergencyPhone: '',
  });

  const user = auth.currentUser;

  const fetchData = async () => {
    setLoading(true);
    const tq = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
    const tSnap = await getDocs(tq);
    setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const rq = query(collection(db, 'rooms'), where('ownerId', '==', user.uid));
    const rSnap = await getDocs(rq);
    setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({
      name: '', phone: '', email: '', address: '',
      company: '', roomNumber: '', bedNumber: '',
      monthlyRent: '', deposit: '', checkIn: '',
      idType: 'Aadhaar', idNumber: '',
      emergencyContact: '', emergencyPhone: '',
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (tenant) => {
    setForm({
      name: tenant.name || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      address: tenant.address || '',
      company: tenant.company || '',
      roomNumber: tenant.roomNumber || '',
      bedNumber: tenant.bedNumber || '',
      monthlyRent: tenant.monthlyRent || '',
      deposit: tenant.deposit || '',
      checkIn: tenant.checkIn || '',
      idType: tenant.idType || 'Aadhaar',
      idNumber: tenant.idNumber || '',
      emergencyContact: tenant.emergencyContact || '',
      emergencyPhone: tenant.emergencyPhone || '',
    });
    setEditId(tenant.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.roomNumber) {
      return alert('Please fill Name, Phone and Room Number!');
    }
    setSaving(true);
    const data = {
      ...form,
      monthlyRent: parseInt(form.monthlyRent) || 0,
      deposit: parseInt(form.deposit) || 0,
    };
    if (editId) {
      await updateDoc(doc(db, 'tenants', editId), data);
    } else {
      await addDoc(collection(db, 'tenants'), {
        ...data, ownerId: user.uid, status: 'Active', createdAt: new Date(),
      });
    }
    resetForm();
    setSaving(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tenant?')) return;
    await deleteDoc(doc(db, 'tenants', id));
    fetchData();
  };

  const filtered = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search) ||
    t.roomNumber?.includes(search)
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenant Management</h1>
          <p style={styles.subtitle}>Manage all your tenants in one place</p>
        </div>
        <button style={styles.addBtn} onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? '✕ Cancel' : '➕ Add Tenant'}
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Tenants', value: tenants.length, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Active Tenants', value: tenants.filter(t => t.status === 'Active').length, color: '#059669', bg: '#ecfdf5' },
          { label: 'Total Deposit', value: `₹${tenants.reduce((a, t) => a + (t.deposit || 0), 0).toLocaleString()}`, color: '#d97706', bg: '#fffbeb' },
          { label: 'Monthly Revenue', value: `₹${tenants.reduce((a, t) => a + (t.monthlyRent || 0), 0).toLocaleString()}`, color: '#0891b2', bg: '#ecfeff' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ ...styles.statCard, background: bg }}>
            <div style={{ ...styles.statValue, color }}>{value}</div>
            <div style={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>
            {editId ? '✏️ Edit Tenant' : '➕ Add New Tenant'}
          </h3>

          {/* Personal Details */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}>👤 Personal Details</div>
            <div style={styles.formGrid}>
              {[
                { label: 'Full Name *', key: 'name', type: 'text', ph: 'John Doe' },
                { label: 'Phone Number *', key: 'phone', type: 'tel', ph: '9876543210' },
                { label: 'Email', key: 'email', type: 'email', ph: 'john@email.com' },
                { label: 'Company / College', key: 'company', type: 'text', ph: 'ABC Company' },
                { label: 'Address', key: 'address', type: 'text', ph: 'Home address' },
              ].map(({ label, key, type, ph }) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{label}</label>
                  <input style={styles.input} type={type} placeholder={ph}
                    value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* Room Details */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}>🛏️ Room Details</div>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Room Number *</label>
                <select style={styles.input} value={form.roomNumber}
                  onChange={e => setForm({ ...form, roomNumber: e.target.value })}>
                  <option value="">Select Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.roomNumber}>
                      Room {r.roomNumber} ({r.roomType})
                    </option>
                  ))}
                </select>
              </div>
              {[
                { label: 'Bed Number', key: 'bedNumber', type: 'text', ph: 'Bed 1' },
                { label: 'Monthly Rent (₹)', key: 'monthlyRent', type: 'number', ph: '5000' },
                { label: 'Deposit (₹)', key: 'deposit', type: 'number', ph: '10000' },
                { label: 'Check-in Date', key: 'checkIn', type: 'date', ph: '' },
              ].map(({ label, key, type, ph }) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{label}</label>
                  <input style={styles.input} type={type} placeholder={ph}
                    value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* ID Proof */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}>🪪 ID Proof</div>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>ID Type</label>
                <select style={styles.input} value={form.idType}
                  onChange={e => setForm({ ...form, idType: e.target.value })}>
                  {['Aadhaar', 'Passport', 'Driving License', 'PAN Card'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>ID Number</label>
                <input style={styles.input} type="text" placeholder="Enter ID number"
                  value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}>🆘 Emergency Contact</div>
            <div style={styles.formGrid}>
              {[
                { label: 'Contact Name', key: 'emergencyContact', type: 'text', ph: 'Parent / Spouse' },
                { label: 'Contact Phone', key: 'emergencyPhone', type: 'tel', ph: '9876543210' },
              ].map(({ label, key, type, ph }) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{label}</label>
                  <input style={styles.input} type={type} placeholder={ph}
                    value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div style={styles.formButtons}>
            <button style={styles.cancelBtn} onClick={resetForm}>Cancel</button>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editId ? '✏️ Update Tenant' : '💾 Save Tenant'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={styles.searchBox}>
        <input style={styles.searchInput} type="text"
          placeholder="🔍 Search by name, phone or room..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tenants List */}
      {loading ? (
        <div style={styles.loading}>Loading tenants...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={styles.emptyText}>{search ? 'No tenants found' : 'No tenants added yet'}</p>
          <p style={styles.emptySub}>{search ? 'Try a different search' : 'Click "Add Tenant" to get started'}</p>
        </div>
      ) : (
        <div style={styles.tenantsGrid}>
          {filtered.map(tenant => (
            <div key={tenant.id} style={styles.tenantCard}>
              <div style={styles.tenantHeader}>
                <div style={styles.tenantAvatar}>
                  {tenant.name?.charAt(0).toUpperCase()}
                </div>
                <div style={styles.tenantInfo}>
                  <div style={styles.tenantName}>{tenant.name}</div>
                  <div style={styles.tenantPhone}>📞 {tenant.phone}</div>
                </div>
                <div style={{ ...styles.statusBadge, background: '#ecfdf5', color: '#059669' }}>
                  {tenant.status}
                </div>
              </div>
              <div style={styles.tenantDetails}>
                {[
                  ['🛏️ Room', `Room ${tenant.roomNumber}`],
                  ['🪑 Bed', tenant.bedNumber || 'N/A'],
                  ['💰 Rent', `₹${(tenant.monthlyRent || 0).toLocaleString()}/mo`],
                  ['💵 Deposit', `₹${(tenant.deposit || 0).toLocaleString()}`],
                  ['📅 Check-in', tenant.checkIn || 'N/A'],
                  ['🪪 ID', tenant.idType],
                ].map(([k, v]) => (
                  <div key={k} style={styles.detail}>
                    <span style={styles.detailKey}>{k}</span>
                    <span style={styles.detailVal}>{v}</span>
                  </div>
                ))}
              </div>
              {tenant.company && (
                <div style={styles.company}>🏢 {tenant.company}</div>
              )}
              <div style={styles.tenantFooter}>
                <button style={styles.editBtn} onClick={() => handleEdit(tenant)}>
                  ✏️ Edit
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(tenant.id)}>
                  🗑️ Remove
                </button>
              </div>
            </div>
          ))}
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
  statValue: { fontSize: '28px', fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: '13px', marginTop: '4px' },
  formCard: { background: 'white', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  formTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b', marginTop: 0, marginBottom: '24px' },
  formSection: { marginBottom: '24px' },
  formSectionTitle: { fontSize: '14px', fontWeight: '700', color: '#4f46e5', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' },
  formButtons: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { padding: '12px 24px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { padding: '12px 32px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  searchBox: { marginBottom: '20px' },
  searchInput: { width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' },
  loading: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  empty: { textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' },
  emptySub: { color: '#94a3b8', fontSize: '14px', margin: 0 },
  tenantsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' },
  tenantCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  tenantHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  tenantAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px', flexShrink: 0 },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  tenantPhone: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
  statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  tenantDetails: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' },
  detail: { display: 'flex', flexDirection: 'column' },
  detailKey: { fontSize: '11px', color: '#94a3b8', fontWeight: '600' },
  detailVal: { fontSize: '13px', color: '#1e293b', fontWeight: '600', marginTop: '2px' },
  company: { fontSize: '13px', color: '#64748b', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' },
  tenantFooter: { display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' },
  editBtn: { padding: '8px 14px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
};

export default Tenants;