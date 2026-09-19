# Trinetra — Frontend Architecture & Sections Guide

This document provides a detailed overview of the frontend architecture, design system, component hierarchy, and individual sections built for **Trinetra** (formerly NeuraX) — a Digital Identity Intelligence System developed for Domain 3 (AI in Cybersecurity).

---

## 1. Architectural Overview

The frontend is built with **React 18**, **TypeScript**, and **Vite**, styled using **Tailwind CSS** with custom design tokens.

### Key Architectural Concepts
1. **The Locked 3D Earth (`EarthBackground`)**:
   * Sits as an immutable WebGL canvas positioned fixed behind the entire application (`zIndex: -10`).
   * Renders Earth with custom GLSL shaders (day/night blending, ocean specular highlights, dynamic city lights, atmospheric limb glow, data arcs, and a Pacific retrieval grid).
   * Responds in real-time to mouse coordinates via window-level event listeners.
   * Remains visually and functionally isolated from the scrolling content above it.
2. **Layered Scroll Experience**:
   * The page content scrolls naturally above the Earth (`zIndex: 10`).
   * The Hero section is spacious and semi-transparent, allowing the Earth to dominate the lower viewport.
   * As the user scrolls downwards, deep space gradients (`rgba(2, 4, 8, 0.85)`) and backdrop blur provide high text legibility while retaining the cosmic ambiance.
3. **Typography System**:
   * **Primary Display Font**: `Space Grotesk` (used for large titles, section headers, numbers, and technical kickers).
   * **Body & UI Font**: `Inter` (used for body prose, navigational items, form inputs, and buttons).
4. **Color Palette Derived from the Earth**:
   * **Deep Space Background**: `#020408`
   * **Primary Text**: `#f8fafc` / `#ffffff`
   * **Secondary / Muted Text**: `#94a3b8` / `rgba(255, 255, 255, 0.65)`
   * **Atmospheric Accent**: Electric Cyan (`#06b6d4` / `#38bdf8`)
   * **Data & City Lights Accent**: Warm Amber Gold (`#ffc85a` / `#f59e0b`)
   * **Borders & Panels**: `rgba(255, 255, 255, 0.08)` with backdrop blur

---

## 2. Component Hierarchy

```
App.tsx
└── ThemeProvider (Dark Mode Forced)
    └── BrowserRouter
        └── LandingPage.tsx
            ├── EarthBackground.tsx (LOCKED Three.js WebGL Layer)
            ├── Navbar.tsx
            ├── main (Content Layer)
            │   ├── Hero.tsx
            │   ├── AboutSection.tsx
            │   ├── ProblemSection.tsx
            │   ├── VisionSection.tsx
            │   ├── HowItWorksSection.tsx
            │   ├── FeaturesSection.tsx
            │   ├── ImpactSection.tsx
            │   ├── FutureSection.tsx
            │   └── CtaSection.tsx
            └── Footer.tsx
```

---

## 3. Detailed Section Breakdown

### 00. 3D Earth Layer (`earth-background.tsx` & `earth-textures.ts`)
* **Role**: Visual anchor and ambient backdrop.
* **Implementation Details**:
  * Employs Three.js `WebGLRenderer` and `PerspectiveCamera(38, aspect, 0.05, 200)`.
  * Loads 4 embedded data URI textures (`TEX.day`, `TEX.lights`, `TEX.spec`, `TEX.clouds`) from `earth-textures.ts`.
  * Generates procedural starfields and radial glow canvas textures in memory.
  * Auto-rotates slowly while tracking mouse coordinates with exponential damping (`1 - Math.exp(-dt * 3.0)`).
  * Framed with camera `yOffset = 6.0` to place the Earth's curve in the lower-middle viewport.

---

