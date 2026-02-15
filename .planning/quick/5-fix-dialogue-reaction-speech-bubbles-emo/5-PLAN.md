---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/game/config/reactionConfig.ts
  - src/game/entities/Car.ts
  - src/game/managers/ReactionFeedbackManager.ts
autonomous: true
must_haves:
  truths:
    - "Speech bubbles show correct emoji + label text for each reaction type"
    - "Speech bubbles track with stopped cars for their animation duration"
    - "Driver face emojis on cars are only face emojis, no hand gestures"
    - "Reaction config uses face emojis for driver sentiment, hand gestures only in bubble content"
    - "Bubbles have Paper Mario scissor-cut edges, tail, shadow, Bangers font, paper flutter dismiss"
  artifacts:
    - path: "src/game/config/reactionConfig.ts"
      provides: "Corrected emoji assignments"
    - path: "src/game/entities/Car.ts"
      provides: "Face-only emoji arrays"
    - path: "src/game/managers/ReactionFeedbackManager.ts"
      provides: "Car-tracking speech bubbles with correct content"
  key_links:
    - from: "src/game/managers/ReactionFeedbackManager.ts"
      to: "src/game/entities/Car.ts"
      via: "car reference for position tracking"
      pattern: "car\\.x|car\\.y"
    - from: "src/game/managers/ReactionFeedbackManager.ts"
      to: "src/game/config/reactionConfig.ts"
      via: "reaction.emoji and reaction.label"
      pattern: "reaction\\.emoji|reaction\\.label"
---

<objective>
Fix reaction speech bubbles: correct content display, car position tracking, emoji audit, and Paper Mario style verification.

Purpose: Bubbles currently show wrong/empty content and float at static world positions instead of tracking cars. Emoji choices mix hand gestures with driver faces.
Output: Working speech bubbles that display correct reaction content, track with stopped cars, and use proper emoji assignments.
</objective>

<execution_context>
@/home/scott/.claude/get-shit-done/workflows/execute-plan.md
@/home/scott/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/game/managers/ReactionFeedbackManager.ts
@src/game/config/reactionConfig.ts
@src/game/entities/Car.ts
@src/game/utils/paperArt.ts
@src/game/managers/PlayerController.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Emoji audit in reactionConfig.ts and Car.ts</name>
  <files>src/game/config/reactionConfig.ts, src/game/entities/Car.ts</files>
  <action>
**reactionConfig.ts — Fix emoji assignments:**

The `emoji` field in REACTION_TYPES is used for speech bubble content AND passed to Car.setReactionFace via sentiment. The emoji field itself appears in bubbles, which is fine for hand gestures. But some entries use hand gestures as their primary emoji when a face would be more appropriate for the driver's displayed reaction.

Update these entries:
- `wave` (id: 'wave'): emoji '👋' is fine for bubble content (it IS a wave). Keep as-is.
- `honk` (id: 'honk'): emoji '📯' — keep, this is an object not a hand.
- `bananas` (id: 'bananas'): Change emoji from '✊' to '🤩' — "Go Bananas!" is excitement, use a face. Label stays 'Go Bananas!'.
- `peace` (id: 'peace'): Change emoji from '✌️' to '😊' — peace sign as face emoji. Or keep '✌️' since it's a well-known gesture for bubble display. User decision: change to '😊' since the emoji represents the driver's sentiment display.
- `thumbsdown` (id: 'thumbsdown'): emoji '👎' — fine for bubble content, keep.
- `finger` (id: 'finger'): emoji '🖕' — fine for bubble content, keep.
- `yell` (id: 'yell'): emoji '🤬' — already a face, perfect.
- `coalroller` (id: 'coalroller'): emoji '💨' — fine, it's a visual effect.

**Car.ts — Fix face emoji arrays (lines 99-101):**

These arrays are used by `setReactionFace()` to change the driver emoji displayed ON the car. They must contain ONLY face emojis.

Change:
```typescript
const POSITIVE_FACES = ['😊', '🤟', '😄', '👍'];
```
To:
```typescript
const POSITIVE_FACES = ['😊', '😄', '😁', '🥳'];
```

Change:
```typescript
const NEGATIVE_FACES = ['😒', '😤', '🖕', '😡'];
```
To:
```typescript
const NEGATIVE_FACES = ['😒', '😤', '😠', '😡'];
```

NEUTRAL_FACES `['😐', '😶', '🫤']` are already all faces — no change needed.

