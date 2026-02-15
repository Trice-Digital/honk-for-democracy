import Phaser from 'phaser';
import type { IntersectionMapConfig } from '../config/intersectionConfig';
import { GameStateManager } from '../systems/GameStateManager';
import { FatigueSystem } from '../systems/FatigueSystem';
import { TrafficLightSystem } from '../systems/TrafficLightSystem';
import { PALETTE } from '../config/paletteConfig';
import { CONFIDENCE_DEFAULTS } from '../config/confidenceConfig';
import { drawPaperShadowCircle, drawPopsicleStick } from '../utils/paperArt';

/**
 * HUDManager — Manages all HUD elements.
 *
 * Responsibilities:
 * - Score display (top right neobrutalist card)
 * - Timer display (top center card)
 * - Confidence bar (bottom right with color coding)
 * - Fatigue bar (bottom left with traffic light hints)
 * - Analog clock (paper cutout with animated hands)
 * - Updating all UI elements each frame
 */
export class HUDManager {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  // Confidence UI
  private confidenceBarBg!: Phaser.GameObjects.Rectangle;
  private confidenceBarFill!: Phaser.GameObjects.Rectangle;
  private confidenceLabel!: Phaser.GameObjects.Text;

  // Fatigue UI
  private fatigueBarBg!: Phaser.GameObjects.Rectangle;
  private fatigueBarFill!: Phaser.GameObjects.Rectangle;
  private fatigueLabel!: Phaser.GameObjects.Text;

  // Clock UI
  private clockContainer!: Phaser.GameObjects.Container;
  private clockHourHand!: Phaser.GameObjects.Image;
  private clockMinuteHand!: Phaser.GameObjects.Image;

  constructor(
    private scene: Phaser.Scene,
    private gameState: GameStateManager,
    private fatigueSystem: FatigueSystem,
    private trafficLights: TrafficLightSystem,
    private config: IntersectionMapConfig,
  ) {}

  /**
   * Create all HUD elements.
   */
  createUI(viewW: number, viewH: number): void {
    this.createScoreUI(viewW);
    this.createTimerUI(viewW);
    this.createConfidenceUI(viewW, viewH);
    this.createFatigueUI(viewW, viewH);
    this.createClockUI(viewW);
  }

  /**
   * Update all HUD elements based on current game state.
   */
  updateUI(): void {
    const state = this.gameState.getState();

    // Score (neobrutalist HUD, Bangers font, safety yellow with marker stroke)
    this.scoreText.setText(`${state.score} HONKS`);

    // Timer (marker-style font)
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = Math.floor(state.timeRemaining % 60);
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    if (state.timeRemaining <= 30) {
      this.timerText.setColor(state.timeRemaining % 1 < 0.5 ? '#ef4444' : '#ffffff');
    }

    // --- Confidence bar ---
    const confPct = state.confidence / 100;
    const confBarMaxWidth = 145 - 2;
    const targetWidth = confPct * confBarMaxWidth;

    // Smooth animation: lerp toward target
    const currentWidth = this.confidenceBarFill.width;
    const lerpSpeed = 0.08;
    const newWidth = currentWidth + (targetWidth - currentWidth) * lerpSpeed;
    this.confidenceBarFill.width = Math.max(0, newWidth);

    // Color: red (0-30), yellow (30-60), green (60-100)
    let confColor: number;
    if (state.confidence < 30) {
      confColor = PALETTE.stoplightRed;
    } else if (state.confidence < 60) {
      confColor = PALETTE.safetyYellow;
    } else {
      confColor = PALETTE.stoplightGreen;
    }
    this.confidenceBarFill.setFillStyle(confColor);
    this.confidenceLabel.setText('CONFIDENCE');

    // --- Fatigue bar ---
    const fatPct = state.armFatigue / 100;
    const fatBarMaxWidth = 110 - 2;
    this.fatigueBarFill.width = fatPct * fatBarMaxWidth;

    // Color: green (0-40), orange (40-70), red (70-100)
    let fatColor: number;
    if (state.armFatigue < 40) {
      fatColor = PALETTE.stoplightGreen;
    } else if (state.armFatigue < 70) {
      fatColor = 0xf97316;
    } else {
      fatColor = PALETTE.stoplightRed;
    }
    this.fatigueBarFill.setFillStyle(fatColor);

    // Update fatigue label text and color
    if (state.armFatigue < 40) {
      this.fatigueLabel.setText('ARM STRONG');
      this.fatigueLabel.setColor('#22c55e');
    } else if (state.armFatigue < 70) {
      this.fatigueLabel.setText('ARM TIRED');
      this.fatigueLabel.setColor('#fbbf24');
    } else {
      this.fatigueLabel.setText('ARM DEAD');
      this.fatigueLabel.setColor('#ef4444');
    }

    // --- Fatigue bar traffic light hint ---
    // Green border = push now (traffic red, cars stopped)
    // Yellow border = conserve (traffic green, cars moving)
    const greenDirs = this.trafficLights.getGreenDirections();
    const isAllRedPhase = greenDirs.length === 0;
    if (isAllRedPhase) {
      this.fatigueBarBg.setStrokeStyle(2.5, PALETTE.stoplightGreen, 1);
    } else {
      this.fatigueBarBg.setStrokeStyle(2, PALETTE.safetyYellow, 0.8);
    }

    // --- Paper clock hands ---
    this.updateClock();
  }

