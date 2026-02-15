# Codebase Structure

**Analysis Date:** 2026-02-15

## Directory Layout

```
honk-for-democracy/
├── .astro/                 # Astro framework generated types
├── .planning/              # GSD analysis docs and planning phases
├── .vscode/                # IDE settings (debug config, extensions)
├── .wrangler/              # Cloudflare Workers deployment state
├── dist/                   # Build output (generated, not committed)
├── mockups/                # Paper Mario SVG vehicle reference sheet
├── node_modules/           # Dependencies (not committed)
├── public/                 # Static assets (favicon, fonts via web CDN)
├── scripts/                # Build/dev scripts
├── src/
│   ├── game/               # Phaser game engine code
│   ├── lib/                # Shared utilities (sign editor, share services)
│   ├── layouts/            # Astro layout wrapper
│   ├── pages/              # Astro pages (routing)
│   └── styles/             # Global CSS
├── astro.config.mjs        # Astro config (Cloudflare adapter)
├── package.json            # Dependencies, scripts
└── tsconfig.json           # TypeScript strict config
```

## Directory Purposes

**src/game/ — Phaser Game Engine**
- Purpose: All game code organized in functional layers
- Contains: Scenes, systems, managers, entities, config, utilities
- Structure: Organized by function (scenes/, systems/, managers/, entities/, config/, utils/)
- Key files: main.ts (entry point), gameConfig.ts (Phaser config factory)

**src/game/config/ — Configuration & Constants**
- Purpose: Define all game parameters so they're easy to tune
- Contains: 11 files, each exporting constants and readonly config objects
- Key files:
  - `gameConfig.ts`: Phaser game config factory, scene list
  - `difficultyConfig.ts`: Difficulty profiles (easy/medium/hard) with scaling multipliers
  - `signConfig.ts`: SignMaterial definitions (cardboard, posterboard, etc.) with fatigue/durability multipliers
  - `intersectionConfig.ts`: World dimensions, lane definitions, player spawn position
  - `paletteConfig.ts`: Color constants for UI, cars, reactions
  - `audioConfig.ts`: Audio parameter ranges (frequency, duration, effects)
  - `scoreConfig.ts`: Reaction-to-points multipliers
  - `fatigueConfig.ts`: Arm fatigue drain rates based on sign material
  - `eventConfig.ts`: Event scheduling, cop check dialogue, karma phases
  - `reactionConfig.ts`: Reaction type definitions and weights
  - `confidenceConfig.ts`: Confidence start/drain/threshold values

**src/game/scenes/ — Scene Orchestrators**
- Purpose: Phaser scenes that orchestrate game phases
- Contains: 5 scenes managing game flow
- Structure:
  - `BootScene.ts`: Loading screen (paper-cutout styled), asset preload, brief delay
  - `SignCraftScene.ts`: DOM overlay with Fabric.js sign editor, exports PNG
  - `IntersectionScene.ts`: Main gameplay loop, initializes all systems/managers/entities
  - `ScoreScene.ts`: Post-session summary, reaction breakdown, score display
  - `ActivismScene.ts`: Educational content and resources

**src/game/systems/ — Stateful Game Logic**
- Purpose: Encapsulate simulation systems that track and update game state
- Contains: 13 files, one system per file
- Structure:
  - `GameStateManager.ts`: Single source of truth (score, confidence, fatigue, reactions, time)
  - `TrafficLightSystem.ts`: Light cycle timing, red/green state
  - `ConfidenceSystem.ts`: Calculate confidence changes based on reactions
  - `FatigueSystem.ts`: Track arm fatigue drain (material-dependent) and visual state
  - `ReactionSystem.ts`: Define reaction types and compute weights
  - `EventSystem.ts`: Schedule and trigger mid-game events (cop checks, weather, karma)
  - `WeatherSystem.ts`: Rain events, sign degradation, NPC dropout
  - `AudioSystem.ts`: Web Audio synthesis for sound effects (honks, reactions, traffic)
  - `AudioMixerSystem.ts`: Multi-layer gain control (ambient, music, cues, UI)
  - `AmbientSystem.ts`: Background ambience (traffic, wind, crowd murmur)
  - `MusicSystem.ts`: Dynamic music composition and transitions
  - `ReactiveCueSystem.ts`: One-shot sounds triggered by reactions
  - `DebugOverlay.ts`: Development-only state visualization (fps, confidence, fatigue)

