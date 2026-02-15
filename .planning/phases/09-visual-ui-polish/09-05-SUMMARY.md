---
phase: 09-visual-ui-polish
plan: 05
status: complete
completed: 2026-02-14
files_modified:
  - src/game/scenes/IntersectionScene.ts
---

## What was done

### Task 1: Paper speech bubble reactions and marker-font score floaters

- **Speech bubbles**: Reactions now render inside paper cutout speech bubbles with scissor-cut edges (`drawScissorCutRect`), hard offset drop shadows (`PALETTE.shadowDark`), and triangle tails pointing down toward the car. Negative reactions get a tinted pink bubble (`0xf5d0d0`), positive/neutral use `PALETTE.paperWhite`.
- **Paper flutter animation**: Bubbles float up with random x-drift (-20 to +20px), wobble rotation, and fade out. Stopped cars produce larger, longer-lasting bubbles (1.2x scale, 1600ms); moving cars produce smaller, faster ones (0.9x scale, 1100ms).
- **Score floaters**: Use Bangers font with `PALETTE.markerBlack` stroke (3px). Scale-bounce on appear (0.5 -> 1.1 -> 1.0 over 200ms). Bonus/deflect reactions use 28px font, normal use 22px. Colors from PALETTE (`stoplightGreen` for positive, `stoplightRed` for negative).
- **Car behavior contrast**: Stopped cars get larger speech bubbles and longer animation durations, making the red/green strategic difference visually obvious.
- **"STOPPED TRAFFIC x2" banner**: Paper cutout banner (`PALETTE.stoplightRed` background, `PALETTE.safetyYellow` Bangers text with marker stroke) slides in from top when all traffic lights are red, slides back up when lights go green.

### Task 2: Neobrutalist HUD bars and action buttons

- **All HUD cards**: Score, timer, confidence, fatigue, and mute button cards now have hard offset shadows (`PALETTE.shadowDark` at `PALETTE.shadowAlpha`), thick marker borders (3px `PALETTE.markerBlack`), and 4px border radius.
- **Score text**: 32px Bangers font, `PALETTE.safetyYellow` color, 4px marker black stroke.
- **Timer text**: 30px Bangers font, `PALETTE.paperWhite` color, 4px marker black stroke. Red flash when time is low.
- **Action buttons (Raise, Switch Arms, Rest)**: Neobrutalist style with hard offset shadow graphics behind each container. On pointerdown, buttons translate +2px right, +2px down (press-into-shadow effect). On pointerup/pointerout, position restores. All use PALETTE colors (`safetyYellow` for Raise, `actionBlue` for Switch, gray for Rest).
- **Mute button**: Same press-into-shadow effect on the paper card background.
- **Confidence and fatigue bars**: Bar backgrounds use `PALETTE.cardboard` (paper texture color) with 2px marker black stroke. Bar fill colors use PALETTE constants (`stoplightGreen`, `safetyYellow`, `stoplightRed`).
- **Fatigue bar traffic light hint**: Bar border color changes based on traffic phase -- green border (2.5px `PALETTE.stoplightGreen`) when traffic is red (push now!), yellow border (2px `PALETTE.safetyYellow`) when traffic is green (conserve energy).
- **All fonts**: Bangers ('Bangers', cursive) throughout. No Permanent Marker in HUD.

## Verification

- `npm run build` succeeds with no TypeScript errors
- Reactions display in paper speech bubbles with scissor-cut edges and drop shadows
- Score floaters use Bangers font with bounce animation
- Action buttons have neobrutalist style with thick borders, hard shadows, and press-into-shadow effect
- Confidence/fatigue bars have paper texture (cardboard) and marker-style borders
- Score and timer use marker-style font with thick stroke
- Fatigue bar border subtly color-codes to traffic phase
- "STOPPED TRAFFIC x2" banner appears during all-red phases
- No game logic was changed -- only visual rendering
