/**
 * DifficultyConfig — Tuning knobs that multiply base values.
 *
 * Systems don't know about difficulty. They read their config values.
 * Swapping difficulty = swapping one config object.
 */

export interface DifficultyConfig {
  label: string;
  vibe: string;

  // Traffic
  trafficSpeedMultiplier: number;
  trafficDensityMultiplier: number;
  lightCycleDurationMultiplier: number;

  // Reactions
  positiveReactionWeight: number;
  neutralReactionWeight: number;
  negativeReactionWeight: number;

  // Events (Phase 5)
  eventFrequencyMultiplier: number;
  eventIntensityMultiplier: number;

  // Fatigue (Phase 4)
  fatigueDrainMultiplier: number;

  // Weather (Phase 5)
  weatherDurabilityMultiplier: number;
}

export const DIFFICULTY_EASY: DifficultyConfig = {
  label: 'First Time Out',
  vibe: 'Your first protest. Manageable.',
  trafficSpeedMultiplier: 0.7,
  trafficDensityMultiplier: 0.6,
  lightCycleDurationMultiplier: 1.3,
  positiveReactionWeight: 0.70,
  neutralReactionWeight: 0.20,
  negativeReactionWeight: 0.10,
  eventFrequencyMultiplier: 0.5,
  eventIntensityMultiplier: 0.6,
  fatigueDrainMultiplier: 0.6,
  weatherDurabilityMultiplier: 1.4,
};

export const DIFFICULTY_MEDIUM: DifficultyConfig = {
  label: 'Regular',
  vibe: 'The real experience. Balanced.',
  trafficSpeedMultiplier: 1.0,
  trafficDensityMultiplier: 1.0,
  lightCycleDurationMultiplier: 1.0,
  positiveReactionWeight: 0.60,
  neutralReactionWeight: 0.25,
  negativeReactionWeight: 0.15,
  eventFrequencyMultiplier: 1.0,
  eventIntensityMultiplier: 1.0,
  fatigueDrainMultiplier: 1.0,
  weatherDurabilityMultiplier: 1.0,
};

export const DIFFICULTY_HARD: DifficultyConfig = {
  label: 'Rush Hour',
  vibe: 'Sunday 4-6 PM on the overpass. Chaos.',
  trafficSpeedMultiplier: 1.4,
  trafficDensityMultiplier: 1.6,
  lightCycleDurationMultiplier: 0.7,
  positiveReactionWeight: 0.45,
  neutralReactionWeight: 0.25,
  negativeReactionWeight: 0.30,
  eventFrequencyMultiplier: 1.5,
  eventIntensityMultiplier: 1.4,
  fatigueDrainMultiplier: 1.5,
  weatherDurabilityMultiplier: 0.7,
};

export function getDifficultyConfig(tier: 'easy' | 'medium' | 'hard'): DifficultyConfig {
  switch (tier) {
    case 'easy': return DIFFICULTY_EASY;
    case 'medium': return DIFFICULTY_MEDIUM;
    case 'hard': return DIFFICULTY_HARD;
  }
}
