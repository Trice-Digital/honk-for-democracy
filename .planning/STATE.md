# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** The traffic light learning mechanic turns "hold a sign" into a real game with a skill ceiling.
**Current focus:** Milestone 2 — The Sign & The Polish

## Current Position

Phase: 8 of 12 (Sign Creator) — in progress
Plan: 2 of 3 completed
Status: Phase 8 in progress (decorations system complete)
Last activity: 2026-02-15 - Fix emoji rendering in speech bubbles + debug overlay buttons

## Performance Metrics

**Velocity:**
- Total plans completed: 18 (M1)
- Average duration: ~1 session per phase
- Total execution time: 7 sessions (M1)

**M1 Summary:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Scaffolding | 2/2 | Complete |
| 2. Core Game Loop | 3/3 | Complete |
| 3. Sign Crafting | 2/2 | Complete |
| 4. Game Systems | 2/2 | Complete |
| 5. Event System | 3/3 | Complete |
| 6. Score & End Screens | 3/3 | Complete |
| 7. Landing & Deploy | 3/3 | Complete |

*Updated after each plan completion*
| Phase 08-sign-creator P01 | 5 min | 2 tasks | 7 files |
| Phase 08-sign-creator P02 | 2 min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [M1-Init]: Top-down perspective with visibility cone as core mechanic
- [M1-Init]: Simple sign crafting (material picker + text) for v1
- [M1-Init]: Phaser 3.90.0, not Phaser 4 beta
- [M1-Init]: phaser3-rex-plugins for drag-rotate gesture recognition
- [M1-P1]: Cloudflare Workers deployment (not Pages) — per ARCHITECTURE-NOTES.md
- [M1-P2]: GameStateManager as EventEmitter singleton (registered in Phaser registry)
- [M1-P2]: Traffic system fully data-driven via IntersectionMapConfig
- [M1-P2]: ReactionSystem config-driven with weighted probability rolling
- [M1-P3]: SignCraftScene as separate Phaser scene, sign data via Phaser registry
- [M1-P3]: DOM input element for text entry (hidden, overlaid on canvas parent)
- [M1-P4]: ConfidenceSystem and FatigueSystem as separate bridging classes
- [M1-P4]: Raise sign mechanic: hold to raise, +50% bonus on positive, deflect negatives
- [M1-P5]: EventSystem as scheduler: timer + probability model, config-driven
- [M1-P5]: WeatherSystem: rain degrades sign, drains confidence, NPCs leave
- [M1-P6]: ScoreScene + ActivismScene as dedicated scenes, state via registry
- [M1-P6]: AudioSystem with procedural Web Audio API sounds (no asset files)
- [M1-P7]: DebugOverlay: dev-only, toggle with backtick, hot-tune sliders
- [M2-Init]: Sign creator as M2 centerpiece — the sign IS the viral marketing
- [M2-Init]: Client-side share image generation — no server, no moderation
- [M2-P8-01]: DOM overlay architecture — Fabric.js in DOM over Phaser canvas, PNG data URL bridge only
- [M2-P8-01]: Procedural material textures via canvas drawing (grain, knots, dots) not image assets
- [M2-P8-01]: 4 fonts (Permanent Marker, Impact, Courier New, Comic Sans MS) for protest aesthetics
- [M2-P8-01]: 7 colors (Black, Red, Blue, White, Green, Purple, Gold) matching marker/paint palette
- [M2-P8-02]: 14 SVG decorations (6 stickers, 3 tape, 5 drawn) inline as template strings, no external files
- [M2-P8-02]: Decorations loaded via data URLs as Fabric.js FabricImage objects, draggable/resizable
- [M2-P8-02]: Text object protected from deletion via data.isTextObject flag
- [M2-P8-02]: Rotation disabled (lockRotation: true), mobile-friendly handles (cornerSize: 20, touchCornerSize: 40)

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Refactor IntersectionScene.ts into reusable managers for multi-scene support | 2026-02-15 | 2b9b931 | [1-refactor-intersectionscene-ts-into-reusa](./quick/1-refactor-intersectionscene-ts-into-reusa/) |
| 2 | Fix car rendering: scale, rotation, driver seat, passengers | 2026-02-15 | aa8f0f8 | [2-fix-car-rendering-size-rotation-emoji-pl](./quick/2-fix-car-rendering-size-rotation-emoji-pl/) |
| 3 | Fix car texture baking + stacking | 2026-02-15 | 9d9c19e | [3-fix-car-texture-baking-apply-scale-facto](./quick/3-fix-car-texture-baking-apply-scale-facto/) |
| 4 | AI readability + consistency cleanup pass | 2026-02-15 | 5f046b2 | [4-ai-readability-consistency-cleanup-pass](./quick/4-ai-readability-consistency-cleanup-pass/) |
| 5 | Fix dialogue reaction speech bubbles emoji | 2026-02-15 | 17c5c1c | [5-fix-dialogue-reaction-speech-bubbles-emo](./quick/5-fix-dialogue-reaction-speech-bubbles-emo/) |
| 6 | Add dev-only testing tools for gameplay tuning | 2026-02-15 | 66dd487 | [6-add-dev-testing-tools-for-gameplay-tunin](./quick/6-add-dev-testing-tools-for-gameplay-tunin/) |

## Session Continuity

Last session: 2026-02-15
Stopped at: Quick tasks 5+6 complete, follow-up emoji/bubble/overlay fix applied
Resume file: None
Next action: Execute 08-03 or /gsd:verify-work
