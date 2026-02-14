# Plan 07-01: Landing Page

## Goal
Bold, simple landing page at root URL that explains what this is and funnels to play.

## Changes

### 1. Redesign `src/pages/index.astro`
- Hero section: Game title, tagline "Stand Up. Speak Out."
- 1-2 sentence pitch: "A protest simulator. Craft your sign. Learn the traffic lights. Experience what it's really like to stand on a street corner for democracy."
- Bold "PLAY NOW" CTA button
- Subtle "How It Works" section: 3-step flow (Craft -> Protest -> Share)
- Footer: "honkfordemocracy.org" branding
- Mobile-first responsive design
- Background: dark gradient with subtle protest-themed texture
- Fast-loading: no images, all CSS/text

### 2. Add OG meta tags to Layout.astro
- og:title, og:description, og:type for social sharing
- twitter:card meta tags

## Success Criteria
- Landing page renders at /
- Play Now button links to /play
- Page is mobile-responsive
- All content is text/CSS (no image assets needed)
