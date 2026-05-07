import React, { useState, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lg-root {
    min-height: 100dvh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }
  .lg-topbar {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    border-bottom: 1px solid #e8edf5;
    background: #ffffff;
    position: sticky; top: 0; z-index: 100;
  }
  .lg-brand {
    display: flex; align-items: center; gap: 8px;
    font-size: 22px; font-weight: 800; color: #e94560;
    letter-spacing: -0.3px;
  }
  .lg-trust {
    display: flex; align-items: center; gap: 6px;
    font-size: 13px; color: #475569; font-weight: 600;
  }
  .lg-main {
    flex: 1; display: flex; flex-direction: column;
  }

  /* ── LEFT HERO PANEL ── */
  .lg-hero {
    background: #ffffff;
    padding: 32px 24px 28px;
    position: relative; overflow: hidden;
  }
  .lg-hero-inner { position: relative; z-index: 1; }
  .lg-hero-title {
    font-size: clamp(28px, 6vw, 48px);
    font-weight: 800; color: #0f172a;
    line-height: 1.1; margin-bottom: 14px;
    letter-spacing: -1px;
  }
  .lg-hero-title em { color: #e94560; font-style: normal; }
  .lg-hero-sub {
    color: #64748b; font-size: 15px;
    line-height: 1.65; margin-bottom: 28px;
  }
  /* Feature rows */
  .lg-features { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
  .lg-feature-item { display: flex; align-items: flex-start; gap: 14px; }
  .lg-feature-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 18px;
  }
  .lg-feature-icon.red   { background: #fff1f3; }
  .lg-feature-icon.green { background: #f0fdf4; }
  .lg-feature-icon.blue  { background: #eff6ff; }
  .lg-feature-icon.amber { background: #fffbeb; }
  .lg-feature-text h4 { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .lg-feature-text p  { font-size: 12px; color: #64748b; line-height: 1.45; }
  /* Building visual card */
  .lg-building-wrap {
    position: relative; margin-bottom: 20px;
    border-radius: 20px; overflow: hidden;
    background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%);
    height: 180px; display: flex; align-items: flex-end;
  }
  .lg-building-img {
    width: 100%; height: 100%; object-fit: cover;
    opacity: 0.75; position: absolute; inset: 0;
  }
  .lg-building-badge {
    position: absolute; top: 14px; right: 14px;
    background: rgba(255,255,255,0.95);
    border-radius: 12px; padding: 8px 14px;
    font-size: 12px; font-weight: 800; color: #0f172a;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    text-align: center; line-height: 1.3;
  }
  .lg-building-badge span { color: #e94560; display: block; font-size: 18px; }
  .lg-collected-card {
    position: absolute; bottom: 14px; left: 14px; right: 14px;
    background: rgba(255,255,255,0.95);
    border-radius: 12px; padding: 10px 14px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }
  .lg-collected-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .lg-collected-val   { font-size: 20px; font-weight: 800; color: #0f172a; }
  .lg-collected-trend { font-size: 11px; color: #16a34a; font-weight: 700; }
  /* Reviews strip */
  .lg-reviews {
    display: flex; align-items: center; gap: 12px;
  }
  .lg-avatars { display: flex; }
  .lg-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    border: 2px solid #fff; margin-left: -8px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white;
    flex-shrink: 0;
  }
  .lg-avatars .lg-avatar:first-child { margin-left: 0; }
  .lg-review-text { flex: 1; }
  .lg-stars { color: #f59e0b; font-size: 13px; letter-spacing: 1px; }
  .lg-review-caption { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }

  /* Mobile stat strip */
  .lg-stats {
    display: none;
  }

  /* ── RIGHT FORM PANEL ── */
  .lg-card-panel {
    background: #f8fafc;
    padding: 28px 20px 40px;
    display: flex; flex-direction: column; align-items: center;
  }
  .lg-card {
    background: white;
    border-radius: 20px;
    width: 100%; max-width: 400px;
    padding: 28px 24px 32px;
    box-shadow: 0 8px 32px rgba(2,6,23,0.1);
  }

  /* ── TABS ── */
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
    transition: all 0.2s; -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .lg-tab.active {
    background: white; color: #e94560;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  /* ── ALERTS ── */
  .lg-error   { background:#fff5f5; color:#c53030; border:1px solid #fed7d7; border-radius:10px; padding:11px 14px; font-size:13px; margin-bottom:16px; font-weight:500; }
  .lg-success { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; border-radius:10px; padding:11px 14px; font-size:13px; margin-bottom:16px; font-weight:600; }

  /* ── FORM ELEMENTS ── */
  .lg-title { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
  .lg-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 22px; line-height: 1.5; }
  .lg-field { margin-bottom: 14px; }
  .lg-label { display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.4px; }
  .lg-input {
    width:100%; padding:13px 16px;
    border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit;
    color:#0f172a; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-input:focus { border-color:#e94560; box-shadow:0 0 0 3px rgba(233,69,96,0.1); background:#fff; }
  .lg-pgcode-input {
    width:100%; padding:13px 16px;
    border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:22px; font-weight:800; letter-spacing:8px; text-align:center;
    font-family:inherit; color:#0f172a; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-pgcode-input:focus { border-color:#e94560; box-shadow:0 0 0 3px rgba(233,69,96,0.1); background:#fff; }
  .lg-phone-row { display:flex; gap:8px; align-items:stretch; }
  .lg-prefix {
    width:72px; flex-shrink:0; padding:13px 0;
    border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-weight:700; color:#475569;
    background:#f8fafc; text-align:center;
    display: flex; align-items: center; justify-content: center; gap: 4px;
  }
  .lg-phone-input {
    flex:1; padding:13px 16px;
    border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit;
    color:#0f172a; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-phone-input:focus { border-color:#e94560; box-shadow:0 0 0 3px rgba(233,69,96,0.1); background:#fff; }
  .lg-pass-wrap { position:relative; }
  .lg-pass-input {
    width:100%; padding:13px 48px 13px 16px;
    border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:15px; font-family:inherit;
    color:#0f172a; background:#fafbff;
    outline:none; box-sizing:border-box; -webkit-appearance:none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lg-pass-input:focus { border-color:#e94560; box-shadow:0 0 0 3px rgba(233,69,96,0.1); background:#fff; }
  .lg-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:18px; user-select:none; -webkit-tap-highlight-color:transparent; }
  .lg-forgot-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .lg-forgot { font-size:12px; color:#e94560; font-weight:700; cursor:pointer; }
  .lg-remember { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
  .lg-remember input { width:14px; height:14px; accent-color:#e94560; margin:0; flex-shrink:0; }
  .lg-remember label { font-size:13px; color:#334155; line-height:1.25; cursor:pointer; }
  .lg-btn {
    width:100%; border:none; border-radius:14px;
    padding:14px 16px;
    background: linear-gradient(135deg, #e94560 0%, #c1253f 100%);
    color:white; font-size:16px; font-weight:800;
    font-family:inherit; cursor:pointer;
    transition: transform 0.15s, box-shadow 0.2s, filter 0.2s;
    box-shadow: 0 6px 20px rgba(233,69,96,0.35);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .lg-btn:hover { filter:brightness(1.05); }
  .lg-btn:active { transform:translateY(1px); }
  .lg-btn:disabled { opacity:0.65; cursor:not-allowed; box-shadow:none; }
  .lg-switch { text-align:center; margin:16px 0 12px; color:#64748b; font-size:14px; line-height:1.4; }
  .lg-switch a { color:#e94560; font-weight:700; text-decoration:none; }
  .lg-switch a:hover { text-decoration:underline; }
  .lg-back { margin-top:12px; color:#e94560; font-size:14px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
  .lg-staff-divider { display:flex; align-items:center; gap:10px; margin:16px 0 10px; }
  .lg-staff-divider span { flex:1; height:1px; background:#e2e8f0; }
  .lg-staff-divider p { font-size:11px; color:#cbd5e1; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
  .lg-staff-btn {
    width:100%; padding:12px 16px;
    background:transparent; border:1.5px solid #e2e8f0; border-radius:12px;
    font-size:13px; font-weight:700; font-family:inherit; color:#475569;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
    transition: border-color 0.2s, background 0.2s, color 0.2s;
    -webkit-tap-highlight-color:transparent; text-decoration:none;
  }
  .lg-staff-btn:hover { border-color:#6366f1; color:#6366f1; background:#f5f3ff; }
  .lg-staff-btn:active { transform:scale(0.98); }
  .lg-bottom-strip {
    background: #0f172a; color: #94a3b8;
    padding: 14px 24px;
    display: grid; grid-template-columns: repeat(2,1fr);
    gap: 10px;
  }
  .lg-bottom-item { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .lg-google-btn {
    width:100%; padding:13px; background:white; color:#0f172a; border:1.5px solid #e2e8f0;
    border-radius:12px; font-size:14px; font-weight:700; font-family:inherit; cursor:pointer;
    transition: all 0.2s; display:flex; align-items:center; justify-content:center; gap:10px;
    margin-bottom:14px; margin-top:8px;
  }
  .lg-google-icon { width:18px; height:18px; }

  /* ── DESKTOP ── */
  @media (min-width: 769px) {
    .lg-topbar { padding: 0 48px; height: 72px; }
    .lg-brand { font-size: 24px; }
    .lg-trust { font-size: 14px; }
    .lg-main { flex-direction: row; flex: 1; }
    /* Left hero */
    .lg-hero {
      flex: 1.2; display: flex; align-items: center; justify-content: center;
      padding: 60px 56px; border-right: 1px solid #e8edf5;
      min-height: 0;
    }
    .lg-hero-inner { max-width: 460px; width: 100%; }
    .lg-hero-title { font-size: 44px; margin-bottom: 16px; }
    .lg-hero-sub { font-size: 16px; margin-bottom: 32px; }
    .lg-features { gap: 16px; margin-bottom: 32px; }
    .lg-building-wrap { height: 220px; margin-bottom: 24px; }
    /* Right form panel */
    .lg-card-panel {
      width: 480px; flex-shrink: 0;
      background: linear-gradient(160deg, #1a2540 0%, #0f172a 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 48px 40px; overflow-y: auto;
    }
    .lg-card {
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      width: 100%; max-width: 380px;
      padding: 36px 32px 40px;
    }
    .lg-bottom-strip { grid-template-columns: repeat(4,1fr); padding: 16px 48px; gap: 20px; }
    .lg-bottom-item { font-size: 13px; }
  }
`;

const phoneIndexRef = (phone) => doc(db, 'phoneIndex', `+91${(phone || '').replace(/\D/g, '')}`);
const emailIndexRef = (email) => doc(db, 'emailIndex', (email || '').trim().toLowerCase());
const pgCodeIndexRef = (code) => doc(db, 'pgCodeIndex', (code || '').trim().toUpperCase());

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
      sessionStorage.removeItem('signingUp');
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
      const code = pgCode.toUpperCase().trim();
      const snap = await getDoc(pgCodeIndexRef(code));
      if (!snap.exists()) { setLoading(false); return showErr('❌ PG Code not found.'); }
      const data = snap.data() || {};
      const userEmail = data.loginEmail;
      if (!userEmail) { setLoading(false); return showErr('❌ PG Code not found.'); }
      sessionStorage.removeItem('signingUp');
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
      const cleaned = mobile.trim();
      const snap = await getDoc(phoneIndexRef(cleaned));
      if (!snap.exists()) { setLoading(false); return showErr('❌ No account found for this mobile number.'); }
      const data = snap.data() || {};
      const userEmail = data.loginEmail;
      if (!userEmail) { setLoading(false); return showErr('❌ No account found for this mobile number.'); }
      sessionStorage.removeItem('signingUp');
      await signInWithEmailAndPassword(auth, userEmail, password);
      navigate('/dashboard', { replace: true });
    } catch(e) { console.error(e); showErr('❌ Invalid mobile number or password.'); }
    setLoading(false);
  };


  // Handle redirect result on mount
  React.useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          // Check if account exists in DB
          const snap = await getDoc(emailIndexRef(result.user.email));
          if (!snap.exists()) {
            await auth.signOut();
            showErr('🚫 No account found for this Google email. Please sign up first.');
          } else {
            sessionStorage.removeItem('signingUp');
            navigate('/dashboard', { replace: true });
          }
          setLoading(false);
        }
        // Always clear the flag if we reach here (either result found or nothing pending)
        sessionStorage.removeItem('authInProgress');
        sessionStorage.removeItem('signingUp');
      } catch (err) {
        sessionStorage.removeItem('authInProgress');
        sessionStorage.removeItem('signingUp');
        console.error("Redirect check error:", err);
        // Don't show error if it's just a routine mount without a redirect pending
      }
    };
    checkRedirect();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setError(''); setSuccess('');
    setLoading(true);
    // Set flag so App.js PublicRoute doesn't redirect before our check
    sessionStorage.setItem('authInProgress', 'true');
    try {
      const provider = new GoogleAuthProvider();
      // Use signInWithRedirect to avoid Cross-Origin-Opener-Policy (COOP) errors in some browsers
      await signInWithRedirect(auth, provider);
    } catch (err) {
      sessionStorage.removeItem('authInProgress');
      console.error(err);
      showErr('Google Sign-In failed to start.');
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotInput.trim()) return showErr('Enter your email, PG Code, or mobile number.');
    setLoading(true);
    try {
      const input = forgotInput.trim();
      const cleaned = input.replace(/\D/g,'');
      let email = '';

      if (input.includes('@')) {
        const snap = await getDoc(emailIndexRef(input));
        if (!snap.exists()) { setLoading(false); return showErr('No account found for this email.'); }
        email = snap.data()?.loginEmail || input;
      } else if (cleaned.length >= 10) {
        const snap = await getDoc(phoneIndexRef(cleaned));
        if (!snap.exists()) { setLoading(false); return showErr('No account found for this number.'); }
        email = snap.data()?.loginEmail || '';
      } else {
        const snap = await getDoc(pgCodeIndexRef(input));
        if (!snap.exists()) { setLoading(false); return showErr('PG Code not found.'); }
        email = snap.data()?.loginEmail || '';
      }

      if (!email) { setLoading(false); return showErr('No account found.'); }
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
          {id:'pgcode', label:'PG Code'},
          {id:'mobile', label:'Mobile'},
          {id:'email',  label:'Email'},
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

      <div style={{display:'flex', alignItems:'center', margin:'20px 0', gap:'10px'}}>
        <span style={{flex:1, height:'1px', background:'#e2e8f0'}} />
        <span style={{fontSize:'11px', color:'#cbd5e1', fontWeight:'600'}}>OR</span>
        <span style={{flex:1, height:'1px', background:'#e2e8f0'}} />
      </div>

      {/* Commented out Google OAuth button as requested
      <button className="lg-google-btn" onClick={handleGoogleLogin} disabled={loading}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="lg-google-icon" />
        Continue with Google
      </button>
      */}

      <p className="lg-switch">
        Don't have an account?{' '}
        <Link to="/signup">Create one free</Link>
      </p>

      {/* Staff Login */}
      <div className="lg-staff-divider">

        <span /><p>Staff Access</p><span />
      </div>
      <Link to="/staff-login" className="lg-staff-btn" id="staff-login-btn">
        🔒 Staff Login
      </Link>
    </>
  );

  const features = [
    { icon: '🏠', color: 'red',   title: 'Easy PG Management',       desc: 'Add rooms, tenants and manage everything from one dashboard.' },
    { icon: '₹',  color: 'green', title: 'Automated Rent Collection', desc: 'Collect rent on time and track payments without any hassle.' },
    { icon: '📊', color: 'blue',  title: 'Reports & Analytics',       desc: 'Get insights and reports to make better decisions every day.' },
    { icon: '🎧', color: 'amber', title: '24/7 Support',              desc: 'We are always here to help you whenever you need.' },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="lg-root">
        {/* Top bar */}
        <div className="lg-topbar">
          <div className="lg-brand">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <path d="M7 15L7 27C7 28.1 7.9 29 9 29H13V22C13 20.9 13.9 20 15 20H17C18.1 20 19 20.9 19 22V29H23C24.1 29 25 28.1 25 27V15L16 8Z" fill="#e94560"/>
              <rect x="2" y="14" width="18" height="4" rx="2" fill="#e94560" transform="rotate(-40 2 14)"/>
              <rect x="16" y="3" width="18" height="4" rx="2" fill="#e94560" transform="rotate(40 16 3)"/>
            </svg>
            PGpilots
          </div>
          <div className="lg-trust">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Trusted by 10,000+ PG Owners
          </div>
        </div>

        <div className="lg-main">
          {/* ── Left Hero ── */}
          <div className="lg-hero">
            <div className="lg-hero-inner">
              <h1 className="lg-hero-title">Manage Your PG.<br/>Grow Your <em>Income.</em></h1>
              <p className="lg-hero-sub">All-in-one platform to manage rooms, tenants, payments and maintenance – easily and efficiently.</p>

              <div className="lg-features">
                {features.map(f => (
                  <div key={f.title} className="lg-feature-item">
                    <div className={`lg-feature-icon ${f.color}`}>{f.icon}</div>
                    <div className="lg-feature-text">
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Building card */}
              <div className="lg-building-wrap">
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1a3a5c,#0d2137)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.3">
                    <rect x="10" y="30" width="60" height="45" rx="4" fill="white"/>
                    <rect x="20" y="15" width="40" height="20" rx="2" fill="white"/>
                    <polygon points="40,5 5,30 75,30" fill="white"/>
                    <rect x="30" y="50" width="20" height="25" rx="2" fill="#1a3a5c"/>
                    <rect x="15" y="40" width="12" height="10" rx="1" fill="#1a3a5c"/>
                    <rect x="53" y="40" width="12" height="10" rx="1" fill="#1a3a5c"/>
                  </svg>
                </div>
                <div className="lg-building-badge">
                  <span>500+</span>PG Owners
                </div>
                <div className="lg-collected-card">
                  <div>
                    <div className="lg-collected-label">Total Collected</div>
                    <div className="lg-collected-val">₹1.2 Cr+</div>
                  </div>
                  <div className="lg-collected-trend">↑ 24% ↗</div>
                </div>
              </div>

              {/* Reviews */}
              <div className="lg-reviews">
                <div className="lg-avatars">
                  {[['R','#e94560'],['S','#6366f1'],['A','#f59e0b'],['M','#10b981']].map(([l,c]) => (
                    <div key={l} className="lg-avatar" style={{ background: c }}>{l}</div>
                  ))}
                </div>
                <div className="lg-review-text">
                  <div className="lg-stars">★★★★★</div>
                  <div className="lg-review-caption">4.8/5 from 1000+ reviews · PG owners love PGpilots</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Form Panel ── */}
          <div className="lg-card-panel">
            <div className="lg-card">
              {formContent}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="lg-bottom-strip">
          {[
            { icon: '🛡️', label: 'Secure & Reliable',  sub: 'Your data is 100% safe with us' },
            { icon: '🔒', label: 'Privacy First',       sub: 'We respect your privacy' },
            { icon: '☁️', label: 'Cloud Based',         sub: 'Access your data from anywhere' },
            { icon: '🎧', label: 'Always Here',         sub: '24/7 support for you' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="lg-bottom-item">
              <span>{icon}</span>
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: '11px', marginTop: '1px' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
