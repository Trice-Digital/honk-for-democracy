# Coding Conventions

**Analysis Date:** 2026-02-15

## Naming Patterns

**Files:**
- PascalCase for class/entity files: `Car.ts`, `Player.ts`, `GameStateManager.ts`
- camelCase for config files: `gameConfig.ts`, `scoreConfig.ts`, `paletteConfig.ts`
- camelCase for utility/helper files: `paperArt.ts`, `signMaterials.ts`
- All TypeScript files in `src/` directory structure by feature domain

**Functions:**
- camelCase for all functions: `pickWeightedCarType()`, `getScoreGrade()`, `updateSpawning()`
- Private methods prefixed with underscore convention not used; instead use `private` keyword
- Public utility functions exported directly from modules
- Descriptive names reflecting action or computation: `findCarAhead()`, `getDistanceBetweenCars()`, `drawPaperShadow()`

**Variables:**
- camelCase for local variables and properties: `carLength`, `spawnTimers`, `currentFatigue`
- SCREAMING_SNAKE_CASE for constants: `PASSENGER_CHANCE`, `SMOKE_PUFF_INTERVAL_MS`, `OFFSCREEN_MARGIN`
- Single-letter variables limited to loop counters: `i`, `t`, `r` (random)
- Descriptive names for booleans: `isGreen`, `isPastStopLine()`, `isStopped`, `isSessionActive`

**Types:**
- PascalCase for interfaces and type aliases: `VehicleDef`, `ResourceLink`, `DecorationDef`, `GameState`
- Discriminant unions for tagged types: `CarType` uses literal union `'sedan' | 'suv' | ...`
- Generic parameters use single uppercase letters: `Record<CarType, VehicleDef>`

**Classes:**
- PascalCase for all class names: `Player`, `Car`, `TrafficManager`, `GameStateManager`
- Phaser.GameObjects subclasses extend parent in constructor
- Private fields declared with `private` keyword at class level

## Code Style

**Formatting:**
- No explicit eslint or prettier configuration detected
- 2-space indentation observed consistently
- Line breaks used for visual organization and readability
- Import statements grouped but not strictly ordered by source type
- Semicolons used consistently at statement end

**Linting:**
- TypeScript strict mode enabled (via `astro/tsconfigs/strict` in tsconfig.json)
- No eslintrc file present; rely on TypeScript compiler errors
- Comments reference potential TS issues: "Pre-existing TS errors in EventSystem.ts, MusicSystem.ts, ReactiveCueSystem.ts"

**Comments Style:**
- Block comments with dashes for section headers:
  ```typescript
  // ---------------------------------------------------------------------------
  // Car type system
  // ---------------------------------------------------------------------------
  ```
- Inline JSDoc-style comments for magic numbers:
  ```typescript
  /** Milliseconds between coal roller smoke puff emissions. */
  const SMOKE_PUFF_INTERVAL_MS = 500;
  ```
- Rationale comments explain design decisions:
  ```typescript
  // Emoji faces at front-left (-20% width), passenger at front-right (+20% width)
  ```

## Import Organization

**Order:**
1. Phaser main import: `import Phaser from 'phaser';`
2. Local type imports: `import type { ... } from '../path'`
3. Local value imports: `import { ... } from '../path'`

**Examples from codebase:**
```typescript
// From Car.ts
import Phaser from 'phaser';
import type { TrafficDirection, LaneDefinition } from '../config/intersectionConfig';
import { PALETTE, CAR_PAPER_COLORS } from '../config/paletteConfig';
import { drawPaperShadow, drawScissorCutPolygon } from '../utils/paperArt';
```

```typescript
// From IntersectionScene.ts
import Phaser from 'phaser';
import { INTERSECTION_CONFIG } from '../config/intersectionConfig';
import { DIFFICULTY_MEDIUM } from '../config/difficultyConfig';
import { getSignData, type SignData } from '../config/signConfig';
// ... more imports in logical groups
```

**Path Aliases:**
- No path aliases configured; all imports use relative paths (`../`, `./`)
- Paths reference domain: `../config/`, `../entities/`, `../managers/`, `../systems/`, `../utils/`

## Error Handling

**Patterns:**
- Try-catch used selectively for Web Audio API initialization:
  ```typescript
  // From AudioSystem.ts
  try {
    // Web Audio context initialization
  } catch (err) {
    console.warn('[HFD] Web Audio API not available');
  }
  ```
- Try-catch for promise-based operations:
  ```typescript
  // From ScoreScene.ts
  try {
    this.shareCardDataUrl = await generateShareCard({...});
  } catch (err) {
    console.error('[ScoreScene] Share card generation failed:', err);
  }
  ```

