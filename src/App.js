import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import AdminRoute from './AdminRoute';
import StaffLogin from './Stafflogin';
import StaffDashboard from './Staffdashboard';
import TenantOnboard from './pages/TenantOnboard';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: '14px',
      background: '#f0f2f8', fontFamily: 'DM Sans, Segoe UI, sans-serif',
    }}>
      <div style={{
        width: '36px', height: '36px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#e94560',
        borderRadius: '50%',
        animation: 'appspin 0.7s linear infinite',
      }} />
      <style>{`@keyframes appspin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <path d="M7 15 L7 27 C7 28.1 7.9 29 9 29 L13 29 L13 22 C13 20.9 13.9 20 15 20 L17 20 C18.1 20 19 20.9 19 22 L19 29 L23 29 C24.1 29 25 28.1 25 27 L25 15 L16 8 Z" fill="#1a1a2e" />
          <rect x="2" y="14" width="18" height="4" rx="2" fill="#00E599" transform="rotate(-40 2 14)" />
          <rect x="16" y="3" width="18" height="4" rx="2" fill="#00E599" transform="rotate(40 16 3)" />
        </svg>
        PGpilots
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;

  const isSigningUp = sessionStorage.getItem('signingUp') === 'true';
  const authInProgress = sessionStorage.getItem('authInProgress') === 'true';

  if (isSigningUp || authInProgress) return children;

  if (user) {
    // If staff, redirect to staff dashboard
    const isStaff = sessionStorage.getItem('staffMode') === 'true';
    return <Navigate to={isStaff ? '/staff-dashboard' : '/dashboard'} replace />;
  }
  return children;
}

function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

// Staff can only access staff-dashboard, not owner dashboard
function OwnerRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  // Also check if we are in signup mode to avoid redirecting back to dashboard mid-signup
  if (sessionStorage.getItem('signingUp') === 'true') {
    return <Navigate to="/signup" replace />;
  }

  const isStaff = sessionStorage.getItem('staffMode') === 'true';
  if (isStaff) return <Navigate to="/staff-dashboard" replace />;
  return children;
}

// Staff-only route
function StaffRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/staff-login" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login"
          element={<PublicRoute><Login /></PublicRoute>} />

        <Route path="/signup"
          element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Staff login — separate page */}
        <Route path="/staff-login"
          element={<PublicRoute><StaffLogin /></PublicRoute>} />

        {/* Owner dashboard — blocked for staff */}
        <Route path="/dashboard"
          element={<OwnerRoute><Dashboard /></OwnerRoute>} />

        {/* Staff dashboard — staff only */}
        <Route path="/staff-dashboard"
          element={<StaffRoute><StaffDashboard /></StaffRoute>} />

        <Route path="/admin"
          element={<AdminRoute><AdminPanel /></AdminRoute>} />

        <Route path="/tenant-onboard"
          element={<TenantOnboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
