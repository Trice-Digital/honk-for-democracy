# Plan 03-02: Wire Sign Properties Into Gameplay

**Phase:** 3 — Sign Crafting
**Requirements:** SIGN-04, SIGN-06
**Estimated effort:** Small
**Created:** 2026-02-14

## Goal

The player's crafted sign appears on their character during gameplay, and message quality affects the ratio of positive to negative reactions (wittier messages = better crowd response).

## Steps

### 1. Update Player entity to accept sign data
- Player reads sign data from registry on create
- Sign board color matches selected material
- Sign text shows player's message (truncated to fit)
- Sign board size adjusts slightly based on message length

### 2. Update ReactionSystem to apply sign quality multiplier
- Read sign quality score from registry
- Adjust reaction weights: higher quality = shift toward positive reactions
- Quality multiplier modifies the positive/negative weight balance
- Integrated into existing ReactionSystem.updateWeights pattern

### 3. Update IntersectionScene to read sign data
- On create, read sign data from Phaser registry
- Pass sign message to Player entity
- Apply sign quality multiplier to ReactionSystem
- If no sign data exists (direct scene launch), use defaults

## Success Criteria

- [ ] Player character's sign shows the crafted message during gameplay
- [ ] Sign board color matches selected material
- [ ] Message quality affects positive/negative reaction ratio
- [ ] Game still works with default sign if SignCraftScene is skipped

## Architecture Decisions

- Sign data accessed via Phaser registry (set by SignCraftScene, read by IntersectionScene)
- Quality multiplier adjusts existing DifficultyConfig weights (multiplicative, not replacement)
- Player entity's setSignMessage is extended to handle material styling
- Graceful fallback: default sign if registry has no sign data
