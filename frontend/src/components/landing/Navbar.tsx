import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onExplore?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onExplore }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'background-color 0.3s, backdrop-filter 0.3s, border-color 0.3s',
        backgroundColor: scrolled ? 'rgba(2, 4, 8, 0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <a
          href="#"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: '1.45rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              textShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
            }}
          >
            Trinetra
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.7rem',
              fontWeight: 600,
              fontFamily: "'Space Grotesk', monospace",
              color: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              padding: '2px 8px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}
          >
            <ShieldCheck style={{ width: 12, height: 12 }} />
            CYBER INTEL
          </span>
        </a>

        {/* Desktop Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          className="neurax-desktop-nav"
        >
          <button onClick={() => scrollTo('about')} className="neurax-nav-link-item">
            About
          </button>
          <button onClick={() => scrollTo('problem')} className="neurax-nav-link-item">
            Problem
          </button>
          <button onClick={() => scrollTo('architecture')} className="neurax-nav-link-item">
            Architecture
          </button>
          <button onClick={() => scrollTo('pillars')} className="neurax-nav-link-item">
            Pillars
          </button>
          <button onClick={() => scrollTo('impact')} className="neurax-nav-link-item">
            Impact
          </button>
        </nav>

        {/* Desktop Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="neurax-desktop-actions">
          <button
            onClick={() => scrollTo('cta')}
            className="neurax-btn-primary"
            style={{ fontSize: '0.82rem', padding: '8px 18px' }}
          >
            Launch Console
            <ArrowRight style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="neurax-mobile-menu-btn"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div
          style={{
            background: 'rgba(2, 4, 8, 0.96)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            onClick={() => scrollTo('about')}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '10px 0', color: '#fff', fontSize: '1rem' }}
          >
            About
          </button>
          <button
            onClick={() => scrollTo('problem')}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '10px 0', color: '#fff', fontSize: '1rem' }}
          >
            Problem
          </button>
          <button
            onClick={() => scrollTo('architecture')}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '10px 0', color: '#fff', fontSize: '1rem' }}
          >
            Architecture
          </button>
          <button
            onClick={() => scrollTo('pillars')}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '10px 0', color: '#fff', fontSize: '1rem' }}
          >
            Pillars
          </button>
          <button
            onClick={() => scrollTo('impact')}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '10px 0', color: '#fff', fontSize: '1rem' }}
          >
            Impact
          </button>
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: 8 }}>
            <button
              onClick={() => scrollTo('cta')}
              className="neurax-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Launch Console
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
