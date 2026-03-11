import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function AdminRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'pgOwners', user.uid));
        if (snap.exists() && snap.data().isAdmin === true) {
          setIsAdmin(true);
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        navigate('/dashboard');
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  if (checking) return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      fontSize: '16px', color: '#94a3b8',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      🔐 Checking access...
    </div>
  );

  return isAdmin ? children : null;
}

export default AdminRoute;