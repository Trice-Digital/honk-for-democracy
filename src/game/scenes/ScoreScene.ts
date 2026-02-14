import Phaser from 'phaser';
import type { GameState } from '../systems/GameStateManager';
import type { SignData } from '../config/signConfig';
import { REACTION_TYPES } from '../config/reactionConfig';
import {
  getScoreGrade,
  getSignRatingLabel,
  getSignRatingStars,
  formatTime,
} from '../config/scoreConfig';

/**
 * ScoreScene — End-of-session score screen.
 *
 * Bold, clean, screenshot-ready layout featuring:
 * - Player's sign message
 * - Final score with grade
 * - Stats grid
 * - Reaction breakdown
 * - Continue to activism screen + Play Again
 */
export class ScoreScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScoreScene' });
  }

  create(): void {
    const finalState = this.registry.get('finalGameState') as GameState | undefined;
    const signData = this.registry.get('signData') as SignData | undefined;

    if (!finalState || !signData) {
      // Fallback: go back to sign craft
      this.scene.start('SignCraftScene');
      return;
    }

    const { width, height } = this.scale;
    const cx = width / 2;

    // Use a scrollable layout by tracking Y position
    let y = 0;

    this.cameras.main.setBackgroundColor('#0f0f1a');

    // ============================================================
    // TITLE
    // ============================================================

    const isEarlyEnd = finalState.endReason === 'confidence';
    const titleText = isEarlyEnd ? 'YOU WENT HOME EARLY' : 'SESSION OVER';
    const titleColor = isEarlyEnd ? '#ef4444' : '#fbbf24';

    const title = this.add.text(cx, 40, titleText, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: titleColor,
      align: 'center',
    });
    title.setOrigin(0.5, 0);
    y = 85;

    if (isEarlyEnd) {
      const subtitle = this.add.text(cx, y, 'Your confidence hit zero...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#9ca3af',
        align: 'center',
      });
      subtitle.setOrigin(0.5, 0);
      y += 30;
    }

    // ============================================================
    // SIGN MESSAGE (featured)
    // ============================================================

    y += 10;

    // Check if we have a crafted sign PNG (M2) or fallback to rectangle rendering (M1)
    if (signData.signImageDataUrl) {
      // M2: Display crafted sign PNG prominently
      const signDisplayWidth = Math.min(width - 60, 280);
      const signDisplayHeight = 200;

      // Stick
      this.add.rectangle(cx, y + signDisplayHeight / 2 + 30, 5, 40, 0x92400e);

      // Load PNG as texture
      this.textures.once('addtexture', (key: string) => {
        if (key === 'scoreSign') {
          const signImg = this.add.image(cx, y + signDisplayHeight / 2, 'scoreSign');
          signImg.setOrigin(0.5);

          // Scale to fit display area, maintaining aspect ratio
          const scaleX = signDisplayWidth / signImg.width;
          const scaleY = signDisplayHeight / signImg.height;
          const scale = Math.min(scaleX, scaleY);
          signImg.setScale(scale);

          // Subtle border/shadow
          const borderPadding = 8;
          const borderRect = this.add.rectangle(
            cx,
            y + signDisplayHeight / 2,
            signImg.displayWidth + borderPadding * 2,
            signImg.displayHeight + borderPadding * 2,
            0x1a1a1a,
            0.3
          );
          borderRect.setStrokeStyle(2, 0xffffff, 0.2);
          borderRect.setDepth(-1);
          signImg.setDepth(0);
        }
      });
      this.textures.addBase64('scoreSign', signData.signImageDataUrl);

      y += signDisplayHeight + 55;
    } else {
      // M1 backward compatibility: Rectangle-based sign rendering
      const signBoardWidth = Math.min(width - 60, 340);
      const signBoardHeight = 80;

      // Stick
      this.add.rectangle(cx, y + signBoardHeight / 2 + 30, 5, 40, 0x92400e);

      // Board stroke
      this.add.rectangle(cx, y + signBoardHeight / 2, signBoardWidth + 6, signBoardHeight + 6, signData.material.strokeColor);

      // Board fill
      this.add.rectangle(cx, y + signBoardHeight / 2, signBoardWidth, signBoardHeight, signData.material.boardColor);

      // Message text on sign
      const msgFontSize = signData.message.length > 25 ? '16px' : signData.message.length > 15 ? '20px' : '24px';
      this.add.text(cx, y + signBoardHeight / 2, signData.message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: msgFontSize,
        fontStyle: 'bold',
        color: signData.material.textColor,
        align: 'center',
        wordWrap: { width: signBoardWidth - 20 },
      }).setOrigin(0.5);

      y += signBoardHeight + 55;
    }

    // ============================================================
    // SCORE + GRADE
    // ============================================================

    const grade = getScoreGrade(finalState.score);

    // Grade badge
    const gradeCircle = this.add.circle(cx - 80, y + 20, 28, Phaser.Display.Color.HexStringToColor(grade.color).color);
    gradeCircle.setStrokeStyle(2, 0xffffff, 0.4);

    this.add.text(cx - 80, y + 20, grade.label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Score number
    this.add.text(cx + 10, y + 8, `${finalState.score}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0, 0);

    this.add.text(cx + 10, y + 52, 'POINTS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#6b7280',
      letterSpacing: 3,
    }).setOrigin(0, 0);

    y += 85;

    // ============================================================
    // STATS GRID
    // ============================================================

    const timeStood = finalState.sessionDuration - finalState.timeRemaining;
    const signRating = `${getSignRatingStars(signData.qualityScore)} ${getSignRatingLabel(signData.qualityScore)}`;

    const stats = [
      { label: 'Cars Reached', value: `${finalState.carsReached}` },
      { label: 'Cars Missed', value: `${finalState.carsMissed}` },
      { label: 'Time Stood', value: formatTime(timeStood) },
      { label: 'Sign Rating', value: signRating },
      { label: 'Final Confidence', value: `${Math.round(finalState.confidence)}%` },
    ];

    // Divider
    const dividerG = this.add.graphics();
    dividerG.lineStyle(1, 0x374151, 0.6);
    dividerG.beginPath();
    dividerG.moveTo(cx - 140, y);
    dividerG.lineTo(cx + 140, y);
    dividerG.strokePath();
    y += 12;

    for (const stat of stats) {
      this.add.text(cx - 130, y, stat.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#9ca3af',
      }).setOrigin(0, 0);

      this.add.text(cx + 130, y, stat.value, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(1, 0);

      y += 26;
    }

    y += 8;

    // ============================================================
    // REACTION BREAKDOWN
    // ============================================================

    // Divider
    const dividerG2 = this.add.graphics();
    dividerG2.lineStyle(1, 0x374151, 0.6);
    dividerG2.beginPath();
    dividerG2.moveTo(cx - 140, y);
    dividerG2.lineTo(cx + 140, y);
    dividerG2.strokePath();
    y += 12;

    this.add.text(cx, y, 'REACTIONS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#6b7280',
      letterSpacing: 3,
    }).setOrigin(0.5, 0);
    y += 24;

    // Show reactions in a compact grid (2 columns)
    const reactionsWithCounts = REACTION_TYPES
      .map((rt) => ({
        ...rt,
        count: (finalState.reactions as unknown as Record<string, number>)[rt.id] || 0,
      }))
      .filter((r) => r.count > 0);

    const colWidth = 140;
    for (let i = 0; i < reactionsWithCounts.length; i++) {
      const r = reactionsWithCounts[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rx = cx + (col === 0 ? -colWidth / 2 - 10 : colWidth / 2 + 10);
      const ry = y + row * 24;

      const sentColor = r.sentiment === 'positive' ? '#22c55e'
        : r.sentiment === 'negative' ? '#ef4444'
        : '#6b7280';

      this.add.text(rx, ry, `${r.emoji} ${r.label}: ${r.count}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: sentColor,
      }).setOrigin(0.5, 0);
    }

    const reactionRows = Math.ceil(reactionsWithCounts.length / 2);
    y += reactionRows * 24 + 20;

    // ============================================================
    // BUTTONS
    // ============================================================

    // Ensure minimum space for buttons
    const buttonAreaY = Math.max(y, height - 140);

    // Continue button (primary)
    const continueBg = this.add.rectangle(cx, buttonAreaY, 260, 52, 0x3b82f6);
    continueBg.setStrokeStyle(2, 0xffffff, 0.3);
    continueBg.setInteractive({ useHandCursor: true });

    this.add.text(cx, buttonAreaY, 'Continue', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    continueBg.on('pointerover', () => continueBg.setFillStyle(0x2563eb));
    continueBg.on('pointerout', () => continueBg.setFillStyle(0x3b82f6));
    continueBg.on('pointerdown', () => {
      this.scene.start('ActivismScene');
    });

    // Play Again button (secondary)
    const playAgainBg = this.add.rectangle(cx, buttonAreaY + 64, 260, 44, 0x1a1a2e);
    playAgainBg.setStrokeStyle(2, 0x6b7280, 0.5);
    playAgainBg.setInteractive({ useHandCursor: true });

    this.add.text(cx, buttonAreaY + 64, 'Play Again', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    playAgainBg.on('pointerover', () => playAgainBg.setStrokeStyle(2, 0x3b82f6, 0.8));
    playAgainBg.on('pointerout', () => playAgainBg.setStrokeStyle(2, 0x6b7280, 0.5));
    playAgainBg.on('pointerdown', () => {
      this.scene.start('SignCraftScene');
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    console.log('[HFD] ScoreScene created. Phase 6 score screen active.');
  }
}
