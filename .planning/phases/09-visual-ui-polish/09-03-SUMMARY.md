---
phase: 09-visual-ui-polish
plan: 03
subsystem: ui
tags: [phaser, paper-craft, intersection, rendering, paperArt]

requires:
  - phase: 09-01
    provides: paletteConfig.ts and paperArt.ts utility functions
provides:
  - Rewritten drawIntersection() with layered construction paper aesthetic
  - Masking tape lane markings, crosswalks, and stop lines
  - Corner environmental dressing (buildings with window cutouts, trees with wobble)
  - Global paper grain overlay fixed to camera
affects: [09-visual-ui-polish]

tech-stack:
  added: []
  patterns: [layered depth rendering, paperArt utility composition]

key-files:
  created: []
  modified:
    - src/game/scenes/IntersectionScene.ts

key-decisions:
  - "Trees use separate Graphics objects per canopy for independent wobble animation"
  - "Grass corners use slightly varied shades (+/- hex offsets) to simulate different paper sheets"
  - "Paper grain overlay at depth 200 with scrollFactor 0 so it stays fixed to camera viewport"

patterns-established:
  - "Layered depth ordering: sky(0) -> grass(1) -> sidewalks(2) -> roads(3) -> markings(4) -> dressing(5) -> grain(200)"
  - "All intersection colors sourced from PALETTE — no hardcoded hex in drawIntersection()"

duration: 8min
completed: 2026-02-14
---

# Plan 09-03: Intersection Background Visual Upgrade Summary

**Intersection rewritten as layered construction paper diorama with masking tape markings, scissor-cut edges, paper cutout buildings/trees, and global grain overlay**

## Performance

- **Duration:** ~8 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced flat digital rectangle intersection with 6-layer construction paper diorama (sky, grass, sidewalks, roads, markings, dressing)
- Lane markings, crosswalks, and stop lines now use drawMaskingTapeStrip() with ragged edges
- Corner environmental dressing: 6 buildings with window cutouts and paper shadows, 5 trees with popsicle stick trunks and wobbling canopies
- Global paper grain overlay at depth 200 with scrollFactor 0

## Files Created/Modified
- `src/game/scenes/IntersectionScene.ts` - Rewritten drawIntersection() method, added paperArt/PALETTE imports, added tree canopy wobble in update(), added grain overlay in create()

## Decisions Made
- Trees rendered as individual Graphics objects (not shared) so each canopy can wobble independently via rotation
- Building window cutouts use PALETTE.asphalt at 0.6 alpha to show "dark interior"
- Grass corner shades vary by small hex offsets to simulate different construction paper sheets layered on the craft table

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
None.

## Next Phase Readiness
- Intersection is fully paper-craft styled, ready for any remaining 09-xx visual polish plans
- Tree wobble animation active in update() loop

---
*Phase: 09-visual-ui-polish*
*Completed: 2026-02-14*
