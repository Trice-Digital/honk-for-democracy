---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/managers/IntersectionRenderer.ts
  - src/game/managers/TrafficLightRenderer.ts
  - src/game/managers/TrafficManager.ts
  - src/game/managers/PlayerController.ts
  - src/game/managers/ReactionFeedbackManager.ts
  - src/game/managers/HUDManager.ts
  - src/game/managers/MenuManager.ts
  - src/game/scenes/IntersectionScene.ts
autonomous: true

must_haves:
  truths:
    - "Game plays identically after refactor — same visual output, same gameplay, same scoring"
    - "IntersectionScene.ts is ~300-400 lines: init, wiring, update orchestration, cleanup"
    - "Each manager class is self-contained with constructor(scene, deps), optional update(), and destroy()"
    - "Dead code (updateStoppedTrafficBanner, showStoppedBanner, hideStoppedBanner) is deleted"
    - "Magic numbers (sidewalk width 18, crosswalk stripe 7/5, feedback rotation 8, drift 40) are in config"
  artifacts:
    - path: "src/game/managers/IntersectionRenderer.ts"
      provides: "Static scenery baking + tree canopy creation"
      exports: ["IntersectionRenderer"]
    - path: "src/game/managers/TrafficLightRenderer.ts"
      provides: "Traffic light drawing, color helpers, containers, active circles"
      exports: ["TrafficLightRenderer"]
    - path: "src/game/managers/TrafficManager.ts"
      provides: "Car spawning, pooling, update loop, car-ahead detection"
      exports: ["TrafficManager"]
    - path: "src/game/managers/PlayerController.ts"
      provides: "Input handling, raise sign mechanic, action buttons"
      exports: ["PlayerController"]
    - path: "src/game/managers/ReactionFeedbackManager.ts"
      provides: "Speech bubbles, score floaters, paper flutter animations"
      exports: ["ReactionFeedbackManager"]
    - path: "src/game/managers/HUDManager.ts"
      provides: "Score, timer, confidence bar, fatigue bar, analog clock, updateUI"
      exports: ["HUDManager"]
    - path: "src/game/managers/MenuManager.ts"
      provides: "Pause overlay, mute button, isPaused state"
      exports: ["MenuManager"]
    - path: "src/game/scenes/IntersectionScene.ts"
      provides: "Slim orchestrator scene"
      min_lines: 250
  key_links:
    - from: "src/game/scenes/IntersectionScene.ts"
      to: "all managers"
      via: "constructor injection + update() calls"
      pattern: "new (TrafficManager|PlayerController|HUDManager|MenuManager|IntersectionRenderer|TrafficLightRenderer|ReactionFeedbackManager)"
    - from: "src/game/managers/TrafficManager.ts"
      to: "src/game/managers/ReactionFeedbackManager.ts"
      via: "scene passes car references for reaction face setting"
      pattern: "cars"
    - from: "src/game/managers/HUDManager.ts"
      to: "GameStateManager"
      via: "reads state for UI updates"
      pattern: "gameState\\.getState"
---

<objective>
Refactor IntersectionScene.ts (2263 lines) into 7 focused manager classes under src/game/managers/, leaving IntersectionScene as a ~300-400 line orchestrator.

Purpose: Enable multi-scene support by making managers reusable. Current monolith prevents extracting gameplay patterns for new scenes.
Output: 7 new manager files + slimmed IntersectionScene.ts. Zero gameplay changes.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/game/scenes/IntersectionScene.ts
@src/game/config/intersectionConfig.ts
@src/game/config/difficultyConfig.ts
@src/game/config/paletteConfig.ts
@src/game/systems/GameStateManager.ts
@src/game/systems/TrafficLightSystem.ts
@src/game/systems/FatigueSystem.ts
@src/game/systems/ReactionSystem.ts
@src/game/systems/AudioSystem.ts
@src/game/systems/AudioMixerSystem.ts
@src/game/entities/Car.ts
@src/game/entities/Player.ts
@src/game/entities/VisibilityCone.ts
@src/game/utils/paperArt.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract rendering and traffic managers (4 files)</name>
  <files>
    src/game/managers/IntersectionRenderer.ts
    src/game/managers/TrafficLightRenderer.ts
    src/game/managers/TrafficManager.ts
    src/game/managers/ReactionFeedbackManager.ts
  </files>
  <action>
Create `src/game/managers/` directory.

