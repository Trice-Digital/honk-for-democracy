/**
 * audioConfig.ts — Centralized audio configuration for all audio systems.
 *
 * All volume levels (dB), frequency values (Hz), and timing constants
 * live here. No magic numbers in audio system classes.
 * Phase 12 debug overlay can adjust these for tuning.
 */

export const AUDIO_CONFIG = {
  master: {
    defaultVolume: -6, // dB
  },
  layers: {
    ambient: { defaultVolume: -16 }, // dB — quiet background
    music: { defaultVolume: -14 },
    cues: { defaultVolume: -12 },
    sfx: { defaultVolume: -10 },
  },
  ambient: {
    noiseType: 'brown' as const, // brown noise = low rumble, street-like
    filterFrequency: 250, // Hz — lowpass cutoff for street feel
    filterQ: 1.5,
    autoFilterFrequency: 0.08, // Hz — very slow filter sweep for variation
    autoFilterBaseFreq: 150, // Hz
    autoFilterOctaves: 1.5,
    fadeInTime: 2, // seconds
    fadeOutTime: 1.5, // seconds
  },
  music: {
    bpm: 110,
    organAttack: 0.02,
    organDecay: 0.3,
    organSustain: 0.4,
    organRelease: 0.8,
    // Confidence thresholds for music energy shifts
    lowThreshold: 30, // below this = minor/tense
    midThreshold: 60, // below this = moderate
    highThreshold: 80, // above this = triumphant
  },
  cues: {
    // Confidence thresholds for reactive audio cues
    lowConfidenceCue: 25, // play tense cue
    risingConfidenceCue: 60, // play building cue
    highConfidenceCue: 80, // play triumphant cue
    cueIntervalMs: 8000, // minimum ms between reactive cues
    stompClapBpm: 110, // matches music BPM
  },
  sfx: {
    honkVariants: 4,
    dopplerMinRate: 0.8,
    dopplerMaxRate: 1.3,
    dopplerDuration: 0.8, // seconds for pitch shift
  },
};
