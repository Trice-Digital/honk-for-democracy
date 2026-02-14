# Plan 06-01: Score Screen

## Goal
Replace the inline session-over overlay with a dedicated ScoreScene that shows full stats in a bold, screenshot-ready layout with the player's sign message featured.

## Tasks

1. Create `src/game/scenes/ScoreScene.ts`
   - Receives game state + sign data via Phaser registry
   - Full-screen scene (not overlay) with dark background
   - Layout sections:
     - Title: "SESSION OVER" or "YOU WENT HOME EARLY" (based on endReason)
     - Player's sign message featured prominently (styled like the sign preview)
     - Final score (large, gold)
     - Stats grid: Cars Reached, Time Stood, Sign Rating, Confidence at End
     - Reaction breakdown with emoji + counts
   - "Continue" button (goes to ActivismScene)
   - "Play Again" button (goes to SignCraftScene)

2. Create score config `src/game/config/scoreConfig.ts`
   - Sign rating labels (reuse from SignCraftScene)
   - Time formatting helper
   - Score grade thresholds (A/B/C/D/F based on score)

3. Store end-of-session state in registry
   - IntersectionScene stores final GameState + SignData before transitioning
   - ScoreScene reads from registry

4. Update `gameConfig.ts` to register ScoreScene

5. Update IntersectionScene.showSessionOver() to transition to ScoreScene instead of showing inline overlay

6. Fix raise sign mechanic: add click/tap support (currently hold-only)
   - Tap RAISE button = toggle raised state for a brief window (0.8s auto-lower)
   - Hold still works (raise while held, lower on release)
   - Tap during positive reaction = bonus, tap during negative = deflect, tap at nothing = wasted fatigue

## Verification
- Session ends -> ScoreScene shows with all stats
- Sign message is visible and styled
- Play Again returns to SignCraftScene
- Continue proceeds to ActivismScene (created in 06-02)
- Raise sign works with both tap and hold
