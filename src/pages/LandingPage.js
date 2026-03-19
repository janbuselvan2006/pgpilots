import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  const cursorRef     = useRef(null);
  const cursorRingRef = useRef(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const ringX  = useRef(0);
  const ringY  = useRef(0);

  useEffect(() => {
    // ── Custom cursor
    const handleMouseMove = (e) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX - 6 + 'px';
        cursorRef.current.style.top  = e.clientY - 6 + 'px';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    const animateRing = () => {
      ringX.current += (mouseX.current - ringX.current - 18) * 0.12;
      ringY.current += (mouseY.current - ringY.current - 18) * 0.12;
      if (cursorRingRef.current) {
        cursorRingRef.current.style.left = ringX.current + 'px';
        cursorRingRef.current.style.top  = ringY.current + 'px';
      }
      requestAnimationFrame(animateRing);
    };
    animateRing();

    // ── Cursor scale on hover
    const handleEnter = () => {
      if (cursorRef.current)     cursorRef.current.style.transform     = 'scale(2)';
      if (cursorRingRef.current) cursorRingRef.current.style.transform = 'scale(1.5)';
    };
    const handleLeave = () => {
      if (cursorRef.current)     cursorRef.current.style.transform     = 'scale(1)';
      if (cursorRingRef.current) cursorRingRef.current.style.transform = 'scale(1)';
    };
    const interactables = document.querySelectorAll('a, button');
    interactables.forEach(el => {
      el.addEventListener('mouseenter', handleEnter);
      el.addEventListener('mouseleave', handleLeave);
    });

    // ── Scroll reveal
    const reveals  = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(r => observer.observe(r));

    // ── Nav background on scroll
    const handleScroll = () => {
      const nav = document.querySelector('.lp-nav');
      if (!nav) return;
      nav.style.background = window.scrollY > 50
        ? 'rgba(8,13,19,0.98)'
        : 'linear-gradient(to bottom, rgba(8,13,19,0.95), transparent)';
    };
    window.addEventListener('scroll', handleScroll);

    // ── Counter animation
    const animateCounter = (el, target, suffix = '') => {
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / 2000, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const statsObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const nums = e.target.querySelectorAll('.stat-num');
          if (nums[0]) animateCounter(nums[0], 500,   '+');
          if (nums[1]) animateCounter(nums[1], 12000, '+');
          statsObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) statsObserver.observe(heroStats);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      interactables.forEach(el => {
        el.removeEventListener('mouseenter', handleEnter);
        el.removeEventListener('mouseleave', handleLeave);
      });
    };
  }, []);

  const goSignup = () => navigate('/signup');
  const goLogin  = () => navigate('/login');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        :root {
          --red: #e94560; --dark: #0f1923; --darker: #080d13;
          --navy: #0f3460; --card: #131e2b;
          --border: rgba(255,255,255,0.07);
          --text: #c8d6e5; --muted: #5a7a96; --white: #f0f6ff;
        }

        .lp-body { background: var(--darker); color: var(--text); font-family: 'DM Sans', sans-serif; overflow-x: hidden; cursor: none; position: relative; }
        .lp-body *,  .lp-body *::before, .lp-body *::after { box-sizing: border-box; }

        .lp-cursor { width:12px; height:12px; background:var(--red); border-radius:50%; position:fixed; top:0; left:0; pointer-events:none; z-index:9999; transition:transform 0.15s ease; mix-blend-mode:screen; }
        .lp-cursor-ring { width:36px; height:36px; border:1.5px solid rgba(233,69,96,0.4); border-radius:50%; position:fixed; top:0; left:0; pointer-events:none; z-index:9998; transition:all 0.35s cubic-bezier(.23,1,.32,1); }

        .lp-nav { position:fixed; top:0; left:0; right:0; padding:20px 60px; display:flex; align-items:center; justify-content:space-between; z-index:100; background:linear-gradient(to bottom,rgba(8,13,19,0.95),transparent); backdrop-filter:blur(12px); }
        .lp-nav-logo { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:var(--white); display:flex; align-items:center; gap:10px; cursor:pointer; }
        .lp-nav-logo span { background:linear-gradient(135deg,var(--red),#ff8fab); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .lp-nav-links { display:flex; align-items:center; gap:36px; list-style:none; margin:0; padding:0; }
        .lp-nav-links a { color:var(--muted); text-decoration:none; font-size:14px; font-weight:500; letter-spacing:0.02em; transition:color 0.2s; cursor:pointer; }
        .lp-nav-links a:hover { color:var(--white); }
        .lp-nav-cta { background:var(--red) !important; color:white !important; padding:10px 24px; border-radius:100px; font-weight:600 !important; transition:all 0.2s !important; box-shadow:0 0 20px rgba(233,69,96,0.3); border:none; cursor:pointer; font-size:14px; }
        .lp-nav-cta:hover { transform:translateY(-1px); box-shadow:0 0 30px rgba(233,69,96,0.5) !important; }

        .lp-hero { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:120px 20px 80px; position:relative; overflow:hidden; }
        .lp-hero::after { content:''; position:absolute; width:700px; height:700px; background:radial-gradient(circle,rgba(233,69,96,0.12) 0%,transparent 70%); top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; }

        .hero-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(233,69,96,0.1); border:1px solid rgba(233,69,96,0.25); color:#ff8fab; padding:8px 18px; border-radius:100px; font-size:13px; font-weight:500; margin-bottom:32px; animation:fadeUp 0.6s ease both; letter-spacing:0.03em; }
        .hero-badge::before { content:''; width:6px; height:6px; background:var(--red); border-radius:50%; animation:lp-pulse 1.5s infinite; }

        @keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lp-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }

        .lp-hero h1 { font-family:'Syne',sans-serif; font-size:clamp(48px,8vw,88px); font-weight:800; line-height:1.0; color:var(--white); margin-bottom:28px; animation:fadeUp 0.6s 0.1s ease both; letter-spacing:-0.03em; }
        .lp-hero h1 .accent { background:linear-gradient(135deg,var(--red) 0%,#ff8fab 50%,#ffb3c6 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; display:block; }
        .hero-sub { font-size:clamp(16px,2.5vw,20px); color:var(--muted); max-width:580px; line-height:1.7; margin-bottom:48px; font-weight:300; animation:fadeUp 0.6s 0.2s ease both; }
        .hero-btns { display:flex; gap:16px; justify-content:center; flex-wrap:wrap; animation:fadeUp 0.6s 0.3s ease both; margin-bottom:80px; }

        .btn-primary { background:linear-gradient(135deg,var(--red),#c0324d); color:white; padding:16px 36px; border-radius:100px; text-decoration:none; font-weight:600; font-size:15px; box-shadow:0 0 40px rgba(233,69,96,0.35),0 4px 15px rgba(0,0,0,0.3); transition:all 0.25s; display:inline-flex; align-items:center; gap:8px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 60px rgba(233,69,96,0.5),0 8px 25px rgba(0,0,0,0.4); }
        .btn-secondary { background:transparent; color:var(--text); padding:16px 36px; border-radius:100px; text-decoration:none; font-weight:500; font-size:15px; border:1px solid var(--border); transition:all 0.25s; display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .btn-secondary:hover { border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.04); transform:translateY(-2px); }

        .hero-stats { display:flex; gap:48px; justify-content:center; flex-wrap:wrap; animation:fadeUp 0.6s 0.4s ease both; padding-top:40px; border-top:1px solid var(--border); width:100%; max-width:700px; }
        .stat-item { text-align:center; }
        .stat-num { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; color:var(--white); display:block; }
        .stat-label { font-size:13px; color:var(--muted); margin-top:4px; }

        .float-badge { position:absolute; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:12px 18px; display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text); box-shadow:0 8px 32px rgba(0,0,0,0.4); white-space:nowrap; }
        .float-badge .dot { width:8px; height:8px; border-radius:50%; background:#4ade80; animation:lp-pulse 1.5s infinite; }
        .float-1 { top:30%; left:5%; animation:lp-float 3s ease-in-out infinite; }
        .float-2 { top:55%; right:5%; animation:lp-float 3s ease-in-out 1s infinite; }
        .float-3 { bottom:25%; left:8%; animation:lp-float 3s ease-in-out 2s infinite; }

        .lp-section { padding:100px 60px; max-width:1200px; margin:0 auto; }
        .section-tag { font-size:12px; font-weight:600; color:var(--red); letter-spacing:0.15em; text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:10px; }
        .section-tag::before { content:''; width:24px; height:1px; background:var(--red); }
        .section-title { font-family:'Syne',sans-serif; font-size:clamp(32px,5vw,52px); font-weight:800; color:var(--white); line-height:1.1; letter-spacing:-0.02em; margin-bottom:20px; }
        .section-sub { font-size:17px; color:var(--muted); line-height:1.7; max-width:520px; font-weight:300; }

        .pain-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; margin-top:64px; border:1px solid var(--border); border-radius:24px; overflow:hidden; background:var(--card); }
        .pain-item { padding:40px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); position:relative; transition:background 0.3s; overflow:hidden; }
        .pain-item:hover { background:rgba(233,69,96,0.04); }
        .pain-item:nth-child(even) { border-right:none; }
        .pain-item:nth-last-child(-n+2) { border-bottom:none; }
        .pain-quote { font-size:22px; font-weight:300; color:var(--muted); line-height:1.5; margin-bottom:20px; font-style:italic; }
        .pain-quote strong { color:#ff8fab; font-style:normal; font-weight:600; }
        .pain-solution { display:flex; align-items:center; gap:10px; font-size:14px; color:#4ade80; font-weight:500; }
        .pain-solution::before { content:'✓'; width:20px; height:20px; background:rgba(74,222,128,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; border:1px solid rgba(74,222,128,0.2); }
        .pain-num { position:absolute; top:32px; right:32px; font-family:'Syne',sans-serif; font-size:64px; font-weight:800; color:rgba(255,255,255,0.03); line-height:1; }

        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:24px; overflow:hidden; margin-top:64px; }
        .feature-card { background:var(--card); padding:44px 36px; transition:background 0.3s; position:relative; overflow:hidden; }
        .feature-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--red),transparent); opacity:0; transition:opacity 0.3s; }
        .feature-card:hover { background:#162030; }
        .feature-card:hover::before { opacity:1; }
        .feature-icon { width:52px; height:52px; background:rgba(233,69,96,0.1); border:1px solid rgba(233,69,96,0.2); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:24px; }
        .feature-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; color:var(--white); margin-bottom:12px; }
        .feature-desc { font-size:14px; color:var(--muted); line-height:1.7; font-weight:300; }

        .steps-row { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-top:64px; position:relative; }
        .steps-row::before { content:''; position:absolute; top:28px; left:14%; right:14%; height:1px; background:linear-gradient(90deg,transparent,var(--red),var(--red),transparent); opacity:0.3; }
        .step-item { padding:0 20px; text-align:center; }
        .step-num { width:56px; height:56px; background:linear-gradient(135deg,var(--red),#c0324d); border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:white; margin:0 auto 24px; box-shadow:0 0 30px rgba(233,69,96,0.4); position:relative; z-index:1; }
        .step-title { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:var(--white); margin-bottom:10px; }
        .step-desc { font-size:13px; color:var(--muted); line-height:1.6; }

        .pricing-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:64px; max-width:1000px; margin-left:auto; margin-right:auto; }
        .price-card { background:var(--card); border:1px solid var(--border); border-radius:24px; padding:40px 32px; position:relative; transition:all 0.3s; overflow:hidden; }
        .price-card:hover { transform:translateY(-4px); border-color:rgba(233,69,96,0.3); box-shadow:0 20px 60px rgba(0,0,0,0.4); }
        .price-card.featured { border-color:rgba(233,69,96,0.4); background:linear-gradient(135deg,#1a1020,#1a0d18); box-shadow:0 0 60px rgba(233,69,96,0.15); }
        .price-card.featured::before { content:'⭐ POPULAR'; position:absolute; top:20px; right:20px; background:var(--red); color:white; font-size:10px; font-weight:700; padding:4px 10px; border-radius:100px; letter-spacing:0.08em; }
        .price-plan { font-size:13px; font-weight:600; color:var(--muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:16px; }
        .price-amount { font-family:'Syne',sans-serif; font-size:48px; font-weight:800; color:var(--white); line-height:1; margin-bottom:4px; }
        .price-amount span { font-size:18px; font-weight:400; color:var(--muted); }
        .price-period { font-size:13px; color:var(--muted); margin-bottom:32px; }
        .price-features { list-style:none; margin-bottom:36px; padding:0; }
        .price-features li { font-size:14px; color:var(--text); padding:10px 0; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px; }
        .price-features li::before { content:'✓'; color:#4ade80; font-size:12px; font-weight:700; flex-shrink:0; }
        .price-btn { display:block; width:100%; padding:14px; border-radius:12px; text-align:center; font-weight:600; font-size:14px; transition:all 0.2s; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .price-btn-outline { border:1px solid var(--border); color:var(--text); background:transparent; }
        .price-btn-outline:hover { border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.04); }
        .price-btn-fill { background:linear-gradient(135deg,var(--red),#c0324d); color:white; box-shadow:0 4px 20px rgba(233,69,96,0.35); }
        .price-btn-fill:hover { transform:translateY(-1px); box-shadow:0 8px 30px rgba(233,69,96,0.5); }

        .testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:64px; }
        .testi-card { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:32px; transition:all 0.3s; }
        .testi-card:hover { transform:translateY(-4px); border-color:rgba(255,255,255,0.12); box-shadow:0 20px 40px rgba(0,0,0,0.3); }
        .testi-stars { color:#fbbf24; font-size:14px; margin-bottom:16px; }
        .testi-text { font-size:15px; color:var(--text); line-height:1.7; font-weight:300; margin-bottom:24px; font-style:italic; }
        .testi-author { display:flex; align-items:center; gap:12px; }
        .testi-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,var(--red),var(--navy)); display:flex; align-items:center; justify-content:center; font-family:'Syne',sans-serif; font-weight:800; color:white; font-size:16px; }
        .testi-name { font-size:14px; font-weight:600; color:var(--white); }
        .testi-loc { font-size:12px; color:var(--muted); margin-top:2px; }

        .cta-wrapper { padding:100px 60px; text-align:center; background:var(--dark); position:relative; overflow:hidden; }
        .cta-wrapper::before { content:''; position:absolute; width:600px; height:600px; background:radial-gradient(circle,rgba(233,69,96,0.15) 0%,transparent 70%); top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; }
        .cta-wrapper h2 { font-family:'Syne',sans-serif; font-size:clamp(36px,6vw,64px); font-weight:800; color:var(--white); line-height:1.1; letter-spacing:-0.02em; margin-bottom:20px; position:relative; }
        .cta-wrapper p { font-size:18px; color:var(--muted); margin-bottom:48px; font-weight:300; position:relative; }
        .cta-btns { display:flex; gap:16px; justify-content:center; position:relative; flex-wrap:wrap; }

        .lp-footer { padding:48px 60px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; }
        .footer-logo { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:var(--white); }
        .footer-links { display:flex; gap:28px; }
        .footer-links a { font-size:13px; color:var(--muted); text-decoration:none; transition:color 0.2s; }
        .footer-links a:hover { color:var(--white); }
        .footer-copy { font-size:12px; color:var(--muted); }

        .reveal { opacity:0; transform:translateY(32px); transition:all 0.7s cubic-bezier(.23,1,.32,1); }
        .reveal.visible { opacity:1; transform:translateY(0); }

        @media(max-width:768px) {
          .lp-nav { padding:16px 20px; }
          .lp-nav-links { display:none; }
          .lp-section { padding:60px 20px; }
          .cta-wrapper,.lp-footer { padding:60px 20px; }
          .pain-grid,.features-grid,.testi-grid { grid-template-columns:1fr; }
          .steps-row { grid-template-columns:1fr 1fr; gap:40px; }
          .steps-row::before { display:none; }
          .pricing-grid { grid-template-columns:1fr; }
          .float-badge { display:none; }
        }
      `}</style>

      <div className="lp-body">
        {/* Cursor */}
        <div className="lp-cursor"      ref={cursorRef} />
        <div className="lp-cursor-ring" ref={cursorRingRef} />

        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            🏠 PG<span>pilots</span>
          </div>
          <ul className="lp-nav-links">
            <li><a href="#pain">Problems</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#login" onClick={(e) => { e.preventDefault(); goLogin(); }}>Sign In</a></li>
            <li><button className="lp-nav-cta" onClick={goSignup}>Start Free Trial</button></li>
          </ul>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="float-badge float-1"><div className="dot" />Ravi collected ₹6,500 just now</div>
          <div className="float-badge float-2"><div className="dot" />3 rent reminders sent automatically</div>
          <div className="float-badge float-3"><div className="dot" />Room B5 — Vacant bed filled today</div>

          <div className="hero-badge">IN Built for Indian PG Owners</div>
          <h1>
            Stop losing rent money.<br />
            <span className="accent">Start managing smarter.</span>
          </h1>
          <p className="hero-sub">
            The only PG management software that thinks like you do.
            Track rent by check-in date, get overdue alerts, manage rooms and tenants —
            all from your phone.
          </p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={goSignup}>🚀 Start 14-Day Free Trial</button>
            <a href="#features" className="btn-secondary">See how it works →</a>
          </div>
          <div className="hero-stats">
            {[['500+','PG Owners'],['12,000+','Tenants Managed'],['₹2Cr+','Rent Collected'],['4.9★','Owner Rating']].map(([num,label]) => (
              <div className="stat-item" key={label}>
                <span className="stat-num">{num}</span>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PAIN POINTS */}
        <section id="pain" style={{ background:'var(--dark)', padding:'100px 0' }}>
          <div className="lp-section">
            <div className="section-tag">The Real Problem</div>
            <h2 className="section-title">Every PG owner<br />feels this pain.</h2>
            <p className="section-sub">We talked to 200+ PG owners across Tamil Nadu. These are their exact words.</p>
            <div className="pain-grid reveal">
              {[
                ['01','I forgot who paid and who didn\'t. My <b>notebook got lost</b> and I lost ₹40,000.','PGpilots tracks every rupee, automatically'],
                ['02','Tenant says he paid but I have <b>no proof.</b> No receipt. Nothing.','Digital receipts with date, time & method recorded'],
                ['03','I have 20 tenants. I don\'t know whose <b>rent is due today</b> without calling everyone.','Auto-sorted: Today Due → Overdue → Upcoming'],
                ['04','Tenant left without paying last month. I lost <b>₹6,500 just like that.</b>','Exit checklist shows all pending dues before leaving'],
                ['05','I call every tenant for rent. It\'s <b>embarrassing</b> and they get irritated.','One-click WhatsApp reminder — professional & automatic'],
                ['06','I don\'t know which room is empty <b>right now.</b> I might have missed a new tenant.','Live room occupancy — see vacant beds instantly'],
              ].map(([num, quote, solution]) => (
                <div className="pain-item" key={num}>
                  <div className="pain-num">{num}</div>
                  <p className="pain-quote" dangerouslySetInnerHTML={{ __html: `"${quote}"` }} />
                  <div className="pain-solution">{solution}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ background:'var(--dark)', padding:'100px 0' }}>
          <div className="lp-section">
            <div className="section-tag">Features</div>
            <h2 className="section-title">Everything you need.<br />Nothing you don't.</h2>
            <p className="section-sub">Simple enough to use on first day. Powerful enough to run your entire PG business.</p>
            <div className="features-grid reveal">
              {[
                ['🛏️','Smart Room Management','Add rooms with bed count, floor, type and rent. See live occupancy bars. Know exactly which beds are vacant at any moment.'],
                ['👥','Tenant Profiles','Complete tenant records with ID proof, emergency contact, check-in date and room assignment. Find any tenant in seconds.'],
                ['💰','Intelligent Rent Tracking','Rent due dates based on check-in date. Automatic overdue detection. Partial payment tracking. Balance auto-calculates.'],
                ['⚡','Electricity Bill Split','Enter room-wise electricity bills. Each tenant sees their rent + electricity as one total. Collect everything together.'],
                ['📊','Reports & PDF Export','Monthly rent reports, electricity reports, occupancy stats and vacant room analysis. Download as professional PDF anytime.'],
                ['📲','WhatsApp Reminders','One click sends professional rent reminder to tenant on WhatsApp. No awkward calls. No embarrassment. Just results.'],
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
        <section id="how" style={{ padding:'100px 0' }}>
          <div className="lp-section">
            <div className="section-tag">How It Works</div>
            <h2 className="section-title">Setup in 5 minutes.<br />Manage forever.</h2>
            <div className="steps-row reveal">
              {[
                ['1','Sign Up Free','Create your account in 60 seconds. No credit card. No complicated setup.'],
                ['2','Add Your Rooms','Add rooms with beds, floor and rent per bed. Takes 2 minutes for 10 rooms.'],
                ['3','Add Tenants','Add tenant details and assign rooms. Due dates are set automatically from check-in.'],
                ['4','Collect & Track','See who\'s due today. Collect rent with one tap. Everything is tracked automatically.'],
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
        <section id="pricing" style={{ background:'var(--dark)', padding:'100px 60px' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto', textAlign:'center' }}>
            <div className="section-tag" style={{ justifyContent:'center' }}>Pricing</div>
            <h2 className="section-title">4x cheaper than<br />the competition.</h2>
            <p className="section-sub" style={{ margin:'0 auto 64px' }}>Other PG software charges ₹2,000–₹5,000/month. We charge ₹499. Same features. Better experience.</p>
            <div className="pricing-grid reveal">
              {[
                { plan:'Basic', price:'₹499', period:'Up to 20 tenants', features:['Room & Tenant Management','Rent Tracking','Electricity Bills','Basic Reports','Mobile Friendly'], featured:false },
                { plan:'Standard', price:'₹999', period:'Up to 50 tenants', features:['Everything in Basic','PDF Report Download','WhatsApp Reminders','Payment History','Priority Support'], featured:true },
                { plan:'Premium', price:'₹1,999', period:'Unlimited tenants', features:['Everything in Standard','Multiple Properties','Advanced Analytics','ID Proof Storage','Dedicated Support'], featured:false },
              ].map(({ plan, price, period, features, featured }) => (
                <div className={`price-card${featured ? ' featured' : ''}`} key={plan}>
                  <div className="price-plan">{plan}</div>
                  <div className="price-amount">{price}<span>/mo</span></div>
                  <div className="price-period">{period}</div>
                  <ul className="price-features">
                    {features.map(f => <li key={f}>{f}</li>)}
                  </ul>
                  <button
                    className={`price-btn ${featured ? 'price-btn-fill' : 'price-btn-outline'}`}
                    onClick={goSignup}>
                    Start Free Trial
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize:'14px', color:'var(--muted)', marginTop:'32px' }}>
              ✅ 14-day free trial &nbsp;•&nbsp; No credit card required &nbsp;•&nbsp; Cancel anytime
            </p>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{ padding:'100px 0' }}>
          <div className="lp-section">
            <div className="section-tag">Testimonials</div>
            <h2 className="section-title">PG owners love it.</h2>
            <p className="section-sub">Real feedback from real owners across Tamil Nadu.</p>
            <div className="testi-grid reveal">
              {[
                ['R','Ravi Kumar','Sri Sai PG, Chennai — 18 tenants','Before PGpilots, I used to forget who paid. Now I open the app and I know exactly who\'s late, who paid today and who\'s coming up. It\'s like having an accountant in my pocket.'],
                ['S','Suresh Babu','Lakshmi PG, Coimbatore — 32 tenants','The WhatsApp reminder feature is gold. I don\'t have to call tenants anymore. I just click and they get a professional message. My collection improved 40% in first month.'],
                ['M','Meena Devi','Royal Ladies PG, Madurai — 24 tenants','₹499 for all this? I was paying ₹2,800/month for another software that was 10x more complicated. This is simple, works on my phone and does everything I need.'],
              ].map(([initial, name, loc, text]) => (
                <div className="testi-card" key={name}>
                  <div className="testi-stars">★★★★★</div>
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
          <h2>Ready to never lose<br />rent money again?</h2>
          <p>Join 500+ PG owners who manage smarter with PGpilots.<br />Free for 14 days. No card needed.</p>
          <div className="cta-btns">
            <button className="btn-primary" onClick={goSignup}>🚀 Start Free Trial — It's Free</button>
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="btn-secondary">📞 Talk to Us on WhatsApp</a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="footer-logo">🏠 PGpilots</div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-copy">© 2026 PGpilots. Built with ❤️ for Indian PG Owners.</div>
        </footer>
      </div>
    </>
  );
}

export default LandingPage;