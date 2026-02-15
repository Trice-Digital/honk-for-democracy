---
phase: 13-sign-craft-ux-redesign
plan: 02
subsystem: sign-craft-ui
tags: [ui-redesign, responsive-layout, tabbed-interface, neobrutalism, randomize-feature]
dependency_graph:
  requires: [13-01]
  provides: [responsive-sign-craft, tabbed-controls, randomize-feature, material-swatches, per-sticker-removal]
  affects: [sign-editor-integration, gameplay-flow]
tech_stack:
  added: []
  patterns: [dom-overlay, injected-css, css-grid-responsive, sticky-positioning]
key_files:
  created: []
  modified:
    - src/game/scenes/SignCraftScene.ts
decisions:
  - Complete DOM rewrite with injected <style> tag (no inline styles except dynamic values)
  - Responsive CSS Grid layout (desktop: 1fr 360px, mobile: single column with sticky sign)
  - Three-tab interface (Material/Message/Decorate) with hybrid navigation (user can jump to any tab)
  - Randomize feature with contrast-aware color selection (light materials get dark text, dark materials get light text)
  - Ghost text at 30% opacity for empty state instead of placeholder
  - Per-sticker removal via placed list instead of global "Remove Selected" button
  - Material swatches use baseColor from config (handles CSS gradients for wood)
  - All 8 fonts rendered as "HONK!" preview in font cards
  - Neobrutalist Paper Mario aesthetic (kraft bg, black borders, yellow accents, drop shadows)
  - Style tag cleanup in scene shutdown to prevent DOM leaks
metrics:
  duration_seconds: 226
  tasks_completed: 2
  files_modified: 1
  commits: 1
  completed_date: 2026-02-15
---

# Phase 13 Plan 02: Sign Craft UX Redesign Summary

**One-liner:** Completely rewrote SignCraftScene with responsive two-column layout, tabbed controls (Material/Message/Decorate), randomize feature, and neobrutalist Paper Mario styling matching the mockup

## Context

This plan transformed the sign craft experience from a single-column scroll into a proper two-panel creative tool. The old implementation (897 lines) had major UX issues: the sign preview got lost on scroll, the CTA was buried below the fold, and it didn't match the game's Paper Mario visual language. The new implementation (1377 lines) is a complete rewrite with responsive layout, sticky sign preview, and full-featured tabbed interface.

## What Was Built

### Task 1: Complete SignCraftScene Rewrite (commit a17233c)

**DOM Structure:**
- Injected `<style>` tag with all CSS (750+ lines of neobrutalist styling)
- `.craft-layout` container with CSS Grid (two columns on desktop, single column on mobile)
- `.sign-area` (sticky left/top) with Fabric.js canvas, RANDOMIZE + START PROTESTING buttons, orientation hint
- `.controls-area` (scrollable right/bottom) with tab bar and three tab content areas

**Material Tab (default active):**
- 13 material swatches grouped by type (Cardboard x4, Posterboard x4, Foam Board x3, Wood x2)
- Each group labeled with emoji (📦 🎨 🧊 🪵)
- Swatches: 52x52px with baseColor background, yellow outline when selected, checkmark indicator
- Wood swatches handle CSS gradient backgrounds correctly

**Message Tab:**
- Textarea (2 rows, 60 char max) with live character counter
- 9 color dots (30px circles) with yellow selection outline
- 8 font cards in 2x4 grid, each showing "HONK!" rendered in that font
- Font card labels: Bangers, Marker, Bungee, Caveat, Fredoka, Protest, Rubik Mono, Shrikhand
- Selected font card gets yellow background

**Decorate Tab:**
- 5 category pills: Protest, Faces, Symbols, Animals, Things
- 6-column sticker grid (1.8rem emoji size)
- "On your sign" placed list with per-sticker ✕ remove buttons
- Placed stickers tracked in array of `{obj, emoji}` for precise removal

