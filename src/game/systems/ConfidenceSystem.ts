import type { GameStateManager } from './GameStateManager';
import type { ConfidenceConfig } from '../config/confidenceConfig';
import { CONFIDENCE_DEFAULTS } from '../config/confidenceConfig';

/**
 * ConfidenceSystem — Maps reactions to confidence changes and handles
 * no-reaction drain over time.
 *
 * Listens to GameStateManager events and calls addConfidence() to update.
 * Group size provides a floor below which passive drain won't push confidence.
 *
 * @stateAccess Uses getState() for full snapshot in update(). Listens to GameStateManager events for reaction handling.
 */

export class ConfidenceSystem {
  private gameState: GameStateManager;
  private config: ConfidenceConfig;

  constructor(gameState: GameStateManager, config?: Partial<ConfidenceConfig>) {
    this.gameState = gameState;
    this.config = { ...CONFIDENCE_DEFAULTS, ...config };

    // Listen for reactions and convert to confidence changes
    this.gameState.on('reaction', this.onReaction, this);
  }

  /**
   * Called every frame. Handles no-reaction drain.
   */
  update(delta: number): void {
    const state = this.gameState.getState();
    if (!state.isSessionActive) return;

    const timeSinceReaction = this.gameState.getTimeSinceLastReaction();

    // Only drain after the grace period
    if (timeSinceReaction > this.config.noDrainGracePeriod) {
      const floor = this.gameState.getConfidenceFloor();

      // Only drain if above the group-size floor
      if (state.confidence > floor) {
        const drain = this.config.noReactionDrainRate * (delta / 1000);
        // Don't drain below the floor
        const newConfidence = Math.max(floor, state.confidence - drain);
        const change = newConfidence - state.confidence;
        if (change !== 0) {
          this.gameState.addConfidence(change);
        }
      }
    }
  }

  /**
   * Handle a reaction event. Positive reactions boost confidence,
   * negative reactions reduce it.
   */
  private onReaction(event: { reactionId: string; scoreValue: number }): void {
    // Skip neutral reactions (score 0)
    if (event.scoreValue === 0) return;

    const confidenceChange = event.scoreValue * this.config.reactionToConfidenceMultiplier;
    this.gameState.addConfidence(confidenceChange);
  }

  destroy(): void {
    this.gameState.off('reaction', this.onReaction, this);
  }
}
