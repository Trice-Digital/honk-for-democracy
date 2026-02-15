---
phase: 10-audio-polish
plan: 01
subsystem: audio
tags: [tone.js, web-audio, mixer, gain-control, audio-layers]

# Dependency graph
requires:
  - phase: 07-audio
    provides: "AudioSystem with procedural Web Audio API SFX"
provides:
  - "AudioMixerSystem with 4-layer gain control (ambient, music, cues, sfx)"
  - "Tone.js initialized and startup-gated alongside existing audio"
  - "AudioSystem.setVolume() for mixer-coordinated volume control"
affects: [10-02, 10-03, 10-04]

# Tech tracking
tech-stack:
  added: [tone.js 15.x]
  patterns: [per-layer audio gain bus, dual audio context coordination, registry-based system sharing]

key-files:
  created: [src/game/systems/AudioMixerSystem.ts]
  modified: [src/game/systems/AudioSystem.ts, src/game/scenes/IntersectionScene.ts]

key-decisions:
  - "Separate AudioContexts for Web Audio API (AudioSystem) and Tone.js (AudioMixerSystem) — simpler, avoids context sharing pitfalls"
  - "Volume coordination via setVolume() method rather than bridging audio graph nodes across contexts"
  - "Default layer volumes in dB: ambient -16, music -14, cues -12, sfx -10"

patterns-established:
  - "AudioMixerSystem registry pattern: same create-or-reuse as AudioSystem"
  - "User gesture gates both audio systems in single first-click handler"
  - "Mute toggle controls both AudioSystem and AudioMixerSystem master mute"

# Metrics
duration: 2 min
completed: 2026-02-15
---

# Phase 10 Plan 01: Audio Mixer Foundation Summary

**Tone.js AudioMixerSystem with 4-layer gain control (ambient, music, cues, sfx) wired into IntersectionScene alongside existing Web Audio API AudioSystem**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T08:15:31Z
- **Completed:** 2026-02-15T08:17:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created AudioMixerSystem with 4 Tone.js Gain channels and master gain bus
- Added setVolume()/getVolume() to AudioSystem for mixer-coordinated volume
- Wired AudioMixerSystem into IntersectionScene with registry pattern, user gesture gating, and unified mute toggle
- All existing audio behavior preserved — playReactionSound and game event sounds unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Install Tone.js, create AudioMixerSystem, wire into scene** - `fb57647` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `src/game/systems/AudioMixerSystem.ts` - Master mixer with per-layer gain control, mute per layer, master mute, Phaser registry helpers
- `src/game/systems/AudioSystem.ts` - Added baseVolume field, setVolume()/getVolume() methods, refactored hardcoded 0.3 to use baseVolume
- `src/game/scenes/IntersectionScene.ts` - Import and create AudioMixerSystem, init on user gesture, mute toggle controls both systems

## Decisions Made
- Kept AudioSystem on its own AudioContext and AudioMixerSystem on Tone.js context (separate contexts, simpler than bridging)
- Used volume coordination via setVolume() method rather than cross-context audio graph wiring
- Default dB levels: ambient -16, music -14, cues -12, sfx -10 (from plan spec)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AudioMixerSystem foundation in place with all 4 layer channels
- Ready for Plan 02 (ambient system), Plan 03 (music system), Plan 04 (reactive cues)
- Each subsequent plan can connect to its layer via `mixerSystem.getLayerGain('ambient'|'music'|'cues')`

---
*Phase: 10-audio-polish*
*Completed: 2026-02-15*
