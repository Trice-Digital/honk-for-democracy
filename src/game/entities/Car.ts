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
 * All drawn to Graphics → baked to texture via generateTexture() → displayed as Image.
 * No per-frame earcut triangulation.
 *
 * Dimensions are at final display size — no runtime scaling.
 * All oriented northbound (front = -y). Container rotation handles direction.
 */

// ---------------------------------------------------------------------------
// Car type system
// ---------------------------------------------------------------------------

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
// Vehicle dimensions — at final display size (no scaling needed)
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
  // Mockup SVG: 50w × 90h — rounded body, windshield strip
  sedan:       { width: 50, height: 90, faceY: -28, faceSize: 22 },
  // Mockup SVG: 56w × 100h — boxy, roof rack rails
  suv:         { width: 56, height: 100, faceY: -32, faceSize: 22 },
  // Mockup SVG: 40w × 65h — small, very rounded
  compact:     { width: 40, height: 65, faceY: -20, faceSize: 18 },
  // Mockup SVG: 52w × 110h — cab + open bed
  pickup:      { width: 52, height: 110, faceY: -36, faceSize: 22 },
  // Mockup SVG: 48w × 155h — cab + long trailer
  truck:       { width: 48, height: 155, faceY: -60, faceSize: 18 },
  // Mockup SVG: 55w × 100h — dark aggressive cab + bed
  coalRoller:  { width: 55, height: 100, faceY: -32, faceSize: 22 },
  // Small narrow silhouette
  motorcycle:  { width: 24, height: 54, faceY: -8, faceSize: 18 },
  // Tiny, thin frame
  bicycle:     { width: 18, height: 46, faceY: -4, faceSize: 16 },
};

