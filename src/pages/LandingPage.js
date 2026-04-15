import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Unique Custom Geometric Agency Icons ── */
const Icons = {
  logo: (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" style={{ marginRight: '8px', transform: 'translateY(-2px)' }}>
      <path d="M16 11 L4 21 V30 H12 V23 H20 V30 H28 V21 Z" fill="var(--navy)" />
      <path d="M17 6 L7 14 L9.5 17 L19.5 9 Z" fill="var(--brand)" />
    </svg>
  ),
  badgeIcon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
      <circle cx="12" cy="12" r="8" fill="var(--brand)"></circle>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="var(--navy)"></path>
    </svg>
  ),
  cursor: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--brand)" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path>
    </svg>
  ),
  bed: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M14 2 L18 2 L19 5 C21 5.5 22.5 6.5 24 8 L27 7 L29 10 L26 12 C26.5 13 27 14.5 27 16 C27 17.5 26.5 19 26 20 L29 22 L27 25 L24 24 C22.5 25.5 21 26.5 19 27 L18 30 L14 30 L13 27 C11 26.5 9.5 25.5 8 24 L5 25 L3 22 L6 20 C5.5 19 5 17.5 5 16 C5 14.5 5.5 13 6 12 L3 10 L5 7 L8 8 C9.5 6.5 11 5.5 13 5 Z" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="16" r="8" stroke="var(--navy)" strokeWidth="2.5" fill="none" />
      <path d="M10 16.5 L16 11 L22 16.5" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 15.5 V22 H20 V15.5" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <path d="M14 22 V17 H18 V22" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  users: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="var(--navy)" strokeWidth="2.5" />
      <circle cx="16" cy="12" r="5" fill="var(--navy)" />
      <path d="M7 26.5 C7 21 11 18 16 18 C21 18 25 21 25 26.5 Z" fill="var(--navy)" />
    </svg>
  ),
  wallet: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M10 4 H24 V22 H10 V4 Z" stroke="var(--navy)" strokeWidth="2.5" fill="none" />
      <path d="M10 4 C8 4 6 6 6 8 V24 C6 26 8 28 10 28 H24 C26 28 28 26 28 24 V22" stroke="var(--navy)" strokeWidth="2.5" fill="none" />
      <path d="M6 8 C6 6 8 6 10 6" stroke="var(--navy)" strokeWidth="2.5" fill="none" />
      <line x1="12" y1="12" x2="16" y2="12" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="20" y2="16" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="20" x2="20" y2="20" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23" cy="11" r="5" fill="var(--bg-main)" stroke="var(--navy)" strokeWidth="2" />
      <line x1="26.5" y1="14.5" x2="30" y2="18" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M23 8 V14 M21.5 10 C21.5 9 22 8.5 23 8.5 C24 8.5 24.5 9 24.5 9.5 C24.5 10.5 21.5 10.5 21.5 11.5 C21.5 12.5 22 13.5 23 13.5 C24 13.5 24.5 13 24.5 12" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  zap: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 2 L30 28 H2 Z" fill="#FFCF00" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 9 L12 17 H16.5 L15 21 L13 21 L16 25 L19 21 L17 21 L18.5 17 H14 L18 9 Z" fill="var(--navy)" />
    </svg>
  ),
  chart: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M13 3 H24 A3 3 0 0 1 27 6 V26 A3 3 0 0 1 24 29 H8 A3 3 0 0 1 5 26 V11 Z" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M5 11 H10 A3 3 0 0 0 13 8 V3" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <path d="M14 13 H18 V18 H21 L16 23 L11 18 H14 V13 Z" fill="var(--navy)" />
    </svg>
  ),
  message: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M12 24 L8 28 L9.5 22.5 A11 11 0 1 1 12 24 Z" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11 C13 11 12 12 13 13 C13.5 16 16 18.5 19 19 C20 19 21 18 21 17 C21 16 19 15 18.5 15 C17.5 15 17 16 16 15.5 C15 15 15 14 15.5 13 C16 12 16 11.5 16 10.5 C16 9.5 15 11 14 11 Z" fill="var(--navy)" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--brand)" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon>
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  rocket: (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" style={{ marginRight: '8px' }}>
      <defs>
        <mask id="stamp-mask">
          <rect x="0" y="0" width="32" height="32" fill="white" />
          <rect x="2" y="10" width="28" height="12" rx="2" fill="black" transform="rotate(-20 16 16)" />
        </mask>
      </defs>
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5" mask="url(#stamp-mask)" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.5" mask="url(#stamp-mask)" />

      <rect x="2" y="10" width="28" height="12" rx="2" stroke="currentColor" strokeWidth="2.5" transform="rotate(-20 16 16)" />
      <text x="16.5" y="19" fill="currentColor" fontSize="8" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" transform="rotate(-20 16 16)" letterSpacing="1px">TRIAL</text>
    </svg>
  ),
  phoneCall: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ marginRight: '8px' }}>
      <circle cx="16" cy="16" r="10" stroke="var(--navy)" strokeWidth="2.5" />
      <path d="M13 19L19 13" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="19" cy="13" r="2" fill="var(--navy)" />
    </svg>
  ),
  whatsappBtn: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{ marginRight: '8px' }}>
      <path d="M12 24 L8 28 L9.5 22.5 A11 11 0 1 1 12 24 Z" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11 C13 11 12 12 13 13 C13.5 16 16 18.5 19 19 C20 19 21 18 21 17 C21 16 19 15 18.5 15 C17.5 15 17 16 16 15.5 C15 15 15 14 15.5 13 C16 12 16 11.5 16 10.5 C16 9.5 15 11 14 11 Z" fill="var(--navy)" />
    </svg>
  ),
  heart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--brand)" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  ),
};

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // ── Intersection Observer for Scroll Reveals
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(r => observer.observe(r));

    // ── Nav background on scroll (Glassmorphism)
    const handleScroll = () => {
      const nav = document.querySelector('.lp-nav');
      if (!nav) return;
      if (window.scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll);

    // ── Counter animation
    const animateCounter = (el, target, suffix = '') => {
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / 2000, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const statsObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const nums = e.target.querySelectorAll('.stat-num');
          if (nums[0]) animateCounter(nums[0], 100, '+');
          if (nums[1]) animateCounter(nums[1], 1000, '+');
          statsObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    const trustedSection = document.querySelector('.trusted-section');
    if (trustedSection) statsObserver.observe(trustedSection);

  }, []);

  const goSignup = () => navigate('/signup');
  const goLogin = () => navigate('/login');

  return (
    <>
      <style>{`
        /* Dual-Tone Navy & Mint Aesthetic */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --bg-main: #FFFFFF;
          --bg-surface: #F8FAFC;
          --bg-elevated: #FFFFFF;
          
          --border-subtle: #E2E8F0;
          
          --brand: #00E599; /* Vibrant Mint Green */
          --brand-hover: #00CC88;
          --brand-light: #E6FFF6;
          
          --navy: #0A1930; /* Deep Midnight Navy */
          --navy-light: #1E293B;
          
          --text-main: #0A1930;
          --text-muted: #64748B;
          --text-light: #94A3B8;
        }

        .lp-body { 
          background: var(--bg-main); 
          color: var(--text-main); 
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; 
          overflow-x: hidden; 
          position: relative; 
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        .lp-body *, .lp-body *::before, .lp-body *::after { box-sizing: border-box; }

        /* ── HERO GRADIENT BACKGROUND ── */
        .hero-gradient-mesh {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 900px;
          background: linear-gradient(180deg, rgba(255,255,255,0) 70%, var(--bg-main) 100%),
                      radial-gradient(circle at 15% 50%, rgba(0, 229, 153, 0.15) 0%, rgba(255,255,255,0) 50%),
                      radial-gradient(circle at 85% 30%, rgba(10, 25, 48, 0.08) 0%, rgba(255,255,255,0) 50%),
                      radial-gradient(circle at 50% 80%, rgba(0, 229, 153, 0.2) 0%, rgba(255,255,255,0) 60%);
          z-index: 0;
          pointer-events: none;
        }

        /* ── FLOATING NAVBAR (Pill shaped) ── */
        .nav-wrapper {
          position: fixed; top: 24px; left: 0; right: 0;
          display: flex; justify-content: center; z-index: 100;
          padding: 0 20px;
        }
        .lp-nav { 
          background: rgba(255, 255, 255, 0.85); 
          backdrop-filter: blur(12px);
          border: 1px solid rgba(10, 25, 48, 0.1);
          border-radius: 100px;
          padding: 12px 16px 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; max-width: 1000px;
          box-shadow: 0 4px 24px rgba(10, 25, 48, 0.06);
        }
        .lp-nav-logo { 
          font-size: 18px; font-weight: 800; color:var(--text-main); 
          display:flex; align-items:center; cursor:pointer; letter-spacing: -0.04em;
        }
        .lp-nav-logo span { color: var(--text-muted); font-weight: 500; }
        .lp-nav-links { display:flex; align-items:center; gap:24px; list-style:none; margin:0; padding:0; position: absolute; left: 50%; transform: translateX(-50%); }
        @media(max-width: 900px) { .lp-nav-links { display: none; } }
        .lp-nav-links a { color:var(--text-muted); text-decoration:none; font-size:14px; font-weight:600; transition:color 0.2s; cursor:pointer; }
        .lp-nav-links a:hover { color:var(--navy); }
        .lp-nav-cta { 
          background: var(--navy); color: var(--brand); /* Navy Background, Mint Text for ultimate pop */
          padding: 10px 24px; border-radius: 100px; font-weight: 700; 
          transition: all 0.2s; border:none; cursor:pointer; font-size:14px; 
        }
        .lp-nav-cta:hover { background: var(--navy-light); box-shadow: 0 4px 12px rgba(10, 25, 48, 0.3); transform: translateY(-1px); }

        /* ── HERO SECTION ── */
        .lp-hero { 
          padding: 180px 24px 0px; 
          position:relative; 
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
        }
        
        .hero-badge { 
          position: relative; z-index: 1;
          display:inline-flex; align-items:center; 
          background: rgba(255,255,255,0.9); border: 1.5px solid var(--navy); 
          color: var(--navy); padding:6px 16px; border-radius:100px; 
          font-size:13px; font-weight:700; margin-bottom:32px; 
          box-shadow: 4px 4px 0px var(--brand-light); /* cute neo-brutalist hint */
          animation:fadeUp 0.6s ease both;
        }

        .lp-hero h1 { 
          position: relative; z-index: 1;
          font-size:clamp(40px, 6.5vw, 76px); font-weight: 500; line-height: 1.1; 
          color:var(--text-main); margin-bottom:24px; animation:fadeUp 0.6s 0.1s ease both; 
          letter-spacing:-0.03em; max-width: 900px;
        }
        .lp-hero h1 .accent-pill { 
          display: inline-block;
          background: var(--brand);
          color: var(--navy);
          padding: 0px 24px;
          border-radius: 20px;
          transform: translateY(4px);
          box-shadow: 0 8px 24px rgba(0, 229, 153, 0.3);
          font-weight: 700;
          border: 2px solid var(--navy); /* Deep navy outline for pop */
        }
        .hero-sub { 
          position: relative; z-index: 1;
          font-size:clamp(16px, 1.5vw, 18px); color:var(--text-muted); max-width:650px; 
          line-height:1.6; margin-bottom:48px; font-weight:500; 
          animation:fadeUp 0.6s 0.2s ease both; 
        }

        .btn-primary { 
          background:var(--navy); color:var(--brand); padding:14px 28px; border-radius:100px; 
          text-decoration:none; font-weight:700; font-size:15px; 
          transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center; 
          border: 2px solid var(--navy); cursor:pointer; font-family: inherit; 
          box-shadow: 0 0 0 0 rgba(10, 25, 48, 0);
        }
        .btn-primary:hover { 
          background:var(--navy-light); transform:translateY(-1px); 
          box-shadow: 0 8px 24px rgba(10, 25, 48, 0.25);
        }
        .btn-secondary { 
          background: transparent; color:var(--navy); padding:14px 28px; 
          border-radius:100px; text-decoration:none; font-weight:600; font-size:15px; 
          border:2px solid var(--border-subtle); transition:all 0.2s; 
          display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-family: inherit; 
        }
        .btn-secondary:hover { border-color: var(--navy); background: var(--bg-surface); }
        .hero-btns { display:flex; gap:16px; justify-content:center; flex-wrap:wrap; animation:fadeUp 0.6s 0.3s ease both; position: relative; z-index: 10; margin-bottom: 32px;}

        /* ── HERO MOCKUPS (Abstracted Phone & Cards) ── */
        .hero-visual {
          position: relative; z-index: 1;
          width: 100%; max-width: 900px; height: 560px;
          margin-top: 64px;
          animation:fadeUp 0.8s 0.3s ease both;
        }
        .phone-frame {
          position: absolute; left: 50%; transform: translateX(-50%); top: 0;
          width: 320px; height: 600px;
          background: white; border-radius: 48px;
          border: 14px solid var(--navy);
          box-shadow: 0 24px 64px rgba(10, 25, 48, 0.15);
          overflow: hidden;
          z-index: 1;
        }
        .phone-notch {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 120px; height: 30px;
          background: var(--navy); border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; z-index: 20;
        }
        .app-preview { width: 100%; height: 100%; background: var(--bg-surface); padding-top: 50px; }
        .app-header { display: flex; align-items: center; gap: 12px; padding: 0 20px 20px; }
        .app-avatar {
          width: 40px; height: 40px; border-radius: 50%; background: var(--brand-light); 
          border: 2px solid var(--navy); display:flex; align-items:center; justify-content:center;
        }
        .app-avatar svg { width: 22px; height: 22px; }
        .app-avatar svg path { stroke-width: 1.5; }
        .app-card {
          margin: 0 20px; background: var(--navy); border-radius: 20px; padding: 20px;
          border: 2px solid var(--navy); box-shadow: 0 12px 24px rgba(10,25,48,0.15);
        }
        .app-list-item {
          background: white; border: 2px solid var(--border-subtle); border-radius: 16px;
          padding: 12px; display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
        }
        .app-list-avatar {
          width: 36px; height: 36px; border-radius: 12px; background: var(--brand); border: 2px solid var(--navy);
          display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--navy); font-size:14px;
        }
        .app-list-btn {
          background: var(--brand-light); color: var(--navy); padding: 6px 12px; border-radius: 100px;
          font-size: 11px; font-weight: 700; border: 2px solid var(--navy);
        }

        .float-card-left {
          position: absolute; left: 5%; top: 35%;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-radius: 24px; padding: 24px;
          box-shadow: 0 20px 40px rgba(10, 25, 48, 0.08);
          border: 2px solid var(--navy);
          z-index: 2; width: 280px; text-align: left;
          animation: floatLeft 6s ease-in-out infinite;
        }
        .float-card-right {
          position: absolute; right: 8%; top: 15%;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-radius: 24px; padding: 20px;
          box-shadow: 0 20px 40px rgba(10, 25, 48, 0.08);
          border: 2px solid var(--navy);
          z-index: 2; width: 260px; text-align: left;
          animation: floatRight 7s ease-in-out infinite;
        }

        .mini-tooltip-1 {
          position: absolute; left: 25%; top: -10%;
          background: var(--navy); color: var(--brand); font-size: 13px; font-weight: 700;
          padding: 8px 16px; border-radius: 100px; border-bottom-right-radius: 4px;
          border: 2px solid var(--navy);
        }
        .mini-tooltip-2 {
          position: absolute; right: 35%; top: 60%;
          background: var(--brand); color: var(--navy); font-size: 13px; font-weight: 700;
          padding: 8px 16px; border-radius: 100px; border-top-left-radius: 4px;
          display: flex; align-items: center; gap: 4px; z-index: 3;
          border: 2px solid var(--navy);
        }

        @keyframes floatLeft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes floatRight { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

        /* ── TRUSTED LOGOS ── */
        .trusted-section {
          text-align: center; padding: 100px 24px 60px;
          background: var(--bg-main); position: relative; z-index: 10;
        }
        .trusted-text { font-size: 20px; font-weight: 600; color: var(--navy); margin-bottom: 40px; }
        .trusted-logos { display:flex; gap:64px; justify-content:center; flex-wrap:wrap; width:100%; max-width:800px; margin: 0 auto; }
        .stat-item { text-align:center; }
        .stat-num { font-size:32px; font-weight:800; color:var(--navy); display:block; letter-spacing: -0.02em; }
        .stat-label { font-size:14px; font-weight:600; color:var(--text-muted); margin-top:4px; }

        /* ── SECTIONS ── */
        .lp-section { padding:80px 40px; max-width:1200px; margin:0 auto; }
        .section-tag { 
          display: inline-flex; align-items: center;
          font-size:13px; font-weight:700; color:var(--navy); 
          background: var(--brand); padding: 8px 16px; border-radius: 100px;
          text-transform:uppercase; margin-bottom:24px; letter-spacing: 0.05em;
          border: 1.5px solid var(--navy);
        }
        .section-title { 
          font-size:clamp(32px, 4vw, 48px); font-weight:700; color:var(--text-main); 
          line-height:1.1; letter-spacing:-0.03em; margin-bottom:20px; 
        }
        .section-sub { font-size:16px; color:var(--text-muted); line-height:1.6; max-width:560px; font-weight:500; }

        /* ── PAIN POINTS (Neo-Bento Layout) ── */
        .pain-grid { 
          display:grid; grid-template-columns:1fr 1fr; gap:24px; 
          margin-top:48px; 
        }
        .pain-item { 
          padding:40px; background:var(--bg-main); 
          border: 2px solid var(--border-subtle); border-radius: 24px;
          position:relative; transition:all 0.3s; 
          box-shadow: 0 4px 20px rgba(10,25,48,0.02);
        }
        .pain-item:hover { transform: translateY(-4px); box-shadow: 6px 6px 0px var(--brand); border-color: var(--navy); }
        .pain-quote { font-size:18px; font-weight:500; color:var(--text-main); line-height:1.6; margin-bottom:24px; position:relative; z-index:2;}
        .pain-quote strong { font-weight: 700; color: var(--navy); background: var(--brand-light); padding: 0 4px; border-radius: 4px; }
        .pain-solution { display:flex; align-items:flex-start; font-size:14px; color:var(--text-muted); font-weight:600; }
        .pain-num { 
          display: inline-block; width: fit-content;
          font-size:14px; font-weight:800; color:var(--brand); 
          background: var(--navy); padding: 4px 12px; 
          border-radius: 100px; margin-bottom: 16px;
        }

        /* ── FEATURES ── */
        .features-grid { 
          display:grid; grid-template-columns:repeat(3,1fr); gap:24px; 
          margin-top:48px; 
        }
        .feature-card { 
          background:var(--bg-main); padding:40px 32px; 
          border: 2px solid var(--border-subtle); border-radius: 24px;
          transition:all 0.3s; position:relative; 
        }
        .feature-card:hover { border-color: var(--navy); box-shadow: 6px 6px 0px var(--brand); }
        .feature-icon { 
          width:56px; height:56px; background:var(--brand-light); 
          border: 2px solid var(--navy);
          border-radius:16px; display:flex; align-items:center; justify-content:center; 
          margin-bottom:24px; 
        }
        .feature-title { font-size:18px; font-weight:700; color:var(--navy); margin-bottom:12px; letter-spacing: -0.01em; }
        .feature-desc { font-size:14px; color:var(--text-muted); line-height:1.6; font-weight:500; }

        /* ── HOW IT WORKS ── */
        .steps-row { 
          display:grid; grid-template-columns:repeat(4,1fr); gap:32px; 
          margin-top:48px; position:relative; 
        }
        .step-item { position: relative; z-index: 1; }
        .step-num { 
          width: 48px; height: 48px; background: var(--brand); color: var(--navy);
          border: 2px solid var(--navy);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size:18px; font-weight:800; margin-bottom:20px; 
        }
        .step-title { font-size:18px; font-weight:700; color:var(--text-main); margin-bottom:12px; letter-spacing: -0.01em;}
        .step-desc { font-size:14px; color:var(--text-muted); line-height:1.6; font-weight:500; }

        /* ── PRICING ── */
        .pricing-section { background: var(--bg-surface); padding: 80px 0; border-top: 2px solid var(--border-subtle); border-bottom: 2px solid var(--border-subtle);}
        .pricing-card { 
          max-width: 440px; margin: 48px auto 0;
          background:var(--bg-main); border:2px solid var(--navy); 
          border-radius:32px; padding:48px 40px; position:relative; 
          box-shadow: 8px 8px 0px var(--brand);
        }
        .price-plan { font-size:16px; font-weight:700; color:var(--brand); text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-bottom:16px; }
        .price-amount { font-size:56px; font-weight:800; color:var(--navy); line-height:1; margin-bottom:8px; text-align: center; letter-spacing: -0.04em;}
        .price-amount span { font-size:16px; font-weight:600; color:var(--text-muted); }
        .price-period { font-size:14px; color:var(--text-muted); margin-bottom:40px; text-align: center; font-weight:500; }
        .price-features { list-style:none; margin-bottom:40px; padding:0; border-top: 2px dashed var(--border-subtle); padding-top: 40px;}
        .price-features li { font-size:15px; color:var(--text-main); padding:10px 0; display:flex; align-items:center; font-weight: 600;}
        .btn-large {
          display: block; width: 100%; text-align: center;
          background: var(--navy); color: var(--brand); padding: 16px; border-radius: 100px; border: 2px solid var(--navy);
          font-weight: 700; text-decoration: none; cursor: pointer; transition: all 0.2s;
        }
        .btn-large:hover { background: var(--navy-light); box-shadow: 0 12px 24px rgba(10, 25, 48, 0.25); transform: translateY(-2px);}

        /* ── TESTIMONIALS ── */
        .testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:48px; }
        .testi-card { 
          background:var(--bg-main); border:2px solid var(--border-subtle); 
          border-radius:24px; padding:40px 32px; transition:all 0.3s; 
        }
        .testi-card:hover { border-color:var(--navy); box-shadow: 6px 6px 0px var(--brand); transform: translateY(-4px); }
        .testi-stars { margin-bottom:24px; display: flex; }
        .testi-text { font-size:15px; color:var(--text-main); line-height:1.6; margin-bottom:32px; font-weight: 500;}
        .testi-author { display:flex; align-items:center; gap:16px; }
        .testi-avatar { 
          width:44px; height:44px; border-radius:50%; background:var(--brand); border: 2px solid var(--navy); 
          display:flex; align-items:center; 
          justify-content:center; font-weight:800; color:var(--navy); font-size:16px; 
        }
        .testi-name { font-size:15px; font-weight:700; color:var(--navy); }
        .testi-loc { font-size:12px; color:var(--text-muted); margin-top:2px; font-weight:600;}

        /* ── CTA ── */
        .cta-wrapper { 
          padding:120px 40px; text-align:center; position:relative; overflow:hidden; 
          background: var(--brand-light); border-top: 2px solid var(--border-subtle);
        }
        
        .cta-wrapper h2 { font-size:clamp(36px, 5vw, 64px); font-weight:800; color:var(--navy); line-height:1.1; letter-spacing:-0.03em; margin-bottom:24px; }
        .cta-wrapper p { font-size:18px; color:var(--navy-light); margin-bottom:40px; font-weight: 500;}

        /* ── FOOTER ── */
        .lp-footer { 
          padding:40px; border-top:2px solid var(--border-subtle); background: var(--bg-surface);
          display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:24px; 
        }
        .footer-logo { font-size:16px; font-weight:800; color:var(--navy); display:flex; align-items:center; letter-spacing: -0.02em; }
        .footer-links { display:flex; gap:32px; }
        .footer-links a { font-size:14px; color:var(--text-muted); text-decoration:none; transition:color 0.2s; font-weight: 600;}
        .footer-links a:hover { color:var(--navy); }
        .footer-copy { font-size:13px; color:var(--text-muted); font-weight: 500;}

        @media(max-width:900px) {
          .lp-nav-links { display: none; }
          .pain-grid,.features-grid,.testi-grid { grid-template-columns:1fr; }
          .steps-row { grid-template-columns:1fr 1fr; }
          .hero-visual { display: none; }
          .lp-hero { padding-bottom: 80px; }
          .trusted-logos { gap: 32px; }
        }

        @media(max-width:768px) {
          .lp-nav { padding:16px 20px; }
          .lp-section, .cta-wrapper, .lp-footer { padding-left:20px; padding-right:20px; }
          .steps-row { grid-template-columns:1fr; }
          .hero-stats { gap: 32px; flex-direction: column; align-items: center; }
          .hero-btns { flex-direction: column; width: 100%; display: flex; align-items: stretch; }
          .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="lp-body">

        <div className="hero-gradient-mesh"></div>

        {/* FLOATING NAV */}
        <div className="nav-wrapper">
          <nav className="lp-nav">
            <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {Icons.logo} PG<span>pilots</span>
            </div>
            <ul className="lp-nav-links">
              <li><a href="#pain">Problems</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <a href="#login" style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); goLogin(); }}>Sign In</a>
              <button className="lp-nav-cta" onClick={goSignup}>Start Free Trial</button>
            </div>
          </nav>
        </div>

        {/* HERO */}
        <section className="lp-hero">

          <div className="hero-badge">
            {Icons.badgeIcon} Built for Indian PG Owners
          </div>
          <h1>
            Stop losing rent money.<br />
            <span className="accent-pill">Start managing smarter.</span>
          </h1>
          <div className="mini-tooltip-1">PGpilots {Icons.cursor}</div>
          <p className="hero-sub">
            The only PG management software that thinks like you do.
            Track rent by check-in date, get overdue alerts, manage rooms and tenants —
            all from your phone.
          </p>

          <div className="hero-btns">
            <button className="btn-primary" onClick={goSignup}>{Icons.rocket} Start 14-Day Free Trial</button>
            <a href="#features" className="btn-secondary">See how it works →</a>
          </div>

          <div className="hero-visual">
            <div className="phone-frame">
              <div className="phone-notch"></div>
              <div className="app-preview">
                <div className="app-header">
                  <div className="app-avatar">{Icons.users}</div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Welcome back</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--navy)' }}>Sri Sai PG</div>
                  </div>
                </div>

                <div className="app-card">
                  <div style={{ fontSize: '12px', color: 'var(--brand)', opacity: 0.9, fontWeight: '700', marginBottom: '8px' }}>Total Collected</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', margin: '4px 0' }}>₹42,500</div>
                  <div style={{ fontSize: '12px', color: '#fff', fontWeight: '500', opacity: 0.8 }}>+12% from last month</div>
                </div>

                <div style={{ padding: '0 20px', marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)' }}>Today's Dues</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand)' }}>See all</div>
                  </div>

                  {[{ n: 'Rahul K.', r: 'B-102', a: '₹6,500' }, { n: 'Suresh M.', r: 'A-201', a: '₹5,000' }, { n: 'Vikram S.', r: 'C-104', a: '₹7,200' }].map((t, i) => (
                    <div key={i} className="app-list-item">
                      <div className="app-list-avatar">{t.n[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--navy)', marginBottom: '2px' }}>{t.n}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Room {t.r}</div>
                      </div>
                      <div className="app-list-btn">Remind</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* The Floating UI Cards */}
            <div className="float-card-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--navy)' }}>Ravi collected</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>Room B5 Paid</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Just now</div>
                </div>
                <div style={{ color: 'var(--brand)', fontWeight: '800', fontSize: '15px' }}>+₹6,500</div>
              </div>
            </div>

            <div className="float-card-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--navy)' }}>Alerts</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>Rent Reminders</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Automatically</div>
                </div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--brand)' }}>3 sent</div>
              </div>
            </div>

            <div className="mini-tooltip-2">
              Vacant bed filled {Icons.cursor}
            </div>
          </div>

        </section>

        {/* TRUSTED STATS */}
        <section className="trusted-section">
          <div className="trusted-text">Trusted by leading property owners</div>
          <div className="trusted-logos">
            {[['100+', 'PG Owners'], ['1000+', 'Tenants Managed'], ['₹1Cr+', 'Rent Collected'], ['4.9/5', 'Owner Rating']].map(([num, label]) => (
              <div className="stat-item" key={label}>
                <span className="stat-num">{num}</span>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PAIN POINTS */}
        <section id="pain">
          <div className="lp-section">
            <div className="section-tag">The Real Problem</div>
            <h2 className="section-title">Every PG owner<br />feels this pain.</h2>
            <p className="section-sub">We talked to 200+ PG owners across Tamil Nadu. These are their exact words.</p>
            <div className="pain-grid reveal">
              {[
                ['01', 'I forgot who paid and who didn\'t. My <strong>notebook got lost</strong> and I lost ₹40,000.', 'PGpilots tracks every rupee, automatically'],
                ['02', 'Tenant says he paid but I have <strong>no proof.</strong> No receipt. Nothing.', 'Digital receipts with date, time & method recorded'],
                ['03', 'I have 20 tenants. I don\'t know whose <strong>rent is due today</strong> without calling everyone.', 'Auto-sorted: Today Due → Overdue → Upcoming'],
                ['04', 'Tenant left without paying last month. I lost <strong>₹6,500 just like that.</strong>', 'Exit checklist shows all pending dues before leaving'],
                ['05', 'I call every tenant for rent. It\'s <strong>embarrassing</strong> and they get irritated.', 'One-click WhatsApp reminder — professional & automatic'],
                ['06', 'I don\'t know which room is empty <strong>right now.</strong> I might have missed a new tenant.', 'Live room occupancy — see vacant beds instantly'],
              ].map(([num, quote, solution]) => (
                <div className="pain-item" key={num}>
                  <div className="pain-num">{num}</div>
                  <p className="pain-quote" dangerouslySetInnerHTML={{ __html: `"${quote}"` }} />
                  <div className="pain-solution">{Icons.check} {solution}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ background: 'var(--bg-surface)' }}>
          <div className="lp-section">
            <div className="section-tag">Features</div>
            <h2 className="section-title">Everything you need.<br />Nothing you don't.</h2>
            <p className="section-sub">Simple enough to use on first day. Powerful enough to run your entire PG business.</p>
            <div className="features-grid reveal">
              {[
                [Icons.bed, 'Smart Room Management', 'Add rooms with bed count, floor, type and rent. See live occupancy bars. Know exactly which beds are vacant at any moment.'],
                [Icons.users, 'Tenant Profiles', 'Complete tenant records with ID proof, emergency contact, check-in date and room assignment. Find any tenant in seconds.'],
                [Icons.wallet, 'Intelligent Rent Tracking', 'Rent due dates based on check-in date. Automatic overdue detection. Partial payment tracking. Balance auto-calculates.'],
                [Icons.zap, 'Electricity Bill Split', 'Enter room-wise electricity bills. Each tenant sees their rent + electricity as one total. Collect everything together.'],
                [Icons.chart, 'Reports & PDF Export', 'Monthly rent reports, electricity reports, occupancy stats and vacant room analysis. Download as professional PDF anytime.'],
                [Icons.message, 'WhatsApp Reminders', 'One click sends professional rent reminder to tenant on WhatsApp. No awkward calls. No embarrassment. Just results.'],
              ].map(([icon, title, desc]) => (
                <div className="feature-card" key={title}>
                  <div className="feature-icon">{icon}</div>
                  <div className="feature-title">{title}</div>
                  <p className="feature-desc">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how">
          <div className="lp-section">
            <div className="section-tag">How It Works</div>
            <h2 className="section-title">Setup in 5 minutes.<br />Manage forever.</h2>
            <div className="steps-row reveal">
              {[
                ['1', 'Sign Up Free', 'Create your account in 60 seconds. No credit card. No complicated setup.'],
                ['2', 'Add Your Rooms', 'Add rooms with beds, floor and rent per bed. Takes 2 minutes for 10 rooms.'],
                ['3', 'Add Tenants', 'Add tenant details and assign rooms. Due dates are set automatically from check-in.'],
                ['4', 'Collect & Track', 'See who\'s due today. Collect rent with one tap. Everything is tracked automatically.'],
              ].map(([num, title, desc]) => (
                <div className="step-item" key={num}>
                  <div className="step-num">{num}</div>
                  <div className="step-title">{title}</div>
                  <p className="step-desc">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="pricing-section">
          <div className="lp-section">
            <div className="section-tag" style={{ justifyContent: 'center', margin: '0 auto 24px', display: 'flex', width: 'fit-content' }}>Pricing</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>Usage-based pricing<br />that scales with you.</h2>
            <p className="section-sub" style={{ margin: '0 auto', textAlign: 'center' }}>Simple, usage-based billing. Pay only for the beds you use each month.</p>

            <div className="pricing-card reveal">
              <div className="price-plan">Pay-as-you-go</div>
              <div className="price-amount">₹ per bed <span>/mo</span></div>
              <div className="price-period">Billed monthly on peak beds</div>
              <ul className="price-features">
                {['Unlimited PGs & rooms', 'All features included', 'Pay only for beds used', 'Peak-bed billing'].map(f => (
                  <li key={f}>{Icons.check} {f}</li>
                ))}
              </ul>
              <button className="btn-large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={goSignup}>{Icons.rocket} Start Free Trial</button>
            </div>

            <div className="price-note reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--navy)', fontWeight: '700', marginTop: '24px' }}>
              <span style={{ color: 'var(--brand)', fontSize: '20px' }}>✔</span> No setup fees · Pay only for beds used · Cancel anytime
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials">
          <div className="lp-section">
            <div className="section-tag">Testimonials</div>
            <h2 className="section-title">PG owners love it.</h2>
            <p className="section-sub">Real feedback from real owners across Tamil Nadu.</p>
            <div className="testi-grid reveal">
              {[
                ['R', 'Ravi Kumar', 'Sri Sai PG — 18 tenants', 'Before PGpilots, I used to forget who paid. Now I open the app and I know exactly who\'s late, who paid today and who\'s coming up. It\'s like having an accountant in my pocket.'],
                ['S', 'Suresh Babu', 'Lakshmi PG — 32 tenants', 'The WhatsApp reminder feature is gold. I don\'t have to call tenants anymore. I just click and they get a professional message. My collection improved 40% in first month.'],
                ['M', 'Meena Devi', 'Royal Ladies PG — 24 tenants', '₹499 for all this? I was paying ₹2,800/month for another software that was 10x more complicated. This is simple, works on my phone and does everything I need.'],
              ].map(([initial, name, loc, text]) => (
                <div className="testi-card" key={name}>
                  <div className="testi-stars">
                    {[1, 2, 3, 4, 5].map(i => <span key={i}>{Icons.star}</span>)}
                  </div>
                  <p className="testi-text">"{text}"</p>
                  <div className="testi-author">
                    <div className="testi-avatar">{initial}</div>
                    <div>
                      <div className="testi-name">{name}</div>
                      <div className="testi-loc">{loc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-wrapper">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2>Ready to never lose<br />rent money again?</h2>
            <p>Join 500+ PG owners who manage smarter with PGpilots.<br />Free for 14 days. No card needed.</p>
            <div className="hero-btns" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" onClick={goSignup}>{Icons.rocket} Start Free Trial — It's Free</button>
              <a href="https://wa.me/916382143599" target="_blank" rel="noreferrer" className="btn-secondary">{Icons.whatsappBtn} Talk to Us on WhatsApp</a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="footer-logo">{Icons.logo} PGpilots</div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            <a href="mailto:support@pgpilots.com">Contact</a>
          </div>
          <div className="footer-copy">© 2026 PGpilots. Built with {Icons.heart} for Indian PG Owners.</div>
        </footer>
      </div>
    </>
  );
}

export default LandingPage;
