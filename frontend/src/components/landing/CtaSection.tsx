import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Upload, Terminal, CheckCircle } from 'lucide-react';

export const CtaSection: React.FC = () => {
  const [context, setContext] = useState('');
  const [consent, setConsent] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section id="cta" className="neurax-section" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div
        style={{
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(8, 14, 24, 0.85) 0%, rgba(2, 4, 8, 0.95) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          padding: '56px 40px',
          maxWidth: 980,
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(6, 182, 212, 0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="neurax-section-eyebrow" style={{ justifyContent: 'center' }}>
            <span>08 // INVESTIGATION GATEWAY</span>
          </div>

          <h2
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 16px',
            }}
          >
            Ready to correlate a public digital identity?
          </h2>

          <p className="neurax-prose" style={{ maxWidth: 640, margin: '0 auto' }}>
            Input a consented image and contextual seed to execute the autonomous multi-signal discovery pipeline.
          </p>
        </div>

        {/* Mock/Live Console Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 620,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Mock Photo Dropzone */}
          <div
            style={{
              border: '1px dashed rgba(6, 182, 212, 0.35)',
              borderRadius: 12,
              padding: '24px 20px',
              textAlign: 'center',
              background: 'rgba(6, 182, 212, 0.03)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
          >
            <Upload style={{ width: 24, height: 24, color: '#06b6d4', margin: '0 auto 8px' }} />
            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
              Upload Consented Subject Photo
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem', marginTop: 4 }}>
              JPG or PNG · Computed in-memory only · Discarded on job end
            </div>
          </div>

          {/* Context Input */}
          <div>
            <label
              htmlFor="seed-context"
              style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '0.8rem',
                fontFamily: "'Space Grotesk', monospace",
                marginBottom: 6,
              }}
            >
              SEED CONTEXT (NAME, USERNAME, OR KNOWN PROFILE URL)
            </label>
            <input
              id="seed-context"
              type="text"
              placeholder="e.g. John Doe, software engineer, Bangalore (or github.com/username)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Mandatory Consent Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#06b6d4' }}
            />
            <span>
              I confirm that consent has been obtained from the subject for public digital footprint verification pursuant to ethical OSINT guidelines.
            </span>
          </label>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!consent}
            className="neurax-btn-primary"
            style={{
              justifyContent: 'center',
              padding: '14px 28px',
              fontSize: '0.95rem',
              opacity: consent ? 1 : 0.5,
              cursor: consent ? 'pointer' : 'not-allowed',
            }}
          >
            {submitted ? (
              <>
                <CheckCircle style={{ width: 16, height: 16 }} />
                Pipeline Dispatched to /api/analyze
              </>
            ) : (
              <>
                Run Trinetra Analysis
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>

          {/* Privacy Footnote */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.75rem',
              marginTop: 4,
            }}
          >
            <ShieldCheck style={{ width: 14, height: 14, color: '#06b6d4' }} />
            <span>FastAPI Backend Ready · Active Port 8000 Proxy Configured</span>
          </div>
        </form>
      </div>
    </section>
  );
};
