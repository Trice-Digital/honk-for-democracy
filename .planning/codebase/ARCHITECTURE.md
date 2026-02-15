# Architecture

**Analysis Date:** 2026-02-15

## Pattern Overview

**Overall:** Layered Phaser 3 game with separation between scene orchestration, game systems, managers, entities, and configuration.

**Key Characteristics:**
- Phaser scene-based architecture with 5 sequential scenes (BootScene → SignCraftScene → IntersectionScene → ScoreScene → ActivismScene)
- System-based design where stateful logic lives in dedicated systems (GameStateManager, AudioSystem, EventSystem, etc.)
- Manager classes coordinate between systems and rendering (TrafficManager, PlayerController, HUDManager)
- Entities represent game objects with rendering and behavior (Car, Player, VisibilityCone)
- Configuration-driven values across all layers (difficulty, intersection layout, sign materials, audio, reactions)
- Cross-scene persistence via Phaser's registry for AudioSystem and AudioMixerSystem

## Layers

**Configuration Layer (`/src/game/config/`):**
- Purpose: Define all game parameters, difficulty levels, sign materials, audio config, event schedules
- Location: `src/game/config/`
- Contains: Constants and readonly config objects (gameConfig, signConfig, paletteConfig, difficultyConfig, etc.)
- Depends on: Nothing (no dependencies)
- Used by: All other layers read config values

**Systems Layer (`/src/game/systems/`):**
- Purpose: Encapsulate stateful game logic and simulation (score, confidence, traffic lights, audio, events)
- Location: `src/game/systems/`
- Contains: GameStateManager (single source of truth), AudioSystem, TrafficLightSystem, ConfidenceSystem, FatigueSystem, EventSystem, WeatherSystem, ReactionSystem, AmbientSystem, MusicSystem, ReactiveCueSystem, DebugOverlay
- Depends on: Config layer, Phaser events
- Used by: Scene orchestrators, managers, other systems
- Pattern: Most systems extend Phaser.Events.EventEmitter for event-driven integration. GameStateManager uses getState() snapshot pattern or individual getters. AudioSystem does not read GameStateManager (stateless synthesizer).

**Entity Layer (`/src/game/entities/`):**
- Purpose: Represent game objects with rendering and interactive behavior
- Location: `src/game/entities/`
- Contains: Car (paper cutout vehicle with queueing logic), Player (paper cutout protester with fatigue visuals), VisibilityCone (directional cone detection)
- Depends on: Config layer (dimensions, colors, palettes), utils (paperArt for visual styling)
- Used by: Managers (TrafficManager spawns/pools Cars, PlayerController handles Player input)

**Manager Layer (`/src/game/managers/`):**
- Purpose: Coordinate between systems, entities, and scene rendering
- Location: `src/game/managers/`
- Contains: TrafficManager (spawning/pooling cars, queueing), PlayerController (input, raise sign), HUDManager (score/confidence UI), ReactionFeedbackManager (visual feedback for reactions), MenuManager (pause/resume), IntersectionRenderer (road/trees rendering), TrafficLightRenderer (traffic light visuals)
- Depends on: Systems layer, entity layer, config layer
- Used by: Scene orchestrators (IntersectionScene)

**Scene Layer (`/src/game/scenes/`):**
- Purpose: Orchestrate game flow and integrate all layers
- Location: `src/game/scenes/`
- Contains: BootScene (loading), SignCraftScene (sign editor with Fabric.js), IntersectionScene (main gameplay), ScoreScene (post-game summary), ActivismScene (educational content)
- Depends on: All other layers
- Used by: Phaser game engine

**Utility Layer (`/src/game/utils/` and `/src/lib/`):**
- Purpose: Shared drawing utilities, sign editors, share services
- Location: `src/game/utils/`, `src/lib/`
- Contains: paperArt (scissor-cut, shadow, grain rendering), signEditor (Fabric.js wrapper), signMaterials (material texture generation), signDecorations (emoji system), ShareCardGenerator, ShareService
- Depends on: Config layer, Phaser for drawing
- Used by: Entities, managers, scenes

**Astro Shell Layer (`/src/pages/`, `/src/layouts/`):**
- Purpose: Site navigation and game container hosting
- Location: `src/pages/`, `src/layouts/`
- Contains: Landing page (index.astro), play page (play.astro), main layout wrapper
- Depends on: Game main.ts via client-side script
- Used by: Browser navigation

## Data Flow

**Game Initialization:**

1. Astro page load (index.astro or play.astro)
2. play.astro imports `bootGame()` from `src/game/main.ts`
3. `bootGame()` creates Phaser game config via `createGameConfig()` which lists all 5 scenes
4. Phaser creates BootScene first

**Sign Crafting Flow:**

1. BootScene loads assets, delays briefly, starts SignCraftScene
2. SignCraftScene mounts Fabric.js DOM overlay (completely separate from Phaser canvas)
3. User edits sign in Fabric.js, clicks "START PROTESTING"
4. SignCraftScene exports PNG data URL and stores in Phaser registry via `setSignData()`
5. SignCraftScene transitions to IntersectionScene

**Main Gameplay Flow:**

1. IntersectionScene.create():
   - Reads sign data from registry (set by SignCraftScene or uses defaults)
   - Creates all systems (GameStateManager, TrafficLightSystem, AudioSystem, etc.) and registers in Phaser registry
   - Audio systems check registry for persistence across scene transitions (AudioSystem, AudioMixerSystem are reused)
   - Other systems (AmbientSystem, MusicSystem, ReactiveCueSystem) are fresh per scene
   - Sets up event listeners between systems (weatherSystem → gameState, eventSystem → gameState)
   - Delegates rendering to managers (IntersectionRenderer, TrafficLightRenderer)
   - Creates entities (Player, VisibilityCone)