**IntersectionRenderer.ts** — Extract from IntersectionScene lines 420-660.
- Class `IntersectionRenderer` with constructor `(scene: Phaser.Scene, config: typeof INTERSECTION_CONFIG)`.
- Method `render(): (Phaser.GameObjects.Graphics | Phaser.GameObjects.Image)[]` — performs all static scenery baking (sky, grass, sidewalks, roads, lane markings, crosswalks, stop lines, buildings, trees, lamp posts, flower boxes, fire hydrant, manhole), returns the tree canopies array for the scene to animate.
- Move magic numbers into named constants at module top: `SIDEWALK_WIDTH = 18`, `CROSSWALK_STRIPE_WIDTH = 7`, `CROSSWALK_GAP = 5`.
- Import paperArt utilities (drawPaperShadow, drawPaperShadowCircle, drawScissorCutRect, drawMaskingTapeStrip, drawPopsicleStick) and PALETTE.
- No update() needed (static rendering). No destroy() needed (Phaser scene teardown handles it).

**TrafficLightRenderer.ts** — Extract from IntersectionScene lines 661-786.
- Class `TrafficLightRenderer` with constructor `(scene: Phaser.Scene, config: typeof INTERSECTION_CONFIG, trafficLights: TrafficLightSystem)`.
- Own fields: `lightGraphics`, `trafficLightContainers[]`, `trafficLightActiveCircles[]`.
- Method `draw(): void` — the drawTrafficLights() logic.
- Method `getContainers(): Phaser.GameObjects.Container[]` — for wobble animation in scene update.
- Method `getActiveCircles(): Phaser.GameObjects.Graphics[]` — for pulse tween on phase change.
- Move `getLightHex()` and `getDimLightHex()` as private methods.
- No destroy() needed.

**TrafficManager.ts** — Extract from IntersectionScene lines 788-923.
- Class `TrafficManager` with constructor `(scene: Phaser.Scene, config: typeof INTERSECTION_CONFIG, difficulty: DifficultyConfig, trafficLights: TrafficLightSystem)`.
- Own fields: `cars: Car[]`, `carPool: Car[]`, `spawnTimers: Map<string, number>`.
- Methods: `initSpawnTimers()`, `updateSpawning(delta)`, `updateCars(time, delta)`, `getCars(): Car[]`, `findCarAhead(car)`, `getDistanceBetweenCars(a, b)`.
- Private: `getRandomSpawnDelay()`, `getRandomCarSpeed()`, `spawnCar(lane)`.
- Method `destroy(): void` — destroy all cars and pooled cars.

**ReactionFeedbackManager.ts** — Extract from IntersectionScene lines 999-1159.
- Class `ReactionFeedbackManager` with constructor `(scene: Phaser.Scene)`.
- Method `showReactionFeedback(worldX, worldY, reaction, wasRaiseBoosted, wasDeflected, finalScoreValue, cars: Car[])` — the full speech bubble + score floater logic. Pass cars array so it can find the car at position and set reaction face.
- Move magic numbers to named constants: `FEEDBACK_ROTATION_RANGE = 8` (the -4 to +4 degrees), `FEEDBACK_DRIFT_RANGE = 40`.
- Pure visual, no game state mutation. No update() needed. No destroy() needed.
  </action>
  <verify>
Run `npx tsc --noEmit` — zero type errors. All 4 files compile cleanly. Imports resolve correctly.
  </verify>
  <done>Four manager classes exist in src/game/managers/ with correct types, all paperArt/config imports, and exported classes matching the API described above.</done>
</task>

<task type="auto">
  <name>Task 2: Extract UI managers (HUDManager, MenuManager, PlayerController)</name>
  <files>
    src/game/managers/HUDManager.ts
    src/game/managers/MenuManager.ts
    src/game/managers/PlayerController.ts
  </files>
  <action>
