import Phaser from 'phaser';
import type { TrafficDirection, LaneDefinition } from '../config/intersectionConfig';
import { PALETTE, CAR_PAPER_COLORS } from '../config/paletteConfig';
import { drawPaperShadow, drawScissorCutPolygon } from '../utils/paperArt';

/**
 * Car entity — Paper cutout vehicle (top-down).
 *
 * Phase 9-02 visual overhaul:
 *   - 4 car types with weighted random selection (sedan, suv, pickup, liftedTruck)
 *   - Scissor-cut polygon outlines via paperArt utilities
 *   - Hard-offset drop shadows (paper-on-table)
 *   - Construction paper colors from paletteConfig
 *   - Emoji face drivers (14-16px, centered on cabin)
 *   - Coal roller smoke puffs (lifted trucks only, animated with tweens)
 *   - Wind catch tilt when entering player visibility
 */

// ---------------------------------------------------------------------------
// Car type system
// ---------------------------------------------------------------------------

export type CarType = 'sedan' | 'suv' | 'pickup' | 'liftedTruck';

const CAR_TYPE_WEIGHTS: { type: CarType; weight: number }[] = [
  { type: 'sedan', weight: 0.45 },
  { type: 'suv', weight: 0.25 },
  { type: 'pickup', weight: 0.20 },
  { type: 'liftedTruck', weight: 0.10 },
];

function pickWeightedCarType(): CarType {
  const r = Math.random();
  let cumulative = 0;
  for (const entry of CAR_TYPE_WEIGHTS) {
    cumulative += entry.weight;
    if (r <= cumulative) return entry.type;
  }
  return 'sedan';
}

// Top-down polygon points for each car type (northbound orientation, origin at center)
// Points are defined clockwise from front-left

interface CarTypeDef {
  width: number;
  height: number;
  /** Polygon points relative to (0,0) center, northbound (front = -y) */
  points: { x: number; y: number }[];
  /** Extra bed polygon for pickups (lighter fill) */
  bedPoints?: { x: number; y: number }[];
}

const CAR_TYPE_DEFS: Record<CarType, CarTypeDef> = {
  sedan: {
    width: 28, height: 48,
    points: [
      // Rounded front hood
      { x: -10, y: -24 }, { x: -12, y: -20 }, { x: -14, y: -12 },
      // Side panels
      { x: -14, y: 12 }, { x: -12, y: 20 },
      // Rounded trunk
      { x: -10, y: 24 }, { x: 10, y: 24 },
      // Right side
      { x: 12, y: 20 }, { x: 14, y: 12 },
      { x: 14, y: -12 }, { x: 12, y: -20 },
      { x: 10, y: -24 },
    ],
  },
  suv: {
    width: 32, height: 54,
    points: [
      // Boxy front
      { x: -13, y: -27 }, { x: -15, y: -22 },
      // Straight sides (boxy)
      { x: -16, y: -16 }, { x: -16, y: 22 },
      // Squared-off rear
      { x: -14, y: 27 }, { x: 14, y: 27 },
      // Right side
      { x: 16, y: 22 }, { x: 16, y: -16 },
      { x: 15, y: -22 }, { x: 13, y: -27 },
    ],
  },
  pickup: {
    width: 30, height: 56,
    points: [
      // Front cab
      { x: -11, y: -28 }, { x: -13, y: -22 },
      { x: -15, y: -14 }, { x: -15, y: 28 },
      // Flat rear
      { x: -13, y: 28 }, { x: 13, y: 28 },
      // Right side
      { x: 15, y: 28 }, { x: 15, y: -14 },
      { x: 13, y: -22 }, { x: 11, y: -28 },
    ],
    bedPoints: [
      { x: -13, y: 4 }, { x: -13, y: 26 },
      { x: 13, y: 26 }, { x: 13, y: 4 },
    ],
  },
  liftedTruck: {
    width: 34, height: 58,
    points: [
      // Bull bar at front
      { x: -14, y: -29 }, { x: -16, y: -26 },
      // Wide aggressive body
      { x: -17, y: -20 }, { x: -17, y: 24 },
      // Flat rear
      { x: -15, y: 29 }, { x: 15, y: 29 },
      // Right side
      { x: 17, y: 24 }, { x: 17, y: -20 },
      { x: 16, y: -26 }, { x: 14, y: -29 },
    ],
    bedPoints: [
      { x: -15, y: 6 }, { x: -15, y: 27 },
      { x: 15, y: 27 }, { x: 15, y: 6 },
    ],
  },
};

// Emoji face sets
const DRIVER_FACES = ['😐', '😊', '😤', '😠', '🙂', '😑'];
const POSITIVE_FACES = ['😊', '🤟', '😄', '👍'];
const NEGATIVE_FACES = ['😒', '😤', '🖕', '😡'];
const NEUTRAL_FACES = ['😐', '😶', '🫤'];

