/**
 * @screen SC-00 (Public Landing Page)
 * @feature Public
 * @roles ALL (Unauthenticated)
 * @description Apple-grade public landing page for GrainLedger.
 * Modular architecture with Apple Fluid Motion, Liquid Glass materials,
 * and high-performance code-split sections.
 */
import React from "react";

import {
  Navbar,
  HeroSection,
  ProblemSection,
  BentoGridFeatures,
  ComparisonBento,
  LiveSimulatorSection,
  EcosystemSection,
  LandingCtaFooter,
} from "../components";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-base dark:bg-canvas-dark text-ink-primary dark:text-canvas-light font-sans selection:bg-accent-primary/20 selection:text-accent-primary transition-colors duration-300">
      {/* 1. Sticky Apple Liquid Glass Navbar */}
      <Navbar />

      <main>
        {/* 2. Hero Section with Cinematic Glow */}
        <HeroSection />

        {/* 3. The Big Challenge & Impact Metrics */}
        <ProblemSection />

        {/* 4. 4 Tech Pillars Apple Bento Grid */}
        <BentoGridFeatures />

        {/* 5. Traditional vs GrainLedger Comparison */}
        <ComparisonBento />

        {/* 6. Interactive Live Ledger & MRL Simulator */}
        <LiveSimulatorSection />

        {/* 7. Ecosystem & Stakeholders */}
        <EcosystemSection />
      </main>

      {/* 8. Call to Action & Modern Minimal Footer */}
      <LandingCtaFooter />
    </div>
  );
};

export default LandingPage;
