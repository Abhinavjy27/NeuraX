import React from 'react';
import { Clock, AlertTriangle, Database, Check } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  return (
    <section id="problem" className="neurax-section">
      <div className="neurax-section-eyebrow">
        <span>02 // THE PROBLEM</span>
      </div>

      {/* Split Editorial Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 48,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Big Statement */}
        <div>
          <h2 className="neurax-section-title" style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.6rem)' }}>
            Public digital footprints are fragmented across the web.
          </h2>
          <p className="neurax-lead">
            The same individual operates under disparate aliases, usernames, and partial profiles across dozens of platforms — from open-source repositories to video channels, conference registries, and personal blogs.
          </p>
          <p className="neurax-prose">
            Traditional threat intelligence and identity verification rely on manual open-source investigations. Without autonomous correlation, security analysts spend dozens of hours chasing incomplete clues and conflicting claims.
          </p>

          {/* Contrast metric / takeaway */}
          <div
            style={{
              marginTop: 32,
              padding: '24px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ color: '#06b6d4', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
              THE TRINETRA SHIFT
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Replacing disjointed manual searches with autonomous entity resolution, multi-signal scoring, and instant corroboration.
            </div>
          </div>
        </div>

        {/* Right Column: The 3 Core Friction Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            className="neurax-panel"
            style={{
              borderLeft: '3px solid rgba(239, 68, 68, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Clock style={{ width: 18, height: 18, color: '#f87171' }} />
              <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.85rem' }}>SLOW & EXHAUSTING</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
              Hours of Manual Cross-Referencing
            </h3>
            <p className="neurax-prose" style={{ margin: 0, fontSize: '0.95rem' }}>
              Analysts manually jump between tabs, inspect commit logs, parse social bios, and correlate timestamps by hand to construct a basic timeline.
            </p>
          </div>

          <div
            className="neurax-panel"
            style={{
              borderLeft: '3px solid rgba(245, 158, 11, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <AlertTriangle style={{ width: 18, height: 18, color: '#fbbf24' }} />
              <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem' }}>ERROR-PRONE & CONFUSING</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
              Namesakes, Imposters & Conflicting Facts
            </h3>
            <p className="neurax-prose" style={{ margin: 0, fontSize: '0.95rem' }}>
              Sharing a common name or a stolen profile picture frequently causes false matches. Legacy systems lack contradiction penalties and silently merge unrelated people.
            </p>
          </div>

          <div
            className="neurax-panel"
            style={{
              borderLeft: '3px solid rgba(148, 163, 184, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Database style={{ width: 18, height: 18, color: '#94a3b8' }} />
              <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>FUNDAMENTALLY UNSCALABLE</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
              Infeasible for Enterprise Due Diligence
            </h3>
            <p className="neurax-prose" style={{ margin: 0, fontSize: '0.95rem' }}>
              Verifying contractors, security-sensitive candidates, or suspicious actors across multiple platforms cannot scale when relying on ad-hoc human browsing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
