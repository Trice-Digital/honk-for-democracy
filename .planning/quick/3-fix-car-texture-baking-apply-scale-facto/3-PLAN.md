---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/entities/Car.ts
autonomous: true
must_haves:
  truths:
    - "Cars render at a visible, proportional size relative to 80px lane width"
    - "Car body textures are not clipped, offset, or showing artifacts"
    - "Emoji driver and passenger faces are positioned correctly on the car body"
    - "All 8 vehicle types render without visual glitches"
  artifacts:
    - path: "src/game/entities/Car.ts"
      provides: "Scaled car rendering via SCALE_FACTOR applied at draw time"
      contains: "SCALE_FACTOR"
  key_links:
    - from: "SCALE_FACTOR"
      to: "drawVehicle and all draw* methods"
      via: "multiply all coordinates and dimensions"
      pattern: "\\* S"
    - from: "VEHICLE_DEFS"
      to: "emoji placement and bakeCarBody"
      via: "scaled width/height/faceY/faceSize"
      pattern: "def\\.width.*S|def\\.height.*S"
---

<objective>
Fix car texture baking so cars render at proper scale. The current VEHICLE_DEFS use mockup SVG dimensions (sedan 50x90) which are small. A SCALE_FACTOR must be applied directly in the drawing commands — NOT via g.setScale() which generateTexture() ignores.

Purpose: Cars should be clearly visible and proportional to the 80px lane width.
Output: Updated Car.ts with scaled rendering.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/game/entities/Car.ts
@src/game/utils/paperArt.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply SCALE_FACTOR to all car drawing code</name>
  <files>src/game/entities/Car.ts</files>
  <action>
Add a SCALE_FACTOR constant near the top of the file (after VEHICLE_DEFS). Start with `const SCALE_FACTOR = 1.4` — this makes a sedan 70x126, fitting well in 80px lanes.

CRITICAL RULE: `Graphics.setScale()` does NOT affect `generateTexture()`. All scaling MUST happen by multiplying coordinates/dimensions in draw commands.

Approach — scale at the draw call site, keep VEHICLE_DEFS as the "base" reference:

1. **In `bakeCarBody()`:**
   - Compute scaled texture dimensions: `const texW = Math.ceil(def.width * SCALE_FACTOR) + pad * 2` and same for texH with def.height.
   - Keep `g.setPosition(texW / 2, texH / 2)` — this centers the origin in the texture.
   - Pass `generateTexture(texKey, texW, texH)` with scaled dimensions.

2. **In each `draw*()` method (drawSedan, drawSUV, drawCompact, drawPickup, drawTruck, drawCoalRoller, drawMotorcycle, drawBicycle):**
   - Add `const S = SCALE_FACTOR;` at the top of each method for brevity.
   - Multiply ALL coordinate values and dimension values by S. This includes:
     - `hw` and `hh` half-width/half-height values
     - All polygon point x/y coordinates
     - All fillRoundedRect/strokeRoundedRect x, y, width, height args
     - All fillCircle/strokeCircle x, y, radius args
     - All fillEllipse x, y, width, height args
     - All moveTo/lineTo coordinates
     - All lineStyle width values (multiply by S)
     - Rounding radius values in fillRoundedRect (multiply by S)
   - Do NOT change VEHICLE_DEFS base values.

3. **In `drawWheels()`:**
   - Multiply hw, hh, ww, wh and the offset constants (2, 8) by SCALE_FACTOR.

4. **In `strokeOutline()`:**
   - Multiply the lineStyle width (2.5) by SCALE_FACTOR.
   - The pts are already scaled from the caller, so no coordinate changes needed.

5. **In `drawPaperShadow` calls within draw methods:**
   - Scale the x, y, width, height arguments passed to drawPaperShadow. The function itself (in paperArt.ts) stays unchanged.

