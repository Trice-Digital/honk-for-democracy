import Phaser from 'phaser';
import type { SignMaterial } from '../config/signConfig';
import { PALETTE } from '../config/paletteConfig';
import {
  drawPaperShadow,
  drawScissorCutRect,
  drawScissorCutPolygon,
  drawPopsicleStick,
  wobbleSine,
} from '../utils/paperArt';

/**
 * Player entity — Paper cutout protester (top-down).
 *
 * Phase 9-04 visual overhaul: Construction paper person with head, body,
 * arms (one holding sign), legs, popsicle stick sign mount, scissor-cut
 * outline, hard-offset shadow, marker outlines.
 *
 * Fatigue visuals: arm crease at 70%+, arm droop at 85%+.
 * Idle wobble: 0.5 degree sine wobble on container.
 */

// Body proportions (at game scale ~65px tall including sign)
const BODY_W = 18;
const BODY_H = 22;
const HEAD_R = 8;
const ARM_W = 12;
const ARM_H = 5;
const LEG_W = 5;
const LEG_H = 10;
const SIGN_W = 40;
const SIGN_H = 22;

// Colors
const SKIN_COLOR = 0xf5c692; // warm paper skin
const SHIRT_COLOR = 0x3b82f6; // muted blue construction paper
const PANTS_COLOR = 0x2c3e50; // dark construction paper
const SHOE_COLOR = 0x4a3728; // dark brown

export class Player extends Phaser.GameObjects.Container {
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private headGraphics: Phaser.GameObjects.Graphics;
  private leftArm: Phaser.GameObjects.Graphics;
  private rightArm: Phaser.GameObjects.Graphics;
  private legsGraphics: Phaser.GameObjects.Graphics;
  private stickGraphics: Phaser.GameObjects.Graphics;
  private signGraphics: Phaser.GameObjects.Graphics;
  private signText: Phaser.GameObjects.Text;
  private signImage: Phaser.GameObjects.Image | null = null;
  private shadowGraphics: Phaser.GameObjects.Graphics;

  // Fatigue visual state
  private currentFatigue: number = 0;
  private rightArmCreaseLine: Phaser.GameObjects.Graphics;

  // Wobble state
  private wobblePhase: number = 0;
  private isIdle: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // === 1. Drop shadow (entire character silhouette offset) ===
    this.shadowGraphics = scene.add.graphics();
    this.drawCharacterShadow();
    this.add(this.shadowGraphics);

    // === 2. Legs (below body) ===
    this.legsGraphics = scene.add.graphics();
    this.drawLegs();
    this.add(this.legsGraphics);

