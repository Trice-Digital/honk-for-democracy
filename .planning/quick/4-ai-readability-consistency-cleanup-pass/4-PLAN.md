---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/systems/EventSystem.ts
  - src/game/README.md
  - src/game/entities/Player.ts
  - src/game/entities/Car.ts
  - src/game/config/reactionConfig.ts
  - src/game/systems/GameStateManager.ts
  - src/game/scenes/ScoreScene.ts
  - src/game/scenes/SignCraftScene.ts
  - src/game/systems/FatigueSystem.ts
  - src/game/systems/TrafficLightSystem.ts
  - src/game/systems/ConfidenceSystem.ts
  - src/game/systems/ReactionSystem.ts
  - src/game/systems/EventSystem.ts
  - src/game/systems/WeatherSystem.ts
  - src/game/systems/AudioSystem.ts
  - src/game/systems/AudioMixerSystem.ts
  - src/game/systems/AmbientSystem.ts
  - src/game/systems/MusicSystem.ts
  - src/game/systems/ReactiveCueSystem.ts
  - src/game/systems/DebugOverlay.ts
autonomous: true
must_haves:
  truths:
    - "EventSystem scheduling pipeline is documented with method-level JSDoc"
    - "src/game/README.md exists with architecture reference"
    - "No `as any`, `as unknown`, or unnecessary non-null assertions remain in game code"
    - "Each system class has a state access pattern comment"
    - "Magic numbers in Car.ts and Player.ts are documented or extracted"
    - "Dev-only config validation runs on system construction"
  artifacts:
    - path: "src/game/README.md"
      provides: "Architecture reference document"
      min_lines: 80
    - path: "src/game/systems/EventSystem.ts"
      provides: "Method-level JSDoc on scheduling pipeline"
      contains: "Priority order"
---

<objective>
AI readability and consistency cleanup pass across the game codebase.

Purpose: Make the codebase self-documenting so an AI (or future dev) can understand system architecture, scheduling logic, state access patterns, and magic numbers without reverse-engineering across files.

Output: Documented EventSystem pipeline, architecture README, cleaned type safety, state access pattern comments, documented magic numbers, dev-only config validation.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/game/systems/EventSystem.ts
@src/game/systems/GameStateManager.ts
@src/game/systems/FatigueSystem.ts
@src/game/systems/TrafficLightSystem.ts
@src/game/systems/ConfidenceSystem.ts
@src/game/entities/Player.ts
@src/game/entities/Car.ts
@src/game/config/reactionConfig.ts
@src/game/config/scoreConfig.ts
@src/game/config/difficultyConfig.ts
@src/game/scenes/IntersectionScene.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add method-level JSDoc to EventSystem scheduling pipeline</name>
  <files>src/game/systems/EventSystem.ts</files>
  <action>
Add detailed method-level JSDoc to the 3 scheduling pipeline methods. The existing comments are too terse for an AI to understand the priority logic without reading all 3 methods together.

**checkEventTrigger()** — Add JSDoc explaining:
- Called each frame when no event is active
- Priority order: (1) bail if before minimum time window, (2) bail if hit max events (but check guaranteed), (3) bail if spacing too short, (4) force guaranteed events if <30s remain, (5) probability roll scaled by difficulty
- The guaranteed event urgency check at <30s remaining overrides the max-events cap via checkGuaranteedEvents()
- Probability = baseTriggerChancePerSecond * difficultyMultiplier * deltaSec (per-frame chance)

**pickEventType()** — Add JSDoc explaining:
- Filters all event types through canTriggerEvent() for eligibility
- Performs weighted random selection from eligible types (weights from config.eventWeights)
- Returns null if nothing is eligible (all events exhausted or blocked by constraints)
- Weights are NOT normalized — raw config values used directly

