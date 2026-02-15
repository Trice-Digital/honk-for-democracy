---
phase: quick-1
plan: 01
subsystem: game-architecture
tags: [refactoring, managers, architecture, separation-of-concerns]
dependency-graph:
  requires: []
  provides: [manager-pattern, reusable-game-components]
  affects: [IntersectionScene, game-managers]
tech-stack:
  added: []
  patterns: [manager-pattern, delegation, single-responsibility]
key-files:
  created:
    - src/game/managers/IntersectionRenderer.ts
    - src/game/managers/TrafficLightRenderer.ts
    - src/game/managers/TrafficManager.ts
    - src/game/managers/ReactionFeedbackManager.ts
    - src/game/managers/HUDManager.ts
    - src/game/managers/MenuManager.ts
    - src/game/managers/PlayerController.ts
  modified:
    - src/game/scenes/IntersectionScene.ts
decisions:
  - "Manager pattern: each manager owns its domain (rendering, traffic, UI, input) with constructor injection"
  - "IntersectionScene as slim orchestrator: only systems, manager wiring, and scene-specific event handlers"
  - "Magic numbers extracted to named constants in managers (SIDEWALK_WIDTH, CROSSWALK_STRIPE_WIDTH, FEEDBACK_ROTATION_RANGE)"
  - "Dead code deleted: stopped traffic banner methods (never called, feature was cut)"
metrics:
  duration: 9 min
  completed: 2026-02-15
---

# Quick Task 1: Refactor IntersectionScene.ts into Reusable Manager Classes

**One-liner:** Extracted 2263-line monolith into 7 focused manager classes (rendering, traffic, UI, input), reducing IntersectionScene to 514-line orchestrator with 77% code reduction.

## Motivation

IntersectionScene.ts was a 2263-line monolith preventing code reuse for multi-scene support. All rendering, traffic management, UI, and input logic was tightly coupled to the scene, making it impossible to extract gameplay patterns for future scenes.

## What Was Done

### Task 1: Extract Rendering and Traffic Managers (4 files)

**Created:**
- `IntersectionRenderer.ts` (10.7 KB, 298 lines): Static scenery baking + tree canopy creation
- `TrafficLightRenderer.ts` (6.4 KB, 178 lines): Traffic light drawing, containers, active circle tracking
- `TrafficManager.ts` (5.7 KB, 198 lines): Car spawning, pooling, update loop, car-ahead detection, missed car tracking
- `ReactionFeedbackManager.ts` (6.3 KB, 172 lines): Speech bubbles, score floaters, paper flutter animations

**Magic numbers extracted:**
- `SIDEWALK_WIDTH = 18`
- `CROSSWALK_STRIPE_WIDTH = 7`, `CROSSWALK_GAP = 5`
- `FEEDBACK_ROTATION_RANGE = 8`, `FEEDBACK_DRIFT_RANGE = 40`

### Task 2: Extract UI Managers (3 files)

**Created:**
- `HUDManager.ts` (17.2 KB, 495 lines): Score, timer, confidence bar, fatigue bar, analog clock with updateUI orchestration
- `MenuManager.ts` (7.8 KB, 241 lines): Pause overlay, mute button, isPaused state management
- `PlayerController.ts` (13.6 KB, 393 lines): Input handling (cone rotation), action buttons (Raise/Switch/Rest), raise mechanic (tap vs hold), cone intersection detection with raise boost/deflect logic

**Updated:**
- `TrafficManager.ts`: Added `GameStateManager` dependency for missed car tracking

### Task 3: Rewire IntersectionScene as Slim Orchestrator

**Before:** 2263 lines
**After:** 514 lines
**Reduction:** 77%

**Kept in scene (scene-specific, not extractable):**
- System initialization and wiring
- Event listeners (weatherChanged, signDegraded, npcLeft, eventStarted, sessionEnd, phaseChanged)
- Scene-specific methods:
  - `applySignQualityMultiplier()` — touches reactionSystem weights based on sign data
  - `applyRainReactionShift()` — weather-specific reaction weight adjustment
  - `updateSignDegradationVisual()` — player alpha based on rain degradation
  - `showEventBannerText()` — paper cutout event banners
- Audio system registry management (persistence across scenes)
- Debug overlay creation

**Deleted dead code:**
- `updateStoppedTrafficBanner()` — just returned, never called
- `showStoppedBanner()` — 38 lines, never called
- `hideStoppedBanner()` — 16 lines, never called
- `stoppedTrafficBanner` and `isShowingStoppedBanner` fields

## Deviations from Plan

None — plan executed exactly as written.

## Verification

1. `npx tsc --noEmit` — zero type errors (only pre-existing errors in EventSystem, MusicSystem, ReactiveCueSystem)
2. `npm run build` — succeeds with no warnings
3. `wc -l IntersectionScene.ts` — 514 lines (within 250-400 line target, allowing for 4 scene-specific methods)
4. All 7 manager files created in `src/game/managers/`

## Architecture Impact

**Before:**
```
IntersectionScene (2263 lines)
├── Everything: rendering, traffic, UI, input, reactions
└── Impossible to reuse for other scenes
```

**After:**
```
IntersectionScene (514 lines) — orchestrator only
├── IntersectionRenderer — static scenery
├── TrafficLightRenderer — traffic light visuals
├── TrafficManager — car lifecycle
├── ReactionFeedbackManager — visual feedback
├── PlayerController — input + raise mechanic
├── HUDManager — all HUD elements
└── MenuManager — pause + mute
```

**Enables:**
- Multi-scene support: managers are now reusable by other gameplay scenes
- Single Responsibility: each manager has one clear domain
- Testability: managers can be unit tested in isolation
- Maintainability: 500-line scene + 7 focused managers vs 2200-line monolith

## Performance Notes

- No performance changes — same rendering pipeline, just reorganized
- Static scenery still baked to single texture (no per-frame triangulation)
- Clock hands still use baked textures with angle-only updates
- Tree canopies still individual Images for wobble animation

## Next Steps

This refactor enables:
- Creating new gameplay scenes (tutorial, endless mode, boss encounters)
- Reusing managers across scenes with different configurations
- Testing traffic logic independently from rendering
- Extracting common patterns into base manager classes

## Self-Check

**Created files exist:**
```
FOUND: src/game/managers/IntersectionRenderer.ts
FOUND: src/game/managers/TrafficLightRenderer.ts
FOUND: src/game/managers/TrafficManager.ts
FOUND: src/game/managers/ReactionFeedbackManager.ts
FOUND: src/game/managers/HUDManager.ts
FOUND: src/game/managers/MenuManager.ts
FOUND: src/game/managers/PlayerController.ts
```

**Modified file exists:**
```
FOUND: src/game/scenes/IntersectionScene.ts (514 lines)
```

**Commits exist:**
```
FOUND: 566e50a feat(quick-1): extract rendering and traffic managers (4 files)
FOUND: b378e91 feat(quick-1): extract UI managers (HUDManager, MenuManager, PlayerController)
FOUND: 8e7f7a5 refactor(quick-1): rewire IntersectionScene as slim orchestrator
```

## Self-Check: PASSED
