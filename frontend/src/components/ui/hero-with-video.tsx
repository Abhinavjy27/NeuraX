import React, { useState } from 'react';
import { Mail, ArrowRight, Menu, ChevronDown } from 'lucide-react';
import EarthBackground from './earth-background';

interface NavbarHeroProps {
  brandName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDescription?: string;
  emailPlaceholder?: string;
}

// ---------------------------------------------------------------------------
// Main NavbarHero component
// ---------------------------------------------------------------------------
const NavbarHero: React.FC<NavbarHeroProps> = ({
  brandName = 'NeuraX',
  heroTitle = 'Intelligence. Elevated.',
  heroDescription = 'Discover cutting-edge solutions designed for the modern digital landscape.',
  emailPlaceholder = 'enter@email.com',
}) => {
  const [email, setEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
     */
    <div style={{ minHeight: '100vh', background: 'transparent' }}>

      {/* ── Cinematic Earth WebGL Background ── */}
      <EarthBackground />

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

