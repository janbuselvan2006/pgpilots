import React, { useState } from 'react';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sl-root {
    min-height: 100dvh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    position: relative; overflow: hidden;
  }
  .sl-root::before {
    content:''; position:absolute;
    width:400px; height:400px; border-radius:50%;
    background:rgba(233,69,96,0.08);
    top:-100px; right:-100px; pointer-events:none;
  }
  .sl-root::after {
    content:''; position:absolute;
    width:300px; height:300px; border-radius:50%;
    background:rgba(15,52,96,0.3);
    bottom:-80px; left:-80px; pointer-events:none;
  }

  .sl-card {
    background: white;
    border-radius: 24px;
    padding: 36px 28px 40px;
    width: 100%; max-width: 400px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    position: relative; z-index: 1;
    animation: slFadeIn 0.3s ease-out;
  }
  @keyframes slFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .sl-brand { text-align: center; margin-bottom: 28px; }
  .sl-brand-logo { font-size: 36px; margin-bottom: 8px; }
  .sl-brand-name {
    font-size: 20px; font-weight: 800;
    background: linear-gradient(135deg,#e94560,#0f3460);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sl-brand-tag {
    display: inline-block; margin-top: 6px;
    background: linear-gradient(135deg,#667eea,#764ba2);
    color: white; font-size: 11px; font-weight: 800;
    padding: 4px 12px; border-radius: 20px; letter-spacing: 0.5px;
  }

  .sl-title { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 6px; }
  .sl-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }

  .sl-error {
    background: #fff5f5; color: #c53030;
    border: 1px solid #fed7d7; border-radius: 10px;
    padding: 11px 14px; font-size: 13px;
    margin-bottom: 16px; font-weight: 500;
  }

  .sl-field { margin-bottom: 16px; }
  .sl-label {
    display: block; font-size: 11px; font-weight: 700;
    color: #475569; margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .sl-input {
    width: 100%; padding: 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .sl-input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
    background: #fff;
  }
  .sl-pass-wrap { position: relative; }
  .sl-pass-input {
    width: 100%; padding: 13px 48px 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .sl-pass-input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
    background: #fff;
  }
  .sl-eye {
    position: absolute; right: 14px; top: 50%;
    transform: translateY(-50%);
    cursor: pointer; font-size: 18px;
    user-select: none; -webkit-tap-highlight-color: transparent;
  }

  .sl-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; border: none; border-radius: 14px;
    font-size: 15px; font-weight: 700; font-family: inherit;
    cursor: pointer; margin-top: 8px;
    box-shadow: 0 4px 14px rgba(102,126,234,0.35);
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s, transform 0.1s;
  }
  .sl-btn:active { transform: scale(0.98); opacity: 0.92; }
  .sl-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .sl-owner-link {
    text-align: center; margin-top: 20px;
    font-size: 13px; color: #94a3b8;
  }
  .sl-owner-link a {
    color: #e94560; font-weight: 700; text-decoration: none; cursor: pointer;
  }

  .sl-info-box {
    background: linear-gradient(135deg,#f5f3ff,#ede9fe);
    border: 1px solid #c4b5fd;
    border-radius: 12px; padding: 12px 14px; margin-bottom: 20px;
  }
  .sl-info-title { font-size: 12px; font-weight: 800; color: #7c3aed; margin-bottom:4px; }
  .sl-info-text  { font-size: 12px; color: #6d28d9; line-height: 1.5; }
`;

export default function StaffLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim()) return setError('Enter your email address.');
    if (!password)     return setError('Enter your password.');
    setLoading(true);
    setError('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCred.user.uid;

      // ✅ FIX: Query the staff SUBCOLLECTION across all pgOwners
      // Real Firestore path: pgOwners/{ownerId}/staff/{docId}
      const snap = await getDocs(
        query(collectionGroup(db, 'staff'), where('staffUid', '==', uid))
      );

      if (snap.empty) {
        await auth.signOut();
        setError('❌ Staff account not found. Contact your PG owner.');
        setLoading(false);
        return;
      }

      const staffData = snap.docs[0].data();

      if (!staffData.isActive) {
        await auth.signOut();
        setError('❌ Your staff access has been revoked. Contact your PG owner.');
        setLoading(false);
        return;
      }

      // ✅ Store staff context so App.js routes correctly
      sessionStorage.setItem('staffMode',    'true');
      sessionStorage.setItem('staffOwnerId', staffData.ownerId  || '');
      sessionStorage.setItem('staffPgId',    staffData.pgId     || '');
      sessionStorage.setItem('staffPgName',  staffData.pgName   || '');

      navigate('/staff-dashboard', { replace: true });

    } catch (err) {
      console.error('StaffLogin error:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('❌ Invalid email or password.');
      } else {
        setError('❌ Login failed: ' + err.message);
      }
    }
    setLoading(false);
  };

  return (
    <>
      <style>{css}</style>
      <div className="sl-root">
        <div className="sl-card">
          <div className="sl-brand">
            <div className="sl-brand-logo">🏠</div>
            <div className="sl-brand-name">PGpilots</div>
            <div className="sl-brand-tag">👥 STAFF LOGIN</div>
          </div>

          <h2 className="sl-title">Staff Sign In</h2>
          <p className="sl-sub">Enter the credentials given by your PG owner</p>

          <div className="sl-info-box">
            <div className="sl-info-title">ℹ️ For Staff Only</div>
            <div className="sl-info-text">
              Use the email and password provided by your PG owner.<br/>
              PG owners should login at the main login page.
            </div>
          </div>

          {error && <div className="sl-error">{error}</div>}

          <div className="sl-field">
            <label className="sl-label">Email Address</label>
            <input
              className="sl-input"
              type="email"
              placeholder="staff-xxxxx@pgpilots.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="email"
            />
          </div>

          <div className="sl-field">
            <label className="sl-label">Password</label>
            <div className="sl-pass-wrap">
              <input
                className="sl-pass-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
              <span className="sl-eye" onClick={() => setShowPass(p => !p)}>
                {showPass ? '🙈' : '👁️'}
              </span>
            </div>
          </div>

          <button className="sl-btn" onClick={handleLogin} disabled={loading}>
            {loading ? '⏳ Signing in…' : '🔑 Sign In as Staff →'}
          </button>

          <div className="sl-owner-link">
            Are you a PG owner?{' '}
            <a onClick={() => navigate('/login')}>Login here →</a>
          </div>
        </div>
      </div>
    </>
  );
}