import React from 'react';
import { ShieldCheck, Fingerprint, Layers, Cpu } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="neurax-section">
      {/* Top Editorial Kicker */}
      <div className="neurax-section-eyebrow">
        <span>01 // ABOUT THE SYSTEM</span>
      </div>

      <h2 className="neurax-section-title" style={{ maxWidth: 880 }}>
        An intelligence engine that resolves digital identities through corroboration, not guesswork.
      </h2>

      <p className="neurax-lead" style={{ maxWidth: 900 }}>
        Trinetra is an AI-powered Digital Footprint Intelligence System engineered for high-stakes cybersecurity and verification workflows. It takes a consented image and seed context (name, username, or profile handle) to autonomously discover, correlate, and cross-reference public profiles across the global web.
      </p>

      {/* Editorial Block Quote Callout */}
      <div
        style={{
          borderLeft: '2px solid #06b6d4',
          paddingLeft: '24px',
          margin: '40px 0 60px',
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%)',
          paddingTop: 16,
          paddingBottom: 16,
        }}
      >
        <p
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: '1.25rem',
            lineHeight: 1.6,
            color: '#f1f5f9',
            fontStyle: 'italic',
            margin: 0,
          }}
        >
          "This is not a reverse-image search tool or a generic scraper. Trinetra does not search the web by face. The context seeds candidate hypotheses; the image and corroborating public evidence confirm or refute them."
        </p>
      </div>

      {/* Core Architectural Tenets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          marginTop: 20,
        }}
      >
        <div className="neurax-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ color: '#06b6d4' }}>
              <Layers style={{ width: 22, height: 22 }} />
            </div>
            <span className="neurax-num-label">TENET 01</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>
            Multi-Signal Corroboration
          </h3>
          <p className="neurax-prose">
            No single signal makes a decision. Identity hypotheses are weighed across 7 independent dimensions: names, handles, organizational overlap, project affiliations, bios, and face similarity.
          </p>
        </div>

        <div className="neurax-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ color: '#ffc85a' }}>
              <Fingerprint style={{ width: 22, height: 22 }} />
            </div>
            <span className="neurax-num-label">TENET 02</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>
            Verification, Never Search
          </h3>
          <p className="neurax-prose">
            Biometric embeddings operate strictly as transient verification signals computed locally in memory. Embeddings are never stored, indexed into databases, or transmitted to third-party APIs.
          </p>
        </div>

        <div className="neurax-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ color: '#38bdf8' }}>
              <ShieldCheck style={{ width: 22, height: 22 }} />
            </div>
            <span className="neurax-num-label">TENET 03</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>
            Mandatory Traceability
          </h3>
          <p className="neurax-prose">
            Every material claim—from employment histories to published repositories—carries direct source URLs, exact textual excerpts, and calibrated confidence levels.
          </p>
        </div>
      </div>
    </section>
  );
};