// Windshield tint
const WINDSHIELD_TINT = 0xc8e6ff;

export class Car extends Phaser.GameObjects.Container {
  public direction: TrafficDirection;
  public lane: LaneDefinition;
  public speed: number;
  public hasBeenReached: boolean = false;
  public hasPassed: boolean = false;
  public isStopped: boolean = false;
  public carType: CarType;

  private carBody: Phaser.GameObjects.Graphics;
  private emojiText: Phaser.GameObjects.Text;
  private carWidth: number;
  private carLength: number;
  private carColor: number;

  // Wobble animation state
  private wobblePhase: number = Math.random() * Math.PI * 2;

  // Smoke puff state (lifted truck only)
  private smokeTimer: number = 0;

  // Wind catch flag
  private hasWindCaught: boolean = false;

  constructor(scene: Phaser.Scene, lane: LaneDefinition, speed: number) {
    super(scene, lane.spawnX, lane.spawnY);

    this.direction = lane.direction;
    this.lane = lane;
    this.speed = speed;

    // Pick weighted random car type
    this.carType = pickWeightedCarType();

    const def = CAR_TYPE_DEFS[this.carType];
    const isVertical = this.direction === 'north' || this.direction === 'south';
    this.carWidth = isVertical ? def.width : def.height;
    this.carLength = isVertical ? def.height : def.width;

    // Random construction paper color (lifted trucks get dark colors)
    this.carColor = this.carType === 'liftedTruck'
      ? [0x2c3e50, 0x2a2a2a, 0x7f8c8d][Math.floor(Math.random() * 3)]
      : CAR_PAPER_COLORS[Math.floor(Math.random() * CAR_PAPER_COLORS.length)];

    // Draw the car body
    this.carBody = scene.add.graphics();
    this.drawPaperCar();
    this.add(this.carBody);

    // Emoji face driver (14-16px, centered on cabin)
    const fontSize = 14 + Math.floor(Math.random() * 3); // 14-16
    const face = DRIVER_FACES[Math.floor(Math.random() * DRIVER_FACES.length)];
    const facePos = this.getWindshieldCenter();
    this.emojiText = scene.add.text(facePos.x, facePos.y, face, {
      fontSize: `${fontSize}px`,
    });
    this.emojiText.setOrigin(0.5);
    this.add(this.emojiText);

    scene.add.existing(this);
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  /**
   * Draw the paper cutout car: shadow, scissor-cut body, windows, wheels, outlines.
   * All drawing is relative to (0,0) center. Container rotation handles direction.
   */
  private drawPaperCar(): void {
    const g = this.carBody;
    g.clear();

    const def = CAR_TYPE_DEFS[this.carType];
    const hw = def.width / 2;
    const hh = def.height / 2;

    // 1. Hard-offset drop shadow
    drawPaperShadow(g, -hw, -hh, def.width, def.height);

    // 2. Scissor-cut body polygon
    drawScissorCutPolygon(g, def.points, this.carColor, PALETTE.markerBlack);

    // 3. Windshield (lighter translucent area near front)
    const wsInset = 4;
    const wsW = def.width - wsInset * 2;
    const wsH = def.height * 0.18;
    const wsY = -hh + wsInset;
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-hw + wsInset, wsY, wsW, wsH, 3);
    g.lineStyle(1, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-hw + wsInset, wsY, wsW, wsH, 3);

    // Rear window (smaller)
    const rwH = wsH * 0.6;
    const rwY = hh - wsInset - rwH;
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-hw + wsInset + 2, rwY, wsW - 4, rwH, 2);
    g.lineStyle(0.8, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-hw + wsInset + 2, rwY, wsW - 4, rwH, 2);

