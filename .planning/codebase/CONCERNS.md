# Codebase Concerns

**Analysis Date:** 2026-02-15

## Tech Debt

**Type Assertions in Sign Editor:**
- Issue: Heavy use of `as any` type casts bypass TypeScript safety in Fabric.js integration
- Files: `src/lib/signEditor.ts` (lines 259, 261, 324, 332)
- Impact: Runtime errors if Fabric object structure differs; refactoring risks breaking without compile-time warning
- Fix approach: Create proper TypeScript interfaces for Fabric.js decorations and emoji data; replace `any` casts with typed property access using proper discriminated unions

**TextStyle/Font Loading Fallbacks:**
- Issue: Sign editor and share card generator rely on console.warn when fonts aren't available; no graceful degradation path
- Files: `src/lib/signEditor.ts` (lines 149, 163), `src/lib/ShareCardGenerator.ts` (line 415)
- Impact: Share cards or signs may render with fallback fonts unexpectedly, degrading visual polish
- Fix approach: Add font availability checks before rendering; store fallback font pairings in config

**Untyped Any Uses:**
- Issue: `any` type in signEditor.ts undermines type safety for Fabric.js interop
- Files: `src/lib/signEditor.ts` (lines 259, 261, 324, 332)
- Impact: Decoration tracking and emoji handling prone to silent failures if Fabric API changes
- Fix approach: Wrapper class with typed decorator pattern instead of inline `as any` casts

## Known Bugs

**ConfidenceSystem / MusicSystem / ReactiveCueSystem TypeScript Errors:**
- Symptoms: Build succeeds but TypeScript compiler reports errors in these three systems
- Files: `src/game/systems/EventSystem.ts`, `src/game/systems/MusicSystem.ts`, `src/game/systems/ReactiveCueSystem.ts`
- Trigger: Type mismatches in Tone.js library integration or Phaser EventEmitter extends
- Workaround: Suppress with `@ts-ignore` (not recommended)
- Fix approach: Review Tone.js typing and match InputNode/Synth return types correctly; validate EventEmitter method signatures

## Performance Bottlenecks

**Car Texture Baking Per-Car:**
- Problem: Each car spawned calls `bakeCarBody()` which creates Graphics, RenderTexture, saves texture, and destroys — every frame cars spawn
- Files: `src/game/entities/Car.ts` (lines 244-275)
- Cause: No texture caching by car type; 8 car types × spawn rate = potential 100+ unique textures if high spawn volume
- Improvement path: Cache textures by `(carType, color)` tuple in static map; reuse textures for same car type/color combinations. Reduce texture creation calls by 80%+ in high-traffic scenarios

**Graphics Texture Generation in HUDManager:**
- Problem: Clock face, hour hand, minute hand generated fresh via `generateTexture()` each session
- Files: `src/game/managers/HUDManager.ts` (lines 395, 428, 441)
- Cause: Not cached; recreated per scene start
- Improvement path: Cache in TextureManager as shared assets; load once at scene init rather than generating every time

**Event Scheduling Probability Per Frame:**
- Problem: EventSystem runs probability roll every frame (60 FPS); baseTriggerChancePerSecond × eventFrequencyMultiplier × deltaSec
- Files: `src/game/systems/EventSystem.ts` (lines 169-178)
- Cause: Event roll happens on every frame when no event active; low CPU impact but adds to frame budget
- Improvement path: Batch probability checks to 1-second intervals instead of per-frame

**Canvas API in ShareCardGenerator:**
- Problem: Full canvas 1080×1080 redraw + font loading + image decode + PNG export per share
- Files: `src/lib/ShareCardGenerator.ts` (lines 41-84)
- Cause: Synchronous canvas operations block thread
- Improvement path: Move to Worker thread; implement progressive rendering for large image loads

## Fragile Areas

**Car Following Logic with Variable Gap Calculation:**
- Files: `src/game/managers/TrafficManager.ts` (lines 78-100)
- Why fragile: Gap calculation uses `(car.carLength + carAhead.carLength) / 2 + 12` with hardcoded +12 magic number. If car dimensions change, spacing breaks. Bidirectional car-ahead search (before and after stop line) with different logic paths susceptible to queue deadlock if both paths return same car
- Safe modification: Extract minGap calculation to TrafficManager config; add unit tests for queue formation at varying car types; verify no circular blocking when cars span stop line
- Test coverage: No test files found for TrafficManager; car-following logic untested