// Emoji face sets
const DRIVER_FACES = ['😐', '😊', '😤', '😠', '🙂', '😑'];
const POSITIVE_FACES = ['😊', '🤟', '😄', '👍'];
const NEGATIVE_FACES = ['😒', '😤', '🖕', '😡'];
const NEUTRAL_FACES = ['😐', '😶', '🫤'];
const CYCLIST_FACES = ['🚴', '😊', '🙂', '😐'];
const PASSENGER_EMOJIS = ['👤', '👦', '👧', '👩', '👨', '🧒'];
const DOG_EMOJIS = ['🐕', '🐶', '🐩'];

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
  private passengerText: Phaser.GameObjects.Text | null = null;
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
    this.carWidth = def.width;
    this.carLength = def.height;

    this.carColor = this.pickColor();

    this.bakeCarBody();

    // Emoji face driver (positioned at driver seat: front-left)
    const face = this.carType === 'bicycle'
      ? CYCLIST_FACES[Math.floor(Math.random() * CYCLIST_FACES.length)]
      : DRIVER_FACES[Math.floor(Math.random() * DRIVER_FACES.length)];
    const driverX = (this.carType === 'motorcycle' || this.carType === 'bicycle') ? 0 : -(def.width * 0.2);
    this.emojiText = scene.add.text(driverX, def.faceY, face, {
      fontSize: `${def.faceSize}px`,
    });
    this.emojiText.setOrigin(0.5);
    this.add(this.emojiText);

    // Maybe add passenger
    this.maybeAddPassenger();

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

  private maybeAddPassenger(): void {
    if (this.passengerText) {
      this.remove(this.passengerText);
      this.passengerText.destroy();
      this.passengerText = null;
    }

    if (this.carType === 'motorcycle' || this.carType === 'bicycle') {
      return;
    }

    // 30% chance of passenger
    if (Math.random() < 0.3) {
      const def = VEHICLE_DEFS[this.carType];
      const isDog = Math.random() < 0.1;
      const passengerEmoji = isDog
        ? DOG_EMOJIS[Math.floor(Math.random() * DOG_EMOJIS.length)]
        : PASSENGER_EMOJIS[Math.floor(Math.random() * PASSENGER_EMOJIS.length)];

      // Passenger in front-right seat
      const passengerX = def.width * 0.2;
      const passengerY = def.faceY;
      const passengerSize = Math.round(def.faceSize * (isDog ? 0.8 : 0.9));

      this.passengerText = this.scene.add.text(passengerX, passengerY, passengerEmoji, {
        fontSize: `${passengerSize}px`,
      });
      this.passengerText.setOrigin(0.5);
      this.add(this.passengerText);
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
    const pad = 20;
    const texW = def.width + pad * 2;
    const texH = def.height + pad * 2;
    tempG.setPosition(texW / 2, texH / 2);
    const texKey = `car_${Car.carTexCounter++}`;
    tempG.generateTexture(texKey, texW, texH);
    tempG.destroy();
    this.carTexKey = texKey;

    this.carBodyImage = this.scene.add.image(0, 0, texKey);
    this.add(this.carBodyImage);
  }

  // ---------------------------------------------------------------------------
  // Drawing — type-specific rendering matched to mockup reference sheet
  // All coordinates at final display size (no scaling).
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
   * Sedan — 50w × 90h. Rounded body, windshield strip, rear window, center line.
   */
  private drawSedan(g: Phaser.GameObjects.Graphics): void {
    const hw = 25, hh = 45;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    const pts = [
      { x: -18, y: -45 }, { x: -23, y: -38 }, { x: -25, y: -25 },
      { x: -25, y: 25 }, { x: -23, y: 38 }, { x: -18, y: 45 },
      { x: 18, y: 45 }, { x: 23, y: 38 }, { x: 25, y: 25 },
      { x: 25, y: -25 }, { x: 23, y: -38 }, { x: 18, y: -45 },
    ];
    drawScissorCutPolygon(g, pts, this.carColor, PALETTE.markerBlack);

    // Windshield
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-20, -40, 40, 22, 6);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-20, -40, 40, 22, 6);

    // Rear window
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-16, 24, 32, 12, 5);
    g.lineStyle(1, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-16, 24, 32, 12, 5);

    // Center line detail (roof seam)
    g.lineStyle(0.8, PALETTE.markerBlack, 0.15);
    g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 22); g.strokePath();

    this.drawWheels(g, hw, hh, 8, 14);
    this.strokeOutline(g, pts);
  }

  /**
   * SUV — 56w × 100h. Boxy, roof rack rails + cross struts.
   */
  private drawSUV(g: Phaser.GameObjects.Graphics): void {
    const hw = 28, hh = 50;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    const pts = [
      { x: -24, y: -50 }, { x: -27, y: -42 },
      { x: -28, y: -28 }, { x: -28, y: 42 },
      { x: -26, y: 50 }, { x: 26, y: 50 },
      { x: 28, y: 42 }, { x: 28, y: -28 },
      { x: 27, y: -42 }, { x: 24, y: -50 },
    ];
    drawScissorCutPolygon(g, pts, this.carColor, PALETTE.markerBlack);

    // Roof rack rails
    g.lineStyle(2.5, PALETTE.markerBlack, 0.4);
    g.beginPath(); g.moveTo(-26, -44); g.lineTo(-26, 44); g.strokePath();
    g.beginPath(); g.moveTo(26, -44); g.lineTo(26, 44); g.strokePath();

    // Roof rack cross struts
    g.lineStyle(2, PALETTE.markerBlack, 0.3);
    g.beginPath(); g.moveTo(-26, -24); g.lineTo(26, -24); g.strokePath();
    g.beginPath(); g.moveTo(-26, 32); g.lineTo(26, 32); g.strokePath();

    // Windshield
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-22, -46, 44, 24, 6);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-22, -46, 44, 24, 6);

    // Rear window
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-20, 28, 40, 14, 5);
    g.lineStyle(1, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-20, 28, 40, 14, 5);

    this.drawWheels(g, hw, hh, 8, 16);
    this.strokeOutline(g, pts);
  }

  /**
   * Compact — 40w × 65h. Small, very rounded, cute.
   */
  private drawCompact(g: Phaser.GameObjects.Graphics): void {
    const hw = 20, hh = 32;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    const pts = [
      { x: -14, y: -32 }, { x: -18, y: -26 }, { x: -20, y: -14 },
      { x: -20, y: 14 }, { x: -18, y: 26 }, { x: -14, y: 32 },
      { x: 14, y: 32 }, { x: 18, y: 26 }, { x: 20, y: 14 },
      { x: 20, y: -14 }, { x: 18, y: -26 }, { x: 14, y: -32 },
    ];
    drawScissorCutPolygon(g, pts, this.carColor, PALETTE.markerBlack);

    // Windshield
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-14, -28, 28, 16, 6);
    g.lineStyle(1.2, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-14, -28, 28, 16, 6);

    // Rear window
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-12, 18, 24, 10, 4);
    g.lineStyle(1, PALETTE.markerBlack, 0.5);
    g.strokeRoundedRect(-12, 18, 24, 10, 4);

    this.drawWheels(g, hw, hh, 7, 10);
    this.strokeOutline(g, pts);
  }

  /**
   * Pickup — 52w × 110h. Cab + open bed with bed rails.
   */
  private drawPickup(g: Phaser.GameObjects.Graphics): void {
    const hw = 26, hh = 55;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Cab section (front half)
    const cabPts = [
      { x: -20, y: -55 }, { x: -24, y: -44 },
      { x: -26, y: -30 }, { x: -26, y: 0 },
      { x: 26, y: 0 }, { x: 26, y: -30 },
      { x: 24, y: -44 }, { x: 20, y: -55 },
    ];
    drawScissorCutPolygon(g, cabPts, this.carColor, PALETTE.markerBlack);

    // Open bed section (rear half)
    const bedColor = PALETTE.cardboard;
    g.fillStyle(bedColor, 0.9);
    g.lineStyle(2.5, PALETTE.markerBlack, 0.7);
    g.beginPath();
    g.moveTo(-24, 0); g.lineTo(-24, 50); g.lineTo(24, 50); g.lineTo(24, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Bed rails
    g.lineStyle(1.5, PALETTE.markerBlack, 0.3);
    g.beginPath(); g.moveTo(-18, 6); g.lineTo(-18, 44); g.strokePath();
    g.beginPath(); g.moveTo(18, 6); g.lineTo(18, 44); g.strokePath();

    // Windshield
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-20, -50, 40, 22, 6);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-20, -50, 40, 22, 6);

    this.drawWheels(g, hw, hh, 8, 14);

    const fullPts = [
      { x: -20, y: -55 }, { x: -24, y: -44 }, { x: -26, y: -30 },
      { x: -26, y: 0 }, { x: -24, y: 0 }, { x: -24, y: 50 },
      { x: 24, y: 50 }, { x: 24, y: 0 }, { x: 26, y: 0 },
      { x: 26, y: -30 }, { x: 24, y: -44 }, { x: 20, y: -55 },
    ];
    this.strokeOutline(g, fullPts);
  }

  /**
   * Truck/Semi — 48w × 155h. Small cab + large trailer.
   */
  private drawTruck(g: Phaser.GameObjects.Graphics): void {
    const hw = 24, hh = 77;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Cab (front, craft brown)
    const cabPts = [
      { x: -18, y: -77 }, { x: -22, y: -68 },
      { x: -24, y: -56 }, { x: -24, y: -36 },
      { x: 24, y: -36 }, { x: 24, y: -56 },
      { x: 22, y: -68 }, { x: 18, y: -77 },
    ];
    drawScissorCutPolygon(g, cabPts, PALETTE.craftBrown, PALETTE.markerBlack);

    // Trailer (rear, paper white)
    g.fillStyle(PALETTE.paperWhite, 1);
    g.lineStyle(2.5, PALETTE.markerBlack, 0.8);
    g.beginPath();
    g.moveTo(-22, -36); g.lineTo(-22, 72); g.lineTo(22, 72); g.lineTo(22, -36);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Trailer detail lines
    g.lineStyle(1, PALETTE.markerBlack, 0.25);
    g.beginPath(); g.moveTo(-22, 0); g.lineTo(22, 0); g.strokePath();
    g.beginPath(); g.moveTo(-22, 36); g.lineTo(22, 36); g.strokePath();

    // Windshield
    g.fillStyle(WINDSHIELD_TINT, 0.45);
    g.fillRoundedRect(-18, -72, 36, 18, 5);
    g.lineStyle(1.2, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-18, -72, 36, 18, 5);

    this.drawWheels(g, hw, hh, 8, 14);
  }

  /**
   * Coal Roller — 55w × 100h. Dark menacing cab + bed, smoke stacks.
   */
  private drawCoalRoller(g: Phaser.GameObjects.Graphics): void {
    const hw = 27, hh = 50;

    drawPaperShadow(g, -hw, -hh, hw * 2, hh * 2);

    // Cab section (front, dark)
    const cabPts = [
      { x: -24, y: -50 }, { x: -26, y: -44 },
      { x: -27, y: -32 }, { x: -27, y: 0 },
      { x: 27, y: 0 }, { x: 27, y: -32 },
      { x: 26, y: -44 }, { x: 24, y: -50 },
    ];
    drawScissorCutPolygon(g, cabPts, this.carColor, PALETTE.markerBlack);

    // Bed section (rear)
    const bedColor = this.carColor + 0x111111;
    g.fillStyle(bedColor, 0.9);
    g.lineStyle(2.5, PALETTE.markerBlack, 0.7);
    g.beginPath();
    g.moveTo(-26, 0); g.lineTo(-26, 46); g.lineTo(26, 46); g.lineTo(26, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Smoke stack nubs
    g.fillStyle(0x555555, 1);
    g.lineStyle(2, PALETTE.markerBlack, 0.7);
    g.fillCircle(-14, 24, 7); g.strokeCircle(-14, 24, 7);
    g.fillCircle(14, 24, 7); g.strokeCircle(14, 24, 7);

    // Windshield — darker tint
    g.fillStyle(WINDSHIELD_TINT, 0.3);
    g.fillRoundedRect(-22, -46, 44, 24, 6);
    g.lineStyle(1.5, PALETTE.markerBlack, 0.7);
    g.strokeRoundedRect(-22, -46, 44, 24, 6);

    // Bull bar
    g.lineStyle(3, PALETTE.markerBlack, 0.8);
    g.beginPath(); g.moveTo(-22, -50); g.lineTo(22, -50); g.strokePath();

    this.drawWheels(g, hw, hh, 10, 16);

    const fullPts = [
      { x: -24, y: -50 }, { x: -26, y: -44 }, { x: -27, y: -32 },
      { x: -27, y: 0 }, { x: -26, y: 0 }, { x: -26, y: 46 },
      { x: 26, y: 46 }, { x: 26, y: 0 }, { x: 27, y: 0 },
      { x: 27, y: -32 }, { x: 26, y: -44 }, { x: 24, y: -50 },
    ];
    this.strokeOutline(g, fullPts);
  }

  /**
   * Motorcycle — 24w × 54h. Narrow from above.
   */
  private drawMotorcycle(g: Phaser.GameObjects.Graphics): void {
    const hw = 12, hh = 27;

    g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    g.fillEllipse(4, 4, hw * 2 - 4, hh * 2 - 4);

    // Body
    g.fillStyle(this.carColor, 1);
    g.lineStyle(2.5, PALETTE.markerBlack, 1);
    g.beginPath();
    g.moveTo(0, -27);
    g.lineTo(-9, -18); g.lineTo(-10, -4); g.lineTo(-9, 14);
    g.lineTo(-7, 25); g.lineTo(7, 25); g.lineTo(9, 14);
    g.lineTo(10, -4); g.lineTo(9, -18);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Handlebars
    g.lineStyle(2.5, PALETTE.markerBlack, 0.8);
    g.beginPath(); g.moveTo(-12, -20); g.lineTo(12, -20); g.strokePath();

    // Front wheel
    g.fillStyle(PALETTE.markerBlack, 0.7);
    g.fillEllipse(0, -24, 7, 10);

    // Rear wheel
    g.fillEllipse(0, 22, 7, 10);

    // Rider circle
    g.fillStyle(0xe8b88a, 1);
    g.lineStyle(2, PALETTE.markerBlack, 0.8);
    g.fillCircle(0, -7, 9);
    g.strokeCircle(0, -7, 9);

    // Helmet visor
    g.lineStyle(1.5, PALETTE.markerBlack, 0.4);
    g.beginPath(); g.moveTo(-5, -10); g.lineTo(5, -10); g.strokePath();
  }

  /**
   * Bicycle — 18w × 46h. Tiny, thin frame.
   */
  private drawBicycle(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha * 0.6);
    g.fillEllipse(3, 3, 14, 40);

    // Frame
    g.lineStyle(2.5, this.carColor, 1);
    g.beginPath();
    g.moveTo(0, -23); g.lineTo(0, 19);
    g.strokePath();

    // Handlebars
    g.lineStyle(2, this.carColor, 0.9);
    g.beginPath(); g.moveTo(-8, -18); g.lineTo(8, -18); g.strokePath();

    // Front wheel
    g.lineStyle(2, PALETTE.markerBlack, 0.7);
    g.strokeCircle(0, -21, 5);

    // Rear wheel
    g.strokeCircle(0, 19, 5);

    // Rider circle
    g.fillStyle(0xe8b88a, 1);
    g.lineStyle(2, PALETTE.markerBlack, 0.7);
    g.fillCircle(0, -4, 7);
    g.strokeCircle(0, -4, 7);
  }

  // ---------------------------------------------------------------------------
  // Shared drawing helpers
  // ---------------------------------------------------------------------------

  private drawWheels(g: Phaser.GameObjects.Graphics, hw: number, hh: number, ww: number, wh: number): void {
    g.fillStyle(PALETTE.markerBlack, 0.85);
    g.fillRoundedRect(-hw - 2, -hh + 8, ww, wh, 3);
    g.fillRoundedRect(hw - ww + 2, -hh + 8, ww, wh, 3);
    g.fillRoundedRect(-hw - 2, hh - 8 - wh, ww, wh, 3);
    g.fillRoundedRect(hw - ww + 2, hh - 8 - wh, ww, wh, 3);
  }

  private strokeOutline(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]): void {
    g.lineStyle(2.5, PALETTE.markerBlack, 1);
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

    // Gentle wobble (paper cutout jitter)
    this.wobblePhase += delta * 0.003;
    const wobbleAmp = this.carType === 'bicycle' ? 1.0 : this.carType === 'motorcycle' ? 0.6 : 0.4;
    const wobble = Math.sin(this.wobblePhase) * wobbleAmp;
    this.setAngle(this.baseRotation + wobble);

    // Smoke puffs for coal rollers
    if (this.carType === 'coalRoller' && !this.isStopped) {
      this.smokeTimer += delta;
      if (this.smokeTimer > 500) {
        this.smokeTimer = 0;
        this.emitSmokePuff();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game logic
  // ---------------------------------------------------------------------------

  isOffScreen(worldWidth: number, worldHeight: number): boolean {
    const margin = 200;
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
    this.carWidth = def.width;
    this.carLength = def.height;

    this.carColor = this.pickColor();

    this.bakeCarBody();

    // New emoji face
    const face = this.carType === 'bicycle'
      ? CYCLIST_FACES[Math.floor(Math.random() * CYCLIST_FACES.length)]
      : DRIVER_FACES[Math.floor(Math.random() * DRIVER_FACES.length)];
    const driverX = (this.carType === 'motorcycle' || this.carType === 'bicycle') ? 0 : -(def.width * 0.2);
    this.emojiText.setPosition(driverX, def.faceY);
    this.emojiText.setText(face);
    this.emojiText.setFontSize(def.faceSize);

    this.maybeAddPassenger();

    this.wobblePhase = Math.random() * Math.PI * 2;
    this.baseRotation = this.getBaseRotation();
    this.setAngle(this.baseRotation);

    this.setActive(true);
    this.setVisible(true);
  }

  getBounds(): Phaser.Geom.Rectangle {
    const def = VEHICLE_DEFS[this.carType];
    return new Phaser.Geom.Rectangle(this.x - def.width / 2, this.y - def.height / 2, def.width, def.height);
  }
}
