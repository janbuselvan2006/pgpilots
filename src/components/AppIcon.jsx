import React from 'react';

const iconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

function Svg({ children, strokeWidth = 1.9 }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function AppIcon({ name, size = 18, className = '', style, strokeWidth }) {
  const commonProps = {
    className,
    style: { ...iconStyle, width: size, height: size, ...style },
  };

  switch (name) {
    case 'dashboard':
      return (
        <span {...commonProps}>
          <Svg strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="11" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="17" width="7" height="4" rx="2" />
          </Svg>
        </span>
      );
    case 'rooms':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M3 20v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
            <path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
            <path d="M2 20h20" />
            <path d="M12 4v16" />
          </Svg>
        </span>
      );
    case 'tenants':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M17 20v-1.5A3.5 3.5 0 0 0 13.5 15H7.5A3.5 3.5 0 0 0 4 18.5V20" />
            <circle cx="10.5" cy="8" r="3.5" />
            <path d="M20 19v-1a3 3 0 0 0-2.5-2.95" />
            <path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.4" />
          </Svg>
        </span>
      );
    case 'rent':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M12 3v18" />
            <path d="M16.5 6.5H9.8a3 3 0 0 0 0 6h4.4a3 3 0 0 1 0 6H7" />
          </Svg>
        </span>
      );
    case 'electricity':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </Svg>
        </span>
      );
    case 'reports':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M5 19V9" />
            <path d="M12 19V5" />
            <path d="M19 19v-7" />
          </Svg>
        </span>
      );
    case 'settings':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .35 1.77l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04a1.6 1.6 0 0 0-1.77-.35 1.6 1.6 0 0 0-.99 1.47V21a2 2 0 1 1-4 0v-.06a1.6 1.6 0 0 0-.99-1.47 1.6 1.6 0 0 0-1.77.35l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.99H3a2 2 0 1 1 0-4h.13A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.35-1.77l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.6 1.6 0 0 0 8.85 4H8.9a1.6 1.6 0 0 0 .99-1.47V2.5a2 2 0 1 1 4 0v.03A1.6 1.6 0 0 0 14.88 4h.05a1.6 1.6 0 0 0 1.77-.35l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.6 1.6 0 0 0 19.4 9c0 .65.38 1.24.97 1.5.16.07.34.11.52.11H21a2 2 0 1 1 0 4h-.11c-.18 0-.36.04-.52.11-.59.26-.97.85-.97 1.5Z" />
          </Svg>
        </span>
      );
    case 'food':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M6 3v8" />
            <path d="M10 3v8" />
            <path d="M8 3v18" />
            <path d="M15 3v9a3 3 0 0 0 3 3h1V3" />
          </Svg>
        </span>
      );
    case 'notification':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M18 9a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </Svg>
        </span>
      );
    case 'add':
      return (
        <span {...commonProps}>
          <Svg strokeWidth={2.3}>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </Svg>
        </span>
      );
    case 'close':
      return (
        <span {...commonProps}>
          <Svg strokeWidth={2.3}>
            <path d="m6 6 12 12" />
            <path d="m18 6-12 12" />
          </Svg>
        </span>
      );
    case 'delete':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M4 7h16" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
          </Svg>
        </span>
      );
    case 'logout':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </Svg>
        </span>
      );
    case 'warning':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M12 4 3 20h18L12 4Z" />
            <path d="M12 9v5" />
            <path d="M12 17h.01" />
          </Svg>
        </span>
      );
    case 'success':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </Svg>
        </span>
      );
    case 'pending':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </Svg>
        </span>
      );
    case 'table':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
            <path d="M8 5v14" />
            <path d="M16 5v14" />
          </Svg>
        </span>
      );
    case 'cards':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="4" y="5" width="7" height="6" rx="1.5" />
            <rect x="13" y="5" width="7" height="6" rx="1.5" />
            <rect x="4" y="13" width="7" height="6" rx="1.5" />
            <rect x="13" y="13" width="7" height="6" rx="1.5" />
          </Svg>
        </span>
      );
    case 'upload':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M12 16V5" />
            <path d="m8 9 4-4 4 4" />
            <path d="M5 19h14" />
          </Svg>
        </span>
      );
    case 'download':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M12 5v11" />
            <path d="m16 12-4 4-4-4" />
            <path d="M5 19h14" />
          </Svg>
        </span>
      );
    case 'docs':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
            <path d="M14 3v5h5" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
          </Svg>
        </span>
      );
    case 'file':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
            <path d="M14 3v5h5" />
          </Svg>
        </span>
      );
    case 'image':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.2" />
            <path d="m21 15-4-4-6 6-3-3-5 5" />
          </Svg>
        </span>
      );
    case 'folder':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          </Svg>
        </span>
      );
    case 'search':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.2-4.2" />
          </Svg>
        </span>
      );
    case 'phone':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M7 4h3l1 4-2 1.5a14 14 0 0 0 5.5 5.5L16 13l4 1v3a2 2 0 0 1-2.2 2A16 16 0 0 1 5 6.2 2 2 0 0 1 7 4Z" />
          </Svg>
        </span>
      );
    case 'copy':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="9" y="9" width="10" height="10" rx="2" />
            <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
          </Svg>
        </span>
      );
    case 'company':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M9 8h.01" />
            <path d="M15 8h.01" />
            <path d="M9 12h.01" />
            <path d="M15 12h.01" />
            <path d="M9 16h6" />
          </Svg>
        </span>
      );
    case 'pg':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M4 20h16" />
            <path d="M6 20V8l6-4 6 4v12" />
            <path d="M10 20v-5h4v5" />
          </Svg>
        </span>
      );
    case 'bed':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M3 18v-6" />
            <path d="M21 18v-6" />
            <path d="M3 14h18" />
            <path d="M6 14V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5" />
            <path d="M13 12h4a4 4 0 0 1 4 4v2" />
          </Svg>
        </span>
      );
    case 'calendar':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4" />
            <path d="M8 3v4" />
            <path d="M3 10h18" />
          </Svg>
        </span>
      );
    case 'id':
      return (
        <span {...commonProps}>
          <Svg>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <circle cx="8" cy="12" r="2" />
            <path d="M13 10h5" />
            <path d="M13 14h4" />
          </Svg>
        </span>
      );
    case 'key':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="8" cy="12" r="3" />
            <path d="M11 12h10" />
            <path d="M17 12v3" />
            <path d="M14 12v2" />
          </Svg>
        </span>
      );
    case 'receipt':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1Z" />
            <path d="M9 8h6" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </Svg>
        </span>
      );
    case 'history':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
            <path d="M12 7v5l3 2" />
          </Svg>
        </span>
      );
    case 'occupancy':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M4 20V10" />
            <path d="M10 20V4" />
            <path d="M16 20v-7" />
            <path d="M22 20v-11" />
          </Svg>
        </span>
      );
    case 'vacant':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 8.5l7 7" />
          </Svg>
        </span>
      );
    case 'info':
      return (
        <span {...commonProps}>
          <Svg>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10v6" />
            <path d="M12 7h.01" />
          </Svg>
        </span>
      );
    case 'eye':
      return (
        <span {...commonProps}>
          <Svg>
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.5" />
          </Svg>
        </span>
      );
    default:
      return null;
  }
}