2. IntersectionScene.update():
   - TrafficManager.updateSpawning() creates cars based on traffic light state
   - TrafficManager.updateCars() advances car positions, handles car-ahead queueing
   - GameStateManager updates time remaining (called implicitly via system updates)
   - Player responds to input via PlayerController
   - Visibility cone detects cars in range
   - HUDManager renders live score/confidence/fatigue
   - EventSystem checks if events should fire
   - WeatherSystem applies degradation over time

3. Session Ends:
   - GameStateManager detects time = 0 or confidence = 0
   - Stops traffic, freezes UI
   - Waits for user to click "View Results"
   - Transitions to ScoreScene

4. ScoreScene:
   - Displays final score, breakdown of reactions
   - Generates ShareCardGenerator PNG
   - Transition to ActivismScene or back to sign craft

**State Management:**

- GameStateManager is the single source of truth: stores score, time, confidence, fatigue, reactions, weather state, sign degradation
- All systems read from GameStateManager.getState() or specific getters
- Systems emit events when state changes (e.g., confidenceSystem on confidence change)
- Systems update GameStateManager via setters (e.g., gameState.recordReaction(), gameState.setWeatherState())

## Key Abstractions

**GameStateManager (src/game/systems/GameStateManager.ts):**
- Purpose: Single source of truth for all game metrics
- Examples: confidence, fatigue, reactions tally, time remaining, session active/ended state
- Pattern: EventEmitter with getState() snapshot getter and individual property getters/setters. Registered in Phaser registry for cross-scene access.

**System Pattern (extending Phaser.Events.EventEmitter):**
- Purpose: Encapsulate simulation logic independently
- Examples: TrafficLightSystem (light cycle), ConfidenceSystem (confidence updates based on reactions), FatigueSystem (arm tiredness), AudioSystem (Web Audio synthesis)
- Pattern: Constructor takes dependencies (GameStateManager, DifficultyConfig, scene), exposes getter methods, emits events on state changes. Registered in Phaser registry if cross-scene access needed.

**Car Pooling (src/game/managers/TrafficManager.ts):**
- Purpose: Reuse car instances instead of creating/destroying
- Examples: carPool array for inactive cars, spawnCar() grabs from pool or creates new
- Pattern: Avoids garbage collection thrashing with high spawn rates

**Visibility Cone & Reaction Detection (src/game/entities/VisibilityCone.ts + PlayerController.ts):**
- Purpose: Detect which cars are in player's field of view and react to them
- Pattern: Cone is a game object with direction/angle; during raise sign, cone checks each car's distance and angle, triggers reaction sounds and UI feedback

**Paper Art Utility (src/game/utils/paperArt.ts):**
- Purpose: Reusable drawing functions for scissor-cut, shadow, grain effects
- Examples: drawScissorCutRect, drawPaperShadow, applyPaperGrain
- Pattern: Functions take Graphics object and draw coordinates, return Graphics for chaining or texture baking

**Sign Editor Bridge (src/game/scenes/SignCraftScene.ts + src/lib/signEditor.ts):**
- Purpose: Decouple Phaser from Fabric.js sign editing
- Pattern: Fabric.js lives in DOM overlay completely separate from Phaser canvas. PNG exported via toDataURL(), stored in registry, used as texture in IntersectionScene.

## Entry Points

**bootGame() (src/game/main.ts):**
- Location: `src/game/main.ts`
- Triggers: Called from Astro play.astro page via client-side script
- Responsibilities: Create Phaser game config, instantiate Phaser.Game, attach visibility listener for pause/resume

**IntersectionScene.create() (src/game/scenes/IntersectionScene.ts):**
- Location: `src/game/scenes/IntersectionScene.ts` lines 84+
- Triggers: Automatically called by Phaser after SignCraftScene transitions to IntersectionScene
- Responsibilities: Initialize all systems, register them, create entities, delegate to managers, setup event wiring

**IntersectionScene.update() (src/game/scenes/IntersectionScene.ts):**
- Location: `src/game/scenes/IntersectionScene.ts` update() method (not shown in excerpt but standard Phaser pattern)
- Triggers: Called every frame by Phaser
- Responsibilities: Call manager/system update methods, handle session end detection

## Error Handling

**Strategy:** Graceful degradation with browser console logging for development.

**Patterns:**
- Audio: Web Audio API wrapped in try-catch, falls back to no sound if not available (`AudioSystem.init()` catches exceptions)
- Texture loading: Missing textures log warnings but game continues (graphics drawn inline as fallback)
- Input: Checks GameStateManager.isActive() before processing to prevent input during paused/ended sessions
- Scene transitions: Explicit timing delays (e.g., BootScene 400ms delay) ensure UI visibility before auto-transition

## Cross-Cutting Concerns

**Logging:** Console.log with [HFD] prefix for game-specific messages. No centralized logger.

**Validation:** Difficulty and config values validated at construction time (dev-only assertions in system constructors).

**Authentication:** None (client-side game).

**Persistence:** Phaser registry used for cross-scene data (AudioSystem, GameStateManager instances, sign data). No localStorage or database.

---

*Architecture analysis: 2026-02-15*