6. **Emoji placement — in constructor and resetCar():**
   - Scale the driver/passenger positions: `driverX = ... * SCALE_FACTOR`, `def.faceY * SCALE_FACTOR` for y position.
   - Scale font size: `def.faceSize * SCALE_FACTOR`.
   - Same for passenger: `passengerX = def.width * 0.2 * SCALE_FACTOR`, `passengerY = def.faceY * SCALE_FACTOR`.

7. **In `getBounds()`:**
   - Return bounds using `def.width * SCALE_FACTOR` and `def.height * SCALE_FACTOR`.

8. **In `shouldStop()`:**
   - `this.carLength` is set from `def.height` — update the assignment in constructor and resetCar: `this.carLength = def.height * SCALE_FACTOR` and `this.carWidth = def.width * SCALE_FACTOR`.

9. **In `emitSmokePuff()`:**
   - Scale the `hh` calculation: `const hh = (def.height * SCALE_FACTOR) / 2`.

Do NOT touch paperArt.ts — drawPaperShadow and drawScissorCutPolygon receive pre-scaled values.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Then run `npm run dev`, open browser, verify cars appear at correct scale in lanes — sedan should fill roughly 85% of lane width. Check all 4 directions. Look for: no clipping, no offset artifacts, emojis centered on car face area.
  </verify>
  <done>
All 8 car types render at SCALE_FACTOR size with correct proportions. No texture artifacts, clipping, or brown rectangles. Emojis positioned at driver seat. Cars fit within 80px lanes without overflow.
  </done>
</task>

<task type="auto">
  <name>Task 2: Debug texture centering if cars are offset</name>
  <files>src/game/entities/Car.ts</files>
  <action>
After Task 1, if cars appear offset or clipped in the baked texture, debug with this approach:

**Quick debug technique:** In `bakeCarBody()`, temporarily skip `generateTexture()` and add the Graphics object directly to the container instead of creating an Image. This shows the raw drawing without baking, confirming whether the drawing code is correct vs the baking centering is wrong.

```typescript
// Debug: skip baking, show raw graphics
// tempG.setPosition(texW / 2, texH / 2);
// tempG.generateTexture(texKey, texW, texH);
// tempG.destroy();
// this.carBodyImage = this.scene.add.image(0, 0, texKey);
this.add(tempG);  // Add graphics directly
return;
```

If raw graphics look correct but baked texture is offset:
- The issue is `g.setPosition(texW/2, texH/2)`. This shifts where (0,0) of the drawing lands in the texture canvas. Since all draw commands use (0,0) as center (negative coords for left/top), setting position to (texW/2, texH/2) should center them.
- If it does NOT center correctly, try: remove setPosition entirely, and instead offset all draw commands by +(texW/2, texH/2). This means passing an offset to drawVehicle and adding it to every coordinate. Less elegant but guaranteed to work.

If raw graphics also look wrong:
- The SCALE_FACTOR multiplication has a bug in one of the draw methods. Check each method systematically.

After fixing, remove the debug code and restore normal baking flow. Verify the final baked output matches the raw graphics.

NOTE: This task may be a no-op if Task 1's centering works correctly on first try. If so, just verify and move on.
  </action>
  <verify>
Run dev server, spawn cars in all directions. Cars should be centered on their lane position with no visible offset. Compare north-facing and south-facing cars — both should look symmetrical. Zoom in to check emoji alignment.
  </verify>
  <done>
Cars render centered at their container position. No offset between the baked texture and the expected car center point. The debug code is removed and normal baking flow is restored.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no new type errors)
- Dev server runs without console errors related to car rendering
- All 8 car types visible at correct scale (sedan ~70px wide in 80px lane)
- Cars in all 4 directions render correctly (rotation works with scaled body)
- Emoji faces positioned at driver seat, passengers at front-right
- Coal roller smoke puffs emit from correct position
- No brown/tan rectangle artifacts around cars
</verification>

<success_criteria>
Cars render at SCALE_FACTOR (1.4x) size with correct texture baking. No visual artifacts. All vehicle types, directions, emoji positions, and smoke puffs work correctly.
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-car-texture-baking-apply-scale-facto/3-SUMMARY.md`
</output>
