---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/systems/DevControls.ts
  - src/game/systems/DebugOverlay.ts
  - src/game/systems/EventSystem.ts
  - src/game/scenes/IntersectionScene.ts
autonomous: true
must_haves:
  truths:
    - "[ and ] keys cycle game speed through 0.25x, 0.5x, 1x, 2x"
    - "P key toggles pause, N key advances one frame while paused"
    - "Number keys 1-3 force-trigger copCheck, weather, karma events"
    - "Debug overlay shows game speed, last triggered event, active car count, FPS"
    - "R key restarts IntersectionScene instantly"
    - "All dev controls only exist when import.meta.env.DEV is true"
  artifacts:
    - path: "src/game/systems/DevControls.ts"
      provides: "Centralized dev keyboard controls"
    - path: "src/game/systems/DebugOverlay.ts"
      provides: "Extended state display with speed/event/car info"
    - path: "src/game/systems/EventSystem.ts"
      provides: "Public forceTrigger method"
    - path: "src/game/scenes/IntersectionScene.ts"
      provides: "Speed multiplier applied to delta, DevControls instantiation"
  key_links:
    - from: "src/game/systems/DevControls.ts"
      to: "src/game/scenes/IntersectionScene.ts"
      via: "DevControls calls scene methods for pause/speed/restart"
      pattern: "DevControls"
    - from: "src/game/systems/DevControls.ts"
      to: "src/game/systems/EventSystem.ts"
      via: "forceTrigger for number key event triggers"
      pattern: "forceTrigger"
---

<objective>
Add dev-only keyboard controls for gameplay tuning: speed control, pause/step, event triggers, state display, and quick restart.

Purpose: Enable rapid playtesting iteration without restarting or waiting for natural event triggers.
Output: DevControls class + extended DebugOverlay + wired IntersectionScene.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/game/systems/DebugOverlay.ts
@src/game/systems/EventSystem.ts
@src/game/scenes/IntersectionScene.ts
@src/game/config/eventConfig.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create DevControls class and add forceTrigger to EventSystem</name>
  <files>
    src/game/systems/DevControls.ts
    src/game/systems/EventSystem.ts
  </files>
  <action>
