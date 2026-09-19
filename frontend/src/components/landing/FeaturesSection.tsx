import React from 'react';
import { Sliders, AlertOctagon, CheckCircle2, Network, ExternalLink } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const signalWeights = [
    { name: 'Name & Alias Match', weight: '0.20', desc: 'Fuzzy phonetic and token-sort similarity' },
    { name: 'Image Verification', weight: '0.20', desc: 'Local in-memory face embedding cosine similarity' },
    { name: 'Organization Overlap', weight: '0.15', desc: 'Corroboration across verified employer registries' },
    { name: 'Source Corroboration', weight: '0.15', desc: 'Multi-platform agreement bonus across distinct domains' },
    { name: 'Username Variants', weight: '0.10', desc: 'Permutational handle mapping across platform namespaces' },
    { name: 'Project / Repo Overlap', weight: '0.10', desc: 'Shared commit authors, contributors, and releases' },
    { name: 'Context NLP Match', weight: '0.10', desc: 'Entity extraction from free-text background bios' },
  ];

  return (
    <section id="pillars" className="neurax-section">
      <div className="neurax-section-eyebrow">
        <span>05 // CORE CAPABILITIES</span>
      </div>

      <h2 className="neurax-section-title">
        Engineered for accuracy, resistance to false matches, and mathematical rigor.
      </h2>

      <p className="neurax-lead" style={{ maxWidth: 860 }}>
        In digital identity correlation, a single matching signal is almost always deceptive. Trinetra implements a strict corroboration gate and contradiction penalty model.
      </p>

      {/* 2-Column Feature Architecture */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 32,
          marginTop: 40,
        }}
      >
        {/* Left: Signal Weight Breakdown Matrix */}
        <div className="neurax-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sliders style={{ width: 20, height: 20, color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>
              Weighted Signal Composition
            </h3>
          </div>
          <p className="neurax-prose" style={{ fontSize: '0.9rem', marginBottom: 20 }}>
            Every candidate receives seven distinct signal scores normalized to [0, 1]. Because every positive weight is ≤ 0.20, no single signal alone can cross the 0.50 threshold.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {signalWeights.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{s.name}</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.78rem' }}>{s.desc}</div>
                </div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', monospace",
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#06b6d4',
                  }}
                >
                  +{s.weight}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Contradiction Engine & Strict Verdict Gates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Contradiction Penalty Card */}
          <div
            className="neurax-panel"
            style={{
              borderLeft: '3px solid #ffc85a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertOctagon style={{ width: 20, height: 20, color: '#ffc85a' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                Contradiction Penalty (-0.50)
              </h3>
            </div>
            <p className="neurax-prose" style={{ fontSize: '0.92rem', margin: '0 0 16px' }}>
              When independent sources report mutually incompatible facts (such as conflicting full-time employment locations during the same period), a severe contradiction penalty is subtracted.
            </p>
            <div
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: '0.8rem',
                color: '#ffc85a',
                background: 'rgba(255, 200, 90, 0.1)',
                padding: '8px 12px',
                borderRadius: 6,
              }}
            >
              identity_score = clamp( Σ (wᵢ · sᵢ) − (0.50 · contradiction_penalty), 0, 1 )
            </div>
          </div>

          {/* Verdict Classification Gate Card */}
          <div className="neurax-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: '#38bdf8' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                Three-Tier Verdict Gates
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div style={{ color: '#06b6d4', fontWeight: 600, fontSize: '0.88rem' }}>CONFIRMED (≥ 0.75)</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.82rem', marginTop: 2 }}>
                  Requires ≥2 independent source types to agree, plus at least two non-image signals ≥ 0.5.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.88rem' }}>POSSIBLE (0.50 – 0.74)</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.82rem', marginTop: 2 }}>
                  Plausible correlation flagged with explicit uncertainty tags for mandatory human analyst review.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.88rem' }}>INSUFFICIENT EVIDENCE (&lt; 0.50)</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.82rem', marginTop: 2 }}>
                  Rejected outright. Namesakes and low-confidence hypotheses are dropped with signal breakdown.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
