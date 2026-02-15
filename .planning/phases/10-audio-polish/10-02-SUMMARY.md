---
phase: 10-audio-polish
plan: 02
subsystem: audio
tags: [tone.js, brown-noise, ambient, audio-config, web-audio]

# Dependency graph
requires:
  - phase: 10-audio-polish plan 01
    provides: Tone.js installed as dependency
provides:
  - AUDIO_CONFIG centralized constants for all audio systems
  - AmbientSystem with Tone.js brown noise street traffic
affects: [10-03 music system, 10-04 integration, 12 debug tuning]

# Tech tracking
tech-stack:
  added: [tone.js]
  patterns: [centralized audio config, Tone.js Noise->Filter->AutoFilter->Gain chain, Phaser registry pattern for audio systems]

key-files:
  created:
    - src/game/config/audioConfig.ts
    - src/game/systems/AmbientSystem.ts
  modified: []

key-decisions:
  - "All audio magic numbers centralized in AUDIO_CONFIG — no hardcoded values in system classes"
  - "AmbientSystem uses connectTo() pattern — does NOT connect to destination, mixer wires it later"
  - "Brown noise + lowpass at 250Hz + slow AutoFilter sweep = distant street traffic feel"

patterns-established:
  - "Audio config pattern: all systems import from AUDIO_CONFIG, no inline constants"
  - "Audio system lifecycle: constructor builds chain, connectTo() wires output, start/stop/destroy manage state"

# Metrics
duration: 1min
completed: 2026-02-15
---

# Phase 10 Plan 02: Ambient System & Audio Config Summary

**Brown noise ambient street traffic system with Tone.js Noise->Filter->AutoFilter->Gain chain, plus centralized AUDIO_CONFIG with all volume/frequency/timing constants for every audio system**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-15T08:15:36Z
- **Completed:** 2026-02-15T08:16:55Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Centralized audio config with tuning constants for master, ambient, music, cues, and SFX systems
- AmbientSystem that produces continuous brown noise filtered to sound like distant street traffic
- Subtle filter sweep variation via AutoFilter so ambient doesn't sound like static
- Clean lifecycle: start (fade-in), stop (fade-out), connectTo (mixer wiring), destroy (cleanup)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create audioConfig.ts with centralized audio constants** - `c106187` (feat)
2. **Task 2: Create AmbientSystem with Tone.js street noise** - `cc28472` (feat)

## Files Created/Modified
- `src/game/config/audioConfig.ts` - Centralized audio constants for all systems (master, layers, ambient, music, cues, sfx)
- `src/game/systems/AmbientSystem.ts` - Continuous ambient street noise using Tone.js Noise + Filter + AutoFilter + Gain chain

## Decisions Made
- All audio constants centralized in AUDIO_CONFIG — AmbientSystem has zero magic numbers
- AmbientSystem does not connect to destination — exposes connectTo() for the mixer to wire in Plan 03/04
- Brown noise chosen over white/pink for low-rumble street feel; lowpass at 250Hz cuts harsh highs
- AutoFilter at 0.08Hz (very slow sweep) adds subtle breathing variation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Tone.js dependency**
- **Found during:** Task 2 setup
- **Issue:** Tone.js not yet installed (Plan 01 installs it but runs in parallel)
- **Fix:** Ran `npm install tone`
- **Files modified:** package.json, package-lock.json
- **Verification:** `node -e "require('tone')"` succeeds, build passes
- **Committed in:** included in task commits

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Expected per plan instructions — Tone.js needed for AmbientSystem to build.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- audioConfig.ts ready to be consumed by MusicSystem (Plan 03), reactive cues, and SFX enhancement (Plan 04)
- AmbientSystem ready to be wired into AudioMixerSystem once mixer is built (Plan 01/04)
- connectTo() pattern established for all audio systems to follow

---
*Phase: 10-audio-polish*
*Completed: 2026-02-15*