### 01. Minimal Navigation (`Navbar.tsx`)
* **Role**: Primary global header and quick-navigation system.
* **Components & Behavior**:
  * **Dynamic Translucency**: Begins fully transparent over the Hero, then applies `rgba(2, 4, 8, 0.82)` background with `backdrop-filter: blur(16px)` and a subtle border when the user scrolls past 40px.
  * **Brand Identity**: Displays `Trinetra` alongside a cyan `CYBER INTEL` pill badge.
  * **Anchor Navigation**: Smooth-scroll buttons linking to `#about`, `#problem`, `#architecture`, `#pillars`, and `#impact`.
  * **Primary Action**: "Launch Console" CTA button that smoothly scrolls to the `#cta` section.
  * **Mobile Navigation**: Collapsible hamburger menu drawer for screens under 768px.

---

### 02. Hero Section (`Hero.tsx`)
* **Role**: The opening visual composition designed specifically around the 3D Earth.
* **Layout Paradigm**: **Option A (Top-Centered Architectural)**.
* **Components & Behavior**:
  * **Top Eyebrow**: `DIGITAL IDENTITY INTELLIGENCE SYSTEM` with a pulsing cyan status dot.
  * **Display Title**: `Trinetra` formatted with `clamp(3.75rem, 8.5vw, 8.5rem)` in Space Grotesk 700 with a subtle cyan drop-shadow.
  * **Tagline**: *"Trinetra is always watching you"*
  * **Subordinate Context**: Explains that context seeds the search and the face is strictly a verification signal.
  * **Call to Action Buttons**: Primary button (`Explore System`) and Ghost button (`How It Works`).
  * **Spacious Center**: Leaves the entire middle and lower viewport open so the rotating Earth is unobstructed.
  * **Scroll Indicator**: Subtle animated `"SCROLL TO DISCOVER"` element with a vertical bouncing dot anchored at the bottom edge.

---

### 03. About the Project (`AboutSection.tsx`)
* **Role**: Editorial introduction to the core philosophy and operational model.
* **Components & Behavior**:
  * **Kicker**: `01 // ABOUT THE SYSTEM`.
  * **Headline**: *"An intelligence engine that resolves digital identities through corroboration, not guesswork."*
  * **Mission Lead**: Defines Trinetra's mission for cybersecurity and verification workflows.
  * **Editorial Callout Quote**: Emphasizes that Trinetra does not perform reverse-face searches on the web.
  * **Three Core Tenets**:
    1. *Multi-Signal Corroboration*: No single signal decides identity.
    2. *Verification, Never Search*: Face embeddings are transient in-memory signals.
    3. *Mandatory Traceability*: Every claim links directly to source URLs and excerpts.

---

### 04. The Problem / Why It Exists (`ProblemSection.tsx`)
* **Role**: Establishes the real-world friction and dangers of manual open-source intelligence (OSINT).
* **Layout Paradigm**: Split editorial grid.
* **Components & Behavior**:
  * **Kicker**: `02 // THE PROBLEM`.
  * **Left Column**: Explains how digital identities are fragmented across disparate platforms and accounts. Includes `THE TRINETRA SHIFT` takeaway card.
  * **Right Column (The 3 Friction Points)**:
    1. *Slow & Exhausting*: Hours spent manually cross-referencing tabs.
    2. *Error-Prone & Confusing*: Namesakes, imposters, and clones causing false attributions.
    3. *Fundamentally Unscalable*: Infeasible for enterprise-scale vetting and due diligence.

---

### 05. Ethical Principles & Vision (`VisionSection.tsx`)
* **Role**: Explains Trinetra's privacy-respecting and compliance-first design principles.
* **Components & Behavior**:
  * **Kicker**: `03 // ETHICAL INTELLIGENCE PRINCIPLE`.
  * **Statement**: *"Intelligence without verifiable proof is speculation. Privacy without design guarantees is meaningless."*
  * **Four Privacy Safeguards**:
    1. *Mandatory Consent Gate*: Requires `consent_confirmed=true`.
    2. *Zero Biometric Storage*: Face vectors are discarded upon job termination.
    3. *No Credential Bypass*: Uses public, authorized data only; no auth-wall bypassing.
    4. *DPDP & GDPR Alignment*: Built around data minimization and purpose limitation.

