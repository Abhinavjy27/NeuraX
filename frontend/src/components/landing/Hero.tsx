import React from 'react';
import { ArrowDown, Shield, ChevronRight } from 'lucide-react';

interface HeroProps {
  onExplore?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore }) => {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '130px 24px 40px',
        boxSizing: 'border-box',
        pointerEvents: 'none', // Allow mouse events to pass through to the Earth canvas
      }}
    >
      {/* Top Content Block — Architectural Option A Composition */}
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          textAlign: 'center',
          pointerEvents: 'auto', // Interactive children
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Eyebrow Pill */}
        <div className="neurax-badge" style={{ marginBottom: 20 }}>
          <span className="neurax-badge-dot" />
          <span>DIGITAL IDENTITY INTELLIGENCE SYSTEM</span>
        </div>

        {/* Brand Display Title */}
        <h1 className="neurax-hero-brand-title">
          Trinetra
        </h1>

        {/* Hero Tagline */}
        <p className="neurax-hero-tagline">
          Trinetra is always watching you
        </p>

        {/* Subordinate Context */}
        <p className="neurax-hero-sub">
          A multi-signal correlation engine seeded by consented context. The face is a verification signal, never a search key.
        </p>

        {/* Action Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginTop: 32,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => scrollTo('about')}
            className="neurax-btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.9rem' }}
          >
            Explore System
            <ChevronRight style={{ width: 15, height: 15 }} />
          </button>
          <button
            onClick={() => scrollTo('architecture')}
            className="neurax-btn-ghost"
            style={{ padding: '11px 22px', fontSize: '0.9rem' }}
          >
            How It Works
          </button>
        </div>
      </div>

      {/* Spacious area in the middle is left intentionally open for the 3D Earth */}

      {/* Subtle Scroll Hint anchored at the bottom */}
      <div
        onClick={() => scrollTo('about')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '0.72rem',
          fontFamily: "'Space Grotesk', monospace",
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'color 0.2s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#06b6d4')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)')}
      >
        <span>SCROLL TO DISCOVER</span>
        <div className="neurax-scroll-dot" />
      </div>
    </section>
  );
};
