import Phaser from 'phaser';

/**
 * VisibilityCone — The core game mechanic.
 *
 * Baked-texture approach: draws the cone arc once to a texture, then rotates
 * the Image on pointer move. Eliminates per-frame earcut triangulation.
 * Rebakes only when coneWidth changes (fatigue).
 */

export class VisibilityCone extends Phaser.GameObjects.Container {
  /** Center point (player position) */
  public originX: number;
  public originY: number;

  /** Current angle the cone is pointing (radians) */
  public coneAngle: number = -Math.PI / 2; // Start pointing up

  /** Cone width in radians (~60 degrees) */
  public coneWidth: number = Phaser.Math.DegToRad(60);

  /** How far the cone extends from the player */
  public coneRadius: number = 280;

  /** Visual properties */
  private fillColor: number = 0xfbbf24;
  private fillAlpha: number = 0.18;
  private strokeColor: number = 0xfbbf24;
  private strokeAlpha: number = 0.5;

  /** Baked cone image */
  private coneImage: Phaser.GameObjects.Image | null = null;
  private static coneTexCounter = 0;
  private coneTexKey: string | null = null;

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    super(scene, originX, originY);
    this.originX = originX;
    this.originY = originY;
    this.setDepth(5);
    scene.add.existing(this);
    this.bake();
  }

  /** Update the cone's pointing direction — just rotates the Image, no redraw */
  setDirection(radians: number): void {
    if (Math.abs(radians - this.coneAngle) < 0.001) return;
    this.coneAngle = radians;
    if (this.coneImage) {
      // Convert radians to degrees for Phaser's setAngle
      this.coneImage.setAngle(Phaser.Math.RadToDeg(radians));
    }
  }

  /** Bake the cone shape to a texture. Only called on init and coneWidth change. */
  private bake(): void {
    // Clean up previous
    if (this.coneImage) {
      this.remove(this.coneImage);
      this.coneImage.destroy();
    }
    if (this.coneTexKey && this.scene.textures.exists(this.coneTexKey)) {
      this.scene.textures.remove(this.coneTexKey);
    }

    const r = this.coneRadius;
    const texSize = r * 2 + 4; // +4 for stroke padding
    const cx = texSize / 2;
    const cy = texSize / 2;

    // Draw cone pointing RIGHT (angle=0) centered in texture
    const halfWidth = this.coneWidth / 2;
    const startAngle = -halfWidth;
    const endAngle = halfWidth;

    const g = this.scene.add.graphics();

    // Filled arc
    g.fillStyle(this.fillColor, this.fillAlpha);
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, r, startAngle, endAngle, false);
    g.lineTo(cx, cy);
    g.closePath();
    g.fillPath();

    // Stroke outline
    g.lineStyle(2, this.strokeColor, this.strokeAlpha);
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, r, startAngle, endAngle, false);
    g.lineTo(cx, cy);
    g.closePath();
    g.strokePath();

    // Edge lines
    g.lineStyle(1, this.strokeColor, this.strokeAlpha * 0.7);
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(startAngle) * r, cy + Math.sin(startAngle) * r);
    g.strokePath();

    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(endAngle) * r, cy + Math.sin(endAngle) * r);
    g.strokePath();

    // Bake
    this.coneTexKey = `cone_${VisibilityCone.coneTexCounter++}`;
    g.generateTexture(this.coneTexKey, texSize, texSize);
    g.destroy();

    // Create Image centered at origin, rotated to current angle
    this.coneImage = this.scene.add.image(0, 0, this.coneTexKey);
    this.coneImage.setOrigin(0.5, 0.5);
    this.coneImage.setAngle(Phaser.Math.RadToDeg(this.coneAngle));
    this.add(this.coneImage);
  }

  /**
   * Check if a point (car position) is inside the visibility cone.
   * Pure math — no rendering involved.
   */
  containsPoint(px: number, py: number): boolean {
    // Distance check
    const dx = px - this.originX;
    const dy = py - this.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.coneRadius || dist < 10) return false;

    // Angle check
    let pointAngle = Math.atan2(dy, dx);

    // Normalize angles for comparison
    let startAngle = this.coneAngle - this.coneWidth / 2;
    let endAngle = this.coneAngle + this.coneWidth / 2;

    // Handle wrap-around
    const normalizeAngle = (a: number): number => {
      while (a < -Math.PI) a += Math.PI * 2;
      while (a > Math.PI) a -= Math.PI * 2;
      return a;
    };

    pointAngle = normalizeAngle(pointAngle);
    startAngle = normalizeAngle(startAngle);
    endAngle = normalizeAngle(endAngle);

    // Check if point angle is between start and end
    if (startAngle <= endAngle) {
      return pointAngle >= startAngle && pointAngle <= endAngle;
    } else {
      // Wraps around -PI/PI boundary
      return pointAngle >= startAngle || pointAngle <= endAngle;
    }
  }

  /** Shrink cone (for fatigue in Phase 4) — rebakes the texture */
  setConeWidth(degrees: number): void {
    const newWidth = Phaser.Math.DegToRad(degrees);
    if (Math.abs(newWidth - this.coneWidth) < 0.001) return;
    this.coneWidth = newWidth;
    this.bake();
  }
}
