import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { db, auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, addDoc, getDocs,
  doc, query, where, updateDoc
} from 'firebase/firestore';

const RELATIONS = ['Father','Mother','Brother','Sister','Grandfather','Grandmother','Guardian','Other'];
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];
const DISTRICTS = {
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Salem','Tiruchirappalli'],
  'Karnataka': ['Bengaluru Urban','Mysuru','Mangaluru','Hubballi','Belagavi'],
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Thane'],
  'Delhi': ['Central Delhi','East Delhi','North Delhi','South Delhi','West Delhi'],
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .tn-root {
    font-family: 'DM Sans', sans-serif;
    background: #f0f2f8;
    min-height: 100vh;
  }

  .tn-topbar {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    padding: 20px 20px 28px;
    position: relative; overflow: hidden;
  }
  .tn-topbar::after {
    content: '';
    position: absolute;
    width: 200px; height: 200px; border-radius: 50%;
    background: rgba(233,69,96,0.13);
    top: -60px; right: -40px; pointer-events: none;
  }
  .tn-topbar-row {
    display: flex; justify-content: space-between;
    align-items: flex-start; position: relative; z-index: 1;
  }
  .tn-page-title { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 3px; }
  .tn-page-sub   { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; }
  .tn-add-fab {
    width: 44px; height: 44px; border-radius: 14px;
    background: #e94560; border: none; color: white;
    font-size: 22px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 4px 14px rgba(233,69,96,0.45);
    -webkit-tap-highlight-color: transparent; flex-shrink: 0;
    transition: transform 0.15s;
  }
  .tn-add-fab:active   { transform: scale(0.92); }
  .tn-add-fab:disabled { opacity: 0.5; cursor: not-allowed; }

  .tn-stats {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 0; margin: -14px 16px 0;
    background: white; border-radius: 16px; overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1); position: relative; z-index: 2;
  }
  .tn-stat { padding: 12px 6px; text-align: center; border-right: 1px solid #f1f5f9; }
  .tn-stat:last-child { border-right: none; }
  .tn-stat-num   { font-size: 17px; font-weight: 800; line-height: 1.1; }
  .tn-stat-label { font-size: 8px; color: #94a3b8; font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.3px; }

  .tn-content { padding: 20px 16px 100px; }

  .tn-banner {
    border-radius: 14px; padding: 12px 16px;
    margin-bottom: 14px; display: flex; align-items: center; gap: 12px;
  }
  .tn-banner-icon  { font-size: 20px; flex-shrink: 0; }
  .tn-banner-title { font-size: 13px; font-weight: 700; }
  .tn-banner-sub   { font-size: 11px; margin-top: 2px; }

  .tn-search {
    width: 100%; padding: 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 14px;
    font-size: 14px; font-family: inherit;
    background: white; outline: none;
    box-sizing: border-box; margin-bottom: 16px;
    -webkit-appearance: none; transition: border-color 0.2s;
  }
  .tn-search:focus { border-color: #e94560; }

  .tc { background: white; border-radius: 18px; margin-bottom: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
  .tc-accent { height: 4px; }
  .tc-body   { padding: 14px; }
  .tc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .tc-avatar {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 18px; flex-shrink: 0;
    background: linear-gradient(135deg, #4f46e5, #0891b2);
  }
  .tc-name         { font-size: 15px; font-weight: 800; color: #1e293b; }
  .tc-phone        { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .tc-status-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: #ecfdf5; color: #059669; }
  .tc-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .tc-detail-item { display: flex; flex-direction: column; }
  .tc-detail-key  { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .tc-detail-val  { font-size: 13px; color: #1e293b; font-weight: 700; margin-top: 2px; }
  .tc-company { font-size: 12px; color: #64748b; padding: 7px 10px; background: #f8fafc; border-radius: 8px; margin-bottom: 12px; }
  .tc-footer  { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
  .tc-edit-btn { flex: 1; padding: 10px; background: #eef2ff; color: #4f46e5; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
  .tc-del-btn  { flex: 1; padding: 10px; background: #fef2f2; color: #dc2626; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
  .tc-pdf-btn  { flex: 1; padding: 10px; background: #f0fdf4; color: #059669; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }

  .tn-empty       { text-align: center; padding: 50px 20px; background: white; border-radius: 18px; }
  .tn-empty-icon  { font-size: 48px; margin-bottom: 12px; }
  .tn-empty-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
  .tn-empty-sub   { font-size: 13px; color: #94a3b8; margin: 0 0 24px; }
  .tn-empty-btn   { padding: 13px 28px; background: linear-gradient(135deg, #e94560, #0f3460); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .tn-loading     { text-align: center; padding: 50px; color: #94a3b8; font-size: 14px; }
  .tn-spinner     { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: #e94560; border-radius: 50%; animation: tnspin 0.7s linear infinite; margin: 0 auto 12px; }
  @keyframes tnspin { to { transform: rotate(360deg); } }

  .tn-no-pg { text-align: center; padding: 60px 20px; background: white; border-radius: 20px; margin: 20px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }

  .bso { position: fixed; inset: 0; background: rgba(15,20,40,0.55); z-index: 100; backdrop-filter: blur(2px); animation: bsFade 0.2s ease; }
  @keyframes bsFade { from { opacity:0; } to { opacity:1; } }
  .bs {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: white; border-radius: 24px 24px 0 0;
    z-index: 101; max-height: 94dvh; overflow-y: auto;
    animation: bsUp 0.3s cubic-bezier(0.32,0.72,0,1);
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
  }
  @keyframes bsUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @media (min-width: 640px) {
    .bs { left: 50%; right: auto; width: 560px; border-radius: 24px; bottom: 50%; transform: translate(-50%, 50%); animation: bsZoom 0.25s cubic-bezier(0.32,0.72,0,1); max-height: 90vh; }
    @keyframes bsZoom { from { opacity:0; transform: translate(-50%,50%) scale(0.95); } to { opacity:1; transform: translate(-50%,50%) scale(1); } }
    .tn-stats   { margin: -14px 24px 0; }
    .tn-content { padding: 24px 24px 40px; }
    .tc-details { grid-template-columns: repeat(3,1fr); }
  }
  .bs-handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 99px; margin: 12px auto 0; }
  .bs-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px 8px; position: sticky; top: 0; background: white; z-index: 1; border-bottom: 1px solid #f1f5f9; }
  .bs-title  { font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0; }
  .bs-close  { width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; border: none; font-size: 14px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; -webkit-tap-highlight-color: transparent; }
  .bs-body   { padding: 16px 20px 96px; }

  .fs-section       { margin-bottom: 22px; }
  .fs-section-title { font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eef2ff; display: flex; align-items: center; gap: 6px; }
  .fs-field  { margin-bottom: 12px; }
  .fs-label  { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  .fs-input  { width: 100%; padding: 13px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; font-family: inherit; color: #1a1a2e; background: #fafbff; outline: none; box-sizing: border-box; -webkit-appearance: none; transition: border-color 0.2s; }
  .fs-input:focus { border-color: #e94560; background: white; }
  .fs-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fs-row-3  { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .fs-no-bed { padding: 13px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; border: 1.5px solid #fde68a; background: #fffbeb; color: #d97706; }
  .fs-no-bed.error { border-color: #fecaca; background: #fef2f2; color: #dc2626; }

  .fs-room-preview { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px; margin-top: 10px; }
  .fs-rp-title     { font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .fs-rp-chips     { display: flex; flex-wrap: wrap; gap: 6px; }
  .fs-rp-chip      { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; background: white; color: #166534; }

  .fs-bed-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .fs-bed-btn  { width: 44px; height: 44px; border-radius: 10px; border: 2px solid #e2e8f0; background: #f8fafc; font-size: 14px; font-weight: 800; color: #475569; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: all 0.15s; -webkit-tap-highlight-color: transparent; }
  .fs-bed-btn.vacant   { border-color: #059669; color: #059669; background: #f0fdf4; }
  .fs-bed-btn.selected { background: #059669; color: white; border-color: #059669; }
  .fs-bed-btn.occupied { border-color: #e2e8f0; color: #cbd5e0; background: #f8fafc; cursor: not-allowed; }

  .fs-seg     { display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; gap: 3px; flex-wrap: wrap; }
  .fs-seg-btn { flex: 1; min-width: 60px; padding: 8px 4px; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; background: transparent; color: #94a3b8; font-family: inherit; transition: all 0.2s; -webkit-tap-highlight-color: transparent; white-space: nowrap; }
  .fs-seg-btn.active { background: white; color: #4f46e5; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

  .fs-save-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #e94560, #0f3460); color: white; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 6px; box-shadow: 0 4px 14px rgba(233,69,96,0.3); -webkit-tap-highlight-color: transparent; transition: opacity 0.2s, transform 0.1s; }
  .fs-save-btn:active   { transform: scale(0.98); opacity: 0.9; }
  .fs-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .fs-hint { font-size: 11px; color: #94a3b8; margin-top: 4px; }

  /* Family rows */
  .fs-family-row { display: grid; grid-template-columns: 1fr 1fr 0.5fr 1fr auto; gap: 8px; align-items: end; margin-bottom: 10px; }
  .fs-family-row .fs-input, .fs-family-row select { font-size: 13px; padding: 10px 10px; }
  .fs-add-btn { padding: 8px 14px; background: #eef2ff; color: #4f46e5; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .fs-remove-btn { padding: 8px 10px; background: #fef2f2; color: #dc2626; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; min-width: 32px; height: 40px; display: flex; align-items: center; justify-content: center; }

  @media (max-width: 639px) {
    .fs-family-row { grid-template-columns: 1fr 1fr; }
    .fs-family-row > *:nth-child(5) { grid-column: span 2; justify-self: start; }
  }

  .del-sheet   { padding: 20px 20px 32px; text-align: center; }
  .del-icon    { font-size: 44px; margin-bottom: 12px; }
  .del-title   { font-size: 17px; font-weight: 800; color: #1e293b; margin: 0 0 6px; }
  .del-sub     { font-size: 13px; color: #94a3b8; margin: 0 0 24px; line-height: 1.6; }
  .del-btn-row { display: flex; gap: 10px; }
  .del-cancel  { flex:1; padding:13px; background:#f1f5f9; color:#64748b; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }
  .del-confirm { flex:1; padding:13px; background:#dc2626; color:white; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }

  .qr-overlay {
    position: fixed; inset: 0; background: rgba(15,20,40,0.6);
    z-index: 120; display: flex; align-items: center; justify-content: center;
    padding: 20px; backdrop-filter: blur(3px);
  }
  .qr-modal {
    background: white; border-radius: 18px; padding: 20px;
    width: 100%; max-width: 360px; text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  }
  .qr-title { font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
  .qr-sub   { font-size: 12px; color: #94a3b8; margin-bottom: 14px; }
  .qr-img   { width: 200px; height: 200px; object-fit: contain; margin: 0 auto 12px; }
  .qr-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .qr-btn {
    padding: 10px; border-radius: 10px; border: none; cursor: pointer;
    font-size: 12px; font-weight: 700; font-family: inherit;
  }
  .qr-copy { background: #eef2ff; color: #4f46e5; }
  .qr-manual { background: #e94560; color: white; }

  @media (min-width: 640px) {
    .tn-tenants-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
    .tn-tenants-grid .tc { margin-bottom: 0; }
  }
  @media (min-width: 1024px) {
    .tn-tenants-grid { grid-template-columns: repeat(3,1fr); }
  }
`;

const EMPTY_FORM = {
  name:'', phone:'', email:'', company:'',
  admissionNumber:'', dateOfJoining:'', dob:'', age:'', bloodGroup:'',
  maritalStatus:'', nationality:'',
  addressLine:'', state:'', district:'', city:'', pincode:'',
  organizationType:'College', organizationName:'', designation:'',
  organizationAddress:'', organizationPhone:'',
  roomNumber:'', bedNumber:'', monthlyRent:'', deposit:'',
  checkIn:'', idType:'Aadhaar', idNumber:'',
  emergencyContact:'', emergencyPhone:'',
  guardianName:'', guardianPhone:'',
};

export default function Tenants({ pgId }) {
  const [tenants, setTenants]           = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState('');
  const [editId, setEditId]             = useState(null);
  const [showQr, setShowQr]             = useState(false);
  const [qrDataUrl, setQrDataUrl]       = useState('');
  const [qrToken, setQrToken]           = useState('');
  const [qrLoading, setQrLoading]       = useState(false);
  const [family, setFamily]             = useState([{ relation: 'Father', name: '', age: '', phone: '' }]);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });

  const user = auth.currentUser;
  const qrLink = qrToken ? `${window.location.origin}/tenant-onboard?token=${qrToken}` : '';

  useEffect(() => {
    const generateToken = async () => {
      if (!showQr || !pgId || !user) return;
      setQrLoading(true);
      try {
        const fn = httpsCallable(getFunctions(), 'createOnboardingToken');
        const res = await fn({ pgId });
        setQrToken(res.data?.token || '');
      } catch (e) {
        console.error(e);
        setQrToken('');
      }
      setQrLoading(false);
    };
    generateToken();
  }, [showQr, pgId, user]);

  useEffect(() => {
    let active = true;
    if (!qrLink) { setQrDataUrl(''); return; }
    QRCode.toDataURL(qrLink, { width: 220, margin: 2 })
      .then(url => { if (active) setQrDataUrl(url); })
      .catch(() => { if (active) setQrDataUrl(''); });
    return () => { active = false; };
  }, [qrLink]);

  const fetchData = async () => {
    if (!user || !pgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const tSnap = await getDocs(query(collection(db, 'tenants'), where('pgId', '==', pgId)));
      setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'deleted'));
      const rSnap = await getDocs(query(collection(db, 'rooms'), where('pgId', '==', pgId)));
      setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [pgId]);

  const tenantCount = tenants.length;

  const getVacantBeds = (roomNumber) => {
    if (!roomNumber) return [];
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return [];
    const occupied = tenants
      .filter(t => t.roomNumber === roomNumber && t.id !== editId)
      .map(t => parseInt(t.bedNumber)).filter(n => !isNaN(n));
    const all = [];
    for (let i = 1; i <= room.totalBeds; i++) all.push({ num: i, occupied: occupied.includes(i) });
    return all;
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setFamily([{ relation: 'Father', name: '', age: '', phone: '' }]);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (tenant) => {
    setForm({
      name: tenant.name||'', phone: tenant.phone||'', email: tenant.email||'',
      company: tenant.company||'',
      admissionNumber: tenant.admissionNumber||'', dateOfJoining: tenant.dateOfJoining||'',
      dob: tenant.dob||'', age: tenant.age||'', bloodGroup: tenant.bloodGroup||'',
      maritalStatus: tenant.maritalStatus||'', nationality: tenant.nationality||'',
      addressLine: tenant.addressLine || tenant.address ||'',
      state: tenant.state||'', district: tenant.district||'',
      city: tenant.city||'', pincode: tenant.pincode||'',
      organizationType: tenant.organizationType||'College',
      organizationName: tenant.organizationName || tenant.company ||'',
      designation: tenant.designation||'',
      organizationAddress: tenant.organizationAddress||'',
      organizationPhone: tenant.organizationPhone||'',
      roomNumber: tenant.roomNumber||'', bedNumber: tenant.bedNumber||'',
      monthlyRent: tenant.monthlyRent||'', deposit: tenant.deposit||'',
      checkIn: tenant.checkIn||'', idType: tenant.idType||'Aadhaar',
      idNumber: tenant.idNumber||'',
      emergencyContact: tenant.emergencyContact||'',
      emergencyPhone: tenant.emergencyPhone||'',
      guardianName: tenant.guardianName||'',
      guardianPhone: tenant.guardianPhone||'',
    });
    setFamily(
      Array.isArray(tenant.family) && tenant.family.length > 0
        ? tenant.family
        : [{ relation: 'Father', name: '', age: '', phone: '' }]
    );
    setEditId(tenant.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.roomNumber) return alert('Please fill Name, Phone and Room Number!');
    if (!form.bedNumber) return alert('Please select a Bed Number!');
    if (!pgId) return alert('No PG selected!');
    setSaving(true);
    try {
      const data = {
        ...form,
        monthlyRent: parseInt(form.monthlyRent) || 0,
        deposit:     parseInt(form.deposit)     || 0,
        family: family.filter(f => f.name || f.phone),
      };
      if (editId) {
        const old = tenants.find(t => t.id === editId);
        if (old && old.roomNumber !== form.roomNumber) {
          const oldRoom = rooms.find(r => r.roomNumber === old.roomNumber);
          if (oldRoom) await updateDoc(doc(db, 'rooms', oldRoom.id), { occupiedBeds: Math.max(0, (oldRoom.occupiedBeds || 0) - 1) });
          const newRoom = rooms.find(r => r.roomNumber === form.roomNumber);
          if (newRoom) await updateDoc(doc(db, 'rooms', newRoom.id), { occupiedBeds: (newRoom.occupiedBeds || 0) + 1 });
        }
        await updateDoc(doc(db, 'tenants', editId), data);
      } else {
        await addDoc(collection(db, 'tenants'), {
          ...data,
          ownerId:   user.uid,
          pgId:      pgId,
          status:    'Active',
          createdAt: new Date(),
        });
        const room = rooms.find(r => r.roomNumber === form.roomNumber);
        if (room) await updateDoc(doc(db, 'rooms', room.id), { occupiedBeds: (room.occupiedBeds || 0) + 1 });
      }
      resetForm();
      fetchData();
    } catch (e) { console.error(e); alert('Something went wrong!'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await updateDoc(doc(db, 'tenants', deleteTarget.id), {
        status: 'deleted', deletedAt: new Date().toISOString(),
      });
      const rSnap = await getDocs(query(collection(db, 'rooms'),
        where('pgId', '==', pgId),
        where('roomNumber', '==', deleteTarget.roomNumber)
      ));
      if (!rSnap.empty) {
        const rd = rSnap.docs[0];
        await updateDoc(doc(db, 'rooms', rd.id), { occupiedBeds: Math.max(0, (rd.data().occupiedBeds || 0) - 1) });
      }
      setDeleteTarget(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const filtered = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search) ||
    t.roomNumber?.includes(search)
  );

  const beds         = getVacantBeds(form.roomNumber);
  const selectedRoom = rooms.find(r => r.roomNumber === form.roomNumber);

  // Family helpers
  const addFamilyRow = () => {
    setFamily(rows => [...rows, { relation: 'Father', name: '', age: '', phone: '' }]);
  };
  const removeFamilyRow = (idx) => {
    setFamily(rows => rows.filter((_, i) => i !== idx));
  };
  const updateFamily = (idx, field, value) => {
    setFamily(rows => {
      const next = [...rows];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  if (!pgId) {
    return (
      <>
        <style>{css}</style>
        <div className="tn-no-pg">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>No PG Selected</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Please select a PG from the dashboard.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="tn-root">

        {/* Top bar */}
        <div className="tn-topbar">
          <div className="tn-topbar-row">
            <div>
              <h1 className="tn-page-title">Tenants</h1>
              <p className="tn-page-sub">{tenantCount} active tenants</p>
            </div>
            <button className="tn-add-fab"
              onClick={() => setShowQr(true)}>
              ＋
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="tn-stats">
          {[
            { label:'Tenants', value: tenantCount, color: '#4f46e5' },
            { label:'Active',   value: tenants.filter(t => t.status === 'Active').length, color:'#059669' },
            { label:'Deposits', value:`₹${tenants.reduce((a,t) => a+(t.deposit||0), 0).toLocaleString('en-IN')}`, color:'#d97706' },
            { label:'Revenue',  value:`₹${tenants.reduce((a,t) => a+(t.monthlyRent||0), 0).toLocaleString('en-IN')}`, color:'#0891b2' },
          ].map(({ label, value, color }) => (
            <div key={label} className="tn-stat">
              <div className="tn-stat-num" style={{ color }}>{value}</div>
              <div className="tn-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="tn-content">

          <input className="tn-search" type="text"
            placeholder="🔍 Search by name, phone or room…"
            value={search} onChange={e => setSearch(e.target.value)} />

          {loading ? (
            <div className="tn-loading"><div className="tn-spinner" />Loading tenants…</div>
          ) : filtered.length === 0 ? (
            <div className="tn-empty">
              <div className="tn-empty-icon">👥</div>
              <p className="tn-empty-title">{search ? 'No tenants found' : 'No tenants yet'}</p>
              <p className="tn-empty-sub">{search ? 'Try a different search' : 'Add your first tenant to get started'}</p>
              {!search && (
                <button className="tn-empty-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                  ➕ Add First Tenant
                </button>
              )}
            </div>
          ) : (
            <div className="tn-tenants-grid">
              {filtered.map(tenant => (
                <div key={tenant.id} className="tc">
                  <div className="tc-accent" style={{ background:'linear-gradient(90deg,#4f46e5,#0891b2)' }} />
                  <div className="tc-body">
                    <div className="tc-header">
                      <div className="tc-avatar">{tenant.name?.charAt(0).toUpperCase()}</div>
                      <div style={{ flex:1 }}>
                        <div className="tc-name">{tenant.name}</div>
                        <div className="tc-phone">📞 {tenant.phone}</div>
                      </div>
                      <div className="tc-status-badge">{tenant.status}</div>
                    </div>

                    <div className="tc-details">
                      {[
                        ['🛏️ Room',    `Room ${tenant.roomNumber}`],
                        ['🪑 Bed',     `Bed ${tenant.bedNumber || 'N/A'}`],
                        ['💰 Rent',    `₹${(tenant.monthlyRent||0).toLocaleString('en-IN')}/mo`],
                        ['💵 Deposit', `₹${(tenant.deposit||0).toLocaleString('en-IN')}`],
                        ['📅 Check-in', tenant.checkIn || tenant.dateOfJoining || 'N/A'],
                        ['🪪 ID',      tenant.idType],
                      ].map(([k, v]) => (
                        <div key={k} className="tc-detail-item">
                          <span className="tc-detail-key">{k}</span>
                          <span className="tc-detail-val">{v}</span>
                        </div>
                      ))}
                    </div>

                    {(tenant.company || tenant.organizationName) && <div className="tc-company">🏢 {tenant.organizationName || tenant.company}</div>}

                    <div className="tc-footer">
                      {tenant.onboardingPdfUrl && (
                        <button className="tc-pdf-btn" onClick={() => window.open(tenant.onboardingPdfUrl, '_blank')}>⬇️ PDF</button>
                      )}
                      <button className="tc-edit-btn" onClick={() => handleEdit(tenant)}>✏️ Edit</button>
                      <button className="tc-del-btn"  onClick={() => setDeleteTarget(tenant)}>🗑️ Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Modal */}
        {showQr && (
          <div className="qr-overlay" onClick={() => { setShowQr(false); setQrToken(''); setQrDataUrl(''); }}>
            <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
              <div className="qr-title">Tenant Self Onboarding</div>
              <div className="qr-sub">Ask tenant to scan and fill the form</div>
              {qrLoading ? (
                <div className="tn-loading">Generating QR…</div>
              ) : qrDataUrl ? (
                <img className="qr-img" alt="Tenant QR" src={qrDataUrl} />
              ) : (
                <div className="tn-loading">QR unavailable</div>
              )}
              <div className="qr-actions">
                <button className="qr-btn qr-copy"
                  onClick={() => {
                    if (!qrLink) return;
                    navigator.clipboard.writeText(qrLink);
                  }}>
                  Copy Link
                </button>
                <button className="qr-btn qr-manual"
                  onClick={() => { setShowQr(false); resetForm(); setShowForm(true); }}>
                  Add Manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ Add / Edit Sheet — Full Form (matches TenantOnboard) ══════════ */}
        {showForm && (
          <>
            <div className="bso" onClick={resetForm} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="bs-header">
                <h2 className="bs-title">{editId ? '✏️ Edit Tenant' : '➕ Add Tenant'}</h2>
                <button className="bs-close" onClick={resetForm}>✕</button>
              </div>
              <div className="bs-body">

                {/* ── Personal Details ── */}
                <div className="fs-section">
                  <div className="fs-section-title">👤 Personal Details</div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">Admission Number</label>
                      <input className="fs-input" placeholder="ADM001"
                        value={form.admissionNumber} onChange={e => setForm({ ...form, admissionNumber: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Date of Joining</label>
                      <input className="fs-input" type="date"
                        value={form.dateOfJoining} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">Full Name *</label>
                      <input className="fs-input" placeholder="John Doe"
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Phone *</label>
                      <input className="fs-input" type="tel" inputMode="numeric" placeholder="9876543210"
                        value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-row-3">
                    <div className="fs-field">
                      <label className="fs-label">DOB</label>
                      <input className="fs-input" type="date"
                        value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Age</label>
                      <input className="fs-input" placeholder="25"
                        value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Blood Group</label>
                      <input className="fs-input" placeholder="O+"
                        value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">Email</label>
                      <input className="fs-input" type="email" placeholder="john@email.com"
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Marital Status</label>
                      <input className="fs-input" placeholder="Single / Married"
                        value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-field">
                    <label className="fs-label">Nationality</label>
                    <input className="fs-input" placeholder="Indian"
                      value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
                  </div>
                </div>

                {/* ── Address Details ── */}
                <div className="fs-section">
                  <div className="fs-section-title">📍 Address Details</div>
                  <div className="fs-field">
                    <label className="fs-label">Address Line</label>
                    <input className="fs-input" placeholder="Door No, Street, Area"
                      value={form.addressLine} onChange={e => setForm({ ...form, addressLine: e.target.value })} />
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">State</label>
                      <select className="fs-input" value={form.state}
                        onChange={e => setForm({ ...form, state: e.target.value, district: '' })}>
                        <option value="">Select State</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">District</label>
                      <input className="fs-input" list="fs-districts" placeholder="Type district"
                        value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
                      <datalist id="fs-districts">
                        {(DISTRICTS[form.state] || []).map(d => <option key={d} value={d} />)}
                      </datalist>
                      <div className="fs-hint">Type to enter if not listed</div>
                    </div>
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">City</label>
                      <input className="fs-input" placeholder="City / Town"
                        value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Pincode</label>
                      <input className="fs-input" placeholder="600001"
                        value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* ── Family Information ── */}
                <div className="fs-section">
                  <div className="fs-section-title">👨‍👩‍👧 Family Information</div>
                  {family.map((row, idx) => (
                    <div key={idx} className="fs-family-row">
                      <select className="fs-input" value={row.relation}
                        onChange={e => updateFamily(idx, 'relation', e.target.value)}>
                        {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input className="fs-input" placeholder="Name" value={row.name}
                        onChange={e => updateFamily(idx, 'name', e.target.value)} />
                      <input className="fs-input" placeholder="Age" value={row.age}
                        onChange={e => updateFamily(idx, 'age', e.target.value)} />
                      <input className="fs-input" placeholder="Mobile No" value={row.phone}
                        onChange={e => updateFamily(idx, 'phone', e.target.value)} />
                      {family.length > 1 && (
                        <button type="button" className="fs-remove-btn" onClick={() => removeFamilyRow(idx)}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="fs-add-btn" onClick={addFamilyRow}>+ Add Family Member</button>
                </div>

                {/* ── Professional Details ── */}
                <div className="fs-section">
                  <div className="fs-section-title">💼 Professional Details</div>
                  <div className="fs-field">
                    <label className="fs-label">Organization Type</label>
                    <div className="fs-seg">
                      {['College', 'Company', 'Other'].map(t => (
                        <button key={t} className={`fs-seg-btn${form.organizationType === t ? ' active' : ''}`}
                          onClick={() => setForm({ ...form, organizationType: t })}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">College / Company Name</label>
                      <input className="fs-input" placeholder="ABC College / XYZ Corp"
                        value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Designation</label>
                      <input className="fs-input" placeholder="Student / Engineer"
                        value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">Organization Address</label>
                      <input className="fs-input" placeholder="Org address"
                        value={form.organizationAddress} onChange={e => setForm({ ...form, organizationAddress: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Organization Phone</label>
                      <input className="fs-input" type="tel" placeholder="044-12345678"
                        value={form.organizationPhone} onChange={e => setForm({ ...form, organizationPhone: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* ── Room & Bed ── */}
                <div className="fs-section">
                  <div className="fs-section-title">🛏️ Room & Bed</div>
                  <div className="fs-field">
                    <label className="fs-label">Room Number *</label>
                    <select className="fs-input" value={form.roomNumber}
                      onChange={e => setForm({ ...form, roomNumber: e.target.value, bedNumber: '' })}>
                      <option value="">Select Room</option>
                      {rooms.map(r => {
                        const vacant = r.totalBeds - (r.occupiedBeds || 0);
                        return (
                          <option key={r.id} value={r.roomNumber}
                            disabled={vacant === 0 && r.roomNumber !== form.roomNumber}>
                            Room {r.roomNumber} ({r.roomType}) — {vacant} vacant
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {form.roomNumber && (
                    <div className="fs-field">
                      <label className="fs-label">Bed Number *</label>
                      {beds.length === 0 ? (
                        <div className="fs-no-bed error">❌ No vacant beds in this room!</div>
                      ) : (
                        <div className="fs-bed-grid">
                          {beds.map(({ num, occupied }) => (
                            <button key={num}
                              className={`fs-bed-btn ${occupied ? 'occupied' : form.bedNumber == num ? 'selected' : 'vacant'}`}
                              disabled={occupied}
                              onClick={() => !occupied && setForm({ ...form, bedNumber: num.toString() })}>
                              {num}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!form.roomNumber && <div className="fs-no-bed">← Select a room first</div>}

                  {selectedRoom && (
                    <div className="fs-room-preview">
                      <div className="fs-rp-title">📋 Room Info</div>
                      <div className="fs-rp-chips">
                        <span className="fs-rp-chip">🛏️ {selectedRoom.totalBeds} beds</span>
                        <span className="fs-rp-chip" style={{ color:'#059669' }}>🟢 {selectedRoom.totalBeds-(selectedRoom.occupiedBeds||0)} vacant</span>
                        <span className="fs-rp-chip" style={{ color:'#dc2626' }}>🔴 {selectedRoom.occupiedBeds||0} occupied</span>
                        <span className="fs-rp-chip">💰 ₹{selectedRoom.rentPerBed?.toLocaleString('en-IN')}/bed</span>
                      </div>
                    </div>
                  )}

                  <div className="fs-row" style={{ marginTop:'12px' }}>
                    <div className="fs-field">
                      <label className="fs-label">Monthly Rent (₹)</label>
                      <input className="fs-input" type="number" inputMode="numeric" placeholder="5000"
                        value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Deposit (₹)</label>
                      <input className="fs-input" type="number" inputMode="numeric" placeholder="10000"
                        value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-field">
                    <label className="fs-label">Check-in Date</label>
                    <input className="fs-input" type="date"
                      value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} />
                  </div>
                </div>

                {/* ── ID Proof ── */}
                <div className="fs-section">
                  <div className="fs-section-title">🪪 ID Proof</div>
                  <div className="fs-field">
                    <label className="fs-label">ID Type</label>
                    <div className="fs-seg">
                      {['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Voter ID'].map(t => (
                        <button key={t} className={`fs-seg-btn${form.idType === t ? ' active' : ''}`}
                          onClick={() => setForm({ ...form, idType: t })}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="fs-field">
                    <label className="fs-label">ID Number</label>
                    <input className="fs-input" placeholder="Enter ID number"
                      value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
                  </div>
                </div>

                {/* ── Emergency / Guardian ── */}
                <div className="fs-section">
                  <div className="fs-section-title">🆘 Emergency & Guardian</div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">Emergency Contact</label>
                      <input className="fs-input" placeholder="Name"
                        value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Emergency Phone</label>
                      <input className="fs-input" type="tel" inputMode="numeric" placeholder="9876543210"
                        value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} />
                    </div>
                  </div>
                  <div className="fs-row">
                    <div className="fs-field">
                      <label className="fs-label">Guardian Name</label>
                      <input className="fs-input" placeholder="Guardian name"
                        value={form.guardianName} onChange={e => setForm({ ...form, guardianName: e.target.value })} />
                    </div>
                    <div className="fs-field">
                      <label className="fs-label">Guardian Phone</label>
                      <input className="fs-input" type="tel" inputMode="numeric" placeholder="9876543210"
                        value={form.guardianPhone} onChange={e => setForm({ ...form, guardianPhone: e.target.value })} />
                    </div>
                  </div>
                </div>

                <button className="fs-save-btn" onClick={handleSave}
                  disabled={saving}>
                  {saving ? 'Saving…' : editId ? '✏️ Update Tenant' : '💾 Save Tenant'}
                </button>

              </div>
            </div>
          </>
        )}

        {/* Delete Confirm */}
        {deleteTarget && (
          <>
            <div className="bso" onClick={() => setDeleteTarget(null)} />
            <div className="bs">
              <div className="bs-handle" />
              <div className="del-sheet">
                <div className="del-icon">🗑️</div>
                <p className="del-title">Remove {deleteTarget.name}?</p>
                <p className="del-sub">They will be removed from active tenants.<br />Their rent history will be preserved in Reports.</p>
                <div className="del-btn-row">
                  <button className="del-cancel"  onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button className="del-confirm" onClick={handleDelete}>Yes, Remove</button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}
