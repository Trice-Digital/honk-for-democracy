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
    worldX: number,
    worldY: number,
    reaction: { emoji: string; scoreValue: number; color: number; label: string; sentiment?: string },
    wasRaiseBoosted: boolean,
    wasDeflected: boolean,
    finalScoreValue: number,
    cars: Car[],
  ): void {
    const rotation = (Math.random() - 0.5) * FEEDBACK_ROTATION_RANGE; // -4 to +4 degrees
    const xDrift = (Math.random() - 0.5) * FEEDBACK_DRIFT_RANGE; // paper flutter drift

    // Determine if car is stopped (larger bubbles for stopped cars)
    let carIsStopped = false;
    for (const car of cars) {
      if (car.active && Math.abs(car.x - worldX) < 5 && Math.abs(car.y - worldY) < 5) {
        const sentiment = reaction.sentiment || (finalScoreValue > 0 ? 'positive' : finalScoreValue < 0 ? 'negative' : 'neutral');
        car.setReactionFace(sentiment as 'positive' | 'negative' | 'neutral');
        carIsStopped = car.isStopped;
        break;
      }
    }

    // Size scaling: stopped cars = bigger bubbles, moving cars = smaller
    const sizeScale = carIsStopped ? 1.2 : 0.9;
    const animDuration = carIsStopped ? 1600 : 1100;

    // Speech bubble (paper cutout with scissor-cut edges)
    if (reaction.emoji || reaction.label) {
      const bubbleText = wasDeflected
        ? '\uD83D\uDEE1\uFE0F'
        : reaction.emoji
          ? `${reaction.emoji}`
          : '';

      const bubbleLabel = wasRaiseBoosted
        ? `${bubbleText} YEAH!`
        : wasDeflected
          ? `${bubbleText} DEFLECT!`
          : reaction.label === 'Honk!'
            ? `HONK! \uD83C\uDFBA`
            : bubbleText || reaction.label;

      if (bubbleLabel) {
        const baseFontSize = (wasRaiseBoosted || wasDeflected) ? 14 : 12;
        const fontSize = Math.round(baseFontSize * sizeScale);
        const bubbleW = Math.max(55, bubbleLabel.length * (10 * sizeScale) + 24);
        const bubbleH = Math.round(28 * sizeScale);

        const bg = this.scene.add.graphics();
        const isNegative = finalScoreValue < 0;
        const bubbleFill = isNegative ? 0xf5d0d0 : PALETTE.paperWhite;

        // Hard offset shadow (paper lifted off table)
        bg.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
        bg.fillRoundedRect(
          worldX - bubbleW / 2 + PALETTE.shadowOffsetX,
          worldY - 44 + PALETTE.shadowOffsetY,
          bubbleW, bubbleH, 4
        );

        // Scissor-cut bubble body
        drawScissorCutRect(bg, worldX - bubbleW / 2, worldY - 44, bubbleW, bubbleH, bubbleFill);

        // Triangle tail pointing down toward car
        bg.fillStyle(bubbleFill, 1);
        bg.fillTriangle(
          worldX - 6, worldY - 44 + bubbleH,
          worldX + 6, worldY - 44 + bubbleH,
          worldX, worldY - 44 + bubbleH + 8,
        );
        // Tail outline
        bg.lineStyle(2, PALETTE.markerBlack, 0.9);
        bg.beginPath();
        bg.moveTo(worldX - 6, worldY - 44 + bubbleH);
        bg.lineTo(worldX, worldY - 44 + bubbleH + 8);
        bg.lineTo(worldX + 6, worldY - 44 + bubbleH);
        bg.strokePath();

        bg.setDepth(20);
        bg.setAngle(rotation);

        const text = this.scene.add.text(worldX, worldY - 44 + bubbleH / 2, bubbleLabel, {
          fontFamily: "'Bangers', cursive",
          fontSize: `${fontSize}px`,
          color: isNegative ? '#ef4444' : '#1a1a1a',
          letterSpacing: 1,
        });
        text.setOrigin(0.5);
        text.setDepth(21);
        text.setAngle(rotation);

        // Paper flutter animation: float up + wobble rotation + x drift + fade
        this.scene.tweens.add({
          targets: [bg, text],
          y: `-=${60 + Math.random() * 20}`,
          x: `+=${xDrift}`,
          alpha: 0,
          angle: rotation + (Math.random() - 0.5) * 12,
          duration: animDuration,
          delay: 350,
          ease: 'Quad.easeOut',
          onComplete: () => { bg.destroy(); text.destroy(); },
        });
      }
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
