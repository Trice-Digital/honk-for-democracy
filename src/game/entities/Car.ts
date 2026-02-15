import Phaser from 'phaser';
import type { TrafficDirection, LaneDefinition } from '../config/intersectionConfig';
import { PALETTE, CAR_PAPER_COLORS } from '../config/paletteConfig';
import { drawPaperShadow, drawScissorCutPolygon } from '../utils/paperArt';

/**
 * Car entity — Paper cutout vehicle (top-down).
 *
 * 8 vehicle types matched to the paper-mario-style.html mockup reference sheet:
 *   sedan, suv, compact, pickup, truck, coalRoller, motorcycle, bicycle
 *
 * Each type has a dedicated drawing function that replicates the mockup's
 * SVG details: windshield proportions, roof racks, trailer sections,
 * bed rails, smoke stacks, rider silhouettes, etc.
 *
 * All drawn to Graphics → baked to texture via generateTexture() → displayed as Image.
 * No per-frame earcut triangulation.
 */

// ---------------------------------------------------------------------------
// Car type system
// ---------------------------------------------------------------------------

// Scale factor to make cars ~2x larger and fill ~70-85% of 80px lane width
const SCALE_FACTOR = 2.0;

export type CarType = 'sedan' | 'suv' | 'compact' | 'pickup' | 'truck' | 'coalRoller' | 'motorcycle' | 'bicycle';

