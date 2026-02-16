import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX } from '../config/paletteConfig';
import { drawScissorCutRect } from '../utils/paperArt';
import type { Car } from '../entities/Car';

const FEEDBACK_ROTATION_RANGE = 8; // -4 to +4 degrees
const FEEDBACK_DRIFT_RANGE = 40; // horizontal drift for paper flutter

/** System emoji font stack — renders emoji reliably in Canvas 2D */
const EMOJI_FONT = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
const BANGERS_FONT = "'Bangers', cursive";

// Bubble sizing
const BASE_FONT_PX = 18;
const BOOSTED_FONT_PX = 22;
const EMOJI_FONT_PX = 26;
const BOOSTED_EMOJI_FONT_PX = 30;
const BUBBLE_PAD_X = 20;
const BUBBLE_PAD_Y = 14;
const BUBBLE_MIN_W = 48;
const TAIL_SIZE = 10;

/**
 * ReactionFeedbackManager — Shows visual feedback for reactions.
 *
 * Renders Paper Mario style speech bubbles and score floaters:
 * - Paper cutout speech bubbles with scissor-cut edges
 * - Marker outline and triangle tail pointing at car
 * - Emoji rendered with system emoji font (separate from Bangers text)
 * - Paper flutter animation (wobble + drift up + fade)
 * - Score floaters with Bangers font and scale-bounce
 */
export class ReactionFeedbackManager {
  constructor(private scene: Phaser.Scene) {}