**src/game/managers/ — Coordination & Rendering**
- Purpose: Coordinate between systems, entities, and visual presentation
- Contains: 7 files, one manager per functional area
- Structure:
  - `TrafficManager.ts`: Car spawning (pool-based), queueing logic, car lifecycle
  - `PlayerController.ts`: Input handling (cone rotation), raise sign mechanics, action button UI
  - `HUDManager.ts`: Render score, confidence meter, fatigue visual, time remaining
  - `IntersectionRenderer.ts`: Draw road, lanes, trees, stop line, background
  - `TrafficLightRenderer.ts`: Render traffic light visuals, coordinate with TrafficLightSystem
  - `ReactionFeedbackManager.ts`: Visual/audio feedback when cars react
  - `MenuManager.ts`: Pause menu, resume button, escape key handling

**src/game/entities/ — Game Objects**
- Purpose: Represent interactive game entities with rendering and behavior
- Contains: 3 files, one entity per file
- Structure:
  - `Car.ts`: Paper-cutout vehicle (8 types), RenderTexture baking, emojis, passenger logic, coal roller smoke
  - `Player.ts`: Paper-cutout protester, body construction, fatigue arm crease/droop visuals, idle wobble
  - `VisibilityCone.ts`: Directional detection cone, highlight intersecting cars, visual debug mode

**src/game/utils/ — Drawing & Rendering Utilities**
- Purpose: Reusable graphics drawing functions for paper-art visual style
- Contains: 1 file
- Structure:
  - `paperArt.ts`: Exports drawScissorCutRect(), drawScissorCutPolygon(), drawPaperShadow(), applyPaperGrain(), wobbleSine() for consistent paper-cutout aesthetic

**src/lib/ — Cross-Layer Shared Utilities**
- Purpose: Sign editing, material/decoration systems, share generation (Astro + game)
- Contains: 5 files
- Structure:
  - `signEditor.ts`: Wrapper around Fabric.js canvas (mounted in DOM overlay)
  - `signMaterials.ts`: Generate Fabric.js textures for material swatches
  - `signDecorations.ts`: Emoji/decoration definitions, category system (stickers, tape)
  - `ShareCardGenerator.ts`: Generate shareable PNG from game stats (Canvas API)
  - `ShareService.ts`: Utility for exporting/downloading share cards

**src/layouts/Layout.astro — Astro Page Wrapper**
- Purpose: Shared HTML structure for all pages (head, styles, body)
- Contains: Layout component, global styles
- Key: Imports Google Fonts (Bangers, Patrick Hand), sets meta tags

**src/pages/ — Astro Pages**
- Purpose: Site routing via Astro file-based routing
- Contains: 2 Astro components
- Structure:
  - `index.astro`: Landing page (hero, how-it-works, CTA to /play)
  - `play.astro`: Game container page, imports bootGame() from game/main.ts

**src/styles/ — Global CSS**
- Purpose: Global styles, CSS variables, utility classes
- Contains: CSS modules or global stylesheet

## Key File Locations

**Entry Points:**
- `src/game/main.ts`: bootGame() function, called from Astro play.astro
- `src/pages/play.astro`: Game container, loads bootGame via client script
- `src/pages/index.astro`: Landing page with hero and navigation

**Configuration:**
- `astro.config.mjs`: Astro + Cloudflare adapter, Phaser chunking optimization
- `tsconfig.json`: TypeScript strict mode
- `package.json`: Dependencies (phaser, astro, tone, fabric, canvas)

**Core Logic:**
- `src/game/scenes/IntersectionScene.ts`: Main game orchestrator, system initialization
- `src/game/systems/GameStateManager.ts`: State persistence
- `src/game/managers/TrafficManager.ts`: Car spawning and lifecycle

