---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/entities/Car.ts
autonomous: true
must_haves:
  truths:
    - "Cars appear as large paper cutout toys filling most of their lane width"
    - "Cars face their direction of travel (north=up, south=down, east=right, west=left)"
    - "Driver emoji sits in the front-left seat position (US left-hand drive)"
    - "~30% of cars have a passenger emoji in the front-right seat"
    - "Cars still wobble gently as paper cutouts while maintaining correct base rotation"
  artifacts:
    - path: "src/game/entities/Car.ts"
      provides: "Scaled car rendering with rotation, driver placement, and passengers"
      contains: "SCALE_FACTOR"
  key_links:
    - from: "src/game/entities/Car.ts"
      to: "src/game/managers/TrafficManager.ts"
      via: "Car constructor and resetCar API unchanged"
      pattern: "new Car|resetCar"
---

<objective>
Fix car rendering in Car.ts: scale up dimensions, add direction-based rotation, position driver emoji at driver seat, and add random passengers.

Purpose: Cars currently appear as tiny unrotated dots with centered emoji. They need to look like paper cutout toy cars that fill their lanes, face the right direction, and have properly placed occupants.
Output: Updated Car.ts with all four fixes applied.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/game/entities/Car.ts
@src/game/config/intersectionConfig.ts
@src/game/managers/TrafficManager.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scale up car dimensions and add direction rotation</name>
  <files>src/game/entities/Car.ts</files>
  <action>
  Two changes in Car.ts:

  **1. Scale up VEHICLE_DEFS by ~2x.**

  Lane width is 80px. Cars should fill ~70-85% of lane width. Apply a scale factor to all VEHICLE_DEFS dimensions. Add a constant `const SCALE_FACTOR = 2.0;` near the top and multiply all width/height/faceY/faceSize values in VEHICLE_DEFS by it. Resulting sedan should be ~60w x 100h, SUV ~68w x 112h, compact ~48w x 76h, etc. The `faceY` values scale proportionally. `faceSize` values should increase but cap reasonably (scale by ~1.5x instead of 2x so emoji don't overwhelm the car body).

  Updated VEHICLE_DEFS (pre-computed, no runtime multiplication needed):
  ```
  sedan:       { width: 60, height: 100, faceY: -32, faceSize: 20 }
  suv:         { width: 68, height: 112, faceY: -36, faceSize: 20 }
  compact:     { width: 48, height: 76,  faceY: -22, faceSize: 18 }
  pickup:      { width: 60, height: 116, faceY: -40, faceSize: 20 }
  truck:       { width: 56, height: 156, faceY: -60, faceSize: 18 }
  coalRoller:  { width: 68, height: 112, faceY: -36, faceSize: 20 }
  motorcycle:  { width: 28, height: 60,  faceY: -8,  faceSize: 16 }
  bicycle:     { width: 20, height: 52,  faceY: -4,  faceSize: 15 }
  ```

  All the draw methods (drawSedan, drawSUV, etc.) use hardcoded coordinates that match the OLD dimensions. Rather than rewriting every draw method, scale the Graphics object before drawing. In `bakeCarBody()`, after creating `tempG`, call `tempG.setScale(SCALE_FACTOR)` and adjust the texture generation dimensions to use `def.width + pad * 2` and `def.height + pad * 2` (which now use the new larger def values). The draw methods will draw at their original small coordinates but the scale on the graphics will enlarge them. Actually — `generateTexture` captures the graphics at its rendered size, so scaling the graphics before generating should work. BUT if `setScale` doesn't affect `generateTexture` capture area, instead use a different approach:

  Simpler approach: Keep the draw methods as-is with their original coordinate systems. In `bakeCarBody()`, draw at original coordinates, generate texture at original size, then scale the resulting `carBodyImage` via `this.carBodyImage.setScale(SCALE_FACTOR)`. This cleanly separates drawing from display size.

  So: keep VEHICLE_DEFS with ORIGINAL dimensions for the draw functions, but add DISPLAY dimensions that are 2x. Or even simpler — just scale the carBodyImage after creation:

  ```typescript
  const SCALE_FACTOR = 2.0;
  ```

  In `bakeCarBody()`, after `this.carBodyImage = this.scene.add.image(0, 0, texKey);`:
  ```typescript
  this.carBodyImage.setScale(SCALE_FACTOR);
  ```

  Keep VEHICLE_DEFS dimensions as-is for draw methods. But update `faceY` and `faceSize` to account for the scaled display:
  - Multiply `faceY` by SCALE_FACTOR in the emoji positioning (not in VEHICLE_DEFS itself)
  - Multiply `faceSize` by ~1.5 in the emoji creation

  Update `carWidth` and `carLength` assignments in constructor and `resetCar()` to multiply by SCALE_FACTOR:
  ```typescript
  this.carWidth = (isVertical ? def.width : def.height) * SCALE_FACTOR;
  this.carLength = (isVertical ? def.height : def.width) * SCALE_FACTOR;
  ```

  This ensures collision bounds (getBounds) and stop-line logic use the displayed size. Also update `getBounds()` similarly — it reads from VEHICLE_DEFS directly, so multiply there too.

  **2. Add direction-based rotation.**

  The car body is drawn assuming northbound (front = -y). For other directions, rotate the container.

  Add a private method `getBaseRotation(): number` that returns degrees:
  - north: 0
  - south: 180
  - east: 90
  - west: -90 (or 270)

  In constructor, after `bakeCarBody()` and emoji setup, call `this.setAngle(this.getBaseRotation())`.

  In `resetCar()`, after all setup, call `this.setAngle(this.getBaseRotation())`.

  CRITICAL: The `update()` method currently sets `this.setAngle(wobble)` which overwrites rotation every frame. Change this to store `baseRotation` as a private field set in constructor/resetCar, then in update:
  ```typescript
  this.setAngle(this.baseRotation + wobble);
  ```

  Also in `triggerWindCatch()`, the tween targets `angle` — update to tween relative to baseRotation:
  ```typescript
  angle: this.baseRotation + (this.carType === 'bicycle' || this.carType === 'motorcycle' ? 8 : 5),
  ```

  Since the container is rotated, remove the width/height swap logic in constructor and resetCar. The container rotation handles visual orientation. But `carWidth`/`carLength` are used for stop-line and collision logic which operates in world space, so KEEP the swap for those — they represent the world-space footprint. Similarly, `getBounds()` swaps based on direction — keep that too.

  Remove the smoke puff direction-based spawn offset complexity ONLY if container rotation already handles it. Actually, smoke puffs are spawned in world space (using `this.x`/`this.y`), not relative to the container, so those direction switches in `emitSmokePuff()` must remain as-is.
  </action>
  <verify>
  Run `npx tsc --noEmit` to confirm no type errors. Visually: cars should appear ~2x larger filling most of their lane width, and face the correct travel direction. The wobble animation should oscillate around the travel direction, not around 0 degrees.
  </verify>
  <done>Cars render at approximately 2x their previous size, filling ~70-85% of lane width. Each car faces its direction of travel. Wobble oscillates around the base rotation angle.</done>
</task>

<task type="auto">
  <name>Task 2: Position driver emoji at driver seat and add random passengers</name>
  <files>src/game/entities/Car.ts</files>
  <action>
  All changes in Car.ts. Since the car body is drawn north-facing (front = -y) and the container is rotated, emoji positioning should be in the car's local coordinate space (north-facing).

  **1. Driver seat position (front-left for US left-hand drive).**

  In the car's local north-facing space, "front-left" means:
  - X: negative (left side of car when viewed from above, facing up/north)
  - Y: `faceY` (already near the windshield area)

  Add a `driverX` field to VehicleDef (or compute it as `-(def.width * 0.2)`). For each car type, the driver sits ~20% of car width to the left of center:
  ```
  sedan: driverX = -6    (width 30, so -30*0.2 = -6)
  suv: driverX = -7
  compact: driverX = -5
  pickup: driverX = -6
  truck: driverX = -6
  coalRoller: driverX = -7
  motorcycle: driverX = 0  (centered, rider is on the bike)
  bicycle: driverX = 0     (centered)
  ```

  Update emoji text creation in constructor to use `driverX * SCALE_FACTOR` for x and `def.faceY * SCALE_FACTOR` for y:
  ```typescript
  const driverX = (this.carType === 'motorcycle' || this.carType === 'bicycle') ? 0 : -(def.width * 0.2);
  this.emojiText = scene.add.text(
    driverX * SCALE_FACTOR,
    def.faceY * SCALE_FACTOR,
    face,
    { fontSize: `${Math.round(def.faceSize * 1.5)}px` }
  );
  ```

  Update `resetCar()` emoji positioning similarly:
  ```typescript
  const driverX = (this.carType === 'motorcycle' || this.carType === 'bicycle') ? 0 : -(def.width * 0.2);
  this.emojiText.setPosition(driverX * SCALE_FACTOR, def.faceY * SCALE_FACTOR);
  this.emojiText.setFontSize(Math.round(def.faceSize * 1.5));
  ```

  **2. Random passengers.**

  Add a private field `private passengerText: Phaser.GameObjects.Text | null = null;`.

  Passenger emoji pool:
  ```typescript
  const PASSENGER_EMOJIS = ['👤', '👦', '👧', '👩', '👨', '🧒'];
  const DOG_EMOJIS = ['🐕', '🐶', '🐩'];
  ```

  In constructor, after creating emojiText, add passenger logic. Only for car types that have passenger seats (NOT motorcycle, NOT bicycle):
  ```typescript
  if (this.carType !== 'motorcycle' && this.carType !== 'bicycle') {
    if (Math.random() < 0.3) {
      // 30% chance of passenger
      const isDog = Math.random() < 0.1; // 10% of passengers are dogs
      const passengerEmoji = isDog
        ? DOG_EMOJIS[Math.floor(Math.random() * DOG_EMOJIS.length)]
        : PASSENGER_EMOJIS[Math.floor(Math.random() * PASSENGER_EMOJIS.length)];

      // Passenger in front-right seat: positive X (right side), same Y as driver
      const passengerX = (def.width * 0.2) * SCALE_FACTOR;
      const passengerY = def.faceY * SCALE_FACTOR;
      const passengerSize = Math.round(def.faceSize * (isDog ? 1.2 : 1.4));

      this.passengerText = scene.add.text(passengerX, passengerY, passengerEmoji, {
        fontSize: `${passengerSize}px`,
      });
      this.passengerText.setOrigin(0.5);
      this.add(this.passengerText);
    }
  }
  ```

  In `resetCar()`, destroy old passenger and potentially create new one:
  ```typescript
  // Remove old passenger
  if (this.passengerText) {
    this.remove(this.passengerText);
    this.passengerText.destroy();
    this.passengerText = null;
  }

  // Maybe add new passenger
  if (this.carType !== 'motorcycle' && this.carType !== 'bicycle') {
    if (Math.random() < 0.3) {
      const isDog = Math.random() < 0.1;
      const passengerEmoji = isDog
        ? DOG_EMOJIS[Math.floor(Math.random() * DOG_EMOJIS.length)]
        : PASSENGER_EMOJIS[Math.floor(Math.random() * PASSENGER_EMOJIS.length)];
      const passengerX = (def.width * 0.2) * SCALE_FACTOR;
      const passengerY = def.faceY * SCALE_FACTOR;
      const passengerSize = Math.round(def.faceSize * (isDog ? 1.2 : 1.4));

      this.passengerText = this.scene.add.text(passengerX, passengerY, passengerEmoji, {
        fontSize: `${passengerSize}px`,
      });
      this.passengerText.setOrigin(0.5);
      this.add(this.passengerText);
    }
  }
  ```

  Extract the passenger creation into a private method `private maybeAddPassenger(): void` to avoid duplication between constructor and resetCar.
  </action>
  <verify>
  Run `npx tsc --noEmit` to confirm no type errors. Visually: driver emoji should appear on the left side of the windshield area (when viewing a north-facing car). ~30% of non-bike cars should have a second emoji on the right side. Occasionally that passenger is a dog emoji.
  </verify>
  <done>Driver emoji positioned at front-left seat. ~30% of cars (excluding motorcycle/bicycle) display a passenger emoji at front-right seat. ~10% of passengers are dogs. Passengers correctly created on spawn and reset.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Cars visually fill ~70-85% of their 80px lane width
- North-facing cars point up, south down, east right, west left
- Wobble animation oscillates around direction of travel, not zero
- Driver emoji sits in front-left position (not dead center)
- Some cars have a passenger emoji in front-right position
- Coal roller smoke still emits from the correct (rear) end
- Cars still stop at red lights and queue behind each other
- Car pooling (resetCar) properly resets rotation, emoji position, and passenger
- Wind catch tween still works correctly relative to base rotation
</verification>

<success_criteria>
Cars appear as large paper cutout toys facing their travel direction, with driver emoji at the driver seat and occasional passengers, while all existing traffic behavior (stopping, queuing, pooling, smoke) continues working correctly.
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-car-rendering-size-rotation-emoji-pl/2-SUMMARY.md`
</output>
