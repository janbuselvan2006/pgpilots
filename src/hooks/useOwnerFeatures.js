import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_FEATURES = {
  electricity: true,
  payments: true,
  rooms: true,
  tenants: true,
  reports: true,
};

/**
 * useOwnerFeatures
 * ─────────────────
 * Listens to the current owner's Firestore doc in real-time.
 * Returns { features, loading, isActive }
 *
 * features.electricity → true/false
 * features.payments    → true/false
 * features.rooms       → true/false
 * features.tenants     → true/false
 * features.reports     → true/false
 *
 * Usage:
 *   const { features, loading } = useOwnerFeatures();
 *   if (!features.electricity) return <FeatureLocked name="Electricity Bills" />;
 */
export function useOwnerFeatures() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    // Wait for auth to resolve first
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Real-time listener on pgOwners/{uid}
      unsubscribeSnapshot = onSnapshot(
        doc(db, 'pgOwners', user.uid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setFeatures({ ...DEFAULT_FEATURES, ...(data.features || {}) });
            setIsActive(data.isActive !== false);
          }
          setLoading(false);
        },
        (err) => {
          console.error('useOwnerFeatures error:', err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return { features, loading, isActive };
}