  /**
   * Reposition UI elements on window resize.
   */
  repositionUI(viewW: number, viewH: number): void {
    // Timer text repositioning handled in createTimerUI via resize event
    // This method repositions other elements that need resize handling

    // Reposition buttons are handled in PlayerController
    // This just handles HUD elements that need dynamic repositioning
    // Currently, most HUD elements are positioned relative to viewport edges
    // and use setScrollFactor(0), so they auto-adjust
  }

  private createScoreUI(viewW: number): void {
    // --- Score display (top right, neobrutalist paper cutout card) ---
    const scoreCardW = 155;
    const scoreCardH = 42;
    const scoreX = viewW - scoreCardW - 20;
    const scoreY = 15;

    // Hard offset shadow
    const scoreShadow = this.scene.add.graphics();
    scoreShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    scoreShadow.fillRoundedRect(scoreX + 3, scoreY + 3, scoreCardW, scoreCardH, 4);
    scoreShadow.setScrollFactor(0);
    scoreShadow.setDepth(98);

    const scoreBg = this.scene.add.graphics();
    scoreBg.fillStyle(PALETTE.paperWhite, 0.95);
    scoreBg.fillRoundedRect(scoreX, scoreY, scoreCardW, scoreCardH, 4);
    scoreBg.lineStyle(3, PALETTE.markerBlack, 1);
    scoreBg.strokeRoundedRect(scoreX, scoreY, scoreCardW, scoreCardH, 4);
    scoreBg.setScrollFactor(0);
    scoreBg.setDepth(99);

    this.scoreText = this.scene.add.text(0, 0, '0 HONKS', {
      fontFamily: "'Bangers', cursive",
      fontSize: '32px',
      color: '#fbbf24',
      stroke: '#1a1a1a',
      strokeThickness: 4,
      letterSpacing: 2,
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(100);
    this.scoreText.setOrigin(0.5);
    this.scoreText.setPosition(scoreX + scoreCardW / 2, scoreY + scoreCardH / 2);
  }

  private createTimerUI(viewW: number): void {
    // --- Timer / Clock display (top center, neobrutalist card) ---
    const timerCardW = 100;
    const timerCardH = 48;
    const timerX = viewW / 2 - timerCardW / 2;
    const timerY = 10;

    const timerShadow = this.scene.add.graphics();
    timerShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    timerShadow.fillRoundedRect(timerX + 3, timerY + 3, timerCardW, timerCardH, 4);
    timerShadow.setScrollFactor(0);
    timerShadow.setDepth(98);

    const timerBg = this.scene.add.graphics();
    timerBg.fillStyle(PALETTE.paperWhite, 0.95);
    timerBg.fillRoundedRect(timerX, timerY, timerCardW, timerCardH, 4);
    timerBg.lineStyle(3, PALETTE.markerBlack, 1);
    timerBg.strokeRoundedRect(timerX, timerY, timerCardW, timerCardH, 4);
    timerBg.setScrollFactor(0);
    timerBg.setDepth(99);

    this.timerText = this.scene.add.text(0, 0, '3:00', {
      fontFamily: "'Bangers', cursive",
      fontSize: '30px',
      color: '#f5f0e8',
      stroke: '#1a1a1a',
      strokeThickness: 4,
    });
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(100);
    this.timerText.setOrigin(0.5);
    this.timerText.setPosition(viewW / 2, timerY + timerCardH / 2);
  }

  private createConfidenceUI(viewW: number, viewH: number): void {
    const cardW = 165;
    const cardH = 40;
    const barX = viewW - cardW - 15;
    const barY = viewH - cardH - 15;

    // Hard offset shadow
    const confShadow = this.scene.add.graphics();
    confShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    confShadow.fillRoundedRect(barX + 3, barY + 3, cardW, cardH, 4);
    confShadow.setScrollFactor(0);
    confShadow.setDepth(98);

    // Paper card background
    const confCard = this.scene.add.graphics();
    confCard.fillStyle(PALETTE.paperWhite, 0.95);
    confCard.fillRoundedRect(barX, barY, cardW, cardH, 4);
    confCard.lineStyle(3, PALETTE.markerBlack, 1);
    confCard.strokeRoundedRect(barX, barY, cardW, cardH, 4);
    confCard.setScrollFactor(0);
    confCard.setDepth(99);

    // Label
    this.confidenceLabel = this.scene.add.text(barX + 12, barY + 5, 'CONFIDENCE', {
      fontFamily: "'Bangers', cursive",
      fontSize: '10px',
      color: '#3a3a3a',
      letterSpacing: 1,
    });
    this.confidenceLabel.setScrollFactor(0);
    this.confidenceLabel.setDepth(100);

    // Bar background (paper-textured with grain lines)
    const barInnerX = barX + 10;
    const barInnerY = barY + 20;
    const barWidth = 145;
    const barHeight = 12;

    this.confidenceBarBg = this.scene.add.rectangle(barInnerX, barInnerY, barWidth, barHeight, PALETTE.cardboard);
    this.confidenceBarBg.setOrigin(0, 0);
    this.confidenceBarBg.setStrokeStyle(2, PALETTE.markerBlack, 0.9);
    this.confidenceBarBg.setScrollFactor(0);
    this.confidenceBarBg.setDepth(100);

    // Bar fill
    const initialWidth = (CONFIDENCE_DEFAULTS.startingConfidence / 100) * barWidth;
    this.confidenceBarFill = this.scene.add.rectangle(barInnerX + 1, barInnerY + 1, initialWidth - 2, barHeight - 2, PALETTE.stoplightGreen);
    this.confidenceBarFill.setOrigin(0, 0);
    this.confidenceBarFill.setScrollFactor(0);
    this.confidenceBarFill.setDepth(101);
  }

  private createFatigueUI(_viewW: number, viewH: number): void {
    const cardW = 160;
    const cardH = 40;
    const barX = 15;
    const barY = viewH - cardH - 15;

    // Hard offset shadow
    const fatShadow = this.scene.add.graphics();
    fatShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    fatShadow.fillRoundedRect(barX + 3, barY + 3, cardW, cardH, 4);
    fatShadow.setScrollFactor(0);
    fatShadow.setDepth(98);

    // Paper card background
    const fatCard = this.scene.add.graphics();
    fatCard.fillStyle(PALETTE.paperWhite, 0.95);
    fatCard.fillRoundedRect(barX, barY, cardW, cardH, 4);
    fatCard.lineStyle(3, PALETTE.markerBlack, 1);
    fatCard.strokeRoundedRect(barX, barY, cardW, cardH, 4);
    fatCard.setScrollFactor(0);
    fatCard.setDepth(99);

    // Muscle emoji
    const muscleEmoji = this.scene.add.text(barX + 18, barY + 22, '\uD83D\uDCAA', {
      fontSize: '16px',
    });
    muscleEmoji.setOrigin(0.5);
    muscleEmoji.setScrollFactor(0);
    muscleEmoji.setDepth(100);

    // Label
    this.fatigueLabel = this.scene.add.text(barX + 36, barY + 5, 'ARM STRONG', {
      fontFamily: "'Bangers', cursive",
      fontSize: '10px',
      color: '#22c55e',
      letterSpacing: 1,
    });
    this.fatigueLabel.setScrollFactor(0);
    this.fatigueLabel.setDepth(100);

    // Bar background (paper-textured)
    const barInnerX = barX + 36;
    const barInnerY = barY + 18;
    const barWidth = 110;
    const barHeight = 16;

    this.fatigueBarBg = this.scene.add.rectangle(barInnerX, barInnerY, barWidth, barHeight, PALETTE.cardboard);
    this.fatigueBarBg.setOrigin(0, 0);
    this.fatigueBarBg.setStrokeStyle(2, PALETTE.markerBlack, 0.9);
    this.fatigueBarBg.setScrollFactor(0);
    this.fatigueBarBg.setDepth(100);

    // Bar fill (starts empty)
    this.fatigueBarFill = this.scene.add.rectangle(barInnerX + 1, barInnerY + 1, 0, barHeight - 2, PALETTE.stoplightGreen);
    this.fatigueBarFill.setOrigin(0, 0);
    this.fatigueBarFill.setScrollFactor(0);
    this.fatigueBarFill.setDepth(101);
  }

  private createClockUI(viewW: number): void {
    const clockX = viewW / 2;
    const clockY = 100; // Below the timer card
    const radius = 38;

    this.clockContainer = this.scene.add.container(clockX, clockY);
    this.clockContainer.setScrollFactor(0);
    this.clockContainer.setDepth(100);

    // Bake entire clock face (stick, shadow, face, ticks) to one texture
    const clockFaceG = this.scene.add.graphics();

    // Popsicle stick mount below the clock
    drawPopsicleStick(clockFaceG, -4 + radius + 8, radius + 2 + radius + 8, 8, 22);

    // Clock face shadow (hard offset)
    drawPaperShadowCircle(clockFaceG, radius + 8, radius + 8, radius);

    // Clock face circle (paper white with scissor-cut wobble)
    const numSegments = 24;
    const facePoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      const wobble = (Math.random() - 0.5) * 2.5;
      facePoints.push({
        x: Math.cos(angle) * (radius + wobble) + radius + 8,
        y: Math.sin(angle) * (radius + wobble) + radius + 8,
      });
    }
    clockFaceG.fillStyle(PALETTE.paperWhite, 1);
    clockFaceG.lineStyle(2, PALETTE.markerBlack, 0.9);
    clockFaceG.beginPath();
    clockFaceG.moveTo(facePoints[0].x, facePoints[0].y);
    for (let i = 1; i < facePoints.length; i++) {
      clockFaceG.lineTo(facePoints[i].x, facePoints[i].y);
    }
    clockFaceG.closePath();
    clockFaceG.fillPath();
    clockFaceG.strokePath();

    // 12 tick marks
    for (let h = 0; h < 12; h++) {
      const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const innerR = radius - 8;
      const outerR = radius - 3;
      clockFaceG.lineStyle(h % 3 === 0 ? 2.5 : 1.5, PALETTE.markerBlack, 0.85);
      clockFaceG.beginPath();
      clockFaceG.moveTo(Math.cos(angle) * innerR + radius + 8, Math.sin(angle) * innerR + radius + 8);
      clockFaceG.lineTo(Math.cos(angle) * outerR + radius + 8, Math.sin(angle) * outerR + radius + 8);
      clockFaceG.strokePath();
    }

    // Center dot
    clockFaceG.fillStyle(PALETTE.markerBlack, 1);
    clockFaceG.fillCircle(radius + 8, radius + 8, 3);

    // Bake to texture
    const faceDim = (radius + 8) * 2;
    clockFaceG.generateTexture('clockFace', faceDim, faceDim + 30); // extra height for stick
    clockFaceG.destroy();
    const clockFaceImg = this.scene.add.image(0, 4, 'clockFace');
    clockFaceImg.setOrigin(0.5, (radius + 8) / (faceDim + 30));
    this.clockContainer.add(clockFaceImg);

    // Hour numbers: 12, 3, 6, 9 (Text objects are cheap, no earcut)
    const numberPositions = [
      { text: '12', angle: -Math.PI / 2, dist: radius - 15 },
      { text: '3', angle: 0, dist: radius - 13 },
      { text: '6', angle: Math.PI / 2, dist: radius - 15 },
      { text: '9', angle: Math.PI, dist: radius - 13 },
    ];
    for (const np of numberPositions) {
      const nx = Math.cos(np.angle) * np.dist;
      const ny = Math.sin(np.angle) * np.dist;
      const numText = this.scene.add.text(nx, ny, np.text, {
        fontFamily: "'Bangers', cursive",
        fontSize: '9px',
        color: '#3a3a3a',
      });
      numText.setOrigin(0.5);
      this.clockContainer.add(numText);
    }

    // Clock hands — bake as tiny line textures, rotate via angle property (no per-frame earcut)
    // Hour hand texture (short thick line)
    const hourG = this.scene.add.graphics();
    hourG.lineStyle(3, PALETTE.markerBlack, 1);
    hourG.beginPath();
    hourG.moveTo(2, 18);  // pivot point near bottom
    hourG.lineTo(2, 2);   // line extends up
    hourG.strokePath();
    hourG.generateTexture('clockHourHand', 4, 20);
    hourG.destroy();
    this.clockHourHand = this.scene.add.image(0, 0, 'clockHourHand');
    this.clockHourHand.setOrigin(0.5, 1); // pivot at bottom center
    this.clockContainer.add(this.clockHourHand);

    // Minute hand texture (longer thinner line)
    const minG = this.scene.add.graphics();
    minG.lineStyle(2, PALETTE.markerBlack, 0.9);
    minG.beginPath();
    minG.moveTo(2, 28);
    minG.lineTo(2, 2);
    minG.strokePath();
    minG.generateTexture('clockMinuteHand', 4, 30);
    minG.destroy();
    this.clockMinuteHand = this.scene.add.image(0, 0, 'clockMinuteHand');
    this.clockMinuteHand.setOrigin(0.5, 1); // pivot at bottom center
    this.clockContainer.add(this.clockMinuteHand);
  }

  private updateClock(): void {
    if (!this.clockHourHand) return;

    const state = this.gameState.getState();
    const sessionDuration = this.config.sessionDuration;
    const gameProgress = 1 - (state.timeRemaining / sessionDuration); // 0.0 -> 1.0

    // 10 o'clock → 12 o'clock (60 degree sweep) mapped to Phaser rotation degrees
    // 10 o'clock = 300 degrees from 12, 12 o'clock = 360/0 degrees
    const hourStartDeg = 300;
    const hourEndDeg = 360;
    const hourDeg = hourStartDeg + (hourEndDeg - hourStartDeg) * gameProgress;
    this.clockHourHand.setAngle(hourDeg);

    // Minute hand: 2 full rotations (0 → 720 degrees)
    const minuteDeg = gameProgress * 720;
    this.clockMinuteHand.setAngle(minuteDeg);
  }
}
