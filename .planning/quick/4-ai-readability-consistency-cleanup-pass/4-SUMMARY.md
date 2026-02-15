---
phase: quick-4
plan: 01
subsystem: documentation
tags: [documentation, type-safety, architecture, developer-experience]
dependency-graph:
  requires: []
  provides:
    - game/README.md architecture reference
    - EventSystem scheduling pipeline documentation
    - State access pattern documentation across all systems
    - Named constants for magic numbers
    - Dev-only config validation
  affects:
    - All game systems (documentation improvements)
    - Car.ts and Player.ts (magic number extraction)
    - Type safety across codebase
tech-stack:
  added: []
  patterns:
    - JSDoc method-level documentation
    - State access pattern documentation
    - Dev-only validation with import.meta.env.DEV
key-files:
  created:
    - src/game/README.md
  modified:
    - src/game/systems/EventSystem.ts
    - src/game/systems/GameStateManager.ts
    - src/game/systems/FatigueSystem.ts
    - src/game/systems/TrafficLightSystem.ts
    - src/game/systems/ConfidenceSystem.ts
    - src/game/systems/ReactionSystem.ts
    - src/game/systems/WeatherSystem.ts
    - src/game/systems/AudioSystem.ts
    - src/game/systems/AudioMixerSystem.ts
    - src/game/systems/AmbientSystem.ts
    - src/game/systems/MusicSystem.ts
    - src/game/systems/ReactiveCueSystem.ts
    - src/game/systems/DebugOverlay.ts
    - src/game/entities/Player.ts
    - src/game/entities/Car.ts
    - src/game/config/reactionConfig.ts
    - src/game/scenes/GameStateManager.ts
    - src/game/scenes/ScoreScene.ts
    - src/game/scenes/SignCraftScene.ts
decisions: []
metrics:
  duration: 590s (~10 minutes)
  completed: 2026-02-15
---

# Quick Task 4: AI Readability & Consistency Cleanup Pass

**One-liner:** Documented EventSystem scheduling pipeline, created architecture README, eliminated type safety issues, documented state access patterns across all systems, extracted magic numbers, and added dev-only config validation.

## Summary

Comprehensive documentation and code quality pass to make the codebase self-documenting for AI agents and future developers. Six tasks executed:

1. **EventSystem scheduling JSDoc** — Added detailed method-level documentation for checkEventTrigger, pickEventType, and canTriggerEvent explaining priority order, constraint logic, and integration points
2. **Architecture README** — Created src/game/README.md with system hierarchy, game loop order, data flow, manager pattern, entity lifecycle, and config file reference
3. **Type safety fixes** — Eliminated all `as any`, `as unknown`, and unnecessary non-null assertions via proper type guards and keyof patterns
4. **State access patterns** — Documented how each of 13 systems reads GameStateManager (full snapshot, individual getters, event listeners, or self-contained)
5. **Magic number extraction** — Named constants for Car.ts (passenger chance, smoke timing, margins, thresholds) and Player.ts (body proportions rationale)
6. **Dev config validation** — Added import.meta.env.DEV-gated validation in 4 system constructors (ReactionSystem, EventSystem, FatigueSystem, ConfidenceSystem)

## Implementation Details

### Task 1: EventSystem Scheduling Pipeline JSDoc

**Files:** `src/game/systems/EventSystem.ts`

Added comprehensive method-level documentation to the 3 core scheduling methods:

- **checkEventTrigger()** — Explains priority order: (1) minimum time window, (2) max events cap (with guaranteed event override), (3) minimum spacing, (4) urgency check at <30s, (5) per-frame probability roll. Documents that guaranteed events bypass the max-events cap.
- **pickEventType()** — Explains eligibility filtering via canTriggerEvent(), weighted random selection from eligible pool, and null return when all events exhausted.
- **canTriggerEvent()** — Documents per-type constraints: copCheck blocked at low confidence, weather one-per-session, karma requires mid-game timing.

### Task 2: Architecture README

**Files:** `src/game/README.md` (created)

126-line reference document covering:

- **System Hierarchy** — GameStateManager as EventEmitter singleton, list of all 13 systems with one-line descriptions
- **Game Loop Order** — Exact sequence from IntersectionScene.update() (16 steps from timer tick through tree wobble)
- **Data Flow Between Scenes** — How SignData and finalGameState flow through Phaser registry
- **Manager Pattern** — 7 managers, their responsibilities, pattern explanation (systems = logic, managers = visuals)
- **Entity Lifecycle** — Car pool pattern, Player creation/updates, VisibilityCone width scaling
- **Key Config Files** — 12 config files and what they control

### Task 3: Type Safety Fixes

**Files:** Player.ts, reactionConfig.ts, GameStateManager.ts, ScoreScene.ts, SignCraftScene.ts, DebugOverlay.ts

**Player.ts:** Removed unnecessary `as unknown as GameObject` cast (Container extends GameObject).

**reactionConfig.ts:** Replaced non-null assertions (`!`) with proper fallback: `find(...) ?? REACTION_TYPES[0]`.

**GameStateManager.ts:** Used `keyof ReactionTally` instead of `as unknown as Record<string, number>` cast.

**ScoreScene.ts:** Used `keyof typeof finalState.reactions` with type guard for reaction count access.