    // 4. Pickup / lifted truck bed (lighter fill)
    if (def.bedPoints) {
      const bedColor = this.carType === 'liftedTruck' ? 0x333333 : PALETTE.cardboard;
      g.fillStyle(bedColor, 0.9);
      g.lineStyle(1.5, PALETTE.markerBlack, 0.6);
      g.beginPath();
      g.moveTo(def.bedPoints[0].x, def.bedPoints[0].y);
      for (let i = 1; i < def.bedPoints.length; i++) {
        g.lineTo(def.bedPoints[i].x, def.bedPoints[i].y);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    }

    // 5. Wheels — small dark rounded rects at four corners
    const wheelW = 5;
    const wheelH = 8;
    g.fillStyle(PALETTE.markerBlack, 0.85);
    // Front-left, front-right, rear-left, rear-right
    g.fillRoundedRect(-hw - 1, -hh + 6, wheelW, wheelH, 2);
    g.fillRoundedRect(hw - wheelW + 1, -hh + 6, wheelW, wheelH, 2);
    g.fillRoundedRect(-hw - 1, hh - 6 - wheelH, wheelW, wheelH, 2);
    g.fillRoundedRect(hw - wheelW + 1, hh - 6 - wheelH, wheelW, wheelH, 2);

    // 6. SUV roof rack lines
    if (this.carType === 'suv') {
      g.lineStyle(1.5, PALETTE.markerBlack, 0.35);
      g.beginPath(); g.moveTo(-hw + 3, -hh + 3); g.lineTo(-hw + 3, hh - 3); g.strokePath();
      g.beginPath(); g.moveTo(hw - 3, -hh + 3); g.lineTo(hw - 3, hh - 3); g.strokePath();
    }

    // 7. Lifted truck bull bar
    if (this.carType === 'liftedTruck') {
      g.lineStyle(2.5, PALETTE.markerBlack, 0.8);
      g.beginPath();
      g.moveTo(-12, -hh - 2);
      g.lineTo(12, -hh - 2);
      g.strokePath();
      // Smoke stack nubs on sides
      g.fillStyle(0x555555, 1);
      g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
      g.fillCircle(-hw + 6, -4, 3.5);
      g.strokeCircle(-hw + 6, -4, 3.5);
      g.fillCircle(hw - 6, -4, 3.5);
      g.strokeCircle(hw - 6, -4, 3.5);
    }

    // 8. Final marker outline re-stroke of the body silhouette
    g.lineStyle(2, PALETTE.markerBlack, 1);
    g.beginPath();
    g.moveTo(def.points[0].x, def.points[0].y);
    for (let i = 1; i < def.points.length; i++) {
      g.lineTo(def.points[i].x, def.points[i].y);
    }
    g.closePath();
    g.strokePath();
  }

  /**
   * Get the windshield center for emoji placement (always in local/northbound coords).
   */
  private getWindshieldCenter(): { x: number; y: number } {
    const def = CAR_TYPE_DEFS[this.carType];
    const hh = def.height / 2;
    const wsInset = 4;
    const wsH = def.height * 0.18;
    return { x: 0, y: -hh + wsInset + wsH / 2 };
  }

  // ---------------------------------------------------------------------------
  // Public API — reaction face
  // ---------------------------------------------------------------------------

  /**
   * Update the emoji face to match a reaction sentiment.
   */
  setReactionFace(sentiment: 'positive' | 'negative' | 'neutral'): void {
    const faces = sentiment === 'positive' ? POSITIVE_FACES
      : sentiment === 'negative' ? NEGATIVE_FACES
      : NEUTRAL_FACES;
    this.emojiText.setText(faces[Math.floor(Math.random() * faces.length)]);
  }

  // ---------------------------------------------------------------------------
  // Wind catch — brief tilt when entering player's visibility cone
  // ---------------------------------------------------------------------------