**Validation:**
- Config validators issue warnings for out-of-range values:
  ```typescript
  // From ConfidenceSystem.ts
  if (this.config.startingConfidence < this.config.min || ...) {
    console.warn(`[HFD] ConfidenceSystem: startingConfidence outside min/max`);
  }
  ```
- Assumes valid configuration; does not throw on invalid state
- No explicit guards for null/undefined; relies on TypeScript compiler

## Logging

**Framework:** `console` object directly; no logging library

**Patterns:**
- Prefixed log messages with domain: `[HFD]`, `[SignCraftScene]`, `[ScoreScene]`
- Log levels:
  - `console.log()`: Informational, scene initialization, game events
  - `console.warn()`: Configuration validation, degraded behavior
  - `console.error()`: Promise failures, critical operations

**Examples:**
```typescript
// Scene initialization
console.log('[HFD] IntersectionScene created. Manager-based architecture active.');
console.log('[HFD] SignCraftScene created. Fabric.js sign editor mounted.');

// Event triggers
console.log(`[HFD] Event triggered: ${type} at ${this.lastEventTime.toFixed(1)}s`);
console.log(`[HFD] Weather: Rain started. Duration: ${duration}s`);

// Configuration warnings
console.warn('[HFD] FatigueSystem: baseDrainRate should be positive');
```

## Comments

**When to Comment:**
- Magic numbers always commented: `/** Pixels beyond world bounds before recyclable */`
- Complex algorithms documented: scissor-cut edge wobbling, car-following logic
- Design rationale for non-obvious choices: why certain values were selected
- State machine transitions and conditions
- Do NOT comment obvious code: `const x = 5; // set x to 5` (avoid)

**JSDoc/TSDoc:**
- Used for class descriptions and public methods
- Block comment format for class-level documentation:
  ```typescript
  /**
   * Player entity — Paper cutout protester (top-down).
   *
   * Phase 9-04 visual overhaul: Construction paper person with head, body,
   * arms (one holding sign), legs, popsicle stick sign mount, scissor-cut
   * outline, hard-offset shadow, marker outlines.
   *
   * Fatigue visuals: arm crease at 70%+, arm droop at 85%+.
   * Idle wobble: 0.5 degree sine wobble on container.
   */
  ```
- Method-level JSDoc for parameters and return values (selective, not comprehensive)

## Function Design

**Size:**
- Target 30-100 lines per method
- Large scenes split into manager classes (`TrafficManager`, `HUDManager`, `IntersectionRenderer`)
- Drawing functions kept simple, focused on single graphics operation

**Parameters:**
- Maximum 5-6 parameters before grouping into object literal
- Default parameters used for optional styling:
  ```typescript
  export function drawPaperShadow(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    offsetX: number = PALETTE.shadowOffsetX,
    offsetY: number = PALETTE.shadowOffsetY,
  ): void
  ```
- Destructuring used for configuration objects in constructor parameters:
  ```typescript
  constructor(
    private scene: Phaser.Scene,
    private config: IntersectionMapConfig,
    private difficulty: DifficultyConfig,
    private trafficLights: TrafficLightSystem,
    private gameState: GameStateManager,
  ) {}
  ```

**Return Values:**
- Explicit return type annotations on all public methods: `: void`, `: CarType`, `: Promise<void>`
- Return early pattern for guard clauses:
  ```typescript
  if (!car.active) continue;
  if (r <= cumulative) return entry.type;
  ```
- No implicit undefined returns; use `: void` explicitly

## Module Design

**Exports:**
- Named exports for classes, functions, types: `export class Car`, `export function getScoreGrade`
- Config exports expose constants and types: `export const SCORE_GRADES`, `export interface ScoreGrade`
- Barrel files NOT used; imports always reference specific files

**Module Patterns:**
- Managers and Systems extend Phaser.Events.EventEmitter for change notification
- Singletons registered via Phaser registry: `GameStateManager.register()`, `AudioSystem.get()`
- Entities (Car, Player) are Phaser.GameObjects subclasses
- Utility functions grouped by domain in single files: `paperArt.ts` has all drawing utils

## Async/Promise Patterns

**Async Functions:**
- Limited use; only for Web Audio startup and share card generation
- Declared with `async` keyword and return `Promise<T>`:
  ```typescript
  async init(): Promise<void> {
    await Tone.start();
  }
  ```
- Await used selectively where needed:
  ```typescript
  this.shareCardDataUrl = await generateShareCard({...});
  ```

**State Access:**
- GameStateManager uses getters for read access: `getElapsed()`, `getConfidence()`, `getFullState()`
- Systems subscribe to state changes via EventEmitter: `.on('change', handler)`

---

*Convention analysis: 2026-02-15*
