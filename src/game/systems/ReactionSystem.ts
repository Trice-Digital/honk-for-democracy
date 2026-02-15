import Phaser from 'phaser';
import type { ReactionType } from '../config/reactionConfig';
import { getAdjustedWeights, rollReaction } from '../config/reactionConfig';
import type { DifficultyConfig } from '../config/difficultyConfig';

/**
 * ReactionSystem — Determines car reactions and produces visual feedback events.
 *
 * Config-driven. Same system works on any map. Weights come from DifficultyConfig.
 *
 * @stateAccess Does not read GameStateManager directly. Receives difficulty config at construction. Stateless — just rolls reactions.
 */

export interface ReactionEvent {
  reaction: ReactionType;
  worldX: number;
  worldY: number;
}

export class ReactionSystem extends Phaser.Events.EventEmitter {
  private weights: { id: string; weight: number }[];

  constructor(difficulty: DifficultyConfig) {
    super();
    this.weights = getAdjustedWeights(
      difficulty.positiveReactionWeight,
      difficulty.neutralReactionWeight,
      difficulty.negativeReactionWeight,
    );

    if (import.meta.env.DEV) {
      const totalWeight = this.weights.reduce((sum, w) => sum + w.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        console.warn(`[HFD] ReactionSystem: adjusted weights sum to ${totalWeight.toFixed(3)}, expected ~1.0`);
      }
    }
  }

  /**
   * Roll a reaction for a car that has been reached by the visibility cone.
   * Returns the reaction and emits a visual event.
   */
  react(worldX: number, worldY: number): ReactionEvent {
    const reaction = rollReaction(this.weights);
    const event: ReactionEvent = { reaction, worldX, worldY };
    this.emit('reaction', event);
    return event;
  }

  /**
   * Update weights (e.g., if sign quality affects reactions).
   * Called when sign multiplier is known (Phase 3).
   */
  updateWeights(difficulty: DifficultyConfig): void {
    this.weights = getAdjustedWeights(
      difficulty.positiveReactionWeight,
      difficulty.neutralReactionWeight,
      difficulty.negativeReactionWeight,
    );
  }
}
