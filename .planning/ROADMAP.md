# Roadmap: Honk For Democracy

## Overview

Milestone 2 delivers "The Sign & The Polish" — transforming the sign creator into a first-class creative tool, polishing every visual and audio surface, adding social sharing as the viral loop, and tuning the single intersection map until it's perfect. Five phases build on M1's complete game loop: sign creator first (it's half the experience), then visual polish, audio polish, the social share viral loop, and finally tuning everything until it sings.

## M1 Phases (Complete)

- [x] **Phase 1: Scaffolding & Game Boot** - Astro + Phaser integrated, rendering on mobile
- [x] **Phase 2: Core Game Loop** - Visibility cone, traffic, reactions — the game exists
- [x] **Phase 3: Sign Crafting** - Pre-game creative expression that feeds into gameplay
- [x] **Phase 4: Game Systems** - Confidence meter + arm fatigue — the emotional and physical layer
- [x] **Phase 5: Event System** - Cop check, weather, karma — variety and real-world learning
- [x] **Phase 6: Score & End Screens** - Session boundary, sharing, activism payload
- [x] **Phase 7: Landing Page, Polish & Deploy** - First impression, audio, optimization, ship it

## M2 Phases

- [x] **Phase 8: Sign Creator** - First-class creative tool with fonts, colors, materials, decorations
- [x] **Phase 9: Visual & UI Polish** - Paper Mario reskin — 8 plans, ~229 tool calls
- [x] **Phase 10: Audio Polish** - Tone.js procedural audio — 4 plans, ~126 tool calls
- [x] **Phase 11: Social Share** - Polaroid share card, download/Web Share API, OG meta — 3 plans, ~47 tool calls
- [ ] **Phase 12: Debug & Tuning** - Partial (6 quick tasks: refactor, car fix, readability, emoji, dev tools)
- [ ] **Phase 13: Sign Craft UX Redesign** - Responsive layout, tabbed controls, randomize, expanded options

## Phase Details

### Phase 8: Sign Creator
**Goal**: The sign creator is a first-class creative tool — fonts, colors, materials, decorations. Arts & crafts energy. The sign you build is what your character holds in-game. Not a throwaway step — this is half the experience.
**Depends on**: Phase 7 (M1 complete)
**Requirements**: SIGN-10, SIGN-11, SIGN-12, SIGN-13, SIGN-14, SIGN-15, SIGN-16, SIGN-17, SIGN-18, SIGN-19
**Success Criteria** (what must be TRUE):
  1. Player can choose from at least 4 font styles and the sign preview updates in real-time
  2. Player can pick text color from a palette of at least 6 marker/paint colors
  3. At least 4 materials are available with visually distinct textures (cardboard, posterboard, foam board, wood)
  4. Player can add at least 3 types of decorative elements (glitter, tape, stickers) to their sign
  5. The crafted sign with all customizations (font, color, material, decorations) is visible on the player character during gameplay and featured on the score screen
**Plans:** 3 plans
Plans:
- [x] 08-01-PLAN.md — Fabric.js sign editor with text, fonts, colors, material backgrounds (Complete 2026-02-14)
- [ ] 08-02-PLAN.md — Decoration/sticker system (stickers, tape, drawn accents)
- [ ] 08-03-PLAN.md — Phaser integration (PNG texture on player + score screen) + decoration picker UI

### Phase 9: Visual & UI Polish
**Goal**: Replace placeholder graphics with polished visuals, make timer/game-end clear, tune controls, ensure every player action has clear visual feedback
**Depends on**: Phase 8
**Requirements**: VISL-01, VISL-02, VISL-03, VISL-04, VISL-05, VISL-06, VISL-07, VISL-08, VISL-09
**Success Criteria** (what must be TRUE):
  1. Intersection elements (roads, traffic lights, cars, buildings) use clean SVG or styled graphics — no programmer art
  2. Reaction indicators are distinct and immediately recognizable (positive vs negative is obvious at a glance)
  3. Player always knows how much time is left and receives clear warning before session ends
  4. Game-end transition clearly communicates what happened (time ran out vs confidence zero) before showing score
  5. UI has consistent visual language — a new player can understand all meters, buttons, and indicators without explanation

### Phase 10: Audio Polish
**Goal**: Procedural audio system sounds intentional and balanced — ambient sets the scene, music carries energy, SFX punctuate moments, nothing jars
**Depends on**: Phase 9
**Requirements**: AUDI-01, AUDI-02, AUDI-03, AUDI-04, AUDI-05, AUDI-06
**Success Criteria** (what must be TRUE):
  1. Background ambient layer (street noise, traffic hum) plays during gameplay and sets the outdoor protest scene
  2. A non-intrusive music loop plays during gameplay that shifts energy with confidence level
  3. No single sound effect is significantly louder or more jarring than others
  4. Audio transitions between scenes and states are smooth (no pops, clicks, or abrupt silence)
  5. All sound layers (music, ambient, SFX) are individually reasonable and comfortable when playing together
**Plans:** 4 plans
Plans:
- [ ] 10-01-PLAN.md — Audio mixer foundation + Tone.js install + AudioSystem wiring
- [ ] 10-02-PLAN.md — Ambient street noise system + centralized audio config
- [ ] 10-03-PLAN.md — Confidence-reactive stadium organ music + reactive cue system
- [ ] 10-04-PLAN.md — Full integration, SFX enhancement (honk variety, doppler, clunk), scene wiring, balance verification

### Phase 11: Social Share
**Goal**: Post-game generates a shareable image — your sign + score + "I protested at honkfordemocracy.org". Player downloads or shares directly. The activism end screen with resource links is the CTA alongside the share. This is the viral loop.
**Depends on**: Phase 8 (needs sign rendering), Phase 9 (needs polished visuals)
**Requirements**: SHAR-01, SHAR-02, SHAR-03, SHAR-04, SHAR-05, SHAR-06, SHAR-07
**Success Criteria** (what must be TRUE):
  1. After gameplay, player sees their crafted sign rendered into a shareable card with score grade and honkfordemocracy.org branding
  2. Player can tap to download the shareable image to their device (works on iOS Safari and Android Chrome)
  3. On devices supporting Web Share API, player can share the image directly to social apps
  4. Share prompt flows naturally into the activism end screen — share your sign, then see how to take real action
  5. The shareable image looks good when posted to social media (1080x1080 or similar, readable text, clear branding)
**Plans:** 3 plans
Plans:
- [ ] 11-01-PLAN.md — ShareCardGenerator: Canvas API 1080x1080 Polaroid card compositor + share config
- [ ] 11-02-PLAN.md — Share UI in ScoreScene: download/Web Share API + activism flow integration
- [ ] 11-03-PLAN.md — OG meta tags + static preview image for URL sharing

### Phase 12: Debug & Tuning
**Goal**: Use the existing debug overlay and hot-tune sliders to dial in the perfect feel. One map, perfectly balanced. Confidence arc feels emotional. Fatigue feels strategic. Reactions feel varied and real. Events surprise without frustrating.
**Depends on**: Phase 9, Phase 10 (needs polished systems to tune)
**Requirements**: TUNE-01, TUNE-02, TUNE-03, TUNE-04, TUNE-05
**Success Criteria** (what must be TRUE):
  1. Playing 5 consecutive sessions produces noticeably different emotional arcs (not monotonous)
  2. Player makes meaningful fatigue management decisions at least 3 times per session (not constant or ignorable)
  3. Confidence never feels unfair — if it drops, player understands why; if it rises, it feels earned
  4. At least one event triggers per session and creates a memorable moment
  5. A first-time player can complete a full session without confusion about what to do

### Phase 13: Sign Craft UX Redesign
**Goal**: Rebuild the Sign Craft scene with responsive layout, tabbed controls, randomize feature, expanded materials/fonts/colors, and Paper Mario neobrutalist styling. The mockup at `mockups/sign-craft-redesign.html` is the design source of truth.
**Depends on**: Phase 8 (uses existing Fabric.js/export pipeline)
**Context doc**: `.planning/phases/sign-craft-redesign-context.md`
**Requirements**: Responsive two-column layout, hybrid tabbed controls (Material/Message/Decorate), randomize button, 13 material swatches, 8 fonts, 9 colors, tape removed, sticky sign preview, START PROTESTING + RANDOMIZE side by side
**Success Criteria** (what must be TRUE):
  1. Sign preview is always visible while editing (sticky on mobile, side-by-side on desktop)
  2. Randomize produces a complete, contrast-correct sign with one tap
  3. All 13 material swatches, 8 fonts, and 9 colors are selectable and render correctly
  4. Tape is gone, stickers work with per-sticker removal
  5. START PROTESTING and RANDOMIZE buttons are visible without scrolling
  6. Layout matches the mockup on both mobile (375px) and desktop (1200px+)
  7. Existing PNG export pipeline still works — crafted signs appear in-game and on score screen
**Plans:** 0 plans (run /gsd:plan-phase 13)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Sign Creator | 2/3 | Complete | 2026-02-14 |
| 9. Visual & UI Polish | 8/8 | Complete | 2026-02-15 |
| 10. Audio Polish | 4/4 | Complete | 2026-02-15 |
| 11. Social Share | 3/3 | Complete | 2026-02-15 |
| 12. Debug & Tuning | 6 quick | Partial | 2026-02-15 |
| 13. Sign Craft UX Redesign | 0/? | Pending | -- |
