import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Secondary Firebase app — used ONLY to create staff accounts
// without signing out the current owner
const firebaseConfig = {
  apiKey: "AIzaSyDIvLqFM0jMWJtPAMyOkU4HdrYJKsoknTo",
  authDomain: "new2-42396.firebaseapp.com",
  projectId: "new2-42396",
  storageBucket: "new2-42396.firebasestorage.app",
  messagingSenderId: "186741862906",
  appId: "1:186741862906:web:8cde0b14daba62f1823443",
};
const secondaryApp  = getApps().find(a => a.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .st-root { font-family:'DM Sans',sans-serif; background:#f0f2f8; min-height:100vh; }

  .st-topbar {
    background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
    padding:20px 20px 28px; position:relative; overflow:hidden;
  }
  .st-topbar::after {
    content:''; position:absolute; width:200px; height:200px; border-radius:50%;
    background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none;
  }
  .st-topbar-row { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; }
  .st-page-title { font-size:22px; font-weight:800; color:#fff; margin:0 0 3px; }
  .st-page-sub   { font-size:12px; color:rgba(255,255,255,0.5); font-weight:500; }

  .st-profile-chip {
    display:flex; align-items:center; gap:10px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
    border-radius:14px; padding:10px 14px; position:relative; z-index:1;
    margin-top:16px;
  }
  .st-profile-avatar {
    width:44px; height:44px; border-radius:12px;
    background:linear-gradient(135deg,#e94560,#0f3460);
    display:flex; align-items:center; justify-content:center;
    color:white; font-weight:800; font-size:18px; flex-shrink:0; overflow:hidden;
  }
  .st-profile-avatar img { width:100%; height:100%; object-fit:cover; }
  .st-profile-name { font-size:14px; font-weight:800; color:white; }
  .st-profile-pg   { font-size:11px; color:rgba(255,255,255,0.5); margin-top:2px; }
  .st-plan-tag     { font-size:10px; font-weight:800; padding:3px 10px; border-radius:20px; display:inline-block; margin-top:4px; }
  .st-photo-btn {
    margin-left:auto; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2);
    color:white; border-radius:10px; padding:7px 12px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent;
    white-space:nowrap;
  }

  .st-content { padding:16px 16px 100px; }

  .st-tabs {
    display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:18px;
    -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  .st-tabs::-webkit-scrollbar { display:none; }
  .st-tab {
    white-space:nowrap; padding:10px 18px; border-radius:20px;
    border:1.5px solid #e2e8f0; background:white;
    font-size:13px; font-weight:700; color:#64748b;
    cursor:pointer; font-family:inherit; flex-shrink:0;
    -webkit-tap-highlight-color:transparent; transition:all 0.15s;
  }
  .st-tab.active { background:linear-gradient(135deg,#e94560,#0f3460); color:white; border-color:transparent; }

  .st-success { background:#f0fdf4; border:1px solid #bbf7d0; color:#059669; padding:12px 16px; border-radius:12px; font-weight:600; margin-bottom:14px; font-size:13px; }
  .st-error   { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px 16px; border-radius:12px; font-weight:600; margin-bottom:14px; font-size:13px; }

  .st-card { background:white; border-radius:18px; padding:20px; margin-bottom:14px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
  .st-card-title { font-size:16px; font-weight:800; color:#1a1a2e; margin:0 0 4px; }
  .st-card-sub   { font-size:12px; color:#94a3b8; margin-bottom:18px; }

  .st-field { margin-bottom:14px; }
  .st-label { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }
  .st-input {
    width:100%; padding:13px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit; color:#1a1a2e; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition:border-color 0.2s;
  }
  .st-input:focus { border-color:#e94560; background:white; }
  .st-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  .st-pass-wrap { position:relative; }
  .st-pass-input {
    width:100%; padding:13px 48px 13px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit; color:#1a1a2e; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none; transition:border-color 0.2s;
  }
  .st-pass-input:focus { border-color:#e94560; background:white; }
  .st-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:18px; user-select:none; -webkit-tap-highlight-color:transparent; }

  .st-save-btn {
    width:100%; padding:15px;
    background:linear-gradient(135deg,#e94560,#0f3460);
    color:white; border:none; border-radius:14px;
    font-size:15px; font-weight:700; font-family:inherit;
    cursor:pointer; margin-top:6px;
    box-shadow:0 4px 14px rgba(233,69,96,0.3);
    -webkit-tap-highlight-color:transparent;
    transition:opacity 0.2s,transform 0.1s;
  }
  .st-save-btn:active { transform:scale(0.98); opacity:0.9; }
  .st-save-btn:disabled { opacity:0.6; cursor:not-allowed; }

  .st-email-info { font-size:12px; color:#94a3b8; padding:10px 14px; background:#f8fafc; border-radius:10px; margin-bottom:14px; }

  .st-qr-upload {
    border:2px dashed #e2e8f0; border-radius:14px; padding:28px 20px;
    text-align:center; cursor:pointer; background:#fafbff;
    -webkit-tap-highlight-color:transparent;
  }
  .st-qr-upload:active { background:#f1f5f9; }
  .st-qr-icon  { font-size:36px; margin-bottom:8px; }
  .st-qr-text  { font-size:14px; font-weight:700; color:#475569; }
  .st-qr-sub   { font-size:12px; color:#94a3b8; margin-top:4px; }
  .st-qr-preview { display:flex; align-items:center; gap:16px; }
  .st-qr-img { width:100px; height:100px; object-fit:contain; border:1px solid #e2e8f0; border-radius:12px; padding:6px; }
  .st-qr-change { padding:10px 16px; background:#f1f5f9; color:#475569; border:none; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; -webkit-tap-highlight-color:transparent; }

  .st-tips { background:#f8fafc; border-radius:12px; padding:14px; margin-bottom:14px; }
  .st-tip-title { font-size:12px; font-weight:800; color:#475569; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.3px; }
  .st-tip { font-size:13px; color:#64748b; margin-bottom:4px; }

  .st-current-plan {
    border-radius:16px; padding:18px; margin-bottom:18px;
    display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;
  }
  .st-cp-badge { font-size:10px; font-weight:800; letter-spacing:1px; margin-bottom:4px; text-transform:uppercase; }
  .st-cp-name  { font-size:20px; font-weight:800; margin-bottom:4px; }
  .st-cp-price { font-size:14px; color:#64748b; font-weight:600; }
  .st-cp-features { display:flex; flex-direction:column; gap:4px; }
  .st-cp-feature  { font-size:13px; color:#475569; }

  .st-plans-grid { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
  @media(min-width:640px){ .st-plans-grid { display:grid; grid-template-columns:repeat(3,1fr); } }

  .st-plan-card { border-radius:14px; padding:18px; position:relative; overflow:hidden; }
  .st-plan-active-tag { position:absolute; top:10px; right:10px; color:white; font-size:10px; font-weight:800; padding:3px 8px; border-radius:20px; }
  .st-plan-name  { font-size:14px; font-weight:800; margin-bottom:3px; }
  .st-plan-price { font-size:13px; color:#64748b; font-weight:600; margin-bottom:10px; }
  .st-plan-features { margin-bottom:14px; }
  .st-plan-feat  { font-size:12px; color:#475569; margin-bottom:3px; }
  .st-upgrade-btn { width:100%; padding:10px; color:white; border:none; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent; }

  .st-support { font-size:13px; color:#94a3b8; text-align:center; padding:14px; background:#f8fafc; border-radius:10px; }

  .st-loading { text-align:center; padding:50px; color:#94a3b8; }
  .st-spinner { width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#e94560; border-radius:50%; animation:stspin 0.7s linear infinite; margin:0 auto 12px; }
  @keyframes stspin { to{transform:rotate(360deg)} }

  /* Manage PG styles */
  .st-pg-card {
    border:1.5px solid #e2e8f0; border-radius:16px; padding:16px;
    background:#fafbff; margin-bottom:12px;
  }
  .st-pg-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:10px; }
  .st-pg-title { font-size:14px; font-weight:800; color:#1a1a2e; }
  .st-pg-badge {
    font-size:10px; font-weight:800; padding:3px 8px; border-radius:20px;
    background:#e2e8f0; color:#475569; text-transform:uppercase; letter-spacing:0.4px;
  }
  .st-pg-actions { display:flex; gap:10px; margin-top:10px; }
  .st-pg-save {
    flex:1; padding:10px 12px; border-radius:10px; border:none;
    background:linear-gradient(135deg,#e94560,#0f3460); color:white;
    font-size:12px; font-weight:800; cursor:pointer; font-family:inherit;
  }
  .st-pg-delete {
    flex:1; padding:10px 12px; border-radius:10px; border:1px solid #fecaca;
    background:#fef2f2; color:#dc2626; font-size:12px; font-weight:800;
    cursor:pointer; font-family:inherit;
  }
  .st-pg-save:disabled, .st-pg-delete:disabled { opacity:0.6; cursor:not-allowed; }

  /* ── Staff Access styles ── */
  .st-staff-header {
    display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;
  }
  .st-add-staff-btn {
    padding:10px 18px;
    background:linear-gradient(135deg,#e94560,#0f3460);
    color:white; border:none; border-radius:12px;
    font-size:13px; font-weight:700; font-family:inherit;
    cursor:pointer; -webkit-tap-highlight-color:transparent;
    display:flex; align-items:center; gap:6px;
  }
  .st-add-staff-btn:disabled { opacity:0.6; cursor:not-allowed; }

  .st-staff-list { display:flex; flex-direction:column; gap:12px; }
  .st-staff-item {
    border:1.5px solid #e2e8f0; border-radius:14px; padding:14px 16px;
    display:flex; align-items:center; gap:12px; background:#fafbff;
  }
  .st-staff-avatar {
    width:42px; height:42px; border-radius:11px; flex-shrink:0;
    background:linear-gradient(135deg,#667eea,#764ba2);
    display:flex; align-items:center; justify-content:center;
    color:white; font-weight:800; font-size:16px;
  }
  .st-staff-info { flex:1; min-width:0; }
  .st-staff-name { font-size:14px; font-weight:700; color:#1a1a2e; }
  .st-staff-pg   { font-size:12px; color:#64748b; margin-top:2px; }
  .st-staff-badge {
    font-size:10px; font-weight:800; padding:3px 8px; border-radius:20px;
    display:inline-block; margin-top:4px;
  }
  .st-staff-actions { display:flex; gap:8px; flex-shrink:0; }
  .st-staff-del-btn {
    padding:8px 12px; background:#fef2f2; color:#dc2626;
    border:1px solid #fecaca; border-radius:10px;
    font-size:12px; font-weight:700; cursor:pointer;
    font-family:inherit; -webkit-tap-highlight-color:transparent;
  }
  .st-staff-copy-btn {
    padding:8px 12px; background:#f0fdf4; color:#059669;
    border:1px solid #bbf7d0; border-radius:10px;
    font-size:12px; font-weight:700; cursor:pointer;
    font-family:inherit; -webkit-tap-highlight-color:transparent;
  }

  .st-empty-staff {
    text-align:center; padding:40px 20px;
    border:2px dashed #e2e8f0; border-radius:16px;
    color:#94a3b8;
  }
  .st-empty-icon { font-size:40px; margin-bottom:10px; }
  .st-empty-text { font-size:14px; font-weight:600; margin-bottom:4px; color:#64748b; }
  .st-empty-sub  { font-size:13px; }

  /* Add Staff Modal */
  .st-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:1000; padding:0;
  }
  @media(min-width:640px){
    .st-modal-overlay { align-items:center; padding:20px; }
  }
  .st-modal {
    background:white; border-radius:24px 24px 0 0;
    padding:24px 20px 40px; width:100%; max-width:480px;
    box-shadow:0 -8px 40px rgba(0,0,0,0.15);
    animation:slideUp 0.25s ease-out;
  }
  @media(min-width:640px){
    .st-modal { border-radius:24px; padding:28px 24px; }
  }
  @keyframes slideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }

  .st-modal-header {
    display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;
  }
  .st-modal-title { font-size:18px; font-weight:800; color:#1a1a2e; }
  .st-modal-close {
    width:32px; height:32px; border-radius:50%; background:#f1f5f9;
    border:none; cursor:pointer; font-size:16px; display:flex;
    align-items:center; justify-content:center; -webkit-tap-highlight-color:transparent;
  }
  .st-modal-sub { font-size:13px; color:#94a3b8; margin-bottom:20px; }

  /* Credential reveal box */
  .st-cred-box {
    background:linear-gradient(135deg,#f0fdf4,#ecfdf5);
    border:2px solid #bbf7d0; border-radius:16px;
    padding:20px; margin-bottom:16px;
  }
  .st-cred-title { font-size:13px; font-weight:800; color:#059669; margin-bottom:14px; text-align:center; }
  .st-cred-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
  .st-cred-label { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; }
  .st-cred-value { font-size:14px; font-weight:800; color:#1a1a2e; font-family:monospace; }
  .st-cred-warn { font-size:12px; color:#d97706; font-weight:600; text-align:center; margin-top:10px; background:#fffbeb; padding:8px 12px; border-radius:8px; }

  .st-pg-select {
    width:100%; padding:13px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit; color:#1a1a2e; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition:border-color 0.2s; cursor:pointer;
  }
  .st-pg-select:focus { border-color:#e94560; background:white; }

  @media(min-width:640px){
    .st-content { padding:24px 24px 60px; }
  }
`;

// Generate a random 8-char password
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({length:8}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

export default function SettingsPage() {
  const [pgOwner, setPgOwner]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [billingSettings, setBillingSettings] = useState({ price_per_bed: 8, effective_date: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingQR, setUploadingQR]       = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const photoRef = useRef();
  const qrRef    = useRef();

  const [profileForm, setProfileForm] = useState({
    name:'', phone:'', pgName:'', address:'', city:'', state:'',
  });
  const [paymentForm, setPaymentForm] = useState({ upiId:'', qrCodeUrl:'' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword:'', newPassword:'', confirmPassword:'',
  });

  // Staff state
  const [staffList, setStaffList]         = useState([]);
  const [staffLoading, setStaffLoading]   = useState(false);
  const [showAddStaff, setShowAddStaff]   = useState(false);
  const [addingStaff, setAddingStaff]     = useState(false);
  const [staffForm, setStaffForm]         = useState({ name:'', pgId:'' });
  const [newCredentials, setNewCredentials] = useState(null); // shown after creation
  const [pgList, setPgList]               = useState([]);
  const [pgEdits, setPgEdits]             = useState({});
  const [savingPgId, setSavingPgId]       = useState(null);
  const [deletingPgId, setDeletingPgId]   = useState(null);

  const user = auth.currentUser;


  const fetchOwner = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db,'pgOwners',user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setPgOwner(d);
        setProfileForm({ name:d.ownerName||d.name||'', phone:d.phone||'', pgName:d.pgName||'', address:d.address||'', city:d.city||'', state:d.state||'' });
        setPaymentForm({ upiId:d.upiId||'', qrCodeUrl:d.qrCodeUrl||'' });
      }
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const fetchPGs = async () => {
    try {
      const snap = await getDocs(collection(db,'pgOwners',user.uid,'pgs'));
      setPgList(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const snap = await getDocs(collection(db,'pgOwners',user.uid,'staff'));
      setStaffList(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
    setStaffLoading(false);
  };

  const fetchBillingSettings = async () => {
    try {
      const snap = await getDoc(doc(db,'settings','billing'));
      if (snap.exists()) setBillingSettings(snap.data());
    } catch(e){ console.error(e); }
  };

  useEffect(()=>{ fetchOwner(); fetchPGs(); fetchBillingSettings(); },[]);

  useEffect(()=>{
    if(activeTab==='staff') fetchStaff();
  },[activeTab, pgList]);

  useEffect(()=>{
    const refreshBeds = async () => {
      if (activeTab !== 'billing') return;
      try {
        let totalBeds = 0;
        const seen = new Set();

        // Sum rooms by ownerId (newer data)
        const rSnap = await getDocs(query(collection(db, 'rooms'), where('ownerId', '==', user.uid)));
        rSnap.forEach(r => {
          if (seen.has(r.id)) return;
          seen.add(r.id);
          totalBeds += (r.data().totalBeds || 0);
        });

        // Sum rooms by pgId (legacy data or missing ownerId)
        if (pgList.length > 0) {
          const pgIds = pgList.map(p => p.pgId || p.id);
          for (const pgId of pgIds) {
            const byPg = await getDocs(query(collection(db, 'rooms'), where('pgId', '==', pgId)));
            byPg.forEach(r => {
              if (seen.has(r.id)) return;
              seen.add(r.id);
              totalBeds += (r.data().totalBeds || 0);
            });
          }
        }
        const ownerRef = doc(db, 'pgOwners', user.uid);
        const ownerSnap = await getDoc(ownerRef);
        const ownerData = ownerSnap.exists() ? ownerSnap.data() : {};
        const currentMax = ownerData.max_beds_this_month ?? 0;
        const updates = { current_beds: totalBeds };
        if (totalBeds > currentMax) updates.max_beds_this_month = totalBeds;
        await updateDoc(ownerRef, updates);
        fetchOwner();
      } catch (e) { console.warn('Failed to refresh beds:', e); }
    };
    refreshBeds();
  },[activeTab]);

  useEffect(()=>{
    const next = {};
    pgList.forEach((pg) => {
      next[pg.id] = {
        pgName: pg.pgName || '',
        city: pg.city || '',
        state: pg.state || '',
        address: pg.address || '',
        pgCode: pg.pgCode || '',
      };
    });
    setPgEdits(next);
  }, [pgList]);

  const showOk  = (msg) => { setSuccessMsg(msg); setErrorMsg('');   setTimeout(()=>setSuccessMsg(''),3000); };
  const showErr = (msg) => { setErrorMsg(msg);   setSuccessMsg(''); setTimeout(()=>setErrorMsg(''),4000); };

  const handleSaveProfile = async () => {
    if (!profileForm.name)   return showErr('Name is required!');
    if (!profileForm.pgName) return showErr('PG Name is required!');
    setSaving(true);
    try {
      await updateDoc(doc(db,'pgOwners',user.uid), {
        ownerName:profileForm.name, name:profileForm.name,
        phone:profileForm.phone, pgName:profileForm.pgName,
        address:profileForm.address, city:profileForm.city, state:profileForm.state,
      });
      showOk('✅ Profile updated successfully!');
      fetchOwner();
    } catch { showErr('Failed to update profile!'); }
    setSaving(false);
  };

  const handleSavePayment = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,'pgOwners',user.uid), { upiId:paymentForm.upiId, qrCodeUrl:paymentForm.qrCodeUrl });
      showOk('✅ Payment details updated!');
    } catch { showErr('Failed to update payment details!'); }
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return showErr('Photo must be under 2MB!');
    setUploadingPhoto(true);
    try {
      const r = ref(storage,`profilePhotos/${user.uid}`);
      await uploadBytes(r,file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db,'pgOwners',user.uid),{photoUrl:url});
      showOk('✅ Profile photo updated!');
      fetchOwner();
    } catch { showErr('Failed to upload photo!'); }
    setUploadingPhoto(false);
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return showErr('QR Code must be under 2MB!');
    setUploadingQR(true);
    try {
      const r = ref(storage,`qrCodes/${user.uid}`);
      await uploadBytes(r,file);
      const url = await getDownloadURL(r);
      setPaymentForm(p=>({...p,qrCodeUrl:url}));
      await updateDoc(doc(db,'pgOwners',user.uid),{qrCodeUrl:url});
      showOk('✅ QR Code uploaded!');
      fetchOwner();
    } catch { showErr('Failed to upload QR Code!'); }
    setUploadingQR(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) return showErr('Enter current password!');
    if (!passwordForm.newPassword)      return showErr('Enter new password!');
    if (passwordForm.newPassword.length < 6) return showErr('Password must be at least 6 characters!');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return showErr('Passwords do not match!');
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);
      setPasswordForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      showOk('✅ Password changed successfully!');
    } catch(err) {
      if (err.code==='auth/wrong-password') showErr('Current password is incorrect!');
      else showErr('Failed to change password!');
    }
    setSaving(false);
  };

  const updateStaffPgName = async (pgId, pgName) => {
    const ownerStaffSnap = await getDocs(query(collection(db, 'pgOwners', user.uid, 'staff'), where('pgId', '==', pgId)));
    const staffAccSnap   = await getDocs(query(collection(db, 'staffAccounts'), where('pgId', '==', pgId)));
    await Promise.all([
      ...ownerStaffSnap.docs.map(d => updateDoc(d.ref, { pgName })),
      ...staffAccSnap.docs.map(d => updateDoc(d.ref, { pgName })),
    ]);
  };

  const handleSavePg = async (pg) => {
    const draft = pgEdits[pg.id];
    if (!draft?.pgName?.trim()) return showErr('PG name is required!');
    setSavingPgId(pg.id);
    try {
      const payload = {
        pgName: draft.pgName.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        address: draft.address.trim(),
      };
      await updateDoc(doc(db, 'pgOwners', user.uid, 'pgs', pg.id), payload);
      await updateStaffPgName(pg.id, payload.pgName);
      showOk('✅ PG details updated!');
      fetchPGs();
    } catch (e) {
      console.error(e);
      showErr('Failed to update PG!');
    }
    setSavingPgId(null);
  };

  const handleDeletePg = async (pg) => {
    const first = window.confirm(`Delete "${pg.pgName || 'this PG'}"?`);
    if (!first) return;
    const second = window.confirm('This will permanently delete all rooms, tenants, payments, electricity bills, and staff logins for this PG. This cannot be undone. Continue?');
    if (!second) return;

    setDeletingPgId(pg.id);
    try {
      const pgId = pg.id;
      const staffUids = new Set();

      // Delete rooms, tenants, payments, electricity bills
      const targets = [
        collection(db, 'rooms'),
        collection(db, 'tenants'),
        collection(db, 'payments'),
        collection(db, 'electricityBills'),
      ];
      for (const colRef of targets) {
        const snap = await getDocs(query(colRef, where('pgId', '==', pgId)));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }

      // Delete staff under owner
      const ownerStaffSnap = await getDocs(query(collection(db, 'pgOwners', user.uid, 'staff'), where('pgId', '==', pgId)));
      ownerStaffSnap.docs.forEach(d => {
        const data = d.data();
        if (data?.staffUid) staffUids.add(data.staffUid);
      });
      await Promise.all(ownerStaffSnap.docs.map(d => deleteDoc(d.ref)));

      // Collect staffAccounts lookup
      const staffAccSnap = await getDocs(query(collection(db, 'staffAccounts'), where('pgId', '==', pgId)));
      staffAccSnap.docs.forEach(d => {
        const data = d.data();
        if (data?.staffUid) staffUids.add(data.staffUid);
      });

      // Note: Auth user deletion requires Cloud Functions/Admin SDK (Blaze).

      // Delete staffAccounts lookup
      await Promise.all(staffAccSnap.docs.map(d => deleteDoc(d.ref)));

      // Delete PG doc
      await deleteDoc(doc(db, 'pgOwners', user.uid, 'pgs', pgId));

      showOk('✅ PG deleted successfully!');
      fetchPGs();
      if (activeTab === 'staff') fetchStaff();
    } catch (e) {
      console.error(e);
      showErr('Failed to delete PG!');
    }
    setDeletingPgId(null);
  };

  // ── Staff: Create new staff login using PG Code ──
  const handleAddStaff = async () => {
    if (!staffForm.name.trim()) return showErr('Enter staff name!');
    if (!staffForm.pgId)        return showErr('Select a PG!');

    setAddingStaff(true);
    const password = generatePassword();
    const pgDoc    = pgList.find(p => p.id === staffForm.pgId);
    const pgName   = pgDoc?.pgName || pgDoc?.name || 'PG';
    const pgCode   = pgDoc?.pgCode || '';

    if (!pgCode) {
      setAddingStaff(false);
      return showErr('This PG has no PG Code. Please add a PG Code first.');
    }

    // Email = ANB465@pgpilots.in (pgCode + domain)
    const email = `${pgCode}@pgpilots.in`;

    try {
      // ✅ Use secondaryAuth so the owner is NOT signed out
      const cred     = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const staffUid = cred.user.uid;
      await secondaryAuth.signOut();

      // Save staff doc — password stored so owner can view anytime
      await addDoc(collection(db, 'pgOwners', user.uid, 'staff'), {
        staffUid,
        name:     staffForm.name.trim(),
        email,
        pgCode,
        pgId:     staffForm.pgId,
        pgName,
        ownerId:  user.uid,
        password, // ✅ owner can see this anytime
        isActive: true,
        createdAt: serverTimestamp(),
      });

      // Top-level lookup so staff login can find ownerId + pgId
      await addDoc(collection(db, 'staffAccounts'), {
        staffUid,
        email,
        pgCode,
        pgId:      staffForm.pgId,
        pgName,
        ownerId:   user.uid,
        ownerName: pgOwner?.ownerName || pgOwner?.name || '',
        isActive:  true,
        createdAt: serverTimestamp(),
      });

      setNewCredentials({ name: staffForm.name, email, password, pgName, pgCode });
      setStaffForm({ name:'', pgId:'' });
      fetchStaff();
    } catch(err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use')
        showErr(`${email} already has a staff account!`);
      else showErr('Failed to create staff account! ' + err.message);
    }
    setAddingStaff(false);
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`Remove ${staffName} from staff?`)) return;
    try {
      await deleteDoc(doc(db,'pgOwners',user.uid,'staff',staffId));
      setStaffList(prev=>prev.filter(s=>s.id!==staffId));
      showOk(`✅ ${staffName} removed from staff.`);
    } catch { showErr('Failed to remove staff!'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(()=>showOk('✅ Copied to clipboard!'));
  };

  const tabs = [
    {id:'profile',  label:'👤 Profile'},
    {id:'payment',  label:'💳 Payment'},
    {id:'password', label:'🔒 Password'},
    {id:'managepg', label:'🏠 Manage PGs'},
    {id:'staff',    label:'👥 Staff'},
    {id:'billing',  label:'💳 Billing'},
  ];

  return (
    <>
      <style>{css}</style>
      <div className="st-root">

        <div className="st-topbar">
          <div className="st-topbar-row">
            <div>
              <h1 className="st-page-title">Settings</h1>
              <p className="st-page-sub">Manage your account &amp; PG details</p>
            </div>
          </div>

          {pgOwner && (
            <div className="st-profile-chip">
              <div className="st-profile-avatar">
                {pgOwner.photoUrl
                  ? <img src={pgOwner.photoUrl} alt="profile"/>
                  : (pgOwner.ownerName||pgOwner.name||'P').charAt(0).toUpperCase()
                }
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div className="st-profile-name">{pgOwner.ownerName||pgOwner.name}</div>
                <div className="st-profile-pg">{pgOwner.pgName}</div>
                <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap',marginTop:'4px'}}>
                  <span className="st-plan-tag" style={{background:'#fef9c3',color:'#854d0e'}}>
                    Usage Billing
                  </span>
                  {pgOwner.pgCode && (
                    <span style={{fontSize:'10px',fontWeight:'800',padding:'3px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.15)',color:'white',letterSpacing:'1px'}}>
                      🔑 {pgOwner.pgCode}
                    </span>
                  )}
                </div>
              </div>
              <button className="st-photo-btn" onClick={()=>photoRef.current.click()}>
                {uploadingPhoto ? '⏳' : '📷 Photo'}
              </button>
              <input ref={photoRef} type="file" accept="image/*"
                style={{display:'none'}} onChange={handlePhotoUpload} />
            </div>
          )}
        </div>

        <div className="st-content">
          {successMsg && <div className="st-success">{successMsg}</div>}
          {errorMsg   && <div className="st-error">{errorMsg}</div>}

          <div className="st-tabs">
            {tabs.map(({id,label})=>(
              <button key={id} className={`st-tab${activeTab===id?' active':''}`}
                onClick={()=>setActiveTab(id)}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="st-loading"><div className="st-spinner"/>Loading…</div>
          ) : (
            <>
              {/* ── PROFILE ── */}
              {activeTab==='profile' && (
                <div className="st-card">
                  <h2 className="st-card-title">👤 Profile Information</h2>
                  <p className="st-card-sub">Update your personal and PG details</p>
                  <div className="st-row">
                    <div className="st-field">
                      <label className="st-label">Owner Name *</label>
                      <input className="st-input" type="text" placeholder="Your full name"
                        value={profileForm.name}
                        onChange={e=>setProfileForm(p=>({...p,name:e.target.value}))} />
                    </div>
                    <div className="st-field">
                      <label className="st-label">Phone Number</label>
                      <input className="st-input" type="tel" inputMode="numeric" placeholder="9876543210"
                        value={profileForm.phone}
                        onChange={e=>setProfileForm(p=>({...p,phone:e.target.value}))} />
                    </div>
                  </div>
                  <div className="st-field">
                    <label className="st-label">PG Name *</label>
                    <input className="st-input" type="text" placeholder="Name of your PG"
                      value={profileForm.pgName}
                      onChange={e=>setProfileForm(p=>({...p,pgName:e.target.value}))} />
                  </div>
                  <div className="st-field">
                    <label className="st-label">PG Address</label>
                    <input className="st-input" type="text" placeholder="Full address"
                      value={profileForm.address}
                      onChange={e=>setProfileForm(p=>({...p,address:e.target.value}))} />
                  </div>
                  <div className="st-row">
                    <div className="st-field">
                      <label className="st-label">City</label>
                      <input className="st-input" type="text" placeholder="Chennai"
                        value={profileForm.city}
                        onChange={e=>setProfileForm(p=>({...p,city:e.target.value}))} />
                    </div>
                    <div className="st-field">
                      <label className="st-label">State</label>
                      <input className="st-input" type="text" placeholder="Tamil Nadu"
                        value={profileForm.state}
                        onChange={e=>setProfileForm(p=>({...p,state:e.target.value}))} />
                    </div>
                  </div>
                  <div className="st-email-info">
                    📧 {user?.email || `${pgOwner?.phone}@pgpilots.in`} &nbsp;·&nbsp; Cannot be changed
                  </div>
                  <button className="st-save-btn" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save Profile'}
                  </button>
                </div>
              )}

              {/* ── PAYMENT ── */}
              {activeTab==='payment' && (
                <div className="st-card">
                  <h2 className="st-card-title">💳 Payment Details</h2>
                  <p className="st-card-sub">Tenants will use these details to pay rent</p>
                  <div className="st-field">
                    <label className="st-label">UPI ID</label>
                    <input className="st-input" type="text"
                      placeholder="yourname@upi or 9876543210@paytm"
                      value={paymentForm.upiId}
                      onChange={e=>setPaymentForm(p=>({...p,upiId:e.target.value}))} />
                  </div>
                  <div className="st-field">
                    <label className="st-label">Payment QR Code</label>
                    {paymentForm.qrCodeUrl ? (
                      <div className="st-qr-preview">
                        <img src={paymentForm.qrCodeUrl} alt="QR" className="st-qr-img"/>
                        <button className="st-qr-change" onClick={()=>qrRef.current.click()}>
                          🔄 Change QR
                        </button>
                      </div>
                    ) : (
                      <div className="st-qr-upload" onClick={()=>qrRef.current.click()}>
                        <div className="st-qr-icon">📱</div>
                        <div className="st-qr-text">
                          {uploadingQR ? '⏳ Uploading…' : 'Tap to upload QR Code'}
                        </div>
                        <div className="st-qr-sub">PNG, JPG · Max 2MB</div>
                      </div>
                    )}
                    <input ref={qrRef} type="file" accept="image/*"
                      style={{display:'none'}} onChange={handleQRUpload} />
                  </div>
                  <button className="st-save-btn" onClick={handleSavePayment} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save Payment Details'}
                  </button>
                </div>
              )}

              {/* ── PASSWORD ── */}
              {activeTab==='password' && (
                <div className="st-card">
                  <h2 className="st-card-title">🔒 Change Password</h2>
                  <p className="st-card-sub">Keep your account secure with a strong password</p>
                  <div className="st-field">
                    <label className="st-label">Current Password</label>
                    <div className="st-pass-wrap">
                      <input className="st-pass-input"
                        type={showCurrent?'text':'password'}
                        placeholder="Enter current password"
                        value={passwordForm.currentPassword}
                        onChange={e=>setPasswordForm(p=>({...p,currentPassword:e.target.value}))} />
                      <span className="st-eye" onClick={()=>setShowCurrent(v=>!v)}>
                        {showCurrent?'🙈':'👁️'}
                      </span>
                    </div>
                  </div>
                  <div className="st-field">
                    <label className="st-label">New Password</label>
                    <div className="st-pass-wrap">
                      <input className="st-pass-input"
                        type={showNew?'text':'password'}
                        placeholder="Minimum 6 characters"
                        value={passwordForm.newPassword}
                        onChange={e=>setPasswordForm(p=>({...p,newPassword:e.target.value}))} />
                      <span className="st-eye" onClick={()=>setShowNew(v=>!v)}>
                        {showNew?'🙈':'👁️'}
                      </span>
                    </div>
                    {passwordForm.newPassword && (
                      <div style={{marginTop:'6px'}}>
                        <div style={{height:'4px',borderRadius:'99px',background:'#e2e8f0',overflow:'hidden'}}>
                          <div style={{
                            height:'100%',borderRadius:'99px',transition:'width 0.3s',
                            width: passwordForm.newPassword.length>=10?'100%':passwordForm.newPassword.length>=6?'60%':'30%',
                            background: passwordForm.newPassword.length>=10?'#059669':passwordForm.newPassword.length>=6?'#d97706':'#dc2626',
                          }}/>
                        </div>
                        <div style={{fontSize:'11px',color:'#94a3b8',marginTop:'3px'}}>
                          {passwordForm.newPassword.length>=10?'💪 Strong':passwordForm.newPassword.length>=6?'⚠️ Medium':'❌ Weak'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="st-field">
                    <label className="st-label">Confirm New Password</label>
                    <div className="st-pass-wrap">
                      <input className="st-pass-input"
                        type={showConfirm?'text':'password'}
                        placeholder="Re-enter new password"
                        value={passwordForm.confirmPassword}
                        onChange={e=>setPasswordForm(p=>({...p,confirmPassword:e.target.value}))} />
                      <span className="st-eye" onClick={()=>setShowConfirm(v=>!v)}>
                        {showConfirm?'🙈':'👁️'}
                      </span>
                    </div>
                    {passwordForm.confirmPassword && (
                      <div style={{fontSize:'11px',marginTop:'4px',
                        color:passwordForm.newPassword===passwordForm.confirmPassword?'#059669':'#dc2626',
                        fontWeight:'600'}}>
                        {passwordForm.newPassword===passwordForm.confirmPassword?'✅ Passwords match':'❌ Passwords do not match'}
                      </div>
                    )}
                  </div>
                  <div className="st-tips">
                    <div className="st-tip-title">💡 Tips</div>
                    <div className="st-tip">✅ At least 6 characters</div>
                    <div className="st-tip">✅ Mix letters and numbers</div>
                    <div className="st-tip">✅ Don't share with anyone</div>
                  </div>
                  <button className="st-save-btn" onClick={handleChangePassword} disabled={saving}>
                    {saving ? 'Changing…' : '🔒 Change Password'}
                  </button>
                </div>
              )}

              {/* ── MANAGE PGs ── */}
              {activeTab==='managepg' && (
                <div className="st-card">
                  <h2 className="st-card-title">🏠 Manage PGs</h2>
                  <p className="st-card-sub">Edit branch PG details or delete a PG (double confirmation)</p>

                  {pgList.length === 0 ? (
                    <div style={{padding:'12px 14px',background:'#fef2f2',borderRadius:'12px',fontSize:'13px',color:'#dc2626',fontWeight:'600'}}>
                      ⚠️ No PGs found. Add a PG first from the Dashboard.
                    </div>
                  ) : (
                    pgList.map(pg => (
                      <div key={pg.id} className="st-pg-card">
                        <div className="st-pg-head">
                          <div className="st-pg-title">{pg.pgName || 'Untitled PG'}</div>
                          <div className="st-pg-badge">{pg.is_main ? 'Main PG' : 'Branch PG'}</div>
                        </div>

                        <div className="st-field">
                          <label className="st-label">PG Name *</label>
                          <input className="st-input" type="text"
                            value={pgEdits[pg.id]?.pgName ?? ''}
                            onChange={e=>setPgEdits(p=>({ ...p, [pg.id]: { ...(p[pg.id]||{}), pgName: e.target.value } }))} />
                        </div>

                        <div className="st-row">
                          <div className="st-field">
                            <label className="st-label">City</label>
                            <input className="st-input" type="text"
                              value={pgEdits[pg.id]?.city ?? ''}
                              onChange={e=>setPgEdits(p=>({ ...p, [pg.id]: { ...(p[pg.id]||{}), city: e.target.value } }))} />
                          </div>
                          <div className="st-field">
                            <label className="st-label">State</label>
                            <input className="st-input" type="text"
                              value={pgEdits[pg.id]?.state ?? ''}
                              onChange={e=>setPgEdits(p=>({ ...p, [pg.id]: { ...(p[pg.id]||{}), state: e.target.value } }))} />
                          </div>
                        </div>

                        <div className="st-field">
                          <label className="st-label">Address</label>
                          <input className="st-input" type="text"
                            value={pgEdits[pg.id]?.address ?? ''}
                            onChange={e=>setPgEdits(p=>({ ...p, [pg.id]: { ...(p[pg.id]||{}), address: e.target.value } }))} />
                        </div>

                        <div className="st-field">
                          <label className="st-label">PG Code</label>
                          <input className="st-input" type="text" value={pgEdits[pg.id]?.pgCode ?? ''} disabled />
                        </div>

                        <div className="st-pg-actions">
                          <button
                            className="st-pg-save"
                            onClick={()=>handleSavePg(pg)}
                            disabled={savingPgId===pg.id || deletingPgId===pg.id}
                          >
                            {savingPgId===pg.id ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button
                            className="st-pg-delete"
                            onClick={()=>handleDeletePg(pg)}
                            disabled={savingPgId===pg.id || deletingPgId===pg.id}
                          >
                            {deletingPgId===pg.id ? 'Deleting…' : 'Delete PG'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── STAFF ACCESS ── */}
              {activeTab==='staff' && (
                <div className="st-card">
                  <div className="st-staff-header">
                    <div>
                      <h2 className="st-card-title">👥 Staff Access</h2>
                      <p className="st-card-sub" style={{marginBottom:0}}>Create logins for your staff members</p>
                    </div>
                    <button className="st-add-staff-btn" onClick={()=>{ setShowAddStaff(true); setNewCredentials(null); }}>
                      ➕ Add Staff
                    </button>
                  </div>

                  {staffLoading ? (
                    <div className="st-loading" style={{padding:'30px'}}>
                      <div className="st-spinner"/>Loading staff…
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="st-empty-staff">
                      <div className="st-empty-icon">👤</div>
                      <div className="st-empty-text">No staff added yet</div>
                      <div className="st-empty-sub">Add staff to give them limited access to a PG</div>
                    </div>
                  ) : (
                    <div className="st-staff-list">
                      {staffList.map(s=>(
                        <div key={s.id} className="st-staff-item" style={{flexDirection:'column',alignItems:'stretch',gap:'10px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                            <div className="st-staff-avatar">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="st-staff-info" style={{flex:1}}>
                              <div className="st-staff-name">{s.name}</div>
                              <div className="st-staff-pg">📍 {s.pgName} {s.pgCode && <span style={{marginLeft:'6px',fontWeight:'800',color:'#e94560'}}>· {s.pgCode}</span>}</div>
                              <span className="st-staff-badge" style={{
                                background: s.isActive ? '#f0fdf4' : '#fef2f2',
                                color: s.isActive ? '#059669' : '#dc2626',
                              }}>
                                {s.isActive ? '🟢 Active' : '🔴 Inactive'}
                              </span>
                            </div>
                            <button className="st-staff-del-btn"
                              onClick={()=>handleDeleteStaff(s.id, s.name)}>
                              🗑️
                            </button>
                          </div>
                          {/* Credentials row */}
                          <div style={{background:'#f8fafc',borderRadius:'10px',padding:'10px 12px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                              <span style={{fontSize:'11px',fontWeight:'700',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.4px'}}>Login Email</span>
                              <button className="st-staff-copy-btn" style={{padding:'4px 10px',fontSize:'11px'}}
                                onClick={()=>copyToClipboard(s.email)}>
                                📋 Copy
                              </button>
                            </div>
                            <div style={{fontFamily:'monospace',fontSize:'14px',fontWeight:'800',color:'#1a1a2e'}}>{s.email}</div>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px',marginBottom:'4px'}}>
                              <span style={{fontSize:'11px',fontWeight:'700',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.4px'}}>Password</span>
                              <button className="st-staff-copy-btn" style={{padding:'4px 10px',fontSize:'11px'}}
                                onClick={()=>copyToClipboard(s.password||'—')}>
                                📋 Copy
                              </button>
                            </div>
                            <div style={{fontFamily:'monospace',fontSize:'16px',fontWeight:'800',color:'#e94560',letterSpacing:'2px'}}>{s.password||'—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info box */}
                  <div style={{marginTop:'18px', background:'#f8fafc', borderRadius:'12px', padding:'14px'}}>
                    <div style={{fontSize:'12px', fontWeight:'800', color:'#475569', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.3px'}}>
                      ℹ️ How Staff Login Works
                    </div>
                    <div style={{fontSize:'13px', color:'#64748b', lineHeight:'1.6'}}>
                      Staff login at <strong>/staff-login</strong> with their email and password.<br/>
                      They can only see the PG assigned to them.<br/>
                      You can remove staff access anytime.
                    </div>
                  </div>
                </div>
              )}

              {/* ── BILLING ── */}
              {activeTab==='billing' && (
                <div className="st-card">
                  <h2 className="st-card-title">💳 Billing &amp; Usage</h2>
                  <p className="st-card-sub">Billing is based on peak beds across all PGs</p>
                  <div className="st-current-plan"
                    style={{background:'#f8fafc', border:'1.5px solid #e2e8f0'}}>
                    <div>
                      <div className="st-cp-badge" style={{color:'#0f3460'}}>Current Beds</div>
                      <div className="st-cp-name"  style={{color:'#0f3460'}}>
                        {pgOwner?.current_beds ?? pgOwner?.current_bed_count ?? 0}
                      </div>
                      <div className="st-cp-price">
                        Peak this month: {pgOwner?.max_beds_this_month ?? pgOwner?.max_bed_count_this_month ?? (pgOwner?.current_beds ?? pgOwner?.current_bed_count ?? 0)}
                      </div>
                    </div>
                    <div className="st-cp-features">
                      <div className="st-cp-feature">Price per bed: ₹{pgOwner?.price_per_bed || billingSettings.price_per_bed || 0}</div>
                      <div className="st-cp-feature">
                        Estimated bill: ₹{((pgOwner?.max_beds_this_month ?? pgOwner?.max_bed_count_this_month ?? (pgOwner?.current_beds ?? pgOwner?.current_bed_count ?? 0)) * (pgOwner?.price_per_bed || billingSettings.price_per_bed || 0)).toLocaleString('en-IN')}
                        <span style={{ marginLeft:'6px', fontSize:'11px', color:'#94a3b8', fontWeight:'600' }}>(All PGs combined)</span>
                      </div>
                      {billingSettings.effective_date && (
                        <div className="st-cp-feature">Next price effective: {billingSettings.effective_date}</div>
                      )}
                    </div>
                  </div>
                  <div className="st-email-info">
                    Billing uses the highest bed count in the current month. If beds decrease, your peak stays the same until next month.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Add Staff Modal ── */}
        {showAddStaff && (
          <div className="st-modal-overlay" onClick={(e)=>{ if(e.target===e.currentTarget){ setShowAddStaff(false); setNewCredentials(null); }}}>
            <div className="st-modal">
              <div className="st-modal-header">
                <div className="st-modal-title">
                  {newCredentials ? '✅ Staff Created!' : '➕ Add Staff Member'}
                </div>
                <button className="st-modal-close" onClick={()=>{ setShowAddStaff(false); setNewCredentials(null); }}>✕</button>
              </div>
              <p className="st-modal-sub">
                {newCredentials
                  ? 'Share these login details with your staff. Save the password now — it won\'t be shown again.'
                  : 'Create a login for your staff. They can only access their assigned PG.'}
              </p>

              {errorMsg && <div className="st-error">{errorMsg}</div>}

              {newCredentials ? (
                <>
                  <div className="st-cred-box">
                    <div className="st-cred-title">🔐 Staff Login Credentials</div>
                    <div className="st-cred-row">
                      <span className="st-cred-label">Staff Name</span>
                      <span className="st-cred-value">{newCredentials.name}</span>
                    </div>
                    <div className="st-cred-row">
                      <span className="st-cred-label">PG</span>
                      <span className="st-cred-value">{newCredentials.pgName}</span>
                    </div>
                    <div className="st-cred-row">
                      <span className="st-cred-label">PG Code</span>
                      <span className="st-cred-value" style={{color:'#e94560',letterSpacing:'2px'}}>{newCredentials.pgCode}</span>
                    </div>
                    <div style={{borderTop:'1px solid #bbf7d0',margin:'12px 0'}}/>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'#059669',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.4px'}}>Login at /staff-login</div>
                    <div className="st-cred-row">
                      <span className="st-cred-label">Email</span>
                      <span className="st-cred-value" style={{fontSize:'13px'}}>{newCredentials.email}</span>
                    </div>
                    <div className="st-cred-row" style={{marginBottom:0}}>
                      <span className="st-cred-label">Password</span>
                      <span className="st-cred-value" style={{color:'#e94560',fontSize:'20px',letterSpacing:'3px'}}>
                        {newCredentials.password}
                      </span>
                    </div>
                    <div className="st-cred-warn" style={{marginTop:'12px'}}>✅ Password is saved — you can view it anytime in the Staff tab.</div>
                  </div>
                  <button className="st-save-btn"
                    style={{marginBottom:'10px'}}
                    onClick={()=>copyToClipboard(`PG: ${newCredentials.pgName} (${newCredentials.pgCode})
Email: ${newCredentials.email}
Password: ${newCredentials.password}
Login at: ${window.location.origin}/staff-login`)}>
                    📋 Copy Login Details
                  </button>
                  <button
                    onClick={()=>{ setShowAddStaff(false); setNewCredentials(null); }}
                    style={{width:'100%',padding:'13px',background:'#f1f5f9',color:'#475569',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="st-field">
                    <label className="st-label">Staff Name *</label>
                    <input className="st-input" type="text" placeholder="e.g. Ravi Kumar"
                      value={staffForm.name}
                      onChange={e=>setStaffForm(p=>({...p,name:e.target.value}))} />
                  </div>
                  <div className="st-field">
                    <label className="st-label">Assign to PG *</label>
                    {pgList.length === 0 ? (
                      <div style={{padding:'12px 14px',background:'#fef2f2',borderRadius:'12px',fontSize:'13px',color:'#dc2626',fontWeight:'600'}}>
                        ⚠️ No PGs found. Add a PG first from the Dashboard.
                      </div>
                    ) : (
                      <select className="st-pg-select"
                        value={staffForm.pgId}
                        onChange={e=>setStaffForm(p=>({...p,pgId:e.target.value}))}>
                        <option value="">Select a PG…</option>
                        {pgList.map(pg=>(
                          <option key={pg.id} value={pg.id}>
                            {pg.pgName || pg.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{background:'#f8fafc',borderRadius:'12px',padding:'12px 14px',marginBottom:'16px',fontSize:'13px',color:'#64748b'}}>
                    🔑 A random email and password will be auto-generated for this staff member.
                  </div>
                  <button className="st-save-btn" onClick={handleAddStaff} disabled={addingStaff || pgList.length===0}>
                    {addingStaff ? '⏳ Creating…' : '✅ Create Staff Login'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