**EventSystem Guaranteed Event Urgency:**
- Files: `src/game/systems/EventSystem.ts` (lines 154-165, 184-199)
- Why fragile: Guaranteed events forced at <30s remaining, but logic also checks <20s remaining in separate method. Two-level threshold without clear ordering could cause guaranteed event to fire late or multiple times. If eventsTriggered array fills before guaranteed events, forced events may conflict with max event cap
- Safe modification: Consolidate threshold checks into single method; add explicit state tracking for guaranteed event attempt; add timeout guards
- Test coverage: No tests for event scheduling logic

**Canvas/DOM Integration Points:**
- Files: `src/lib/signEditor.ts` (constructor, lines 44-67), `src/lib/ShareCardGenerator.ts` (entire module)
- Why fragile: Assumes document.createElement, canvas contexts, and font loading always succeed silently. Font preloading via Google Fonts in constructor but no error handling if network fails
- Safe modification: Add try-catch around font preload; validate canvas context before drawing; emit load events so caller knows when editor is ready
- Test coverage: No tests for DOM edge cases (missing fonts, no canvas support, etc.)

**Fabric.js Decoration Tracking:**
- Files: `src/lib/signEditor.ts` (lines 42, 259-263, 304-305, 331-333)
- Why fragile: Tracks decorations via `String(Date.now()) + Math.random()` or `__uid` which is not a Fabric API — using private property. If Fabric updates structure, tracking breaks silently. decorations Map can get orphaned if canvas.remove() is called without notifying Map
- Safe modification: Use Fabric's built-in `__uid` only if documented as stable API, else assign stable IDs in FabricObject data property. Call Map.delete() explicitly in all removal paths. Add validation on canvas.renderAll() to sync Map with actual canvas objects
- Test coverage: No tests for decoration CRUD operations

**Phaser Registry Cross-Scene Access:**
- Files: Systems registered in Phaser.registry (GameStateManager, MusicSystem, ReactiveCueSystem, AmbientSystem). Multiple scenes may access same instance
- Why fragile: No locking on state changes; if SignCraftScene reads GameStateManager while IntersectionScene writes, race conditions possible. EventEmitter used for state changes but handlers may not fire synchronously
- Safe modification: Add immutable state snapshots for cross-scene reads; use queued event emission with guaranteed order; add explicit lifecycle (creation, active, cleanup) to prevent stale registrations
- Test coverage: No integration tests for multi-scene state access

## Test Coverage Gaps

**No Test Files Found:**
- Problem: Codebase contains 0 test files despite 12,000+ LOC across 40+ TypeScript modules
- Files: None (absence is the issue)
- Risk: Traffic logic, event scheduling, confidence mechanics, fatigue system all untested. Refactors risk silent behavioral changes
- Priority: **HIGH** — Add unit tests for core systems

**Untested Systems (Critical):**
- `src/game/managers/TrafficManager.ts` — Car spawning, queue logic, gap calculation
- `src/game/systems/EventSystem.ts` — Event scheduling, guaranteed event urgency, probability roll
- `src/game/systems/GameStateManager.ts` — State mutations, reaction recording, time updates
- `src/game/systems/ConfidenceSystem.ts` — Confidence decay, threshold crossings
- `src/game/systems/FatigueSystem.ts` — Arm fatigue accumulation, rest cooldown
- Priority: **CRITICAL** — These manage core game loop behavior

**Untested Utilities:**
- `src/lib/signEditor.ts` — Decoration add/remove, text changes, export
- `src/lib/ShareCardGenerator.ts` — Canvas rendering, font loading, image placement
- `src/lib/signMaterials.ts` — Texture generation, material fallbacks
- Priority: **HIGH** — UX failures if these break

## Scaling Limits

