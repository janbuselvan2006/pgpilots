import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword, sendPasswordResetEmail,
  signInWithPhoneNumber, RecaptchaVerifier,
  browserSessionPersistence, browserLocalPersistence, setPersistence,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

// ── Inject mobile CSS once
const css = `
  .login-page { display:flex; min-height:100vh; font-family:'Segoe UI',sans-serif; background:white; }
  .login-left  { flex:1; background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%); display:flex; align-items:center; justify-content:center; padding:60px; }
  .login-right { flex:1; background:#f8f9ff; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 40px; min-height:100vh; }
  .login-mobile-brand { display:none; text-align:center; margin-bottom:28px; }
  .login-box   { width:100%; max-width:400px; }
  .login-toggle-btn { flex:1; padding:9px 4px; border-radius:8px; border:none; font-size:12px; font-weight:600; cursor:pointer; background:transparent; color:#64748b; transition:all 0.2s; }
  @media (max-width:768px) {
    .login-left  { display:none !important; }
    .login-right { padding:32px 24px !important; justify-content:flex-start !important; padding-top:48px !important; }
    .login-mobile-brand { display:block !important; }
    .login-box   { max-width:100% !important; }
    .login-toggle-btn { font-size:11px; padding:8px 2px; }
  }
`;
if (!document.getElementById('login-css')) {
  const el = document.createElement('style');
  el.id = 'login-css';
  el.innerHTML = css;
  document.head.appendChild(el);
}

