---
phase: 09-visual-ui-polish
plan: 02
status: done
---

## What was done

Rewrote `src/game/entities/Car.ts` to render paper cutout car shapes instead of plain rectangles.

### Car type system
- 4 distinct car types: sedan (45%), SUV (25%), pickup (20%), liftedTruck (10%)
- Weighted random selection via `pickWeightedCarType()`
- Each type has a unique polygon silhouette defined as clockwise vertex points
- `CarType` exported as a public type; `carType` exposed as a public property on Car instances

### Paper cutout rendering
- Imports `drawPaperShadow` and `drawScissorCutPolygon` from `paperArt.ts`
- Imports `PALETTE` and `CAR_PAPER_COLORS` from `paletteConfig.ts`
- Hard-offset drop shadow under each car via `drawPaperShadow()`
- Scissor-cut body polygon via `drawScissorCutPolygon()` with wobbly edges
- Windshield and rear window rendered as translucent blue rectangles
- Wheels as dark rounded rectangles at four corners
- SUV gets roof rack lines; lifted truck gets bull bar and smoke stack nubs
- Pickup and lifted truck get distinct bed areas with separate fill color
- Final marker-black outline re-stroke of the full body silhouette

### Emoji face drivers
- Random emoji face from ['😐','😊','😤','😠','🙂','😑'] centered on cabin/windshield area
- Font size randomized 14-16px per car
- Face updates via `setReactionFace()` when car receives a reaction (positive/negative/neutral)
- New face picked on car reset

### Coal roller smoke puffs (lifted truck only)
- `emitSmokePuff()` creates 2-3 gray paper cutout circles (PALETTE.shadowDark at 0.3 alpha, 8-12px)
- Puffs spawn behind the truck in world coordinates
- Animated via Phaser tweens: drift backward + float up + fade out over 800ms
- Auto-destroyed after animation completes
- Emitted every ~500ms in `update()` for liftedTruck type only

### Wind catch animation
- `triggerWindCatch()` applies a 5-degree tilt-and-back tween (150ms, yoyo, Sine.easeInOut)
- Fires once per car pass (flag reset on `resetCar()`)
- Exposed as public method for external calling from proximity/reaction system

### Preserved game logic
- All existing public properties: direction, lane, speed, hasBeenReached, hasPassed, isStopped
- All existing methods: update(), isOffScreen(), shouldStop(), isPastStopLine(), resetCar(), getBounds()
- Movement logic unchanged
- Traffic stop logic unchanged
- Object pool reset re-rolls car type, color, and emoji face

## Files modified
- `src/game/entities/Car.ts` — full rewrite

## Verification
- `npx tsc --noEmit` passes with zero errors
- `npm run build` succeeds (verified with Car.ts as the only game entity change)
- Car.ts imports from `paperArt.ts` (drawPaperShadow, drawScissorCutPolygon)
- Car.ts imports from `paletteConfig.ts` (PALETTE, CAR_PAPER_COLORS)
- CarType exported and accessible as public property
- 4 distinct car types with unique polygon silhouettes
- Lifted trucks correlate with higher negative reaction probability (accessible via carType property)