**SignCraftScene.ts:** Replaced `(activeObj as any)?.data` with type guard: `activeObj && 'data' in activeObj ? (activeObj as { data?: Record<string, unknown> }).data : undefined`.

**DebugOverlay.ts:** Created `hotTune<T>(obj, key, value)` utility function to encapsulate intentional config mutations for hot-tuning. Replaced 5 `(DEFAULTS as any).property = v` with `hotTune(DEFAULTS, 'property', v)`. Added comment explaining dev-only intentional mutations.

Result: Zero `as any` or `as unknown` casts remain in src/game/. All pre-existing TypeScript errors remain (MusicSystem, ReactiveCueSystem tone.js type issues).

### Task 4: State Access Pattern Documentation

**Files:** All 13 system files in src/game/systems/

Added `@stateAccess` JSDoc tag to each system class explaining how it reads GameStateManager:

- **Full snapshot (getState())** — EventSystem, ConfidenceSystem, WeatherSystem (need multiple fields)
- **Individual getters** — FatigueSystem (frequent single-value reads avoid destructuring overhead)
- **Event listeners** — ConfidenceSystem, WeatherSystem (react to state changes)
- **Self-contained** — TrafficLightSystem (exposes own state, doesn't read GameStateManager)
- **Stateless / method params** — ReactionSystem, AudioSystem, MusicSystem, ReactiveCueSystem (receive values via constructor or method calls)
- **Infrastructure only** — AudioMixerSystem, AmbientSystem (no state dependencies)
- **Debug display** — DebugOverlay (reads full snapshot for display, mutates config via hotTune)

### Task 5: Magic Number Extraction

**Files:** Car.ts, Player.ts

**Car.ts** — Extracted 5 magic numbers to named constants with JSDoc:

- `PASSENGER_CHANCE = 0.3` — Probability of passenger in car
- `DOG_PASSENGER_CHANCE = 0.1` — Probability passenger is a dog
- `SMOKE_PUFF_INTERVAL_MS = 500` — Coal roller smoke puff timing
- `OFFSCREEN_MARGIN = 200` — Pixels beyond world bounds for car recycling
- `STOP_DETECTION_THRESHOLD = 10` — Pixel tolerance for stop line detection

**Player.ts** — Added two comment blocks:

- Body proportions comment block (8 lines) explaining design rationale: paper cutout character at ~65px tall, paper doll reference, proportions chosen for 1x zoom readability
- Character colors comment: construction paper palette, intentional design choices (not config-driven)

### Task 6: Dev-Only Config Validation

**Files:** ReactionSystem.ts, EventSystem.ts, FatigueSystem.ts, ConfidenceSystem.ts

Added constructor validation gated behind `import.meta.env.DEV`, using `console.warn()`, never throwing:

**ReactionSystem:**
- Validates adjusted weights sum to ~1.0 (within 0.01 tolerance)

**EventSystem:**
- minEventSpacing > 0
- maxEventsPerSession >= 1
- eventFrequencyMultiplier in sane range (0.1-5.0)

**FatigueSystem:**
- baseDrainRate > 0
- fatigueDrainMultiplier in sane range (0.1-5.0)
- maxFatigue > 0

**ConfidenceSystem:**
- startingConfidence within min/max range
- noReactionDrainRate >= 0

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | d132866 | EventSystem.ts (3 method JSDoc blocks) |
| 2 | fe74a46 | src/game/README.md (created, 126 lines) |
| 3 | e3ee9d3 | Player.ts, reactionConfig.ts, GameStateManager.ts, ScoreScene.ts, SignCraftScene.ts, DebugOverlay.ts |
| 4 | df8b25a | All 13 system files (@stateAccess tags) |
| 5 | 63fb8ed | Car.ts (5 constants), Player.ts (2 comment blocks) |
| 6 | b6d396c | ReactionSystem.ts, EventSystem.ts, FatigueSystem.ts, ConfidenceSystem.ts |

## Self-Check

Verifying claims:

**Created files:**
- src/game/README.md: ✓ EXISTS (126 lines)

**Modified files (sample):**
- EventSystem.ts: ✓ Method JSDoc present, stateAccess tag present, dev validation present
- GameStateManager.ts: ✓ stateAccess tag present, keyof ReactionTally used
- Car.ts: ✓ All 5 constants defined and used
- Player.ts: ✓ Both comment blocks present

**Commits:**
- d132866: ✓ EventSystem JSDoc
- fe74a46: ✓ Architecture README
- e3ee9d3: ✓ Type safety fixes
- df8b25a: ✓ State access patterns
- 63fb8ed: ✓ Magic numbers
- b6d396c: ✓ Dev validation

**Type safety:**
- Zero `as any` or `as unknown` in src/game/ (verified via grep)
- Zero unnecessary non-null assertions in reactionConfig.ts
- TypeScript compiles (only pre-existing errors remain)

**Documentation coverage:**
- All 13 systems have @stateAccess tags (verified via grep)
- EventSystem has detailed JSDoc on 3 scheduling methods
- Car.ts has 5 named constants with JSDoc
- Player.ts has 2 explanatory comment blocks

## Self-Check: PASSED

All claims verified. No missing files or commits.
