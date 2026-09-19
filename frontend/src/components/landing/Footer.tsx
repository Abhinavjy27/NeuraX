import React from 'react';
import { ShieldCheck, GitBranch, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '60px 32px 40px',
        backgroundColor: 'rgba(2, 4, 8, 0.95)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 32,
          }}
        >
          {/* Brand Col */}
          <div style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.03em',
                }}
              >
                Trinetra
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontFamily: "'Space Grotesk', monospace",
                  color: '#06b6d4',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                v1.0.0
              </span>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              Digital Identity Intelligence System. Autonomous multi-signal correlation across public web platforms with evidence verification and confidence scoring.
            </p>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '0.08em',
                  marginBottom: 14,
                }}
              >
                NAVIGATION
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li>
                  <a href="#about" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>
                    About Trinetra
                  </a>
                </li>
                <li>
                  <a href="#problem" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>
                    The Problem
                  </a>
                </li>
                <li>
                  <a href="#architecture" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#pillars" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>
                    Core Pillars
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '0.08em',
                  marginBottom: 14,
                }}
              >
                SPECIFICATION
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  FastAPI REST Endpoints
                </li>
                <li style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  7-Signal Scoring Matrix
                </li>
                <li style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  NetworkX Knowledge Graph
                </li>
                <li style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  Structured Claim Extraction
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div
          style={{
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <div>
            Trinetra · Domain 3: AI in Cybersecurity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Ethical OSINT · Consented Single-Subject Verification Only</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