**EventSystem.ts** — Add a public `forceTrigger(type: EventType)` method that bypasses scheduling/probability. It should:
- Call the existing private `triggerEvent(type)` directly
- Log to console: `[HFD-DEV] Force-triggered event: ${type}`
- Work even if an event is already active (end current event first via `endEvent()`)
- Skip the `canTriggerEvent` checks entirely (that's the point of force-triggering)

**DevControls.ts** — Create a new class that centralizes all dev keyboard input. Constructor takes: `scene: Phaser.Scene, eventSystem: EventSystem, getSpeedMultiplier: () => number, setSpeedMultiplier: (v: number) => void, setPaused: (v: boolean) => void, getPaused: () => boolean, stepFrame: () => void, restartScene: () => void`.

Keyboard bindings (use `scene.input.keyboard?.on('keydown', ...)` in ONE listener):
- `[` and `]`: Cycle through speed values `[0.25, 0.5, 1, 2]`. `[` goes slower, `]` goes faster. Clamp at ends. Log: `[HFD-DEV] Speed: ${speed}x`
- `P`: Toggle pause state. Log: `[HFD-DEV] ${paused ? 'Paused' : 'Resumed'}`
- `N`: If paused, call stepFrame(). Log: `[HFD-DEV] Step frame`
- `1`: `eventSystem.forceTrigger('copCheck')`
- `2`: `eventSystem.forceTrigger('weather')`
- `3`: `eventSystem.forceTrigger('karma')`
- `R`: Call restartScene(). Log: `[HFD-DEV] Restarting scene`

Store `lastTriggeredEvent: string` as a public property so DebugOverlay can read it. Update it whenever a number key triggers an event.

Add a `destroy()` method that removes the keyboard listener.

IMPORTANT: Do NOT use the D key for anything — it's already used by DebugOverlay toggle. Do NOT conflict with existing keys: backtick (debug toggle), space (raise sign), arrow keys, A/S (arm switch).
  </action>
  <verify>
    `npx tsc --noEmit` passes. DevControls.ts exists with all keybindings. EventSystem has public forceTrigger method.
  </verify>
  <done>
    DevControls class handles all dev keyboard shortcuts in one listener. EventSystem exposes forceTrigger for bypassing scheduling.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire DevControls into IntersectionScene and extend DebugOverlay</name>
  <files>
    src/game/scenes/IntersectionScene.ts
    src/game/systems/DebugOverlay.ts
  </files>
  <action>
**IntersectionScene.ts** — Add dev control state and wiring:

1. Add private fields (inside `import.meta.env.DEV` guard):
   - `private devControls: DevControls | null = null`
   - `private devSpeedMultiplier: number = 1`
   - `private devPaused: boolean = false`
   - `private devStepOneFrame: boolean = false`

2. In `create()`, after the debugOverlay block, instantiate DevControls (inside `import.meta.env.DEV` guard):
   ```
   this.devControls = new DevControls(this, this.eventSystem,
     () => this.devSpeedMultiplier,
     (v) => { this.devSpeedMultiplier = v; },
     (v) => { this.devPaused = v; },
     () => this.devPaused,
     () => { this.devStepOneFrame = true; },
     () => { this.scene.restart(); }
   );
   ```

3. In `update()`, apply speed multiplier and pause logic. BEFORE the existing `if (this.menuManager.getIsPaused()) return;` line, add:
   ```
   // Dev pause/step (only in dev mode)
   if (import.meta.env.DEV && this.devPaused && !this.devStepOneFrame) return;
   if (import.meta.env.DEV && this.devStepOneFrame) this.devStepOneFrame = false;
   ```
   Then multiply delta by devSpeedMultiplier before passing to systems:
   ```
   const effectiveDelta = import.meta.env.DEV ? delta * this.devSpeedMultiplier : delta;
   ```
   Replace ALL `delta` references in the update method body with `effectiveDelta` — specifically in: `gameState.updateTime`, `trafficLights.update`, `confidenceSystem.update`, `fatigueSystem.update`, `eventSystem.update`, `weatherSystem.update`, `cueSystem.update`, `trafficManager.updateSpawning`, `trafficManager.updateCars`. Do NOT change the `delta` passed to `debugOverlay.update` (it should show real FPS).

4. In `showSessionOver()` destroy, add `if (this.devControls) this.devControls.destroy();`

**DebugOverlay.ts** — Extend the values display. Accept an optional `devControls` parameter (or a getter object):

1. Add to DebugSystems interface: `devControls?: { lastTriggeredEvent: string; getSpeedMultiplier: () => number; getPaused: () => boolean }`

2. In the `update()` method, add a new section "DEV CONTROLS" at the top (before PERFORMANCE):
   - Speed: `${speedMultiplier}x`
   - Paused: yes/no
   - Last Event Trigger: `${lastTriggeredEvent || 'none'}`
   Only show this section if `systems.devControls` exists.

3. The FPS and Active Cars sections already exist. Just verify active car count is `cars.filter(c => c.active).length` (it is, in the TRAFFIC section). No additional work needed for those display items.
  </action>
  <verify>
    `npx tsc --noEmit` passes. `npm run dev` starts, game loads IntersectionScene. Press `]` to see speed change in debug overlay. Press `P` to pause. Press `1` to trigger cop check. Press `R` to restart. All logged to console.
  </verify>
  <done>
    Speed multiplier affects all game systems but not UI/tweens. Pause/step works. Number keys force-trigger events. Debug overlay shows speed, pause state, last triggered event. R restarts scene. All controls gated behind import.meta.env.DEV.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no new type errors
2. Dev server runs, enter IntersectionScene
3. Press `]` repeatedly — speed cycles 1x -> 2x, console logs confirm
4. Press `[` repeatedly — speed cycles down to 0.25x
5. Press `P` — game pauses (no movement), `N` advances one frame
6. Press `1` — cop check event appears immediately
7. Press `2` — weather (rain) starts immediately
8. Press `3` — karma sequence starts immediately
9. Press `R` — scene restarts (back to IntersectionScene fresh)
10. Toggle debug overlay with backtick — shows Speed, Paused, Last Event Trigger
11. None of these controls exist in production build
</verification>

<success_criteria>
All 5 dev tools (speed, pause/step, event triggers, state display, quick restart) work via keyboard in dev mode only. All input handling centralized in DevControls class. No keyboard listener scatter across files.
</success_criteria>

<output>
After completion, create `.planning/quick/6-add-dev-testing-tools-for-gameplay-tunin/6-SUMMARY.md`
</output>
