import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, ArrowRight, Menu, ChevronDown, Volume2, VolumeX } from 'lucide-react';

interface NavbarHeroProps {
  brandName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDescription?: string;
  videoUrl?: string;
  bgVideoUrl?: string;
  emailPlaceholder?: string;
}

// ---------------------------------------------------------------------------
// EarthBackground — isolated video layer with cinematic parallax + scroll fx
// ---------------------------------------------------------------------------
const EarthBackground: React.FC<{ src: string; muted: boolean }> = ({ src, muted }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // All animation state lives in refs — zero React re-renders on each frame
  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const scrollTarget = useRef(0);
  const scrollCurrent = useRef(0);
  const rafId = useRef<number | null>(null);

  // Detect reduced motion once on mount
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tuning constants
  const PARALLAX_STRENGTH = 20;  // max px shift per axis from mouse
  const DAMPING = 0.055;          // lerp factor — lower = more inertia
  const SCROLL_FACTOR = 0.50;    // fraction of scrollY applied to Earth Y

  const animate = useCallback(() => {
    rafId.current = requestAnimationFrame(animate);
    if (reducedMotion) return;
    const el = wrapperRef.current;
    if (!el) return;

    // Lerp mouse parallax
    current.current.x += (mouse.current.x - current.current.x) * DAMPING;
    current.current.y += (mouse.current.y - current.current.y) * DAMPING;

    // Lerp scroll offset — Earth slides downward as user scrolls
    scrollCurrent.current += (scrollTarget.current - scrollCurrent.current) * DAMPING;

    el.style.transform =
      `translate(${current.current.x}px, ${current.current.y + scrollCurrent.current}px)`;
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (reducedMotion) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouse.current.x = ((e.clientX - cx) / cx) * PARALLAX_STRENGTH;
      mouse.current.y = ((e.clientY - cy) / cy) * PARALLAX_STRENGTH;
    };

    // Mouse leaves window → settle Earth back to center
    const onMouseLeave = () => {
      mouse.current.x = 0;
      mouse.current.y = 0;
    };

    const onScroll = () => {
      // Positive scroll → Earth moves DOWN (appears to stay behind as camera lifts)
      scrollTarget.current = window.scrollY * SCROLL_FACTOR;
    };

    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Kick off RAF loop — runs forever until unmount
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [animate]);

  // Sync muted prop to video DOM element without remounting
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    // Outer shell: fixed, fills viewport, clips the oversized mover div
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        overflow: 'hidden',
        background: '#020408',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* Mover: slightly larger than viewport so parallax shift never exposes edges */}
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          // Expand 4% on each side to give parallax room without showing edges
          top: '-4%',
          left: '-4%',
          width: '108%',
          height: '108%',
          willChange: 'transform',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          style={{
            width: '100%',
            height: '100%',
            // cover so Earth fills the oversized mover without letter-boxing
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
          }}
        />
      </div>

      {/* Deep space vignette — radial dark edges, stronger at corners */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(2,4,8,0.55) 70%, rgba(2,4,8,0.92) 100%)',
        }}
      />

      {/* Bottom fade — keeps login text highly readable */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background:
            'linear-gradient(to bottom, transparent, rgba(2,4,8,0.7) 60%, rgba(2,4,8,0.95) 100%)',
        }}
      />

      {/* Subtle cyan atmospheric rim at horizon */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 40% at 50% 62%, rgba(6,182,212,0.06) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main NavbarHero component
// ---------------------------------------------------------------------------
const NavbarHero: React.FC<NavbarHeroProps> = ({
  brandName = 'NeuraX',
  heroTitle = 'Intelligence. Elevated.',
  heroDescription = 'Discover cutting-edge solutions designed for the modern digital landscape.',
  bgVideoUrl = '/bg-video.mp4',
  emailPlaceholder = 'enter@email.com',
}) => {
  const [email, setEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const handleEmailSubmit = () => {
    if (email.trim()) console.log('Email submitted:', email);
  };

  const toggleDropdown = (name: string) =>
    setOpenDropdown(prev => (prev === name ? null : name));

  return (
    /*
     * Page shell — must NOT be overflow:hidden so browser scroll works.
     * The scrollable height is created by the spacer div at the bottom.
     * The foreground is position:fixed so it never moves during scroll.
     * Only the EarthBackground reacts to scroll via JS transform.
     */
    <div style={{ minHeight: '100vh', background: 'transparent' }}>

      {/* ── Cinematic Earth Video Background ── */}
      <EarthBackground src={bgVideoUrl} muted={isVideoMuted} />

      {/*
       * ── Fixed Foreground ──
       * position:fixed keeps it anchored to the viewport.
       * The login UI NEVER moves when user scrolls.
       */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none', // let clicks through the empty areas
        }}
      >
        {/* Give all direct children pointer-events back */}
        <div style={{ pointerEvents: 'auto', width: '100%' }}>

          {/* ── Navbar ── */}
          <nav
            style={{
              width: '100%',
              padding: '20px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              backdropFilter: 'blur(0px)', // navbar has no blur — stays clean
            }}
          >
            {/* Brand */}
            <a
              href="#"
              style={{
                fontWeight: 800,
                fontSize: '1.4rem',
                color: '#ffffff',
                textDecoration: 'none',
                letterSpacing: '-0.02em',
                flexShrink: 0,
                textShadow: '0 0 24px rgba(6,182,212,0.5)',
              }}
            >
              {brandName}
            </a>

            {/* Desktop links */}
            <ul
              style={{
                display: 'flex',
                listStyle: 'none',
                margin: 0,
                padding: 0,
                gap: 4,
                alignItems: 'center',
              }}
              className="neurax-desktop-nav"
            >
              {['About', 'Blog'].map(label => (
                <li key={label}>
                  <a href="#" className="neurax-nav-link-item">{label}</a>
                </li>
              ))}

              {/* Resources dropdown */}
              <li style={{ position: 'relative' }}>
                <button
                  className="neurax-nav-link-item neurax-nav-btn"
                  onClick={() => toggleDropdown('resources')}
                  aria-expanded={openDropdown === 'resources'}
                >
                  Resources
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      marginLeft: 4,
                      transition: 'transform 0.2s',
                      transform: openDropdown === 'resources' ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                {openDropdown === 'resources' && (
                  <ul className="neurax-dropdown">
                    <li><a href="#" className="neurax-dropdown-item">Documentation</a></li>
                    <li><a href="#" className="neurax-dropdown-item">API Reference</a></li>
                    <li><a href="#" className="neurax-dropdown-item">Case Studies</a></li>
                  </ul>
                )}
              </li>

              {/* Plans dropdown */}
              <li style={{ position: 'relative' }}>
                <button
                  className="neurax-nav-link-item neurax-nav-btn"
                  onClick={() => toggleDropdown('pricing')}
                  aria-expanded={openDropdown === 'pricing'}
                >
                  Plans &amp; Pricing
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      marginLeft: 4,
                      transition: 'transform 0.2s',
                      transform: openDropdown === 'pricing' ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                {openDropdown === 'pricing' && (
                  <ul className="neurax-dropdown">
                    <li><a href="#" className="neurax-dropdown-item">Starter</a></li>
                    <li><a href="#" className="neurax-dropdown-item">Professional</a></li>
                    <li><a href="#" className="neurax-dropdown-item">Enterprise</a></li>
                  </ul>
                )}
              </li>
            </ul>

            {/* Desktop actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="neurax-desktop-actions">
              <a href="#" className="neurax-btn-ghost">Login</a>
              <button className="neurax-btn-primary">
                Get Started <ArrowRight style={{ width: 14, height: 14, display: 'inline' }} />
              </button>
              <button
                onClick={() => setIsVideoMuted(m => !m)}
                className="neurax-mute-btn"
                title={isVideoMuted ? 'Unmute background' : 'Mute background'}
                aria-label={isVideoMuted ? 'Unmute background video' : 'Mute background video'}
              >
                {isVideoMuted
                  ? <VolumeX style={{ width: 16, height: 16 }} />
                  : <Volume2 style={{ width: 16, height: 16 }} />
                }
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="neurax-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(m => !m)}
              aria-label="Open menu"
            >
              <Menu style={{ width: 22, height: 22, color: '#fff' }} />
            </button>
          </nav>

          {/* Mobile menu panel */}
          {isMobileMenuOpen && (
            <div className="neurax-mobile-menu">
              <a href="#" className="neurax-mobile-link">About</a>
              <a href="#" className="neurax-mobile-link">Resources</a>
              <a href="#" className="neurax-mobile-link">Blog</a>
              <a href="#" className="neurax-mobile-link">Plans &amp; Pricing</a>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 4, display: 'flex', gap: 10 }}>
                <a href="#" className="neurax-btn-ghost">Login</a>
                <button className="neurax-btn-primary">Get Started</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Hero Content — vertically centered in remaining space ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 32px 80px',
            pointerEvents: 'auto',
            textAlign: 'center',
          }}
        >
          {/* Eyebrow badge */}
          <div className="neurax-badge">
            <span className="neurax-badge-dot" />
            Cybersecurity Intelligence Platform
          </div>

          <h1 className="neurax-hero-title">{heroTitle}</h1>

          <p className="neurax-hero-desc">{heroDescription}</p>

          {/* CTA row */}
          <div className="neurax-cta-row">
            <div style={{ position: 'relative' }}>
              <Mail
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'rgba(255,255,255,0.5)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="hero-email"
                type="email"
                placeholder={emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                className="neurax-email-input"
                aria-label="Email address"
                autoComplete="email"
              />
            </div>
            <button onClick={handleEmailSubmit} className="neurax-btn-primary neurax-cta-submit">
              Join Now <ArrowRight style={{ width: 14, height: 14, display: 'inline', marginLeft: 4 }} />
            </button>
          </div>

          <p className="neurax-trust-text">
            Trusted by security teams at Fortune 500 companies
          </p>
        </div>

        {/* Scroll hint at bottom */}
        <div className="neurax-scroll-hint" aria-hidden="true">
          <div className="neurax-scroll-dot" />
          <span>Scroll to explore</span>
        </div>
      </div>

      {/*
       * Invisible scroll spacer — gives the page scrollable height.
       * As the user scrolls, the EarthBackground JS handler receives scroll
       * events and translates the video downward (parallax), creating the
       * cinematic "camera lifting past the Earth" effect.
       * The foreground login stays fixed at all times.
       */}
      <div style={{ height: '250vh' }} aria-hidden="true" />
    </div>
  );
};

export { NavbarHero };

