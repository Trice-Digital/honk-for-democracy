---
phase: quick-6
plan: 01
subsystem: dev-tools
tags: [dev-controls, speed-control, pause-step, event-triggers, debug-overlay]
dependency-graph:
  requires: [EventSystem, DebugOverlay, IntersectionScene]
  provides: [DevControls, speed-multiplier, pause-step, force-trigger]
  affects: [gameplay-tuning, playtesting-workflow]
tech-stack:
  added: [DevControls]
  patterns: [centralized-keyboard-listener, callback-injection, dev-guard]
key-files:
  created:
    - src/game/systems/DevControls.ts
  modified:
    - src/game/systems/EventSystem.ts
    - src/game/systems/DebugOverlay.ts
    - src/game/scenes/IntersectionScene.ts
decisions:
  - decision: Centralize all dev keyboard controls in DevControls class
    rationale: Avoid keyboard listener scatter across files, single source of truth
    alternatives: [per-feature listeners, scene-level input handling]
    chosen: DevControls class with callback injection
  - decision: Apply speed multiplier to delta in IntersectionScene.update
    rationale: Affects all game systems uniformly (traffic, confidence, fatigue, events)
    alternatives: [per-system speed control, time-scale at Phaser level]
    chosen: Multiply delta before passing to systems
  - decision: Pause logic before menu pause check
    rationale: Dev pause should work even when menu pause is active
    alternatives: [integrate with MenuManager, separate dev pause UI]
    chosen: Dev pause check before menu pause check
metrics:
  duration: 147
  completed: 2026-02-15T22:27:11Z
  tasks: 2
  files: 4
---

# Quick Task 6: Add Dev Testing Tools for Gameplay Tuning Summary

**One-liner:** Dev-only keyboard controls for speed (0.25x-2x), pause/step, event force-triggers (copCheck/weather/karma), and quick restart with DebugOverlay integration.

## What Was Built

Added comprehensive dev-only keyboard controls to accelerate playtesting and tuning iteration:

1. **DevControls Class** — Centralized keyboard handler for all dev shortcuts
   - Speed control: `[` (slower) and `]` (faster) cycle through 0.25x, 0.5x, 1x, 2x
   - Pause/step: `P` toggles pause, `N` advances one frame while paused
   - Event triggers: `1` = copCheck, `2` = weather, `3` = karma
   - Quick restart: `R` restarts IntersectionScene instantly
   - All controls log to console with `[HFD-DEV]` prefix

2. **EventSystem.forceTrigger** — Public method to bypass event scheduling
   - Ends current event if active
   - Triggers specified event immediately
   - Skips all `canTriggerEvent` checks (probability, spacing, eligibility)
   - Dev-only helper for testing event sequences

3. **Speed Multiplier System** — Delta scaling in IntersectionScene
   - Applies `devSpeedMultiplier` to delta before passing to all systems
   - Affects: gameState, trafficLights, confidence, fatigue, events, weather, traffic, cues
   - Does NOT affect audio timing (preserves procedural sound quality)
   - Does NOT affect tweens/animations (they use real time)

4. **Pause/Step System** — Frame-by-frame control
   - Dev pause check happens BEFORE menu pause check (dev pause works in menu)
   - Step flag (`devStepOneFrame`) allows single-frame advance while paused
   - Enables precise inspection of game state transitions

5. **DebugOverlay Extension** — New "DEV CONTROLS" section
   - Shows: Speed (0.25x-2x), Paused (yes/no), Last Event Trigger (type or 'none')
   - Displays above PERFORMANCE section for visibility
   - Only shown when `devControls` is provided to DebugSystems

## Implementation Highlights

**DevControls Architecture:**
- Single keyboard listener handles all dev shortcuts
- Callback injection pattern — scene passes getters/setters for speed/pause/restart
- No direct scene dependencies beyond callbacks
- Public `lastTriggeredEvent` property for DebugOverlay integration

**Speed Multiplier Application:**
```typescript
const effectiveDelta = import.meta.env.DEV ? delta * this.devSpeedMultiplier : delta;
this.gameState.updateTime(effectiveDelta);
this.trafficLights.update(effectiveDelta);
// ... all systems
```

**Pause/Step Logic:**
```typescript
// Dev pause/step (only in dev mode)
if (import.meta.env.DEV && this.devPaused && !this.devStepOneFrame) return;
if (import.meta.env.DEV && this.devStepOneFrame) this.devStepOneFrame = false;

if (this.menuManager.getIsPaused()) return;
```

**All dev features gated behind `import.meta.env.DEV`** — zero production bundle impact.

## Verification Results

**TypeScript:** No new errors (pre-existing errors in EventSystem, MusicSystem, ReactiveCueSystem)

**Dev Server:** Starts successfully at localhost:4321

**Manual Testing Required:**
1. Press `]` repeatedly → speed cycles 1x → 2x (console logs confirm)
2. Press `[` repeatedly → speed cycles down to 0.25x (cars move slower)
3. Press `P` → game pauses (no movement), `N` advances one frame
4. Press `1` → cop check event appears immediately
5. Press `2` → weather (rain) starts immediately
6. Press `3` → karma sequence starts immediately
7. Press `R` → scene restarts (back to IntersectionScene fresh)
8. Toggle debug overlay with backtick → shows Speed, Paused, Last Event Trigger
9. Production build → no dev controls exist

## Deviations from Plan

None — plan executed exactly as written.

## Files Modified

**Created:**
- `src/game/systems/DevControls.ts` — Centralized dev keyboard controls (122 lines)

**Modified:**
- `src/game/systems/EventSystem.ts` — Added public `forceTrigger(type)` method
- `src/game/systems/DebugOverlay.ts` — Extended DebugSystems interface, added DEV CONTROLS section
- `src/game/scenes/IntersectionScene.ts` — Instantiate DevControls, apply speed multiplier to delta, pause/step logic

## Impact

**Before:** Playtesting required waiting for natural event triggers, no speed control, manual restarts via menu.

**After:** Instant event testing (1/2/3 keys), speed up boring parts (2x), slow down critical moments (0.25x), pause/step for frame-perfect inspection, R for instant restart. Full control over gameplay tuning workflow.

**Use Cases:**
- Test event sequences without waiting: Press `2` to trigger rain immediately
- Speed up traffic spawning phase: Press `]` for 2x speed
- Debug reaction timing: Press `[` for 0.25x slow-motion, `P` to pause, `N` to step frame-by-frame
- Iterate on cop dialogue: Press `1` to force cop check, test all dialogue branches
- Quick iteration: Press `R` to restart instead of navigating menu

**Performance:** Zero production impact (all gated behind `import.meta.env.DEV`).

## Self-Check

Verifying all claimed artifacts exist:

**Created files:**
- FOUND: src/game/systems/DevControls.ts

**Modified files:**
- FOUND: src/game/systems/EventSystem.ts (forceTrigger method added)
- FOUND: src/game/systems/DebugOverlay.ts (DEV CONTROLS section added)
- FOUND: src/game/scenes/IntersectionScene.ts (DevControls wired in)

**Commits:**
- FOUND: 318c144 (Task 1: DevControls + forceTrigger)
- FOUND: 66dd487 (Task 2: IntersectionScene + DebugOverlay integration)

## Self-Check: PASSED

All claimed artifacts verified. Plan executed successfully.
