const fs = require('fs');
const file = 'src/pages/Signup.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Keep everything up to and including line 637 (index 636), which ends with "];  (features array)"
// Then append the new return block
const keepLines = lines.slice(0, 637);

const newReturn = `
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
          {/* Left Hero */}
          <div className="pg-hero">
            <div className="pg-hero-inner">
              <h1 className="pg-hero-title">Manage Your PG.<br/>Grow Your <em>Income.</em></h1>
              <p className="pg-hero-sub">All-in-one platform to manage rooms, tenants, payments and maintenance – easily and efficiently.</p>
              <div className="pg-features">
                {features.map(f => (
                  <div key={f.title} className="pg-feature-item">
                    <div className={\`pg-feature-icon \${f.color}\`}>{f.icon}</div>
                    <div className="pg-feature-text"><h4>{f.title}</h4><p>{f.desc}</p></div>
                  </div>
                ))}
              </div>
              <div className="pg-building-wrap">
                <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,#1a3a5c,#0d2137)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.3">
                    <rect x="10" y="30" width="60" height="45" rx="4" fill="white"/>
                    <polygon points="40,5 5,30 75,30" fill="white"/>
                    <rect x="30" y="50" width="20" height="25" rx="2" fill="#1a3a5c"/>
                    <rect x="15" y="40" width="12" height="10" rx="1" fill="#1a3a5c"/>
                    <rect x="53" y="40" width="12" height="10" rx="1" fill="#1a3a5c"/>
                  </svg>
                </div>
                <div className="pg-building-badge"><span>500+</span>PG Owners</div>
                <div className="pg-collected-card">
                  <div><div className="pg-collected-label">Total Collected</div><div className="pg-collected-val">₹1.2 Cr+</div></div>
                  <div className="pg-collected-trend">↑ 24% ↗</div>
                </div>
              </div>
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
                    const num = i + 1;
                    const status = step === num ? 'active' : step > num ? 'done' : 'pending';
                    return (
                      <React.Fragment key={label}>
                        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px' }}>
                          <div className={\`pg-step-dot \${status}\`}>{status === 'done' ? '✓' : num}</div>
                          <span className={\`pg-step-label \${status}\`}>{label}</span>
                        </div>
                        {i < 3 && <div className={\`pg-step-line \${step > num ? 'done' : 'pending'}\`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {error && <div className="pg-error">{error}</div>}
              {success && !error && <div className="pg-success">{success}</div>}

              {step === 1 && (
                <>
                  <h2 className="pg-form-title">Enter your mobile number</h2>
                  <p className="pg-form-sub">We'll send an OTP to verify your number</p>
                  <div className="pg-field">
                    <label className="pg-label">Mobile Number</label>
                    <div className="pg-input-prefix">
                      <div className="pg-prefix-box">+91</div>
                      <input className="pg-input" type="tel" inputMode="numeric" placeholder="98765 43210" maxLength={10} value={phone}
                        onChange={e => { setPhone(e.target.value.replace(/\\D/g, '')); setPhoneBlocked(false); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
                    </div>
                  </div>
                  {!isGoogleAuth && (
                    <div className={\`pg-terms-row\${agreedToTerms ? ' checked' : ''}\`} onClick={() => setAgreedToTerms(!agreedToTerms)}>
                      <div className={\`pg-terms-checkbox\${agreedToTerms ? ' checked' : ''}\`}>
                        {agreedToTerms && <span style={{ color:'white',fontSize:'13px',fontWeight:'800',lineHeight:1 }}>✓</span>}
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
                    <span style={{ color:'#e94560',fontWeight:'700',cursor:'pointer' }}
                      onClick={async () => { await auth.signOut(); sessionStorage.removeItem('signingUp'); sessionStorage.removeItem('authInProgress'); navigate('/login'); }}>
                      Sign in
                    </span>
                  </p>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="pg-form-title">Verify OTP</h2>
                  <p className="pg-form-sub">6-digit code sent to +91 {phone}</p>
                  <div className="pg-otp-row">
                    {otp.map((digit, i) => (
                      <input key={i} ref={el => otpRefs.current[i] = el}
                        className={\`pg-otp-box\${digit ? ' filled' : ''}\`}
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

              {step === 3 && (
                <>
                  <h2 className="pg-form-title">Your PG Details</h2>
                  <p className="pg-form-sub">Tell us about your property</p>
                  {[
                    { label:'Owner Full Name *',  val:ownerName, set:setOwnerName, ph:'Anbuselvan J',  type:'text'  },
                    { label:'PG / Hostel Name *', val:pgName,    set:setPgName,    ph:'Sunrise PG',    type:'text'  },
                    { label:'City *',             val:city,      set:setCity,      ph:'Chennai',       type:'text'  },
                    { label:'State *',            val:pgState,   set:setPgState,   ph:'Tamil Nadu',    type:'text'  },
                    { label:'Email *',            val:email,     set:setEmail,     ph:'you@email.com', type:'email' },
                  ].map(({ label, val, set, ph, type }) => (
                    <div key={label} className="pg-field">
                      <label className="pg-label">{label}</label>
                      <input className="pg-input" type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} />
                    </div>
                  ))}
                  <div className="pg-field">
                    <label className="pg-label">Mobile Number *</label>
                    <input className="pg-input" type="tel" maxLength={10} placeholder="9876543210" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\\D/g, ''))} readOnly={!isGoogleAuth}
                      style={{ backgroundColor: !isGoogleAuth ? '#f1f5f9' : 'white', cursor: !isGoogleAuth ? 'not-allowed' : 'text' }} />
                    {!isGoogleAuth
                      ? <span style={{ fontSize:'10px',color:'#059669',fontWeight:'bold' }}>✓ Verified via OTP</span>
                      : <span style={{ fontSize:'10px',color:'#64748b' }}>Enter your primary contact number</span>}
                  </div>
                  <button className="pg-btn" onClick={handleDetailsNext} disabled={loading}>{loading ? 'Creating...' : <>Continue &rarr;</>}</button>
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="pg-form-title">Create Password</h2>
                  <p className="pg-form-sub">Must meet all 5 requirements below</p>
                  <div className="pg-field">
                    <label className="pg-label">Password *</label>
                    <div className="pg-pass-wrap">
                      <input className="pg-input" style={{ paddingRight:'48px' }} type={showPass ? 'text' : 'password'}
                        placeholder="Create a strong password" value={password}
                        onChange={e => setPassword(e.target.value)} onFocus={() => setPwFocused(true)} />
                      <span className="pg-eye" onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</span>
                    </div>
                  </div>
                  {(pwFocused || password) && (
                    <div className="pg-pw-rules">
                      {pwRules.map(r => (
                        <div key={r.id} className={\`pg-pw-rule \${r.passed ? 'pass' : 'fail'}\`}>
                          <span className="pg-pw-icon">{r.passed ? '✅' : '○'}</span>{r.label}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pg-field">
                    <label className="pg-label">Confirm Password *</label>
                    <div className="pg-pass-wrap">
                      <input className="pg-input" style={{ paddingRight:'48px' }} type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                      <span className="pg-eye" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? '🙈' : '👁️'}</span>
                    </div>
                    {confirmPass && (
                      <div style={{ fontSize:'12px',marginTop:'6px',fontWeight:'600',color:password===confirmPass?'#059669':'#dc2626' }}>
                        {password === confirmPass ? '✅ Passwords match' : '❌ Passwords do not match'}
                      </div>
                    )}
                  </div>
                  {failWarn && <div className="pg-fail-warn">{failWarn}</div>}
                  <div className="pg-btn-row">
                    <button className="pg-btn-back" onClick={() => setStep(3)}>←</button>
                    <button className="pg-btn" onClick={handleCreateAccount} disabled={loading || !isStrongPw(password)} style={{ flex:1 }}>
                      {loading ? 'Creating Account…' : 'Create Account →'}
                    </button>
                  </div>
                  {!isStrongPw(password) && password && (
                    <div style={{ fontSize:'12px',color:'#94a3b8',textAlign:'center',marginTop:'10px' }}>Complete all password requirements to continue</div>
                  )}
                </>
              )}

              {step === 5 && (
                <div className="pg-success-step">
                  <div style={{ fontSize:'60px',marginBottom:'12px' }}>🎉</div>
                  <h2 className="pg-form-title" style={{ textAlign:'center' }}>Account Created!</h2>
                  <p style={{ fontSize:'14px',color:'#64748b',margin:'8px 0 4px' }}>Welcome, <strong>{ownerName}</strong>! Your PG code:</p>
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
            { icon:'🛡️', label:'Secure & Reliable', sub:'Your data is 100% safe with us' },
            { icon:'🔒', label:'Privacy First',      sub:'We respect your privacy' },
            { icon:'☁️', label:'Cloud Based',        sub:'Access your data from anywhere' },
            { icon:'🎧', label:'Always Here',        sub:'24/7 support for you' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="pg-bottom-item">
              <span>{icon}</span>
              <div>
                <div style={{ color:'#e2e8f0',fontWeight:700 }}>{label}</div>
                <div style={{ fontSize:'11px',marginTop:'1px' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
`;

const out = keepLines.join('\n') + newReturn;
fs.writeFileSync(file, out, 'utf8');
console.log('Done. Total lines:', out.split('\n').length);
