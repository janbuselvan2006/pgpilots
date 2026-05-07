import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup, PhoneAuthProvider, linkWithCredential, EmailAuthProvider, updatePassword, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const OTP_SEND_LIMIT  = 3;
const OTP_FAIL_LIMIT  = 5;
const PASS_FAIL_LIMIT = 5;
const RATE_WINDOW_MS  = 30 * 60 * 1000;

// ─────────────────────────────────────────────
// Firestore rate-limit helpers
// ─────────────────────────────────────────────
const rlRef = (phone) => doc(db, 'signupRateLimits', `+91${phone.replace(/\D/g, '')}`);

const getRLData = async (phone) => {
  const ref  = rlRef(phone);
  const snap = await getDoc(ref);
  return { ref, data: snap.exists() ? snap.data() : null };
};

// ✅ merge:true prevents race condition on first attempt
const ensureRLDoc = async (phone) => {
  const ref  = rlRef(phone);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const defaults = {
      otpSendCount:  0,
      otpFailCount:  0,
      passFailCount: 0,
      windowStart:   Date.now(),
      adminBlocked:  false,
    };
    await setDoc(ref, defaults, { merge: true });
    return { ref, data: defaults };
  }
  return { ref, data: snap.data() };
};

const maybeResetWindow = async (ref, data) => {
  if (Date.now() - (data.windowStart || 0) > RATE_WINDOW_MS) {
    const reset = {
      otpSendCount:  0,
      otpFailCount:  0,
      passFailCount: 0,
      windowStart:   Date.now(),
    };
    await updateDoc(ref, reset);
    return { ...data, ...reset };
  }
  return data;
};

const phoneIndexRef = (phone) => doc(db, 'phoneIndex', `+91${phone.replace(/\D/g, '')}`);
const emailIndexRef = (email) => doc(db, 'emailIndex', (email || '').trim().toLowerCase());
const pgCodeIndexRef = (code) => doc(db, 'pgCodeIndex', (code || '').trim().toUpperCase());

const isPhoneRegistered = async (phone) => {
  const snap = await getDoc(phoneIndexRef(phone));
  return snap.exists();
};

const isEmailRegistered = async (email) => {
  const snap = await getDoc(emailIndexRef(email));
  return snap.exists();
};
const isPGCodeUnique = async (code) => {
  const snap = await getDoc(pgCodeIndexRef(code));
  return !snap.exists();
};

const checkOtpSendAllowed = async (phone) => {
  let { ref, data } = await ensureRLDoc(phone);
  data = await maybeResetWindow(ref, data);
  if (data.adminBlocked) return { allowed: false, reason: 'admin_blocked' };
  if ((data.otpSendCount || 0) >= OTP_SEND_LIMIT) {
    const waitSec = Math.ceil((RATE_WINDOW_MS - (Date.now() - data.windowStart)) / 1000);
    return { allowed: false, reason: 'rate_limited', waitSec };
  }
  await updateDoc(ref, { otpSendCount: increment(1) });
  return { allowed: true };
};

const recordOtpFail = async (phone) => {
  let { ref, data } = await ensureRLDoc(phone);
  data = await maybeResetWindow(ref, data);
  const newCount = (data.otpFailCount || 0) + 1;
  const updates  = { otpFailCount: increment(1) };
  if (newCount >= OTP_FAIL_LIMIT) updates.adminBlocked = true;
  await updateDoc(ref, updates);
  if (newCount >= OTP_FAIL_LIMIT) return { blocked: true };
  return { blocked: false, remaining: OTP_FAIL_LIMIT - newCount };
};

const recordPassFail = async (phone) => {
  let { ref, data } = await ensureRLDoc(phone);
  data = await maybeResetWindow(ref, data);
  const newCount = (data.passFailCount || 0) + 1;
  const updates  = { passFailCount: increment(1) };
  if (newCount >= PASS_FAIL_LIMIT) updates.adminBlocked = true;
  await updateDoc(ref, updates);
  if (newCount >= PASS_FAIL_LIMIT) return { blocked: true };
  return { blocked: false, remaining: PASS_FAIL_LIMIT - newCount };
};

const isAdminBlocked = async (phone) => {
  const { data } = await getRLData(phone);
  return data?.adminBlocked === true;
};

