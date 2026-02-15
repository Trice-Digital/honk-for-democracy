---
phase: 10-audio-polish
plan: 03
subsystem: audio
tags: [tone.js, fm-synthesis, stadium-organ, reactive-cues, procedural-music, cowbell]

# Dependency graph
requires:
  - phase: 10-audio-polish plan 01
    provides: "AudioMixerSystem with music and cues layer channels"
  - phase: 10-audio-polish plan 02
    provides: "AUDIO_CONFIG constants and connectTo() pattern"
provides:
  - "MusicSystem with confidence-reactive stadium organ (3 energy levels)"
  - "ReactiveCueSystem with 5 cue types triggered at confidence thresholds"
affects: [10-04 integration, 12 debug tuning]

# Tech tracking
tech-stack:
  added: []
  patterns: [phrase-boundary energy transitions, threshold crossing detection, cooldown-gated cue triggering]

key-files:
  created:
    - src/game/systems/MusicSystem.ts
    - src/game/systems/ReactiveCueSystem.ts
  modified: []

key-decisions:
  - "Phrase-boundary transitions — energy changes wait until chord progression loops back to avoid jarring mid-phrase key switches"
  - "Threshold CROSSING detection (not just above/below) prevents cues firing every frame"
  - "Single FMSynth for organ stinger (fast arpeggio) rather than PolySynth — simpler, one voice at a time is enough for stingers"
  - "Cowbell uses periodic timer independent of threshold crossings — fires rhythmic bursts while at HIGH confidence"

patterns-established:
  - "Threshold crossing pattern: store previousConfidence, detect transitions with crossedAbove/crossedBelow helpers"
  - "Phrase-boundary transition: pendingEnergy flag applied at next phrase loop start"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 10 Plan 03: Music & Reactive Cue Systems Summary

**Stadium organ MusicSystem with 3 confidence-reactive energy levels (minor/sparse to major/triumphant) and ReactiveCueSystem with 5 procedural cue types (organ stinger, stomp-clap, cowbell, snare roll, tension drone) triggered at confidence threshold crossings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T08:19:00Z
- **Completed:** 2026-02-15T08:20:57Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- MusicSystem produces continuous stadium organ music via PolySynth(FMSynth) that shifts between 3 energy levels based on confidence
- Energy transitions happen at phrase boundaries — no jarring mid-phrase key changes
- ReactiveCueSystem fires 5 distinct cue types using threshold crossing detection with cooldown protection
- All sounds are procedural (Tone.js synthesis) — zero audio files needed
- Both systems follow established connectTo() pattern and read from AUDIO_CONFIG constants

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MusicSystem with confidence-reactive stadium organ** - `310561b` (feat)
2. **Task 2: Create ReactiveCueSystem with stadium crowd cues** - `1273498` (feat)

## Files Created/Modified
- `src/game/systems/MusicSystem.ts` - Procedural stadium organ with 3 energy levels (low=minor/sparse, mid=moderate, high=triumphant), phrase-boundary transitions, PolySynth(FMSynth)
- `src/game/systems/ReactiveCueSystem.ts` - 5 cue types: organ stinger (FMSynth), stomp-stomp-clap (NoiseSynth), cowbell (MetalSynth), snare roll (NoiseSynth), tension drone (FMSynth)

## Decisions Made
- Phrase-boundary transitions: pending energy changes are queued and applied when the chord progression loops back, preventing jarring mid-phrase switches
- Threshold crossing detection via previousConfidence/currentConfidence comparison — cues only fire on the frame where the threshold is crossed, not every frame while above it
- Cowbell operates on a periodic timer (cueIntervalMs) independent of threshold crossings — fires rhythmic bursts as long as confidence stays at HIGH
- Tension drone is the only continuous cue — starts on crossing below LOW, stops on crossing above LOW

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MusicSystem and ReactiveCueSystem ready to be wired into AudioMixerSystem via connectTo(mixer.getLayerGain('music'|'cues'))
- Plan 04 integration will connect both systems into IntersectionScene and feed confidence updates from game state
- Both systems have destroy() methods for proper cleanup

---
*Phase: 10-audio-polish*
*Completed: 2026-02-15*
