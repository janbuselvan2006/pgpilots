import React from 'react';
import { useOwnerFeatures } from '../hooks/useOwnerFeatures';
import FeatureLocked from './FeatureLocked';

// ─────────────────────────────────────────
// Loading spinner (shown while Firestore loads)
// ─────────────────────────────────────────
function FeatureLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontSize: '14px' }}>Loading...</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Account blocked screen
// ─────────────────────────────────────────
function AccountBlocked() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '48px 40px',
        textAlign: 'center', maxWidth: '420px', width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #fecaca',
      }}>
        <div style={{ fontSize: '56px', marginBottom: '24px' }}>🚫</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: '0 0 12px' }}>Account Suspended</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 24px' }}>
          Your account has been temporarily suspended. Please contact support to resolve this.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#fef2f2', color: '#dc2626',
          padding: '6px 16px', borderRadius: '20px',
          fontSize: '12px', fontWeight: '700', border: '1px solid #fecaca',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          Account Blocked
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// HOC: withFeatureGuard(featureKey, name, icon)
// Wraps any page component with a feature check
// ─────────────────────────────────────────
function withFeatureGuard(WrappedComponent, featureKey, featureName, featureIcon) {
  return function GuardedComponent(props) {
    const { features, loading, isActive } = useOwnerFeatures();

    if (loading)   return <FeatureLoading />;
    if (!isActive) return <AccountBlocked />;
    if (!features[featureKey]) {
      return <FeatureLocked name={featureName} icon={featureIcon} />;
    }

    return <WrappedComponent {...props} />;
  };
}

// ─────────────────────────────────────────
// Ready-made guards for all 5 features
// ─────────────────────────────────────────

/**
 * withElectricityGuard
 * Usage: export default withElectricityGuard(ElectricityPage);
 */
export function withElectricityGuard(Component) {
  return withFeatureGuard(Component, 'electricity', 'Electricity Bills', '⚡');
}

/**
 * withPaymentsGuard
 * Usage: export default withPaymentsGuard(PaymentsPage);
 */
export function withPaymentsGuard(Component) {
  return withFeatureGuard(Component, 'payments', 'Payments / Rent', '💳');
}

/**
 * withRoomsGuard
 * Usage: export default withRoomsGuard(RoomsPage);
 */
export function withRoomsGuard(Component) {
  return withFeatureGuard(Component, 'rooms', 'Rooms Management', '🛏️');
}

/**
 * withTenantsGuard
 * Usage: export default withTenantsGuard(TenantsPage);
 */
export function withTenantsGuard(Component) {
  return withFeatureGuard(Component, 'tenants', 'Tenant Management', '👥');
}

/**
 * withReportsGuard
 * Usage: export default withReportsGuard(ReportsPage);
 */
export function withReportsGuard(Component) {
  return withFeatureGuard(Component, 'reports', 'Reports / Analytics', '📊');
}

export default withFeatureGuard;