**Testing:**
- No test files present in codebase

## Naming Conventions

**Files:**
- Scene files: PascalCase + "Scene" suffix (BootScene.ts, SignCraftScene.ts)
- System files: PascalCase + "System" suffix (GameStateManager.ts, AudioSystem.ts, etc.)
- Manager files: PascalCase + "Manager" suffix (TrafficManager.ts, PlayerController.ts)
- Entity files: PascalCase (Car.ts, Player.ts, VisibilityCone.ts)
- Config files: camelCase + "Config" suffix (gameConfig.ts, signConfig.ts)
- Utility files: camelCase (paperArt.ts, signEditor.ts)

**Directories:**
- Functional layer groups: lowercase plural (scenes/, systems/, managers/, entities/, config/, utils/)
- Astro special dirs: lowercase (pages/, layouts/, styles/)

**TypeScript Types & Interfaces:**
- Types: PascalCase (CarType, SignMaterial, GameState, IntersectionMapConfig)
- Constants: UPPER_SNAKE_CASE (VEHICLE_DEFS, SIGN_MATERIALS, PALETTE, SCALE_FACTOR)

**Variables & Functions:**
- Functions: camelCase (bootGame, createGameConfig, updateSpawning, drawScissorCutRect)
- Class methods: camelCase (create, update, setupInput, recordReaction)
- Private members: camelCase with leading underscore (\_cars, \_scene, \_config)
- Game object properties: camelCase (score, confidence, armFatigue, isRaised)

## Where to Add New Code

**New Feature (Game Mechanic):**
- Logic: Create system class in `src/game/systems/` extending Phaser.Events.EventEmitter
- Rendering: If visual, add to appropriate manager in `src/game/managers/` or create new manager
- Configuration: Add config object to existing or new file in `src/game/config/`
- Integration: Wire into IntersectionScene.create() and update() loops

**New Component/Module (Utility):**
- Game-specific utility: `src/game/utils/`
- Cross-layer utility (used by game + site): `src/lib/`
- Astro component: `src/layouts/` or inline in `src/pages/`

**New Sign Material or Reaction Type:**
- Material: Add to SIGN_MATERIALS array in `src/game/config/signConfig.ts`
- Reaction: Add to REACTION_TYPE config in `src/game/config/reactionConfig.ts`

**New Car Type:**
- Add to CarType union type and VEHICLE_DEFS record in `src/game/entities/Car.ts`
- Add weight to CAR_TYPE_WEIGHTS in same file

**Styling:**
- Page-level styles: Inline in Astro files (src/pages/*.astro)
- Global styles: `src/styles/`
- Game UI (buttons, HUD): CSS-in-JS via Phaser text/graphics in manager classes

**New Scene:**
- Create class extending Phaser.Scene in `src/game/scenes/SceneName.ts`
- Add to scene list in `src/game/config/gameConfig.ts` createGameConfig() function
- Wire transitions via this.scene.start('SceneName') in other scenes

## Special Directories

**dist/ (Build Output)**
- Purpose: Generated by `npm run build`, deployed to Cloudflare
- Generated: Yes
- Committed: No (in .gitignore)
- Contents: Static HTML, JS chunks (including phaser chunk), assets

**.planning/ (GSD Analysis)**
- Purpose: Strategic planning docs, phase designs, quick tasks, research
- Generated: Yes (by GSD commands)
- Committed: Yes
- Subdirs: codebase/ (you are reading this), phases/, plans/, quick/, research/

**mockups/ (Design Reference)**
- Purpose: SVG mockup of paper-mario-style vehicles for artist reference
- Generated: No
- Committed: Yes
- File: paper-mario-style.html (Section 2 contains VEHICLE_DEFS reference dimensions)

**public/ (Static Assets)**
- Purpose: Favicon, any static images
- Generated: No
- Committed: Yes
- Note: Fonts (Bangers, Patrick Hand) loaded from Google Fonts CDN, not local files

---

*Structure analysis: 2026-02-15*
