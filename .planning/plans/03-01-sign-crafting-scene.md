# Plan 03-01: Sign Crafting Scene (Material Picker + Message Input + Preview)

**Phase:** 3 — Sign Crafting
**Requirements:** SIGN-01, SIGN-02, SIGN-03, SIGN-05
**Estimated effort:** Medium
**Created:** 2026-02-14

## Goal

Player crafts a protest sign before gameplay: pick a material (cardboard, posterboard, foam board), type a custom message, and see a preview of the completed sign. This is a separate Phaser scene (SignCraftScene) that runs before IntersectionScene.

## Steps

### 1. Create SignConfig (config-driven material properties)
- `src/game/config/signConfig.ts`
- Three materials: cardboard, posterboard, foam board
- Each has: label, weight (affects fatigue), durability (affects weather degradation), color/style, fatigue multiplier
- Message quality scoring function: basic keyword matching + length scoring
- Config-driven, same pattern as reactionConfig and difficultyConfig

### 2. Create SignData type (shared sign state)
- Interface for sign data passed between scenes: material, message, quality score, durability, fatigue multiplier
- Stored in Phaser registry for cross-scene access (same pattern as GameStateManager)

### 3. Create SignCraftScene
- `src/game/scenes/SignCraftScene.ts`
- New Phaser scene with key 'SignCraftScene'
- Layout: Title, material picker (3 tappable options), message input, sign preview, "Start Protesting" button
- Material picker: three styled buttons showing material name + properties
- Message input: uses DOM element (Phaser's `this.add.dom()` or manual approach) for text input
- Sign preview: colored rectangle with text, matches material style
- "Start Protesting" button transitions to IntersectionScene

### 4. Wire scene flow
- BootScene -> SignCraftScene -> IntersectionScene
- Sign data stored in Phaser registry
- Update gameConfig.ts to include SignCraftScene in scene list

## Success Criteria

- [ ] Player can select one of three sign materials
- [ ] Player can type a custom message
- [ ] Material properties (durability, fatigue multiplier) are config-driven
- [ ] Player sees a live preview of their completed sign
- [ ] "Start Protesting" button launches IntersectionScene with sign data in registry

## Architecture Decisions

- SignCraftScene is a separate Phaser scene (not a UI overlay)
- Material properties are config-driven (signConfig.ts)
- Sign data flows via Phaser registry (same pattern as GameStateManager)
- DOM input element for text entry (Phaser canvas can't do native text input)
- Message quality scoring is basic for v1 (length + keyword matching)