**HUDManager.ts** — Extract from IntersectionScene lines 1236-1317, 1368-1487, 1678-1791, 1965-1986, 1988-2006, 2008-2097.
- Class `HUDManager` with constructor `(scene: Phaser.Scene, gameState: GameStateManager, fatigueSystem: FatigueSystem, trafficLights: TrafficLightSystem, config: typeof INTERSECTION_CONFIG)`.
- Own fields: `scoreText`, `timerText`, `confidenceBarBg/Fill`, `confidenceLabel`, `fatigueBarBg/Fill`, `fatigueLabel`, `clockContainer`, `clockHourHand`, `clockMinuteHand`.
- Methods: `createUI(viewW, viewH)`, `updateUI()`, `repositionUI(viewW, viewH)`.
- Private: `createConfidenceUI()`, `createFatigueUI()`, `createClockUI()`, `updateClock()`.
- Method `getRaiseBtnState(): { bg: Rectangle, text: Text }` — expose raise button refs so PlayerController can update visual state during raise mechanic. OR better: HUDManager exposes `setRaiseButtonVisual(isRaised: boolean, isResting: boolean)` instead.
- No destroy() needed (Phaser scene teardown).

**MenuManager.ts** — Extract from IntersectionScene lines 1322-1357 (mute), 1797-1963 (menu).
- Class `MenuManager` with constructor `(scene: Phaser.Scene, audioSystem: AudioSystem, mixerSystem: AudioMixerSystem)`.
- Own fields: `isPaused: boolean`, `menuOverlay`, `muteBtn`, `muteBtnBg`.
- Methods: `createMuteButton()`, `createMenuButton(viewW, viewH)`, `toggleMenuOverlay()`, `getIsPaused(): boolean`.
- Method `destroy(): void` — destroy menu overlay if open.

**PlayerController.ts** — Extract from IntersectionScene lines 267-287 (input), 1493-1675 (action buttons), 929-993 (cone intersection + raise).
- Class `PlayerController` with constructor `(scene: Phaser.Scene, config: typeof INTERSECTION_CONFIG, cone: VisibilityCone, gameState: GameStateManager, fatigueSystem: FatigueSystem, audioSystem: AudioSystem, reactionSystem: ReactionSystem, reactionFeedback: ReactionFeedbackManager, cars: () => Car[])`.
- Note: `cars` is a getter function `() => Car[]` because TrafficManager owns the array and it changes over time.
- Own fields: `raiseHoldActive`, `raiseTapTimer`, action button containers/shadows.
- Methods: `setupInput(menuManager: MenuManager)` — registers pointermove/pointerdown handlers, checks `menuManager.getIsPaused()` before processing.
- Methods: `createActionButtons(viewW, viewH)` — raise, switch arms, rest buttons with neobrutalist press-into-shadow effect.
- Methods: `checkConeIntersections()` — the cone detection + raise boost/deflect logic, calls reactionFeedback.showReactionFeedback().
- Methods: `updateConeFromFatigue()` — reads fatigueSystem.getConeWidth(), sets on cone.
- Method `destroy(): void` — cleanup raiseTapTimer.
  </action>
  <verify>
Run `npx tsc --noEmit` — zero type errors. All 3 files compile cleanly.
  </verify>
  <done>Three manager classes exist in src/game/managers/ with correct types, properly typed constructor dependencies, and all UI/input logic extracted.</done>
</task>

<task type="auto">
  <name>Task 3: Rewire IntersectionScene as slim orchestrator + delete dead code</name>
  <files>
    src/game/scenes/IntersectionScene.ts
  </files>
  <action>
Rewrite IntersectionScene.ts to be a slim orchestrator (~300-400 lines) that:

1. **Imports** all 7 managers from `../managers/`.

2. **Properties** — only systems (gameState, trafficLights, reactionSystem, confidenceSystem, fatigueSystem, eventSystem, weatherSystem, audioSystem, mixerSystem, ambientSystem, musicSystem, cueSystem), entities (player, cone), managers (trafficManager, playerController, reactionFeedback, hudManager, menuManager, intersectionRenderer, trafficLightRenderer), debugOverlay, treeCanopies, signData, config, difficulty.

