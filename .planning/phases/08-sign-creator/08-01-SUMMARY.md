---
phase: 08-sign-creator
plan: 01
subsystem: ui
tags: [fabric.js, canvas, sign-editor, procedural-textures, material-picker, font-picker, color-picker]

# Dependency graph
requires:
  - phase: 03-sign-crafting
    provides: SignCraftScene structure and SignData interface
provides:
  - Fabric.js-based sign editor with interactive canvas
  - Procedural material texture generation (cardboard, posterboard, foam board, wood)
  - Font selection system (4 fonts)
  - Color picking system (7 colors)
  - PNG export to Phaser registry
affects: [09-visual-ui-polish, 11-social-share]

# Tech tracking
tech-stack:
  added: [fabric@6.x]
  patterns: [DOM overlay architecture, procedural canvas textures, architectural boundary separation]

key-files:
  created:
    - src/lib/signEditor.ts (SignEditor class with Fabric.js canvas, 234 lines)
    - src/lib/signMaterials.ts (Procedural texture generation, 261 lines)
  modified:
    - src/game/scenes/SignCraftScene.ts (Rewritten as DOM overlay orchestrator)
    - src/game/config/signConfig.ts (Extended SignData, added SIGN_FONTS/SIGN_COLORS, 4th material)

key-decisions:
  - "DOM overlay architecture: Fabric.js lives in DOM over Phaser canvas, PNG data URL is the only bridge"
  - "Procedural textures: Generate material backgrounds via canvas drawing (cardboard grain, wood knots, foam dots) rather than image assets"
  - "4 fonts: Permanent Marker (Google Fonts), Impact, Courier New, Comic Sans MS for protest sign aesthetics"
  - "7 colors: Black, Red, Blue, White, Green, Purple, Gold matching marker/paint palette"
  - "Added 4th material: Wood Plank (heavy, very durable) to complete material choices"

patterns-established:
  - "Architectural boundary: src/lib/ is pure TypeScript (no Phaser dependency), Phaser scenes orchestrate DOM but don't touch internals"
  - "Fabric.js to Phaser bridge: exportToPNG() creates data URL stored in Phaser registry, consumed by game scenes"
  - "Mobile-first DOM UI: HTML/CSS with flexbox, touch-friendly buttons, responsive sizing"

# Metrics
duration: 5 min
completed: 2026-02-14
---

# Phase 8 Plan 1: Fabric.js Sign Editor Summary

**Interactive Fabric.js canvas sign editor with draggable text, 4 fonts, 7 colors, 4 procedural material backgrounds, and PNG export to gameplay**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-14T23:27:54Z
- **Completed:** 2026-02-14T23:33:23Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Fabric.js v6.x sign editor with interactive text editing, font selection, color picking
- Procedural material texture system generating cardboard grain, wood knots, foam dots, posterboard smoothness
- SignCraftScene rewritten as DOM overlay orchestrator mounting Fabric.js canvas over Phaser
- Full-featured UI with material thumbnails, font buttons, color swatches, text input, start button
- PNG export flow storing sign image data URL in Phaser registry for gameplay integration

## Task Commits

1. **Task 1: Install Fabric.js and create SignEditor class with text editing + fonts + colors** - `d8cd797` (feat)
   - Installed fabric@6.x
   - Created SignEditor class (234 lines)
   - Extended SignData interface with optional fontFamily, textColor, decorations, signImageDataUrl
   - Added SIGN_FONTS and SIGN_COLORS exports to signConfig.ts
   - Added 4th material: Wood Plank

2. **Task 2: Create material texture system and wire SignEditor into SignCraftScene** - `cdcbfa6` (feat)
   - Created signMaterials.ts with procedural texture generation (261 lines)
   - Rewritten SignCraftScene as DOM overlay with Fabric.js integration
   - Material picker with live texture thumbnails
   - Font and color pickers with real-time canvas updates
   - Mobile-first responsive layout
   - Export flow: Fabric.js → PNG data URL → Phaser registry → IntersectionScene

**Plan metadata:** (next commit)

## Files Created/Modified

- `src/lib/signEditor.ts` - Fabric.js canvas sign editor class with text/font/color controls (234 lines)
- `src/lib/signMaterials.ts` - Procedural material texture generation for 4 sign backgrounds (261 lines)
- `src/game/scenes/SignCraftScene.ts` - Rewritten DOM overlay orchestrator for Fabric.js editor
- `src/game/config/signConfig.ts` - Extended SignData interface, added SIGN_FONTS/SIGN_COLORS, 4th material (wood)
- `package.json` - Added fabric@6.x dependency
- `package-lock.json` - Updated with fabric dependencies

## Decisions Made

1. **DOM overlay architecture**: Fabric.js lives in a full-screen DOM overlay positioned above the Phaser canvas. Phaser never touches Fabric.js; Fabric.js never touches Phaser. The only bridge is the PNG data URL exported via `canvas.toDataURL()` and stored in the Phaser registry. This clean separation allows Fabric.js to use its native DOM/canvas APIs without Phaser interference.

2. **Procedural material textures**: Material backgrounds are generated procedurally via canvas drawing operations (grain lines, noise, knots, borders) rather than loading image assets. This keeps the bundle small, allows infinite texture variation, and creates authentic hand-crafted material aesthetics (cardboard grain, wood knots, foam dots).

3. **Font selection**: 4 protest-ready fonts chosen for visual variety and accessibility:
   - Permanent Marker (Google Fonts): Hand-drawn protest sign energy
   - Impact: Classic bold block letters
   - Courier New: Stencil-like monospace
   - Comic Sans MS: Casual/fun handwritten

4. **Color palette**: 7 marker/paint colors matching real protest sign materials: Black (Sharpie), Red, Blue, White, Green, Purple, Gold. White text works on dark materials (wood), dark text on light materials (cardboard, posterboard).

5. **4th material added**: Wood Plank (very heavy, very durable) completes the material progression: Cardboard (light/fragile) → Posterboard (balanced) → Foam Board (heavy/durable) → Wood Plank (very heavy/very durable).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sign editor fully functional with all M2 core features
- Ready for Phase 9: Visual UI Polish (replace placeholder UI, tune controls, feedback loops)
- PNG export working, ready for Phase 11: Social Share (client-side image generation)
- Material system ready for debug tuning (fatigue/durability multipliers)

---
*Phase: 08-sign-creator*
*Completed: 2026-02-14*
