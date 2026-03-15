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

// ── Check if PG code already exists in Firestore
const isPGCodeUnique = async (code) => {
  const q = query(collection(db, 'pgOwners'), where('pgCode', '==', code));
  const snap = await getDocs(q);
  return snap.empty;
};

// ── Generate a guaranteed unique PG code
const createUniquePGCode = async (pgName) => {
  let code, unique = false;
  let attempts = 0;
  while (!unique && attempts < 10) {
    code   = generatePGCode(pgName);
    unique = await isPGCodeUnique(code);
    attempts++;
  }
  return code;
};

function Signup() {
  const [step, setStep]           = useState(1); // 1=phone, 2=OTP, 3=details, 4=password, 5=success
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent]     = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [resendTimer, setResendTimer]     = useState(0);

  // Step 3 fields
  const [ownerName, setOwnerName] = useState('');
  const [pgName, setPgName]       = useState('');
  const [city, setCity]           = useState('');
  const [state, setState]         = useState('');
  const [email, setEmail]         = useState('');

  // Step 4 fields
  const [password, setPassword]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Result
  const [pgCode, setPgCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const otpRefs = useRef([]);
  const navigate = useNavigate();

  // ── Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // ── Setup reCAPTCHA
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      });
    }
  };

  // ── Send OTP
  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) return setError('Enter a valid 10-digit mobile number.');
    setLoading(true);
    try {
      setupRecaptcha();
      const formatted = `+91${phone.replace(/\D/g, '')}`;
      const result    = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmResult(result);
      setOtpSent(true);
      setStep(2);
      setResendTimer(30);
      setSuccess('OTP sent to +91 ' + phone);
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP. Check number and try again.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    }
    setLoading(false);
  };

  // ── Handle OTP input boxes
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP
  const handleVerifyOTP = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit OTP.');
    setLoading(true);
    try {
      await confirmResult.confirm(code);
      setStep(3);
      setSuccess('✅ Phone verified successfully!');
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  // ── Step 3 → Step 4
  const handleDetailsNext = () => {
    setError('');
    if (!ownerName.trim()) return setError('Please enter your full name.');
    if (!pgName.trim())    return setError('Please enter your PG name.');
    if (!city.trim())      return setError('Please enter your city.');
    if (!state.trim())     return setError('Please enter your state.');
    setStep(4);
  };

  // ── Final submit — create account
  const handleCreateAccount = async () => {
    setError('');
    if (!password)               return setError('Please enter a password.');
    if (password.length < 6)     return setError('Password must be at least 6 characters.');
    if (password !== confirmPass) return setError('Passwords do not match!');

    setLoading(true);
    try {
      const user    = auth.currentUser;
      const code    = await createUniquePGCode(pgName);
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await setDoc(doc(db, 'pgOwners', user.uid), {
        ownerName,
        pgName,
        city,
        state,
        email:    email || '',
        phone,
        pgCode:   code,
        plan:     'trial',
        isActive: true,
        trialEnd: trialEnd.toISOString().split('T')[0],
        createdAt: new Date(),
        features: {
          electricity: true,
          payments:    true,
          rooms:       true,
          tenants:     true,
          reports:     true,
        },
        limits: {
          maxTenants:         50,
          maxRooms:           20,
          maxReportsPerMonth: 5,
        },
      });

      // Update Firebase Auth password
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

  // ── Copy PG code
  const copyCode = () => {
    navigator.clipboard.writeText(pgCode);
    setSuccess('✅ PG Code copied!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // ── Step indicator
  const steps = ['Phone', 'Verify', 'Details', 'Password', 'Done'];

  return (
    <div style={s.page}>
      {/* reCAPTCHA container */}
      <div id="recaptcha-container" />

      {/* Left panel */}
      <div style={s.left}>
        <div style={s.leftContent}>
          <div style={s.brand}>🏠 PG Manager</div>
          <h1 style={s.heroTitle}>Start managing<br />smarter today</h1>
          <p style={s.heroSub}>Join hundreds of PG owners who save time and earn more.</p>
          <div style={s.statsRow}>
            {[['500+','PG Owners'],['10,000+','Tenants Managed'],['₹1Cr+','Rent Collected']].map(([num,label]) => (
              <div key={label} style={s.stat}>
                <div style={s.statNum}>{num}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.formBox}>

          {/* Step indicator */}
          {step < 5 && (
            <div style={s.stepRow}>
              {steps.slice(0, 4).map((label, i) => {
                const num     = i + 1;
                const active  = step === num;
                const done    = step > num;
                return (
                  <React.Fragment key={label}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                      <div style={{
                        width:'32px', height:'32px', borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'13px', fontWeight:'700',
                        background: done ? '#059669' : active ? '#e94560' : '#e2e8f0',
                        color: (done || active) ? 'white' : '#94a3b8',
                        transition:'all 0.3s',
                      }}>
                        {done ? '✓' : num}
                      </div>
                      <span style={{ fontSize:'10px', color: active ? '#e94560' : '#94a3b8', fontWeight:'600' }}>{label}</span>
                    </div>
                    {i < 3 && <div style={{ flex:1, height:'2px', background: step > num ? '#059669' : '#e2e8f0', marginBottom:'18px', transition:'background 0.3s' }} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {error   && <div style={s.error}>{error}</div>}
          {success && <div style={s.successMsg}>{success}</div>}

          {/* ── STEP 1: Phone number ── */}
          {step === 1 && (
            <>
              <h2 style={s.formTitle}>Enter your mobile</h2>
              <p style={s.formSub}>We'll send an OTP to verify your number</p>
              <div style={s.field}>
                <label style={s.label}>Mobile Number</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ ...s.input, width:'56px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', color:'#475569', flexShrink:0 }}>
                    +91
                  </div>
                  <input style={{ ...s.input, flex:1 }} type="tel" placeholder="9876543210"
                    maxLength={10} value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
                </div>
              </div>
              <button style={s.btn} onClick={handleSendOTP} disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </button>
              <p style={s.switchText}>
                Already have an account? <Link to="/login" style={s.switchLink}>Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP Verify ── */}
          {step === 2 && (
            <>
              <h2 style={s.formTitle}>Verify OTP</h2>
              <p style={s.formSub}>Enter the 6-digit OTP sent to +91 {phone}</p>
              <div style={{ display:'flex', gap:'10px', justifyContent:'center', margin:'24px 0' }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width:'48px', height:'52px', textAlign:'center',
                      fontSize:'20px', fontWeight:'700', borderRadius:'10px',
                      border: `2px solid ${digit ? '#e94560' : '#e2e8f0'}`,
                      outline:'none', background:'white', transition:'border 0.2s',
                    }}
                  />
                ))}
              </div>
              <button style={s.btn} onClick={handleVerifyOTP} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP →'}
              </button>
              <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'#94a3b8' }}>
                {resendTimer > 0 ? (
                  <span>Resend OTP in <strong style={{ color:'#e94560' }}>{resendTimer}s</strong></span>
                ) : (
                  <span>
                    Didn't receive?{' '}
                    <span style={{ color:'#e94560', fontWeight:'700', cursor:'pointer' }}
                      onClick={() => { setStep(1); setOtp(['','','','','','']); }}>
                      Resend OTP
                    </span>
                  </span>
                )}
              </div>
              <div style={{ textAlign:'center', marginTop:'10px' }}>
                <span style={{ fontSize:'12px', color:'#94a3b8', cursor:'pointer' }}
                  onClick={() => { setStep(1); setOtp(['','','','','','']); }}>
                  ← Change number
                </span>
              </div>
            </>
          )}

          {/* ── STEP 3: PG Details ── */}
          {step === 3 && (
            <>
              <h2 style={s.formTitle}>Your PG Details</h2>
              <p style={s.formSub}>Tell us about your PG</p>
              {[
                { label:'Owner Full Name *', val:ownerName, set:setOwnerName, ph:'John Doe',      type:'text'  },
                { label:'PG / Hostel Name *', val:pgName,  set:setPgName,    ph:'Sunrise PG',    type:'text'  },
                { label:'City *',            val:city,     set:setCity,      ph:'Chennai',       type:'text'  },
                { label:'State *',           val:state,    set:setState,     ph:'Tamil Nadu',    type:'text'  },
                { label:'Email (optional)',  val:email,    set:setEmail,     ph:'you@email.com', type:'email' },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label} style={s.field}>
                  <label style={s.label}>{label}</label>
                  <input style={s.input} type={type} placeholder={ph}
                    value={val} onChange={e => set(e.target.value)} />
                </div>
              ))}
              <button style={s.btn} onClick={handleDetailsNext} disabled={loading}>
                Continue →
              </button>
            </>
          )}

          {/* ── STEP 4: Password ── */}
          {step === 4 && (
            <>
              <h2 style={s.formTitle}>Create Password</h2>
              <p style={s.formSub}>Set a strong password for your account</p>
              <div style={s.field}>
                <label style={s.label}>Password *</label>
                <div style={s.passWrap}>
                  <input style={{ ...s.input, paddingRight:'44px' }}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} />
                  <span style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </span>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm Password *</label>
                <div style={s.passWrap}>
                  <input style={{ ...s.input, paddingRight:'44px' }}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                  <span style={s.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? '🙈' : '👁️'}
                  </span>
                </div>
              </div>
              {/* Password strength */}
              {password && (
                <div style={{ marginBottom:'16px' }}>
                  <div style={{ height:'4px', borderRadius:'99px', background:'#e2e8f0', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:'99px', transition:'width 0.3s',
                      width: password.length >= 10 ? '100%' : password.length >= 6 ? '60%' : '30%',
                      background: password.length >= 10 ? '#059669' : password.length >= 6 ? '#d97706' : '#dc2626',
                    }} />
                  </div>
                  <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'4px' }}>
                    {password.length >= 10 ? '💪 Strong' : password.length >= 6 ? '⚠️ Medium' : '❌ Weak'}
                  </div>
                </div>
              )}
              <div style={{ display:'flex', gap:'10px' }}>
                <button style={{ ...s.btn, background:'#f1f5f9', color:'#64748b', flex:'0 0 auto', width:'48px' }}
                  onClick={() => setStep(3)}>←</button>
                <button style={{ ...s.btn, flex:1 }} onClick={handleCreateAccount} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account →'}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 5: Success ── */}
          {step === 5 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'64px', marginBottom:'16px' }}>🎉</div>
              <h2 style={{ ...s.formTitle, textAlign:'center' }}>Account Created!</h2>
              <p style={{ color:'#64748b', fontSize:'14px', marginBottom:'28px' }}>
                Welcome to PG Manager, <strong>{ownerName}</strong>!<br/>
                Your unique PG code is:
              </p>

              {/* PG Code display */}
              <div style={{
                background:'linear-gradient(135deg,#1a1a2e,#0f3460)',
                borderRadius:'16px', padding:'24px', marginBottom:'24px',
              }}>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>
                  Your PG Code
                </div>
                <div style={{ fontSize:'36px', fontWeight:'800', color:'#e94560', letterSpacing:'6px', marginBottom:'12px' }}>
                  {pgCode}
                </div>
                <button onClick={copyCode} style={{
                  background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)',
                  borderRadius:'8px', padding:'8px 20px', fontSize:'13px', fontWeight:'600', cursor:'pointer',
                }}>
                  📋 Copy Code
                </button>
              </div>

              {success && <div style={s.successMsg}>{success}</div>}

              <div style={{
                background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'12px',
                padding:'14px', marginBottom:'24px', fontSize:'13px', color:'#92400e', textAlign:'left',
              }}>
                ⚠️ <strong>Save this code!</strong> You'll need it every time you login.<br/>
                Screenshot it or write it down safely.
              </div>

              <button style={s.btn} onClick={() => navigate('/dashboard')}>
                Go to Dashboard →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI', sans-serif" },
  left:       { flex:1, background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px' },
  leftContent:{ maxWidth:'480px' },
  brand:      { color:'#e94560', fontSize:'22px', fontWeight:'700', marginBottom:'40px' },
  heroTitle:  { color:'white', fontSize:'42px', fontWeight:'800', lineHeight:'1.2', marginBottom:'20px' },
  heroSub:    { color:'rgba(255,255,255,0.6)', fontSize:'16px', lineHeight:'1.7', marginBottom:'40px' },
  statsRow:   { display:'flex', gap:'32px' },
  stat:       { textAlign:'center' },
  statNum:    { color:'#e94560', fontSize:'24px', fontWeight:'800' },
  statLabel:  { color:'rgba(255,255,255,0.6)', fontSize:'12px', marginTop:'4px' },
  right:      { width:'520px', background:'#f8f9ff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 60px', overflowY:'auto' },
  formBox:    { width:'100%', maxWidth:'400px' },
  stepRow:    { display:'flex', alignItems:'center', marginBottom:'32px' },
  formTitle:  { fontSize:'26px', fontWeight:'800', color:'#1a1a2e', marginBottom:'8px', marginTop:0 },
  formSub:    { color:'#888', fontSize:'14px', marginBottom:'24px' },
  error:      { background:'#fff0f0', color:'#e74c3c', padding:'12px 16px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', border:'1px solid #ffd0d0' },
  successMsg: { background:'#f0fdf4', color:'#059669', padding:'12px 16px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', border:'1px solid #bbf7d0', fontWeight:'600' },
  field:      { marginBottom:'16px' },
  label:      { display:'block', fontSize:'13px', fontWeight:'600', color:'#444', marginBottom:'6px' },
  input:      { width:'100%', padding:'12px 16px', borderRadius:'10px', border:'1.5px solid #e0e0e0', fontSize:'14px', outline:'none', boxSizing:'border-box', background:'white' },
  passWrap:   { position:'relative' },
  eyeBtn:     { position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', cursor:'pointer', fontSize:'16px', userSelect:'none' },
  btn:        { width:'100%', padding:'13px', background:'linear-gradient(135deg,#e94560,#0f3460)', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'700', cursor:'pointer' },
  switchText: { textAlign:'center', marginTop:'20px', color:'#888', fontSize:'13px' },
  switchLink: { color:'#e94560', fontWeight:'700', textDecoration:'none' },
};

export default Signup;