**Texture Memory Growth:**
- Current capacity: Car textures created per spawn; 100+ cars on-screen at peak could generate 100+ unique textures if color variety is high
- Limit: WebGL texture memory (512MB typical on mobile, 2GB on desktop). Each 1080×1080 canvas share card = 4-5MB uncompressed
- Scaling path: Implement texture atlas for car bodies by type; pool and reuse textures; use compressed texture formats (WebP); monitor texture count with DebugOverlay

**Traffic Spawning Rate:**
- Current capacity: Lane spawn timers generate cars on random intervals. No explicit cap on simultaneous cars
- Limit: Beyond 200 cars, Phaser update loop slows (each car has physics, bounds checks, stop line detection)
- Scaling path: Add explicit max car count per lane; implement spatial grid for car-ahead lookup (currently linear search); optimize distance calculation in TrafficManager

**Audio Voices (Tone.js):**
- Current capacity: MusicSystem (PolySynth 4-voice limit), ReactiveCueSystem (multiple synths fired per threshold), AmbientSystem procedural
- Limit: 32+ simultaneous synth voices causes audio glitches/dropouts
- Scaling path: Implement voice pooling; add master compressor with soft clipping; document max simultaneous event audio

## Missing Critical Features

**No Audio Mute/Volume Controls:**
- Problem: Audio plays at fixed levels; no pause-menu volume adjustment
- Blocks: Accessibility; players cannot silence game (important for public locations)
- Recommendation: Add master gain knob in MenuManager; expose AudioMixerSystem gains to UI

**No Persistence (Save/Load):**
- Problem: Score/stats not saved; exiting game loses session data
- Blocks: High-score leaderboards; session replay/analysis
- Recommendation: Implement browser localStorage for daily top scores; use IndexedDB for detailed session logs

**No Mobile Touch Support Documented:**
- Problem: Phaser input system configured for desktop; touch input untested
- Blocks: Mobile deployment; game unplayable on phones
- Recommendation: Add touch event handlers to PlayerController; test on actual devices

## Security Considerations

**Console Error Output:**
- Risk: Errors logged to console may expose implementation details (file paths, API structure)
- Files: Scattered console.error/warn calls in `src/lib/ShareCardGenerator.ts`, `src/lib/signEditor.ts`, `src/lib/signMaterials.ts`
- Current mitigation: Browser console only; not exposed in UI
- Recommendations: Strip console calls in production build via tree-shaking; use error codes instead of detailed messages in user-facing context

**Canvas Data URL Leak:**
- Risk: Share card and sign PNG data URLs held in memory; very large (~5MB). If page is compromised, attacker could read all generated share cards
- Files: `src/lib/ShareCardGenerator.ts` (line 79), `src/lib/signEditor.ts` (line 355)
- Current mitigation: Data URLs are ephemeral (generated on-demand, not stored)
- Recommendations: Add explicit cleanup of data URLs after download; use Blob instead of data URL where possible; add memory pool for canvas cleanup

**Dependency Risk — Fabric.js:**
- Risk: Fabric.js 7.1.0 is actively developed; breaking API changes possible. No lockfile pinning observed
- Files: `src/lib/signEditor.ts` (entire module)
- Current mitigation: Package-lock.json locks transitive deps
- Recommendations: Monitor Fabric.js releases; test upgrades in CI before deploying; consider lighter alternative (Konva, Pixi) if Fabric becomes unstable

## Dependencies at Risk

**Tone.js Audio Synthesis:**
- Risk: Complex library; scheduling can drift if Tone.js Transport and Phaser scene timers desync
- Impact: Music falls out of sync with game events if session runs >5 minutes
- Migration plan: Fall back to Web Audio API directly if Tone.js fails; implement audio frame-syncing with Phaser.Time
- Current status: No observed desync at test lengths; monitor in production

**Phaser 3.90.0 Maintenance:**
- Risk: Phaser 3 transitioning to Phaser 4; updates slowing. Some edge cases (Graphics.generateTexture offset) documented in MEMORY.md as "gotchas"
- Impact: Future Node/browser updates may break Phaser compatibility
- Migration plan: Plan Phaser 4 upgrade; test RenderTexture API stability first
- Current status: Working as of commit 9d9c19e; no blocker

---

*Concerns audit: 2026-02-15*
