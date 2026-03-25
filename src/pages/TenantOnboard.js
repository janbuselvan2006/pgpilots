import React, { useEffect, useMemo, useState } from 'react';
import { db, storage } from '../firebase';
import {
  doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  .to-root { font-family:'DM Sans',sans-serif; background:#f0f2f8; min-height:100vh; }
  .to-hero {
    background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
    color:white; padding:24px 20px 28px; position:relative; overflow:hidden;
  }
  .to-hero::after{
    content:''; position:absolute; width:200px; height:200px; border-radius:50%;
    background:rgba(233,69,96,0.13); top:-60px; right:-40px; pointer-events:none;
  }
  .to-title { font-size:22px; font-weight:800; margin:0 0 6px; }
  .to-sub { font-size:12px; color:rgba(255,255,255,0.6); }
  .to-card { background:white; border-radius:18px; padding:18px; margin: -16px 16px 16px; box-shadow:0 2px 12px rgba(0,0,0,0.06); position:relative; z-index:2; }
  .to-section { margin-bottom:18px; }
  .to-section-title { font-size:12px; font-weight:800; color:#4f46e5; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; }
  .to-field { margin-bottom:12px; }
  .to-label { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }
  .to-input, .to-select {
    width:100%; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:14px; font-family:inherit; color:#1a1a2e; background:#fafbff; outline:none;
    box-sizing:border-box;
  }
  .to-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .to-row-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .to-hint { font-size:11px; color:#94a3b8; margin-top:6px; }
  .to-badge { display:inline-block; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:800; background:#eef2ff; color:#4338ca; }
  .to-family-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .to-family-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; }
  .to-add-row { margin-top:8px; }
  .to-add-btn {
    padding:8px 12px; background:#eef2ff; color:#4f46e5; border:none; border-radius:10px;
    font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
  }
  .to-remove-btn {
    padding:8px 12px; background:#fef2f2; color:#dc2626; border:none; border-radius:10px;
    font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
  }
  .to-submit {
    width:100%; padding:14px; border:none; border-radius:14px;
    background:linear-gradient(135deg,#e94560,#0f3460); color:white; font-weight:800;
    font-size:15px; cursor:pointer; font-family:inherit;
  }
  .to-submit:disabled { opacity:0.6; cursor:not-allowed; }
  .to-decl { display:flex; gap:10px; align-items:flex-start; margin:12px 0; }
  .to-decl input { margin-top:4px; }
  .to-note { font-size:12px; color:#64748b; }
  .to-success {
    background:#f0fdf4; border:1px solid #bbf7d0; color:#059669;
    padding:12px 14px; border-radius:12px; font-weight:600; margin-bottom:12px; font-size:13px;
  }
  .to-error {
    background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
    padding:12px 14px; border-radius:12px; font-weight:600; margin-bottom:12px; font-size:13px;
  }
  .to-footer { text-align:center; font-size:11px; color:#94a3b8; padding:8px 0 18px; }
  @media(min-width:768px){
    .to-card{ margin: -18px auto 18px; width: 720px; }
    .to-hero{ padding:28px 24px 34px; }
  }
`;

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

export default function TenantOnboard() {
  const params = new URLSearchParams(window.location.search);
  const ownerId = params.get('ownerId');
  const pgId = params.get('pgId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pgData, setPgData] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');

  const [family, setFamily] = useState([{ relation: 'Father', name: '', age: '', phone: '' }]);
  const [form, setForm] = useState({
    admissionNumber: '',
    dateOfJoining: '',
    name: '',
    dob: '',
    age: '',
    bloodGroup: '',
    maritalStatus: '',
    nationality: '',
    phone: '',
    email: '',
    idType: 'Aadhaar',
    idNumber: '',
    addressLine: '',
    state: '',
    district: '',
    city: '',
    pincode: '',
    organizationType: 'College',
    organizationName: '',
    designation: '',
    organizationAddress: '',
    organizationPhone: '',
    roomNumber: '',
    bedNumber: '',
    guardianName: '',
    guardianPhone: '',
    declaration: false,
  });

  useEffect(() => {
    const load = async () => {
      if (!ownerId || !pgId) {
        setError('Invalid onboarding link.');
        setLoading(false);
        return;
      }
      try {
        const pgSnap = await getDoc(doc(db, 'pgOwners', ownerId, 'pgs', pgId));
        const ownerSnap = await getDoc(doc(db, 'pgOwners', ownerId));
        setPgData(pgSnap.exists() ? pgSnap.data() : null);
        setOwnerData(ownerSnap.exists() ? ownerSnap.data() : null);

        const rSnap = await getDocs(query(collection(db, 'rooms'), where('pgId', '==', pgId)));
        setRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const tSnap = await getDocs(query(collection(db, 'tenants'), where('pgId', '==', pgId)));
        setTenants(tSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.status !== 'deleted'));
      } catch (e) {
        console.error(e);
        setError('Failed to load PG data.');
      }
      setLoading(false);
    };
    load();
  }, [ownerId, pgId]);

  const occupiedByRoom = useMemo(() => {
    const map = {};
    tenants.forEach(t => {
      const room = t.roomNumber;
      const bed = String(t.bedNumber || '');
      if (!room || !bed) return;
      if (!map[room]) map[room] = new Set();
      map[room].add(bed);
    });
    return map;
  }, [tenants]);

  const getVacantBeds = (roomNumber) => {
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return [];
    const total = room.totalBeds || 0;
    const used = occupiedByRoom[roomNumber] || new Set();
    const beds = [];
    for (let i = 1; i <= total; i += 1) {
      const b = String(i);
      if (!used.has(b)) beds.push(b);
    }
    return beds;
  };

  const roomsWithVacancy = useMemo(() => {
    return rooms.filter(r => getVacantBeds(r.roomNumber).length > 0);
  }, [rooms, occupiedByRoom]);

  const handleRoomChange = (value) => {
    const beds = getVacantBeds(value);
    setForm(f => ({ ...f, roomNumber: value, bedNumber: beds[0] || '' }));
  };

  const addFamilyRow = () => {
    setFamily(rows => [...rows, { relation: 'Father', name: '', age: '', phone: '' }]);
  };

  const removeFamilyRow = (idx) => {
    setFamily(rows => rows.filter((_, i) => i !== idx));
  };

  const buildPdf = (tenantDoc) => {
    const docPdf = new jsPDF();
    const pgName = pgData?.pgName || 'PG';
    const address = [pgData?.address, pgData?.city, pgData?.state].filter(Boolean).join(', ');
    const ownerPhone = ownerData?.phone || '';
    const ownerEmail = ownerData?.email || ownerData?.ownerEmail || '';

    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(16);
    docPdf.text(pgName, 14, 18);
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(10);
    if (address) docPdf.text(address, 14, 24);
    docPdf.text(`Phone: ${ownerPhone || '—'}  Email: ${ownerEmail || '—'}`, 14, 30);

    docPdf.setFontSize(12);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Tenant Admission Form', 14, 40);

    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'normal');
    let y = 48;
    const line = (label, value) => {
      docPdf.text(`${label}: ${value || '—'}`, 14, y);
      y += 6;
    };

    line('Admission No', tenantDoc.admissionNumber);
    line('Date of Joining', tenantDoc.dateOfJoining);
    line('Name', tenantDoc.name);
    line('DOB', tenantDoc.dob);
    line('Age', tenantDoc.age);
    line('Blood Group', tenantDoc.bloodGroup);
    line('Marital Status', tenantDoc.maritalStatus);
    line('Nationality', tenantDoc.nationality);
    line('Phone', tenantDoc.phone);
    line('ID', `${tenantDoc.idType || ''} ${tenantDoc.idNumber || ''}`.trim());
    line('Address', [tenantDoc.addressLine, tenantDoc.district, tenantDoc.state, tenantDoc.city, tenantDoc.pincode].filter(Boolean).join(', '));
    line('Organization', tenantDoc.organizationName);
    line('Designation', tenantDoc.designation);
    line('Org Address', tenantDoc.organizationAddress);
    line('Org Phone', tenantDoc.organizationPhone);
    line('Room/Bed', `${tenantDoc.roomNumber || ''} / ${tenantDoc.bedNumber || ''}`.trim());
    line('Guardian', `${tenantDoc.guardianName || ''} (${tenantDoc.guardianPhone || ''})`.trim());

    const familyRows = (tenantDoc.family || []).map(f => [f.relation, f.name, f.age, f.phone]);
    if (familyRows.length > 0 && docPdf.autoTable) {
      docPdf.autoTable({
        startY: y + 4,
        head: [['Relation', 'Name', 'Age', 'Mobile']],
        body: familyRows,
        styles: { fontSize: 9 },
      });
      y = docPdf.lastAutoTable.finalY + 8;
    } else {
      y += 8;
    }

    const declaration = `I hereby that all information given by me is true and complete. I will abide by the Rule and regulations of the ${pgName}.`;
    docPdf.setFontSize(9);
    docPdf.text(declaration, 14, y);
    y += 8;
    docPdf.text('This is a computer generated document. No signature required.', 14, y);
    y += 8;
    docPdf.text('pgpilots.in', 14, y);

    return docPdf;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!form.name || !form.phone || !form.roomNumber || !form.bedNumber) {
      setError('Please fill required fields and select room/bed.');
      return;
    }
    if (!form.declaration) {
      setError('Please accept the declaration.');
      return;
    }
    setSubmitting(true);
    try {
      const tenantDoc = {
        ...form,
        ownerId,
        pgId,
        status: 'Active',
        createdAt: serverTimestamp(),
        family: family.filter(f => f.name || f.phone),
      };

      // Build PDF first
      const docPdf = buildPdf(tenantDoc);
      const pdfBlob = docPdf.output('blob');
      const fileName = `${form.admissionNumber || form.name || 'tenant'}_${Date.now()}.pdf`.replace(/\s+/g, '_');
      const pdfRef = ref(storage, `tenantForms/${ownerId}/${pgId}/${fileName}`);
      await uploadBytes(pdfRef, pdfBlob);
      const url = await getDownloadURL(pdfRef);
      tenantDoc.onboardingPdfUrl = url;

      await addDoc(collection(db, 'tenants'), tenantDoc);

      const room = rooms.find(r => r.roomNumber === form.roomNumber);
      if (room) {
        await updateDoc(doc(db, 'rooms', room.id), { occupiedBeds: (room.occupiedBeds || 0) + 1 });
      }

      setPdfUrl(url);
      setSuccess('✅ Submitted successfully! Your onboarding is complete.');
    } catch (e) {
      console.error(e);
      setError('Something went wrong while submitting.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="to-root">
          <div className="to-hero">
            <div className="to-title">Tenant Onboarding</div>
            <div className="to-sub">Loading…</div>
          </div>
        </div>
      </>
    );
  }

  if (error && !pgData) {
    return (
      <>
        <style>{css}</style>
        <div className="to-root">
          <div className="to-hero">
            <div className="to-title">Tenant Onboarding</div>
            <div className="to-sub">Invalid or expired link</div>
          </div>
          <div className="to-card">
            <div className="to-error">{error}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="to-root">
        <div className="to-hero">
          <div className="to-title">Tenant Onboarding</div>
          <div className="to-sub">{pgData?.pgName || 'PG'} • Self Admission</div>
        </div>

        <div className="to-card">
          {success && <div className="to-success">{success}</div>}
          {error && <div className="to-error">{error}</div>}

          <div className="to-section">
            <div className="to-section-title">Personal Details</div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">Admission Number</label>
                <input className="to-input" value={form.admissionNumber} onChange={e=>setForm(f=>({...f,admissionNumber:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Date of Joining</label>
                <input className="to-input" type="date" value={form.dateOfJoining} onChange={e=>setForm(f=>({...f,dateOfJoining:e.target.value}))} />
              </div>
            </div>

            <div className="to-row">
              <div className="to-field">
                <label className="to-label">Full Name *</label>
                <input className="to-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Phone *</label>
                <input className="to-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
              </div>
            </div>

            <div className="to-row-3">
              <div className="to-field">
                <label className="to-label">DOB</label>
                <input className="to-input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Age</label>
                <input className="to-input" value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Blood Group</label>
                <input className="to-input" value={form.bloodGroup} onChange={e=>setForm(f=>({...f,bloodGroup:e.target.value}))} />
              </div>
            </div>

            <div className="to-row">
              <div className="to-field">
                <label className="to-label">Marital Status</label>
                <input className="to-input" value={form.maritalStatus} onChange={e=>setForm(f=>({...f,maritalStatus:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Nationality</label>
                <input className="to-input" value={form.nationality} onChange={e=>setForm(f=>({...f,nationality:e.target.value}))} />
              </div>
            </div>

            <div className="to-row">
              <div className="to-field">
                <label className="to-label">ID Type</label>
                <select className="to-select" value={form.idType} onChange={e=>setForm(f=>({...f,idType:e.target.value}))}>
                  <option>Aadhaar</option>
                  <option>PAN</option>
                  <option>Passport</option>
                  <option>Driving License</option>
                  <option>Voter ID</option>
                </select>
              </div>
              <div className="to-field">
                <label className="to-label">ID Number</label>
                <input className="to-input" value={form.idNumber} onChange={e=>setForm(f=>({...f,idNumber:e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="to-section">
            <div className="to-section-title">Address Details</div>
            <div className="to-field">
              <label className="to-label">Address Line</label>
              <input className="to-input" value={form.addressLine} onChange={e=>setForm(f=>({...f,addressLine:e.target.value}))} />
            </div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">State</label>
                <select className="to-select" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value, district:''}))}>
                  <option value="">Select State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="to-field">
                <label className="to-label">District</label>
                <input className="to-input" list="districts" value={form.district} onChange={e=>setForm(f=>({...f,district:e.target.value}))} />
                <datalist id="districts">
                  {(DISTRICTS[form.state] || []).map(d => <option key={d} value={d} />)}
                </datalist>
                <div className="to-hint">Type to enter manually if not listed</div>
              </div>
            </div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">City</label>
                <input className="to-input" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Pincode</label>
                <input className="to-input" value={form.pincode} onChange={e=>setForm(f=>({...f,pincode:e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="to-section">
            <div className="to-section-title">Family Information</div>
            {family.map((row, idx) => (
              <div key={idx} className="to-family-row" style={{ marginBottom: '10px' }}>
                <div className="to-family-grid">
                  <select className="to-select" value={row.relation}
                    onChange={e=>{
                      const next = [...family];
                      next[idx] = { ...next[idx], relation: e.target.value };
                      setFamily(next);
                    }}>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input className="to-input" placeholder="Name" value={row.name}
                    onChange={e=>{
                      const next = [...family];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setFamily(next);
                    }} />
                  <input className="to-input" placeholder="Age" value={row.age}
                    onChange={e=>{
                      const next = [...family];
                      next[idx] = { ...next[idx], age: e.target.value };
                      setFamily(next);
                    }} />
                  <input className="to-input" placeholder="Mobile No" value={row.phone}
                    onChange={e=>{
                      const next = [...family];
                      next[idx] = { ...next[idx], phone: e.target.value };
                      setFamily(next);
                    }} />
                </div>
                <div className="to-add-row">
                  {family.length > 1 && (
                    <button type="button" className="to-remove-btn" onClick={()=>removeFamilyRow(idx)}>Remove</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="to-add-btn" onClick={addFamilyRow}>+ Add Family Member</button>
          </div>

          <div className="to-section">
            <div className="to-section-title">Professional Details</div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">College / Company</label>
                <input className="to-input" value={form.organizationName} onChange={e=>setForm(f=>({...f,organizationName:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Designation</label>
                <input className="to-input" value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))} />
              </div>
            </div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">Organization Address</label>
                <input className="to-input" value={form.organizationAddress} onChange={e=>setForm(f=>({...f,organizationAddress:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Organization Phone</label>
                <input className="to-input" value={form.organizationPhone} onChange={e=>setForm(f=>({...f,organizationPhone:e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="to-section">
            <div className="to-section-title">Room & Bed</div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">Select Room *</label>
                <select className="to-select" value={form.roomNumber} onChange={e=>handleRoomChange(e.target.value)}>
                  <option value="">Select Room</option>
                  {roomsWithVacancy.map(r => (
                    <option key={r.id} value={r.roomNumber}>
                      Room {r.roomNumber} (Vacant: {getVacantBeds(r.roomNumber).length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="to-field">
                <label className="to-label">Bed (Auto Assigned)</label>
                <input className="to-input" value={form.bedNumber} readOnly />
              </div>
            </div>
            {!form.roomNumber && (
              <div className="to-hint">Please select a room with vacant beds.</div>
            )}
            {form.roomNumber && !form.bedNumber && (
              <div className="to-hint" style={{ color:'#dc2626' }}>No vacant beds in this room.</div>
            )}
          </div>

          <div className="to-section">
            <div className="to-section-title">Emergency Contact</div>
            <div className="to-row">
              <div className="to-field">
                <label className="to-label">Guardian Name</label>
                <input className="to-input" value={form.guardianName} onChange={e=>setForm(f=>({...f,guardianName:e.target.value}))} />
              </div>
              <div className="to-field">
                <label className="to-label">Guardian Phone</label>
                <input className="to-input" value={form.guardianPhone} onChange={e=>setForm(f=>({...f,guardianPhone:e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="to-decl">
            <input type="checkbox" checked={form.declaration} onChange={e=>setForm(f=>({...f,declaration:e.target.checked}))} />
            <div className="to-note">
              I hereby that all information given by me is true and complete. I will abide by the Rule and regulations of the {pgData?.pgName || 'PG'}.
            </div>
          </div>
          <div className="to-note">This is a computer generated document. No signature required.</div>

          <div style={{ marginTop:'14px' }}>
            <button className="to-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>

          {pdfUrl && (
            <div style={{ marginTop:'12px' }}>
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="to-note">Download your PDF</a>
            </div>
          )}
        </div>

        <div className="to-footer">pgpilots.in</div>
      </div>
    </>
  );
}
