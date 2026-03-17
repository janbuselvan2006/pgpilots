import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

// ── Generate unique PG code: first 3 letters of PG name + 3 random digits
const generatePGCode = (pgName) => {
  const letters = pgName.replace(/\s+/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  const digits  = Math.floor(100 + Math.random() * 900);
  return `${letters}${digits}`;
};

const isPGCodeUnique = async (code) => {
  const q = query(collection(db, 'pgOwners'), where('pgCode', '==', code));
  const snap = await getDocs(q);
  return snap.empty;
};

const createUniquePGCode = async (pgName) => {
  let code, unique = false, attempts = 0;
  while (!unique && attempts < 10) {
    code   = generatePGCode(pgName);
    unique = await isPGCodeUnique(code);
    attempts++;
  }
  return code;
};

// ─────────────────────────────────────────────
// Inline styles (scoped to this component)
// ─────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .pg-signup-root {
    min-height: 100dvh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #f5f6fa;
    display: flex;
    flex-direction: column;
  }

  /* ── Hero banner (mobile: compact, desktop: sidebar) ── */
  .pg-hero {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
    padding: 28px 24px 32px;
    position: relative;
    overflow: hidden;
  }
  .pg-hero::after {
    content: '';
    position: absolute;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: rgba(233,69,96,0.12);
    top: -80px; right: -80px;
    pointer-events: none;
  }
  .pg-hero-brand {
    font-size: 15px;
    font-weight: 800;
    color: #e94560;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pg-hero-title {
    font-size: clamp(22px, 6vw, 30px);
    font-weight: 800;
    color: #fff;
    line-height: 1.25;
    margin-bottom: 18px;
  }
  .pg-hero-stats {
    display: flex;
    gap: 0;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .pg-stat {
    flex: 1;
    text-align: center;
    padding: 12px 8px;
    background: rgba(255,255,255,0.05);
    border-right: 1px solid rgba(255,255,255,0.08);
  }
  .pg-stat:last-child { border-right: none; }
  .pg-stat-num {
    font-size: 16px;
    font-weight: 800;
    color: #e94560;
    line-height: 1;
  }
  .pg-stat-label {
    font-size: 10px;
    color: rgba(255,255,255,0.5);
    margin-top: 4px;
    font-weight: 500;
  }

  /* ── Form card ── */
  .pg-card {
    background: #fff;
    border-radius: 24px 24px 0 0;
    flex: 1;
    padding: 28px 24px 48px;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
    margin-top: -10px;
    position: relative;
    z-index: 1;
  }

  /* ── Step indicator ── */
  .pg-steps {
    display: flex;
    align-items: center;
    margin-bottom: 28px;
  }
  .pg-step-dot {
    width: 30px; height: 30px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    flex-shrink: 0;
    transition: background 0.3s, color 0.3s;
  }
  .pg-step-dot.active  { background: #e94560; color: #fff; }
  .pg-step-dot.done    { background: #059669; color: #fff; }
  .pg-step-dot.pending { background: #edf2f7; color: #aaa; }
  .pg-step-label {
    font-size: 9px;
    font-weight: 600;
    margin-top: 4px;
    text-align: center;
  }
  .pg-step-label.active  { color: #e94560; }
  .pg-step-label.done    { color: #059669; }
  .pg-step-label.pending { color: #cbd5e0; }
  .pg-step-line {
    flex: 1;
    height: 2px;
    margin-bottom: 16px;
    transition: background 0.3s;
  }
  .pg-step-line.done { background: #059669; }
  .pg-step-line.pending { background: #edf2f7; }

  /* ── Alerts ── */
  .pg-error {
    background: #fff5f5;
    color: #c53030;
    border: 1px solid #fed7d7;
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 13px;
    margin-bottom: 16px;
    font-weight: 500;
  }
  .pg-success {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 13px;
    margin-bottom: 16px;
    font-weight: 600;
  }

  /* ── Form elements ── */
  .pg-form-title {
    font-size: 22px;
    font-weight: 800;
    color: #1a1a2e;
    margin-bottom: 6px;
  }
  .pg-form-sub {
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 22px;
    line-height: 1.5;
  }
  .pg-field { margin-bottom: 14px; }
  .pg-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .pg-input {
    width: 100%;
    padding: 13px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    color: #1a1a2e;
    background: #fafbff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    -webkit-appearance: none;
  }
  .pg-input:focus {
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233,69,96,0.1);
    background: #fff;
  }
  .pg-input-prefix {
    display: flex;
    gap: 8px;
  }
  .pg-prefix-box {
    width: 60px;
    flex-shrink: 0;
    padding: 13px 0;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    color: #475569;
    background: #f8fafc;
    text-align: center;
  }

  /* ── Password wrapper ── */
  .pg-pass-wrap { position: relative; }
  .pg-eye {
    position: absolute;
    right: 14px; top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    font-size: 18px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── OTP inputs ── */
  .pg-otp-row {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin: 20px 0 24px;
  }
  .pg-otp-box {
    width: 44px; height: 52px;
    text-align: center;
    font-size: 22px;
    font-weight: 800;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
    background: #fafbff;
    outline: none;
    color: #1a1a2e;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    font-family: inherit;
  }
  .pg-otp-box:focus { border-color: #e94560; background: #fff; }
  .pg-otp-box.filled { border-color: #e94560; }

  /* ── Primary button ── */
  .pg-btn {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #e94560 0%, #c1253f 100%);
    color: #fff;
    border: none;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 14px rgba(233,69,96,0.35);
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .pg-btn:active { transform: scale(0.98); opacity: 0.92; }
  .pg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* back button */
  .pg-btn-back {
    width: 48px;
    flex-shrink: 0;
    padding: 15px 0;
    background: #f1f5f9;
    color: #64748b;
    border: none;
    border-radius: 14px;
    font-size: 18px;
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.2s;
  }
  .pg-btn-row { display: flex; gap: 10px; }

  /* ── Resend area ── */
  .pg-resend {
    text-align: center;
    margin-top: 16px;
    font-size: 13px;
    color: #94a3b8;
  }
  .pg-resend-link {
    color: #e94560;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .pg-change-num {
    text-align: center;
    margin-top: 10px;
    font-size: 12px;
    color: #94a3b8;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── Switch text ── */
  .pg-switch {
    text-align: center;
    margin-top: 20px;
    font-size: 13px;
    color: #94a3b8;
  }
  .pg-switch a { color: #e94560; font-weight: 700; text-decoration: none; }

  /* ── Password strength ── */
  .pg-strength-bar {
    height: 4px;
    border-radius: 99px;
    background: #e2e8f0;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .pg-strength-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.3s, background 0.3s;
  }
  .pg-strength-label { font-size: 11px; color: #94a3b8; }

  /* ── Success step ── */
  .pg-success-step { text-align: center; }
  .pg-code-card {
    background: linear-gradient(135deg, #1a1a2e, #0f3460);
    border-radius: 18px;
    padding: 24px 20px;
    margin: 20px 0;
  }
  .pg-code-label {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    font-weight: 600;
  }
  .pg-code-value {
    font-size: 34px;
    font-weight: 800;
    color: #e94560;
    letter-spacing: 8px;
    margin-bottom: 16px;
  }
  .pg-copy-btn {
    background: rgba(255,255,255,0.1);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 10px;
    padding: 9px 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .pg-warning-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 24px;
    font-size: 13px;
    color: #92400e;
    text-align: left;
    line-height: 1.6;
  }

  /* ── Desktop: sidebar layout ── */
  @media (min-width: 769px) {
    .pg-signup-root {
      flex-direction: row;
      background: #fff;
    }
    .pg-hero {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px;
      border-radius: 0;
    }
    .pg-hero-inner {
      max-width: 440px;
    }
    .pg-hero-title { font-size: 42px; margin-bottom: 20px; }
    .pg-hero-brand { font-size: 20px; margin-bottom: 40px; }
    .pg-hero-sub {
      color: rgba(255,255,255,0.6);
      font-size: 16px;
      line-height: 1.7;
      margin-bottom: 40px;
    }
    .pg-hero-stats {
      border-radius: 16px;
    }
    .pg-stat { padding: 16px; }
    .pg-stat-num { font-size: 22px; }
    .pg-stat-label { font-size: 11px; }
    .pg-card-wrap {
      width: 480px;
      flex-shrink: 0;
      background: #f8f9ff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      overflow-y: auto;
    }
    .pg-card {
      border-radius: 20px;
      margin-top: 0;
      box-shadow: 0 8px 40px rgba(0,0,0,0.08);
      width: 100%;
      max-width: 400px;
      padding: 36px 32px 40px;
    }
  }
`;

export default function Signup() {
  const [step, setStep]           = useState(1);
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [confirmResult, setConfirmResult] = useState(null);
  const [resendTimer, setResendTimer]     = useState(0);

  const [ownerName, setOwnerName] = useState('');
  const [pgName, setPgName]       = useState('');
  const [city, setCity]           = useState('');
  const [pgState, setPgState]     = useState('');
  const [email, setEmail]         = useState('');

  const [password, setPassword]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pgCode, setPgCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const otpRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      });
    }
  };

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) return setError('Enter a valid 10-digit mobile number.');
    setLoading(true);
    try {
      setupRecaptcha();
      const formatted = `+91${phone.replace(/\D/g, '')}`;
      const result    = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmResult(result);
      setStep(2);
      setResendTimer(30);
      setSuccess('OTP sent to +91 ' + phone);
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP. Check number and try again.');
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const handleVerifyOTP = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit OTP.');
    setLoading(true);
    try {
      await confirmResult.confirm(code);
      setStep(3);
      setSuccess('✅ Phone verified!');
    } catch {
      setError('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleDetailsNext = () => {
    setError('');
    if (!ownerName.trim()) return setError('Please enter your full name.');
    if (!pgName.trim())    return setError('Please enter your PG name.');
    if (!city.trim())      return setError('Please enter your city.');
    if (!pgState.trim())   return setError('Please enter your state.');
    setStep(4);
  };

  const handleCreateAccount = async () => {
    setError('');
    if (!password)                return setError('Please enter a password.');
    if (password.length < 6)      return setError('Password must be at least 6 characters.');
    if (password !== confirmPass)  return setError('Passwords do not match!');
    setLoading(true);
    try {
      const user  = auth.currentUser;
      const code  = await createUniquePGCode(pgName);
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await setDoc(doc(db, 'pgOwners', user.uid), {
        ownerName, pgName, city, state: pgState,
        email: email || '', phone, pgCode: code,
        plan: 'trial', isActive: true,
        trialEnd: trialEnd.toISOString().split('T')[0],
        createdAt: new Date(),
        features: { electricity: true, payments: true, rooms: true, tenants: true, reports: true },
        limits: { maxTenants: 50, maxRooms: 20, maxReportsPerMonth: 5 },
      });

      const { updatePassword } = await import('firebase/auth');
      await updatePassword(user, password);
      setPgCode(code);
      setStep(5);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pgCode);
    setSuccess('✅ PG Code copied!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const stepLabels = ['Phone', 'Verify', 'Details', 'Password'];

  const strengthWidth = password.length >= 10 ? '100%' : password.length >= 6 ? '60%' : '30%';
  const strengthColor = password.length >= 10 ? '#059669' : password.length >= 6 ? '#d97706' : '#dc2626';
  const strengthText  = password.length >= 10 ? '💪 Strong' : password.length >= 6 ? '⚠️ Medium' : '❌ Weak';

  return (
    <>
      <style>{css}</style>
      <div className="pg-signup-root">
        <div id="recaptcha-container" />

        {/* ── Hero ── */}
        <div className="pg-hero">
          <div className="pg-hero-inner">
            <div className="pg-hero-brand">🏠 PG Manager</div>
            <h1 className="pg-hero-title">Start managing<br />smarter today</h1>
            {/* desktop only sub */}
            <p className="pg-hero-sub" style={{ display: 'none' }}>
              Join hundreds of PG owners who save time and earn more.
            </p>
            <div className="pg-hero-stats">
              {[['500+','PG Owners'],['10,000+','Tenants'],['₹1Cr+','Collected']].map(([num, label]) => (
                <div key={label} className="pg-stat">
                  <div className="pg-stat-num">{num}</div>
                  <div className="pg-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Card (desktop: wrapped in .pg-card-wrap) ── */}
        <div className="pg-card-wrap">
          <div className="pg-card">

            {/* Step indicator */}
            {step < 5 && (
              <div className="pg-steps">
                {stepLabels.map((label, i) => {
                  const num    = i + 1;
                  const status = step === num ? 'active' : step > num ? 'done' : 'pending';
                  return (
                    <React.Fragment key={label}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div className={`pg-step-dot ${status}`}>
                          {status === 'done' ? '✓' : num}
                        </div>
                        <span className={`pg-step-label ${status}`}>{label}</span>
                      </div>
                      {i < 3 && (
                        <div className={`pg-step-line ${step > num ? 'done' : 'pending'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {error   && <div className="pg-error">{error}</div>}
            {success && <div className="pg-success">{success}</div>}

            {/* ── Step 1: Phone ── */}
            {step === 1 && (
              <>
                <h2 className="pg-form-title">Enter your mobile</h2>
                <p className="pg-form-sub">We'll send an OTP to verify your number</p>
                <div className="pg-field">
                  <label className="pg-label">Mobile Number</label>
                  <div className="pg-input-prefix">
                    <div className="pg-prefix-box">+91</div>
                    <input
                      className="pg-input"
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                    />
                  </div>
                </div>
                <button className="pg-btn" onClick={handleSendOTP} disabled={loading}>
                  {loading ? 'Sending OTP…' : <>Send OTP <span>→</span></>}
                </button>
                <p className="pg-switch">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <>
                <h2 className="pg-form-title">Verify OTP</h2>
                <p className="pg-form-sub">6-digit code sent to +91 {phone}</p>
                <div className="pg-otp-row">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      className={`pg-otp-box${digit ? ' filled' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>
                <button className="pg-btn" onClick={handleVerifyOTP} disabled={loading}>
                  {loading ? 'Verifying…' : <>Verify OTP <span>→</span></>}
                </button>
                <div className="pg-resend">
                  {resendTimer > 0 ? (
                    <span>Resend in <strong style={{ color: '#e94560' }}>{resendTimer}s</strong></span>
                  ) : (
                    <span>
                      Didn't receive?{' '}
                      <span className="pg-resend-link" onClick={() => { setStep(1); setOtp(['','','','','','']); }}>
                        Resend OTP
                      </span>
                    </span>
                  )}
                </div>
                <p className="pg-change-num" onClick={() => { setStep(1); setOtp(['','','','','','']); }}>
                  ← Change number
                </p>
              </>
            )}

            {/* ── Step 3: Details ── */}
            {step === 3 && (
              <>
                <h2 className="pg-form-title">Your PG Details</h2>
                <p className="pg-form-sub">Tell us about your property</p>
                {[
                  { label: 'Owner Full Name *',  val: ownerName, set: setOwnerName, ph: 'John Doe',       type: 'text'  },
                  { label: 'PG / Hostel Name *', val: pgName,    set: setPgName,    ph: 'Sunrise PG',     type: 'text'  },
                  { label: 'City *',             val: city,       set: setCity,      ph: 'Chennai',        type: 'text'  },
                  { label: 'State *',            val: pgState,    set: setPgState,   ph: 'Tamil Nadu',     type: 'text'  },
                  { label: 'Email (optional)',   val: email,      set: setEmail,     ph: 'you@email.com',  type: 'email' },
                ].map(({ label, val, set, ph, type }) => (
                  <div key={label} className="pg-field">
                    <label className="pg-label">{label}</label>
                    <input className="pg-input" type={type} placeholder={ph}
                      value={val} onChange={e => set(e.target.value)} />
                  </div>
                ))}
                <button className="pg-btn" onClick={handleDetailsNext} disabled={loading}>
                  Continue →
                </button>
              </>
            )}

            {/* ── Step 4: Password ── */}
            {step === 4 && (
              <>
                <h2 className="pg-form-title">Create Password</h2>
                <p className="pg-form-sub">Set a strong password for your account</p>
                <div className="pg-field">
                  <label className="pg-label">Password *</label>
                  <div className="pg-pass-wrap">
                    <input className="pg-input" style={{ paddingRight: '48px' }}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)} />
                    <span className="pg-eye" onClick={() => setShowPass(!showPass)}>
                      {showPass ? '🙈' : '👁️'}
                    </span>
                  </div>
                </div>
                <div className="pg-field">
                  <label className="pg-label">Confirm Password *</label>
                  <div className="pg-pass-wrap">
                    <input className="pg-input" style={{ paddingRight: '48px' }}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)} />
                    <span className="pg-eye" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? '🙈' : '👁️'}
                    </span>
                  </div>
                </div>
                {password && (
                  <div className="pg-field">
                    <div className="pg-strength-bar">
                      <div className="pg-strength-fill" style={{ width: strengthWidth, background: strengthColor }} />
                    </div>
                    <div className="pg-strength-label">{strengthText}</div>
                  </div>
                )}
                <div className="pg-btn-row">
                  <button className="pg-btn-back" onClick={() => setStep(3)}>←</button>
                  <button className="pg-btn" onClick={handleCreateAccount} disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Creating Account…' : 'Create Account →'}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 5: Success ── */}
            {step === 5 && (
              <div className="pg-success-step">
                <div style={{ fontSize: '60px', marginBottom: '12px' }}>🎉</div>
                <h2 className="pg-form-title" style={{ textAlign: 'center' }}>Account Created!</h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 4px' }}>
                  Welcome, <strong>{ownerName}</strong>! Your PG code:
                </p>
                <div className="pg-code-card">
                  <div className="pg-code-label">Your PG Code</div>
                  <div className="pg-code-value">{pgCode}</div>
                  <button className="pg-copy-btn" onClick={copyCode}>📋 Copy Code</button>
                </div>
                {success && <div className="pg-success">{success}</div>}
                <div className="pg-warning-box">
                  ⚠️ <strong>Save this code!</strong> You'll need it every time you login.
                  Screenshot it or write it down safely.
                </div>
                <button className="pg-btn" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard →
                </button>
              </div>
            )}

          </div>
        </div>{/* /pg-card-wrap */}
      </div>
    </>
  );
}