Also verify DRIVER_FACES on line 98 — `['😐', '😊', '😤', '😠', '🙂', '😑']` — these are all faces, good.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Manually inspect the arrays: grep for hand gesture emojis in the face arrays to confirm none remain.
  </verify>
  <done>
POSITIVE_FACES and NEGATIVE_FACES contain only face emojis. reactionConfig.ts entries use appropriate emojis. No hand gestures appear as driver faces on cars.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix bubble content display and car position tracking</name>
  <files>src/game/managers/ReactionFeedbackManager.ts</files>
  <action>
**Problem 1 — Bubble content:** The current `bubbleLabel` logic (lines 56-68) is convoluted and can produce empty strings. The cascading ternary sometimes drops the label. Simplify:

Replace the bubbleText/bubbleLabel logic with clearer code:
```typescript
let bubbleLabel: string;
if (wasDeflected) {
  bubbleLabel = '\u{1F6E1}\uFE0F DEFLECT!';
} else if (wasRaiseBoosted) {
  const content = reaction.emoji || reaction.label || '';
  bubbleLabel = `${content} YEAH!`;
} else if (reaction.label === 'Honk!') {
  bubbleLabel = 'HONK! \u{1F3BA}';
} else {
  // Show emoji + label together for richer bubbles, or just label if no emoji
  const parts: string[] = [];
  if (reaction.emoji) parts.push(reaction.emoji);
  if (reaction.label && reaction.label !== 'Nothing') parts.push(reaction.label);
  bubbleLabel = parts.join(' ') || '';
}
```
Skip rendering the bubble entirely if `bubbleLabel` is empty (for 'Nothing' reactions with no emoji).