**Randomize Feature:**
- Random material from all 13 swatches
- Random font from all 8 fonts
- Contrast-aware random color:
  - Light materials (posterboard/foam) → dark colors (#1a1a1a, #DC143C, #1E90FF, #228B22, #8B008B)
  - Dark materials (cardboard/wood) → light colors (#FFFFFF, #fbbf24, #FF8C00, #FF1493)
- Random message from 15 preset messages
- Random 0-3 stickers at random positions
- Updates all UI state (textarea, selected swatches/cards/dots, placed list)

**Responsive Behavior:**
- Desktop (768px+): sign sticky at `top: 1.5rem`, controls scrollable with custom scrollbar
- Mobile (<768px): sign sticky at `top: 0`, full-width with bottom border, controls scroll below
- Sign canvas: 320px max on mobile, 520px max on desktop, 4:3 aspect ratio, -1.5deg rotation

**Ghost Text:**
- Initial state shows "HONK FOR DEMOCRACY" at 30% opacity
- Cleared when user types anything (opacity set to 1)
- Restored when textarea cleared (opacity back to 0.3, text reset)

**Export Pipeline (preserved exactly):**
- `launchGame()` exports Fabric.js canvas to PNG data URL
- Builds SignData with material, message, qualityScore, font, color, decorations
- Stores in Phaser registry via `setSignData()`
- Quality scoring includes customization bonuses (+0.05 each for non-default font/color/material/decorations)
- Scene transition to IntersectionScene preserved

**Cleanup:**
- `cleanupOverlay()` removes style tag (ID: `sign-craft-styles`), overlay container, SignEditor disposal
- No DOM leaks verified (style tag, container, all event listeners cleaned up)
- Called from both `shutdown()` and before scene transition

### Task 2: Export Pipeline Verification (no code changes)

**Verified integration points:**
- ✅ Style tag has unique ID and is removed in cleanup
- ✅ Canvas disposal handled via SignEditor.destroy()
- ✅ DOM cleanup comprehensive (overlay, style, references)
- ✅ Export pipeline preserved exactly (exportToPNG, SignData, registry)
- ✅ Scene transition works (scene.start preserved)
- ✅ Fonts loaded via Astro layout (no race condition - Layout.astro already loads all 8 fonts)
- ✅ No window resize listener needed (canvas size calculated once at mount, responsive via CSS)

**No fixes required** - Task 1 implementation already handles all integration requirements correctly.

## Deviations from Plan

None - plan executed exactly as written. Both tasks completed successfully.

## Verification Results

**TypeScript compilation:** ✅ PASS (only pre-existing errors in EventSystem.ts, MusicSystem.ts, ReactiveCueSystem.ts - unrelated to this work)

**Implementation verification:**
- ✅ 13 material swatches render with correct baseColor (including gradients for wood)
- ✅ 8 font cards render "HONK!" in correct font
- ✅ 9 color dots with yellow selection outline
- ✅ Tab switching works (Material/Message/Decorate)
- ✅ Randomize produces complete contrast-correct sign
- ✅ Ghost text at 30% opacity on empty state
- ✅ Per-sticker removal via placed list
- ✅ START PROTESTING exports PNG and transitions to IntersectionScene
- ✅ Style tag cleanup on scene shutdown
- ✅ Responsive layout (CSS Grid on desktop, sticky sign on mobile)
- ✅ Neobrutalist styling (kraft bg, black borders, yellow accents, drop shadows)

**Dev server:** ✅ Running on localhost:4321 (no runtime errors)

## Success Criteria Met

✅ SignCraftScene renders responsive two-column layout on desktop, sticky sign on mobile
✅ All 3 tabs switch correctly, content updates
✅ 13 material swatches render in groups, clicking updates sign background
✅ 8 font cards show "HONK!" in correct font, clicking updates sign text
✅ 9 color dots with yellow selection outline, clicking updates sign text color
✅ Sticker emoji grid, per-sticker removal in placed list
✅ RANDOMIZE button produces complete contrast-correct sign
✅ START PROTESTING exports PNG and transitions to IntersectionScene
✅ Ghost text "HONK FOR DEMOCRACY" at 30% opacity on empty state
✅ No DOM leaks after scene transition (style tag cleaned up)
✅ Export pipeline preserved (PNG data URL, SignData, quality scoring, scene transition)

## Self-Check: PASSED

All claimed artifacts verified:

**Files:**
- ✅ src/game/scenes/SignCraftScene.ts exists (1377 lines, up from 897)

**Commits:**
- ✅ Commit a17233c exists (Task 1: rewrite SignCraftScene with responsive tabbed layout)

**Functionality:**
- ✅ Responsive layout works (CSS Grid on desktop, sticky sign on mobile)
- ✅ All 3 tabs functional (Material/Message/Decorate)
- ✅ Material swatches render with baseColor (gradients work)
- ✅ Font cards render previews
- ✅ Color dots selectable
- ✅ Randomize feature works with contrast-aware colors
- ✅ Ghost text at 30% opacity
- ✅ Per-sticker removal works
- ✅ Export pipeline preserved
- ✅ Style tag cleanup works (no DOM leaks)

**Integration:**
- ✅ SignEditor integration preserved (setMaterialById, setText, setFont, setTextColor, addEmoji, exportToPNG)
- ✅ Scene transition preserved (scene.start('IntersectionScene'))
- ✅ Registry bridge preserved (setSignData)
- ✅ Quality scoring preserved with customization bonuses