**canTriggerEvent()** — Add JSDoc explaining:
- Per-type constraints that gate eligibility
- copCheck: blocked when confidence < copCheckMinConfidence (don't pile on struggling player)
- weather: one per session, blocked if already raining
- karma: requires karmaMinTime elapsed, one per session
- Default: always eligible (future event types pass by default)

Keep existing code unchanged. Only add/expand JSDoc blocks.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors introduced. Visually confirm JSDoc blocks exist on all 3 methods.</verify>
  <done>checkEventTrigger, pickEventType, and canTriggerEvent all have detailed JSDoc explaining priority order, constraints, and integration points.</done>
</task>

<task type="auto">
  <name>Task 2: Write src/game/README.md architecture reference</name>
  <files>src/game/README.md</files>
  <action>
Create a concise architecture reference document. NOT a tutorial — a quick-reference for an AI or dev jumping into the codebase. Sections:

**System Hierarchy:**
- GameStateManager is the single source of truth (EventEmitter singleton, registered in Phaser registry)
- Systems read/write state through GameStateManager, listen for events
- List all systems with one-line descriptions

**Game Loop Order (IntersectionScene.update):**
- List the exact order update() calls systems: trafficLights, trafficManager (cars), reactionSystem checks, confidenceSystem, fatigueSystem, eventSystem, weatherSystem, audioMixer, ambientSystem, musicSystem, cueSystem, player wobble/fatigue visuals, HUD

**Data Flow Between Scenes:**
- BootScene -> SignCraftScene: launches sign creator
- SignCraftScene -> registry: stores SignData (material, message, texture) via Phaser registry
- IntersectionScene <- registry: reads SignData, applies to Player entity
- IntersectionScene -> registry: stores final GameState on session end
- ScoreScene <- registry: reads final GameState for display
- ActivismScene <- registry: reads final GameState for share image

**Manager Pattern (src/game/managers/):**
- IntersectionRenderer: owns world/road/sidewalk graphics, receives scene
- TrafficLightRenderer: owns light visuals, receives TrafficLightSystem state
- TrafficManager: owns car pool, spawning, car-following, receives TrafficLightSystem
- ReactionFeedbackManager: owns score floaters/emoji popups, receives ReactionSystem events
- PlayerController: owns input handling, receives Player + FatigueSystem
- HUDManager: owns all HUD elements, receives GameStateManager state
- MenuManager: owns pause/menu UI, receives scene

**Entity Lifecycle:**
- Car: spawn from pool (resetCar) -> drive -> react at cone -> pass/despawn -> return to pool
- Player: created once in IntersectionScene.create(), sign updated from registry
- VisibilityCone: tracks player position, width driven by FatigueSystem

**Key Config Files:**
- Brief list of config files and what they control

Keep it under 150 lines. Use markdown headers, bullet points, no prose paragraphs.
  </action>
  <verify>File exists at src/game/README.md. Content covers all 5 sections. Line count is 80-150.</verify>
  <done>src/game/README.md exists with system hierarchy, game loop order, data flow, manager pattern, and entity lifecycle sections.</done>
</task>

<task type="auto">
  <name>Task 3: Fix type safety — remove `as any`, `as unknown`, non-null assertions</name>
  <files>
    src/game/entities/Player.ts
    src/game/config/reactionConfig.ts
    src/game/systems/GameStateManager.ts
    src/game/scenes/ScoreScene.ts
    src/game/scenes/SignCraftScene.ts
    src/game/systems/DebugOverlay.ts
  </files>
  <action>
Fix all type safety issues across game code. Specific fixes:

**Player.ts:118** — `scene.add.existing(this as unknown as Phaser.GameObjects.GameObject)`
- Container extends GameObject, so this cast is unnecessary in Phaser 3.90. Replace with `scene.add.existing(this)`. If the compiler complains about Container not matching the overload, use `scene.add.existing(this as Phaser.GameObjects.Container)` which is the accurate type.

**reactionConfig.ts:71,75** — `REACTION_TYPES.find(...)!` non-null assertions
- In rollReaction(): the `find()!` on line 71 could theoretically return undefined. Add a fallback: `const found = REACTION_TYPES.find((r) => r.id === w.id); if (found) return found;` — then the final fallback on line 75 also uses `!`. Replace with: `return REACTION_TYPES.find((r) => r.id === 'nothing') ?? REACTION_TYPES[0];`

**GameStateManager.ts:120** — `(this.state.reactions as unknown as Record<string, number>)[reactionId]++`
- ReactionTally has specific keys. Add a type guard: `if (reactionId in this.state.reactions) { this.state.reactions[reactionId as keyof ReactionTally]++; }`

**ScoreScene.ts:279** — `(finalState.reactions as unknown as Record<string, number>)[rt.id]`
- Same pattern. Use: `(finalState.reactions[rt.id as keyof ReactionTally] as number) || 0` or a helper function `getReactionCount(tally: ReactionTally, id: string): number` that uses a type guard.

**SignCraftScene.ts:604,613** — `(activeObj as any)?.data`
- Fabric.js objects have a `data` property. Import the correct Fabric type or use a type guard: `if (activeObj && 'data' in activeObj) { const objData = (activeObj as { data?: Record<string, unknown> }).data; }`

**DebugOverlay.ts:82,93,104,115,126** — `(DEFAULTS as any).property = v`
- These are debug hot-tuning sliders that mutate config objects. These are intentional mutations of readonly config for debug purposes. Add a comment block above the first occurrence: `// DEV ONLY: Intentional mutation of config defaults for hot-tuning. These objects are module-level singletons, so mutation affects all consumers in real-time.` Then use a typed helper: `function hotTune<T>(obj: T, key: keyof T, value: T[keyof T]): void { (obj as Record<string, unknown>)[key as string] = value; }` — this keeps the one `as` in a single utility rather than scattered.

Run `npx tsc --noEmit` after each file change to catch regressions.
  </action>
  <verify>Run `npx tsc --noEmit` — no new errors. Run `grep -rn "as any\|as unknown" src/game/` and confirm the only remaining cast is the intentional one in DebugOverlay's hotTune helper (if needed). No non-null assertions (`!`) remain in reactionConfig.ts or scoreConfig.ts.</verify>
  <done>All `as any`, `as unknown as`, and unnecessary `!` assertions removed or replaced with proper type guards. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 4: Document state access patterns in each system class</name>
  <files>
    src/game/systems/GameStateManager.ts
    src/game/systems/FatigueSystem.ts
    src/game/systems/TrafficLightSystem.ts
    src/game/systems/ConfidenceSystem.ts
    src/game/systems/ReactionSystem.ts
    src/game/systems/EventSystem.ts
    src/game/systems/WeatherSystem.ts
    src/game/systems/AudioSystem.ts
    src/game/systems/AudioMixerSystem.ts
    src/game/systems/AmbientSystem.ts
    src/game/systems/MusicSystem.ts
    src/game/systems/ReactiveCueSystem.ts
    src/game/systems/DebugOverlay.ts
  </files>
  <action>
Add a brief `@stateAccess` JSDoc tag or comment block at the top of each system class explaining which state access pattern it uses and why. Do NOT refactor any patterns — documentation only.

Patterns to document:

- **GameStateManager**: "Source of truth. Exposes getState() (full readonly snapshot) and individual getters (getElapsed(), getConfidence(), etc). Other systems use whichever is convenient."
- **FatigueSystem**: "Uses individual getters (getFatigue(), getIsRaised()). Reads specific values frequently in update() — individual getters avoid destructuring overhead."
- **TrafficLightSystem**: "Self-contained state. Does not read from GameStateManager. Exposes own getState() for light phase. Receives config at construction."
- **ConfidenceSystem**: "Uses getState() for full snapshot in update(). Listens to GameStateManager events for reaction handling."
- **EventSystem**: "Uses getState() for full snapshot (needs multiple fields: isSessionActive, confidence, timeRemaining). Also uses getElapsed() individually."
- **ReactionSystem**: "Does not read GameStateManager directly. Receives difficulty config at construction. Stateless — just rolls reactions."
- **WeatherSystem, AudioSystem, AudioMixerSystem, AmbientSystem, MusicSystem, ReactiveCueSystem**: Read each file, determine which pattern they use, and document accordingly.
- **DebugOverlay**: "Reads getState() for display values. Mutates config defaults directly for hot-tuning (see hotTune helper)."

Format: Add a `* @stateAccess` line to the existing class-level JSDoc, or add a comment block `// State access: ...` immediately after the class declaration if no JSDoc exists.
  </action>
  <verify>Run `grep -n "stateAccess\|State access:" src/game/systems/*.ts` — each system file has at least one match.</verify>
  <done>Every system class in src/game/systems/ has a documented state access pattern explaining what it reads and why.</done>
</task>

<task type="auto">
  <name>Task 5: Document or extract magic numbers in Car.ts and Player.ts</name>
  <files>
    src/game/entities/Car.ts
    src/game/entities/Player.ts
  </files>
  <action>
**Car.ts:**
- The stop detection threshold `10` on line 802 (in shouldStop()): Extract to a named constant `const STOP_DETECTION_THRESHOLD = 10;` at the top of the file near the other constants, with a comment: `/** Pixel tolerance for stop line detection. Cars within this distance of the stop line will stop on red. */`
- The off-screen margin `200` on line 788 (in isOffScreen()): Extract to `const OFFSCREEN_MARGIN = 200;` with comment: `/** Pixels beyond world bounds before a car is considered off-screen and recyclable. */`
- The smoke timer interval `500` on line 775: Extract to `const SMOKE_PUFF_INTERVAL_MS = 500;` with comment: `/** Milliseconds between coal roller smoke puff emissions. */`
- The passenger chance `0.3` on line 206: Extract to `const PASSENGER_CHANCE = 0.3;` with comment: `/** Probability (0-1) of a non-motorcycle/bicycle car having a passenger. */`
- The dog chance `0.1` on line 209: Extract to `const DOG_PASSENGER_CHANCE = 0.1;` with comment: `/** Probability (0-1) of a passenger being a dog (given passenger exists). */`

**Player.ts:**
- The body proportion constants (BODY_W, BODY_H, HEAD_R, ARM_W, ARM_H, LEG_W, LEG_H, SIGN_W, SIGN_H) at lines 24-31 are already named constants but lack a unifying comment. Add a comment block above them:
```
// ==========================================================================
// Body proportions — intentional design constants for paper cutout character.
// At game scale ~65px tall including sign. Sized to read clearly at 1x zoom.
// Proportions reference a simplified paper doll: head ~16px dia, torso 18x22,
// sign 40x22 held overhead via popsicle stick.
// ==========================================================================
```
- The color constants (SKIN_COLOR, SHIRT_COLOR, etc) at lines 35-38: Add a comment: `// Character colors — construction paper palette. Intentional design choices, not config-driven.`

Use named constants with JSDoc comments. Do NOT move to external config files — these are entity-specific rendering constants that don't need runtime configuration.
  </action>
  <verify>Run `npx tsc --noEmit` — no errors. Run `grep -n "STOP_DETECTION_THRESHOLD\|OFFSCREEN_MARGIN\|SMOKE_PUFF_INTERVAL" src/game/entities/Car.ts` — all 3 constants found.</verify>
  <done>All magic numbers in Car.ts extracted to named constants with JSDoc. Player.ts body proportions documented with explanatory comment block.</done>
</task>

<task type="auto">
  <name>Task 6: Add dev-only config validation in system constructors</name>
  <files>
    src/game/systems/ReactionSystem.ts
    src/game/systems/EventSystem.ts
    src/game/systems/FatigueSystem.ts
    src/game/systems/ConfidenceSystem.ts
  </files>
  <action>
Add dev-only validation at the end of each system's constructor, gated behind `import.meta.env.DEV`. Use `console.warn('[HFD] ...')` — never throw. Validate:

**ReactionSystem constructor:**
```typescript
if (import.meta.env.DEV) {
  const totalWeight = this.weights.reduce((sum, w) => sum + w.weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    console.warn(`[HFD] ReactionSystem: adjusted weights sum to ${totalWeight.toFixed(3)}, expected ~1.0`);
  }
}
```

**EventSystem constructor:**
```typescript
if (import.meta.env.DEV) {
  if (this.config.minEventSpacing <= 0) {
    console.warn('[HFD] EventSystem: minEventSpacing should be positive');
  }
  if (this.config.maxEventsPerSession < 1) {
    console.warn('[HFD] EventSystem: maxEventsPerSession should be >= 1');
  }
  if (this.difficulty.eventFrequencyMultiplier < 0.1 || this.difficulty.eventFrequencyMultiplier > 5.0) {
    console.warn(`[HFD] EventSystem: eventFrequencyMultiplier ${this.difficulty.eventFrequencyMultiplier} outside sane range (0.1-5.0)`);
  }
}
```

**FatigueSystem constructor:**
```typescript
if (import.meta.env.DEV) {
  if (this.config.baseDrainRate <= 0) {
    console.warn('[HFD] FatigueSystem: baseDrainRate should be positive');
  }
  if (this.difficultyMultiplier < 0.1 || this.difficultyMultiplier > 5.0) {
    console.warn(`[HFD] FatigueSystem: fatigueDrainMultiplier ${this.difficultyMultiplier} outside sane range (0.1-5.0)`);
  }
  if (this.config.maxFatigue <= 0) {
    console.warn('[HFD] FatigueSystem: maxFatigue should be positive');
  }
}
```

**ConfidenceSystem constructor:**
```typescript
if (import.meta.env.DEV) {
  if (this.config.startingConfidence < this.config.min || this.config.startingConfidence > this.config.max) {
    console.warn(`[HFD] ConfidenceSystem: startingConfidence ${this.config.startingConfidence} outside min/max range (${this.config.min}-${this.config.max})`);
  }
  if (this.config.noReactionDrainRate < 0) {
    console.warn('[HFD] ConfidenceSystem: noReactionDrainRate should not be negative');
  }
}
```

Place validation after all property assignments in each constructor.
  </action>
  <verify>Run `npx tsc --noEmit` — no errors. Run `grep -rn "\[HFD\]" src/game/systems/ReactionSystem.ts src/game/systems/EventSystem.ts src/game/systems/FatigueSystem.ts src/game/systems/ConfidenceSystem.ts` — each file has at least one validation warning.</verify>
  <done>Dev-only config validation runs in ReactionSystem, EventSystem, FatigueSystem, and ConfidenceSystem constructors. All gated behind import.meta.env.DEV, using console.warn, never throwing.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no new errors
2. `grep -rn "as any" src/game/` shows only DebugOverlay hotTune helper (if any remain)
3. `grep -rn "as unknown" src/game/` shows zero results
4. src/game/README.md exists and is 80-150 lines
5. All system files have state access documentation
6. Dev validation warnings appear in browser console during `npm run dev`
</verification>

<success_criteria>
- EventSystem's 3 scheduling methods have detailed JSDoc explaining priority, constraints, and integration
- src/game/README.md is a concise architecture reference covering system hierarchy, loop order, data flow, managers, and entity lifecycle
- Zero `as any` or `as unknown` casts remain (except DebugOverlay utility)
- Zero unnecessary non-null assertions in config files
- Every system class documents its state access pattern
- Car.ts magic numbers are named constants with JSDoc
- Player.ts proportions have explanatory comment block
- Dev-only config validation warns on bad values in 4 system constructors
</success_criteria>

<output>
After completion, create `.planning/quick/4-ai-readability-consistency-cleanup-pass/4-SUMMARY.md`
</output>
