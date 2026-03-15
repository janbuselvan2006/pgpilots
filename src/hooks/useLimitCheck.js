import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_LIMITS = {
  maxTenants: 50,
  maxRooms: 20,
  maxReportsPerMonth: 5,
};

/**
 * useLimitCheck
 * ─────────────
 * Returns current usage vs limits for the logged-in owner.
 *
 * Returns:
 *   limits       → { maxTenants, maxRooms, maxReportsPerMonth }
 *   usage        → { tenants, rooms, reportsThisMonth }
 *   canAdd       → { tenant: bool, room: bool, report: bool }
 *   loading      → bool
 *
 * Usage:
 *   const { canAdd, usage, limits } = useLimitCheck();
 *   if (!canAdd.tenant) return <LimitReached type="tenant" />;
 */
export function useLimitCheck() {
  const [limits, setLimits]   = useState(DEFAULT_LIMITS);
  const [usage, setUsage]     = useState({ tenants: 0, rooms: 0, reportsThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubOwner = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }

      // 1) Real-time listener on owner doc for limits
      unsubOwner = onSnapshot(doc(db, 'pgOwners', user.uid), async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const merged = { ...DEFAULT_LIMITS, ...(data.limits || {}) };
          setLimits(merged);

          // 2) Count tenants
          const tSnap = await getCountFromServer(
            query(collection(db, 'tenants'), where('ownerId', '==', user.uid))
          );
          const tenantCount = tSnap.data().count;

          // 3) Count rooms
          const rSnap = await getCountFromServer(
            query(collection(db, 'rooms'), where('ownerId', '==', user.uid))
          );
          const roomCount = rSnap.data().count;

          // 4) Reports this month (stored on owner doc)
          const reportsThisMonth = data.reportsDownloadedThisMonth || 0;

          setUsage({ tenants: tenantCount, rooms: roomCount, reportsThisMonth });
        }
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubOwner) unsubOwner();
    };
  }, []);

  const canAdd = {
    tenant: usage.tenants < limits.maxTenants,
    room:   usage.rooms   < limits.maxRooms,
    report: usage.reportsThisMonth < limits.maxReportsPerMonth,
  };

  return { limits, usage, canAdd, loading };
}