3. **create()** — same system init order as current (lines 138-361), but delegate:
   - `this.intersectionRenderer = new IntersectionRenderer(this, this.config);`
   - `this.treeCanopies = this.intersectionRenderer.render();`
   - `this.trafficLightRenderer = new TrafficLightRenderer(this, this.config, this.trafficLights);`
   - `this.trafficManager = new TrafficManager(this, this.config, this.difficulty, this.trafficLights);`
   - `this.trafficManager.initSpawnTimers();`
   - `this.reactionFeedback = new ReactionFeedbackManager(this);`
   - `this.playerController = new PlayerController(this, this.config, this.cone, this.gameState, this.fatigueSystem, this.audioSystem, this.reactionSystem, this.reactionFeedback, () => this.trafficManager.getCars());`
   - `this.hudManager = new HUDManager(this, this.gameState, this.fatigueSystem, this.trafficLights, this.config);`
   - `this.hudManager.createUI(viewW, viewH);`
   - `this.menuManager = new MenuManager(this, this.audioSystem, this.mixerSystem);`
   - `this.menuManager.createMuteButton();`
   - `this.menuManager.createMenuButton(viewW, viewH);`
   - `this.playerController.setupInput(this.menuManager);`
   - `this.playerController.createActionButtons(viewW, viewH);`
   - Keep: system init, audio init, sign data, weather event wiring, player/cone entity creation, sign texture loading, sessionEnd listener, phaseChanged listener (but delegate drawTrafficLights to trafficLightRenderer.draw()), resize listener (delegate to hudManager.repositionUI), debug overlay init, paper grain overlay.

4. **update()** — same order:
   - Guard: `if (!this.gameState.isActive() || this.menuManager.getIsPaused()) return;`
   - System updates (gameState, trafficLights, confidence, fatigue, event, weather, music, cue).
   - `this.trafficManager.updateSpawning(delta);`
   - `this.trafficManager.updateCars(time, delta);`
   - `this.playerController.checkConeIntersections();`
   - `this.playerController.updateConeFromFatigue();`
   - `this.hudManager.updateUI();`
   - Player wobble + fatigue visuals (keep inline, 2 lines).
   - Traffic light container wobble (use `this.trafficLightRenderer.getContainers()`).
   - Tree canopy wobble (keep inline, uses this.treeCanopies).
   - Debug overlay update.

5. **showSessionOver()** — keep but delegate cleanup:
   - `this.trafficManager.destroy();`
   - `this.playerController.destroy();`
   - `this.menuManager.destroy();`
   - Keep system destroys as-is.

6. **Delete dead code:**
   - Remove `updateStoppedTrafficBanner()` (line 1169-1172, just returns).
   - Remove `showStoppedBanner()` (lines 1174-1212).
   - Remove `hideStoppedBanner()` (lines 1214-1230).
   - Remove `stoppedTrafficBanner` and `isShowingStoppedBanner` properties.
   - Remove the `this.updateStoppedTrafficBanner()` call from updateUI (now in HUDManager, don't port it there either).

7. **Keep in IntersectionScene** (NOT extracted — too tightly coupled to scene lifecycle or cross-cutting):
   - `applySignQualityMultiplier()` — touches reactionSystem weights, called from weather events.
   - `applyRainReactionShift()` — same.
   - `updateSignDegradationVisual()` — one-liner on player alpha.
   - `showEventBannerText()` — called from weather events, could be extracted later but small.

8. **Verify the `isPaused` check** — previously `this.isPaused` was a direct field. Now use `this.menuManager.getIsPaused()`. Update the phaseChanged listener's car unstop logic to also not run when paused (it currently doesn't check, which is fine — keep same behavior).
  </action>
  <verify>
1. `npx tsc --noEmit` — zero type errors.
2. `wc -l src/game/scenes/IntersectionScene.ts` — should be 250-400 lines.
3. `npm run build` — builds successfully with no warnings.
4. Run the game in browser — intersection renders identically, cars spawn and stop at lights, cone rotates with pointer, raise/switch/rest buttons work, score/timer/confidence/fatigue bars update, mute button works, menu pause/resume/restart/quit work, clock hands animate.
  </verify>
  <done>IntersectionScene.ts is 250-400 lines. All gameplay and visuals work identically to before. Dead code (stopped traffic banner) is deleted. All 7 managers are wired in. `npm run build` succeeds.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `npm run build` succeeds
3. `wc -l src/game/scenes/IntersectionScene.ts` shows 250-400 lines
4. `ls src/game/managers/` shows all 7 manager files
5. Manual play-test confirms identical gameplay: cars, cone, reactions, raise, buttons, HUD, menu, clock all work
</verification>

<success_criteria>
- IntersectionScene.ts reduced from 2263 lines to ~300-400 lines
- 7 manager classes created in src/game/managers/
- Zero type errors, clean build
- Game plays identically to before the refactor
- Dead code (stopped traffic banner) removed
- Magic numbers extracted to named constants in relevant managers
</success_criteria>

<output>
After completion, create `.planning/quick/1-refactor-intersectionscene-ts-into-reusa/1-SUMMARY.md`
</output>
