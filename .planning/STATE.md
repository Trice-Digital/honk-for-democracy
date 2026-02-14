# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** The traffic light learning mechanic turns "hold a sign" into a real game with a skill ceiling.
**Current focus:** Phase 6 — Score & End Screens

## Current Position

Phase: 6 of 7 (Score & End Screens)
Plan: 0 of 3 in current phase
Status: Phase 5 complete, ready to plan Phase 6
Last activity: 2026-02-14 — Phase 5 executed (all 3 plans complete)

Progress: [███████░░░] 71% (5 of 7 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~1 session
- Total execution time: 5 sessions

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Scaffolding | 2/2 | 1 session | ~0.5 session |
| 2. Core Game Loop | 3/3 | 1 session | ~0.33 session |
| 3. Sign Crafting | 2/2 | 1 session | ~0.5 session |
| 4. Game Systems | 2/2 | 1 session | ~0.5 session |
| 5. Event System | 3/3 | 1 session | ~0.33 session |

**Recent Trend:**
- Last 5 plans: 04-01, 04-02, 05-01, 05-02, 05-03
- Trend: Fast (feature phase)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Top-down perspective with visibility cone as core mechanic
- [Init]: Simple sign crafting (material picker + text) for v1
- [Init]: Phaser 3.90.0, not Phaser 4 beta
- [Init]: phaser3-rex-plugins for drag-rotate gesture recognition
- [Phase 1]: Cloudflare Workers deployment (not Pages) — per ARCHITECTURE-NOTES.md
- [Phase 1]: Phaser bundled as separate chunk via Vite manualChunks (339KB gzipped)
- [Phase 1]: `100dvh` with `100vh` fallback for mobile viewport height
- [Phase 1]: `touch-action: none` + `input.touch.capture: true` for belt-and-suspenders gesture prevention
- [Phase 2]: Switched from FIT to EXPAND scaling mode per ARCHITECTURE-NOTES.md
- [Phase 2]: World size 1920x1280, camera centered on intersection
- [Phase 2]: GameStateManager as EventEmitter singleton (registered in Phaser registry)
- [Phase 2]: DifficultyConfig as multiplier pattern (3 tiers: easy/medium/hard)
- [Phase 2]: Traffic system fully data-driven via IntersectionMapConfig
- [Phase 2]: ReactionSystem config-driven with weighted probability rolling
- [Phase 2]: Car entities as Container-based classes with procedural graphics
- [Phase 2]: VisibilityCone as Graphics-based class with arc intersection detection
- [Phase 2]: UI overlay uses setScrollFactor(0) for viewport-anchored elements
- [Phase 2]: ~30 second light cycle: N/S green (10s) -> all red (2.5s) -> E/W green (10s) -> all red (2.5s)
- [Phase 2]: Session duration: 3 minutes (180 seconds)
- [Phase 2]: Reaction balance: ~60% positive, ~25% neutral, ~15% negative
- [Phase 2]: Cone width: 60 degrees
- [Phase 3]: SignCraftScene as separate Phaser scene (BootScene -> SignCraftScene -> IntersectionScene)
- [Phase 3]: Sign materials config-driven (signConfig.ts): cardboard, posterboard, foam board
- [Phase 3]: Sign data flows via Phaser registry (setSignData/getSignData)
- [Phase 3]: DOM input element for text entry (hidden, overlaid on canvas parent)
- [Phase 3]: Message quality scoring: length + keyword matching + bonus phrases (0.1-1.0)
- [Phase 3]: Quality multiplier shifts reaction weights: quality 0.5 = neutral, 1.0 = +30% positive shift
- [Phase 3]: Player entity extended with setSignMaterial() for material-driven appearance
- [Phase 3]: "Play Again" now goes back to SignCraftScene (re-craft before replaying)
- [Phase 3]: Graceful fallback: default sign (cardboard, "HONK!", 0.4 quality) if scene skipped
- [Phase 4]: ConfidenceSystem as separate class bridging reactions to confidence changes
- [Phase 4]: confidenceConfig.ts: starts 30%, multiplier 0.8x, no-reaction drain 1.5/sec after 5s grace
- [Phase 4]: Group size floor: groupSize * 3.0 = confidence floor (passive drain won't go below)
- [Phase 4]: Confidence 0% = session ends early with "You went home early" message
- [Phase 4]: Confidence bar smooth animation via frame-lerp (0.08 speed)
- [Phase 4]: FatigueSystem as separate class: base drain 2.0/sec * material weight * difficulty multiplier
- [Phase 4]: fatigueConfig.ts: switch arm recovers 25, 3s cooldown; rest recovers 8/sec
- [Phase 4]: Raise sign mechanic: hold button to raise, +50% bonus on positive reactions, deflect negatives
- [Phase 4]: Raise drains 6.0 extra fatigue/sec (total 8.0/sec with base) — can't spam
- [Phase 4]: Deflect: converts negative score to +2, grants +5 confidence bonus
- [Phase 4]: Cone shrink: 60deg at 0% fatigue -> 30deg at 100%, starts shrinking at 40% threshold
- [Phase 4]: Rest mode: 0.3x visibility factor (only 30% of cars detected), fatigue recovers at 8/sec
- [Phase 4]: Three action buttons at bottom: Switch Arms (left), RAISE (center, prominent), Rest (right)
- [Phase 4]: GameState extended: confidence, armFatigue, activeArm, isResting, isRaised, endReason
- [Phase 4]: Session end tracks reason: 'time' | 'confidence' | null
- [Phase 4]: Material fatigue multipliers: cardboard 0.8x, posterboard 1.0x, foam board 1.4x
- [Phase 5]: EventSystem as scheduler: timer + probability model, difficulty-scaled trigger chance
- [Phase 5]: eventConfig.ts: all event types, scheduling, dialogue options config-driven
- [Phase 5]: Event schedule: first event 25-50s in, min 25s spacing, max 4 events/session
- [Phase 5]: Guaranteed events: copCheck fires at least once per session (forced at 30s remaining)
- [Phase 5]: Cop check: 3 scenario variants, 3 dialogue options each, correct = First Amendment knowledge
- [Phase 5]: Cop check correct response: +15 confidence, +50 score, 3s time penalty
- [Phase 5]: Cop check wrong/freeze: confidence penalty, longer time penalty, educational feedback
- [Phase 5]: Cop check auto-resolves after 15s if player doesn't respond (-10 confidence)
- [Phase 5]: WeatherSystem as separate class: rain degrades sign, drains confidence, NPCs leave
- [Phase 5]: Rain sign degradation: rate 3.0/sec / material durability / difficulty multiplier
- [Phase 5]: Rain visual: procedural rain drops (Graphics-based, 80 particles, slight wind angle)
- [Phase 5]: Rain shifts reaction weights +10% toward negative
- [Phase 5]: Rain NPC leaving: 8% chance/sec, min 1 NPC stays, reduces group size (confidence floor)
- [Phase 5]: Rain duration: 20-40 seconds, max one weather event per session
- [Phase 5]: Karma moment: 4-phase sequence (truck appears, burnout, cop lights, pulled over)
- [Phase 5]: Karma phases: confidence swings -5, -10, +5, +30 across sequence, +100 score on resolution
- [Phase 5]: Karma has extra +20 confidence boost after full sequence completes
- [Phase 5]: Karma restricted to mid-to-late game (after 60s elapsed), max once per session
- [Phase 5]: Events overlay on gameplay: traffic continues, only cop check has interactive dialogue
- [Phase 5]: GameState extended: weatherState, signDegradation, eventsTriggered
- [Phase 5]: DifficultyConfig eventFrequencyMultiplier / eventIntensityMultiplier / weatherDurabilityMultiplier already pre-wired

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-14
Stopped at: Phase 5 complete. Phase 6 ready to plan.
Resume file: None
