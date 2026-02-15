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
import { generateShareCard } from '../../lib/ShareCardGenerator';
import { downloadImage, canNativeShare, nativeShare } from '../../lib/ShareService';

/**
 * ScoreScene — End-of-session score screen.
 *
 * Paper craft aesthetic: cardboard background, paper grain overlay,
 * scissor-cut panels, marker fonts, neobrutalist buttons.
 */
export class ScoreScene extends Phaser.Scene {
  private scoreAmbient: AmbientSystem | null = null;

  /** Cached share card data URL so we don't regenerate on repeated taps */
  private shareCardDataUrl: string | null = null;

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
        count: (rt.id in finalState.reactions ? finalState.reactions[rt.id as keyof typeof finalState.reactions] : 0) as number,
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

    const buttonAreaY = Math.max(y, height - 240);

    // Store references for the share flow — these get destroyed/replaced
    this.createShareButtons(cx, buttonAreaY, finalState, signData, grade);

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    console.log('[HFD] ScoreScene created. Paper craft aesthetic active.');
  }

  /**
   * Create the initial button layout:
   * [SHARE YOUR PROTEST] (primary)
   * SKIP TO ACTION ->    (text link)
   * [PLAY AGAIN]         (secondary)
   */
  private createShareButtons(
    cx: number,
    buttonAreaY: number,
    finalState: GameState,
    signData: SignData,
    grade: { label: string; color: string },
  ): void {
    // --- Share Your Protest button (primary) --- action blue
    const shareShadow = this.add.rectangle(cx + 3, buttonAreaY + 3, 260, 52, PALETTE.markerBlack);
    const shareBg = this.add.rectangle(cx, buttonAreaY, 260, 52, PALETTE.actionBlue);
    shareBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    shareBg.setInteractive({ useHandCursor: true });

    const shareLabel = this.add.text(cx, buttonAreaY, 'SHARE YOUR PROTEST', {
      fontFamily: FONTS.ui,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f5f0e8',
    }).setOrigin(0.5);

    // --- Skip to Action text link ---
    const skipY = buttonAreaY + 42;
    const skipText = this.add.text(cx, skipY, 'SKIP TO ACTION \u2192', {
      fontFamily: FONTS.ui,
      fontSize: '15px',
      color: '#92400e',
    }).setOrigin(0.5, 0);
    skipText.setInteractive({ useHandCursor: true });

    skipText.on('pointerover', () => skipText.setColor('#3b82f6'));
    skipText.on('pointerout', () => skipText.setColor('#92400e'));
    skipText.on('pointerdown', () => {
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('ActivismScene');
      });
    });

    // --- Play Again button (secondary) ---
    const playAgainY = buttonAreaY + 80;
    const playAgainShadow = this.add.rectangle(cx + 3, playAgainY + 3, 260, 44, PALETTE.markerBlack, 0.5);
    const playAgainBg = this.add.rectangle(cx, playAgainY, 260, 44, PALETTE.paperWhite);
    playAgainBg.setStrokeStyle(3, PALETTE.markerBlack, 0.8);
    playAgainBg.setInteractive({ useHandCursor: true });

    const playAgainLabel = this.add.text(cx, playAgainY, 'PLAY AGAIN', {
      fontFamily: FONTS.ui,
      fontSize: '18px',
      color: '#3a3a3a',
    }).setOrigin(0.5);

    playAgainBg.on('pointerover', () => playAgainBg.setStrokeStyle(3, PALETTE.actionBlue, 1));
    playAgainBg.on('pointerout', () => playAgainBg.setStrokeStyle(3, PALETTE.markerBlack, 0.8));
    playAgainBg.on('pointerdown', () => {
      playAgainBg.setPosition(cx + 2, playAgainY + 2);
      playAgainShadow.setVisible(false);
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('SignCraftScene');
      });
    });

    // Collect all "pre-share" UI elements so we can destroy them after generation
    const preShareElements = [
      shareShadow, shareBg, shareLabel,
      skipText,
      playAgainShadow, playAgainBg, playAgainLabel,
    ];

    // --- Share button action ---
    shareBg.on('pointerdown', () => {
      // Press into shadow effect
      shareBg.setPosition(cx + 2, buttonAreaY + 2);
      shareShadow.setVisible(false);

      // Loading state
      shareLabel.setText('CREATING...');
      shareBg.disableInteractive();

      // Pulse animation while generating
      const pulse = this.tweens.add({
        targets: shareLabel,
        alpha: 0.5,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });

      this.handleShareGeneration(
        cx, buttonAreaY, finalState, signData, grade,
        preShareElements, pulse,
      );
    });
  }

  /**
   * Generate the share card and transition to the post-share button layout.
   */
  private async handleShareGeneration(
    cx: number,
    buttonAreaY: number,
    finalState: GameState,
    signData: SignData,
    grade: { label: string; color: string },
    preShareElements: Phaser.GameObjects.GameObject[],
    pulse: Phaser.Tweens.Tween,
  ): Promise<void> {
    try {
      // Generate if not already cached
      if (!this.shareCardDataUrl) {
        this.shareCardDataUrl = await generateShareCard({
          signImageDataUrl: signData.signImageDataUrl || '',
          score: finalState.score,
          gradeLabel: grade.label,
          gradeColor: grade.color,
        });
      }

      // Stop pulse
      pulse.stop();
      pulse.destroy();

      if (!this.shareCardDataUrl) {
        // Generation failed — show fallback
        this.showShareError(cx, buttonAreaY, preShareElements);
        return;
      }

      // Destroy pre-share elements
      for (const el of preShareElements) {
        el.destroy();
      }

      // Show post-share layout with preview
      this.showPostShareUI(cx, buttonAreaY, this.shareCardDataUrl);
    } catch (err) {
      console.error('[ScoreScene] Share card generation failed:', err);
      pulse.stop();
      pulse.destroy();
      this.showShareError(cx, buttonAreaY, preShareElements);
    }
  }

  /**
   * Show error toast and restore normal continue/play again buttons.
   */
  private showShareError(
    cx: number,
    _buttonAreaY: number,
    preShareElements: Phaser.GameObjects.GameObject[],
  ): void {
    // Destroy the pre-share elements
    for (const el of preShareElements) {
      el.destroy();
    }

    const { height } = this.scale;
    const fallbackY = Math.max(height - 140, 500);

    // Error toast — fades out after 2 seconds
    const toast = this.add.text(cx, fallbackY - 30, "Couldn't create share image", {
      fontFamily: FONTS.ui,
      fontSize: '14px',
      color: '#ef4444',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      duration: 500,
      delay: 2000,
      onComplete: () => toast.destroy(),
    });

    // Fallback: Continue + Play Again
    this.createFallbackButtons(cx, fallbackY);
  }

  /**
   * Post-share layout:
   * [card preview ~200px wide]
   * [SAVE IMAGE]
   * [SHARE] (only if canNativeShare)
   * [TAKE REAL ACTION ->]
   * PLAY AGAIN
   */
  private showPostShareUI(
    cx: number,
    startY: number,
    cardDataUrl: string,
  ): void {
    let y = startY;

    // --- Card preview ---
    const previewWidth = 200;
    const previewHeight = 200; // 1:1 card

    const previewImgEl = new Image();
    previewImgEl.onload = () => {
      const texKey = 'shareCardPreview';
      if (this.textures.exists(texKey)) {
        this.textures.remove(texKey);
      }
      this.textures.addImage(texKey, previewImgEl);

      const preview = this.add.image(cx, y + previewHeight / 2, texKey);
      preview.setOrigin(0.5);
      const scale = previewWidth / preview.width;
      preview.setScale(scale);

      // Paper shadow behind preview
      const shadowG = this.add.graphics();
      drawPaperShadow(
        shadowG,
        cx - preview.displayWidth / 2,
        y,
        preview.displayWidth,
        preview.displayHeight,
      );
      shadowG.setDepth(-1);
      preview.setDepth(0);
    };
    previewImgEl.src = cardDataUrl;

    y += previewHeight + 16;

    // --- SAVE IMAGE button (primary, stoplight green) ---
    const saveShadow = this.add.rectangle(cx + 3, y + 3, 260, 48, PALETTE.markerBlack);
    const saveBg = this.add.rectangle(cx, y, 260, 48, PALETTE.stoplightGreen);
    saveBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    saveBg.setInteractive({ useHandCursor: true });

    this.add.text(cx, y, 'SAVE IMAGE', {
      fontFamily: FONTS.ui,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#1a1a1a',
    }).setOrigin(0.5);

    saveBg.on('pointerover', () => saveBg.setFillStyle(0x16a34a));
    saveBg.on('pointerout', () => saveBg.setFillStyle(PALETTE.stoplightGreen));
    saveBg.on('pointerdown', () => {
      saveBg.setPosition(cx + 2, y + 2);
      saveShadow.setVisible(false);
      downloadImage(cardDataUrl);
      // Restore button after brief delay
      this.time.delayedCall(200, () => {
        saveBg.setPosition(cx, y);
        saveShadow.setVisible(true);
      });
    });

    y += 60;

    // --- SHARE button (only if Web Share API with file support) ---
    if (canNativeShare()) {
      const nShareShadow = this.add.rectangle(cx + 3, y + 3, 260, 48, PALETTE.markerBlack);
      const nShareBg = this.add.rectangle(cx, y, 260, 48, PALETTE.actionBlue);
      nShareBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
      nShareBg.setInteractive({ useHandCursor: true });

      this.add.text(cx, y, 'SHARE', {
        fontFamily: FONTS.ui,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f5f0e8',
      }).setOrigin(0.5);

      nShareBg.on('pointerover', () => nShareBg.setFillStyle(0x2563eb));
      nShareBg.on('pointerout', () => nShareBg.setFillStyle(PALETTE.actionBlue));
      nShareBg.on('pointerdown', () => {
        nShareBg.setPosition(cx + 2, y + 2);
        nShareShadow.setVisible(false);
        nativeShare(cardDataUrl);
        // Restore button after brief delay
        this.time.delayedCall(300, () => {
          nShareBg.setPosition(cx, y);
          nShareShadow.setVisible(true);
        });
      });

      y += 60;
    }

    // --- TAKE REAL ACTION button (secondary, paper white) ---
    const actionShadow = this.add.rectangle(cx + 3, y + 3, 260, 44, PALETTE.markerBlack, 0.5);
    const actionBg = this.add.rectangle(cx, y, 260, 44, PALETTE.paperWhite);
    actionBg.setStrokeStyle(3, PALETTE.markerBlack, 0.8);
    actionBg.setInteractive({ useHandCursor: true });

    this.add.text(cx, y, 'TAKE REAL ACTION \u2192', {
      fontFamily: FONTS.ui,
      fontSize: '18px',
      color: '#3a3a3a',
    }).setOrigin(0.5);

    actionBg.on('pointerover', () => actionBg.setStrokeStyle(3, PALETTE.actionBlue, 1));
    actionBg.on('pointerout', () => actionBg.setStrokeStyle(3, PALETTE.markerBlack, 0.8));
    actionBg.on('pointerdown', () => {
      actionBg.setPosition(cx + 2, y + 2);
      actionShadow.setVisible(false);
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('ActivismScene');
      });
    });

    y += 50;

    // --- Play Again text link ---
    const playAgainLink = this.add.text(cx, y, 'PLAY AGAIN', {
      fontFamily: FONTS.ui,
      fontSize: '15px',
      color: '#92400e',
    }).setOrigin(0.5, 0);
    playAgainLink.setInteractive({ useHandCursor: true });

    playAgainLink.on('pointerover', () => playAgainLink.setColor('#3b82f6'));
    playAgainLink.on('pointerout', () => playAgainLink.setColor('#92400e'));
    playAgainLink.on('pointerdown', () => {
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('SignCraftScene');
      });
    });
  }

  /**
   * Fallback buttons when share card generation fails.
   * Same as original: Continue + Play Again.
   */
  private createFallbackButtons(cx: number, buttonAreaY: number): void {
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
      continueBg.setPosition(cx + 2, buttonAreaY + 2);
      continueShadow.setVisible(false);
      this.cleanupScoreAmbient();
      this.time.delayedCall(100, () => {
        this.scene.start('ActivismScene');
      });
    });

    // Play Again button (secondary)
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
