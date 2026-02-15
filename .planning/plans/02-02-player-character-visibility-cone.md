# Plan 02-02: Player Character + Visibility Cone Mechanic

**Phase:** 2 — Core Game Loop
**Requirements:** GAME-02, GAME-03, GAME-04, GAME-09
**Estimated effort:** Large
**Created:** 2026-02-14

## Goal

Player character stands at the intersection holding a sign. Player drags to rotate a visible ~60-degree cone. Session has a 3-minute timer displayed on screen. The visibility cone is the core game mechanic.

## Steps

### 1. Create player character entity
- Positioned near center of intersection (on sidewalk/corner)
- Simple procedural sprite: person holding a sign
- Fixed position (does not move during gameplay)
- Sign visible on character (placeholder text for now)

### 2. Create visibility cone (InputHandler)
- Semi-transparent arc (~60 degrees wide)
- Extends outward from player into the road
- Cone rendered as a filled arc graphic
- Color: semi-transparent yellow/gold

### 3. Implement drag-to-rotate input
- One-finger drag rotates the cone around the player
- Touch and mouse support
- Smooth rotation following pointer angle relative to player
- Works identically regardless of viewport size

### 4. Create session timer
- 3-minute (180 second) countdown
- Timer display anchored to viewport edge (UI overlay)
- Session ends when timer reaches 0
- Timer stored in GameStateManager

### 5. Create UI overlay system
- Timer display (top of screen)
- Score display (top of screen)
- UI elements anchor to viewport edges (camera-independent)
- Clean, readable fonts with contrast

### 6. Wire session end
- When timer hits 0, transition to a simple "Session Over" state
- Display final score (full score scene deferred to Phase 6)
- Option to restart

## Success Criteria

- [ ] Player character visible at intersection corner
- [ ] Visibility cone renders as semi-transparent arc
- [ ] Dragging rotates the cone smoothly around the player
- [ ] 3-minute countdown timer visible on screen
- [ ] Session ends when timer reaches 0
- [ ] UI elements anchor to viewport edges

## Architecture Decisions

- Input handler is a reusable system (works on any map)
- UI overlay uses Phaser camera ignore (stays fixed on screen)
- Timer and score in GameStateManager (single source of truth)
