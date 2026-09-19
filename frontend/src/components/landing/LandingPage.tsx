import React from 'react';
import EarthBackground from '@/components/ui/earth-background';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { AboutSection } from './AboutSection';
import { ProblemSection } from './ProblemSection';
import { VisionSection } from './VisionSection';
import { HowItWorksSection } from './HowItWorksSection';
import { FeaturesSection } from './FeaturesSection';
import { ImpactSection } from './ImpactSection';
import { FutureSection } from './FutureSection';
import { Link } from 'react-router-dom';
import { Footer } from './Footer';

export const LandingPage: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: 'transparent',
        color: '#f8fafc',
      }}
    >
      {/* ── 3D EARTH (LOCKED - UNTOUCHED COMPONENT) ── */}
      <EarthBackground />

      {/* ── MINIMAL NAVIGATION ── */}
      <Navbar />

      {/* ── SCROLLING SECTIONS FLOW ── */}
      <main style={{ position: 'relative', zIndex: 10 }}>
        {/* HERO SECTION — Option A Composition with 3D Earth Dominant */}
        <Hero />

        {/* Deep space transition scrim to ensure readability as page scrolls */}
        <div
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(2, 4, 8, 0.75) 15%, rgba(2, 4, 8, 0.92) 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          {/* ABOUT THE PROJECT */}
          <AboutSection />

          {/* WHY IT EXISTS / THE PROBLEM */}
          <ProblemSection />

          {/* VISION & ETHICAL OSINT PRINCIPLES */}
          <VisionSection />

          {/* HOW IT WORKS / 6-STAGE PIPELINE */}
          <HowItWorksSection />

          {/* FEATURES / 7-SIGNAL ENGINE & CONTRADICTION MODEL */}
          <FeaturesSection />

          {/* IMPACT & CYBERSECURITY USE CASES */}
          <ImpactSection />

          {/* FUTURE & AMBITION */}
          <FutureSection />

          {/* LAUNCH CONSOLE ENTRY */}
          <div style={{ textAlign: 'center', padding: '20px 24px 80px' }}>
            <Link
              to="/investigation"
              className="neurax-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 32px',
                fontSize: '0.95rem',
                letterSpacing: '0.04em',
                textDecoration: 'none',
              }}
            >
              LAUNCH CONSOLE
            </Link>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
};