  /**
   * Trigger wind catch animation (5-degree tilt-and-back).
   * Call once per car pass from the reaction proximity system.
   */
  triggerWindCatch(): void {
    if (this.hasWindCaught) return;
    this.hasWindCaught = true;
    this.scene.tweens.add({
      targets: this,
      angle: 5,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  // ---------------------------------------------------------------------------
  // Coal roller smoke puffs (lifted truck only)
  // ---------------------------------------------------------------------------

  /**
   * Emit 2-3 small gray paper cutout smoke puffs behind the truck.
   * They drift backward, float up, and fade out over 800ms via tweens.
   */
  private emitSmokePuff(): void {
    const numPuffs = 2 + Math.floor(Math.random() * 2); // 2-3

    for (let i = 0; i < numPuffs; i++) {
      const puffG = this.scene.add.graphics();
      const radius = 8 + Math.random() * 4; // 8-12px
      const offsetX = (Math.random() - 0.5) * 10;

      // Draw the puff as a scissor-cut circle approximation
      puffG.fillStyle(PALETTE.shadowDark, 0.3);
      puffG.fillCircle(0, 0, radius);
      puffG.lineStyle(1, PALETTE.markerBlack, 0.15);
      puffG.strokeCircle(0, 0, radius);

      // Position behind the truck in world coords
      const def = CAR_TYPE_DEFS[this.carType];
      const hh = def.height / 2;
      let spawnX = this.x + offsetX;
      let spawnY = this.y;
      let driftX = 0;
      let driftY = 0;

      switch (this.direction) {
        case 'north': spawnY = this.y + hh + 8; driftY = 30; driftX = offsetX; break;
        case 'south': spawnY = this.y - hh - 8; driftY = -30; driftX = offsetX; break;
        case 'east':  spawnX = this.x - hh - 8; spawnY = this.y + offsetX; driftX = -30; driftY = offsetX; break;
        case 'west':  spawnX = this.x + hh + 8; spawnY = this.y + offsetX; driftX = 30; driftY = offsetX; break;
      }

      puffG.setPosition(spawnX, spawnY);
      puffG.setDepth(this.depth - 1);

      // Animate: drift + fade out over 800ms
      this.scene.tweens.add({
        targets: puffG,
        x: spawnX + driftX,
        y: spawnY + driftY - 10, // float up slightly
        alpha: 0,
        duration: 800,
        ease: 'Quad.easeOut',
        onComplete: () => {
          puffG.destroy();
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.isStopped) return;

    const moveAmount = this.speed * (delta / 1000);

    switch (this.direction) {
      case 'north': this.y -= moveAmount; break;
      case 'south': this.y += moveAmount; break;
      case 'east':  this.x += moveAmount; break;
      case 'west':  this.x -= moveAmount; break;
    }

    // Gentle wobble (paper cutout jitter)
    this.wobblePhase += delta * 0.003;
    const wobble = Math.sin(this.wobblePhase) * 0.4;
    this.setAngle(wobble);

    // Smoke puffs for lifted trucks (every ~500ms)
    if (this.carType === 'liftedTruck' && !this.isStopped) {
      this.smokeTimer += delta;
      if (this.smokeTimer > 500) {
        this.smokeTimer = 0;
        this.emitSmokePuff();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game logic (preserved exactly)
  // ---------------------------------------------------------------------------

  /** Check if car has moved off screen */
  isOffScreen(worldWidth: number, worldHeight: number): boolean {
    const margin = 100;
    return (
      this.x < -margin ||
      this.x > worldWidth + margin ||
      this.y < -margin ||
      this.y > worldHeight + margin
    );
  }

  /** Check if car should stop at a red light */
  shouldStop(isGreen: boolean): boolean {
    if (isGreen) {
      this.isStopped = false;
      return false;
    }

    const threshold = 10;
    switch (this.direction) {
      case 'north':
        if (this.y > this.lane.stopY - threshold && this.y < this.lane.stopY + this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
      case 'south':
        if (this.y < this.lane.stopY + threshold && this.y > this.lane.stopY - this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
      case 'east':
        if (this.x < this.lane.stopX + threshold && this.x > this.lane.stopX - this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
      case 'west':
        if (this.x > this.lane.stopX - threshold && this.x < this.lane.stopX + this.carLength) {
          this.isStopped = true;
          return true;
        }
        break;
    }

    return false;
  }

  /** Check if car is past the stop line (already in intersection) */
  isPastStopLine(): boolean {
    switch (this.direction) {
      case 'north': return this.y < this.lane.stopY;
      case 'south': return this.y > this.lane.stopY;
      case 'east':  return this.x > this.lane.stopX;
      case 'west':  return this.x < this.lane.stopX;
    }
  }

  /** Reset for object pool reuse — re-rolls car type and color */
  resetCar(lane: LaneDefinition, speed: number): void {
    this.direction = lane.direction;
    this.lane = lane;
    this.speed = speed;
    this.x = lane.spawnX;
    this.y = lane.spawnY;
    this.hasBeenReached = false;
    this.hasPassed = false;
    this.isStopped = false;
    this.hasWindCaught = false;
    this.smokeTimer = 0;

    // Re-roll car type and color
    this.carType = pickWeightedCarType();
    const def = CAR_TYPE_DEFS[this.carType];
    const isVertical = this.direction === 'north' || this.direction === 'south';
    this.carWidth = isVertical ? def.width : def.height;
    this.carLength = isVertical ? def.height : def.width;

    this.carColor = this.carType === 'liftedTruck'
      ? [0x2c3e50, 0x2a2a2a, 0x7f8c8d][Math.floor(Math.random() * 3)]
      : CAR_PAPER_COLORS[Math.floor(Math.random() * CAR_PAPER_COLORS.length)];

    // Redraw
    this.drawPaperCar();

    // New emoji face
    const fontSize = 14 + Math.floor(Math.random() * 3);
    const face = DRIVER_FACES[Math.floor(Math.random() * DRIVER_FACES.length)];
    const facePos = this.getWindshieldCenter();
    this.emojiText.setPosition(facePos.x, facePos.y);
    this.emojiText.setText(face);
    this.emojiText.setFontSize(fontSize);

    this.setActive(true);
    this.setVisible(true);
  }

  getBounds(): Phaser.Geom.Rectangle {
    const def = CAR_TYPE_DEFS[this.carType];
    const isVertical = this.direction === 'north' || this.direction === 'south';
    const w = isVertical ? def.width : def.height;
    const h = isVertical ? def.height : def.width;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - h / 2, w, h);
  }
}
