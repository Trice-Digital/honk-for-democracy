/**
 * FatigueConfig — Arm fatigue and raise sign mechanic tuning values.
 *
 * Config-driven. Fatigue drains over time (affected by sign material weight
 * and difficulty). Player can switch arms, rest, or raise the sign as an
 * active timing mechanic.
 */

export interface FatigueConfig {
  /** Base fatigue drain per second (before multipliers) */
  baseDrainRate: number;

  /** Maximum fatigue (0 = fresh, this value = exhausted) */
  maxFatigue: number;

  /** How much fatigue is recovered when switching arms (0-100) */
  switchArmRecovery: number;

  /** Cooldown between arm switches in seconds */
  switchArmCooldown: number;

  /** Fatigue recovery rate per second while resting */
  restRecoveryRate: number;

  /** Cone width multiplier while resting (1.0 = full, 0 = invisible) */
  restVisibilityFactor: number;

  // --- Raise sign mechanic ---

  /** Extra fatigue drain per second while sign is raised */
  raiseDrainRate: number;

  /** Score multiplier for positive reactions while sign is raised */
  raisePositiveBonus: number;

  /** Score value for deflecting a negative reaction (replaces negative score) */
  deflectScoreValue: number;

  /** Confidence boost for a successful deflect */
  deflectConfidenceBonus: number;

  // --- Cone shrink ---

  /** Cone width at 0% fatigue (degrees) */
  coneWidthFresh: number;

  /** Cone width at 100% fatigue (degrees) */
  coneWidthExhausted: number;

  /** Fatigue threshold (0-100) where cone starts shrinking */
  coneShrinkThreshold: number;
}

export const FATIGUE_DEFAULTS: FatigueConfig = {
  baseDrainRate: 2.0,
  maxFatigue: 100,
  switchArmRecovery: 25,
  switchArmCooldown: 3.0,
  restRecoveryRate: 8.0,
  restVisibilityFactor: 0.3,

  raiseDrainRate: 6.0,
  raisePositiveBonus: 1.5,
  deflectScoreValue: 2,
  deflectConfidenceBonus: 5,

  coneWidthFresh: 60,
  coneWidthExhausted: 30,
  coneShrinkThreshold: 40,
};
