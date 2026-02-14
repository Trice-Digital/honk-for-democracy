# Milestones: Honk For Democracy

## Completed Milestones

### v1.0 — The Intersection (M1)

**Goal:** Full core loop playable — sign crafting through gameplay through activism payoff, on one intersection map, deployed.

**Shipped:** 2026-02-14
**Phases:** 1-7 (18 plans)
**Requirements:** 52 defined, 52 mapped

**What shipped:**
- Astro 5.x + Phaser 3.90.0 integrated, mobile-first
- Sign crafting scene (material picker + text + preview)
- Top-down intersection with learnable traffic light cycle
- Visibility cone mechanic (drag to aim at traffic)
- Reaction system (8 types, weighted probability, config-driven)
- Confidence meter (reactions + group size + decay)
- Arm fatigue system (drain + switch arms + rest + raise sign)
- Event system (cop check, weather/rain, karma moment)
- Score scene with stats + shareable card layout
- Activism end screen with real resource links
- Procedural audio (Web Audio API, zero assets)
- Debug overlay with hot-tune sliders
- Landing page with OG meta
- Cloudflare Workers deployment config
- Build: 2.1MB total, Phaser 340KB gzipped, game code 21KB gzipped

**Key decisions:** Top-down perspective, visibility cone as core mechanic, config-driven architecture (IntersectionMapConfig, DifficultyConfig), GameStateManager as EventEmitter singleton, procedural audio, DOM input for text entry, Phaser registry for cross-scene data flow.

**Last phase:** Phase 7 (Landing Page, Polish & Deploy)

---

## Current Milestone

### v2.0 — The Sign & The Polish (M2)

**Goal:** The sign creator is the centerpiece. Visual/audio polish. Social sharing as the viral loop. One map, perfectly tuned.

**Started:** 2026-02-14
**Status:** Defining requirements

---
*Last updated: 2026-02-14 after M1 completion*
