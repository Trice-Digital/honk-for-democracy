# Game Architecture Reference

Quick reference for developers and AI agents working with the Honk for Democracy game codebase.

## System Hierarchy

**GameStateManager** is the single source of truth.
- EventEmitter singleton registered in Phaser registry
- All systems read/write state through GameStateManager
- Systems listen for state change events

**Core Systems:**

- **GameStateManager** — Session timer, score, confidence, fatigue, reactions tally, weather state, sign degradation
- **TrafficLightSystem** — Traffic light phases (red/yellow/green), independent cycle timer
- **ReactionSystem** — Weighted random reaction rolling, difficulty-adjusted sentiment weights
- **ConfidenceSystem** — Confidence meter logic, reaction impact, passive drain, game-over threshold
- **FatigueSystem** — Arm fatigue accumulation/recovery, raised sign drain, cone width scaling
- **EventSystem** — Mid-game event scheduler (cop check, weather, karma), probability + guaranteed events
- **WeatherSystem** — Rain effects, sign degradation, confidence drain, NPC reaction shift
- **AudioSystem** — Web Audio API procedural sounds (honks, reactions, ambience)
- **AudioMixerSystem** — Master mixer with 3 layers (ambient, music, cues), volume control
- **AmbientSystem** — Background ambience (traffic hum, city sounds)
- **MusicSystem** — Adaptive music based on confidence level
- **ReactiveCueSystem** — Sound cues for reactions (positive honks, negative jeers)
- **DebugOverlay** — Dev-only debug UI with hot-tuning sliders (toggle with backtick)

## Game Loop Order (IntersectionScene.update)

Systems update in this exact sequence:

1. `gameState.updateTime(delta)` — Session timer tick
2. `trafficLights.update(delta)` — Light phase cycling
3. `confidenceSystem.update(delta)` — Passive drain, game-over check
4. `fatigueSystem.update(delta)` — Fatigue accumulation/recovery
5. `eventSystem.update(delta)` — Event triggering + active event updates
6. `weatherSystem.update(delta)` — Rain particle spawning, sign degradation
7. `musicSystem.updateConfidence(confidence)` — Adaptive music layer mixing
8. `cueSystem.update(confidence, delta)` — Reactive sound cue triggering
9. `trafficManager.updateSpawning(delta)` — Car spawning logic
10. `trafficManager.updateCars(time, delta)` — Car movement, stopping, reactions
11. `playerController.checkConeIntersections()` — Visibility cone vs. car collision
12. `playerController.updateConeFromFatigue()` — Cone width from fatigue
13. `playerController.updateRaiseButtonState()` — Raise sign button state
14. `hudManager.updateUI()` — HUD refresh (time, score, confidence, fatigue bars)
15. Player wobble + fatigue visuals — Idle wobble, arm droop animations
16. Tree canopies wobble — Background idle animation

## Data Flow Between Scenes

**BootScene → SignCraftScene:**
- Launches sign creator scene

**SignCraftScene → registry:**
- Stores `SignData` (material, message, texture) in Phaser registry via `this.registry.set('signData', ...)`

**IntersectionScene ← registry:**
- Reads `SignData` via `getSignData(this)` helper
- Applies material + texture to Player entity

**IntersectionScene → registry:**
- Stores final `GameState` snapshot on session end via `this.registry.set('finalGameState', ...)`

**ScoreScene ← registry:**
- Reads `finalGameState` for stats display

**ActivismScene ← registry:**
- Reads `finalGameState` for share image generation

## Manager Pattern (src/game/managers/)

Managers own rendering and input handling. Receive state from systems.

- **IntersectionRenderer** — World/road/sidewalk/trees graphics, scene initialization
- **TrafficLightRenderer** — Light sprite visuals, receives TrafficLightSystem state
- **TrafficManager** — Car pool, spawning logic, car-following, receives TrafficLightSystem
- **ReactionFeedbackManager** — Score floaters, emoji popups, receives ReactionSystem events
- **PlayerController** — Input handling (pointer/touch), raise sign mechanic, receives Player + FatigueSystem
- **HUDManager** — Time/score/confidence/fatigue bars, pause button, receives GameStateManager state
- **MenuManager** — Pause overlay, resume/quit buttons, receives scene

**Pattern:** Systems hold logic, managers hold visuals. Managers query systems, never the reverse.

## Entity Lifecycle

**Car:**
- Spawn from pool via `resetCar(lane, speed)` at lane.spawnX/Y
- Drive: `update()` moves car, applies wobble, checks stop line
- React: `setReactionFace(sentiment)` when entering cone
- Pass/despawn: `isOffScreen()` check → return to pool

**Player:**
- Created once in `IntersectionScene.create()`
- Sign texture updated from registry `SignData`
- Fatigue visuals: `updateFatigueVisuals(fatigue)` — arm crease at 70%, droop at 85%
- Idle wobble: `updateWobble(time, isRaised)` — 0.5° sine wave when not raised

**VisibilityCone:**
- Tracks player position
- Width driven by `FatigueSystem` — narrow as fatigue increases
- Collision detection via `getBounds()` vs. car bounds

## Key Config Files

- **intersectionConfig.ts** — Map layout, lane definitions, spawn/stop coordinates, session duration
- **difficultyConfig.ts** — Sentiment weights, light cycle speed, fatigue drain, event frequency
- **reactionConfig.ts** — Reaction types, base weights, score values, sentiment flags
- **signConfig.ts** — Material definitions (board/text/stroke colors), quality multipliers
- **eventConfig.ts** — Event scheduling params, cop scenarios, karma phases
- **fatigueConfig.ts** — Base drain rate, recovery rate, max fatigue, cone width scaling
- **confidenceConfig.ts** — Starting confidence, min/max, drain rates, reaction impacts
- **scoreConfig.ts** — Milestone thresholds, rank labels, share messages
- **audioConfig.ts** — Master volume, layer gains, honk frequencies
- **paletteConfig.ts** — All paper cutout colors, shadow offsets, marker colors
- **gameConfig.ts** — Phaser 3 game config (renderer, scale, physics, scenes)

## State Access Patterns

Systems use different patterns to read GameStateManager:

- **Full snapshot** (`getState()`) — EventSystem, ConfidenceSystem (need multiple fields)
- **Individual getters** (`getConfidence()`, `getFatigue()`) — FatigueSystem (frequent single-value reads)
- **Event listeners** — ConfidenceSystem, WeatherSystem (react to state changes)
- **Self-contained** — TrafficLightSystem (does not read GameStateManager, exposes own state)

See individual system files for `@stateAccess` documentation.
