import React from 'react';
import { Lock, EyeOff, ShieldCheck, Scale } from 'lucide-react';

export const VisionSection: React.FC = () => {
  return (
    <section className="neurax-section" style={{ paddingTop: 60, paddingBottom: 60 }}>
      <div
        style={{
          borderRadius: 20,
          background: 'radial-gradient(ellipse 90% 60% at 50% 50%, rgba(6, 182, 212, 0.08) 0%, rgba(2, 4, 8, 0.85) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          padding: '60px 40px',
          textAlign: 'center',
          maxWidth: 1080,
          margin: '0 auto',
        }}
      >
        <div className="neurax-section-eyebrow" style={{ justifyContent: 'center' }}>
          <span>03 // ETHICAL INTELLIGENCE PRINCIPLE</span>
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: '#ffffff',
            maxWidth: 820,
            margin: '0 auto 24px',
            letterSpacing: '-0.03em',
          }}
        >
          Intelligence without verifiable proof is speculation. Privacy without design guarantees is meaningless.
        </h2>

        <p
          style={{
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: 'rgba(255, 255, 255, 0.75)',
            maxWidth: 760,
            margin: '0 auto 40px',
          }}
        >
          Trinetra is designed around ethical OSINT standards. We reject indiscriminate mass surveillance and opaque black-box scoring. Every extraction is bounded by consent, public availability, and full evidentiary accountability.
        </p>

        {/* 4 Ethical Pillars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            textAlign: 'left',
          }}
        >
          <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(2, 4, 8, 0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Lock style={{ width: 20, height: 20, color: '#06b6d4', marginBottom: 12 }} />
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>
              Mandatory Consent Gate
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Jobs are rejected if consent is not confirmed. Designed for single-subject verification, not mass-scanning.
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(2, 4, 8, 0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <EyeOff style={{ width: 20, height: 20, color: '#ffc85a', marginBottom: 12 }} />
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>
              Zero Biometric Storage
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Embeddings are transient, calculated locally in RAM, and immediately discarded upon job completion.
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(2, 4, 8, 0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ShieldCheck style={{ width: 20, height: 20, color: '#38bdf8', marginBottom: 12 }} />
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>
              No Credential Bypass
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Uses only public, authorized data. Zero scraping behind authentication walls or leaked database usage.
            </div>
          </div>

          <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(2, 4, 8, 0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Scale style={{ width: 20, height: 20, color: '#a78bfa', marginBottom: 12 }} />
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>
              DPDP & GDPR Alignment
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Architected around purpose limitation, data minimisation, and ephemeral storage retention.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