---

### 06. How It Works / Pipeline Architecture (`HowItWorksSection.tsx`)
* **Role**: Clear step-by-step breakdown of the backend processing pipeline.
* **Components & Behavior**:
  * **Kicker**: `04 // SYSTEM ARCHITECTURE`.
  * **Headline**: *"How Trinetra correlates disparate signals into a unified intelligence graph."*
  * **6-Stage Sequence Grid**:
    * **01. Consented Seeding & Gate**: Consented photo + initial seed string.
    * **02. Candidate Pool Generation**: spaCy NLP entity extraction + local face embedding.
    * **03. Multi-Platform Discovery**: Concurrent async calls to GitHub, YouTube, search APIs, and Playwright.
    * **04. Multi-Signal Correlation Engine**: 7-signal weighting + contradiction penalties.
    * **05. Claim & Evidence Verification**: Constrained LLM claim extraction with traceable URLs.
    * **06. Timeline & Knowledge Graph**: Synthesizing the canonical Person object, timeline, and graph.

---

### 07. Core Capabilities & Mathematical Rigor (`FeaturesSection.tsx`)
* **Role**: Details the scoring formula, signal weights, and anti-hallucination guardrails.
* **Components & Behavior**:
  * **Kicker**: `05 // CORE CAPABILITIES`.
  * **Signal Composition Matrix (Left)**:
    * Name & Alias Match: `+0.20`
    * Image Verification: `+0.20`
    * Organization Overlap: `+0.15`
    * Source Corroboration: `+0.15`
    * Username Variants: `+0.10`
    * Project Overlap: `+0.10`
    * Context NLP Match: `+0.10`
  * **Contradiction Penalty Card (Right Top)**:
    * Documents `-0.50` penalty subtracted when sources conflict (e.g. incompatible job locations).
  * **Three-Tier Verdict Gates (Right Bottom)**:
    * `CONFIRMED (≥ 0.75)`: Requires ≥2 independent sources + 2 non-image signals ≥ 0.5.
    * `POSSIBLE (0.50 – 0.74)`: Flagged for mandatory human review.
    * `INSUFFICIENT EVIDENCE (< 0.50)`: Outright rejected to prevent false matches.

---

### 08. Application Domains (`ImpactSection.tsx`)
* **Role**: Showcases real-world enterprise and national security use cases.
* **Components & Behavior**:
  * **Kicker**: `06 // APPLICATION DOMAINS`.
  * **Three Core Operational Scenarios**:
    1. *Threat Actor Attribution* (`THREAT INTELLIGENCE`): Matching developer artifacts, code commits, and handle permutations to trace actors behind malicious campaigns.
    2. *Executive Footprint Audits* (`DEFENSIVE POSTURE`): Mapping exposed accounts, shadow profiles, and location leaks.
    3. *High-Stakes Security Vetting* (`VETTING & CLEARANCE`): Automating background validation for personnel entering sensitive environments.

---

### 09. Future & Ambition (`FutureSection.tsx`)
* **Role**: Editorial closing statement on the roadmap of public digital footprint intelligence.
* **Components & Behavior**:
  * **Kicker**: `07 // FUTURE & AMBITION`.
  * **Headline**: *"Pioneering the benchmark for transparent, verifiable digital footprint correlation."*
  * Discusses future real-time multi-registry federation and open-source ethical boundaries.

---