    // === 3. Body (torso — construction paper rectangle) ===
    this.bodyGraphics = scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGraphics);

    // === 4. Left arm (non-sign arm, rests at side) ===
    this.leftArm = scene.add.graphics();
    this.drawLeftArm();
    this.add(this.leftArm);

    // === 5. Right arm (sign-holding arm) — separate for fatigue animation ===
    this.rightArm = scene.add.graphics();
    this.drawRightArm();
    this.add(this.rightArm);

    // === 5b. Arm crease overlay (drawn on top of right arm when fatigued) ===
    this.rightArmCreaseLine = scene.add.graphics();
    this.add(this.rightArmCreaseLine);

    // === 6. Popsicle stick sign post (from right arm up to sign) ===
    this.stickGraphics = scene.add.graphics();
    this.drawStick();
    this.add(this.stickGraphics);

    // === 7. Sign board (paper cutout, held overhead) ===
    this.signGraphics = scene.add.graphics();
    this.drawSignBoard(PALETTE.paperWhite, PALETTE.markerBlack);
    this.add(this.signGraphics);

    // === 8. Sign text ===
    this.signText = scene.add.text(0, -32, 'HONK!', {
      fontFamily: "'Bangers', cursive",
      fontSize: '11px',
      color: '#1a1a1a',
      align: 'center',
      wordWrap: { width: 36 },
    });
    this.signText.setOrigin(0.5);
    this.add(this.signText);

    // === 9. Head (on top of body) ===
    this.headGraphics = scene.add.graphics();
    this.drawHead();
    this.add(this.headGraphics);

    scene.add.existing(this);
  }

  // ============================================================
  // DRAWING METHODS
  // ============================================================

  private drawCharacterShadow(): void {
    const g = this.shadowGraphics;
    g.clear();
    const ox = PALETTE.shadowOffsetX;
    const oy = PALETTE.shadowOffsetY;

    g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    // Shadow of body
    g.fillRect(-BODY_W / 2 + ox, -BODY_H / 2 + oy, BODY_W, BODY_H);
    // Shadow of head
    g.fillCircle(ox, -BODY_H / 2 - HEAD_R + 2 + oy, HEAD_R);
    // Shadow of legs
    g.fillRect(-BODY_W / 2 + 2 + ox, BODY_H / 2 + oy, LEG_W, LEG_H);
    g.fillRect(BODY_W / 2 - LEG_W - 2 + ox, BODY_H / 2 + oy, LEG_W, LEG_H);
    // Shadow of sign
    g.fillRect(-SIGN_W / 2 + ox, -44 + oy, SIGN_W, SIGN_H);
  }

  private drawBody(): void {
    const g = this.bodyGraphics;
    g.clear();
    drawScissorCutRect(g, -BODY_W / 2, -BODY_H / 2, BODY_W, BODY_H, SHIRT_COLOR);
  }

  private drawHead(): void {
    const g = this.headGraphics;
    g.clear();
    const headY = -BODY_H / 2 - HEAD_R + 2;

    // Head circle (scissor-cut wobble via polygon approximation)
    const headPoints: { x: number; y: number }[] = [];
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const wobble = (Math.random() - 0.5) * 1.5;
      headPoints.push({
        x: Math.cos(angle) * (HEAD_R + wobble),
        y: headY + Math.sin(angle) * (HEAD_R + wobble),
      });
    }
    drawScissorCutPolygon(g, headPoints, SKIN_COLOR);

    // Eyes (two marker dots)
    g.fillStyle(PALETTE.markerBlack, 1);
    g.fillCircle(-3, headY - 1, 1.5);
    g.fillCircle(3, headY - 1, 1.5);

    // Determined mouth (small line)
    g.lineStyle(1.5, PALETTE.markerBlack, 0.8);
    g.beginPath();
    g.moveTo(-2, headY + 3);
    g.lineTo(2, headY + 3);
    g.strokePath();
  }

  private drawLeftArm(): void {
    const g = this.leftArm;
    g.clear();
    // Left arm hangs at side
    const armX = -BODY_W / 2 - ARM_W;
    const armY = -BODY_H / 2 + 4;
    drawScissorCutRect(g, armX, armY, ARM_W, ARM_H, SKIN_COLOR);
  }

  private drawRightArm(): void {
    const g = this.rightArm;
    g.clear();
    // Right arm extends to the right, angled slightly up to hold sign
    const armX = BODY_W / 2;
    const armY = -BODY_H / 2 + 4;
    drawScissorCutRect(g, armX, armY, ARM_W, ARM_H, SKIN_COLOR);
  }

  private drawLegs(): void {
    const g = this.legsGraphics;
    g.clear();
    const legY = BODY_H / 2;

    // Left leg
    drawScissorCutRect(g, -BODY_W / 2 + 2, legY, LEG_W, LEG_H, PANTS_COLOR);
    // Left shoe
    g.fillStyle(SHOE_COLOR, 1);
    g.fillRect(-BODY_W / 2 + 1, legY + LEG_H - 3, LEG_W + 2, 3);

    // Right leg
    drawScissorCutRect(g, BODY_W / 2 - LEG_W - 2, legY, LEG_W, LEG_H, PANTS_COLOR);
    // Right shoe
    g.fillStyle(SHOE_COLOR, 1);
    g.fillRect(BODY_W / 2 - LEG_W - 3, legY + LEG_H - 3, LEG_W + 2, 3);
  }

  private drawStick(): void {
    const g = this.stickGraphics;
    g.clear();
    // Popsicle stick from right arm up to sign
    drawPopsicleStick(g, -1.5, -24, 3, 18);
  }

  /**
   * Draw the sign board graphic (paper cutout with shadow and scissor-cut outline).
   */
  private drawSignBoard(fillColor: number, strokeColor: number): void {
    this.signGraphics.clear();
    const signX = -SIGN_W / 2;
    const signY = -44;

    // Hard offset shadow
    drawPaperShadow(this.signGraphics, signX, signY, SIGN_W, SIGN_H);

    // Sign body with scissor-cut edges
    drawScissorCutRect(this.signGraphics, signX, signY, SIGN_W, SIGN_H, fillColor, strokeColor);
  }

  // ============================================================
  // FATIGUE VISUALS
  // ============================================================

  /**
   * Update fatigue-based arm visuals.
   * Call from scene update() with current fatigue percentage (0-100).
   */
  updateFatigueVisuals(fatigue: number): void {
    this.currentFatigue = fatigue;

    // Clear crease line
    this.rightArmCreaseLine.clear();

    if (fatigue > 70) {
      // Draw crease line on sign-holding arm at elbow (midpoint)
      const armX = BODY_W / 2;
      const armY = -BODY_H / 2 + 4;
      const creaseX = armX + ARM_W / 2;

      // Crease gets thicker/darker as fatigue increases
      const intensity = (fatigue - 70) / 30; // 0 to 1 over 70-100%
      const thickness = 1 + intensity * 2;
      const alpha = 0.4 + intensity * 0.5;

      this.rightArmCreaseLine.lineStyle(thickness, PALETTE.markerBlack, alpha);
      this.rightArmCreaseLine.beginPath();
      this.rightArmCreaseLine.moveTo(creaseX, armY);
      this.rightArmCreaseLine.lineTo(creaseX, armY + ARM_H);
      this.rightArmCreaseLine.strokePath();
    }

    if (fatigue > 85) {
      // Arm droops — rotate the right arm down by 10-15 degrees
      const droopAmount = ((fatigue - 85) / 15) * 15; // 0 to 15 degrees
      const droopRad = Phaser.Math.DegToRad(droopAmount);
      this.rightArm.setRotation(droopRad);
      this.rightArmCreaseLine.setRotation(droopRad);
    } else {
      this.rightArm.setRotation(0);
      this.rightArmCreaseLine.setRotation(0);
    }
  }

  // ============================================================
  // IDLE WOBBLE
  // ============================================================

  /**
   * Apply idle wobble animation. Call from scene update().
   * Only wobbles when idle (not actively raising/lowering sign).
   */
  updateWobble(time: number, isRaised: boolean): void {
    if (isRaised) {
      // No wobble while sign is raised — player is bracing
      this.rotation = 0;
      return;
    }
    // 0.5 degrees = ~0.00873 radians
    this.rotation = wobbleSine(0, time, 0.00873, 0.0015);
  }

  // ============================================================
  // PUBLIC API (preserved from original)
  // ============================================================

  /** Set the sign message displayed on the player's sign */
  setSignMessage(message: string): void {
    const display = message.length > 20 ? message.slice(0, 20) + '...' : message;
    this.signText.setText(display);

    if (display.length > 15) {
      this.signText.setFontSize(7);
    } else if (display.length > 10) {
      this.signText.setFontSize(9);
    } else {
      this.signText.setFontSize(11);
    }
  }

  /** Update sign board appearance to match the selected material */
  setSignMaterial(material: SignMaterial): void {
    this.drawSignBoard(material.boardColor, material.strokeColor);
    this.signText.setColor(material.textColor);
  }

  /**
   * Set sign texture from crafted sign PNG (M2 sign creator).
   * Replaces rectangle + text rendering with PNG image.
   */
  setSignTexture(textureKey: string): void {
    // Remove existing sign graphics
    if (this.signGraphics) {
      this.signGraphics.clear();
    }
    if (this.signText) {
      this.signText.setVisible(false);
    }

    // Create image from crafted sign PNG
    this.signImage = this.scene.add.image(0, -32, textureKey);
    this.signImage.setOrigin(0.5);

    // Scale to fit sign area (~40x22px on player, maintaining aspect ratio)
    const targetWidth = 40;
    const targetHeight = 22;
    const scaleX = targetWidth / this.signImage.width;
    const scaleY = targetHeight / this.signImage.height;
    const scale = Math.min(scaleX, scaleY);
    this.signImage.setScale(scale);

    this.add(this.signImage);
  }
}
