import Phaser from 'phaser';

/**
 * VisibilityCone — The core game mechanic.
 *
 * A semi-transparent arc that the player rotates by dragging.
 * Cars passing through this cone are "reached" and generate reactions.
 * One implementation, works everywhere.
 */

export class VisibilityCone extends Phaser.GameObjects.Graphics {
  /** Center point (player position) */
  public originX: number;
  public originY: number;

  /** Current angle the cone is pointing (radians) */
  public angle: number = -Math.PI / 2; // Start pointing up

  /** Cone width in radians (~60 degrees) */
  public coneWidth: number = Phaser.Math.DegToRad(60);

  /** How far the cone extends from the player */
  public coneRadius: number = 280;

  /** Visual properties */
  private fillColor: number = 0xfbbf24;
  private fillAlpha: number = 0.18;
  private strokeColor: number = 0xfbbf24;
  private strokeAlpha: number = 0.5;

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    super(scene);
    this.originX = originX;
    this.originY = originY;
    this.setDepth(5);
    scene.add.existing(this);
    this.draw();
  }

  /** Update the cone's pointing direction */
  setDirection(radians: number): void {
    this.angle = radians;
    this.draw();
  }

  /** Redraw the cone graphic */
  draw(): void {
    this.clear();

    const startAngle = this.angle - this.coneWidth / 2;
    const endAngle = this.angle + this.coneWidth / 2;

    // Filled arc
    this.fillStyle(this.fillColor, this.fillAlpha);
    this.beginPath();
    this.moveTo(this.originX, this.originY);
    this.arc(this.originX, this.originY, this.coneRadius, startAngle, endAngle, false);
    this.lineTo(this.originX, this.originY);
    this.closePath();
    this.fillPath();

    // Stroke outline
    this.lineStyle(2, this.strokeColor, this.strokeAlpha);
    this.beginPath();
    this.moveTo(this.originX, this.originY);
    this.arc(this.originX, this.originY, this.coneRadius, startAngle, endAngle, false);
    this.lineTo(this.originX, this.originY);
    this.closePath();
    this.strokePath();

    // Edge lines for clarity
    this.lineStyle(1, this.strokeColor, this.strokeAlpha * 0.7);
    this.beginPath();
    this.moveTo(this.originX, this.originY);
    this.lineTo(
      this.originX + Math.cos(startAngle) * this.coneRadius,
      this.originY + Math.sin(startAngle) * this.coneRadius,
    );
    this.strokePath();

    this.beginPath();
    this.moveTo(this.originX, this.originY);
    this.lineTo(
      this.originX + Math.cos(endAngle) * this.coneRadius,
      this.originY + Math.sin(endAngle) * this.coneRadius,
    );
    this.strokePath();
  }

  /**
   * Check if a point (car position) is inside the visibility cone.
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
    let startAngle = this.angle - this.coneWidth / 2;
    let endAngle = this.angle + this.coneWidth / 2;

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

  /** Shrink cone (for fatigue in Phase 4) */
  setConeWidth(degrees: number): void {
    this.coneWidth = Phaser.Math.DegToRad(degrees);
    this.draw();
  }
}