function Login() {
  const [loginType, setLoginType]   = useState('email');
  const [emailInput, setEmailInput] = useState('');
  const [mobile, setMobile]         = useState('');
  const [pgCode, setPgCode]         = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpStep, setOtpStep]       = useState(false);
  const [otp, setOtp]               = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [resendTimer, setResendTimer]     = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const navigate = useNavigate();

  useEffect(() => { setPersistence(auth, browserSessionPersistence).catch(console.error); }, []);
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const showErr = msg => { setError(msg); setSuccess(''); };
  const showOk  = msg => { setSuccess(msg); setError(''); };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size:'invisible', callback:()=>{} });
    }
  };

  const handleEmailLogin = async () => {
    if (!emailInput.trim()) return showErr('Enter your email address.');
    if (!password)          return showErr('Enter your password.');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, emailInput.trim(), password);
      navigate('/dashboard');
    } catch (err) { showErr('❌ Invalid email or password.'); }
    setLoading(false);
  };

  const handlePGCodeLogin = async () => {
  if (!pgCode.trim()) return showErr('Enter your PG Code.');
  if (!password)      return showErr('Enter your password.');
  setLoading(true);
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const snap = await getDocs(query(collection(db,'pgOwners'), where('pgCode','==',pgCode.toUpperCase().trim())));
    if (snap.empty) { setLoading(false); return showErr('❌ PG Code not found.'); }
    
    const data = snap.docs[0].data();
    const userEmail = data.email; // this is now phone@pgmanager.app or real email
    if (!userEmail) { setLoading(false); return showErr('❌ No email linked to this PG Code.'); }
    
    await signInWithEmailAndPassword(auth, userEmail, password);
    navigate('/dashboard');
  } catch (err) {
    console.error(err);
    showErr('❌ Invalid PG Code or password.');
  }
  setLoading(false);
};

  const handleSendOTP = async () => {
    if (!mobile || mobile.length < 10) return showErr('Enter a valid 10-digit number.');
    setLoading(true);
    try {
      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, `+91${mobile}`, window.recaptchaVerifier);
      setConfirmResult(result); setOtpStep(true); setResendTimer(30);
      showOk('OTP sent to +91 ' + mobile);
    } catch (err) {
      showErr('Failed to send OTP.');
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return showErr('Enter the 6-digit OTP.');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await confirmResult.confirm(otp);
      navigate('/dashboard');
    } catch (err) { showErr('Invalid OTP.'); }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotInput.trim()) return showErr('Enter your email or PG Code.');
    setLoading(true);
    try {
      let email = forgotInput.trim();
      if (!forgotInput.includes('@')) {
        const snap = await getDocs(query(collection(db,'pgOwners'), where('pgCode','==',forgotInput.toUpperCase().trim())));
        if (snap.empty) { setLoading(false); return showErr('PG Code not found.'); }
        email = snap.docs[0].data().email;
        if (!email) { setLoading(false); return showErr('No email linked.'); }
      }
      await sendPasswordResetEmail(auth, email);
      setForgotSent(true); showOk(`✅ Reset email sent to ${email}`);
    } catch (err) { showErr('Failed to send reset email.'); }
    setLoading(false);
  };

  const RememberMe = ({ id }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
      <input type="checkbox" id={id} checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ cursor:'pointer', width:'16px', height:'16px' }} />
      <label htmlFor={id} style={{ fontSize:'13px', color:'#475569', cursor:'pointer' }}>Remember me — stay logged in</label>
    </div>
  );

  if (showForgot) return (
    <div className="login-page">
      <div id="recaptcha-container" />
      <div className="login-left">
        <div><div style={s.brand}>🏠 PGpilots</div><h1 style={s.heroTitle}>Reset your<br/>password</h1><p style={s.heroSub}>We'll send a reset link to your email.</p></div>
      </div>
      <div className="login-right">
        <div className="login-mobile-brand"><div style={s.mobileBrandText}>🏠 PGpilots</div></div>
        <div className="login-box">
          <h2 style={s.formTitle}>Forgot Password?</h2>
          <p style={s.formSub}>Enter your email or PG Code</p>
          {error   && <div style={s.error}>{error}</div>}
          {success && <div style={s.successMsg}>{success}</div>}
          {!forgotSent ? (
            <>
              <div style={s.field}>
                <label style={s.label}>Email or PG Code</label>
                <input style={s.input} type="text" placeholder="you@email.com or ABC123" value={forgotInput} onChange={e => setForgotInput(e.target.value)} />
              </div>
              <button style={s.btn} onClick={handleForgotPassword} disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link →'}</button>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:'48px', marginBottom:'16px' }}>📧</div>
              <p style={{ color:'#64748b' }}>Check your email for the reset link.</p>
            </div>
          )}
          <p style={{ textAlign:'center', marginTop:'20px', fontSize:'13px' }}>
            <span style={{ color:'#e94560', fontWeight:'700', cursor:'pointer' }}
              onClick={() => { setShowForgot(false); setForgotSent(false); setForgotInput(''); setError(''); setSuccess(''); }}>
              ← Back to Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      <div id="recaptcha-container" />

      <div className="login-left">
        <div style={s.leftContent}>
          <div style={s.brand}>🏠 PGpilots</div>
          <h1 style={s.heroTitle}>Manage your PG<br/>like a Pro</h1>
          <p style={s.heroSub}>All-in-one platform for PG owners to manage tenants, rooms, rent and more.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {['✅ Tenant Management','✅ Rent Tracking','✅ Electricity Bills','✅ Automated Reminders'].map(f => (
              <div key={f} style={{ color:'rgba(255,255,255,0.85)', fontSize:'15px' }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        {/* Mobile brand — shown only on mobile via CSS */}
        <div className="login-mobile-brand">
          <div style={s.mobileBrandText}>🏠 PGpilots</div>
          <div style={s.mobileBrandSub}>Manage your PG smarter</div>
        </div>

        <div className="login-box">
          <h2 style={s.formTitle}>Welcome back</h2>
          <p style={s.formSub}>Sign in to your account</p>

          {error   && <div style={s.error}>{error}</div>}
          {success && <div style={s.successMsg}>{success}</div>}

          {/* Tabs */}
          <div style={{ display:'flex', background:'#e2e8f0', borderRadius:'10px', padding:'4px', marginBottom:'24px', gap:'4px' }}>
            {[{id:'email',label:'📧 Email'},{id:'pgcode',label:'🔑 PG Code'},{id:'mobile',label:'📱 Mobile'}].map(({id,label}) => (
              <button key={id} className="login-toggle-btn"
                style={{ background: loginType===id ? 'white' : 'transparent', color: loginType===id ? '#e94560' : '#64748b', boxShadow: loginType===id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                onClick={() => { setLoginType(id); setError(''); setOtpStep(false); setOtp(''); }}>
                {label}
              </button>
            ))}
          </div>

          {/* Email */}
          {loginType==='email' && (
            <>
              <div style={s.field}>
                <label style={s.label}>Email Address</label>
                <input style={s.input} type="email" placeholder="you@example.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleEmailLogin()} />
              </div>
              <div style={s.field}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <label style={s.label}>Password</label>
                  <span style={s.forgotLink} onClick={() => setShowForgot(true)}>Forgot password?</span>
                </div>
                <div style={{ position:'relative' }}>
                  <input style={{ ...s.input, paddingRight:'44px' }} type={showPass?'text':'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleEmailLogin()} />
                  <span style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass?'🙈':'👁️'}</span>
                </div>
              </div>
              <RememberMe id="rm0" />
              <button style={s.btn} onClick={handleEmailLogin} disabled={loading}>{loading ? 'Signing in...' : 'Sign In →'}</button>
            </>
          )}

          {/* PG Code */}
          {loginType==='pgcode' && (
            <>
              <div style={s.field}>
                <label style={s.label}>PG Code</label>
                <input style={{ ...s.input, textTransform:'uppercase', letterSpacing:'6px', fontWeight:'800', fontSize:'20px', textAlign:'center' }} type="text" placeholder="ABC123" maxLength={6} value={pgCode} onChange={e => setPgCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter' && handlePGCodeLogin()} />
              </div>
              <div style={s.field}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <label style={s.label}>Password</label>
                  <span style={s.forgotLink} onClick={() => setShowForgot(true)}>Forgot password?</span>
                </div>
                <div style={{ position:'relative' }}>
                  <input style={{ ...s.input, paddingRight:'44px' }} type={showPass?'text':'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handlePGCodeLogin()} />
                  <span style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass?'🙈':'👁️'}</span>
                </div>
              </div>
              <RememberMe id="rm2" />
              <button style={s.btn} onClick={handlePGCodeLogin} disabled={loading}>{loading ? 'Signing in...' : 'Sign In →'}</button>
            </>
          )}

          {/* Mobile OTP */}
          {loginType==='mobile' && !otpStep && (
            <>
              <div style={s.field}>
                <label style={s.label}>Mobile Number</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ ...s.input, width:'60px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', color:'#475569', flexShrink:0 }}>+91</div>
                  <input style={{ ...s.input, flex:1 }} type="tel" placeholder="9876543210" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g,''))} onKeyDown={e => e.key==='Enter' && handleSendOTP()} />
                </div>
              </div>
              <button style={s.btn} onClick={handleSendOTP} disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP →'}</button>
            </>
          )}

          {loginType==='mobile' && otpStep && (
            <>
              <div style={s.field}>
                <label style={s.label}>OTP sent to +91 {mobile}</label>
                <input style={{ ...s.input, fontSize:'24px', fontWeight:'700', letterSpacing:'10px', textAlign:'center' }} type="text" placeholder="------" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} />
              </div>
              <RememberMe id="rm1" />
              <button style={s.btn} onClick={handleVerifyOTP} disabled={loading}>{loading ? 'Verifying...' : 'Login →'}</button>
              <div style={{ textAlign:'center', marginTop:'12px', fontSize:'13px', color:'#94a3b8' }}>
                {resendTimer > 0 ? <span>Resend in <strong style={{ color:'#e94560' }}>{resendTimer}s</strong></span>
                  : <span style={{ color:'#e94560', cursor:'pointer', fontWeight:'700' }} onClick={() => { setOtpStep(false); setOtp(''); }}>Resend OTP</span>}
                {' • '}
                <span style={{ cursor:'pointer' }} onClick={() => { setOtpStep(false); setMobile(''); setOtp(''); }}>← Change</span>
              </div>
            </>
          )}

          <p style={{ textAlign:'center', marginTop:'24px', color:'#888', fontSize:'14px' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color:'#e94560', fontWeight:'700', textDecoration:'none' }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  leftContent:    { maxWidth:'480px' },
  brand:          { color:'#e94560', fontSize:'22px', fontWeight:'700', marginBottom:'40px' },
  heroTitle:      { color:'white', fontSize:'42px', fontWeight:'800', lineHeight:'1.2', marginBottom:'20px' },
  heroSub:        { color:'rgba(255,255,255,0.6)', fontSize:'16px', lineHeight:'1.7', marginBottom:'32px' },
  formTitle:      { fontSize:'26px', fontWeight:'800', color:'#1a1a2e', marginBottom:'8px', marginTop:0 },
  formSub:        { color:'#888', fontSize:'14px', marginBottom:'24px' },
  error:          { background:'#fff0f0', color:'#e74c3c', padding:'12px 16px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', border:'1px solid #ffd0d0' },
  successMsg:     { background:'#f0fdf4', color:'#059669', padding:'12px 16px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', border:'1px solid #bbf7d0', fontWeight:'600' },
  field:          { marginBottom:'18px' },
  label:          { display:'block', fontSize:'13px', fontWeight:'600', color:'#444', marginBottom:'6px' },
  input:          { width:'100%', padding:'13px 16px', borderRadius:'10px', border:'1.5px solid #e0e0e0', fontSize:'16px', outline:'none', boxSizing:'border-box', background:'white' },
  eyeBtn:         { position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', cursor:'pointer', fontSize:'16px', userSelect:'none' },
  forgotLink:     { fontSize:'12px', color:'#e94560', fontWeight:'600', cursor:'pointer' },
  btn:            { width:'100%', padding:'14px', background:'linear-gradient(135deg,#e94560,#0f3460)', color:'white', border:'none', borderRadius:'10px', fontSize:'16px', fontWeight:'700', cursor:'pointer' },
  mobileBrandText:{ fontSize:'24px', fontWeight:'800', color:'#1a1a2e' },
  mobileBrandSub: { fontSize:'13px', color:'#94a3b8', marginTop:'4px', marginBottom:'0' },
};

export default Login;