// ─────────────────────────────────────────────
// PG Code helpers
// ─────────────────────────────────────────────
const generatePGCode = (pgName) => {
  const letters = pgName.replace(/\s+/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  const digits  = Math.floor(100 + Math.random() * 900);
  return `${letters}${digits}`;
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
// Password validator
// ─────────────────────────────────────────────
const PW_RULES = [
  { id: 'len', test: /.{8,}/,        label: 'At least 8 characters'          },
  { id: 'up',  test: /[A-Z]/,        label: 'One uppercase letter (A–Z)'      },
  { id: 'low', test: /[a-z]/,        label: 'One lowercase letter (a–z)'      },
  { id: 'num', test: /[0-9]/,        label: 'One number (0–9)'                },
  { id: 'sym', test: /[^A-Za-z0-9]/, label: 'One special character (!@#$...)' },
];
const checkRules = (pw) => PW_RULES.map(r => ({ ...r, passed: r.test.test(pw) }));
const isStrongPw = (pw) => PW_RULES.every(r => r.test.test(pw));

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body.pg-signup-font, body.pg-signup-font * { font-family: 'Plus Jakarta Sans', sans-serif !important; }

  .pg-signup-root {
    min-height: 100dvh; font-family: 'Plus Jakarta Sans', sans-serif;
    background: #fff; display: flex; flex-direction: column;
  }
  /* ── TOP BAR ── */
  .pg-topbar {
    height: 64px; display: flex; align-items: center;
    justify-content: space-between; padding: 0 28px;
    border-bottom: 1px solid #e8edf5; background: #fff;
    position: sticky; top: 0; z-index: 100;
  }
  .pg-brand { display: flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 800; color: #e94560; }
  .pg-trust { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; font-weight: 600; }
  .pg-main  { flex: 1; display: flex; flex-direction: column; }

  /* ── LEFT HERO ── */
  .pg-hero { background: #fff; padding: 32px 24px 28px; position: relative; overflow: hidden; }
  .pg-hero-inner { position: relative; z-index: 1; }
  .pg-hero-title { font-size: clamp(28px,6vw,48px); font-weight: 800; color: #0f172a; line-height: 1.1; margin-bottom: 14px; letter-spacing: -1px; }
  .pg-hero-title em { color: #e94560; font-style: normal; }
  .pg-hero-sub { color: #64748b; font-size: 15px; line-height: 1.65; margin-bottom: 28px; }

  .pg-features { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
  .pg-feature-item { display: flex; align-items: flex-start; gap: 14px; }
  .pg-feature-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
  .pg-feature-icon.red   { background: #fff1f3; }
  .pg-feature-icon.green { background: #f0fdf4; }
  .pg-feature-icon.blue  { background: #eff6ff; }
  .pg-feature-icon.amber { background: #fffbeb; }
  .pg-feature-text h4 { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .pg-feature-text p  { font-size: 12px; color: #64748b; line-height: 1.45; }

  .pg-building-wrap { position: relative; margin-bottom: 20px; border-radius: 20px; overflow: hidden; background: linear-gradient(135deg,#1e3a5f,#0f2744); height: 180px; display: flex; align-items: flex-end; }
  .pg-building-badge { position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 8px 14px; font-size: 12px; font-weight: 800; color: #0f172a; box-shadow: 0 4px 16px rgba(0,0,0,0.12); text-align: center; line-height: 1.3; }
  .pg-building-badge span { color: #e94560; display: block; font-size: 18px; }
  .pg-collected-card { position: absolute; bottom: 14px; left: 14px; right: 14px; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
  .pg-collected-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .pg-collected-val   { font-size: 20px; font-weight: 800; color: #0f172a; }
  .pg-collected-trend { font-size: 11px; color: #16a34a; font-weight: 700; }

  .pg-reviews { display: flex; align-items: center; gap: 12px; }
  .pg-avatars { display: flex; }
  .pg-avatar { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #fff; margin-left: -8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; flex-shrink: 0; }
  .pg-avatars .pg-avatar:first-child { margin-left: 0; }
  .pg-review-text { flex: 1; }
  .pg-stars { color: #f59e0b; font-size: 13px; letter-spacing: 1px; }
  .pg-review-caption { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }

  /* ── RIGHT FORM PANEL ── */
  .pg-card-wrap { background: #f8fafc; padding: 28px 20px 40px; display: flex; flex-direction: column; align-items: center; }
  .pg-card { background: #fff; border-radius: 20px; width: 100%; max-width: 400px; padding: 28px 24px 32px; box-shadow: 0 8px 32px rgba(2,6,23,0.1); }

  /* ── STEP INDICATORS ── */
  .pg-steps { display: flex; align-items: center; margin-bottom: 28px; }
  .pg-step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; transition: background 0.3s, color 0.3s; }
  .pg-step-dot.active  { background: #e94560; color: #fff; }
  .pg-step-dot.done    { background: #059669; color: #fff; }
  .pg-step-dot.pending { background: #edf2f7; color: #aaa; }
  .pg-step-label { font-size: 9px; font-weight: 600; margin-top: 4px; text-align: center; }
  .pg-step-label.active  { color: #e94560; }
  .pg-step-label.done    { color: #059669; }
  .pg-step-label.pending { color: #cbd5e0; }
  .pg-step-line { flex: 1; height: 2px; margin-bottom: 16px; transition: background 0.3s; }
  .pg-step-line.done    { background: #059669; }
  .pg-step-line.pending { background: #edf2f7; }

  .pg-error   { background:#fff5f5; color:#c53030; border:1px solid #fed7d7; border-radius:10px; padding:11px 14px; font-size:13px; margin-bottom:16px; font-weight:500; }
  .pg-success { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; border-radius:10px; padding:11px 14px; font-size:13px; margin-bottom:16px; font-weight:600; }

  .pg-form-title { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
  .pg-form-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 22px; line-height: 1.5; }
  .pg-field      { margin-bottom: 14px; }
  .pg-label      { display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.4px; }
  .pg-input { width:100%; padding:13px 16px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:15px; font-family:inherit; color:#0f172a; background:#fafbff; outline:none; transition:border-color 0.2s,box-shadow 0.2s; -webkit-appearance:none; }
  .pg-input:focus { border-color:#e94560; box-shadow:0 0 0 3px rgba(233,69,96,0.1); background:#fff; }
  .pg-input-prefix { display:flex; gap:8px; }
  .pg-prefix-box { width:72px; flex-shrink:0; padding:13px 0; border:1.5px solid #e2e8f0; border-radius:12px; font-size:15px; font-weight:700; color:#475569; background:#f8fafc; text-align:center; display:flex; align-items:center; justify-content:center; }

  .pg-pass-wrap { position:relative; }
  .pg-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:18px; user-select:none; -webkit-tap-highlight-color:transparent; }

  .pg-pw-rules { background:#f8faff; border:1.5px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:14px; }
  .pg-pw-rule  { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; padding:3px 0; transition:color 0.2s; }
  .pg-pw-rule.pass { color:#059669; }
  .pg-pw-rule.fail { color:#94a3b8; }
  .pg-pw-icon { font-size:13px; width:16px; text-align:center; }

  .pg-otp-row { display:flex; gap:8px; justify-content:center; margin:20px 0 24px; }
  .pg-otp-box { width:44px; height:52px; text-align:center; font-size:22px; font-weight:800; border-radius:12px; border:2px solid #e2e8f0; background:#fafbff; outline:none; color:#0f172a; transition:border-color 0.2s; -webkit-appearance:none; font-family:inherit; }
  .pg-otp-box:focus  { border-color:#e94560; background:#fff; }
  .pg-otp-box.filled { border-color:#e94560; }
  .pg-fail-warn { font-size:12px; color:#d97706; font-weight:600; text-align:center; margin-top:8px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; }

  .pg-btn { width:100%; padding:15px; background:linear-gradient(135deg,#e94560 0%,#c1253f 100%); color:#fff; border:none; border-radius:14px; font-size:15px; font-weight:700; font-family:inherit; cursor:pointer; box-shadow:0 4px 14px rgba(233,69,96,0.35); -webkit-tap-highlight-color:transparent; transition:opacity 0.2s,transform 0.1s; display:flex; align-items:center; justify-content:center; gap:6px; }
  .pg-btn:active   { transform:scale(0.98); opacity:0.92; }
  .pg-btn:disabled { opacity:0.6; cursor:not-allowed; }
  .pg-btn-back { width:48px; flex-shrink:0; padding:15px 0; background:#f1f5f9; color:#64748b; border:none; border-radius:14px; font-size:18px; font-family:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:background 0.2s; }
  .pg-btn-row { display:flex; gap:10px; }

  .pg-resend      { text-align:center; margin-top:16px; font-size:13px; color:#94a3b8; }
  .pg-resend-link { color:#e94560; font-weight:700; cursor:pointer; }
  .pg-change-num  { text-align:center; margin-top:10px; font-size:12px; color:#94a3b8; cursor:pointer; }

  .pg-terms-row { display:flex; align-items:flex-start; gap:10px; margin:14px 0 18px; padding:14px; background:#f8faff; border:1.5px solid #e2e8f0; border-radius:12px; cursor:pointer; transition:border-color 0.2s,background 0.2s; }
  .pg-terms-row.checked { border-color:#059669; background:#f0fdf4; }
  .pg-terms-checkbox { width:20px; height:20px; border-radius:6px; border:2px solid #cbd5e0; background:white; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; transition:all 0.2s; }
  .pg-terms-checkbox.checked { background:#059669; border-color:#059669; }
  .pg-terms-text { font-size:12px; color:#475569; line-height:1.6; font-weight:500; }
  .pg-terms-link { color:#e94560; font-weight:700; text-decoration:none; }
  .pg-terms-link:hover { text-decoration:underline; }

  .pg-switch { text-align:center; margin-top:20px; font-size:13px; color:#94a3b8; }
  .pg-switch a { color:#e94560; font-weight:700; text-decoration:none; }

  .pg-success-step { text-align:center; }
  .pg-code-card { background:linear-gradient(135deg,#1a1a2e,#0f3460); border-radius:18px; padding:24px 20px; margin:20px 0; }
  .pg-code-label { font-size:11px; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:10px; font-weight:600; }
  .pg-code-value { font-size:34px; font-weight:800; color:#e94560; letter-spacing:8px; margin-bottom:16px; }
  .pg-copy-btn { background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:9px 20px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  .pg-warning-box { background:#fffbeb; border:1px solid #fde68a; border-radius:14px; padding:14px; margin-bottom:24px; font-size:13px; color:#92400e; text-align:left; line-height:1.6; }

  .pg-bottom-strip { background:#0f172a; color:#94a3b8; padding:14px 24px; display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  .pg-bottom-item { font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; }

  /* ── DESKTOP ── */
  @media (min-width: 769px) {
    .pg-topbar { padding:0 48px; height:72px; }
    .pg-main { flex-direction:row; flex:1; }
    .pg-hero { flex:1.2; display:flex; align-items:center; justify-content:center; padding:60px 56px; border-right:1px solid #e8edf5; min-height:0; }
    .pg-hero-inner { max-width:460px; width:100%; }
    .pg-hero-title { font-size:44px; margin-bottom:16px; }
    .pg-hero-sub { font-size:16px; margin-bottom:32px; }
    .pg-features { gap:16px; margin-bottom:32px; }
    .pg-building-wrap { height:220px; margin-bottom:24px; }
    .pg-card-wrap { width:480px; flex-shrink:0; background:linear-gradient(160deg,#1a2540 0%,#0f172a 100%); display:flex; align-items:center; justify-content:center; padding:48px 40px; overflow-y:auto; }
    .pg-card { border-radius:24px; box-shadow:0 24px 64px rgba(0,0,0,0.4); width:100%; max-width:380px; padding:36px 32px 40px; margin-top:0; }
    .pg-bottom-strip { grid-template-columns:repeat(4,1fr); padding:16px 48px; gap:20px; }
    .pg-bottom-item { font-size:13px; }
  }
`;

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Signup() {
  const [step, setStep]                   = useState(1);
  const [isGoogleAuth, setIsGoogleAuth]   = useState(false);
  const [phone, setPhone]                 = useState('');
  const [phoneBlocked, setPhoneBlocked]   = useState(false);
  const [otp, setOtp]                     = useState(['', '', '', '', '', '']);
  const [confirmResult, setConfirmResult] = useState(null);
  const [resendTimer, setResendTimer]     = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [ownerName, setOwnerName] = useState('');
  const [pgName, setPgName]       = useState('');
  const [city, setCity]           = useState('');
  const [pgState, setPgState]     = useState('');
  const [email, setEmail]         = useState('');

  const [password, setPassword]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwFocused, setPwFocused]     = useState(false);

  const [pgCode, setPgCode]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [failWarn, setFailWarn] = useState('');

  const otpRefs  = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('pg-signup-font');
    return () => document.body.classList.remove('pg-signup-font');
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible', callback: () => {},
      });
    }
  };

  // ── Step 1: Send OTP
  const handleSendOTP = async () => {
    setError(''); setSuccess(''); setFailWarn('');

    if (phoneBlocked) {
      setError('🚫 This number is already registered. Please sign in instead.');
      return;
    }
    if (!phone || phone.length < 10) return setError('Enter a valid 10-digit mobile number.');
    if (!agreedToTerms) return setError('Please agree to the Terms & Conditions and Privacy Policy.');

    setLoading(true);
    try {
      const alreadyExists = await isPhoneRegistered(phone);
      if (alreadyExists) {
        setPhoneBlocked(true);
        setError('🚫 This number is already registered. Please sign in instead.');
        setLoading(false);
        return;
      }

      const rl = await checkOtpSendAllowed(phone);
      if (!rl.allowed) {
        if (rl.reason === 'admin_blocked') {
          setError('🔒 Your account has been blocked due to suspicious activity. Please contact support.');
        } else {
          const mins = Math.ceil(rl.waitSec / 60);
          setError(`⏳ Too many OTP requests. Please wait ${mins} minute${mins > 1 ? 's' : ''} before trying again.`);
        }
        setLoading(false);
        return;
      }

      setupRecaptcha();
      const formatted = `+91${phone.replace(/\D/g, '')}`;
      const result    = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmResult(result);
      setStep(2);
      setResendTimer(30);
      setSuccess('OTP sent to +91 ' + phone);
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP. Check the number and try again or Contact our support team at support@pgpilots.in');
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  // Handle redirect result on mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          const userEmail = result.user.email;
          const exists = await isEmailRegistered(userEmail);
          if (exists) {
            await auth.signOut();
            setError('An account with this email already exists. Please sign in instead.');
          } else {
            setEmail(userEmail || '');
            setOwnerName(result.user.displayName || '');
            setIsGoogleAuth(true);
            sessionStorage.setItem('signingUp', 'true');
            setStep(3); // Land on details page as requested
            setSuccess('Google account linked! Please fill in your PG details below.');
          }
          setLoading(false);
        }
        sessionStorage.removeItem('authInProgress');
      } catch (err) {
        sessionStorage.removeItem('authInProgress');
        console.error("Redirect check error:", err);
      }
    };
    if (sessionStorage.getItem('authInProgress') === 'true') {
      checkRedirect();
    }
  }, []);

  const handleGoogleSignup = async () => {
    setError(''); setSuccess(''); setFailWarn('');
    if (!agreedToTerms) {
      return setError('Please agree to the Terms & Conditions and Privacy Policy first.');
    }
    setLoading(true);
    // Set flag so App.js PublicRoute doesn't redirect before our check
    sessionStorage.setItem('authInProgress', 'true');
    try {
      const provider = new GoogleAuthProvider();
      // Use signInWithRedirect to avoid Cross-Origin-Opener-Policy (COOP) errors
      await signInWithRedirect(auth, provider);
    } catch (err) {
      sessionStorage.removeItem('authInProgress');
      console.error(err);
      setError('Google Sign-Up failed to start.');
      setLoading(false);
    }
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

  // ── Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    setError(''); setSuccess(''); setFailWarn('');
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit OTP.');

    if (await isAdminBlocked(phone)) {
      setError('🔒 This number has been blocked due to too many failed attempts. Contact support.');
      return;
    }

    setLoading(true);
    try {
      // ✅ Set flag BEFORE confirming so PublicRoute doesn't redirect mid-signup
      sessionStorage.setItem('signingUp', 'true');
      
      if (isGoogleAuth) {
        // We are already signed in with Google. Link the phone instead of signing in again with phone (which switches UID).
        const credential = PhoneAuthProvider.credential(confirmResult.verificationId, code);
        await linkWithCredential(auth.currentUser, credential);
      } else {
        await confirmResult.confirm(code);
      }
      
      setStep(3);
      setSuccess('✅ Phone verified!');
    } catch (err) {
      console.error("OTP Verification Error:", err);
      // ✅ Clean up flag on OTP failure
      sessionStorage.removeItem('signingUp');
      const result = await recordOtpFail(phone);
      if (result.blocked) {
        setError('🔒 Too many wrong OTP attempts. Your number has been blocked. Contact admin to unblock.');
      } else {
        setError(`❌ Invalid OTP. ${result.remaining} attempt${result.remaining !== 1 ? 's' : ''} remaining before block.`);
        setFailWarn(`⚠️ ${result.remaining} attempt${result.remaining !== 1 ? 's' : ''} left before your number gets blocked.`);
      }
    }
    setLoading(false);
  };

  // ── Step 3: Details
  const handleDetailsNext = async () => {
    setError('');
    const cleanPhone = phone.replace(/\D/g, '');
    if (!ownerName.trim()) return setError('Please enter your full name.');
    if (!pgName.trim())    return setError('Please enter your PG name.');
    if (!city.trim())      return setError('Please enter your city.');
    if (!pgState.trim())   return setError('Please enter your state.');
    if (!email.trim())     return setError('Please enter your email.');
    if (!cleanPhone || cleanPhone.length < 10) return setError('Please enter a valid 10-digit mobile number.');

    setLoading(true);
    // ✅ Check for duplicate mobile number / email using public-safe indexes
    if (await isPhoneRegistered(cleanPhone)) {
      setLoading(false);
      return setError('This mobile number is already registered.');
    }
    if (await isEmailRegistered(email.trim())) {
      setLoading(false);
      return setError('This email is already registered.');
    }
    setLoading(false);
    
    // Always go to step 4 next for password creation
    setStep(4);
  };

  // ── Step 4: Create Account
  const handleCreateAccount = async () => {
    setError(''); setFailWarn('');
    if (!password)             return setError('Please enter a password.');
    if (!isStrongPw(password)) return setError('Password does not meet requirements.');
    if (password !== confirmPass) return setError('Passwords do not match!');

    if (await isAdminBlocked(phone)) {
      setError('🔒 This account has been blocked.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const code = await createUniquePGCode(pgName);
      const resolvedEmail = email.trim();
      const cleanPhone = phone.replace(/\D/g, '');

      // 1. Save to Firestore
      await setDoc(doc(db, 'pgOwners', user.uid), {
        ownerName,
        pgName,
        city,
        state: pgState,
        email: resolvedEmail,
        phone: cleanPhone,
        pgCode: code,
        isActive: true,
        createdAt: new Date(),
        billing_mode: 'usage',
        current_beds: 0,
        max_beds_this_month: 0,
      });

      // Create public-safe indexes for signup checks + login resolution
      await setDoc(phoneIndexRef(cleanPhone), {
        ownerId: user.uid,
        loginEmail: resolvedEmail,
        createdAt: serverTimestamp(),
      });
      await setDoc(emailIndexRef(resolvedEmail), {
        ownerId: user.uid,
        loginEmail: resolvedEmail,
        createdAt: serverTimestamp(),
      });
      await setDoc(pgCodeIndexRef(code), {
        ownerId: user.uid,
        loginEmail: resolvedEmail,
        createdAt: serverTimestamp(),
      });

      // 2. Link email+password so all login methods work for the same UID
      const emailCredential = EmailAuthProvider.credential(resolvedEmail, password);
      try {
        await linkWithCredential(user, emailCredential);
      } catch (linkErr) {
        if (linkErr.code === 'auth/provider-already-linked') {
          await updatePassword(user, password);
        } else if (linkErr.code === 'auth/email-already-in-use') {
          // This happens if the user existed in Auth but not in pgOwners (was deleted or something)
          // Since we already checked Snap.empty in GoogleSignup, this is a fallback.
          await updatePassword(user, password);
        } else {
          console.warn("Credential link error (non-critical):", linkErr);
        }
      }

      sessionStorage.removeItem('signingUp');
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

  // ✅ Clean up flag when user goes back to step 1
  const resetToStep1 = () => {
    sessionStorage.removeItem('signingUp');
    setIsGoogleAuth(false);
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setFailWarn('');
  };

  const stepLabels = ['Phone', 'Verify', 'Details', 'Password'];
  const pwRules    = checkRules(password);

  const features = [
    { icon: '🏠', color: 'red',   title: 'Easy PG Management',       desc: 'Add rooms, tenants and manage everything from one dashboard.' },
    { icon: '₹',  color: 'green', title: 'Automated Rent Collection', desc: 'Collect rent on time and track payments without any hassle.' },
    { icon: '📊', color: 'blue',  title: 'Reports & Analytics',       desc: 'Get insights and reports to make better decisions every day.' },
    { icon: '🎧', color: 'amber', title: '24/7 Support',              desc: 'We are always here to help you whenever you need.' },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="pg-signup-root">
        <div id="recaptcha-container" />

        {/* Top Bar */}
        <div className="pg-topbar">
          <div className="pg-brand">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <path d="M7 15L7 27C7 28.1 7.9 29 9 29H13V22C13 20.9 13.9 20 15 20H17C18.1 20 19 20.9 19 22V29H23C24.1 29 25 28.1 25 27V15L16 8Z" fill="#e94560"/>
              <rect x="2" y="14" width="18" height="4" rx="2" fill="#e94560" transform="rotate(-40 2 14)"/>
              <rect x="16" y="3" width="18" height="4" rx="2" fill="#e94560" transform="rotate(40 16 3)"/>
            </svg>
            PGpilots
          </div>
          <div className="pg-trust">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Trusted by 10,000+ PG Owners
          </div>
        </div>

        <div className="pg-main">
          {/* Left Hero Panel */}
          <div className="pg-hero">
            <div className="pg-hero-inner">
              <h1 className="pg-hero-title">Manage Your PG.<br/>Grow Your <em>Income.</em></h1>
              <p className="pg-hero-sub">All-in-one platform to manage rooms, tenants, payments and maintenance – easily and efficiently.</p>

              <div className="pg-features">
                {features.map(f => (
                  <div key={f.title} className="pg-feature-item">
                    <div className={`pg-feature-icon ${f.color}`}>{f.icon}</div>
                    <div className="pg-feature-text">
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Building card */}
              <div className="pg-building-wrap">
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
                <div className="pg-building-badge">
                  <span>500+</span>PG Owners
                </div>
                <div className="pg-collected-card">
                  <div>
                    <div className="pg-collected-label">Total Collected</div>
                    <div className="pg-collected-val">₹1.2 Cr+</div>
                  </div>
                  <div className="pg-collected-trend">↑ 24% ↗</div>
                </div>
              </div>

              {/* Reviews */}
              <div className="pg-reviews">
                <div className="pg-avatars">
                  {[['R','#e94560'],['S','#6366f1'],['A','#f59e0b'],['M','#10b981']].map(([l,c]) => (
                    <div key={l} className="pg-avatar" style={{ background: c }}>{l}</div>
                  ))}
                </div>
                <div className="pg-review-text">
                  <div className="pg-stars">★★★★★</div>
                  <div className="pg-review-caption">4.8/5 from 1000+ reviews · PG owners love PGpilots</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="pg-card-wrap">
            <div className="pg-card">

              {step < 5 && (
                <div className="pg-steps">
                  {stepLabels.map((label, i) => {
                    const num    = i + 1;
                    const status = step === num ? 'active' : step > num ? 'done' : 'pending';
                    return (
                      <React.Fragment key={label}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <div className={`pg-step-dot ${status}`}>{status === 'done' ? '✓' : num}</div>
                          <span className={`pg-step-label ${status}`}>{label}</span>
                        </div>
                        {i < 3 && <div className={`pg-step-line ${step > num ? 'done' : 'pending'}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {error   && <div className="pg-error">{error}</div>}
              {success && !error && <div className="pg-success">{success}</div>}

              {/* Step 1: Phone */}
              {step === 1 && (
                <>
                  <h2 className="pg-form-title">Enter your mobile number</h2>
                  <p className="pg-form-sub">We'll send an OTP to verify your number</p>
                  <div className="pg-field">
                    <label className="pg-label">Mobile Number</label>
                    <div className="pg-input-prefix">
                      <div className="pg-prefix-box">+91</div>
                      <input className="pg-input" type="tel" inputMode="numeric"
                        placeholder="98765 43210" maxLength={10} value={phone}
                        onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneBlocked(false); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
                    </div>
                  </div>
                  {!isGoogleAuth && (
                    <div className={`pg-terms-row${agreedToTerms ? ' checked' : ''}`} onClick={() => setAgreedToTerms(!agreedToTerms)}>
                      <div className={`pg-terms-checkbox${agreedToTerms ? ' checked' : ''}`}>
                        {agreedToTerms && <span style={{ color: 'white', fontSize: '13px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                      </div>
                      <div className="pg-terms-text">
                        I agree to the{' '}
                        <a href="/terms-and-conditions.html" target="_blank" rel="noopener noreferrer" className="pg-terms-link" onClick={e => e.stopPropagation()}>Terms &amp; Conditions</a>
                        {' '}and{' '}
                        <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="pg-terms-link" onClick={e => e.stopPropagation()}>Privacy Policy</a>
                        . I confirm I am 18+ and authorized to manage this PG property.
                      </div>
                    </div>
                  )}
                  <button className="pg-btn" onClick={handleSendOTP} disabled={loading || phoneBlocked}>
                    {loading ? 'Checking...' : <>Send OTP &rarr;</>}
                  </button>
                  <p className="pg-switch">
                    Already have an account?{' '}
                    <span style={{ color: '#e94560', fontWeight: '700', cursor: 'pointer' }}
                      onClick={async () => { await auth.signOut(); sessionStorage.removeItem('signingUp'); sessionStorage.removeItem('authInProgress'); navigate('/login'); }}>
                      Sign in
                    </span>
                  </p>
                </>
              )}

              {/* Step 2: OTP */}
              {step === 2 && (
                <>
                  <h2 className="pg-form-title">Verify OTP</h2>
                  <p className="pg-form-sub">6-digit code sent to +91 {phone}</p>
                  <div className="pg-otp-row">
                    {otp.map((digit, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el}
                        className={`pg-otp-box${digit ? ' filled' : ''}`}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)} />
                    ))}
                  </div>
                  {failWarn && <div className="pg-fail-warn">{failWarn}</div>}
                  <button className="pg-btn" onClick={handleVerifyOTP} disabled={loading}>
                    {loading ? 'Verifying…' : <>Verify OTP <span>→</span></>}
                  </button>
                  <div className="pg-resend">
                    {resendTimer > 0
                      ? <span>Resend in <strong style={{ color: '#e94560' }}>{resendTimer}s</strong></span>
                      : <span>Didn't receive? <span className="pg-resend-link" onClick={resetToStep1}>Resend OTP</span></span>}
                  </div>
                  <p className="pg-change-num" onClick={resetToStep1}>← Change number</p>
                </>
              )}

              {/* Step 3: Details */}
              {step === 3 && (
                <>
                  <h2 className="pg-form-title">Your PG Details</h2>
                  <p className="pg-form-sub">Tell us about your property</p>
                  {[
                    { label: 'Owner Full Name *',  val: ownerName, set: setOwnerName, ph: 'Anbuselvan J',  type: 'text'  },
                    { label: 'PG / Hostel Name *', val: pgName,    set: setPgName,    ph: 'Sunrise PG',    type: 'text'  },
                    { label: 'City *',             val: city,      set: setCity,      ph: 'Chennai',       type: 'text'  },
                    { label: 'State *',            val: pgState,   set: setPgState,   ph: 'Tamil Nadu',    type: 'text'  },
                    { label: 'Email *',            val: email,     set: setEmail,     ph: 'you@email.com', type: 'email' },
                  ].map(({ label, val, set, ph, type }) => (
                    <div key={label} className="pg-field">
                      <label className="pg-label">{label}</label>
                      <input className="pg-input" type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} />
                    </div>
                  ))}
                  <div className="pg-field">
                    <label className="pg-label">Mobile Number *</label>
                    <input className="pg-input" type="tel" maxLength={10} placeholder="9876543210"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      readOnly={!isGoogleAuth}
                      style={{ backgroundColor: !isGoogleAuth ? '#f1f5f9' : 'white', cursor: !isGoogleAuth ? 'not-allowed' : 'text' }} />
                    {!isGoogleAuth
                      ? <span style={{ fontSize:'10px', color:'#059669', fontWeight:'bold' }}>✓ Verified via OTP</span>
                      : <span style={{ fontSize:'10px', color:'#64748b' }}>Enter your primary contact number</span>}
                  </div>
                  <button className="pg-btn" onClick={handleDetailsNext} disabled={loading}>{loading ? 'Creating...' : <>Continue &rarr;</>}</button>
                </>
              )}

              {/* Step 4: Password */}
              {step === 4 && (
                <>
                  <h2 className="pg-form-title">Create Password</h2>
                  <p className="pg-form-sub">Must meet all 5 requirements below</p>
                  <div className="pg-field">
                    <label className="pg-label">Password *</label>
                    <div className="pg-pass-wrap">
                      <input className="pg-input" style={{ paddingRight: '48px' }}
                        type={showPass ? 'text' : 'password'} placeholder="Create a strong password"
                        value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPwFocused(true)} />
                      <span className="pg-eye" onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</span>
                    </div>
                  </div>
                  {(pwFocused || password) && (
                    <div className="pg-pw-rules">
                      {pwRules.map(r => (
                        <div key={r.id} className={`pg-pw-rule ${r.passed ? 'pass' : 'fail'}`}>
                          <span className="pg-pw-icon">{r.passed ? '✅' : '○'}</span>{r.label}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pg-field">
                    <label className="pg-label">Confirm Password *</label>
                    <div className="pg-pass-wrap">
                      <input className="pg-input" style={{ paddingRight: '48px' }}
                        type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password"
                        value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                      <span className="pg-eye" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? '🙈' : '👁️'}</span>
                    </div>
                    {confirmPass && (
                      <div style={{ fontSize:'12px', marginTop:'6px', fontWeight:'600', color: password === confirmPass ? '#059669' : '#dc2626' }}>
                        {password === confirmPass ? '✅ Passwords match' : '❌ Passwords do not match'}
                      </div>
                    )}
                  </div>
                  {failWarn && <div className="pg-fail-warn">{failWarn}</div>}
                  <div className="pg-btn-row">
                    <button className="pg-btn-back" onClick={() => setStep(3)}>←</button>
                    <button className="pg-btn" onClick={handleCreateAccount} disabled={loading || !isStrongPw(password)} style={{ flex: 1 }}>
                      {loading ? 'Creating Account…' : 'Create Account →'}
                    </button>
                  </div>
                  {!isStrongPw(password) && password && (
                    <div style={{ fontSize:'12px', color:'#94a3b8', textAlign:'center', marginTop:'10px' }}>Complete all password requirements to continue</div>
                  )}
                </>
              )}

              {/* Step 5: Success */}
              {step === 5 && (
                <div className="pg-success-step">
                  <div style={{ fontSize: '60px', marginBottom: '12px' }}>🎉</div>
                  <h2 className="pg-form-title" style={{ textAlign: 'center' }}>Account Created!</h2>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 4px' }}>Welcome, <strong>{ownerName}</strong>! Your PG code:</p>
                  <div className="pg-code-card">
                    <div className="pg-code-label">Your PG Code</div>
                    <div className="pg-code-value">{pgCode}</div>
                    <button className="pg-copy-btn" onClick={copyCode}>📋 Copy Code</button>
                  </div>
                  {success && <div className="pg-success">{success}</div>}
                  <div className="pg-warning-box">⚠️ <strong>Save this code!</strong> You'll need it every time you login. Screenshot it or write it down safely.</div>
                  <button className="pg-btn" onClick={() => navigate('/dashboard')}>Go to Dashboard →</button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="pg-bottom-strip">
          {[
            { icon: '🛡️', label: 'Secure & Reliable', sub: 'Your data is 100% safe with us' },
            { icon: '🔒', label: 'Privacy First',      sub: 'We respect your privacy' },
            { icon: '☁️', label: 'Cloud Based',        sub: 'Access your data from anywhere' },
            { icon: '🎧', label: 'Always Here',        sub: '24/7 support for you' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="pg-bottom-item">
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