**Problem 2 — Car tracking:** Currently the bubble spawns at the passed-in `worldX`/`worldY` (the car's position at spawn time) and uses absolute y tweening (`y: worldY - 75`). For stopped cars, the bubble should follow the car.

Refactor `showReactionFeedback` to accept the `car: Car | null` directly instead of doing the lookup internally. Update the signature:
```typescript
showReactionFeedback(
  car: Car | null,
  reaction: { emoji: string; scoreValue: number; color: number; label: string; sentiment?: string },
  wasRaiseBoosted: boolean,
  wasDeflected: boolean,
  finalScoreValue: number,
): void
```

Remove the car-finding loop (lines 40-48). Instead, at the call site in PlayerController.ts (line 326-328), pass the `car` directly:
```typescript
this.reactionFeedback.showReactionFeedback(
  car, reaction, wasRaiseBoosted, wasDeflected, finalScoreValue
);
```
Remove the `cars` parameter entirely.

Inside the method:
- Get initial position from `car?.x ?? 0` and `car?.y ?? 0`.
- Set `carIsStopped = car?.isStopped ?? false`.
- Call `car?.setReactionFace(sentiment)` directly.
- For stopped cars: Add the bubble graphics and text as children of a Container, then tween the container. During the tween, use an `onUpdate` callback to reposition the container relative to the car's current position. Specifically:
  ```typescript
  if (car && carIsStopped) {
    // Create a container for the bubble at the car's position
    const container = this.scene.add.container(car.x, car.y - 44);
    container.add([bg, text]);
    container.setDepth(20);
    // Position bg and text relative to container (0,0)
    // ... adjust bg drawing to be relative to container origin ...

    // Tween with car tracking
    this.scene.tweens.add({
      targets: container,
      y: car.y - 44 - (60 + Math.random() * 20),
      alpha: 0,
      angle: rotation + (Math.random() - 0.5) * 12,
      duration: animDuration,
      delay: 350,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (car.active) {
          container.x = car.x + xDrift * (/* progress fraction */);
        }
      },
      onComplete: () => container.destroy(),
    });
  }
  ```

  Actually, a simpler approach: for stopped cars, the car doesn't move, so the current static positioning is actually fine — the car IS stopped. The real issue for moving cars is that they drive away. For moving cars, pop-and-float at spawn position is correct per the task description.

  So the main fix is: make sure the initial worldX/worldY comes from the actual car coordinates (which it already does via `car.x, car.y` from PlayerController). The "doesn't track" issue is likely that the bg Graphics uses world coordinates for drawing but the tween uses relative offsets inconsistently.

  Verify: The Graphics object draws at absolute world coordinates (lines 82-104), and the tween moves it with relative `-=` syntax (line 122). This should work. But the Graphics `fillRoundedRect` and `fillTriangle` draw at absolute positions, and tweening `y` on a Graphics object moves its local origin — which does NOT move the already-drawn paths. **This is the bug.** Graphics paths are baked at draw time; tweening the Graphics position shifts the viewport but the drawn shapes stay at their original coordinates relative to the Graphics origin.

  **Fix:** Switch from drawing at absolute world coords on a Graphics object to using a Container approach:
  1. Create a Phaser Container at `(worldX, worldY - 44)`.
  2. Create the Graphics object drawing relative to `(0, 0)` — i.e., the bubble centered at origin.
  3. Create the text at `(0, bubbleH/2)` relative to container.
  4. Add both to the container.
  5. Tween the container (not individual objects).

  This way tweening `y` on the container actually moves everything together.

  Revised drawing code (inside the `if (bubbleLabel)` block):
  ```typescript
  const bubbleY = 0; // top of bubble relative to container
  const container = this.scene.add.container(worldX, worldY - 44);
  container.setDepth(20);
  container.setAngle(rotation);

  const bg = this.scene.add.graphics();
  // Shadow
  bg.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
  bg.fillRoundedRect(-bubbleW/2 + PALETTE.shadowOffsetX, bubbleY + PALETTE.shadowOffsetY, bubbleW, bubbleH, 4);
  // Scissor-cut body
  drawScissorCutRect(bg, -bubbleW/2, bubbleY, bubbleW, bubbleH, bubbleFill);
  // Triangle tail
  bg.fillStyle(bubbleFill, 1);
  bg.fillTriangle(-6, bubbleH, 6, bubbleH, 0, bubbleH + 8);
  bg.lineStyle(2, PALETTE.markerBlack, 0.9);
  bg.beginPath();
  bg.moveTo(-6, bubbleH);
  bg.lineTo(0, bubbleH + 8);
  bg.lineTo(6, bubbleH);
  bg.strokePath();

  const textObj = this.scene.add.text(0, bubbleH / 2, bubbleLabel, {
    fontFamily: "'Bangers', cursive",
    fontSize: `${fontSize}px`,
    color: isNegative ? '#ef4444' : '#1a1a1a',
    letterSpacing: 1,
  });
  textObj.setOrigin(0.5);

  container.add([bg, textObj]);

  // Paper flutter: float up + wobble + drift + fade
  this.scene.tweens.add({
    targets: container,
    y: container.y - (60 + Math.random() * 20),
    x: container.x + xDrift,
    alpha: 0,
    angle: rotation + (Math.random() - 0.5) * 12,
    duration: animDuration,
    delay: 350,
    ease: 'Quad.easeOut',
    onComplete: () => container.destroy(),
  });
  ```

  Do the same container approach for the score floater — it already works since Text objects tween correctly, but keep it consistent.

**Also update PlayerController.ts** call site (line 326-328):
Change from:
```typescript
this.reactionFeedback.showReactionFeedback(
  car.x, car.y, reaction, wasRaiseBoosted, wasDeflected, finalScoreValue, this.cars()
);
```
To:
```typescript
this.reactionFeedback.showReactionFeedback(
  car, reaction, wasRaiseBoosted, wasDeflected, finalScoreValue
);
```
  </action>
  <verify>
Run `npx tsc --noEmit` — no type errors. Run `npm run dev` and play the game: trigger reactions from cars. Confirm:
1. Speech bubbles show emoji + label text (e.g., "👋 Wave", "HONK! 🎺", "👎 Thumbs Down")
2. Bubbles visually float upward and fade (not stuck in place)
3. Bubbles appear above the car with triangle tail pointing down
4. Scissor-cut edges visible on bubble outline
5. Deflect shows shield + "DEFLECT!", boost shows content + "YEAH!"
  </verify>
  <done>
Speech bubbles display correct content from reaction config. Bubbles float upward via container-based tweening. Paper Mario style preserved (scissor-cut edges, tail, shadow, Bangers font, paper flutter). API simplified to pass car directly.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- No hand gesture emojis in Car.ts face arrays (POSITIVE_FACES, NEGATIVE_FACES)
- Speech bubbles show visible text content (not empty)
- Bubbles animate upward and fade out
- Bubbles have scissor-cut edges, triangle tail, shadow
- Score floaters still appear with bounce animation
</verification>

<success_criteria>
1. All reaction types produce visible, correctly-labeled speech bubbles
2. Bubbles float up and fade with paper flutter animation
3. Driver faces on cars are face emojis only (no hands)
4. reactionConfig.ts emoji choices are appropriate per sentiment
5. No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/5-fix-dialogue-reaction-speech-bubbles-emo/5-SUMMARY.md`
</output>
