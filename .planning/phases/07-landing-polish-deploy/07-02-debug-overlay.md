# Plan 07-02: Debug Overlay

## Goal
In-game debug overlay for development that shows all live system values and allows hot-tuning config values.

## Changes

### 1. Create `src/game/systems/DebugOverlay.ts`
- Toggle with backtick (`) or D key
- Only instantiated when `import.meta.env.DEV` is true
- Semi-transparent overlay panel on game canvas
- Shows real-time values:
  - Score, Time Remaining, Elapsed
  - Confidence (current, floor, drain state)
  - Fatigue (left/right arm value, active arm, isResting, isRaised)
  - Visibility cone angle (current degrees)
  - Weather state, sign degradation
  - Active events, events triggered count
  - NPC count (group size)
  - Traffic density (active car count)
  - FPS
- Slider controls for hot-tuning:
  - Confidence gain/loss multiplier
  - Fatigue drain rate
  - Event frequency multiplier

### 2. Wire into IntersectionScene
- Conditionally create DebugOverlay in create()
- Pass references to all systems
- Update in game loop

## Success Criteria
- Backtick or D toggles overlay on/off
- All system values update in real-time
- Sliders modify config values without rebuild
- Only appears in dev mode