### 10. Investigation Gateway (`CtaSection.tsx`)
* **Role**: Interactive call-to-action simulating how an analyst initiates an investigation.
* **Components & Behavior**:
  * **Kicker**: `08 // INVESTIGATION GATEWAY`.
  * **Photo Dropzone**: Mock file upload area specifying that image embeddings are processed in-memory only.
  * **Seed Context Field**: Text input accepting names, handles, or profile URLs (e.g. `github.com/username`).
  * **Mandatory Consent Checkbox**: Must be checked to enable the submit button, reflecting the system's privacy gate.
  * **Dispatch Action**: Triggers simulated submission to the `/api/analyze` backend endpoint.
  * **Backend Ready Footnote**: Confirms connection to the FastAPI backend proxy.

---

### 11. Global Footer (`Footer.tsx`)
* **Role**: Global closing anchor and metadata container.
* **Components & Behavior**:
  * **Brand Column**: `Trinetra v1.0.0` with mission statement.
  * **Navigation Links**: Quick jump links to key sections.
  * **System Specification**: Lists underlying technologies (FastAPI, 7-Signal Matrix, NetworkX, Claims).
  * **Attribution Bar**: Explicitly marks: `Trinetra · Domain 3: AI in Cybersecurity` with ethical OSINT guarantees.

---

## 4. Key Files Reference

| File | Location | Purpose |
|---|---|---|
| `LandingPage.tsx` | [`frontend/src/components/landing/LandingPage.tsx`](file:///d:/NeuraX/frontend/src/components/landing/LandingPage.tsx) | Master container orchestrating all sections over the 3D Earth |
| `Navbar.tsx` | [`frontend/src/components/landing/Navbar.tsx`](file:///d:/NeuraX/frontend/src/components/landing/Navbar.tsx) | Sticky navigation with blur effect and mobile menu |
| `Hero.tsx` | [`frontend/src/components/landing/Hero.tsx`](file:///d:/NeuraX/frontend/src/components/landing/Hero.tsx) | Option A top-centered hero layout |
| `AboutSection.tsx` | [`frontend/src/components/landing/AboutSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/AboutSection.tsx) | Editorial introduction and core tenets |
| `ProblemSection.tsx` | [`frontend/src/components/landing/ProblemSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/ProblemSection.tsx) | Split problem layout (fragmented identity) |
| `VisionSection.tsx` | [`frontend/src/components/landing/VisionSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/VisionSection.tsx) | Ethical OSINT principles & privacy safeguards |
| `HowItWorksSection.tsx` | [`frontend/src/components/landing/HowItWorksSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/HowItWorksSection.tsx) | 6-stage architecture pipeline |
| `FeaturesSection.tsx` | [`frontend/src/components/landing/FeaturesSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/FeaturesSection.tsx) | 7-signal scoring matrix and verdict gates |
| `ImpactSection.tsx` | [`frontend/src/components/landing/ImpactSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/ImpactSection.tsx) | Cybersecurity use cases (Threat Intel, Vetting) |
| `FutureSection.tsx` | [`frontend/src/components/landing/FutureSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/FutureSection.tsx) | Ambition and future roadmap |
| `CtaSection.tsx` | [`frontend/src/components/landing/CtaSection.tsx`](file:///d:/NeuraX/frontend/src/components/landing/CtaSection.tsx) | Investigation console gateway with consent gate |
| `Footer.tsx` | [`frontend/src/components/landing/Footer.tsx`](file:///d:/NeuraX/frontend/src/components/landing/Footer.tsx) | Global footer with hackathon domain attribution |
| `earth-background.tsx` | [`frontend/src/components/ui/earth-background.tsx`](file:///d:/NeuraX/frontend/src/components/ui/earth-background.tsx) | **LOCKED**: 3D Three.js WebGL Earth model |
| `earth-textures.ts` | [`frontend/src/components/ui/earth-textures.ts`](file:///d:/NeuraX/frontend/src/components/ui/earth-textures.ts) | **LOCKED**: Planetary texture maps encoded as data URIs |
| `index.css` | [`frontend/src/index.css`](file:///d:/NeuraX/frontend/src/index.css) | Global design system, typography scale, and utility classes |
