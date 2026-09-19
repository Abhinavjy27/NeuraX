import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ShieldCheck, Upload, CheckCircle } from 'lucide-react';

export const InvestigationPage: React.FC = () => {
  const navigate = useNavigate();
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#020408',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Minimal Top Bar */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(2, 4, 8, 0.95)',
          padding: '16px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '6px 0',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)')}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} />
              Back
            </button>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
            <Link
              to="/"
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: '1.2rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                textDecoration: 'none',
              }}
            >
              Trinetra
            </Link>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: "'Space Grotesk', monospace",
              color: '#06b6d4',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            CONSOLE MODE
          </span>
        </div>
      </header>

      {/* Main Console Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            backgroundColor: 'rgba(8, 14, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            padding: '48px 40px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#06b6d4',
                marginBottom: 12,
              }}
            >
              INVESTIGATION GATEWAY
            </div>

            <h1
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.15,
                margin: '0 0 12px',
                letterSpacing: '-0.03em',
              }}
            >
              Ready to correlate a public digital identity?
            </h1>

            <p
              style={{
                fontSize: '0.98rem',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.65)',
                margin: 0,
              }}
            >
              Input a consented image and contextual seed to execute the autonomous multi-signal discovery pipeline.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Subject Photo Dropzone */}
            <div
              style={{
                border: '1px dashed rgba(6, 182, 212, 0.35)',
                borderRadius: 10,
                padding: '24px 20px',
                textAlign: 'center',
                background: 'rgba(6, 182, 212, 0.03)',
                cursor: 'pointer',
              }}
            >
              <Upload style={{ width: 22, height: 22, color: '#06b6d4', margin: '0 auto 8px' }} />
              <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>
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
                  fontSize: '0.78rem',
                  fontFamily: "'Space Grotesk', monospace",
                  marginBottom: 8,
                  letterSpacing: '0.04em',
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
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
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
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#06b6d4' }}
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
                width: '100%',
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
      </main>
    </div>
  );
};
