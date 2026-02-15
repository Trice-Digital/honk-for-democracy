# Plan 04-01: Confidence Meter (Display, Reaction Integration, Group Size, Early Exit)

**Phase:** 4 — Game Systems
**Requirements:** CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, CONF-07
**Estimated effort:** Medium
**Created:** 2026-02-14

## Goal

Confidence meter displays on screen (0-100%, starts ~30%), rises with positive reactions, falls with negative reactions, drains slowly during no-reaction streaks, accounts for NPC group size, ends session early at 0%, and animates smoothly.

## Steps

### 1. Create confidenceConfig.ts
- `src/game/config/confidenceConfig.ts`
- Config values: startingConfidence (30), min (0), max (100)
- Reaction-to-confidence mapping: positive reactions boost, negative reactions drain
- No-reaction drain: timer + rate per second
- Group size baseline: simple multiplier (more people = higher floor)
- Follows existing config pattern (difficultyConfig, reactionConfig)

### 2. Add confidence state to GameStateManager
- Add `confidence: number` to GameState interface
- Add `lastReactionTime: number` for no-reaction drain tracking
- Add `groupSize: number` (simple v1: fixed value, future: dynamic)
- Add methods: `updateConfidence(delta: number)`, `addConfidence(value: number)`
- Emit events: `confidenceChanged`, `confidenceZero`
- `updateConfidence` called each frame: handles no-reaction drain

### 3. Create ConfidenceSystem
- `src/game/systems/ConfidenceSystem.ts`
- Listens to GameStateManager `reaction` events
- Maps reaction scoreValue to confidence change (scaled)
- Tracks time since last reaction for drain
- Group size affects confidence baseline/floor
- Calls GameStateManager to update confidence

### 4. Create confidence meter UI
- Vertical or horizontal bar in IntersectionScene UI overlay
- Shows 0-100% with fill color gradient (red->yellow->green)
- Label: "Confidence"
- Uses setScrollFactor(0) for viewport anchoring
- Smooth tween animation on value changes (CONF-07)

### 5. Wire early exit (confidence = 0%)
- GameStateManager emits `confidenceZero` when confidence hits 0
- IntersectionScene listens and shows "You went home early" overlay
- Sets isSessionActive = false, reuses session-end flow

### 6. Integrate into IntersectionScene
- Create ConfidenceSystem in scene create()
- Add confidence bar to UI
- Update confidence in update loop
- Hook session end to confidence zero

## Success Criteria

- [ ] Confidence meter visible on screen (0-100%, starts ~30%)
- [ ] Positive reactions increase confidence
- [ ] Negative reactions decrease confidence
- [ ] Long streaks of no reaction slowly drain confidence
- [ ] NPC group size affects confidence baseline
- [ ] Confidence hitting 0% ends session with "You went home early"
- [ ] Confidence bar animates smoothly on changes

## Architecture Decisions

- ConfidenceSystem is a separate class that bridges reactions to confidence
- Config-driven values in confidenceConfig.ts
- GameStateManager remains single source of truth
- Smooth animation via Phaser tweens on the UI bar
- Group size is simple/fixed for v1 (can be dynamic in v2)
