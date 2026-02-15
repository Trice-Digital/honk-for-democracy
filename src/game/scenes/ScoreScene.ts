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
import { PALETTE, FONTS } from '../config/paletteConfig';
import { drawScissorCutRect, drawPaperShadow, drawPaperShadowCircle, applyPaperGrain, drawMaskingTapeStrip } from '../utils/paperArt';
import { AmbientSystem } from '../systems/AmbientSystem';
import { AudioMixerSystem } from '../systems/AudioMixerSystem';

/**
 * ScoreScene — End-of-session score screen.
 *
 * Paper craft aesthetic: cardboard background, paper grain overlay,
 * scissor-cut panels, marker fonts, neobrutalist buttons.
 */
export class ScoreScene extends Phaser.Scene {
  private scoreAmbient: AmbientSystem | null = null;

  constructor() {
    super({ key: 'ScoreScene' });
  }

  create(): void {
    // Optional quiet ambient for scene continuity
    const mixer = AudioMixerSystem.get(this);
    if (mixer && mixer.isInitialized()) {
      this.scoreAmbient = new AmbientSystem();
      this.scoreAmbient.connectTo(mixer.getLayerGain('ambient'));
      // Set quieter volume — half the normal ambient presence
      this.scoreAmbient.setVolume(-22);
      this.scoreAmbient.start();
    }

    const finalState = this.registry.get('finalGameState') as GameState | undefined;
    const signData = this.registry.get('signData') as SignData | undefined;

    if (!finalState || !signData) {
      this.scene.start('SignCraftScene');
      return;
    }

    const { width, height } = this.scale;
    const cx = width / 2;

    let y = 0;

    // ============================================================
    // BACKGROUND — Cardboard with paper grain
    // ============================================================

    this.cameras.main.setBackgroundColor(PALETTE.cardboard);

    // Paper grain overlay
    const grain = applyPaperGrain(this, 0, 0, width, height, 0.04);
    grain.setDepth(100); // on top of everything as overlay

    // ============================================================
    // TITLE
    // ============================================================

    const isEarlyEnd = finalState.endReason === 'confidence';
    const titleText = isEarlyEnd ? 'YOU WENT HOME EARLY' : 'SESSION OVER';
    const titleColor = isEarlyEnd ? '#ef4444' : '#fbbf24';

    const title = this.add.text(cx, 40, titleText, {
      fontFamily: FONTS.ui,
      fontSize: '36px',
      color: titleColor,
      align: 'center',
      letterSpacing: 4,
      stroke: '#1a1a1a',
      strokeThickness: isEarlyEnd ? 3 : 2,
    });
    title.setOrigin(0.5, 0);
    y = 85;

    if (isEarlyEnd) {
      const subtitle = this.add.text(cx, y, 'Your confidence hit zero...', {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        color: '#3a3a3a',
        align: 'center',
      });
      subtitle.setOrigin(0.5, 0);
      y += 30;
    }

    // ============================================================
    // SIGN MESSAGE (featured)
    // ============================================================

    y += 10;

    if (signData.signImageDataUrl) {
      const signDisplayWidth = Math.min(width - 60, 280);
      const signDisplayHeight = 200;

      // Popsicle stick
      this.add.rectangle(cx, y + signDisplayHeight / 2 + 30, 5, 40, PALETTE.craftBrown);

      const signY = y;

      const imgEl = new Image();
      imgEl.onload = () => {
        if (this.textures.exists('scoreSign')) {
          this.textures.remove('scoreSign');
        }
        this.textures.addImage('scoreSign', imgEl);

        const signImg = this.add.image(cx, signY + signDisplayHeight / 2, 'scoreSign');
        signImg.setOrigin(0.5);

        const scaleX = signDisplayWidth / signImg.width;
        const scaleY = signDisplayHeight / signImg.height;
        const scale = Math.min(scaleX, scaleY);
        signImg.setScale(scale);

        // Paper shadow behind the sign
        const borderPadding = 8;
        const shadowG = this.add.graphics();
        drawPaperShadow(
          shadowG,
          cx - (signImg.displayWidth + borderPadding * 2) / 2,
          signY + signDisplayHeight / 2 - (signImg.displayHeight + borderPadding * 2) / 2,
          signImg.displayWidth + borderPadding * 2,
          signImg.displayHeight + borderPadding * 2,
        );
        shadowG.setDepth(-1);
        signImg.setDepth(0);
      };
      imgEl.src = signData.signImageDataUrl;

      y += signDisplayHeight + 55;
    } else {
      const signBoardWidth = Math.min(width - 60, 340);
      const signBoardHeight = 80;

      // Popsicle stick
      this.add.rectangle(cx, y + signBoardHeight / 2 + 30, 5, 40, PALETTE.craftBrown);

      // Scissor-cut sign board with shadow
      const signG = this.add.graphics();
      drawPaperShadow(signG, cx - signBoardWidth / 2, y, signBoardWidth, signBoardHeight);
      drawScissorCutRect(signG, cx - signBoardWidth / 2, y, signBoardWidth, signBoardHeight, signData.material.boardColor);

      const msgFontSize = signData.message.length > 25 ? '16px' : signData.message.length > 15 ? '20px' : '24px';
      this.add.text(cx, y + signBoardHeight / 2, signData.message, {
        fontFamily: FONTS.ui,
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

    // Grade badge — paper cutout circle with drop shadow + scissor-cut edge
    const gradeShadowG = this.add.graphics();
    drawPaperShadowCircle(gradeShadowG, cx - 80, y + 20, 28);

    const gradeCircle = this.add.circle(cx - 80, y + 20, 28, Phaser.Display.Color.HexStringToColor(grade.color).color);
    gradeCircle.setStrokeStyle(2, PALETTE.markerBlack, 1);

    this.add.text(cx - 80, y + 20, grade.label, {
      fontFamily: FONTS.ui,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#1a1a1a',
    }).setOrigin(0.5);

    // Score number
    this.add.text(cx + 10, y + 8, `${finalState.score}`, {
      fontFamily: FONTS.ui,
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0, 0);

    this.add.text(cx + 10, y + 52, 'POINTS', {
      fontFamily: FONTS.ui,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#92400e',
      letterSpacing: 3,
    }).setOrigin(0, 0);

    y += 85;

    // ============================================================
    // STATS GRID — on a paper cutout panel
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

    const panelWidth = 290;
    const panelHeight = stats.length * 26 + 24;
    const panelX = cx - panelWidth / 2;
    const panelY = y;

    // Paper cutout panel with shadow and scissor-cut edges
    const panelG = this.add.graphics();
    drawPaperShadow(panelG, panelX, panelY, panelWidth, panelHeight);
    drawScissorCutRect(panelG, panelX, panelY, panelWidth, panelHeight, PALETTE.paperWhite);

    // Masking tape divider at the top of the panel
    const tapeG = this.add.graphics();
    drawMaskingTapeStrip(tapeG, panelX + 10, panelY, panelX + panelWidth - 10, panelY, 10);

    y += 14;

    for (const stat of stats) {
      this.add.text(cx - 130, y, stat.label, {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        color: '#3a3a3a',
      }).setOrigin(0, 0);

      this.add.text(cx + 130, y, stat.value, {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#1a1a1a',
      }).setOrigin(1, 0);

      y += 26;
    }

    y += 16;

    // ============================================================
    // REACTION BREAKDOWN
    // ============================================================

    // Masking tape divider
    const tapeG2 = this.add.graphics();
    drawMaskingTapeStrip(tapeG2, cx - 140, y, cx + 140, y, 10);
    y += 14;

    this.add.text(cx, y, 'REACTIONS', {
      fontFamily: FONTS.ui,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#92400e',
      letterSpacing: 3,
    }).setOrigin(0.5, 0);
    y += 24;

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
        : '#92400e';

      this.add.text(rx, ry, `${r.emoji} ${r.label}: ${r.count}`, {
        fontFamily: FONTS.ui,
        fontSize: '15px',
        color: sentColor,
      }).setOrigin(0.5, 0);
    }

    const reactionRows = Math.ceil(reactionsWithCounts.length / 2);
    y += reactionRows * 24 + 20;

    // ============================================================
    // BUTTONS — Neobrutalist with hard offset shadow
    // ============================================================

    const buttonAreaY = Math.max(y, height - 140);

    // Continue button (primary) — neobrutalist action blue
    const continueShadow = this.add.rectangle(cx + 3, buttonAreaY + 3, 260, 52, PALETTE.markerBlack);
    const continueBg = this.add.rectangle(cx, buttonAreaY, 260, 52, PALETTE.actionBlue);
    continueBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    continueBg.setInteractive({ useHandCursor: true });

    this.add.text(cx, buttonAreaY, 'CONTINUE', {
      fontFamily: FONTS.ui,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f5f0e8',
    }).setOrigin(0.5);

    continueBg.on('pointerover', () => continueBg.setFillStyle(0x2563eb));
    continueBg.on('pointerout', () => continueBg.setFillStyle(PALETTE.actionBlue));
    continueBg.on('pointerdown', () => {
      // Press into shadow effect
      continueBg.setPosition(cx + 2, buttonAreaY + 2);
      continueShadow.setVisible(false);
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('ActivismScene');
      });
    });

    // Play Again button (secondary) — lighter neobrutalist
    const playAgainShadow = this.add.rectangle(cx + 3, buttonAreaY + 64 + 3, 260, 44, PALETTE.markerBlack, 0.5);
    const playAgainBg = this.add.rectangle(cx, buttonAreaY + 64, 260, 44, PALETTE.paperWhite);
    playAgainBg.setStrokeStyle(3, PALETTE.markerBlack, 0.8);
    playAgainBg.setInteractive({ useHandCursor: true });

    this.add.text(cx, buttonAreaY + 64, 'PLAY AGAIN', {
      fontFamily: FONTS.ui,
      fontSize: '18px',
      color: '#3a3a3a',
    }).setOrigin(0.5);

    playAgainBg.on('pointerover', () => playAgainBg.setStrokeStyle(3, PALETTE.actionBlue, 1));
    playAgainBg.on('pointerout', () => playAgainBg.setStrokeStyle(3, PALETTE.markerBlack, 0.8));
    playAgainBg.on('pointerdown', () => {
      playAgainBg.setPosition(cx + 2, buttonAreaY + 64 + 2);
      playAgainShadow.setVisible(false);
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('SignCraftScene');
      });
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    console.log('[HFD] ScoreScene created. Paper craft aesthetic active.');
  }

  private cleanupScoreAmbient(): void {
    if (this.scoreAmbient) {
      this.scoreAmbient.stop();
      // Delay destroy to let fade-out complete
      setTimeout(() => {
        if (this.scoreAmbient) {
          this.scoreAmbient.destroy();
          this.scoreAmbient = null;
        }
      }, 1600);
    }
  }
}