  showReactionFeedback(
    car: Car | null,
    reaction: { emoji: string; scoreValue: number; color: number; label: string; bubbleLabel: string; bubbleEmoji: string; sentiment?: string },
    wasRaiseBoosted: boolean,
    wasDeflected: boolean,
    finalScoreValue: number,
  ): void {
    const rotation = (Math.random() - 0.5) * FEEDBACK_ROTATION_RANGE;
    const xDrift = (Math.random() - 0.5) * FEEDBACK_DRIFT_RANGE;

    const worldX = car?.x ?? 0;
    const worldY = car?.y ?? 0;
    const carIsStopped = car?.isStopped ?? false;

    // Set reaction face on car
    if (car) {
      const sentiment = reaction.sentiment || (finalScoreValue > 0 ? 'positive' : finalScoreValue < 0 ? 'negative' : 'neutral');
      car.setReactionFace(sentiment as 'positive' | 'negative' | 'neutral');
    }

    const sizeScale = carIsStopped ? 1.2 : 1.0;
    const animDuration = carIsStopped ? 1600 : 1100;
    const isBoosted = wasRaiseBoosted || wasDeflected;

    // Determine bubble content (text + emoji parts, rendered separately)
    let textPart: string;
    let emojiPart: string;
    if (wasDeflected) {
      textPart = 'DEFLECT!'; emojiPart = '';
    } else if (wasRaiseBoosted) {
      textPart = 'YEAH!'; emojiPart = '✊';
    } else {
      textPart = reaction.bubbleLabel;
      emojiPart = reaction.bubbleEmoji;
    }

    if (!textPart && !emojiPart) return; // nothing reaction — no bubble

    const isNegative = finalScoreValue < 0;
    const bubbleFill = isNegative ? 0xf5d0d0 : PALETTE.paperWhite;
    const textColor = isNegative ? '#ef4444' : '#1a1a1a';

    // Measure content to size the bubble
    const textFontPx = Math.round((isBoosted ? BOOSTED_FONT_PX : BASE_FONT_PX) * sizeScale);
    const emojiFontPx = Math.round((isBoosted ? BOOSTED_EMOJI_FONT_PX : EMOJI_FONT_PX) * sizeScale);

    // Create text objects first to measure, then position inside bubble
    const textObjs: Phaser.GameObjects.Text[] = [];
    let contentW = 0;
    const gap = (textPart && emojiPart) ? 4 : 0;

    let labelObj: Phaser.GameObjects.Text | null = null;
    if (textPart) {
      labelObj = this.scene.add.text(0, 0, textPart, {
        fontFamily: BANGERS_FONT,
        fontSize: `${textFontPx}px`,
        color: textColor,
        letterSpacing: 1,
      });
      contentW += labelObj.width;
      textObjs.push(labelObj);
    }

    let emojiObj: Phaser.GameObjects.Text | null = null;
    if (emojiPart) {
      emojiObj = this.scene.add.text(0, 0, emojiPart, {
        fontFamily: EMOJI_FONT,
        fontSize: `${emojiFontPx}px`,
        color: textColor,
      });
      contentW += emojiObj.width;
      textObjs.push(emojiObj);
    }

    contentW += gap;
    const bubbleW = Math.max(BUBBLE_MIN_W, contentW + BUBBLE_PAD_X * 2);
    const contentH = Math.max(...textObjs.map(t => t.height));
    const bubbleH = contentH + BUBBLE_PAD_Y * 2;

    // Container at car position, above car
    const container = this.scene.add.container(worldX, worldY - 50);
    container.setDepth(20);
    container.setAngle(rotation);

    // Draw bubble background
    const bg = this.scene.add.graphics();

    // Hard offset shadow
    bg.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    bg.fillRoundedRect(-bubbleW / 2 + PALETTE.shadowOffsetX, PALETTE.shadowOffsetY, bubbleW, bubbleH, 4);

    // Scissor-cut body
    drawScissorCutRect(bg, -bubbleW / 2, 0, bubbleW, bubbleH, bubbleFill);

    // Triangle tail pointing down at car
    const tailHalf = TAIL_SIZE * 0.6;
    bg.fillStyle(bubbleFill, 1);
    bg.fillTriangle(-tailHalf, bubbleH, tailHalf, bubbleH, 0, bubbleH + TAIL_SIZE);
    bg.lineStyle(2, PALETTE.markerBlack, 0.9);
    bg.beginPath();
    bg.moveTo(-tailHalf, bubbleH);
    bg.lineTo(0, bubbleH + TAIL_SIZE);
    bg.lineTo(tailHalf, bubbleH);
    bg.strokePath();

    container.add(bg);

    // Position text+emoji centered in bubble
    let curX = -contentW / 2;
    const centerY = bubbleH / 2;

    if (labelObj) {
      labelObj.setOrigin(0, 0.5);
      labelObj.setPosition(curX, centerY);
      container.add(labelObj);
      curX += labelObj.width + gap;
    }
    if (emojiObj) {
      emojiObj.setOrigin(0, 0.5);
      emojiObj.setPosition(curX, centerY);
      container.add(emojiObj);
    }

    // Paper flutter: float up + wobble + drift + fade
    this.scene.tweens.add({
      targets: container,
      y: container.y - (70 + Math.random() * 25),
      x: container.x + xDrift,
      alpha: 0,
      angle: rotation + (Math.random() - 0.5) * 12,
      duration: animDuration,
      delay: 350,
      ease: 'Quad.easeOut',
      onComplete: () => container.destroy(),
    });

    // Score floater (Bangers font with scale-bounce)
    if (finalScoreValue !== 0) {
      const sign = finalScoreValue > 0 ? '+' : '';
      const scoreLabel = `${sign}${finalScoreValue}`;
      const isPositive = finalScoreValue > 0;
      const color = isPositive ? '#22c55e' : '#ef4444';
      const scoreFontPx = Math.round((isBoosted ? 30 : 24) * sizeScale);

      const floater = this.scene.add.text(worldX + 25, worldY - 15, scoreLabel, {
        fontFamily: BANGERS_FONT,
        fontSize: `${scoreFontPx}px`,
        color,
        stroke: PALETTE_HEX.markerBlack,
        strokeThickness: 3,
        letterSpacing: 1,
      });
      floater.setOrigin(0.5);
      floater.setDepth(22);
      floater.setScale(0.5);

      // Scale-bounce: 0.5 -> 1.1 -> 1.0
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
        y: worldY - 85,
        alpha: 0,
        duration: 1000,
        delay: 200,
        ease: 'Quad.easeOut',
        onComplete: () => floater.destroy(),
      });
    }
  }
}
