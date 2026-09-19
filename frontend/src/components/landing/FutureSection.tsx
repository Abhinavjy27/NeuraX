import React from 'react';
import { Compass, Sparkles } from 'lucide-react';

export const FutureSection: React.FC = () => {
  return (
    <section className="neurax-section" style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 60 }}>
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '48px 32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="neurax-section-eyebrow" style={{ justifyContent: 'center' }}>
          <span>07 // FUTURE & AMBITION</span>
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: '#ffffff',
            margin: '0 0 24px',
            letterSpacing: '-0.03em',
          }}
        >
          Pioneering the benchmark for transparent, verifiable digital footprint correlation.
        </h2>

        <p
          className="neurax-prose"
          style={{
            fontSize: '1.15rem',
            maxWidth: 780,
            margin: '0 auto',
            lineHeight: 1.7,
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          As public digital identities continue to fragment across emerging decentralized networks, developer registries, and academic platforms, Trinetra is evolving to expand its real-time knowledge graphs while strictly adhering to open-source ethical boundaries.
        </p>
      </div>
    </section>
  );
};
