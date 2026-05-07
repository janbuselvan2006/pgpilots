import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  
  .find-pg-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #0f172a;
    background: #f8fafc;
    min-height: 100vh;
  }

  /* ── NAVIGATION ── */
  .fp-nav {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 40px; background: #fff; border-bottom: 1px solid #e2e8f0;
    position: sticky; top: 0; z-index: 100;
  }
  .fp-logo {
    font-size: 20px; font-weight: 800; color: #0a1930;
    display: flex; align-items: center; cursor: pointer;
  }
  .fp-logo span { color: #64748b; font-weight: 500; }
  .fp-nav-cta {
    background: #0a1930; color: #00e599; padding: 10px 24px;
    border-radius: 100px; font-weight: 700; border: none; cursor: pointer;
  }

  /* ── HERO ── */
  .fp-hero {
    padding: 80px 24px; text-align: center;
    background: linear-gradient(180deg, #fff 0%, #f1f5f9 100%);
  }
  .fp-hero h1 { font-size: clamp(32px, 5vw, 56px); font-weight: 800; margin-bottom: 24px; letter-spacing: -0.02em; }
  .fp-hero p { font-size: 18px; color: #64748b; max-width: 600px; margin: 0 auto 40px; font-weight: 500; }

  /* ── SEARCH BAR ── */
  .fp-search-container {
    max-width: 800px; margin: 0 auto;
    background: #fff; padding: 10px; border-radius: 100px;
    box-shadow: 0 10px 30px rgba(10, 25, 48, 0.1);
    display: flex; align-items: center; border: 2px solid #0a1930;
  }
  .fp-search-input {
    flex: 1; border: none; padding: 15px 25px; font-size: 16px;
    font-family: inherit; outline: none; border-radius: 100px;
  }
  .fp-search-btn {
    background: #00e599; color: #0a1930; padding: 15px 35px;
    border-radius: 100px; font-weight: 800; border: none; cursor: pointer;
    transition: transform 0.2s;
  }
  .fp-search-btn:hover { transform: scale(1.02); }

  /* ── FILTERS ── */
  .fp-filters {
    display: flex; gap: 12px; justify-content: center; margin-top: 32px; flex-wrap: wrap;
  }
  .fp-filter-tag {
    padding: 8px 20px; border-radius: 100px; border: 1.5px solid #e2e8f0;
    background: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .fp-filter-tag.active { background: #0a1930; color: #fff; border-color: #0a1930; }

  /* ── GRID ── */
  .fp-grid {
    padding: 60px 40px; max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 32px;
  }
  .fp-card {
    background: #fff; border-radius: 24px; overflow: hidden;
    border: 2px solid #e2e8f0; transition: all 0.3s;
  }
  .fp-card:hover { transform: translateY(-8px); border-color: #0a1930; box-shadow: 10px 10px 0px #00e599; }
  .fp-card-img {
    height: 200px; background: #cbd5e1; position: relative;
  }
  .fp-card-badge {
    position: absolute; top: 15px; left: 15px;
    background: rgba(10, 25, 48, 0.9); color: #00e599;
    padding: 5px 12px; border-radius: 100px; font-size: 12px; font-weight: 800;
  }
  .fp-card-content { padding: 24px; }
  .fp-card-title { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .fp-card-loc { font-size: 14px; color: #64748b; margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
  .fp-card-price { font-size: 22px; font-weight: 800; color: #0a1930; }
  .fp-card-price span { font-size: 14px; color: #64748b; font-weight: 500; }

  .fp-footer {
    padding: 60px 40px; background: #0a1930; color: #fff; text-align: center; margin-top: 80px;
  }
  .fp-footer p { opacity: 0.6; font-size: 14px; }

  @media (max-width: 768px) {
    .fp-nav { padding: 15px 20px; }
    .fp-search-container { flex-direction: column; border-radius: 24px; padding: 15px; }
    .fp-search-input { width: 100%; text-align: center; }
    .fp-search-btn { width: 100%; margin-top: 10px; }
    .fp-grid { grid-template-columns: 1fr; padding: 40px 20px; }
  }
`;

export default function FindPG() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingPg, setViewingPg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setError(null);
      const q = query(collectionGroup(db, 'pgs'), where('isPublic', '==', true));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPgs(list);
    } catch (e) { 
      console.error(e);
      if (e.message?.includes('index')) {
        setError('The search index is being prepared. Please try again in a few minutes.');
      } else {
        setError('Failed to load listings. Please refresh the page.');
      }
    }
    setLoading(false);
  };

  const filteredPgs = pgs.filter(pg => {
    const matchesFilter = filter === 'All' || pg.type === filter;
    const matchesSearch = !searchTerm || 
      (pg.pgName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pg.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pg.address?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="find-pg-root">
      <style>{css}</style>
      
      <nav className="fp-nav">
        <div className="fp-logo" onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" style={{ marginRight: '8px' }}>
            <path d="M7 15 L7 27 C7 28.1 7.9 29 9 29 L13 29 L13 22 C13 20.9 13.9 20 15 20 L17 20 C18.1 20 19 20.9 19 22 L19 29 L23 29 C24.1 29 25 28.1 25 27 L25 15 L16 8 Z" fill="#0a1930" />
            <rect x="2" y="14" width="18" height="4" rx="2" fill="#00e599" transform="rotate(-40 2 14)" />
            <rect x="16" y="3" width="18" height="4" rx="2" fill="#00e599" transform="rotate(40 16 3)" />
          </svg>
          PG<span>pilots</span>
        </div>
        <button className="fp-nav-cta" onClick={() => navigate('/signup')}>List Your PG</button>
      </nav>

      <section className="fp-hero">
        <h1>Find your perfect home away from home.</h1>
        <p>Verified PGs and Hostels with zero brokerage. Book instantly and move in today.</p>
        
        <div className="fp-search-container">
          <input 
            className="fp-search-input" 
            placeholder="Search by city or locality (e.g. Chennai, Anna Nagar)" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button className="fp-search-btn">Search PGs</button>
        </div>

        <div className="fp-filters">
          {['All', 'Boys', 'Girls', 'Co-ed'].map(f => (
            <div key={f} className={`fp-filter-tag ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'All' ? 'View All' : f + ' PG'}
            </div>
          ))}
        </div>
      </section>

      <div className="fp-grid">
        {loading ? (
          <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#64748b'}}>
            <div className="st-spinner" style={{marginBottom:'20px'}}></div>
            Searching for verified PGs...
          </div>
        ) : error ? (
          <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#ef4444'}}>
            <div style={{fontSize:'40px', marginBottom:'16px'}}>⚠️</div>
            {error}
          </div>
        ) : filteredPgs.length === 0 ? (
          <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#64748b'}}>
            <div style={{fontSize:'40px', marginBottom:'16px'}}>🏠</div>
            No PGs found matching your criteria.
          </div>
        ) : filteredPgs.map(pg => (
          <div key={pg.id} className="fp-card">
            <div className="fp-card-img" style={{ background: pg.photos?.[0] ? `url(${pg.photos[0]}) center/cover` : '#cbd5e1' }}>
              {!pg.photos?.[0] && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.2 }}>
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="white"><path d="M3 21V7L12 3L21 7V21H15V15H9V21H3Z"/></svg>
                </div>
              )}
              <div className="fp-card-badge">{pg.type}</div>
            </div>
            <div className="fp-card-content">
              <div className="fp-card-title">{pg.pgName}</div>
              <div className="fp-card-loc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {pg.city}, {pg.state}
              </div>
              <div className="fp-card-price">₹{pg.listingPrice || '—'} <span>/ month</span></div>
              <button 
                onClick={() => setViewingPg(pg)}
                style={{ width:'100%', marginTop:'20px', padding:'12px', background:'#0a1930', color:'#00e599', border:'none', borderRadius:'12px', fontWeight:'700', cursor:'pointer' }}>
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── DETAIL MODAL ── */}
      {viewingPg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,25,48,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setViewingPg(null)}>
          <div style={{ background:'white', width:'100%', maxWidth:'800px', maxHeight:'90vh', borderRadius:'24px', overflowY:'auto', position:'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setViewingPg(null)}
              style={{ position:'absolute', top:'20px', right:'20px', border:'none', background:'#f1f5f9', width:'40px', height:'40px', borderRadius:'50%', cursor:'pointer', fontWeight:'bold', zIndex:10 }}>
              ✕
            </button>
            
            <div style={{ display:'grid', gridTemplateColumns: viewingPg.photos?.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap:'4px', background:'#f1f5f9' }}>
              {(viewingPg.photos || []).slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt="pg" style={{ width:'100%', height:'300px', objectFit:'cover' }} />
              ))}
              {(!viewingPg.photos || viewingPg.photos.length === 0) && (
                <div style={{ height:'300px', background:'#cbd5e1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px' }}>🏠</div>
              )}
            </div>

            <div style={{ padding:'32px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
                <div>
                  <h2 style={{ fontSize:'28px', fontWeight:'800', marginBottom:'8px' }}>{viewingPg.pgName}</h2>
                  <div style={{ color:'#64748b', display:'flex', alignItems:'center', gap:'8px', fontSize:'16px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {viewingPg.address}, {viewingPg.city}, {viewingPg.state}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'32px', fontWeight:'800', color:'#0a1930' }}>₹{viewingPg.listingPrice}</div>
                  <div style={{ color:'#64748b', fontSize:'14px' }}>per month</div>
                </div>
              </div>

              <div style={{ display:'flex', gap:'12px', marginBottom:'32px' }}>
                <span style={{ padding:'8px 16px', borderRadius:'100px', background:'#f1f5f9', fontWeight:'700', fontSize:'14px' }}>{viewingPg.type} PG</span>
                <span style={{ padding:'8px 16px', borderRadius:'100px', background:'#f0fffb', color:'#059669', fontWeight:'700', fontSize:'14px' }}>Verified Listing</span>
              </div>

              <h3 style={{ fontSize:'18px', fontWeight:'800', marginBottom:'12px' }}>Description & Amenities</h3>
              <p style={{ color:'#475569', lineHeight:'1.7', whiteSpace:'pre-wrap', marginBottom:'32px' }}>
                {viewingPg.description || 'No description provided.'}
              </p>

              <button 
                onClick={() => alert('Booking feature coming soon! Contact the owner directly for now.')}
                style={{ width:'100%', padding:'18px', background:'#00e599', color:'#0a1930', border:'none', borderRadius:'16px', fontSize:'18px', fontWeight:'800', cursor:'pointer' }}>
                Contact & Book Now
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fp-footer">
        <div style={{ fontSize:'24px', fontWeight:'800', marginBottom:'20px' }}>PGpilots</div>
        <p>© 2026 PGpilots Technology. All rights reserved.</p>
        <p style={{ marginTop:'10px' }}>Making PG living simple and professional.</p>
      </footer>
    </div>
  );
}
