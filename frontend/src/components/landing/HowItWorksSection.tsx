import React from 'react';
import { Upload, Cpu, Search, GitMerge, FileText, Network, ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Consented Seeding & Gate',
      desc: 'Pipeline accepts a consented photo plus minimal text context (name, username, or profile handle). Consent verification is enforced before processing commences.',
      icon: Upload,
      color: '#06b6d4',
    },
    {
      num: '02',
      title: 'Candidate Pool Generation',
      desc: 'NLP Named Entity Recognition parses name variants and affiliations while local face embedding models create an in-memory verification vector.',
      icon: Cpu,
      color: '#38bdf8',
    },
    {
      num: '03',
      title: 'Multi-Platform Discovery',
      desc: 'Concurrent asynchronous querying across GitHub REST, YouTube Data, public search indices, and Playwright headless DOM scraping of developer artifacts.',
      icon: Search,
      color: '#ffc85a',
    },
    {
      num: '04',
      title: 'Multi-Signal Correlation Engine',
      desc: 'Candidates are evaluated across 7 weighted signals (name, avatar, orgs, projects, handles, bio context, corroboration) with contradiction penalties.',
      icon: GitMerge,
      color: '#f59e0b',
    },
    {
      num: '05',
      title: 'Claim & Evidence Verification',
      desc: 'Constrained LLM extraction parses bios and posts into structured claims (works_at, authored, located_in), attaching verifiable source URLs and confidence scores.',
      icon: FileText,
      color: '#a78bfa',
    },
    {
      num: '06',
      title: 'Timeline & Knowledge Graph',
      desc: 'Builds a canonical Person identity, chronological milestone timeline, and interactive entity-relationship graph connecting organizations, projects, and accounts.',
      icon: Network,
      color: '#ec4899',
    },
  ];

  return (
    <section id="architecture" className="neurax-section">
      <div className="neurax-section-eyebrow">
        <span>04 // SYSTEM ARCHITECTURE</span>
      </div>

      <h2 className="neurax-section-title">
        How Trinetra correlates disparate signals into a unified intelligence graph.
      </h2>

      <p className="neurax-lead" style={{ maxWidth: 840 }}>
        An autonomous, six-stage pipeline that transforms an initial seed into an interconnected, evidence-verified digital dossier.
      </p>

      {/* Step Sequence Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          marginTop: 48,
        }}
      >
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', monospace",
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: step.color,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {step.num}
                  </span>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step.color,
                    }}
                  >
                    <Icon style={{ width: 20, height: 20 }} />
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    margin: '0 0 12px',
                  }}
                >
                  {step.title}
                </h3>

                <p className="neurax-prose" style={{ fontSize: '0.95rem' }}>
                  {step.desc}
                </p>
              </div>

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.78rem',
                  fontFamily: "'Space Grotesk', monospace",
                }}
              >
                <span>STAGE {idx + 1} OF 6</span>
                {idx < 5 && <ArrowRight style={{ width: 12, height: 12, opacity: 0.5 }} />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
