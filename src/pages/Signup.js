import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
  const [name, setName] = useState('');
  const [pgName, setPgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'pgOwners', user.uid), {
        name, pgName, email, createdAt: new Date(), plan: 'basic',
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.brand}>🏠 PG Manager</div>
          <h1 style={styles.heroTitle}>Start managing<br />smarter today</h1>
          <p style={styles.heroSub}>Join hundreds of PG owners who save time and earn more with PG Manager.</p>
          <div style={styles.statsRow}>
            {[['500+', 'PG Owners'], ['10,000+', 'Tenants Managed'], ['₹1Cr+', 'Rent Collected']].map(([num, label]) => (
              <div key={label} style={styles.stat}>
                <div style={styles.statNum}>{num}</div>
                <div style={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.formTitle}>Create your account</h2>
          <p style={styles.formSub}>Free forever. No credit card required.</p>
          {error && <div style={styles.error}>{error}</div>}
          <form onSubmit={handleSignup}>
            {[
              { label: 'Your Full Name', val: name, set: setName, type: 'text', ph: 'John Doe' },
              { label: 'PG / Hostel Name', val: pgName, set: setPgName, type: 'text', ph: 'Sunrise PG' },
              { label: 'Email Address', val: email, set: setEmail, type: 'email', ph: 'you@example.com' },
              { label: 'Password', val: password, set: setPassword, type: 'password', ph: 'Min 6 characters' },
            ].map(({ label, val, set, type, ph }) => (
              <div key={label} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input style={styles.input} type={type} placeholder={ph}
                  value={val} onChange={e => set(e.target.value)} required />
              </div>
            ))}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Free Account →'}
            </button>
          </form>
          <p style={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.switchLink}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" },
  left: {
    flex: 1, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px',
  },
  leftContent: { maxWidth: '480px' },
  brand: { color: '#e94560', fontSize: '22px', fontWeight: '700', marginBottom: '40px' },
  heroTitle: { color: 'white', fontSize: '42px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px' },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: '1.7', marginBottom: '40px' },
  statsRow: { display: 'flex', gap: '32px' },
  stat: { textAlign: 'center' },
  statNum: { color: '#e94560', fontSize: '24px', fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' },
  right: {
    width: '480px', background: '#f8f9ff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px',
  },
  formBox: { width: '100%', maxWidth: '380px' },
  formTitle: { fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '8px' },
  formSub: { color: '#888', fontSize: '14px', marginBottom: '32px' },
  error: { background: '#fff0f0', color: '#e74c3c', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', border: '1px solid #ffd0d0' },
  field: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '8px' },
  input: { width: '100%', padding: '13px 16px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' },
  btn: { width: '100%', padding: '14px', marginTop: '8px', background: 'linear-gradient(135deg, #e94560, #0f3460)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  switchText: { textAlign: 'center', marginTop: '24px', color: '#888', fontSize: '13px' },
  switchLink: { color: '#e94560', fontWeight: '700', textDecoration: 'none' },
};

export default Signup;