import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
// Removing ref, uploadBytes, getDownloadURL, deleteObject imports as we're switching to Cloudinary

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  
  .lp-root { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; min-height: 100vh; padding: 20px; color: #0a1930; }
  .lp-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 10px 40px rgba(10, 25, 48, 0.05); }
  
  .lp-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
  .lp-back { background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .lp-title { font-size: 24px; font-weight: 800; margin: 0; }

  .lp-section { margin-bottom: 32px; }
  .lp-section-title { font-size: 14px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; display: block; }

  .lp-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; margin-bottom: 16px; }
  .lp-photo-card { 
    aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: #f1f5f9; position: relative; border: 2px solid #e2e8f0;
    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
  }
  .lp-photo-card:hover { border-color: #00e599; }
  .lp-photo-card img { width: 100%; height: 100%; object-fit: cover; }
  .lp-photo-del { position: absolute; top: 8px; right: 8px; background: rgba(10, 25, 48, 0.8); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px; }

  .lp-field { margin-bottom: 20px; }
  .lp-label { display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; }
  .lp-input, .lp-select, .lp-textarea {
    width: 100%; padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: inherit; font-size: 15px; transition: all 0.2s; outline: none; box-sizing: border-box;
  }
  .lp-input:focus, .lp-select:focus, .lp-textarea:focus { border-color: #00e599; background: #f0fffb; }
  
  .lp-type-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .lp-type-btn { 
    padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; background: white; font-weight: 700; cursor: pointer; transition: all 0.2s;
  }
  .lp-type-btn.active { background: #0a1930; color: #00e599; border-color: #0a1930; }

  .lp-switch-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 16px; border-radius: 16px; margin-top: 24px; border: 1px solid #e2e8f0; }
  .lp-switch-info h4 { margin: 0 0 4px; font-size: 15px; }
  .lp-switch-info p { margin: 0; font-size: 12px; color: #64748b; }
  .lp-toggle { width: 44px; height: 24px; background: #cbd5e1; border-radius: 100px; position: relative; cursor: pointer; transition: 0.3s; }
  .lp-toggle.active { background: #00e599; }
  .lp-toggle::after { content: ''; position: absolute; left: 4px; top: 4px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: 0.3s; }
  .lp-toggle.active::after { left: 24px; }

  .lp-save-btn {
    width: 100%; padding: 18px; background: #0a1930; color: #00e599; border: none; border-radius: 16px; font-size: 16px; font-weight: 800; cursor: pointer; margin-top: 32px; transition: all 0.2s;
  }
  .lp-save-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(10, 25, 48, 0.15); }
  .lp-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .lp-status { padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 20px; text-align: center; }
  .lp-status.success { background: #f0fdf4; color: #166534; }
  .lp-status.error { background: #fef2f2; color: #991b1b; }
`;

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dc6pf89va';
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'pgpilots_docs';

export default function ListProperty() {
  const navigate = useNavigate();
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    pgId: '',
    type: 'Boys',
    price: '',
    description: '',
    photos: [],
    isPublic: false,
    area: '',
    landmark: '',
    googleMapLink: '',
    address: '',
    city: '',
    state: ''
  });

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'pgOwners', user.uid, 'pgs'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPgs(list);
      if (list.length > 0) {
        const main = list.find(p => p.is_main) || list[0];
        setForm({
          pgId: main.id,
          type: main.type || 'Boys',
          price: main.listingPrice || '',
          description: main.description || '',
          photos: main.photos || [],
          isPublic: main.isPublic || false,
          area: main.area || '',
          landmark: main.landmark || '',
          googleMapLink: main.googleMapLink || '',
          address: main.address || '',
          city: main.city || '',
          state: main.state || ''
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handlePgChange = (e) => {
    const pg = pgs.find(p => p.id === e.target.value);
    if (pg) {
      setForm({
        pgId: pg.id,
        type: pg.type || 'Boys',
        price: pg.listingPrice || '',
        description: pg.description || '',
        photos: pg.photos || [],
        isPublic: pg.isPublic || false,
        area: pg.area || '',
        landmark: pg.landmark || '',
        googleMapLink: pg.googleMapLink || '',
        address: pg.address || '',
        city: pg.city || '',
        state: pg.state || ''
      });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.photos.length >= 6) { setStatus({ type: 'error', msg: 'Max 6 photos allowed' }); return; }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `pgpilots/listings/${user.uid}/${form.pgId}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.secure_url) {
        const newPhotos = [...form.photos, data.secure_url];
        setForm(prev => ({ ...prev, photos: newPhotos }));
        await updateDoc(doc(db, 'pgOwners', user.uid, 'pgs', form.pgId), { photos: newPhotos });
        setStatus({ type: 'success', msg: 'Photo uploaded to Cloudinary!' });
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (e) { 
      console.error(e);
      setStatus({ type: 'error', msg: 'Upload failed: ' + e.message }); 
    }
    setUploading(false);
  };

  const removePhoto = async (url, index) => {
    try {
      const newPhotos = form.photos.filter((_, i) => i !== index);
      setForm(prev => ({ ...prev, photos: newPhotos }));
      await updateDoc(doc(db, 'pgOwners', user.uid, 'pgs', form.pgId), { photos: newPhotos });
      // Optionally delete from storage too (need to parse path from URL)
    } catch (e) { console.error(e); }
  };

  const saveListing = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pgOwners', user.uid, 'pgs', form.pgId), {
        type: form.type,
        listingPrice: form.price,
        description: form.description,
        isPublic: form.isPublic,
        area: form.area || '',
        landmark: form.landmark || '',
        googleMapLink: form.googleMapLink || '',
        address: form.address || '',
        city: form.city || '',
        state: form.state || '',
        updatedAt: serverTimestamp()
      });
      setStatus({ type: 'success', msg: 'Listing updated successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) { setStatus({ type: 'error', msg: 'Failed to save listing' }); }
    setSaving(false);
  };

  if (loading) return <div className="lp-root" style={{display:'flex',justifyContent:'center',alignItems:'center'}}>Loading...</div>;

  return (
    <div className="lp-root">
      <style>{css}</style>
      <div className="lp-container">
        <div className="lp-header">
          <button className="lp-back" onClick={() => navigate(-1)}>←</button>
          <h1 className="lp-title">Manage Public Listing</h1>
        </div>

        {status && <div className={`lp-status ${status.type}`}>{status.msg}</div>}

        <div className="lp-field">
          <label className="lp-label">Select PG to List</label>
          <select className="lp-select" value={form.pgId} onChange={handlePgChange}>
            {pgs.map(p => <option key={p.id} value={p.id}>{p.pgName} {p.isPublic ? '(LIVE)' : '(Private)'}</option>)}
          </select>
        </div>

        <section className="lp-section">
          <span className="lp-section-title">PG Photos (Max 6)</span>
          <div className="lp-photo-grid">
            {form.photos.map((p, i) => (
              <div key={i} className="lp-photo-card">
                <img src={p} alt="pg"/>
                <button className="lp-photo-del" onClick={() => removePhoto(p, i)}>✕</button>
              </div>
            ))}
            {form.photos.length < 6 && (
              <div className="lp-photo-card" onClick={() => fileRef.current.click()}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'4px'}}>{uploading ? '⏳' : '📷'}</div>
                  <div style={{fontSize:'10px',fontWeight:'700'}}>Add Photo</div>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" style={{display:'none'}} onChange={handlePhotoUpload} accept="image/*" />
        </section>

        <section className="lp-section">
          <span className="lp-section-title">Listing Details</span>
          
          <div className="lp-field">
            <label className="lp-label">PG Type</label>
            <div className="lp-type-row">
              {['Boys', 'Girls', 'Co-ed'].map(t => (
                <button key={t} className={`lp-type-btn ${form.type === t ? 'active' : ''}`} onClick={() => setForm(f => ({...f, type: t}))}>{t}</button>
              ))}
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label">Starting Price (₹ / month)</label>
            <input className="lp-input" type="number" placeholder="e.g. 7500" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} />
          </div>

          <div className="lp-field">
            <label className="lp-label">PG Physical Address</label>
            <input className="lp-input" type="text" placeholder="e.g. No. 12, Main Street" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="lp-field">
              <label className="lp-label">City</label>
              <input className="lp-input" type="text" placeholder="e.g. Chennai" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} />
            </div>
            <div className="lp-field">
              <label className="lp-label">State</label>
              <input className="lp-input" type="text" placeholder="e.g. Tamil Nadu" value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} />
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label">PG Area / Locality</label>
            <input className="lp-input" type="text" placeholder="e.g. Anna Nagar, T. Nagar" value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} />
          </div>

          <div className="lp-field">
            <label className="lp-label">Nearest Landmark</label>
            <input className="lp-input" type="text" placeholder="e.g. Near Central Metro Station" value={form.landmark} onChange={e => setForm(f => ({...f, landmark: e.target.value}))} />
          </div>

          <div className="lp-field">
            <label className="lp-label">Google Map Location Link</label>
            <input className="lp-input" type="url" placeholder="e.g. https://maps.app.goo.gl/..." value={form.googleMapLink} onChange={e => setForm(f => ({...f, googleMapLink: e.target.value}))} />
          </div>

          <div className="lp-field">
            <label className="lp-label">Description & Amenities</label>
            <textarea className="lp-textarea" rows="4" placeholder="Describe your PG, room types, food, wifi, laundry, etc." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}></textarea>
          </div>

          <div className="lp-switch-row">
            <div className="lp-switch-info">
              <h4>Public Visibility</h4>
              <p>Show this PG on the PGpilots search platform</p>
            </div>
            <div className={`lp-toggle ${form.isPublic ? 'active' : ''}`} onClick={() => setForm(f => ({...f, isPublic: !f.isPublic}))}></div>
          </div>
        </section>

        <button className="lp-save-btn" onClick={saveListing} disabled={saving}>
          {saving ? 'Saving Changes...' : 'Save & Publish Listing'}
        </button>
      </div>
    </div>
  );
}
