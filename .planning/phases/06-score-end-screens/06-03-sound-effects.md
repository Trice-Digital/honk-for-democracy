# Plan 06-03: Sound Effects and Audio Integration

## Goal
Add procedurally generated sound effects that differentiate reaction types during gameplay.

## Tasks

1. Create `src/game/systems/AudioSystem.ts`
   - Uses Web Audio API (no asset files needed)
   - Procedural sound generation for each reaction type:
     - Honk: short horn beep (square wave, ~400Hz, 0.15s)
     - Wave: soft chime (sine wave, ~800Hz, 0.1s)
     - Go Bananas: crowd cheer (noise burst + harmonics, 0.3s)
     - Peace sign: gentle ding (sine, ~1000Hz, 0.08s)
     - Nothing/Stare: silence
     - Thumbs down: low buzz (sawtooth, ~150Hz, 0.2s)
     - Middle finger: angry horn (square wave, ~200Hz, 0.3s, harsh)
     - Yelled at: distorted shout effect (noise + low freq, 0.25s)
     - Coal roller: diesel engine rumble (low noise, ~80Hz, 0.5s)
   - Volume control and mute toggle
   - Lazy AudioContext creation (user gesture required)

2. Integrate AudioSystem into IntersectionScene
   - Play sound on each reaction
   - Mute button in UI (top area)

3. Additional sounds:
   - Session start: brief fanfare
   - Session end: wind-down sound
   - Confidence zero: sad trombone
   - Raise sign: whoosh up sound
   - Deflect: shield clang

4. Register AudioSystem in game state for cross-scene access

## Verification
- Different reaction types produce distinct sounds
- Sounds play on mobile (after first touch gesture)
- Mute toggle works
- No audio errors in console
- Build still succeeds
