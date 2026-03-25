import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment,
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

const isPhoneRegistered = async (phone) => {
  const q    = query(collection(db, 'pgOwners'), where('phone', '==', phone.replace(/\D/g, '')));
  const snap = await getDocs(q);
  return !snap.empty;
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

const isPGCodeUnique = async (code) => {
  const q    = query(collection(db, 'pgOwners'), where('pgCode', '==', code));
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

  .pg-signup-root {
    min-height: 100dvh; font-family: 'Plus Jakarta Sans', sans-serif;
    background: #f5f6fa; display: flex; flex-direction: column;
  }
  .pg-hero {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
    padding: 28px 24px 32px; position: relative; overflow: hidden;
  }
  .pg-hero::after {
    content: ''; position: absolute; width: 300px; height: 300px;
    border-radius: 50%; background: rgba(233,69,96,0.12);
    top: -80px; right: -80px; pointer-events: none;
  }
  .pg-hero-brand { font-size: 15px; font-weight: 800; color: #e94560; letter-spacing: 0.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  .pg-hero-title { font-size: clamp(22px,6vw,30px); font-weight: 800; color: #fff; line-height: 1.25; margin-bottom: 18px; }
  .pg-hero-stats { display: flex; gap: 0; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
  .pg-stat { flex: 1; text-align: center; padding: 12px 8px; background: rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.08); }
  .pg-stat:last-child { border-right: none; }
  .pg-stat-num { font-size: 16px; font-weight: 800; color: #e94560; line-height: 1; }
  .pg-stat-label { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 4px; font-weight: 500; }

  .pg-card {
    background: #fff; border-radius: 24px 24px 0 0; flex: 1;
    padding: 28px 24px 48px; box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
    margin-top: -10px; position: relative; z-index: 1;
  }

  .pg-steps { display: flex; align-items: center; margin-bottom: 28px; }
  .pg-step-dot {
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0; transition: background 0.3s, color 0.3s;
  }
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

  .pg-error   { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; border-radius: 10px; padding: 11px 14px; font-size: 13px; margin-bottom: 16px; font-weight: 500; }
  .pg-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 10px; padding: 11px 14px; font-size: 13px; margin-bottom: 16px; font-weight: 600; }

  .pg-form-title { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 6px; }
  .pg-form-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 22px; line-height: 1.5; }
  .pg-field      { margin-bottom: 14px; }
  .pg-label      { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
  .pg-input {
    width: 100%; padding: 13px 16px; border: 1.5px solid #e2e8f0;
    border-radius: 12px; font-size: 15px; font-family: inherit;
    color: #1a1a2e; background: #fafbff; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none;
  }
  .pg-input:focus { border-color: #e94560; box-shadow: 0 0 0 3px rgba(233,69,96,0.1); background: #fff; }
  .pg-input-prefix { display: flex; gap: 8px; }
  .pg-prefix-box {
    width: 60px; flex-shrink: 0; padding: 13px 0;
    border: 1.5px solid #e2e8f0; border-radius: 12px;
    font-size: 15px; font-weight: 700; color: #475569;
    background: #f8fafc; text-align: center;
  }

  .pg-pass-wrap { position: relative; }
  .pg-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 18px; user-select: none; -webkit-tap-highlight-color: transparent; }

  .pg-pw-rules { background: #f8faff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
  .pg-pw-rule  { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; padding: 3px 0; transition: color 0.2s; }
  .pg-pw-rule.pass { color: #059669; }
  .pg-pw-rule.fail { color: #94a3b8; }
  .pg-pw-icon { font-size: 13px; width: 16px; text-align: center; }

  .pg-otp-row { display: flex; gap: 8px; justify-content: center; margin: 20px 0 24px; }
  .pg-otp-box {
    width: 44px; height: 52px; text-align: center; font-size: 22px; font-weight: 800;
    border-radius: 12px; border: 2px solid #e2e8f0; background: #fafbff;
    outline: none; color: #1a1a2e; transition: border-color 0.2s;
    -webkit-appearance: none; font-family: inherit;
  }
  .pg-otp-box:focus  { border-color: #e94560; background: #fff; }
  .pg-otp-box.filled { border-color: #e94560; }

  .pg-fail-warn { font-size: 12px; color: #d97706; font-weight: 600; text-align: center; margin-top: 8px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; }

  .pg-btn {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #e94560 0%, #c1253f 100%);
    color: #fff; border: none; border-radius: 14px;
    font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer;
    letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(233,69,96,0.35);
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s, transform 0.1s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .pg-btn:active   { transform: scale(0.98); opacity: 0.92; }
  .pg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .pg-btn-back {
    width: 48px; flex-shrink: 0; padding: 15px 0;
    background: #f1f5f9; color: #64748b; border: none;
    border-radius: 14px; font-size: 18px; font-family: inherit;
    cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.2s;
  }
  .pg-btn-row { display: flex; gap: 10px; }

  .pg-resend      { text-align: center; margin-top: 16px; font-size: 13px; color: #94a3b8; }
  .pg-resend-link { color: #e94560; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .pg-change-num  { text-align: center; margin-top: 10px; font-size: 12px; color: #94a3b8; cursor: pointer; -webkit-tap-highlight-color: transparent; }

  .pg-terms-row {
    display: flex; align-items: flex-start; gap: 10px; margin: 14px 0 18px; padding: 14px;
    background: #f8faff; border: 1.5px solid #e2e8f0; border-radius: 12px;
    cursor: pointer; -webkit-tap-highlight-color: transparent; transition: border-color 0.2s, background 0.2s;
  }
  .pg-terms-row.checked { border-color: #059669; background: #f0fdf4; }
  .pg-terms-checkbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #cbd5e0; background: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all 0.2s; }
  .pg-terms-checkbox.checked { background: #059669; border-color: #059669; }
  .pg-terms-text { font-size: 12px; color: #475569; line-height: 1.6; font-weight: 500; }
  .pg-terms-link { color: #e94560; font-weight: 700; text-decoration: none; }
  .pg-terms-link:hover { text-decoration: underline; }

  .pg-switch { text-align: center; margin-top: 20px; font-size: 13px; color: #94a3b8; }
  .pg-switch a { color: #e94560; font-weight: 700; text-decoration: none; }

  .pg-success-step { text-align: center; }
  .pg-code-card { background: linear-gradient(135deg, #1a1a2e, #0f3460); border-radius: 18px; padding: 24px 20px; margin: 20px 0; }
  .pg-code-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; font-weight: 600; }
  .pg-code-value { font-size: 34px; font-weight: 800; color: #e94560; letter-spacing: 8px; margin-bottom: 16px; }
  .pg-copy-btn { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
  .pg-warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 14px; margin-bottom: 24px; font-size: 13px; color: #92400e; text-align: left; line-height: 1.6; }

  @media (min-width: 769px) {
    .pg-signup-root { flex-direction: row; background: #fff; }
    .pg-hero { flex: 1; display: flex; align-items: center; justify-content: center; padding: 60px; border-radius: 0; }
    .pg-hero-inner { max-width: 440px; }
    .pg-hero-title { font-size: 42px; margin-bottom: 20px; }
    .pg-hero-brand { font-size: 20px; margin-bottom: 40px; }
    .pg-hero-sub { color: rgba(255,255,255,0.6); font-size: 16px; line-height: 1.7; margin-bottom: 40px; display: block !important; }
    .pg-hero-stats { border-radius: 16px; }
    .pg-stat { padding: 16px; }
    .pg-stat-num { font-size: 22px; }
    .pg-stat-label { font-size: 11px; }
    .pg-card-wrap { width: 480px; flex-shrink: 0; background: #f8f9ff; display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; }
    .pg-card { border-radius: 20px; margin-top: 0; box-shadow: 0 8px 40px rgba(0,0,0,0.08); width: 100%; max-width: 400px; padding: 36px 32px 40px; }
  }
`;

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Signup() {
  const [step, setStep]                   = useState(1);
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
      await confirmResult.confirm(code);
      setStep(3);
      setSuccess('✅ Phone verified!');
    } catch {
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
  const handleDetailsNext = () => {
    setError('');
    if (!ownerName.trim()) return setError('Please enter your full name.');
    if (!pgName.trim())    return setError('Please enter your PG name.');
    if (!city.trim())      return setError('Please enter your city.');
    if (!pgState.trim())   return setError('Please enter your state.');
    if (!email.trim())     return setError('Please enter your email.');
    setStep(4);
  };

  // ── Step 4: Create Account
  const handleCreateAccount = async () => {
    setError(''); setFailWarn('');

    if (!password)             return setError('Please enter a password.');
    if (!isStrongPw(password)) return setError('Password does not meet all requirements. Please check the rules below.');
    if (password !== confirmPass) {
      const result = await recordPassFail(phone);
      if (result.blocked) {
        setError('🔒 Too many incorrect password attempts. Your account has been blocked. Contact admin.');
        return;
      }
      setError(`❌ Passwords do not match! ${result.remaining} attempt${result.remaining !== 1 ? 's' : ''} remaining before block.`);
      setFailWarn(`⚠️ ${result.remaining} attempt${result.remaining !== 1 ? 's' : ''} left before your account gets blocked.`);
      return;
    }

    if (await isAdminBlocked(phone)) {
      setError('🔒 This account has been blocked. Contact admin to unblock.');
      return;
    }

    setLoading(true);
    try {
      const user     = auth.currentUser;
      const code     = await createUniquePGCode(pgName);

      // ✅ Resolve email — use real email or fallback to phone-based email
      const resolvedEmail = email.trim()
        ? email.trim()
        : `${phone.replace(/\D/g, '')}@pgpilots.in`;

      // ✅ Save to Firestore with resolved email
      await setDoc(doc(db, 'pgOwners', user.uid), {
        ownerName,
        pgName,
        city,
        state: pgState,
        email: resolvedEmail,
        phone: phone.replace(/\D/g, ''),
        pgCode: code,
        isActive: true,
        createdAt: new Date(),
        billing_mode: 'usage',
        current_beds: 0,
        max_beds_this_month: 0,
      });

      // ✅ Link email+password to phone auth user so all 3 login methods work
      const { updatePassword, linkWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const emailCredential = EmailAuthProvider.credential(resolvedEmail, password);
      try {
        await linkWithCredential(user, emailCredential);
      } catch (linkErr) {
        // If already linked, just update the password
        if (
          linkErr.code === 'auth/provider-already-linked' ||
          linkErr.code === 'auth/email-already-in-use'
        ) {
          await updatePassword(user, password);
        } else {
          throw linkErr;
        }
      }

      // ✅ Signup fully complete — remove flag so dashboard redirect works normally
      sessionStorage.removeItem('signingUp');
      setPgCode(code);
      setStep(5);
    } catch (err) {
      console.error(err);
      const result = await recordPassFail(phone);
      if (result.blocked) {
        setError('🔒 Too many failed attempts. Your account has been blocked. Contact admin.');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setFailWarn('');
  };

  const stepLabels = ['Phone', 'Verify', 'Details', 'Password'];
  const pwRules    = checkRules(password);

  return (
    <>
      <style>{css}</style>
      <div className="pg-signup-root">
        <div id="recaptcha-container" />

        {/* ── Hero ── */}
        <div className="pg-hero">
          <div className="pg-hero-inner">
            <div className="pg-hero-brand">🏠 PGpilots</div>
            <h1 className="pg-hero-title">Start managing<br />smarter today</h1>
            <p className="pg-hero-sub" style={{ display: 'none' }}>
              Join hundreds of PG owners who save time and earn more.
            </p>
            <div className="pg-hero-stats">
              {[['500+', 'PG Owners'], ['10,000+', 'Tenants'], ['₹1Cr+', 'Collected']].map(([num, label]) => (
                <div key={label} className="pg-stat">
                  <div className="pg-stat-num">{num}</div>
                  <div className="pg-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Card ── */}
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
                      type="tel" inputMode="numeric"
                      placeholder="9876543210" maxLength={10}
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneBlocked(false); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                    />
                  </div>
                </div>
                <div
                  className={`pg-terms-row${agreedToTerms ? ' checked' : ''}`}
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  <div className={`pg-terms-checkbox${agreedToTerms ? ' checked' : ''}`}>
                    {agreedToTerms && <span style={{ color: 'white', fontSize: '13px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                  </div>
                  <div className="pg-terms-text">
                    I agree to the{' '}
                    <a href="/terms-and-conditions.html" target="_blank" rel="noopener noreferrer"
                      className="pg-terms-link" onClick={e => e.stopPropagation()}>Terms &amp; Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer"
                      className="pg-terms-link" onClick={e => e.stopPropagation()}>Privacy Policy</a>
                    . I confirm I am 18+ and authorized to manage this PG property.
                  </div>
                </div>
                <button className="pg-btn" onClick={handleSendOTP} disabled={loading || phoneBlocked}>
                  {loading ? 'Checking…' : <>Send OTP <span>→</span></>}
                </button>
                <p className="pg-switch">Already have an account? <Link to="/login">Sign in</Link></p>
              </>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <>
                <h2 className="pg-form-title">Verify OTP</h2>
                <p className="pg-form-sub">6-digit code sent to +91 {phone}</p>
                <div className="pg-otp-row">
                  {otp.map((digit, i) => (
                    <input key={i}
                      ref={el => otpRefs.current[i] = el}
                      className={`pg-otp-box${digit ? ' filled' : ''}`}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>
                {failWarn && <div className="pg-fail-warn">{failWarn}</div>}
                <button className="pg-btn" onClick={handleVerifyOTP} disabled={loading}>
                  {loading ? 'Verifying…' : <>Verify OTP <span>→</span></>}
                </button>
                <div className="pg-resend">
                  {resendTimer > 0
                    ? <span>Resend in <strong style={{ color: '#e94560' }}>{resendTimer}s</strong></span>
                    : <span>Didn't receive? <span className="pg-resend-link" onClick={resetToStep1}>Resend OTP</span></span>
                  }
                </div>
                <p className="pg-change-num" onClick={resetToStep1}>← Change number</p>
              </>
            )}

            {/* ── Step 3: Details ── */}
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
                    <input className="pg-input" type={type} placeholder={ph}
                      value={val} onChange={e => set(e.target.value)} />
                  </div>
                ))}
                <button className="pg-btn" onClick={handleDetailsNext} disabled={loading}>Continue →</button>
              </>
            )}

            {/* ── Step 4: Password ── */}
            {step === 4 && (
              <>
                <h2 className="pg-form-title">Create Password</h2>
                <p className="pg-form-sub">Must meet all 5 requirements below</p>

                <div className="pg-field">
                  <label className="pg-label">Password *</label>
                  <div className="pg-pass-wrap">
                    <input className="pg-input" style={{ paddingRight: '48px' }}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setPwFocused(true)}
                    />
                    <span className="pg-eye" onClick={() => setShowPass(!showPass)}>
                      {showPass ? '🙈' : '👁️'}
                    </span>
                  </div>
                </div>

                {(pwFocused || password) && (
                  <div className="pg-pw-rules">
                    {pwRules.map(r => (
                      <div key={r.id} className={`pg-pw-rule ${r.passed ? 'pass' : 'fail'}`}>
                        <span className="pg-pw-icon">{r.passed ? '✅' : '○'}</span>
                        {r.label}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pg-field">
                  <label className="pg-label">Confirm Password *</label>
                  <div className="pg-pass-wrap">
                    <input className="pg-input" style={{ paddingRight: '48px' }}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                    />
                    <span className="pg-eye" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? '🙈' : '👁️'}
                    </span>
                  </div>
                  {confirmPass && (
                    <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: '600',
                      color: password === confirmPass ? '#059669' : '#dc2626' }}>
                      {password === confirmPass ? '✅ Passwords match' : '❌ Passwords do not match'}
                    </div>
                  )}
                </div>

                {failWarn && <div className="pg-fail-warn">{failWarn}</div>}

                <div className="pg-btn-row">
                  <button className="pg-btn-back" onClick={() => setStep(3)}>←</button>
                  <button className="pg-btn"
                    onClick={handleCreateAccount}
                    disabled={loading || !isStrongPw(password)}
                    style={{ flex: 1 }}>
                    {loading ? 'Creating Account…' : 'Create Account →'}
                  </button>
                </div>

                {!isStrongPw(password) && password && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>
                    Complete all password requirements to continue
                  </div>
                )}
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
        </div>
      </div>
    </>
  );
}
