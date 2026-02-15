# Plan 01-02: Mobile Viewport, Touch Capture, Loading Screen

**Phase:** 1 — Scaffolding & Game Boot
**Requirements:** INFRA-03, INFRA-04, INFRA-07
**Estimated effort:** Medium
**Created:** 2026-02-14

## Goal

Game canvas fills mobile screen in portrait mode. Touch input is captured without triggering browser gestures. A loading screen displays while assets load.

## Steps

### 1. Configure mobile viewport meta
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`
- Prevents pinch-zoom and scaling conflicts with Phaser

### 2. Style game container for full-viewport
- Game container div: `width: 100%; height: 100dvh` (dynamic viewport height for mobile browser chrome)
- `margin: 0; padding: 0; overflow: hidden` on html/body
- Safe area insets for notched devices: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`
- Background color matches game background (no white flash)

### 3. Prevent browser gesture interference
- CSS `touch-action: none` on game container
- Phaser config: `input.touch.capture: true`
- Prevent pull-to-refresh: `overscroll-behavior: none` on html/body
- Prevent context menu on long press: CSS and JS handler
- Prevent iOS Safari bounce scroll: `position: fixed` on body when game is active

### 4. Verify Phaser Scale Manager settings
- Confirm `Phaser.Scale.FIT` with 720x1280 base renders correctly
- Confirm `autoCenter: Phaser.Scale.CENTER_BOTH` centers on all aspect ratios
- Test: landscape orientation should show letterboxed portrait game
- Game canvas should have no unexpected gaps or overflow

### 5. Create BootScene with loading screen
- BootScene becomes the asset preloader
- Shows loading progress bar:
  - Background bar (dark, full width)
  - Fill bar (game accent color, grows with progress)
  - "Loading..." text or game title
- Uses Phaser's `this.load.on('progress', callback)` for real-time progress
- Uses `this.load.on('complete', callback)` to transition to next scene
- For Phase 1: loads a placeholder asset (small image) to demonstrate the loading flow
- Transitions to a placeholder GameScene after loading

### 6. Create placeholder GameScene
- Simple scene that confirms full pipeline works
- Shows "Game Ready" text
- Shows touch position indicator — circle that follows finger/mouse
- This proves: canvas renders, touch input works, scene transitions work

### 7. Add touch input demonstration
- In GameScene, track pointer position: `this.input.on('pointermove', callback)`
- Draw a circle/crosshair at touch point
- Verify touch events fire without browser scroll/zoom intercepting
- Log touch events to console for debugging

### 8. Handle orientation changes
- Listen for Phaser `resize` event
- Game should remain playable if device rotates (FIT mode handles this)
- Optional: show "rotate your phone" message if landscape detected

### 9. Test checklist
- [ ] Mobile Chrome (Android): canvas fills screen, no address bar gaps
- [ ] Mobile Safari (iOS): canvas fills screen, no bounce scroll
- [ ] Touch drag on canvas: no browser scroll
- [ ] Pinch on canvas: no browser zoom
- [ ] Swipe from edge: no back-swipe navigation
- [ ] Loading bar appears and fills during asset load
- [ ] Touch indicator follows finger position
- [ ] `astro build` still succeeds after all changes

## Success Criteria

- [ ] Game canvas fills mobile viewport in portrait mode with no gaps
- [ ] Touch input on canvas does NOT trigger scroll, zoom, or back-swipe
- [ ] Loading screen with progress bar displays while assets load
- [ ] Touch position indicator responds to finger/mouse input
- [ ] Works on both dev server and production build

## Architecture Decisions

- `100dvh` instead of `100vh` for mobile browser chrome compatibility
- `touch-action: none` + Phaser's `input.touch.capture: true` for belt-and-suspenders touch capture
- BootScene handles all asset loading — standard Phaser preloader pattern
- Placeholder touch indicator validates input pipeline before building real mechanics in Phase 2

## Risks

- iOS Safari has unique viewport behavior — `100dvh` may need fallback
- Some Android browsers may still intercept edge swipes despite CSS prevention
- Loading screen with no real assets to load may flash too quickly — add minimum display time if needed
