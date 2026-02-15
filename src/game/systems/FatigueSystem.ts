import type { GameStateManager } from './GameStateManager';
import type { FatigueConfig } from '../config/fatigueConfig';
import { FATIGUE_DEFAULTS } from '../config/fatigueConfig';
import type { SignMaterial } from '../config/signConfig';
import type { DifficultyConfig } from '../config/difficultyConfig';

/**
 * FatigueSystem — Manages arm fatigue drain, recovery, and the raise sign mechanic.
 *
 * Fatigue drains over time. Rate affected by:
 *   - Sign material weight (fatigueMultiplier from signConfig)
 *   - Difficulty (fatigueDrainMultiplier from difficultyConfig)
 *   - Raise state (drains faster while raised)
 *
 * Player actions:
 *   - Switch arms: instant partial recovery + cooldown
 *   - Rest: sign drops, reduced visibility, fatigue recovers
 *   - Raise sign: active timing mechanic (bonus/deflect)
 *
 * Cone shrink is driven by fatigue level (mapped in getConeWidth).
 *
 * @stateAccess Uses individual getters (getFatigue(), getIsRaised()). Reads specific values frequently in update() — individual getters avoid destructuring overhead.
 */

export class FatigueSystem {
  private gameState: GameStateManager;
  private config: FatigueConfig;
  private materialWeight: number;
  private difficultyMultiplier: number;
  private switchCooldownRemaining: number = 0;

  constructor(
    gameState: GameStateManager,
    material: SignMaterial,
    difficulty: DifficultyConfig,
    config?: Partial<FatigueConfig>,
  ) {
    this.gameState = gameState;
    this.config = { ...FATIGUE_DEFAULTS, ...config };
    this.materialWeight = material.fatigueMultiplier;
    this.difficultyMultiplier = difficulty.fatigueDrainMultiplier;
  }

  /**
   * Called every frame. Handles fatigue drain, rest recovery, and raise drain.
   */
  update(delta: number): void {
    const state = this.gameState.getState();
    if (!state.isSessionActive) return;

    const deltaSec = delta / 1000;

    // Update switch cooldown
    if (this.switchCooldownRemaining > 0) {
      this.switchCooldownRemaining -= deltaSec;
    }

    if (state.isResting) {
      // Resting: recover fatigue
      const recovery = this.config.restRecoveryRate * deltaSec;
      this.gameState.setArmFatigue(state.armFatigue - recovery);
    } else if (state.isRaised) {
      // Raised: drain faster (base + raise extra)
      const drain = (this.config.baseDrainRate + this.config.raiseDrainRate)
        * this.materialWeight
        * this.difficultyMultiplier
        * deltaSec;
      this.gameState.setArmFatigue(state.armFatigue + drain);
    } else {
      // Normal: base drain
      const drain = this.config.baseDrainRate
        * this.materialWeight
        * this.difficultyMultiplier
        * deltaSec;
      this.gameState.setArmFatigue(state.armFatigue + drain);
    }
  }

  /**
   * Switch arms. Partial fatigue recovery + cooldown.
   * Returns true if switch happened.
   */
  trySwitchArm(): boolean {
    if (this.switchCooldownRemaining > 0) return false;

    const state = this.gameState.getState();
    this.gameState.switchArm();
    this.gameState.setArmFatigue(
      Math.max(0, state.armFatigue - this.config.switchArmRecovery),
    );
    this.switchCooldownRemaining = this.config.switchArmCooldown;
    return true;
  }

  /**
   * Toggle rest state.
   */
  toggleRest(): void {
    const state = this.gameState.getState();
    this.gameState.setResting(!state.isResting);
  }

  /**
   * Set raise state.
   */
  setRaised(raised: boolean): void {
    this.gameState.setRaised(raised);
  }

  /**
   * Check if the sign is currently raised (for reaction scoring).
   */
  isRaised(): boolean {
    return this.gameState.getState().isRaised;
  }

  /**
   * Check if switch arm is on cooldown.
   */
  canSwitchArm(): boolean {
    return this.switchCooldownRemaining <= 0;
  }

  getSwitchCooldownRemaining(): number {
    return Math.max(0, this.switchCooldownRemaining);
  }

  /**
   * Get the current cone width in degrees based on fatigue level.
   * Cone starts shrinking after the threshold.
   */
  getConeWidth(): number {
    const fatigue = this.gameState.getState().armFatigue;
    const { coneWidthFresh, coneWidthExhausted, coneShrinkThreshold } = this.config;

    if (fatigue <= coneShrinkThreshold) {
      return coneWidthFresh;
    }

    // Linear interpolation from threshold to 100
    const t = (fatigue - coneShrinkThreshold) / (100 - coneShrinkThreshold);
    return coneWidthFresh + (coneWidthExhausted - coneWidthFresh) * t;
  }

  /**
   * Get the visibility factor for rest mode.
   * 1.0 = full visibility, less = reduced.
   */
  getVisibilityFactor(): number {
    const state = this.gameState.getState();
    return state.isResting ? this.config.restVisibilityFactor : 1.0;
  }

  /**
   * Get raise mechanic config for use by reaction scoring.
   */
  getRaiseConfig() {
    return {
      raisePositiveBonus: this.config.raisePositiveBonus,
      deflectScoreValue: this.config.deflectScoreValue,
      deflectConfidenceBonus: this.config.deflectConfidenceBonus,
    };
  }

  destroy(): void {
    // No event listeners to clean up (FatigueSystem doesn't listen to events)
  }
}
