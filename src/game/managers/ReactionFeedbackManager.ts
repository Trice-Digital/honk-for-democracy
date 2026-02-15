import Phaser from 'phaser';
import { PALETTE } from '../config/paletteConfig';
import { drawScissorCutRect } from '../utils/paperArt';
import type { Car } from '../entities/Car';

// Magic numbers extracted as constants
const FEEDBACK_ROTATION_RANGE = 8; // -4 to +4 degrees
const FEEDBACK_DRIFT_RANGE = 40; // horizontal drift for paper flutter

/**
 * ReactionFeedbackManager — Shows visual feedback for reactions.
 *
 * Renders Paper Mario style speech bubbles and score floaters:
 * - Paper cutout speech bubbles with scissor-cut edges
 * - Marker outline and triangle tail
 * - Paper flutter animation (wobble + drift)
 * - Score floaters with Bangers font and scale-bounce
 * - Sets reaction faces on cars
 */
export class ReactionFeedbackManager {
  constructor(private scene: Phaser.Scene) {}

  /**
   * Show paper cutout speech bubble reaction feedback.
   * Stopped cars get larger bubbles; moving cars get smaller/faster ones.
   */
  showReactionFeedback(
    car: Car | null,
    reaction: { emoji: string; scoreValue: number; color: number; label: string; sentiment?: string },
    wasRaiseBoosted: boolean,
    wasDeflected: boolean,
    finalScoreValue: number,
  ): void {
    const rotation = (Math.random() - 0.5) * FEEDBACK_ROTATION_RANGE; // -4 to +4 degrees
    const xDrift = (Math.random() - 0.5) * FEEDBACK_DRIFT_RANGE; // paper flutter drift

    // Get position and state from car (or use 0,0 as fallback)
    const worldX = car?.x ?? 0;
    const worldY = car?.y ?? 0;
    const carIsStopped = car?.isStopped ?? false;

    // Set reaction face on car
    if (car) {
      const sentiment = reaction.sentiment || (finalScoreValue > 0 ? 'positive' : finalScoreValue < 0 ? 'negative' : 'neutral');
      car.setReactionFace(sentiment as 'positive' | 'negative' | 'neutral');
    }

    // Size scaling: stopped cars = bigger bubbles, moving cars = smaller
    const sizeScale = carIsStopped ? 1.2 : 0.9;
    const animDuration = carIsStopped ? 1600 : 1100;

    // Speech bubble (paper cutout with scissor-cut edges)
    let bubbleLabel: string;
    if (wasDeflected) {
      bubbleLabel = '\u{1F6E1}\uFE0F DEFLECT!';
    } else if (wasRaiseBoosted) {
      const content = reaction.emoji || reaction.label || '';
      bubbleLabel = `${content} YEAH!`;
    } else if (reaction.label === 'Honk!') {
      bubbleLabel = 'HONK! \u{1F3BA}';
    } else {
      // Show emoji + label together for richer bubbles, or just label if no emoji
      const parts: string[] = [];
      if (reaction.emoji) parts.push(reaction.emoji);
      if (reaction.label && reaction.label !== 'Nothing') parts.push(reaction.label);
      bubbleLabel = parts.join(' ') || '';
    }

    if (bubbleLabel) {
      const baseFontSize = (wasRaiseBoosted || wasDeflected) ? 14 : 12;
      const fontSize = Math.round(baseFontSize * sizeScale);
      const bubbleW = Math.max(55, bubbleLabel.length * (10 * sizeScale) + 24);
      const bubbleH = Math.round(28 * sizeScale);

      const isNegative = finalScoreValue < 0;
      const bubbleFill = isNegative ? 0xf5d0d0 : PALETTE.paperWhite;

      // Create container at car position (above car)
      const bubbleY = 0; // top of bubble relative to container
      const container = this.scene.add.container(worldX, worldY - 44);
      container.setDepth(20);
      container.setAngle(rotation);

      const bg = this.scene.add.graphics();

      // Shadow
      bg.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
      bg.fillRoundedRect(-bubbleW / 2 + PALETTE.shadowOffsetX, bubbleY + PALETTE.shadowOffsetY, bubbleW, bubbleH, 4);

      // Scissor-cut body
      drawScissorCutRect(bg, -bubbleW / 2, bubbleY, bubbleW, bubbleH, bubbleFill);

      // Triangle tail
      bg.fillStyle(bubbleFill, 1);
      bg.fillTriangle(-6, bubbleH, 6, bubbleH, 0, bubbleH + 8);
      bg.lineStyle(2, PALETTE.markerBlack, 0.9);
      bg.beginPath();
      bg.moveTo(-6, bubbleH);
      bg.lineTo(0, bubbleH + 8);
      bg.lineTo(6, bubbleH);
      bg.strokePath();

      const textObj = this.scene.add.text(0, bubbleH / 2, bubbleLabel, {
        fontFamily: "'Bangers', cursive",
        fontSize: `${fontSize}px`,
        color: isNegative ? '#ef4444' : '#1a1a1a',
        letterSpacing: 1,
      });
      textObj.setOrigin(0.5);

      container.add([bg, textObj]);

      // Paper flutter: float up + wobble + drift + fade
      this.scene.tweens.add({
        targets: container,
        y: container.y - (60 + Math.random() * 20),
        x: container.x + xDrift,
        alpha: 0,
        angle: rotation + (Math.random() - 0.5) * 12,
        duration: animDuration,
        delay: 350,
        ease: 'Quad.easeOut',
        onComplete: () => container.destroy(),
      });
    }

    // Score floater (Bangers font with scale-bounce)
    if (finalScoreValue !== 0) {
      const sign = finalScoreValue > 0 ? '+' : '';
      const label = `${sign}${finalScoreValue}`;
      const isPositive = finalScoreValue > 0;
      const color = isPositive ? '#22c55e' : '#ef4444';
      const baseFontPx = (wasRaiseBoosted || wasDeflected) ? 28 : 22;
      const fontPx = Math.round(baseFontPx * sizeScale);

      const floater = this.scene.add.text(worldX + 25, worldY - 15, label, {
        fontFamily: "'Bangers', cursive",
        fontSize: `${fontPx}px`,
        color,
        stroke: '#1a1a1a',
        strokeThickness: 3,
        letterSpacing: 1,
      });
      floater.setOrigin(0.5);
      floater.setDepth(22);
      floater.setScale(0.5);

      // Scale-bounce on appear: 0.5 -> 1.1 -> 1.0
      this.scene.tweens.add({
        targets: floater,
        scale: 1.1,
        duration: 120,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: floater,
            scale: 1.0,
            duration: 80,
            ease: 'Sine.easeOut',
          });
        },
      });

      // Float up and fade
      this.scene.tweens.add({
        targets: floater,
        y: worldY - 75,
        alpha: 0,
        duration: 1000,
        delay: 200,
        ease: 'Quad.easeOut',
        onComplete: () => floater.destroy(),
      });
    }
  }
}
