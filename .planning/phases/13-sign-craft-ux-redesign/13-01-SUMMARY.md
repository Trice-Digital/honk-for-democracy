---
phase: 13-sign-craft-ux-redesign
plan: 01
subsystem: sign-config-data
tags: [config, materials, fonts, decorations, data-layer]
dependency_graph:
  requires: []
  provides: [expanded-materials, expanded-fonts, preset-messages, material-groups]
  affects: [sign-editor, sign-craft-scene]
tech_stack:
  added: []
  patterns: [config-driven-data]
key_files:
  created: []
  modified:
    - src/game/config/signConfig.ts
    - src/lib/signMaterials.ts
    - src/lib/signDecorations.ts
    - src/layouts/Layout.astro
    - src/lib/signEditor.ts
decisions:
  - Expanded material system from 4 to 13 swatches with color variants
  - Removed tape decorations, kept emoji stickers only
  - Added baseColor field to SignMaterial for UI swatch rendering
  - All new Google Fonts loaded via Astro layout (not dynamically)
metrics:
  duration_seconds: 282
  tasks_completed: 3
  files_modified: 5
  commits: 3
  completed_date: 2026-02-15
---

# Phase 13 Plan 01: Expand Sign Config Data Layer Summary

**One-liner:** Expanded sign material system to 13 color variants (cardboard x4, posterboard x4, foam board x3, wood x2), 8 Google Fonts, 9 text colors, and 15 preset messages for randomize feature

## Context

This plan established the data foundation for the Sign Craft UX redesign (Phase 13). All downstream UI work (Plans 02-03) depends on this expanded configuration. The separation of data from UI keeps each plan focused and testable.

## What Was Built

### Task 1: Expanded signConfig.ts (commit f042067)

**Materials (4 → 13):**
- **Cardboard variants (4):** kraft (#c4956a), red (#b85c4a), blue (#6a8fb8), green (#7a9a6a)
- **Posterboard variants (4):** white (#f5f0e8), yellow (#fbbf24), pink (#f472b6), sky (#7dd3fc)
- **Foam Board variants (3):** white (#e8e8e8), green (#86efac), purple (#c4b5fd)
- **Wood Plank variants (2):** light (gradient #DEB887→#B8860B), dark (gradient #8B7355→#5C4033)

**Fonts (8):**
Bangers, Permanent Marker, Bungee, Caveat, Fredoka, Protest Guerrilla, Rubik Mono One, Shrikhand

**Colors (9):**
Black, White, Red, Blue, Green, Yellow, Orange, Purple, Hot Pink

**Preset Messages (15):**
'HONK FOR DEMOCRACY', 'HONK IF YOU CARE', 'RESIST', 'PEOPLE OVER PROFIT', 'WE THE PEOPLE', 'NOT ON OUR WATCH', 'USE YOUR VOICE', 'STAND UP SPEAK OUT', 'ACCOUNTABILITY NOW', 'PROTECT OUR RIGHTS', 'NO KINGS', 'POWER TO THE PEOPLE', 'ENOUGH IS ENOUGH', 'HONK HONK HONK', 'DEMOCRACY IS NOT A SPECTATOR SPORT'

**New Exports:**
- `PRESET_MESSAGES` constant
- `getMaterialGroups()` helper function for UI organization (groups materials by base type with emoji labels)
- Added `baseColor` field to `SignMaterial` interface (hex string or CSS gradient for swatch rendering)

### Task 2: Color Variant Texture Generation (commit caeb8fa)

**signMaterials.ts:**
- Refactored `drawCardboard()`, `drawPosterboard()`, `drawFoamBoard()`, `drawWood()` to accept optional `baseColor` parameter
- Added all 13 material IDs to `generateMaterialTexture()` switch statement
- Color variants use same drawing logic as base materials but with tinted base colors
- Wood-dark variant uses darker grain colors (#5C4033, #3B2B1F, #4A3728, #6B5744)

**signDecorations.ts:**
- Removed `TAPE_DUCT`, `TAPE_WASHI`, `TAPE_MASKING` constants entirely
- Cleared `DECORATIONS` array (stickers remain via `EMOJI_CATEGORIES`)
- Updated file documentation to remove tape references
- `DecorationDef` interface category changed from `'sticker' | 'tape'` to `'sticker'`

### Task 3: Google Fonts Loading (commit 86cc2ba)

**Layout.astro:**
Updated Google Fonts link to load all 8 sign fonts plus Patrick Hand (for UI):
```
Bangers, Bungee, Caveat (weight 700), Fredoka (weight 600), Patrick Hand, Permanent Marker, Protest Guerrilla, Rubik Mono One, Shrikhand
```

**signEditor.ts:**
Updated `googleFonts` array in constructor to preload all 8 sign fonts as fallback.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: ✅ PASS (only pre-existing errors in EventSystem.ts, MusicSystem.ts, ReactiveCueSystem.ts - unrelated to this work)
- 13 materials defined: ✅ VERIFIED
- 8 fonts defined: ✅ VERIFIED
- 9 colors defined: ✅ VERIFIED
- 15 preset messages: ✅ VERIFIED
- `getMaterialGroups()` exported: ✅ VERIFIED
- All 13 material IDs in texture generator: ✅ VERIFIED
- Tape decorations removed: ✅ VERIFIED (no tape references in signDecorations.ts)
- Google Fonts loaded: ✅ VERIFIED (Shrikhand, Protest Guerrilla in Layout.astro)

## Success Criteria Met

✅ All config data expanded and compilable
✅ No UI changes - existing SignCraftScene still works (uses first entries of each array)
✅ New material IDs produce textures (all 13 cases in switch)
✅ Tape removed, stickers preserved
✅ Fonts load via Astro layout and signEditor preload

## Self-Check: PASSED

All claimed artifacts verified:

**Files:**
- ✅ src/game/config/signConfig.ts exists
- ✅ src/lib/signMaterials.ts exists
- ✅ src/lib/signDecorations.ts exists
- ✅ src/layouts/Layout.astro exists
- ✅ src/lib/signEditor.ts exists

**Commits:**
- ✅ Commit f042067 exists (Task 1: signConfig expansion)
- ✅ Commit caeb8fa exists (Task 2: material textures + tape removal)
- ✅ Commit 86cc2ba exists (Task 3: Google Fonts loading)

**Exports:**
- ✅ PRESET_MESSAGES exported
- ✅ getMaterialGroups exported
- ✅ Material variants in texture generator (cardboard-red confirmed)
