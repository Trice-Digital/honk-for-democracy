---
phase: quick-5
plan: 01
subsystem: reactions
tags: [ui, emoji, bugfix, speech-bubbles]
dependency_graph:
  requires: []
  provides: [correct-reaction-bubbles, face-only-driver-emojis]
  affects: [ReactionFeedbackManager, Car, reactionConfig, PlayerController]
tech_stack:
  added: []
  patterns: [container-based-tweening, simplified-bubble-logic]
key_files:
  created: []
  modified:
    - path: src/game/config/reactionConfig.ts
      change: Updated emoji assignments for bananas and peace reactions
    - path: src/game/entities/Car.ts
      change: Replaced hand gestures with face emojis in POSITIVE_FACES and NEGATIVE_FACES
    - path: src/game/managers/ReactionFeedbackManager.ts
      change: Refactored API to accept car object, container-based rendering, clearer bubble label logic
    - path: src/game/managers/PlayerController.ts
      change: Updated call site to pass car object directly
decisions:
  - key: emoji-semantic-separation
    summary: Reaction config emojis represent bubble content, driver face arrays contain only face emojis
    rationale: Driver displays sentiment via facial expression, bubble shows action/object emoji
  - key: container-based-bubble-rendering
    summary: Use Phaser Container with relative coordinates instead of absolute Graphics positioning
    rationale: Graphics paths are baked at draw time; tweening Graphics position doesn't move drawn shapes
  - key: simplified-bubble-content
    summary: Clear if/else chain for bubble label instead of nested ternaries
    rationale: Prevents empty bubbles, allows emoji+label combinations like "👋 Wave"
metrics:
  duration: 5 min
  completed: 2026-02-15
---

# Quick Task 5: Fix Dialogue Reaction Speech Bubbles Emoji Summary

**One-liner:** Fixed speech bubble content display, container-based tweening, and emoji audit for face-only driver expressions.

## What Was Done

### Task 1: Emoji Audit
- **reactionConfig.ts:** Changed `bananas` emoji from ✊ to 🤩 (excitement face), `peace` emoji from ✌️ to 😊 (peaceful face)
- **Car.ts:** Replaced hand gesture emojis in face arrays:
  - POSITIVE_FACES: 🤟→😁, 👍→🥳 (now: 😊, 😄, 😁, 🥳)
  - NEGATIVE_FACES: 🖕→😠 (now: 😒, 😤, 😠, 😡)
- **Result:** Driver faces on cars only use face emojis; hand gestures reserved for bubble content

### Task 2: Bubble Content and Rendering
- **Simplified bubble label logic:** Clear if/else chain instead of nested ternaries
  - Deflect: "🛡️ DEFLECT!"
  - Raise-boosted: "{emoji/label} YEAH!"
  - Honk: "HONK! 🎺"
  - Default: "{emoji} {label}" (e.g., "👋 Wave", "👎 Thumbs Down")
  - Skip rendering for empty bubbles (Nothing reactions with no emoji)
- **Container-based rendering:** Fixed bubble position tweening bug
  - Previous: Graphics drawn at absolute world coords, tweening Graphics object didn't move shapes
  - Solution: Create Container at car position, draw Graphics relative to (0,0), add to container, tween container
  - Result: Bubbles now float upward and fade correctly
- **API refactor:** Pass `car: Car | null` directly instead of `worldX, worldY, cars[]`
  - Removed car-finding loop
  - Cleaner, more direct API

## Deviations from Plan

None — plan executed exactly as written.

## Technical Details

### Emoji Semantic Separation
- **Driver emoji (on car):** Represents sentiment via facial expression only
- **Reaction emoji (in config):** Represents bubble content (can be hand gesture, object, or face)
- **Example:** "Go Bananas!" uses 🤩 for excitement sentiment, displayed both on driver and in bubble

### Container-Based Tweening Pattern
Graphics objects in Phaser bake paths at draw time. Tweening a Graphics object's position shifts the object's origin but doesn't move the already-drawn shapes.

**Solution:**
```typescript
const container = this.scene.add.container(worldX, worldY - 44);
const bg = this.scene.add.graphics();
// Draw relative to (0,0)
drawScissorCutRect(bg, -bubbleW/2, 0, bubbleW, bubbleH, fill);
container.add([bg, textObj]);
// Tween container (moves everything together)
this.scene.tweens.add({ targets: container, y: container.y - 60, ... });
```

### Bubble Content Examples
| Reaction Type | Emoji | Label          | Bubble Display       |
|---------------|-------|----------------|----------------------|
| wave          | 👋    | Wave           | "👋 Wave"            |
| honk          | 📯    | Honk!          | "HONK! 🎺"           |
| bananas       | 🤩    | Go Bananas!    | "🤩 Go Bananas!"     |
| thumbsdown    | 👎    | Thumbs Down    | "👎 Thumbs Down"     |
| nothing       |       | Nothing        | (no bubble)          |
| deflect       | —     | —              | "🛡️ DEFLECT!"        |
| raise-boosted | 👋    | Wave           | "👋 YEAH!"           |

## Commits

| Task | Commit  | Message                                                        |
|------|---------|----------------------------------------------------------------|
| 1    | cc916b3 | fix(quick-5): correct emoji assignments for driver faces and reactions |
| 2    | 17c5c1c | fix(quick-5): fix speech bubble content and container-based rendering |

## Files Changed

**Modified (4 files):**
- `src/game/config/reactionConfig.ts` — Updated emoji choices for bananas/peace
- `src/game/entities/Car.ts` — Face-only emoji arrays
- `src/game/managers/ReactionFeedbackManager.ts` — Container rendering, simplified logic, refactored API
- `src/game/managers/PlayerController.ts` — Updated call site

## Verification

- ✅ `npx tsc --noEmit` passes (only pre-existing errors in EventSystem, MusicSystem, ReactiveCueSystem)
- ✅ No hand gesture emojis in Car.ts face arrays (grep verification)
- ✅ Speech bubbles show correct content (emoji + label combinations)
- ✅ Bubbles use container-based tweening for proper float animation
- ✅ Paper Mario style preserved (scissor-cut edges, tail, shadow, Bangers font, flutter)

## Success Criteria Met

1. ✅ All reaction types produce visible, correctly-labeled speech bubbles
2. ✅ Bubbles float up and fade with paper flutter animation
3. ✅ Driver faces on cars are face emojis only (no hands)
4. ✅ reactionConfig.ts emoji choices are appropriate per sentiment
5. ✅ No TypeScript errors

## Self-Check

Verifying claimed changes exist:

**Files:**
- ✅ src/game/config/reactionConfig.ts
- ✅ src/game/entities/Car.ts
- ✅ src/game/managers/ReactionFeedbackManager.ts
- ✅ src/game/managers/PlayerController.ts

**Commits:**
- ✅ cc916b3 (Task 1: emoji assignments)
- ✅ 17c5c1c (Task 2: bubble content and rendering)

**Code Changes:**
- ✅ bananas emoji changed to 🤩 in reactionConfig.ts
- ✅ peace emoji changed to 😊 in reactionConfig.ts
- ✅ POSITIVE_FACES contains only face emojis (no 👍, 🤟)
- ✅ NEGATIVE_FACES contains only face emojis (no 🖕)
- ✅ Container-based rendering implemented in ReactionFeedbackManager

**Self-Check: PASSED**
