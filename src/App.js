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

// ── Loading spinner shown while Firebase checks auth state ──
function LoadingScreen() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', flexDirection:'column', gap:'14px',
      background:'#f0f2f8', fontFamily:'DM Sans, Segoe UI, sans-serif',
    }}>
      <div style={{
        width:'36px', height:'36px',
        border:'3px solid #e2e8f0',
        borderTopColor:'#e94560',
        borderRadius:'50%',
        animation:'appspin 0.7s linear infinite',
      }}/>
      <style>{`@keyframes appspin { to { transform: rotate(360deg); } }`}</style>
      <div style={{fontSize:'14px', color:'#94a3b8', fontWeight:'600'}}>
        🏠 PG Manager
      </div>
    </div>
  );
}

// ── PublicRoute: if already logged in → go to dashboard ──
// Prevents logged-in users from seeing login/signup again
function PublicRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// ── ProtectedRoute: if not logged in → go to login ──
function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page — shown to everyone */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth routes — redirect to dashboard if already logged in */}
        <Route path="/login"
          element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup"
          element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected routes — redirect to login if not logged in */}
        <Route path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Admin route */}
        <Route path="/admin"
          element={<AdminRoute><AdminPanel /></AdminRoute>} />

        {/* Catch all → landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;