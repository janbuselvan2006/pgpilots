import React, { useState, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lg-root {
    min-height: 100dvh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #f5f6fa;
    display: flex;
    flex-direction: column;
  }

  /* ─── HERO (mobile: compact banner, desktop: left sidebar) ─── */
  .lg-hero {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
    padding: 28px 24px 32px;
    position: relative; overflow: hidden;
    flex-shrink: 0;
  }
  .lg-hero::after {
    content: ''; position: absolute;
    width: 260px; height: 260px; border-radius: 50%;
    background: rgba(233,69,96,0.12);
    top: -70px; right: -50px; pointer-events: none;
  }
  .lg-hero-inner { position: relative; z-index: 1; }
  .lg-hero-brand {
    font-size: 15px; font-weight: 800; color: #e94560;
    margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
  }
  .lg-hero-title {
    font-size: clamp(22px, 6vw, 30px);
    font-weight: 800; color: white;
    line-height: 1.25; margin-bottom: 14px;
  }
  /* Features visible on mobile too */
  .lg-hero-sub {
    color: rgba(255,255,255,0.6); font-size: 13px;
    line-height: 1.6; margin-bottom: 14px;
  }
  .lg-hero-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .lg-hero-feature  { color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 500; }
  /* Stats strip — mobile only */
  .lg-stats {
    display: flex; gap: 0;
    border-radius: 14px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .lg-stat {
    flex: 1; text-align: center;
    padding: 12px 6px;
    background: rgba(255,255,255,0.05);
    border-right: 1px solid rgba(255,255,255,0.08);
  }
  .lg-stat:last-child { border-right: none; }
  .lg-stat-num   { font-size: 15px; font-weight: 800; color: #e94560; line-height: 1; }
  .lg-stat-label { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ─── CARD (slides up from hero on mobile) ─── */
  .lg-card {
    background: white;
    border-radius: 24px 24px 0 0;
    flex: 1;
    padding: 28px 24px 48px;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
    margin-top: -10px;
    position: relative; z-index: 1;
  }

  /* ─── TABS ─── */
  .lg-tabs {
    display: flex; background: #f1f5f9;
    border-radius: 12px; padding: 4px; gap: 3px;
    margin-bottom: 24px;
  }
  .lg-tab {
    flex: 1; padding: 10px 4px;
    border: none; border-radius: 9px;
    font-size: 12px; font-weight: 700;
    cursor: pointer; background: transparent;
    color: #94a3b8; font-family: inherit;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .lg-tab.active {
    background: white; color: #e94560;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  /* ─── ALERTS ─── */
  .lg-error {
    background: #fff5f5; color: #c53030;
    border: 1px solid #fed7d7; border-radius: 10px;
    padding: 11px 14px; font-size: 13px;
    margin-bottom: 16px; font-weight: 500;
  }
  .lg-success {
    background: #f0fdf4; color: #15803d;
    border: 1px solid #bbf7d0; border-radius: 10px;
    padding: 11px 14px; font-size: 13px;
    margin-bottom: 16px; font-weight: 600;
  }

  /* ─── FORM ELEMENTS ─── */
  .lg-title { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 6px; }
  .lg-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 22px; line-height: 1.5; }

  .lg-field { margin-bottom: 14px; }
  .lg-label {
    display: block; font-size: 12px; font-weight: 700;
    color: #475569; margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .lg-input {
    width: 100%; padding: 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-input:focus {
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233,69,96,0.1);
    background: #fff;
  }

  /* PG Code special styling */
  .lg-pgcode-input {
    width: 100%; padding: 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 22px; font-weight: 800;
    letter-spacing: 8px; text-align: center;
    font-family: inherit; color: #1a1a2e;
    background: #fafbff; outline: none;
    box-sizing: border-box; -webkit-appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-pgcode-input:focus {
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233,69,96,0.1);
    background: #fff;
  }

  /* Phone row — FIXED: no dynamic state changes that cause re-render focus loss */
  .lg-phone-row {
    display: flex; gap: 8px; align-items: stretch;
  }
  .lg-prefix {
    width: 60px; flex-shrink: 0;
    padding: 13px 0; border: 1.5px solid #e2e8f0;
    border-radius: 12px; font-size: 15px; font-weight: 700;
    color: #475569; background: #f8fafc; text-align: center;
  }
  .lg-phone-input {
    flex: 1; padding: 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-phone-input:focus {
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233,69,96,0.1);
    background: #fff;
  }

  /* Password wrapper */
  .lg-pass-wrap { position: relative; }
  .lg-pass-input {
    width: 100%; padding: 13px 48px 13px 16px;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-pass-input:focus {
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233,69,96,0.1);
    background: #fff;
  }
  .lg-eye {
    position: absolute; right: 14px; top: 50%;
    transform: translateY(-50%);
    cursor: pointer; font-size: 18px;
    user-select: none; -webkit-tap-highlight-color: transparent;
  }

  /* Forgot row */
  .lg-forgot-row {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 6px;
  }
  .lg-forgot {
    font-size: 12px; color: #e94560; font-weight: 700;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
  }

  /* Remember me */
  .lg-remember {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 16px;
  }
  .lg-remember input {
    width: 16px; height: 16px;
    cursor: pointer; accent-color: #e94560; flex-shrink: 0;
  }
  .lg-remember label {
    font-size: 13px; color: #475569;
    cursor: pointer; font-weight: 500;
  }

  /* Sign in button */
  .lg-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #e94560 0%, #c1253f 100%);
    color: white; border: none; border-radius: 14px;
    font-size: 15px; font-weight: 700; font-family: inherit;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(233,69,96,0.35);
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s, transform 0.1s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .lg-btn:active { transform: scale(0.98); opacity: 0.92; }
  .lg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .lg-switch {
    text-align: center; margin-top: 20px;
    color: #94a3b8; font-size: 13px;
  }
  .lg-switch a { color: #e94560; font-weight: 700; text-decoration: none; }

  .lg-back {
    display: inline-block; margin-top: 16px;
    font-size: 13px; color: #e94560;
    font-weight: 700; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* ─── DESKTOP: sidebar layout ─── */
  @media (min-width: 769px) {
    .lg-root {
      flex-direction: row;
      background: #fff;
    }
    /* Left hero sidebar */
    .lg-hero {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    .lg-hero-inner { max-width: 440px; width: 100%; }
    .lg-hero-title { font-size: 40px; margin-bottom: 20px; }
    .lg-hero-brand { font-size: 20px; margin-bottom: 40px; }
    .lg-hero-sub {
      color: rgba(255,255,255,0.6);
      font-size: 16px; line-height: 1.7; margin-bottom: 32px;
    }
    .lg-hero-features { gap: 12px; margin-bottom: 0; }
    .lg-hero-feature  { font-size: 15px; }
    /* Hide mobile stats on desktop */
    .lg-stats { display: none; }

    /* Right form panel */
    .lg-card-panel {
      width: 500px; flex-shrink: 0;
      background: #f8f9ff;
      display: flex; align-items: center; justify-content: center;
      padding: 40px; overflow-y: auto;
    }
    .lg-card {
      border-radius: 20px;
      margin-top: 0;
      box-shadow: 0 8px 40px rgba(0,0,0,0.08);
      width: 100%; max-width: 400px;
      padding: 36px 32px 40px;
      flex: none;
    }
  }
`;

export default function Login() {
  const [loginType, setLoginType]   = useState('pgcode');
  const [emailInput, setEmailInput] = useState('');
  const [mobile, setMobile]         = useState('');
  const [pgCode, setPgCode]         = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Use ref so login handlers always read latest value (avoids stale closure)
  const rememberMeRef = useRef(false);
  const handleRememberChange = (val) => {
    setRememberMe(val);
    rememberMeRef.current = val;
  };
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const navigate = useNavigate();

  const showErr = msg => { setError(msg); setSuccess(''); };
  const showOk  = msg => { setSuccess(msg); setError(''); };
  // Always reads latest rememberMe value via ref — avoids stale closure bug
  const persist = () => rememberMeRef.current ? browserLocalPersistence : browserSessionPersistence;

  // ── Email login ──
  const handleEmailLogin = async () => {
    if (!emailInput.trim()) return showErr('Enter your email address.');
    if (!password)          return showErr('Enter your password.');
    setLoading(true);
    try {
      await setPersistence(auth, persist());
      await signInWithEmailAndPassword(auth, emailInput.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch { showErr('❌ Invalid email or password.'); }
    setLoading(false);
  };

  // ── PG Code login ──
  const handlePGCodeLogin = async () => {
    if (!pgCode.trim()) return showErr('Enter your PG Code.');
    if (!password)      return showErr('Enter your password.');
    setLoading(true);
    try {
      await setPersistence(auth, persist());
      const snap = await getDocs(query(collection(db,'pgOwners'), where('pgCode','==',pgCode.toUpperCase().trim())));
      if (snap.empty) { setLoading(false); return showErr('❌ PG Code not found.'); }
      const data = snap.docs[0].data();
      const userEmail = data.email || `${data.phone}@pgpilots.com`;
      await signInWithEmailAndPassword(auth, userEmail, password);
      navigate('/dashboard', { replace: true });
    } catch(e) { console.error(e); showErr('❌ Invalid PG Code or password.'); }
    setLoading(false);
  };

  // ── Mobile + Password login ──
  const handlePhoneLogin = async () => {
    if (!mobile || mobile.length < 10) return showErr('Enter a valid 10-digit mobile number.');
    if (!password)                      return showErr('Enter your password.');
    setLoading(true);
    try {
      await setPersistence(auth, persist());
      const snap = await getDocs(query(collection(db,'pgOwners'), where('phone','==',mobile.trim())));
      if (snap.empty) { setLoading(false); return showErr('❌ No account found for this mobile number.'); }
      const data = snap.docs[0].data();
      const userEmail = data.email || `${data.phone}@pgpilots.com`;
      await signInWithEmailAndPassword(auth, userEmail, password);
      navigate('/dashboard', { replace: true });
    } catch(e) { console.error(e); showErr('❌ Invalid mobile number or password.'); }
    setLoading(false);
  };

  // ── Forgot password ──
  const handleForgot = async () => {
    if (!forgotInput.trim()) return showErr('Enter your email, PG Code, or mobile number.');
    setLoading(true);
    try {
      let email = forgotInput.trim();
      const cleaned = forgotInput.replace(/\D/g,'');
      if (cleaned.length >= 10) {
        // Mobile number
        const snap = await getDocs(query(collection(db,'pgOwners'), where('phone','==',cleaned)));
        if (snap.empty) { setLoading(false); return showErr('No account found for this number.'); }
        email = snap.docs[0].data().email || `${cleaned}@pgpilots.com`;
      } else if (!forgotInput.includes('@')) {
        // PG Code
        const snap = await getDocs(query(collection(db,'pgOwners'), where('pgCode','==',forgotInput.toUpperCase().trim())));
        if (snap.empty) { setLoading(false); return showErr('PG Code not found.'); }
        email = snap.docs[0].data().email || `${snap.docs[0].data().phone}@pgpilots.com`;
      }
      await sendPasswordResetEmail(auth, email);
      setForgotSent(true);
      showOk(`✅ Reset link sent to ${email}`);
    } catch { showErr('Failed to send reset link. Try again.'); }
    setLoading(false);
  };

  const switchTab = (id) => {
    setLoginType(id);
    setError('');
    setPassword('');
  };

  // ── password field JSX (inline, not a component — avoids focus loss on re-render) ──
  const passwordField = (onEnter) => (
    <div className="lg-field">
      <div className="lg-forgot-row">
        <label className="lg-label">Password</label>
        <span className="lg-forgot" onClick={() => { setShowForgot(true); setError(''); }}>
          Forgot password?
        </span>
      </div>
      <div className="lg-pass-wrap">
        <input
          className="lg-pass-input"
          type={showPass ? 'text' : 'password'}
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter()}
          autoComplete="current-password"
        />
        <span className="lg-eye" onClick={() => setShowPass(p => !p)}>
          {showPass ? '🙈' : '👁️'}
        </span>
      </div>
    </div>
  );

  // ── remember me JSX (inline, not a component) ──
  const rememberField = (id) => (
    <div style={{marginBottom:'16px'}}>
      <div className="lg-remember">
        <input type="checkbox" id={id} checked={rememberMe}
          onChange={e => handleRememberChange(e.target.checked)} />
        <label htmlFor={id}>Stay logged in on this device</label>
      </div>
      <div style={{fontSize:'11px',color:'#94a3b8',marginLeft:'24px',marginTop:'-8px'}}>
        {rememberMe
          ? '✅ You won\'t need to log in again on this device'
          : 'You\'ll be logged out when you close the browser'}
      </div>
    </div>
  );

  // ── Form content ──
  const formContent = showForgot ? (
    <>
      <h2 className="lg-title">Reset Password</h2>
      <p className="lg-sub">Enter your Email, PG Code, or Mobile number</p>
      {error   && <div className="lg-error">{error}</div>}
      {success && <div className="lg-success">{success}</div>}
      {!forgotSent ? (
        <>
          <div className="lg-field">
            <label className="lg-label">Email / PG Code / Mobile</label>
            <input className="lg-input" type="text"
              placeholder="you@email.com  or  ABC123  or  9876543210"
              value={forgotInput}
              onChange={e => setForgotInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleForgot()} />
          </div>
          <button className="lg-btn" onClick={handleForgot} disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link →'}
          </button>
        </>
      ) : (
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:'52px',marginBottom:'14px'}}>📧</div>
          <p style={{color:'#64748b',fontSize:'14px'}}>Check your email for the reset link.</p>
        </div>
      )}
      <div className="lg-back"
        onClick={() => { setShowForgot(false); setForgotSent(false); setForgotInput(''); setError(''); setSuccess(''); }}>
        ← Back to Login
      </div>
    </>
  ) : (
    <>
      <h2 className="lg-title">Welcome back</h2>
      <p className="lg-sub">Sign in to your account</p>

      {error   && <div className="lg-error">{error}</div>}
      {success && <div className="lg-success">{success}</div>}

      {/* Tabs */}
      <div className="lg-tabs">
        {[
          {id:'pgcode', label:'🔑 PG Code'},
          {id:'mobile', label:'📱 Mobile'},
          {id:'email',  label:'📧 Email'},
        ].map(({id,label}) => (
          <button key={id}
            className={`lg-tab${loginType===id?' active':''}`}
            onClick={() => switchTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* PG Code */}
      {loginType === 'pgcode' && (
        <>
          <div className="lg-field">
            <label className="lg-label">PG Code</label>
            <input
              className="lg-pgcode-input"
              type="text"
              placeholder="ABC123"
              maxLength={6}
              value={pgCode}
              onChange={e => setPgCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
              onKeyDown={e => e.key === 'Enter' && handlePGCodeLogin()}
              autoCorrect="off"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              inputMode="text"
            />
          </div>
          {passwordField(handlePGCodeLogin)}
          {rememberField("rm-pg")}
          <button className="lg-btn" onClick={handlePGCodeLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </>
      )}

      {/* Mobile + Password — FIXED: separate input element, no rerender on change */}
      {loginType === 'mobile' && (
        <>
          <div className="lg-field">
            <label className="lg-label">Mobile Number</label>
            <div className="lg-phone-row">
              <div className="lg-prefix">+91</div>
              <input
                className="lg-phone-input"
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                maxLength={10}
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g,''))}
                onKeyDown={e => e.key === 'Enter' && handlePhoneLogin()}
                autoComplete="tel"
              />
            </div>
          </div>
          {passwordField(handlePhoneLogin)}
          {rememberField("rm-mob")}
          <button className="lg-btn" onClick={handlePhoneLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </>
      )}

      {/* Email */}
      {loginType === 'email' && (
        <>
          <div className="lg-field">
            <label className="lg-label">Email Address</label>
            <input
              className="lg-input"
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
              autoComplete="email"
            />
          </div>
          {passwordField(handleEmailLogin)}
          {rememberField("rm-em")}
          <button className="lg-btn" onClick={handleEmailLogin} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </>
      )}

      <p className="lg-switch">
        Don't have an account?{' '}
        <Link to="/signup">Create one free</Link>
      </p>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="lg-root">

        {/* ── Hero / Left panel ── */}
        <div className="lg-hero">
          <div className="lg-hero-inner">
            <div className="lg-hero-brand">🏠 PGpilots</div>
            <h1 className="lg-hero-title">Manage your PG<br/>like a Pro</h1>

            {/* Desktop features list */}
            <p className="lg-hero-sub">
              All-in-one platform for PG owners to manage tenants, rooms, rent and more.
            </p>
            <div className="lg-hero-features">
              {['✅ Tenant Management','✅ Rent Tracking','✅ Electricity Bills','✅ Automated Reminders'].map(f=>(
                <div key={f} className="lg-hero-feature">{f}</div>
              ))}
            </div>

            {/* Mobile stats strip */}
            <div className="lg-stats">
              {[['500+','PG Owners'],['10k+','Tenants'],['₹1Cr+','Collected']].map(([num,label])=>(
                <div key={label} className="lg-stat">
                  <div className="lg-stat-num">{num}</div>
                  <div className="lg-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="lg-card-panel">
          <div className="lg-card">
            {formContent}
          </div>
        </div>

      </div>
    </>
  );
}