import React from 'react';
import { Target, UserCheck, ShieldAlert, ArrowUpRight } from 'lucide-react';

export const ImpactSection: React.FC = () => {
  const useCases = [
    {
      icon: Target,
      title: 'Threat Actor Attribution',
      desc: 'Link anonymous aliases and developer profiles behind malware campaigns by matching code repositories, technical forum activity, and cross-platform handle variants.',
      tag: 'THREAT INTELLIGENCE',
      color: '#06b6d4',
    },
    {
      icon: ShieldAlert,
      title: 'Executive Footprint Audits',
      desc: 'Audit external attack surfaces for executives and critical personnel by mapping unmonitored public accounts, credential exposure, and inadvertent location leaks.',
      tag: 'DEFENSIVE POSTURE',
      color: '#ffc85a',
    },
    {
      icon: UserCheck,
      title: 'High-Stakes Security Vetting',
      desc: 'Validate resumes, claimed institutional affiliations, and publication histories for security-cleared personnel and sensitive research positions with automated evidence trails.',
      tag: 'VETTING & CLEARANCE',
      color: '#38bdf8',
    },
  ];

  return (
    <section id="impact" className="neurax-section">
      <div className="neurax-section-eyebrow">
        <span>06 // APPLICATION DOMAINS</span>
      </div>

      <h2 className="neurax-section-title">
        Critical intelligence for high-stakes cybersecurity operations.
      </h2>

      <p className="neurax-lead" style={{ maxWidth: 840 }}>
        When digital identity decisions carry severe organizational or national security consequences, Trinetra replaces subjective intuition with verifiable mathematical certainty.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
          marginTop: 48,
        }}
      >
        {useCases.map((uc) => {
          const Icon = uc.icon;
          return (
            <div
              key={uc.title}
              className="neurax-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: `${uc.color}18`,
                    border: `1px solid ${uc.color}33`,
                    color: uc.color,
                    fontSize: '0.72rem',
                    fontFamily: "'Space Grotesk', monospace",
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    marginBottom: 20,
                  }}
                >
                  <Icon style={{ width: 13, height: 13 }} />
                  {uc.tag}
                </div>

                <h3
                  style={{
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    fontSize: '1.3rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    margin: '0 0 14px',
                  }}
                >
                  {uc.title}
                </h3>

                <p className="neurax-prose" style={{ fontSize: '0.95rem' }}>
                  {uc.desc}
                </p>
              </div>

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.8rem',
                }}
              >
                <span>OPERATIONAL SCENARIO</span>
                <ArrowUpRight style={{ width: 14, height: 14, color: uc.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
