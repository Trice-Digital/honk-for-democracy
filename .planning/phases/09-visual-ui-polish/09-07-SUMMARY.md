---
phase: 09-visual-ui-polish
plan: 07
subsystem: ui
tags: [css, phaser, paper-craft, neobrutalist, landing-page, score-scene, activism-scene]

requires:
  - phase: 09-01
    provides: "PALETTE config and paperArt utilities"
provides:
  - "Landing page with protest sign hero, neobrutalist CTA, masking tape badge"
  - "Score scene with cardboard background, paper grain, scissor-cut panels, masking tape dividers"
  - "Activism scene with kraft paper background, scissor-cut resource cards, neobrutalist buttons"
affects: [social-share, visual-polish]

tech-stack:
  added: []
  patterns: ["protest-sign hero (black board, white letters)", "neobrutalist buttons (hard offset shadow, press-into-shadow)", "masking tape dividers", "scissor-cut paper panels"]

key-files:
  created: []
  modified:
    - "src/pages/index.astro"
    - "src/game/scenes/ScoreScene.ts"
    - "src/game/scenes/ActivismScene.ts"
    - "src/layouts/Layout.astro"

key-decisions:
  - "Hero title styled as black protest sign board (black bg, white text, slight rotation) matching Scott's real sign"
  - "CTA button uses safety yellow (#fbbf24) with neobrutalist hard shadow instead of previous red"
  - "Badge restyled as masking tape strip (semi-transparent off-white) instead of yellow highlight"
  - "ActivismScene background changed to kraft paper (#8b7355) for visual differentiation from score scene"
  - "Added Google Fonts <link> tag to Layout.astro head for performance (parallel loading vs CSS @import)"

patterns-established:
  - "Neobrutalist button pattern: hard offset shadow rectangle behind main button, press-into-shadow on click"
  - "Paper cutout panel pattern: drawPaperShadow + drawScissorCutRect for UI panels"
  - "Masking tape divider pattern: drawMaskingTapeStrip replacing gray lines between sections"

duration: 3min
completed: 2026-02-15
---

# Phase 09 Plan 07: Screen Reskins Summary

**Landing page, score scene, and activism scene reskinned with Paper Mario Protest aesthetic: protest sign hero title, neobrutalist CTA, cardboard/kraft paper backgrounds, scissor-cut panels, masking tape dividers, and PALETTE/FONTS constants throughout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T04:03:41Z
- **Completed:** 2026-02-15T04:06:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Landing page hero title restyled as a black protest sign board with white text and slight rotation, matching Scott's real sign aesthetic
- CTA button converted to neobrutalist style with safety yellow background, hard offset shadow, and press-into-shadow hover effect
- Score scene upgraded with cardboard background, paper grain overlay, scissor-cut stats panel, masking tape dividers, paper shadow on grade badge, and neobrutalist action-blue Continue button
- Activism scene background changed to kraft paper (#8b7355), resource buttons redrawn as scissor-cut paper cutout cards with drop shadows, play-again button given neobrutalist treatment
- All Phaser text references updated to use FONTS.ui constant and PALETTE colors
- Google Fonts `<link>` tag added to Layout.astro for parallel font loading

## Task Commits

All tasks committed atomically in a single commit (both tasks modify only listed files, no intermediate dependencies):

1. **Task 1: Landing page paper craft / protest poster reskin** - index.astro + Layout.astro
2. **Task 2: Score scene and activism scene paper polish** - ScoreScene.ts + ActivismScene.ts

## Files Created/Modified
- `src/pages/index.astro` - Landing page with protest sign hero, masking tape badge, neobrutalist CTA, paper cutout step numbers
- `src/game/scenes/ScoreScene.ts` - Score scene with cardboard bg, paper grain, scissor-cut stats panel, masking tape dividers, neobrutalist buttons
- `src/game/scenes/ActivismScene.ts` - Activism scene with kraft paper bg, scissor-cut resource cards, neobrutalist play-again button
- `src/layouts/Layout.astro` - Added Google Fonts link tag, updated theme-color meta to cardboard

## Decisions Made
- Hero title styled as black sign board rather than text-shadow-on-transparent to match the plan's protest sign specification
- CTA changed from stoplight red to safety yellow per plan spec (neobrutalist with dark text on bright background)
- Badge styled as masking tape strip (semi-transparent off-white) for craft-table feel
- Activism scene uses darker kraft paper (#8b7355) to visually differentiate from score scene's cardboard (#c5a059)
- Resource buttons use invisible hit rectangles over Graphics-drawn scissor-cut cards for clean hover interactions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Google Fonts link to Layout.astro**
- **Found during:** Task 1 (Landing page reskin)
- **Issue:** Layout.astro had preconnect links but no actual Google Fonts stylesheet link; fonts loaded only via CSS @import in global.css which blocks rendering
- **Fix:** Added `<link href="...fonts.googleapis.com..." rel="stylesheet" />` to Layout head for parallel loading
- **Files modified:** src/layouts/Layout.astro
- **Verification:** Build succeeds, fonts load correctly
- **Committed in:** task commit

**2. [Rule 1 - Bug] Updated theme-color meta tag**
- **Found during:** Task 1 (Landing page reskin)
- **Issue:** theme-color was #0f0f1a (dark theme remnant) but all pages now use cardboard/paper backgrounds
- **Fix:** Changed to #c5a059 (cardboard color)
- **Files modified:** src/layouts/Layout.astro
- **Verification:** Build succeeds
- **Committed in:** task commit

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes improve consistency. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three screen reskins complete (landing, score, activism)
- Visual cohesion established across all non-gameplay screens
- Ready for Plan 08 (remaining visual polish tasks)

---
*Phase: 09-visual-ui-polish*
*Completed: 2026-02-15*
