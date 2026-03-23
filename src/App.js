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
        🏠 PGpilots
      </div>
    </div>
  );
}

// ✅ FIXED: Don't redirect if user is mid-signup
function PublicRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  const isSigningUp = sessionStorage.getItem('signingUp') === 'true';
  if (isSigningUp) return children;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
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
        <Route path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin"
          element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;