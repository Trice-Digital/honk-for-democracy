import Phaser from 'phaser';
import { INTERSECTION_CONFIG } from '../config/intersectionConfig';
import type { LaneDefinition, TrafficDirection } from '../config/intersectionConfig';
import { DIFFICULTY_MEDIUM } from '../config/difficultyConfig';
import { CONFIDENCE_DEFAULTS } from '../config/confidenceConfig';
import { getSignData, type SignData } from '../config/signConfig';
import { PALETTE } from '../config/paletteConfig';
import {
  drawPaperShadow,
  drawPaperShadowCircle,
  drawScissorCutRect,
  drawMaskingTapeStrip,
  applyPaperGrain,
  drawPopsicleStick,
  wobbleSine,
} from '../utils/paperArt';
import { GameStateManager } from '../systems/GameStateManager';
import { TrafficLightSystem } from '../systems/TrafficLightSystem';
import { ReactionSystem } from '../systems/ReactionSystem';
import { ConfidenceSystem } from '../systems/ConfidenceSystem';
import { FatigueSystem } from '../systems/FatigueSystem';
import { EventSystem } from '../systems/EventSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { DebugOverlay } from '../systems/DebugOverlay';
import { Car } from '../entities/Car';
import { Player } from '../entities/Player';
import { VisibilityCone } from '../entities/VisibilityCone';

/**
 * IntersectionScene — Core gameplay scene.
 *
 * Top-down intersection with traffic lights, cars, player,
 * visibility cone, reactions, scoring, confidence meter,
 * arm fatigue, and raise sign mechanic. This is the game.
 */

export class IntersectionScene extends Phaser.Scene {
  // Systems
  private gameState!: GameStateManager;
  private trafficLights!: TrafficLightSystem;
  private reactionSystem!: ReactionSystem;
  private confidenceSystem!: ConfidenceSystem;
  private fatigueSystem!: FatigueSystem;
  private eventSystem!: EventSystem;
  private weatherSystem!: WeatherSystem;
  private audioSystem!: AudioSystem;

  // Entities
  private player!: Player;
  private cone!: VisibilityCone;
  private cars: Car[] = [];

  // UI elements (fixed to camera)
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

  // Action buttons
  private switchArmBtn!: Phaser.GameObjects.Container;
  private restBtn!: Phaser.GameObjects.Container;
  private restBtnText!: Phaser.GameObjects.Text;
  private raiseBtn!: Phaser.GameObjects.Container;
  private raiseBtnBg!: Phaser.GameObjects.Rectangle;
  private raiseBtnText!: Phaser.GameObjects.Text;

  // Mute button
  private muteBtn!: Phaser.GameObjects.Text;

  // Debug overlay (dev only)
  private debugOverlay: DebugOverlay | null = null;

  // Tree canopy graphics for idle wobble animation
  private treeCanopies: Phaser.GameObjects.Graphics[] = [];

  // Raise tap mechanic
  private raiseHoldActive: boolean = false;
  private raiseTapTimer: Phaser.Time.TimerEvent | null = null;

  // Traffic light visuals
  private lightGraphics!: Phaser.GameObjects.Graphics;

  // Spawn timers per lane
  private spawnTimers: Map<string, number> = new Map();

  // Config shorthand
  private readonly config = INTERSECTION_CONFIG;
  private readonly difficulty = DIFFICULTY_MEDIUM;

  // Sign data from crafting scene
  private signData!: SignData;

  constructor() {
    super({ key: 'IntersectionScene' });
  }

  create(): void {
    // --- Read sign data from registry (set by SignCraftScene, or use defaults) ---
    this.signData = getSignData(this);

    // --- Systems ---
    this.gameState = new GameStateManager(this.config.sessionDuration, this.difficulty);
    GameStateManager.register(this, this.gameState);

    this.trafficLights = new TrafficLightSystem(this.config, this.difficulty.lightCycleDurationMultiplier);
    this.reactionSystem = new ReactionSystem(this.difficulty);
    this.confidenceSystem = new ConfidenceSystem(this.gameState);
    this.fatigueSystem = new FatigueSystem(this.gameState, this.signData.material, this.difficulty);
    this.weatherSystem = new WeatherSystem(this, this.gameState, this.signData.material, this.difficulty);
    this.eventSystem = new EventSystem(this, this.gameState, this.weatherSystem, this.difficulty);

    // --- Audio system ---
    // Reuse existing AudioSystem from registry if available (persists across scenes)
    const existingAudio = AudioSystem.get(this);
    if (existingAudio) {
      this.audioSystem = existingAudio;
    } else {
      this.audioSystem = new AudioSystem();
      AudioSystem.register(this, this.audioSystem);
    }

    // --- Apply sign quality multiplier to reaction weights ---
    this.applySignQualityMultiplier();

    // --- Wire weather events into game state and visuals ---
    this.weatherSystem.on('weatherChanged', (weather: 'clear' | 'rain') => {
      this.gameState.setWeatherState(weather);
      if (weather === 'rain') {
        // Shift reaction weights toward negative during rain
        this.applyRainReactionShift();
      } else {
        // Restore normal weights
        this.applySignQualityMultiplier();
      }
    });

    this.weatherSystem.on('signDegraded', (degradation: number) => {
      this.gameState.setSignDegradation(degradation);
      this.updateSignDegradationVisual(degradation);
    });

    this.weatherSystem.on('npcLeft', (_remaining: number) => {
      this.showEventBannerText('A fellow protester left because of the rain...', '#9ca3af');
    });

    this.eventSystem.on('eventStarted', (type: string) => {
      this.gameState.recordEvent(type);
    });

    // --- World setup ---
    this.cameras.main.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Center camera on intersection
    const viewW = this.scale.width;
    const viewH = this.scale.height;
    this.cameras.main.scrollX = this.config.centerX - viewW / 2;
    this.cameras.main.scrollY = this.config.centerY - viewH / 2;

    // --- Draw intersection ---
    this.drawIntersection();

    // --- Global paper grain overlay (fixed to camera) ---
    const grainOverlay = applyPaperGrain(this, 0, 0, viewW, viewH, 0.035);
    grainOverlay.setScrollFactor(0);
    grainOverlay.setDepth(200);

    // --- Traffic lights visual ---
    this.lightGraphics = this.add.graphics();
    this.lightGraphics.setDepth(10);

    // --- Player ---
    this.player = new Player(this, this.config.playerX, this.config.playerY);
    this.player.setDepth(15);

    // --- Apply sign data to player character ---
    // Check if we have a crafted sign PNG (M2 sign creator) or fallback to M1 rectangle rendering
    if (this.signData.signImageDataUrl) {
      // Load PNG directly as an Image element, then add as texture
      const img = new Image();
      img.onload = () => {
        if (this.textures.exists('craftedSign')) {
          this.textures.remove('craftedSign');
        }
        this.textures.addImage('craftedSign', img);
        this.player.setSignTexture('craftedSign');
      };
      img.src = this.signData.signImageDataUrl;
    } else {
      // Backward compatibility: M1 rectangle-based sign rendering
      this.player.setSignMessage(this.signData.message);
      this.player.setSignMaterial(this.signData.material);
    }

    // --- Visibility cone ---
    this.cone = new VisibilityCone(this, this.config.playerX, this.config.playerY);

    // --- Input: drag to rotate cone ---
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameState.isActive()) return;

