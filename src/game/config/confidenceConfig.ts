/**
 * ConfidenceConfig — Confidence meter tuning values.
 *
 * Config-driven. Confidence rises with positive reactions, falls with
 * negative ones, and drains slowly when nothing is happening.
 * Hitting 0% ends the session early.
 */

export interface ConfidenceConfig {
  /** Starting confidence (0-100) */
  startingConfidence: number;

  /** Minimum confidence (session ends at this value) */
  min: number;

  /** Maximum confidence */
  max: number;

  /**
   * Multiplier applied to reaction scoreValue to get confidence change.
   * e.g. honk (+10 score) * 0.8 = +8 confidence.
   */
  reactionToConfidenceMultiplier: number;

  /**
   * Seconds of no reaction before drain kicks in.
   */
  noDrainGracePeriod: number;

  /**
   * Confidence points drained per second during no-reaction streaks.
   */
  noReactionDrainRate: number;

  /**
   * Per-person confidence floor bonus.
   * groupSize * groupSizeFloorBonus = added to the effective floor.
   * e.g. 3 people * 3.0 = floor of 9 (confidence won't passively drain below 9).
   */
  groupSizeFloorBonus: number;

  /**
   * Default NPC group size for v1 (fixed).
   */
  defaultGroupSize: number;

  /**
   * Animation duration for smooth bar transitions (ms).
   */
  animationDurationMs: number;
}

export const CONFIDENCE_DEFAULTS: ConfidenceConfig = {
  startingConfidence: 30,
  min: 0,
  max: 100,
  reactionToConfidenceMultiplier: 0.8,
  noDrainGracePeriod: 5,
  noReactionDrainRate: 1.5,
  groupSizeFloorBonus: 3.0,
  defaultGroupSize: 3,
  animationDurationMs: 400,
};
