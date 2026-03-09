import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.brand}>🏠 PG Manager</div>
          <h1 style={styles.heroTitle}>Manage your PG<br />like a Pro</h1>
          <p style={styles.heroSub}>All-in-one platform for PG owners to manage tenants, rooms, rent and more.</p>
          <div style={styles.features}>
            {['✅ Tenant Management', '✅ Rent Tracking', '✅ Electricity Bills', '✅ Automated Reminders'].map(f => (
              <div key={f} style={styles.featureItem}>{f}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.formTitle}>Welcome back</h2>
          <p style={styles.formSub}>Sign in to your PG Manager account</p>
          {error && <div style={styles.error}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <input style={styles.input} type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
          <p style={styles.switchText}>
            Don't have an account?{' '}
            <Link to="/signup" style={styles.switchLink}>Create one free</Link>
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
  brand: { color: '#e94560', fontSize: '22px', fontWeight: '700', marginBottom: '40px', letterSpacing: '1px' },
  heroTitle: { color: 'white', fontSize: '42px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px' },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: '1.7', marginBottom: '32px' },
  features: { display: 'flex', flexDirection: 'column', gap: '12px' },
  featureItem: { color: 'rgba(255,255,255,0.85)', fontSize: '15px' },
  right: {
    width: '480px', background: '#f8f9ff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px',
  },
  formBox: { width: '100%', maxWidth: '380px' },
  formTitle: { fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '8px' },
  formSub: { color: '#888', fontSize: '14px', marginBottom: '32px' },
  error: { background: '#fff0f0', color: '#e74c3c', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', border: '1px solid #ffd0d0' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '8px' },
  input: {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    border: '1.5px solid #e0e0e0', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', background: 'white', transition: 'border 0.2s',
  },
  btn: {
    width: '100%', padding: '14px', marginTop: '8px',
    background: 'linear-gradient(135deg, #e94560, #0f3460)',
    color: 'white', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px',
  },
  switchText: { textAlign: 'center', marginTop: '24px', color: '#888', fontSize: '13px' },
  switchLink: { color: '#e94560', fontWeight: '700', textDecoration: 'none' },
};

export default Login;