      // Convert screen pointer to world coordinates
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.config.playerX;
      const dy = worldPoint.y - this.config.playerY;
      const angle = Math.atan2(dy, dx);
      this.cone.setDirection(angle);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Init audio on first touch gesture (mobile requirement)
      if (!this.audioSystem['initialized']) {
        this.audioSystem.init();
        this.audioSystem.playSessionStart();
      }

      if (!this.gameState.isActive()) return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.config.playerX;
      const dy = worldPoint.y - this.config.playerY;
      const angle = Math.atan2(dy, dx);
      this.cone.setDirection(angle);
    });

    // --- Initialize spawn timers ---
    for (const lane of this.config.lanes) {
      const key = `${lane.direction}-${lane.laneIndex}`;
      this.spawnTimers.set(key, this.getRandomSpawnDelay());
    }

    // --- UI overlay ---
    this.createUI();

    // --- Listen for session end ---
    this.gameState.on('sessionEnd', () => {
      const endState = this.gameState.getState();
      if (endState.endReason === 'confidence') {
        this.audioSystem.playConfidenceZero();
      } else {
        this.audioSystem.playSessionEnd();
      }
      this.showSessionOver();
    });

    // --- Listen for traffic light changes ---
    this.trafficLights.on('phaseChanged', () => {
      for (const car of this.cars) {
        if (car.active && car.isStopped) {
          if (this.trafficLights.isGreen(car.direction)) {
            car.isStopped = false;
          }
        }
      }
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    // --- Debug overlay (dev only) ---
    if (import.meta.env.DEV) {
      this.debugOverlay = new DebugOverlay(this, {
        gameState: this.gameState,
        trafficLights: this.trafficLights,
        confidenceSystem: this.confidenceSystem,
        fatigueSystem: this.fatigueSystem,
        eventSystem: this.eventSystem,
        weatherSystem: this.weatherSystem,
        cars: () => this.cars,
        cone: this.cone,
      });
    }

    console.log('[HFD] IntersectionScene created. Phase 5 event system active.');
  }

  update(time: number, delta: number): void {
    if (!this.gameState.isActive()) return;

    // Update systems
    this.gameState.updateTime(delta);
    this.trafficLights.update(delta);
    this.confidenceSystem.update(delta);
    this.fatigueSystem.update(delta);
    this.eventSystem.update(delta);
    this.weatherSystem.update(delta);

    // Spawn cars
    this.updateCarSpawning(delta);

    // Update cars
    this.updateCars(time, delta);

    // Check cone intersections
    this.checkConeIntersections();

    // Update cone width based on fatigue
    this.updateConeFromFatigue();

    // Update visuals
    this.drawTrafficLights();
    this.updateUI();

    // Tree canopy wobble animation
    for (let i = 0; i < this.treeCanopies.length; i++) {
      const canopy = this.treeCanopies[i];
      // Each tree gets a slightly different frequency offset so they don't all sway in sync
      canopy.rotation = wobbleSine(0, time + i * 500, 0.026, 0.0015);
    }

    // Debug overlay
    if (this.debugOverlay) {
      this.debugOverlay.update(delta);
    }
  }

  // ============================================================
  // INTERSECTION RENDERING
  // ============================================================

  /**
   * Draw intersection — Paper Mario construction paper diorama.
   * Layered construction paper aesthetic: sky -> grass -> sidewalks -> roads ->
   * masking tape lane markings -> crosswalks -> stop lines -> corner dressing.
   * All colors from PALETTE, all shapes via paperArt utilities.
   */
  private drawIntersection(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const rw = this.config.roadWidth;
    const hw = rw / 2;
    const ww = this.config.worldWidth;
    const wh = this.config.worldHeight;
    const swW = 18; // Sidewalk width

    // Reset tree canopies array
    this.treeCanopies = [];

    // =========================================================
    // Layer 0: Sky / background (muted blue construction paper)
    // =========================================================
    const skyG = this.add.graphics();
    skyG.fillStyle(PALETTE.skyBlue, 1);
    skyG.fillRect(0, 0, ww, wh);
    skyG.setDepth(0);

    // =========================================================
    // Layer 1: Grass / ground corners (construction paper green)
    // Four quadrants outside the road cross, each slightly varied
    // =========================================================
    const grassG = this.add.graphics();
    const grassShades = [
      PALETTE.grassGreen,
      PALETTE.grassGreen + 0x060806,
      PALETTE.grassGreen - 0x080608,
      PALETTE.grassGreen + 0x040404,
    ];

    // Top-left grass
    drawScissorCutRect(grassG, 0, 0, cx - hw - swW, cy - hw - swW, grassShades[0]);
    // Top-right grass
    drawScissorCutRect(grassG, cx + hw + swW, 0, ww - cx - hw - swW, cy - hw - swW, grassShades[1]);
    // Bottom-left grass
    drawScissorCutRect(grassG, 0, cy + hw + swW, cx - hw - swW, wh - cy - hw - swW, grassShades[2]);
    // Bottom-right grass
    drawScissorCutRect(grassG, cx + hw + swW, cy + hw + swW, ww - cx - hw - swW, wh - cy - hw - swW, grassShades[3]);
    grassG.setDepth(1);

    // =========================================================
    // Layer 2: Sidewalks (construction paper tan borders)
    // =========================================================
    const swG = this.add.graphics();

    // Horizontal sidewalks (above and below horizontal road)
    drawScissorCutRect(swG, 0, cy - hw - swW, cx - hw, swW, PALETTE.sidewalkTan);
    drawScissorCutRect(swG, cx + hw, cy - hw - swW, ww - cx - hw, swW, PALETTE.sidewalkTan);
    drawScissorCutRect(swG, 0, cy + hw, cx - hw, swW, PALETTE.sidewalkTan);
    drawScissorCutRect(swG, cx + hw, cy + hw, ww - cx - hw, swW, PALETTE.sidewalkTan);

    // Vertical sidewalks (left and right of vertical road)
    drawScissorCutRect(swG, cx - hw - swW, 0, swW, cy - hw - swW, PALETTE.sidewalkTan);
    drawScissorCutRect(swG, cx + hw, 0, swW, cy - hw - swW, PALETTE.sidewalkTan);
    drawScissorCutRect(swG, cx - hw - swW, cy + hw + swW, swW, wh - cy - hw - swW, PALETTE.sidewalkTan);
    drawScissorCutRect(swG, cx + hw, cy + hw + swW, swW, wh - cy - hw - swW, PALETTE.sidewalkTan);
    swG.setDepth(2);

    // =========================================================
    // Layer 3: Roads (dark asphalt construction paper)
    // =========================================================
    const roadG = this.add.graphics();

    // Vertical road
    drawScissorCutRect(roadG, cx - hw, 0, rw, wh, PALETTE.asphalt);
    // Horizontal road
    drawScissorCutRect(roadG, 0, cy - hw, ww, rw, PALETTE.asphalt);

    // Center intersection box (slightly lighter asphalt)
    const centerAsphalt = PALETTE.asphalt + 0x0a0a0a;
    roadG.fillStyle(centerAsphalt, 1);
    roadG.fillRect(cx - hw, cy - hw, rw, rw);
    roadG.setDepth(3);

    // =========================================================
    // Layer 4: Lane markings (masking tape strips)
    // =========================================================
    const laneG = this.add.graphics();

    // Vertical center dashes (top approach — heading toward intersection)
    for (let y = 15; y < cy - hw - 10; y += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(laneG, cx, y, cx, y + dashLen, 6);
    }
    // Vertical center dashes (bottom approach)
    for (let y = cy + hw + 15; y < wh - 10; y += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(laneG, cx, y, cx, y + dashLen, 6);
    }
    // Horizontal center dashes (left approach)
    for (let x = 15; x < cx - hw - 10; x += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(laneG, x, cy, x + dashLen, cy, 6);
    }
    // Horizontal center dashes (right approach)
    for (let x = cx + hw + 15; x < ww - 10; x += 55) {
      const dashLen = 38 + Math.random() * 10;
      drawMaskingTapeStrip(laneG, x, cy, x + dashLen, cy, 6);
    }

    // =========================================================
    // Layer 4b: Crosswalks (wider masking tape strips)
    // =========================================================
    const cwStripeW = 7;
    const cwGap = 5;

    // Top crosswalk (horizontal stripes across vertical road)
    for (let i = 0; i < 4; i++) {
      const stripeY = cy - hw - swW + 2 + i * (cwStripeW + cwGap);
      drawMaskingTapeStrip(laneG, cx - hw + 6, stripeY, cx + hw - 6, stripeY, cwStripeW);
    }
    // Bottom crosswalk
    for (let i = 0; i < 4; i++) {
      const stripeY = cy + hw + 2 + i * (cwStripeW + cwGap);
      drawMaskingTapeStrip(laneG, cx - hw + 6, stripeY, cx + hw - 6, stripeY, cwStripeW);
    }
    // Left crosswalk (vertical stripes across horizontal road)
    for (let i = 0; i < 4; i++) {
      const stripeX = cx - hw - swW + 2 + i * (cwStripeW + cwGap);
      drawMaskingTapeStrip(laneG, stripeX, cy - hw + 6, stripeX, cy + hw - 6, cwStripeW);
    }
    // Right crosswalk
    for (let i = 0; i < 4; i++) {
      const stripeX = cx + hw + 2 + i * (cwStripeW + cwGap);
      drawMaskingTapeStrip(laneG, stripeX, cy - hw + 6, stripeX, cy + hw - 6, cwStripeW);
    }

    // =========================================================
    // Layer 4c: Stop lines (wider masking tape)
    // =========================================================
    const stopOff = hw + 3;
    // North stop line (top of intersection)
    drawMaskingTapeStrip(laneG, cx - hw + 4, cy - stopOff, cx + hw - 4, cy - stopOff, 8);
    // South stop line
    drawMaskingTapeStrip(laneG, cx - hw + 4, cy + stopOff, cx + hw - 4, cy + stopOff, 8);
    // West stop line
    drawMaskingTapeStrip(laneG, cx - stopOff, cy - hw + 4, cx - stopOff, cy + hw - 4, 8);
    // East stop line
    drawMaskingTapeStrip(laneG, cx + stopOff, cy - hw + 4, cx + stopOff, cy + hw - 4, 8);

    laneG.setDepth(4);

    // =========================================================
    // Layer 5: Corner environmental dressing
    // =========================================================

    // --- Buildings (paper cutout facades with scissor-cut edges) ---
    const buildingColors = [
      PALETTE.sidewalkTan - 0x101010,
      PALETTE.cardboard,
      PALETTE.sidewalkTan + 0x080808,
      PALETTE.cardboard - 0x101008,
    ];

    const buildG = this.add.graphics();

    // Helper: draw a paper cutout building with shadow and window cutouts
    const drawBuilding = (bx: number, by: number, bw: number, bh: number, color: number) => {
      drawPaperShadow(buildG, bx, by, bw, bh);
      drawScissorCutRect(buildG, bx, by, bw, bh, color);
      // Window cutouts (darker interior showing through)
      const winRows = Math.max(1, Math.floor(bh / 30));
      const winCols = Math.max(1, Math.floor(bw / 35));
      const winW = 12;
      const winH = 14;
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bx + 10 + c * (bw - 20) / Math.max(1, winCols);
          const wy = by + 10 + r * (bh - 20) / Math.max(1, winRows);
          buildG.fillStyle(PALETTE.asphalt, 0.6);
          buildG.fillRect(wx, wy, winW, winH);
        }
      }
    };

    // Top-left quadrant buildings
    drawBuilding(cx - hw - swW - 180, cy - hw - swW - 160, 130, 90, buildingColors[0]);
    drawBuilding(cx - hw - swW - 100, cy - hw - swW - 60, 70, 50, buildingColors[1]);

    // Top-right quadrant buildings
    drawBuilding(cx + hw + swW + 40, cy - hw - swW - 170, 120, 80, buildingColors[2]);
    drawBuilding(cx + hw + swW + 170, cy - hw - swW - 130, 100, 70, buildingColors[3]);

    // Bottom-left quadrant building
    drawBuilding(cx - hw - swW - 170, cy + hw + swW + 40, 110, 80, buildingColors[1]);

    // Bottom-right quadrant building
    drawBuilding(cx + hw + swW + 60, cy + hw + swW + 50, 130, 90, buildingColors[0]);

    buildG.setDepth(5);

    // --- Trees (popsicle stick trunk + green construction paper circle canopy) ---
    const treePositions = [
      { tx: cx - hw - swW - 60, ty: cy - hw - swW - 30, r: 18 },
      { tx: cx - hw - swW - 280, ty: cy - hw - swW - 100, r: 15 },
      { tx: cx + hw + swW + 250, ty: cy + hw + swW + 90, r: 20 },
      { tx: cx + hw + swW + 90, ty: cy - hw - swW - 80, r: 16 },
      { tx: cx - hw - swW - 120, ty: cy + hw + swW + 160, r: 17 },
    ];

    for (const tree of treePositions) {
      // Trunk (popsicle stick)
      const trunkG = this.add.graphics();
      drawPopsicleStick(trunkG, tree.tx - 3, tree.ty - 5, 6, 20);
      trunkG.setDepth(5);

      // Canopy (green circle with shadow) — separate Graphics for wobble animation
      const canopyG = this.add.graphics();
      drawPaperShadowCircle(canopyG, tree.tx, tree.ty, tree.r);
      canopyG.fillStyle(PALETTE.grassGreen + (Math.random() > 0.5 ? 0x0a0a06 : -0x060604), 0.92);
      canopyG.fillCircle(tree.tx, tree.ty, tree.r);
      canopyG.lineStyle(2, PALETTE.markerBlack, 0.7);
      canopyG.strokeCircle(tree.tx, tree.ty, tree.r);
      canopyG.setDepth(5);

      this.treeCanopies.push(canopyG);
    }
  }

  // ============================================================
  // TRAFFIC LIGHTS
  // ============================================================

  /**
   * Draw traffic lights — Paper Mario top-down style.
   * Pole is a small circle (viewed from above), arm extends over road,
   * 3 light circles in a row at end of arm. Active light gets a glow
   * ellipse cast on the road surface.
   */
  private drawTrafficLights(): void {
    const g = this.lightGraphics;
    g.clear();

    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const hw = this.config.roadWidth / 2;
    const offset = hw + 20;
    const MARKER = 0x1a1a1a;

    const positions: { px: number; py: number; armDx: number; armDy: number; direction: TrafficDirection }[] = [
      // NE corner — controls south traffic, arm extends left
      { px: cx + offset, py: cy - offset, armDx: -1, armDy: 0, direction: 'south' },
      // SW corner — controls north traffic, arm extends right
      { px: cx - offset, py: cy + offset, armDx: 1, armDy: 0, direction: 'north' },
      // SE corner — controls west traffic, arm extends up
      { px: cx + offset, py: cy + offset, armDx: 0, armDy: -1, direction: 'west' },
      // NW corner — controls east traffic, arm extends down
      { px: cx - offset, py: cy - offset, armDx: 0, armDy: 1, direction: 'east' },
    ];

    for (const pos of positions) {
      const color = this.trafficLights.getLightColor(pos.direction);

      // Pole (circle from above)
      g.fillStyle(0x888888, 1);
      g.fillCircle(pos.px, pos.py, 5);
      g.lineStyle(2, MARKER, 0.9);
      g.strokeCircle(pos.px, pos.py, 5);

      // Arm extending over road
      const armLen = 55;
      const armEndX = pos.px + pos.armDx * armLen;
      const armEndY = pos.py + pos.armDy * armLen;

      g.fillStyle(0x555555, 1);
      if (pos.armDx !== 0) {
        g.fillRoundedRect(
          Math.min(pos.px, armEndX), pos.py - 4,
          armLen, 8, 2
        );
      } else {
        g.fillRoundedRect(
          pos.px - 4, Math.min(pos.py, armEndY),
          8, armLen, 2
        );
      }
      g.lineStyle(1.5, MARKER, 0.7);
      if (pos.armDx !== 0) {
        g.strokeRoundedRect(
          Math.min(pos.px, armEndX), pos.py - 4,
          armLen, 8, 2
        );
      } else {
        g.strokeRoundedRect(
          pos.px - 4, Math.min(pos.py, armEndY),
          8, armLen, 2
        );
      }

      // 3 light circles at end of arm (viewed from above, in a row)
      const spacing = 15;
      const lights: { dx: number; dy: number; lc: string }[] = [
        { dx: 0, dy: 0, lc: 'red' },
        { dx: pos.armDx !== 0 ? pos.armDx * spacing : 0, dy: pos.armDy !== 0 ? pos.armDy * spacing : 0, lc: 'yellow' },
        { dx: pos.armDx !== 0 ? pos.armDx * spacing * 2 : 0, dy: pos.armDy !== 0 ? pos.armDy * spacing * 2 : 0, lc: 'green' },
      ];

      for (const light of lights) {
        const lx = armEndX + light.dx;
        const ly = armEndY + light.dy;
        const isActive = light.lc === color;

        // Background (dark housing)
        g.fillStyle(isActive ? this.getLightHex(light.lc) : this.getDimLightHex(light.lc), 1);
        g.fillCircle(lx, ly, 7);
        g.lineStyle(1.5, MARKER, 0.8);
        g.strokeCircle(lx, ly, 7);

        // Glow on road surface for active light
        if (isActive && light.lc === 'green') {
          g.fillStyle(0x22c55e, 0.06);
          g.fillEllipse(lx, ly + 25, 50, 30);
        } else if (isActive && light.lc === 'red') {
          g.fillStyle(0xef4444, 0.06);
          g.fillEllipse(lx, ly + 25, 50, 30);
        } else if (isActive && light.lc === 'yellow') {
          g.fillStyle(0xfbbf24, 0.06);
          g.fillEllipse(lx, ly + 25, 50, 30);
        }
      }
    }
  }

  private getLightHex(lc: string): number {
    switch (lc) {
      case 'red': return 0xef4444;
      case 'yellow': return 0xfbbf24;
      case 'green': return 0x22c55e;
      default: return 0x333333;
    }
  }

  private getDimLightHex(lc: string): number {
    switch (lc) {
      case 'red': return 0x6b2020;
      case 'yellow': return 0x6b5520;
      case 'green': return 0x206b30;
      default: return 0x333333;
    }
  }

  // ============================================================
  // CAR SPAWNING
  // ============================================================

  private getRandomSpawnDelay(): number {
    const { min, max } = this.config.spawnRateMs;
    const base = Phaser.Math.Between(min, max);
    return base / this.difficulty.trafficDensityMultiplier;
  }

  private getRandomCarSpeed(): number {
    const { min, max } = this.config.carSpeed;
    const base = Phaser.Math.Between(min, max);
    return base * this.difficulty.trafficSpeedMultiplier;
  }

  private updateCarSpawning(delta: number): void {
    for (const lane of this.config.lanes) {
      const key = `${lane.direction}-${lane.laneIndex}`;
      let timer = this.spawnTimers.get(key)!;
      timer -= delta;

      if (timer <= 0) {
        const isGreen = this.trafficLights.isGreen(lane.direction);
        const shouldSpawn = isGreen || Math.random() < 0.3;

        if (shouldSpawn) {
          this.spawnCar(lane);
        }

        this.spawnTimers.set(key, this.getRandomSpawnDelay());
      } else {
        this.spawnTimers.set(key, timer);
      }
    }
  }

  private spawnCar(lane: LaneDefinition): void {
    const tooClose = this.cars.some((car) => {
      if (!car.active || car.direction !== lane.direction) return false;
      const dx = car.x - lane.spawnX;
      const dy = car.y - lane.spawnY;
      return Math.sqrt(dx * dx + dy * dy) < 80;
    });

    if (tooClose) return;

    const speed = this.getRandomCarSpeed();
    const car = new Car(this, lane, speed);
    car.setDepth(8);
    this.cars.push(car);
  }

  // ============================================================
  // CAR UPDATE
  // ============================================================

  private updateCars(time: number, delta: number): void {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];

      if (!car.active) continue;

      const isGreen = this.trafficLights.isGreen(car.direction);

      if (!car.isPastStopLine()) {
        const carAhead = this.getCarAhead(car);
        if (carAhead && carAhead.isStopped) {
          const dist = this.getDistanceBetweenCars(car, carAhead);
          if (dist < 70) {
            car.isStopped = true;
          }
        } else {
          car.shouldStop(isGreen);
        }
      } else {
        car.isStopped = false;
      }

      car.update(time, delta);

      if (car.isOffScreen(this.config.worldWidth, this.config.worldHeight)) {
        if (!car.hasBeenReached && !car.hasPassed) {
          car.hasPassed = true;
          this.gameState.recordMissedCar();
        }
        car.setActive(false);
        car.setVisible(false);
        car.destroy();
        this.cars.splice(i, 1);
      }
    }
  }

  private getCarAhead(car: Car): Car | null {
    let closest: Car | null = null;
    let closestDist = Infinity;

    for (const other of this.cars) {
      if (other === car || !other.active || other.direction !== car.direction) continue;
      if (other.lane.laneIndex !== car.lane.laneIndex) continue;

      let ahead = false;
      switch (car.direction) {
        case 'north': ahead = other.y < car.y; break;
        case 'south': ahead = other.y > car.y; break;
        case 'east':  ahead = other.x > car.x; break;
        case 'west':  ahead = other.x < car.x; break;
      }

      if (ahead) {
        const dist = this.getDistanceBetweenCars(car, other);
        if (dist < closestDist) {
          closestDist = dist;
          closest = other;
        }
      }
    }

    return closest;
  }

  private getDistanceBetweenCars(a: Car, b: Car): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ============================================================
  // CONE INTERSECTION DETECTION + RAISE MECHANIC
  // ============================================================

  private checkConeIntersections(): void {
    const state = this.gameState.getState();
    // Reduce cone effectiveness while resting
    const visibilityFactor = this.fatigueSystem.getVisibilityFactor();

    for (const car of this.cars) {
      if (!car.active || car.hasBeenReached) continue;

      if (this.cone.containsPoint(car.x, car.y)) {
        // While resting, only catch a fraction of cars
        if (visibilityFactor < 1.0 && Math.random() > visibilityFactor) {
          continue;
        }

        car.hasBeenReached = true;

        // Roll a reaction
        const event = this.reactionSystem.react(car.x, car.y);
        const reaction = event.reaction;

        // --- Raise sign mechanic ---
        let finalScoreValue = reaction.scoreValue;
        let wasDeflected = false;
        let wasRaiseBoosted = false;

        if (state.isRaised) {
          if (reaction.sentiment === 'positive' && reaction.scoreValue > 0) {
            // Raised during positive reaction = bonus!
            const raiseConfig = this.fatigueSystem.getRaiseConfig();
            finalScoreValue = Math.round(reaction.scoreValue * raiseConfig.raisePositiveBonus);
            wasRaiseBoosted = true;
          } else if (reaction.sentiment === 'negative' && reaction.scoreValue < 0) {
            // Raised during negative reaction = deflect!
            const raiseConfig = this.fatigueSystem.getRaiseConfig();
            finalScoreValue = raiseConfig.deflectScoreValue;
            wasDeflected = true;
            // Bonus confidence for the deflect
            this.gameState.addConfidence(raiseConfig.deflectConfidenceBonus);
          }
        }

        // Record in game state
        this.gameState.recordReaction(reaction.id, finalScoreValue);

        // Play reaction sound
        if (wasDeflected) {
          this.audioSystem.playDeflect();
        } else {
          this.audioSystem.playReactionSound(reaction.id);
        }

        // Show visual feedback
        this.showReactionFeedback(car.x, car.y, reaction, wasRaiseBoosted, wasDeflected, finalScoreValue);
      }
    }
  }

  // ============================================================
  // FATIGUE -> CONE WIDTH
  // ============================================================

  private updateConeFromFatigue(): void {
    const coneWidth = this.fatigueSystem.getConeWidth();
    this.cone.setConeWidth(coneWidth);
  }

  // ============================================================
  // VISUAL FEEDBACK
  // ============================================================

  /**
   * Show paper cutout speech bubble reaction feedback.
   * Matches mockup: paper-white bubble with marker outline, Bangers font,
   * slight rotation, triangle tail pointing at car.
   */
  private showReactionFeedback(
    worldX: number,
    worldY: number,
    reaction: { emoji: string; scoreValue: number; color: number; label: string; sentiment?: string },
    wasRaiseBoosted: boolean,
    wasDeflected: boolean,
    finalScoreValue: number,
  ): void {
    const rotation = (Math.random() - 0.5) * 8; // -4 to +4 degrees

    // Update car emoji face if the car is still accessible
    for (const car of this.cars) {
      if (car.active && Math.abs(car.x - worldX) < 5 && Math.abs(car.y - worldY) < 5) {
        const sentiment = reaction.sentiment || (finalScoreValue > 0 ? 'positive' : finalScoreValue < 0 ? 'negative' : 'neutral');
        car.setReactionFace(sentiment as 'positive' | 'negative' | 'neutral');
        break;
      }
    }

    // Speech bubble (paper cutout)
    if (reaction.emoji || reaction.label) {
      const bubbleText = wasDeflected
        ? '\uD83D\uDEE1\uFE0F'
        : reaction.emoji
          ? `${reaction.emoji}`
          : '';

      const bubbleLabel = wasRaiseBoosted
        ? `${bubbleText} YEAH!`
        : wasDeflected
          ? `${bubbleText} DEFLECT!`
          : reaction.label === 'Honk!'
            ? `HONK! \uD83C\uDFBA`
            : bubbleText || reaction.label;

      if (bubbleLabel) {
        // Paper cutout bubble background
        const bubbleW = Math.max(50, bubbleLabel.length * 10 + 20);
        const bubbleH = 24;

        const bg = this.add.graphics();
        const isPositive = finalScoreValue > 0;
        const bubbleFill = isPositive ? 0xfbbf24 : 0xf5f0e8;

        // Shadow
        bg.fillStyle(0x1a1a1a, 0.3);
        bg.fillRoundedRect(worldX - bubbleW / 2 + 2, worldY - 42, bubbleW, bubbleH, 4);

        // Bubble body
        bg.fillStyle(bubbleFill, 1);
        bg.fillRoundedRect(worldX - bubbleW / 2, worldY - 44, bubbleW, bubbleH, 4);
        bg.lineStyle(2, 0x1a1a1a, 0.9);
        bg.strokeRoundedRect(worldX - bubbleW / 2, worldY - 44, bubbleW, bubbleH, 4);

        // Triangle tail
        bg.fillStyle(bubbleFill, 1);
        bg.fillTriangle(
          worldX - 5, worldY - 22,
          worldX + 5, worldY - 22,
          worldX, worldY - 14,
        );

        bg.setDepth(20);
        bg.setAngle(rotation);

        const text = this.add.text(worldX, worldY - 32, bubbleLabel, {
          fontFamily: "'Bangers', cursive",
          fontSize: (wasRaiseBoosted || wasDeflected) ? '14px' : '12px',
          color: finalScoreValue < 0 ? '#ef4444' : '#1a1a1a',
          letterSpacing: 1,
        });
        text.setOrigin(0.5);
        text.setDepth(21);
        text.setAngle(rotation);

        this.tweens.add({
          targets: [bg, text],
          y: `-=${50}`,
          alpha: 0,
          duration: 1500,
          delay: 400,
          ease: 'Quad.easeOut',
          onComplete: () => { bg.destroy(); text.destroy(); },
        });
      }
    }

    // Score floater (Bangers font, paper style)
    if (finalScoreValue !== 0) {
      const sign = finalScoreValue > 0 ? '+' : '';
      const label = `${sign}${finalScoreValue}`;
      const color = finalScoreValue > 0 ? '#22c55e' : '#ef4444';
      const fontSize = (wasRaiseBoosted || wasDeflected) ? '24px' : '20px';

      const floater = this.add.text(worldX + 25, worldY - 15, label, {
        fontFamily: "'Bangers', cursive",
        fontSize,
        color,
        stroke: '#1a1a1a',
        strokeThickness: 3,
        letterSpacing: 1,
      });
      floater.setOrigin(0.5);
      floater.setDepth(22);

      this.tweens.add({
        targets: floater,
        y: worldY - 70,
        alpha: 0,
        duration: 1000,
        ease: 'Quad.easeOut',
        onComplete: () => floater.destroy(),
      });
    }
  }

  // ============================================================
  // UI OVERLAY
  // ============================================================

  private createUI(): void {
    const viewW = this.scale.width;
    const viewH = this.scale.height;

    // --- Score display (top right, paper cutout card) ---
    // Background card
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0xf5f0e8, 0.9);
    scoreBg.fillRoundedRect(0, 0, 155, 42, 3);
    scoreBg.lineStyle(2.5, 0x1a1a1a, 0.9);
    scoreBg.strokeRoundedRect(0, 0, 155, 42, 3);
    scoreBg.setScrollFactor(0);
    scoreBg.setDepth(99);
    scoreBg.setPosition(viewW - 175, 15);

    this.scoreText = this.add.text(0, 0, '0 HONKS', {
      fontFamily: "'Bangers', cursive",
      fontSize: '26px',
      color: '#1a1a1a',
      letterSpacing: 2,
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(100);
    this.scoreText.setOrigin(0.5);
    this.scoreText.setPosition(viewW - 97, 36);

    // --- Timer / Clock display (top center, paper cutout card) ---
    const timerBg = this.add.graphics();
    timerBg.fillStyle(0xf5f0e8, 0.9);
    timerBg.fillRoundedRect(0, 0, 100, 48, 3);
    timerBg.lineStyle(2.5, 0x1a1a1a, 0.9);
    timerBg.strokeRoundedRect(0, 0, 100, 48, 3);
    timerBg.setScrollFactor(0);
    timerBg.setDepth(99);
    timerBg.setPosition(viewW / 2 - 50, 10);

    this.timerText = this.add.text(0, 0, '3:00', {
      fontFamily: "'Bangers', cursive",
      fontSize: '20px',
      color: '#1a1a1a',
    });
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(100);
    this.timerText.setOrigin(0.5);
    this.timerText.setPosition(viewW / 2, 34);

    // --- Confidence meter (left side, vertical bar) ---
    this.createConfidenceUI(viewW, viewH);

    // --- Fatigue meter (right side, vertical bar) ---
    this.createFatigueUI(viewW, viewH);

    // --- Action buttons (bottom) ---
    this.createActionButtons(viewW, viewH);

    // --- Settings/Mute button (top left, paper cutout gear) ---
    // Paper card background
    const muteBg = this.add.graphics();
    muteBg.fillStyle(0xf5f0e8, 0.85);
    muteBg.fillRoundedRect(0, 0, 42, 42, 3);
    muteBg.lineStyle(2.5, 0x1a1a1a, 0.9);
    muteBg.strokeRoundedRect(0, 0, 42, 42, 3);
    muteBg.setScrollFactor(0);
    muteBg.setDepth(99);
    muteBg.setPosition(15, 15);

    this.muteBtn = this.add.text(36, 36, '\uD83D\uDD0A', {
      fontSize: '20px',
    });
    this.muteBtn.setOrigin(0.5);
    this.muteBtn.setScrollFactor(0);
    this.muteBtn.setDepth(100);
    this.muteBtn.setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      const muted = this.audioSystem.toggleMute();
      this.muteBtn.setText(muted ? '\uD83D\uDD07' : '\uD83D\uDD0A');
    });

    // Listen for resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.timerText.setPosition(gameSize.width - 20, 20);
      this.cameras.main.scrollX = this.config.centerX - gameSize.width / 2;
      this.cameras.main.scrollY = this.config.centerY - gameSize.height / 2;
      // Reposition right-side elements
      this.repositionUI(gameSize.width, gameSize.height);
    });
  }

  /**
   * Confidence meter — Paper cutout card, bottom-right.
   * Matches mockup: paper-white card, Bangers label, bar with marker outline.
   */
  private createConfidenceUI(viewW: number, viewH: number): void {
    const cardW = 165;
    const cardH = 40;
    const barX = viewW - cardW - 15;
    const barY = viewH - cardH - 15;

    // Paper card background
    const confCard = this.add.graphics();
    confCard.fillStyle(0xf5f0e8, 0.9);
    confCard.fillRoundedRect(barX, barY, cardW, cardH, 3);
    confCard.lineStyle(2.5, 0x1a1a1a, 0.9);
    confCard.strokeRoundedRect(barX, barY, cardW, cardH, 3);
    confCard.setScrollFactor(0);
    confCard.setDepth(99);

    // Label
    this.confidenceLabel = this.add.text(barX + 12, barY + 5, 'CONFIDENCE', {
      fontFamily: "'Bangers', cursive",
      fontSize: '9px',
      color: '#3a3a3a',
      letterSpacing: 1,
    });
    this.confidenceLabel.setScrollFactor(0);
    this.confidenceLabel.setDepth(100);

    // Bar background
    const barInnerX = barX + 10;
    const barInnerY = barY + 20;
    const barWidth = 145;
    const barHeight = 12;

    this.confidenceBarBg = this.add.rectangle(barInnerX, barInnerY, barWidth, barHeight, 0xdddddd);
    this.confidenceBarBg.setOrigin(0, 0);
    this.confidenceBarBg.setStrokeStyle(1.5, 0x1a1a1a, 0.8);
    this.confidenceBarBg.setScrollFactor(0);
    this.confidenceBarBg.setDepth(100);

    // Bar fill
    const initialWidth = (CONFIDENCE_DEFAULTS.startingConfidence / 100) * barWidth;
    this.confidenceBarFill = this.add.rectangle(barInnerX + 1, barInnerY + 1, initialWidth - 2, barHeight - 2, 0x22c55e);
    this.confidenceBarFill.setOrigin(0, 0);
    this.confidenceBarFill.setScrollFactor(0);
    this.confidenceBarFill.setDepth(101);
  }

  /**
   * Fatigue meter — Paper cutout card, bottom-left.
   * Matches mockup: paper-white card, muscle emoji, Bangers label, bar.
   */
  private createFatigueUI(_viewW: number, viewH: number): void {
    const cardW = 160;
    const cardH = 40;
    const barX = 15;
    const barY = viewH - cardH - 15;

    // Paper card background
    const fatCard = this.add.graphics();
    fatCard.fillStyle(0xf5f0e8, 0.9);
    fatCard.fillRoundedRect(barX, barY, cardW, cardH, 3);
    fatCard.lineStyle(2.5, 0x1a1a1a, 0.9);
    fatCard.strokeRoundedRect(barX, barY, cardW, cardH, 3);
    fatCard.setScrollFactor(0);
    fatCard.setDepth(99);

    // Muscle emoji
    const muscleEmoji = this.add.text(barX + 18, barY + 22, '\uD83D\uDCAA', {
      fontSize: '16px',
    });
    muscleEmoji.setOrigin(0.5);
    muscleEmoji.setScrollFactor(0);
    muscleEmoji.setDepth(100);

    // Label
    this.fatigueLabel = this.add.text(barX + 36, barY + 5, 'ARM STRONG', {
      fontFamily: "'Bangers', cursive",
      fontSize: '9px',
      color: '#22c55e',
      letterSpacing: 1,
    });
    this.fatigueLabel.setScrollFactor(0);
    this.fatigueLabel.setDepth(100);

    // Bar background
    const barInnerX = barX + 36;
    const barInnerY = barY + 18;
    const barWidth = 110;
    const barHeight = 16;

    this.fatigueBarBg = this.add.rectangle(barInnerX, barInnerY, barWidth, barHeight, 0xdddddd);
    this.fatigueBarBg.setOrigin(0, 0);
    this.fatigueBarBg.setStrokeStyle(2, 0x1a1a1a, 0.8);
    this.fatigueBarBg.setScrollFactor(0);
    this.fatigueBarBg.setDepth(100);

    // Bar fill (starts empty)
    this.fatigueBarFill = this.add.rectangle(barInnerX + 1, barInnerY + 1, 0, barHeight - 2, 0x22c55e);
    this.fatigueBarFill.setOrigin(0, 0);
    this.fatigueBarFill.setScrollFactor(0);
    this.fatigueBarFill.setDepth(101);
  }

  private createActionButtons(viewW: number, viewH: number): void {
    const btnY = viewH - 80;
    const btnHeight = 48;
    const btnGap = 12;

    // --- RAISE button (center, large) --- Paper Mario neobrutalist style
    const raiseBtnWidth = 140;
    const raiseBg = this.add.rectangle(0, 0, raiseBtnWidth, btnHeight, 0xfbbf24);
    raiseBg.setStrokeStyle(3, 0x1a1a1a, 1);
    const raiseText = this.add.text(0, 0, 'RAISE', {
      fontFamily: "'Bangers', cursive",
      fontSize: '24px',
      color: '#1a1a1a',
      letterSpacing: 3,
    });
    raiseText.setOrigin(0.5);

    this.raiseBtn = this.add.container(viewW / 2, btnY, [raiseBg, raiseText]);
    this.raiseBtn.setScrollFactor(0);
    this.raiseBtn.setDepth(110);
    this.raiseBtn.setSize(raiseBtnWidth, btnHeight);
    this.raiseBtn.setInteractive({ useHandCursor: true });
    this.raiseBtnBg = raiseBg;
    this.raiseBtnText = raiseText;

    // Raise button: supports both tap (auto-lower after 0.8s) and hold
    let raiseDownTime = 0;
    const HOLD_THRESHOLD = 200; // ms: if held longer than this, treat as hold
    const TAP_RAISE_DURATION = 800; // ms: how long sign stays raised on tap

    this.raiseBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      raiseDownTime = this.time.now;
      this.raiseHoldActive = true;
      this.fatigueSystem.setRaised(true);
      this.audioSystem.playRaiseSign();
      this.raiseBtnBg.setFillStyle(0xe89b0c);
      this.raiseBtnText.setText('RAISED!');
    });

    this.raiseBtn.on('pointerup', () => {
      if (!this.raiseHoldActive) return;
      this.raiseHoldActive = false;
      const holdDuration = this.time.now - raiseDownTime;

      if (holdDuration < HOLD_THRESHOLD) {
        // Tap: keep raised for a brief window, then auto-lower
        if (this.raiseTapTimer) this.raiseTapTimer.destroy();
        this.raiseTapTimer = this.time.delayedCall(TAP_RAISE_DURATION, () => {
          this.fatigueSystem.setRaised(false);
          this.raiseBtnBg.setFillStyle(0xfbbf24);
          this.raiseBtnText.setText('RAISE');
          this.raiseTapTimer = null;
        });
      } else {
        // Hold release: lower immediately
        this.fatigueSystem.setRaised(false);
        this.raiseBtnBg.setFillStyle(0xfbbf24);
        this.raiseBtnText.setText('RAISE');
      }
    });

    this.raiseBtn.on('pointerout', () => {
      if (!this.raiseHoldActive) return;
      this.raiseHoldActive = false;
      // If no tap timer running, lower immediately
      if (!this.raiseTapTimer) {
        this.fatigueSystem.setRaised(false);
        this.raiseBtnBg.setFillStyle(0xfbbf24);
        this.raiseBtnText.setText('RAISE');
      }
    });

    // --- Switch Arms button (left of raise) --- Paper cutout style
    const switchBtnWidth = 100;
    const switchBg = this.add.rectangle(0, 0, switchBtnWidth, btnHeight, 0x3b82f6);
    switchBg.setStrokeStyle(3, 0x1a1a1a, 1);
    const switchText = this.add.text(0, 0, 'SWITCH\nARMS', {
      fontFamily: "'Bangers', cursive",
      fontSize: '14px',
      color: '#f5f0e8',
      align: 'center',
      letterSpacing: 1,
    });
    switchText.setOrigin(0.5);

    this.switchArmBtn = this.add.container(viewW / 2 - raiseBtnWidth / 2 - btnGap - switchBtnWidth / 2, btnY, [switchBg, switchText]);
    this.switchArmBtn.setScrollFactor(0);
    this.switchArmBtn.setDepth(110);
    this.switchArmBtn.setSize(switchBtnWidth, btnHeight);
    this.switchArmBtn.setInteractive({ useHandCursor: true });
    this.switchArmBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      const switched = this.fatigueSystem.trySwitchArm();
      if (switched) {
        switchBg.setFillStyle(0x22c55e);
        const arm = this.gameState.getState().activeArm;
        switchText.setText(`${arm === 'left' ? 'Left' : 'Right'}\nArm`);
        this.time.delayedCall(500, () => {
          switchBg.setFillStyle(0x3b82f6);
          switchText.setText('Switch\nArms');
        });
      } else {
        // On cooldown — flash red
        switchBg.setFillStyle(0xef4444);
        this.time.delayedCall(300, () => {
          switchBg.setFillStyle(0x3b82f6);
        });
      }
    });

    // --- Rest button (right of raise) --- Paper cutout style
    const restBtnWidth = 100;
    const restBg = this.add.rectangle(0, 0, restBtnWidth, btnHeight, 0x6b7280);
    restBg.setStrokeStyle(3, 0x1a1a1a, 1);
    const restText = this.add.text(0, 0, 'REST', {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color: '#f5f0e8',
      letterSpacing: 2,
    });
    restText.setOrigin(0.5);

    this.restBtn = this.add.container(viewW / 2 + raiseBtnWidth / 2 + btnGap + restBtnWidth / 2, btnY, [restBg, restText]);
    this.restBtn.setScrollFactor(0);
    this.restBtn.setDepth(110);
    this.restBtn.setSize(restBtnWidth, btnHeight);
    this.restBtn.setInteractive({ useHandCursor: true });
    this.restBtnText = restText;

    this.restBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      this.fatigueSystem.toggleRest();
      const isResting = this.gameState.getState().isResting;
      restBg.setFillStyle(isResting ? 0x22c55e : 0x6b7280);
      restText.setText(isResting ? 'Resting...' : 'Rest');
    });
  }

  private repositionUI(viewW: number, viewH: number): void {
    // Reposition fatigue bar
    const barWidth = 160;
    const barX = viewW - barWidth - 24;
    this.fatigueBarBg.setPosition(barX, 70);
    this.fatigueBarFill.setPosition(barX + 2, 72);
    this.fatigueLabel.setPosition(barX, 66);

    // Reposition buttons
    const btnY = viewH - 80;
    const raiseBtnWidth = 140;
    const btnGap = 12;
    const switchBtnWidth = 100;
    const restBtnWidth = 100;

    this.raiseBtn.setPosition(viewW / 2, btnY);
    this.switchArmBtn.setPosition(viewW / 2 - raiseBtnWidth / 2 - btnGap - switchBtnWidth / 2, btnY);
    this.restBtn.setPosition(viewW / 2 + raiseBtnWidth / 2 + btnGap + restBtnWidth / 2, btnY);
  }

  private updateUI(): void {
    const state = this.gameState.getState();

    // Score (paper cutout HUD)
    this.scoreText.setText(`${state.score} HONKS`);

    // Timer
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = Math.floor(state.timeRemaining % 60);
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    if (state.timeRemaining <= 30) {
      this.timerText.setColor(state.timeRemaining % 1 < 0.5 ? '#ef4444' : '#ffffff');
    }

    // --- Confidence bar ---
    const confPct = state.confidence / 100;
    const confBarMaxWidth = 145 - 2; // barWidth - padding
    const targetWidth = confPct * confBarMaxWidth;

    // Smooth animation: lerp toward target
    const currentWidth = this.confidenceBarFill.width;
    const lerpSpeed = 0.08;
    const newWidth = currentWidth + (targetWidth - currentWidth) * lerpSpeed;
    this.confidenceBarFill.width = Math.max(0, newWidth);

    // Color: red (0-30), yellow (30-60), green (60-100)
    let confColor: number;
    if (state.confidence < 30) {
      confColor = 0xef4444;
    } else if (state.confidence < 60) {
      confColor = 0xfbbf24;
    } else {
      confColor = 0x22c55e;
    }
    this.confidenceBarFill.setFillStyle(confColor);
    this.confidenceLabel.setText(`CONFIDENCE`);

    // --- Fatigue bar ---
    const fatPct = state.armFatigue / 100;
    const fatBarMaxWidth = 110 - 2;
    this.fatigueBarFill.width = fatPct * fatBarMaxWidth;

    // Color: green (0-40), orange (40-70), red (70-100)
    let fatColor: number;
    if (state.armFatigue < 40) {
      fatColor = 0x22c55e;
    } else if (state.armFatigue < 70) {
      fatColor = 0xf97316;
    } else {
      fatColor = 0xef4444;
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

    // Disable raise button while resting
    if (state.isResting) {
      this.raiseBtnBg.setAlpha(0.4);
    } else {
      this.raiseBtnBg.setAlpha(1);
    }
  }

  // ============================================================
  // SESSION END
  // ============================================================

  private showSessionOver(): void {
    const state = this.gameState.getState();

    // Clean up systems
    this.confidenceSystem.destroy();
    this.fatigueSystem.destroy();
    this.eventSystem.destroy();
    this.weatherSystem.destroy();

    // Clean up raise tap timer
    if (this.raiseTapTimer) {
      this.raiseTapTimer.destroy();
      this.raiseTapTimer = null;
    }

    // Clean up debug overlay
    if (this.debugOverlay) {
      this.debugOverlay.destroy();
      this.debugOverlay = null;
    }

    // Store final game state snapshot in registry for ScoreScene
    this.registry.set('finalGameState', { ...state, reactions: { ...state.reactions } });

    // Brief delay to let the moment land, then transition to ScoreScene
    this.time.delayedCall(800, () => {
      this.scene.start('ScoreScene');
    });
  }

  // ============================================================
  // SIGN QUALITY -> REACTION MULTIPLIER
  // ============================================================

  private applySignQualityMultiplier(): void {
    const quality = this.signData.qualityScore;
    const qualityOffset = (quality - 0.5) * 0.6;

    const positiveWeight = this.difficulty.positiveReactionWeight + qualityOffset;
    const negativeWeight = this.difficulty.negativeReactionWeight - qualityOffset * 0.5;
    const neutralWeight = 1.0 - positiveWeight - negativeWeight;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    const adjustedDifficulty = {
      ...this.difficulty,
      positiveReactionWeight: clamp(positiveWeight, 0.2, 0.9),
      neutralReactionWeight: clamp(neutralWeight, 0.05, 0.4),
      negativeReactionWeight: clamp(negativeWeight, 0.05, 0.4),
    };

    this.reactionSystem.updateWeights(adjustedDifficulty);
  }

  // ============================================================
  // RAIN REACTION SHIFT (Phase 5)
  // ============================================================

  private applyRainReactionShift(): void {
    const quality = this.signData.qualityScore;
    const qualityOffset = (quality - 0.5) * 0.6;
    const rainShift = this.weatherSystem.getRainNegativeShift();

    const positiveWeight = this.difficulty.positiveReactionWeight + qualityOffset - rainShift;
    const negativeWeight = this.difficulty.negativeReactionWeight - qualityOffset * 0.5 + rainShift;
    const neutralWeight = 1.0 - positiveWeight - negativeWeight;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    const adjustedDifficulty = {
      ...this.difficulty,
      positiveReactionWeight: clamp(positiveWeight, 0.15, 0.85),
      neutralReactionWeight: clamp(neutralWeight, 0.05, 0.4),
      negativeReactionWeight: clamp(negativeWeight, 0.05, 0.45),
    };

    this.reactionSystem.updateWeights(adjustedDifficulty);
  }

  // ============================================================
  // SIGN DEGRADATION VISUAL (Phase 5)
  // ============================================================

  private updateSignDegradationVisual(degradation: number): void {
    // Darken and fade the player's sign based on degradation (0 = pristine, 1 = ruined)
    if (this.player) {
      const alpha = 1.0 - degradation * 0.6; // Min alpha 0.4
      this.player.setAlpha(alpha);
    }
  }

  // ============================================================
  // EVENT BANNER HELPER (Phase 5)
  // ============================================================

  /**
   * Show event banner — Paper cutout card with Bangers font.
   */
  private showEventBannerText(text: string, color: string): void {
    const viewW = this.scale.width;

    const banner = this.add.text(viewW / 2, 120, text, {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color,
      stroke: '#1a1a1a',
      strokeThickness: 2,
      backgroundColor: '#f5f0e8ee',
      padding: { x: 16, y: 8 },
    });
    banner.setOrigin(0.5);
    banner.setScrollFactor(0);
    banner.setDepth(160);

    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: 100,
      duration: 1000,
      delay: 2500,
      ease: 'Quad.easeOut',
      onComplete: () => banner.destroy(),
    });
  }
}
