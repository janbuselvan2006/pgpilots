import React from 'react';

/**
 * LimitReached
 * ─────────────
 * Shown when owner has hit their usage limit.
 *
 * Props:
 *   type    → 'tenant' | 'room' | 'report'
 *   used    → current count
 *   max     → limit
 */
const CONFIG = {
  tenant: { icon: '👥', label: 'Tenant Limit Reached',       unit: 'tenants',          action: 'add more tenants'    },
  room:   { icon: '🛏️', label: 'Room Limit Reached',         unit: 'rooms',            action: 'add more rooms'      },
  report: { icon: '📊', label: 'Report Download Limit Reached', unit: 'report downloads', action: 'download more reports' },
};

function LimitReached({ type = 'tenant', used = 0, max = 0 }) {
  const cfg = CONFIG[type] || CONFIG.tenant;
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 100;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <span style={styles.mainIcon}>{cfg.icon}</span>
          <span style={styles.lockBadge}>🔒</span>
        </div>

        <h2 style={styles.title}>{cfg.label}</h2>
        <p style={styles.desc}>
          You've used <strong>{used}</strong> of your <strong>{max}</strong> {cfg.unit}.
          Contact your administrator to {cfg.action}.
        </p>

        {/* Usage bar */}
        <div style={styles.barWrap}>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${pct}%` }} />
          </div>
          <div style={styles.barLabel}>{used} / {max} {cfg.unit}</div>
        </div>

        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          Limit reached — contact admin
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px',
  },
  card: {
    background: 'white', borderRadius: '20px', padding: '40px 36px',
    textAlign: 'center', maxWidth: '400px', width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9',
  },
  iconWrap: { position: 'relative', display: 'inline-block', marginBottom: '20px' },
  mainIcon: { fontSize: '52px', display: 'block', filter: 'grayscale(30%) opacity(0.7)' },
  lockBadge: { position: 'absolute', bottom: '-4px', right: '-8px', fontSize: '20px' },
  title:  { fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: '0 0 10px' },
  desc:   { fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' },
  barWrap: { marginBottom: '20px' },
  barTrack: { height: '8px', background: '#fef2f2', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' },
  barFill:  { height: '100%', background: 'linear-gradient(90deg,#f59e0b,#dc2626)', borderRadius: '99px', transition: 'width 0.4s' },
  barLabel: { fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#fef2f2', color: '#dc2626',
    padding: '6px 16px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700', border: '1px solid #fecaca',
  },
  badgeDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' },
};

export default LimitReached;