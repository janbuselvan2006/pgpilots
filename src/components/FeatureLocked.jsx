import React from 'react';

/**
 * FeatureLocked
 * ─────────────
 * Shown when admin has disabled a feature for this owner.
 *
 * Props:
 *   name    → feature display name, e.g. "Electricity Bills"
 *   icon    → emoji icon, e.g. "⚡"
 *   message → optional custom message
 */
function FeatureLocked({ name = 'This Feature', icon = '🔒', message }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <span style={styles.lockIcon}>🔒</span>
          <span style={styles.featureIcon}>{icon}</span>
        </div>
        <h2 style={styles.title}>Feature Not Available</h2>
        <p style={styles.featureName}>{name}</p>
        <p style={styles.message}>
          {message || `${name} is not enabled on your current plan. Please contact your administrator to get access.`}
        </p>
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          Disabled by Admin
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', padding: '40px 20px',
  },
  card: {
    background: 'white', borderRadius: '20px',
    padding: '48px 40px', textAlign: 'center',
    maxWidth: '420px', width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
  },
  iconWrap: {
    position: 'relative', display: 'inline-block',
    marginBottom: '24px',
  },
  featureIcon: {
    fontSize: '56px', display: 'block',
    filter: 'grayscale(60%) opacity(0.5)',
  },
  lockIcon: {
    position: 'absolute', bottom: '-4px', right: '-8px',
    fontSize: '22px', zIndex: 1,
  },
  title: {
    fontSize: '22px', fontWeight: '800', color: '#1e293b',
    margin: '0 0 8px',
  },
  featureName: {
    fontSize: '15px', fontWeight: '600', color: '#64748b',
    margin: '0 0 16px',
  },
  message: {
    fontSize: '14px', color: '#94a3b8', lineHeight: '1.6',
    margin: '0 0 24px',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#fef2f2', color: '#dc2626',
    padding: '6px 16px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700',
    border: '1px solid #fecaca',
  },
  badgeDot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: '#dc2626', display: 'inline-block',
  },
};

export default FeatureLocked;