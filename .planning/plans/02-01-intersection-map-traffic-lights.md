# Plan 02-01: Intersection Map Rendering + Traffic Light System

**Phase:** 2 — Core Game Loop
**Requirements:** GAME-01, GAME-05, GAME-06, GAME-10
**Estimated effort:** Large
**Created:** 2026-02-14

## Goal

Top-down intersection map renders with four-way roads and traffic lights. Traffic lights cycle in a deterministic, learnable pattern. Cars spawn from green-light directions. The viewport uses EXPAND mode per architecture notes.

## Steps

### 1. Switch Phaser scaling from FIT to EXPAND
- Update gameConfig.ts: `mode: Phaser.Scale.EXPAND`
- Set min dimensions: 720x1280
- World size: 1920x1280
- Camera shows what fits, centered on intersection

### 2. Create GameStateManager (shared state singleton)
- Central GameState interface: score, time, reactions tally
- EventEmitter-based: systems emit/listen for state changes
- Registered in Phaser registry for cross-scene access

### 3. Create DifficultyConfig system
- Config object with multipliers for traffic speed, density, light cycle, reaction ratios
- Medium difficulty as default
- Systems read config values, never know about difficulty tiers

### 4. Create IntersectionScene (replaces placeholder GameScene)
- Top-down 4-way intersection with 2 lanes per direction
- Road rendering: gray roads with lane markings, sidewalks
- Intersection center with crosswalks
- All procedural graphics (no external assets)

### 5. Create TrafficLightSystem (data-driven)
- Light cycle config: ~30 second full rotation
- 4 phases: N/S green, all red, E/W green, all red
- Visual traffic lights at each corner of intersection
- Deterministic, repeating, learnable pattern
- Emits events on phase changes

### 6. Create car entity system
- Car as reusable entity class with position, speed, direction, lane
- Procedural car graphics (colored rectangles with details)
- Car pool for performance (reuse car objects)

### 7. Create car spawning system
- Cars spawn from green-light directions
- Spawn rate from config (varied slightly per car)
- Cars drive through intersection and despawn off-screen
- Multiple lanes with proper spacing

### 8. Wire BootScene to IntersectionScene
- Update scene flow: Boot -> Intersection
- Session timer starts on scene create

## Success Criteria

- [ ] Viewport uses EXPAND mode, no letterboxing
- [ ] Top-down intersection visible with roads, lanes, sidewalks
- [ ] Traffic lights visible and cycling through 4 phases
- [ ] Cars spawn from green-light directions and drive through
- [ ] Cars stop at red lights (queue up)
- [ ] GameStateManager exists as shared state
- [ ] DifficultyConfig controls traffic tuning values

## Architecture Decisions

- EXPAND mode per ARCHITECTURE-NOTES.md (not FIT)
- Traffic system is config-driven (same engine, different configs for future maps)
- GameStateManager is event-driven (Pattern 2 from research)
- Car entities are reusable (entity system, not per-feature hacks)