const CAR_TYPE_WEIGHTS: { type: CarType; weight: number }[] = [
  { type: 'sedan', weight: 0.30 },
  { type: 'suv', weight: 0.18 },
  { type: 'compact', weight: 0.15 },
  { type: 'pickup', weight: 0.12 },
  { type: 'truck', weight: 0.08 },
  { type: 'coalRoller', weight: 0.07 },
  { type: 'motorcycle', weight: 0.05 },
  { type: 'bicycle', weight: 0.05 },
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

// ---------------------------------------------------------------------------
// Vehicle dimensions (used for baking, bounds, and collision)
// All oriented northbound (front = -y). Container rotation handles direction.
// ---------------------------------------------------------------------------

interface VehicleDef {
  width: number;
  height: number;
  /** Y offset from center to windshield center, for emoji placement */
  faceY: number;
  /** Emoji font size */
  faceSize: number;
}

const VEHICLE_DEFS: Record<CarType, VehicleDef> = {
  // Matches mockup Section 2: 50w × 90h scaled to game proportions
  sedan:       { width: 30, height: 50, faceY: -16, faceSize: 14 },
  // Mockup: 56w × 100h — boxy, bigger
  suv:         { width: 34, height: 56, faceY: -18, faceSize: 14 },
  // Mockup: 40w × 65h — small, very rounded
  compact:     { width: 24, height: 38, faceY: -11, faceSize: 12 },
  // Mockup: 52w × 110h — cab + open bed
  pickup:      { width: 30, height: 58, faceY: -20, faceSize: 14 },
  // Mockup: 48w × 155h — cab + long trailer (scaled down for game)
  truck:       { width: 28, height: 78, faceY: -30, faceSize: 12 },
  // Mockup: 55w × 100h — dark aggressive cab + bed
  coalRoller:  { width: 34, height: 56, faceY: -18, faceSize: 14 },
  // Not in mockup — new. Small narrow silhouette
  motorcycle:  { width: 14, height: 30, faceY: -4, faceSize: 11 },
  // Not in mockup — new. Tiny, thin frame
  bicycle:     { width: 10, height: 26, faceY: -2, faceSize: 10 },
};

// Emoji face sets
const DRIVER_FACES = ['😐', '😊', '😤', '😠', '🙂', '😑'];
const POSITIVE_FACES = ['😊', '🤟', '😄', '👍'];
const NEGATIVE_FACES = ['😒', '😤', '🖕', '😡'];
const NEUTRAL_FACES = ['😐', '😶', '🫤'];
const CYCLIST_FACES = ['🚴', '😊', '🙂', '😐'];

// Windshield tint
const WINDSHIELD_TINT = 0xc8e6ff;

// Dark colors for coal rollers
const COAL_ROLLER_COLORS = [0x2a2a2a, 0x1e1e1e, 0x333333, 0x2c3e50];

export class Car extends Phaser.GameObjects.Container {
  public direction: TrafficDirection;
  public lane: LaneDefinition;
  public speed: number;
  public hasBeenReached: boolean = false;
  public hasPassed: boolean = false;
  public isStopped: boolean = false;
  public carType: CarType;

  private carBodyImage: Phaser.GameObjects.Image | null = null;
  private carTexKey: string | null = null;
  private emojiText!: Phaser.GameObjects.Text;
  private carWidth: number = 0;
  private carLength: number = 0;
  private carColor: number = 0;
  private static carTexCounter = 0;

  // Base rotation for direction (wobble oscillates around this)
  private baseRotation: number = 0;

  // Wobble animation state
  private wobblePhase: number = Math.random() * Math.PI * 2;

  // Smoke puff state (coal roller only)
  private smokeTimer: number = 0;

  // Wind catch flag
  private hasWindCaught: boolean = false;

  // Smoke puff pool (shared across all cars — uses baked texture Images)
  private static smokePuffPool: Phaser.GameObjects.Image[] = [];
  private static readonly SMOKE_POOL_MAX = 30;
  private static smokePuffTextureReady = false;

  constructor(scene: Phaser.Scene, lane: LaneDefinition, speed: number) {
    super(scene, lane.spawnX, lane.spawnY);

    this.direction = lane.direction;
    this.lane = lane;
    this.speed = speed;

    this.carType = pickWeightedCarType();

    const def = VEHICLE_DEFS[this.carType];
    const isVertical = this.direction === 'north' || this.direction === 'south';
    this.carWidth = (isVertical ? def.width : def.height) * SCALE_FACTOR;
    this.carLength = (isVertical ? def.height : def.width) * SCALE_FACTOR;

    this.carColor = this.pickColor();

    this.bakeCarBody();

    // Emoji face driver
    const face = this.carType === 'bicycle'
      ? CYCLIST_FACES[Math.floor(Math.random() * CYCLIST_FACES.length)]
      : DRIVER_FACES[Math.floor(Math.random() * DRIVER_FACES.length)];
    this.emojiText = scene.add.text(0, def.faceY * SCALE_FACTOR, face, {
      fontSize: `${Math.round(def.faceSize * 1.5)}px`,
    });
    this.emojiText.setOrigin(0.5);
    this.add(this.emojiText);

    // Set base rotation based on direction
    this.baseRotation = this.getBaseRotation();
    this.setAngle(this.baseRotation);

    scene.add.existing(this);
  }

  private pickColor(): number {
    switch (this.carType) {
      case 'coalRoller':
        return COAL_ROLLER_COLORS[Math.floor(Math.random() * COAL_ROLLER_COLORS.length)];
      case 'truck':
        // Cab gets craft brown, trailer gets paper white (drawn separately)
        return PALETTE.craftBrown;
      case 'motorcycle':
        return [0x2a2a2a, 0xc0392b, 0x2980b9, 0xf39c12][Math.floor(Math.random() * 4)];
      case 'bicycle':
        return [0x2980b9, 0x27ae60, 0xc0392b, 0x8e44ad][Math.floor(Math.random() * 4)];
      default:
        return CAR_PAPER_COLORS[Math.floor(Math.random() * CAR_PAPER_COLORS.length)];
    }
  }

  private getBaseRotation(): number {
    switch (this.direction) {
      case 'north': return 0;
      case 'south': return 180;
      case 'east': return 90;
      case 'west': return -90;
    }
  }

  // ---------------------------------------------------------------------------
  // Baking — convert Graphics to texture for performance
  // ---------------------------------------------------------------------------

  private bakeCarBody(): void {
    if (this.carBodyImage) {
      this.remove(this.carBodyImage);
      this.carBodyImage.destroy();
      this.carBodyImage = null;
    }
    if (this.carTexKey && this.scene.textures.exists(this.carTexKey)) {
      this.scene.textures.remove(this.carTexKey);
    }

    const tempG = this.scene.add.graphics();
    this.drawVehicle(tempG);

    const def = VEHICLE_DEFS[this.carType];
    const pad = 12;
    const texW = def.width + pad * 2;
    const texH = def.height + pad * 2;
    tempG.setPosition(texW / 2, texH / 2);
    const texKey = `car_${Car.carTexCounter++}`;
    tempG.generateTexture(texKey, texW, texH);
    tempG.destroy();
    this.carTexKey = texKey;

    this.carBodyImage = this.scene.add.image(0, 0, texKey);
    this.carBodyImage.setScale(SCALE_FACTOR);
    this.add(this.carBodyImage);
  }

  // ---------------------------------------------------------------------------
  // Drawing — type-specific rendering matched to mockup reference sheet
  // ---------------------------------------------------------------------------

  private drawVehicle(g: Phaser.GameObjects.Graphics): void {
    switch (this.carType) {
      case 'sedan': this.drawSedan(g); break;
      case 'suv': this.drawSUV(g); break;
      case 'compact': this.drawCompact(g); break;
      case 'pickup': this.drawPickup(g); break;
      case 'truck': this.drawTruck(g); break;
      case 'coalRoller': this.drawCoalRoller(g); break;
      case 'motorcycle': this.drawMotorcycle(g); break;
      case 'bicycle': this.drawBicycle(g); break;
    }
  }

  /**
   * Sedan — Mockup ref: rounded body (rx=14), windshield strip, rear window, center line.
   * Proportions: 30w × 50h
   */
  private drawSedan(g: Phaser.GameObjects.Graphics): void {
    const hw = 15, hh = 25;

    // Shadow
    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Body — well-rounded sedan silhouette
    const pts = [
      { x: -10, y: -25 }, { x: -13, y: -21 }, { x: -15, y: -14 },
      { x: -15, y: 14 }, { x: -13, y: 21 }, { x: -10, y: 25 },
      { x: 10, y: 25 }, { x: 13, y: 21 }, { x: 15, y: 14 },
      { x: 15, y: -14 }, { x: 13, y: -21 }, { x: 10, y: -25 },
    ];
    drawScissorCutPolygon(g, pts, this.carColor, PALETTE.markerBlack);

    // Windshield — generous strip across front (mockup: ~22% of height)
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-11, -22, 22, 12, 4);
    g.lineStyle(1.2, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-11, -22, 22, 12, 4);

    // Rear window
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-9, 14, 18, 7, 3);
    g.lineStyle(0.8, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-9, 14, 18, 7, 3);

    // Center line detail (subtle roof seam)
    g.lineStyle(0.5, PALETTE.markerBlack, 0.15);
    g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 12); g.strokePath();

    // Wheels
    this.drawWheels(g, hw, hh, 5, 8);

    // Final outline
    this.strokeOutline(g, pts);
  }

  /**
   * SUV — Mockup ref: boxy, roof rack rails + cross struts, wider body.
   * Proportions: 34w × 56h
   */
  private drawSUV(g: Phaser.GameObjects.Graphics): void {
    const hw = 17, hh = 28;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Boxy body
    const pts = [
      { x: -14, y: -28 }, { x: -16, y: -23 },
      { x: -17, y: -16 }, { x: -17, y: 23 },
      { x: -15, y: 28 }, { x: 15, y: 28 },
      { x: 17, y: 23 }, { x: 17, y: -16 },
      { x: 16, y: -23 }, { x: 14, y: -28 },
    ];
    drawScissorCutPolygon(g, pts, this.carColor, PALETTE.markerBlack);

    // Roof rack rails (vertical lines on sides)
    g.lineStyle(2, PALETTE.markerBlack, 0.4);
    g.beginPath(); g.moveTo(-15, -24); g.lineTo(-15, 24); g.strokePath();
    g.beginPath(); g.moveTo(15, -24); g.lineTo(15, 24); g.strokePath();

    // Roof rack cross struts
    g.lineStyle(1.5, PALETTE.markerBlack, 0.3);
    g.beginPath(); g.moveTo(-15, -14); g.lineTo(15, -14); g.strokePath();
    g.beginPath(); g.moveTo(-15, 18); g.lineTo(15, 18); g.strokePath();

    // Windshield — wide, boxy
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-13, -25, 26, 14, 4);
    g.lineStyle(1.2, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-13, -25, 26, 14, 4);

    // Rear window
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-11, 16, 22, 8, 3);
    g.lineStyle(0.8, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-11, 16, 22, 8, 3);

    this.drawWheels(g, hw, hh, 5, 9);
    this.strokeOutline(g, pts);
  }

  /**
   * Compact — Mockup ref: small, very rounded (rx=14), cute proportions.
   * Proportions: 24w × 38h
   */
  private drawCompact(g: Phaser.GameObjects.Graphics): void {
    const hw = 12, hh = 19;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Very rounded body
    const pts = [
      { x: -8, y: -19 }, { x: -11, y: -15 }, { x: -12, y: -8 },
      { x: -12, y: 8 }, { x: -11, y: 15 }, { x: -8, y: 19 },
      { x: 8, y: 19 }, { x: 11, y: 15 }, { x: 12, y: 8 },
      { x: 12, y: -8 }, { x: 11, y: -15 }, { x: 8, y: -19 },
    ];
    drawScissorCutPolygon(g, pts, this.carColor, PALETTE.markerBlack);

    // Windshield
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-8, -16, 16, 9, 4);
    g.lineStyle(1, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-8, -16, 16, 9, 4);

    // Rear window
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-7, 10, 14, 6, 3);
    g.lineStyle(0.8, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-7, 10, 14, 6, 3);

    this.drawWheels(g, hw, hh, 4, 6);
    this.strokeOutline(g, pts);
  }

  /**
   * Pickup — Mockup ref: distinct cab + open bed with bed rails.
   * Proportions: 30w × 58h
   */
  private drawPickup(g: Phaser.GameObjects.Graphics): void {
    const hw = 15, hh = 29;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Cab section (front half, rounded front)
    const cabPts = [
      { x: -11, y: -29 }, { x: -14, y: -23 },
      { x: -15, y: -16 }, { x: -15, y: 0 },
      { x: 15, y: 0 }, { x: 15, y: -16 },
      { x: 14, y: -23 }, { x: 11, y: -29 },
    ];
    drawScissorCutPolygon(g, cabPts, this.carColor, PALETTE.markerBlack);

    // Open bed section (rear half, lighter color)
    const bedColor = PALETTE.cardboard;
    g.fillStyle(bedColor, 0.9);
    g.lineStyle(2, PALETTE.markerBlack, 0.7);
    g.beginPath();
    g.moveTo(-14, 0); g.lineTo(-14, 27); g.lineTo(14, 27); g.lineTo(14, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Bed rails inside
    g.lineStyle(1, PALETTE.markerBlack, 0.3);
    g.beginPath(); g.moveTo(-10, 4); g.lineTo(-10, 24); g.strokePath();
    g.beginPath(); g.moveTo(10, 4); g.lineTo(10, 24); g.strokePath();

    // Windshield on cab
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-11, -26, 22, 12, 4);
    g.lineStyle(1.2, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-11, -26, 22, 12, 4);

    this.drawWheels(g, hw, hh, 5, 8);

    // Full outline
    const fullPts = [
      { x: -11, y: -29 }, { x: -14, y: -23 }, { x: -15, y: -16 },
      { x: -15, y: 0 }, { x: -14, y: 0 }, { x: -14, y: 27 },
      { x: 14, y: 27 }, { x: 14, y: 0 }, { x: 15, y: 0 },
      { x: 15, y: -16 }, { x: 14, y: -23 }, { x: 11, y: -29 },
    ];
    this.strokeOutline(g, fullPts);
  }

  /**
   * Truck/Semi — Mockup ref: small cab + large trailer, trailer detail lines.
   * Proportions: 28w × 78h
   */
  private drawTruck(g: Phaser.GameObjects.Graphics): void {
    const hw = 14, hh = 39;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Cab (front, craft brown)
    const cabPts = [
      { x: -10, y: -39 }, { x: -13, y: -34 },
      { x: -14, y: -28 }, { x: -14, y: -18 },
      { x: 14, y: -18 }, { x: 14, y: -28 },
      { x: 13, y: -34 }, { x: 10, y: -39 },
    ];
    drawScissorCutPolygon(g, cabPts, PALETTE.craftBrown, PALETTE.markerBlack);

    // Trailer (rear, paper white)
    g.fillStyle(PALETTE.paperWhite, 1);
    g.lineStyle(2, PALETTE.markerBlack, 0.8);
    g.beginPath();
    g.moveTo(-13, -18); g.lineTo(-13, 37); g.lineTo(13, 37); g.lineTo(13, -18);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Trailer detail lines (horizontal dividers, like mockup)
    g.lineStyle(0.8, PALETTE.markerBlack, 0.25);
    g.beginPath(); g.moveTo(-13, 0); g.lineTo(13, 0); g.strokePath();
    g.beginPath(); g.moveTo(-13, 18); g.lineTo(13, 18); g.strokePath();

    // Windshield on cab
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-10, -36, 20, 10, 3);
    g.lineStyle(1, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-10, -36, 20, 10, 3);

    this.drawWheels(g, hw, hh, 5, 8);
  }

  /**
   * Coal Roller — Mockup ref: dark menacing cab + bed, smoke stack nubs, tinted windshield.
   * Proportions: 34w × 56h
   */
  private drawCoalRoller(g: Phaser.GameObjects.Graphics): void {
    const hw = 17, hh = 28;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Cab section (front, dark)
    const cabPts = [
      { x: -14, y: -28 }, { x: -16, y: -24 },
      { x: -17, y: -18 }, { x: -17, y: 0 },
      { x: 17, y: 0 }, { x: 17, y: -18 },
      { x: 16, y: -24 }, { x: 14, y: -28 },
    ];
    drawScissorCutPolygon(g, cabPts, this.carColor, PALETTE.markerBlack);

    // Bed section (rear, slightly lighter dark)
    const bedColor = this.carColor + 0x111111;
    g.fillStyle(bedColor, 0.9);
    g.lineStyle(2, PALETTE.markerBlack, 0.7);
    g.beginPath();
    g.moveTo(-16, 0); g.lineTo(-16, 26); g.lineTo(16, 26); g.lineTo(16, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Smoke stack nubs on bed (mockup: two circles)
    g.fillStyle(0x555555, 1);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.fillCircle(-8, 14, 4); g.strokeCircle(-8, 14, 4);
    g.fillCircle(8, 14, 4); g.strokeCircle(8, 14, 4);

    // Windshield — darker tint for menacing look
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-13, -25, 26, 14, 4);
    g.lineStyle(1.2, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-13, -25, 26, 14, 4);

    // Bull bar at very front
    g.lineStyle(2.5, PALETTE.markerBlack, 0.8);
    g.beginPath(); g.moveTo(-13, -28); g.lineTo(13, -28); g.strokePath();

    this.drawWheels(g, hw, hh, 6, 9);

    const fullPts = [
      { x: -14, y: -28 }, { x: -16, y: -24 }, { x: -17, y: -18 },
      { x: -17, y: 0 }, { x: -16, y: 0 }, { x: -16, y: 26 },
      { x: 16, y: 26 }, { x: 16, y: 0 }, { x: 17, y: 0 },
      { x: 17, y: -18 }, { x: 16, y: -24 }, { x: 14, y: -28 },
    ];
    this.strokeOutline(g, fullPts);
  }

  /**
   * Motorcycle — narrow from above. Seat/body + rider circle + handlebars.
   * Proportions: 14w × 30h
   */
  private drawMotorcycle(g: Phaser.GameObjects.Graphics): void {
    const hw = 7, hh = 15;

    // Shadow (smaller, offset)
    g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    g.fillEllipse(3, 3, hw * 2 - 2, hh * 2 - 2);

    // Body — narrow elongated shape
    g.fillStyle(this.carColor, 1);
    g.lineStyle(2, PALETTE.markerBlack, 1);
    g.beginPath();
    g.moveTo(0, -15); // front
    g.lineTo(-5, -10); g.lineTo(-6, -2); g.lineTo(-5, 8);
    g.lineTo(-4, 14); g.lineTo(4, 14); g.lineTo(5, 8);
    g.lineTo(6, -2); g.lineTo(5, -10);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Handlebars (T-shape at front)
    g.lineStyle(2, PALETTE.markerBlack, 0.8);
    g.beginPath(); g.moveTo(-7, -11); g.lineTo(7, -11); g.strokePath();

    // Front wheel hint
    g.fillStyle(PALETTE.markerBlack, 0.7);
    g.fillEllipse(0, -13, 4, 6);

    // Rear wheel hint
    g.fillEllipse(0, 12, 4, 6);

    // Rider circle (head from above)
    g.fillStyle(0xe8b88a, 1);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.8);
    g.fillCircle(0, -4, 5);
    g.strokeCircle(0, -4, 5);

    // Helmet visor line
    g.lineStyle(1, PALETTE.markerBlack, 0.4);
    g.beginPath(); g.moveTo(-3, -6); g.lineTo(3, -6); g.strokePath();
  }

  /**
   * Bicycle — tiny, thin frame from above + rider circle.
   * Proportions: 10w × 26h
   */
  private drawBicycle(g: Phaser.GameObjects.Graphics): void {
    // Shadow
    g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha * 0.6);
    g.fillEllipse(2, 2, 8, 22);

    // Frame — thin line from front to back
    g.lineStyle(2, this.carColor, 1);
    g.beginPath();
    g.moveTo(0, -13); g.lineTo(0, 11);
    g.strokePath();

    // Handlebars
    g.lineStyle(1.5, this.carColor, 0.9);
    g.beginPath(); g.moveTo(-5, -10); g.lineTo(5, -10); g.strokePath();

    // Front wheel (circle outline)
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.strokeCircle(0, -12, 3);

    // Rear wheel
    g.strokeCircle(0, 11, 3);

    // Rider circle (head from above, slightly larger than motorcycle)
    g.fillStyle(0xe8b88a, 1);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.fillCircle(0, -2, 4.5);
    g.strokeCircle(0, -2, 4.5);
  }

  // ---------------------------------------------------------------------------
  // Shared drawing helpers
  // ---------------------------------------------------------------------------

  private drawWheels(g: Phaser.GameObjects.Graphics, hw: number, hh: number, ww: number, wh: number): void {
    g.fillStyle(PALETTE.markerBlack, 0.85);
    g.fillRoundedRect(-hw - 1, -hh + 5, ww, wh, 2);
    g.fillRoundedRect(hw - ww + 1, -hh + 5, ww, wh, 2);
    g.fillRoundedRect(-hw - 1, hh - 5 - wh, ww, wh, 2);
    g.fillRoundedRect(hw - ww + 1, hh - 5 - wh, ww, wh, 2);
  }

  private strokeOutline(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]): void {
    g.lineStyle(2, PALETTE.markerBlack, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.strokePath();
  }

  // ---------------------------------------------------------------------------
  // Public API — reaction face
  // ---------------------------------------------------------------------------

  setReactionFace(sentiment: 'positive' | 'negative' | 'neutral'): void {
    const faces = sentiment === 'positive' ? POSITIVE_FACES
      : sentiment === 'negative' ? NEGATIVE_FACES
      : NEUTRAL_FACES;
    this.emojiText.setText(faces[Math.floor(Math.random() * faces.length)]);
  }

  // ---------------------------------------------------------------------------
  // Wind catch — brief tilt when entering player's visibility cone
  // ---------------------------------------------------------------------------

  triggerWindCatch(): void {
    if (this.hasWindCaught) return;
    this.hasWindCaught = true;
    this.scene.tweens.add({
      targets: this,
      angle: this.baseRotation + (this.carType === 'bicycle' || this.carType === 'motorcycle' ? 8 : 5),
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  // ---------------------------------------------------------------------------
  // Coal roller smoke puffs
  // ---------------------------------------------------------------------------

  private ensureSmokePuffTexture(): void {
    if (Car.smokePuffTextureReady) return;
    const g = this.scene.add.graphics();
    const r = 12;
    const dim = r * 2 + 4;
    g.fillStyle(PALETTE.shadowDark, 0.3);
    g.fillCircle(dim / 2, dim / 2, r);
    g.lineStyle(1, PALETTE.markerBlack, 0.15);
    g.strokeCircle(dim / 2, dim / 2, r);
    g.generateTexture('smokePuff', dim, dim);
    g.destroy();
    Car.smokePuffTextureReady = true;
  }

  private getSmokePuff(): Phaser.GameObjects.Image {
    this.ensureSmokePuffTexture();
    const pooled = Car.smokePuffPool.pop();
    if (pooled) {
      pooled.setAlpha(1);
      pooled.setScale(1);
      pooled.setVisible(true);
      pooled.setActive(true);
      return pooled;
    }
    return this.scene.add.image(0, 0, 'smokePuff');
  }

  private returnSmokePuff(puff: Phaser.GameObjects.Image): void {
    puff.setVisible(false);
    puff.setActive(false);
    if (Car.smokePuffPool.length < Car.SMOKE_POOL_MAX) {
      Car.smokePuffPool.push(puff);
    } else {
      puff.destroy();
    }
  }

  private emitSmokePuff(): void {
    const numPuffs = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numPuffs; i++) {
      const puff = this.getSmokePuff();
      const scale = (8 + Math.random() * 4) / 12;
      puff.setScale(scale);
      const offsetX = (Math.random() - 0.5) * 10;

      const def = VEHICLE_DEFS[this.carType];
      const hh = (def.height / 2) * SCALE_FACTOR;
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

      puff.setPosition(spawnX, spawnY);
      puff.setDepth(this.depth - 1);

      this.scene.tweens.add({
        targets: puff,
        x: spawnX + driftX,
        y: spawnY + driftY - 10,
        alpha: 0,
        duration: 800,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.returnSmokePuff(puff);
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

    // Gentle wobble (paper cutout jitter) — more wobble for bikes
    this.wobblePhase += delta * 0.003;
    const wobbleAmp = this.carType === 'bicycle' ? 1.0 : this.carType === 'motorcycle' ? 0.6 : 0.4;
    const wobble = Math.sin(this.wobblePhase) * wobbleAmp;
    this.setAngle(this.baseRotation + wobble);

    // Smoke puffs for coal rollers (every ~500ms)
    if (this.carType === 'coalRoller' && !this.isStopped) {
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

  isOffScreen(worldWidth: number, worldHeight: number): boolean {
    const margin = 100;
    return (
      this.x < -margin ||
      this.x > worldWidth + margin ||
      this.y < -margin ||
      this.y > worldHeight + margin
    );
  }

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

  isPastStopLine(): boolean {
    switch (this.direction) {
      case 'north': return this.y < this.lane.stopY;
      case 'south': return this.y > this.lane.stopY;
      case 'east':  return this.x > this.lane.stopX;
      case 'west':  return this.x < this.lane.stopX;
    }
  }

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

    this.carType = pickWeightedCarType();
    const def = VEHICLE_DEFS[this.carType];
    const isVertical = this.direction === 'north' || this.direction === 'south';
    this.carWidth = (isVertical ? def.width : def.height) * SCALE_FACTOR;
    this.carLength = (isVertical ? def.height : def.width) * SCALE_FACTOR;

    this.carColor = this.pickColor();

    this.bakeCarBody();

    // New emoji face
    const face = this.carType === 'bicycle'
      ? CYCLIST_FACES[Math.floor(Math.random() * CYCLIST_FACES.length)]
      : DRIVER_FACES[Math.floor(Math.random() * DRIVER_FACES.length)];
    this.emojiText.setPosition(0, def.faceY * SCALE_FACTOR);
    this.emojiText.setText(face);
    this.emojiText.setFontSize(Math.round(def.faceSize * 1.5));

    this.wobblePhase = Math.random() * Math.PI * 2;
    this.baseRotation = this.getBaseRotation();
    this.setAngle(this.baseRotation);

    this.setActive(true);
    this.setVisible(true);
  }

  getBounds(): Phaser.Geom.Rectangle {
    const def = VEHICLE_DEFS[this.carType];
    const isVertical = this.direction === 'north' || this.direction === 'south';
    const w = (isVertical ? def.width : def.height) * SCALE_FACTOR;
    const h = (isVertical ? def.height : def.width) * SCALE_FACTOR;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - h / 2, w, h);
  }
}
