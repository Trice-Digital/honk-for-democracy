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
  private muteBtnBg!: Phaser.GameObjects.Graphics;

  // Neobrutalist button shadows (press-into-shadow effect)
  private raiseBtnShadow!: Phaser.GameObjects.Graphics;
  private switchBtnShadow!: Phaser.GameObjects.Graphics;
  private switchBtnBg!: Phaser.GameObjects.Rectangle;
  private restBtnShadow!: Phaser.GameObjects.Graphics;
  private restBtnBg!: Phaser.GameObjects.Rectangle;

  // Stopped traffic banner
  private stoppedTrafficBanner: Phaser.GameObjects.Container | null = null;
  private isShowingStoppedBanner: boolean = false;

  // Debug overlay (dev only)
  private debugOverlay: DebugOverlay | null = null;

  // Tree canopy graphics for idle wobble animation
  private treeCanopies: Phaser.GameObjects.Graphics[] = [];

  // Paper cutout analog clock
  private clockContainer!: Phaser.GameObjects.Container;
  private clockHandGraphics!: Phaser.GameObjects.Graphics;

  // Menu / Pause
  private isPaused: boolean = false;
  private menuOverlay: Phaser.GameObjects.Container | null = null;

  // Raise tap mechanic
  private raiseHoldActive: boolean = false;
  private raiseTapTimer: Phaser.Time.TimerEvent | null = null;

  // Traffic light visuals
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private trafficLightContainers: Phaser.GameObjects.Container[] = [];
  private trafficLightActiveCircles: Phaser.GameObjects.Graphics[] = [];

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

      // Camera flash on phase change (very subtle white flash)
      this.cameras.main.flash(150, 255, 255, 200, false, undefined, undefined, 0.1);

      // Scale-bounce the active light circles
      for (const lightCircle of this.trafficLightActiveCircles) {
        this.tweens.add({
          targets: lightCircle,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 150,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
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
    if (this.isPaused) return;

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

    // Player idle wobble and fatigue visuals
    const state = this.gameState.getState();
    this.player.updateWobble(time, state.isRaised);
    this.player.updateFatigueVisuals(state.armFatigue);

    // Traffic light container idle wobble (1 degree = ~0.01745 rad)
    for (let i = 0; i < this.trafficLightContainers.length; i++) {
      const tlc = this.trafficLightContainers[i];
      tlc.rotation = wobbleSine(0, time + i * 700, 0.01745, 0.0012);
    }

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
   * Draw traffic lights — Paper cutout on popsicle stick mounts.
   * Each light is a Container with:
   *  - popsicle stick pole
   *  - paper cutout housing (dark rectangle, scissor-cut edges)
   *  - 3 light circles: active glows through paper, inactive dim
   *  - drop shadow on housing
   *
   * Called every frame to update active/inactive light states.
   * Containers are created once (first call), then redrawn.
   */
  private drawTrafficLights(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const hw = this.config.roadWidth / 2;
    const offset = hw + 20;

    const positions: { px: number; py: number; armDx: number; armDy: number; direction: TrafficDirection }[] = [
      { px: cx + offset, py: cy - offset, armDx: -1, armDy: 0, direction: 'south' },
      { px: cx - offset, py: cy + offset, armDx: 1, armDy: 0, direction: 'north' },
      { px: cx + offset, py: cy + offset, armDx: 0, armDy: -1, direction: 'west' },
      { px: cx - offset, py: cy - offset, armDx: 0, armDy: 1, direction: 'east' },
    ];

    // First call: create containers. Subsequent calls: just redraw light graphics.
    const isFirstDraw = this.trafficLightContainers.length === 0;

    // Clear active circles tracking for phase change pulse
    this.trafficLightActiveCircles = [];

    // Redraw the shared graphics layer
    this.lightGraphics.clear();

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const color = this.trafficLights.getLightColor(pos.direction);

      if (isFirstDraw) {
        // Create a container at the pole position for wobble
        const container = this.add.container(pos.px, pos.py);
        container.setDepth(10);
        this.trafficLightContainers.push(container);

        // Popsicle stick pole (vertical, from ground up to housing)
        const stickG = this.add.graphics();
        drawPopsicleStick(stickG, -3, -30, 6, 30);
        container.add(stickG);
      }

      // Draw lights onto the shared graphics layer (redrawn each frame)
      const g = this.lightGraphics;

      // Housing dimensions
      const isHorizontal = pos.armDx !== 0;
      const housingW = isHorizontal ? 50 : 18;
      const housingH = isHorizontal ? 18 : 50;

      // Housing position: offset from pole toward intersection center
      const hx = pos.px + pos.armDx * 30 - housingW / 2;
      const hy = pos.py + pos.armDy * 30 - housingH / 2;

      // Drop shadow on housing
      drawPaperShadow(g, hx, hy, housingW, housingH);

      // Paper cutout housing (dark background)
      drawScissorCutRect(g, hx, hy, housingW, housingH, PALETTE.asphalt, PALETTE.markerBlack);

      // 3 light circles inside housing
      const spacing = 15;
      const lightDefs: { dx: number; dy: number; lc: string }[] = [
        { dx: isHorizontal ? -spacing : 0, dy: isHorizontal ? 0 : -spacing, lc: 'red' },
        { dx: 0, dy: 0, lc: 'yellow' },
        { dx: isHorizontal ? spacing : 0, dy: isHorizontal ? 0 : spacing, lc: 'green' },
      ];

      const lightCenterX = pos.px + pos.armDx * 30;
      const lightCenterY = pos.py + pos.armDy * 30;

      for (const light of lightDefs) {
        const lx = lightCenterX + light.dx;
        const ly = lightCenterY + light.dy;
        const isActive = light.lc === color;

        if (isActive) {
          // Glow halo behind active light (glow-through-paper effect)
          g.fillStyle(this.getLightHex(light.lc), 0.3);
          g.fillCircle(lx, ly, 10);

          // Active light circle — full brightness
          g.fillStyle(this.getLightHex(light.lc), 1);
          g.fillCircle(lx, ly, 6);

          // Glow on road surface
          g.fillStyle(this.getLightHex(light.lc), 0.06);
          g.fillEllipse(lx + pos.armDx * 20, ly + pos.armDy * 20, 50, 30);

          // Track active circle graphics for pulse on phase change
          const activeG = this.add.graphics();
          activeG.fillStyle(this.getLightHex(light.lc), 1);
          activeG.fillCircle(lx, ly, 6);
          activeG.setDepth(11);
          this.trafficLightActiveCircles.push(activeG);

          // Auto-destroy the overlay after a brief moment (it's just for pulse tweening)
          this.time.delayedCall(500, () => {
            if (activeG && activeG.active) activeG.destroy();
          });
        } else {
          // Inactive light — very dim
          g.fillStyle(this.getDimLightHex(light.lc), 0.15);
          g.fillCircle(lx, ly, 6);
        }

        // Light outline
        g.lineStyle(1.5, PALETTE.markerBlack, 0.8);
        g.strokeCircle(lx, ly, 6);
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
   * Paper speech bubble with scissor-cut edges, marker outline, triangle tail,
   * Bangers font, paper flutter animation (wobble + drift).
   * Stopped cars get larger bubbles; moving cars get smaller/faster ones.
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
    const xDrift = (Math.random() - 0.5) * 40; // paper flutter drift

    // Determine if car is stopped (larger bubbles for stopped cars)
    let carIsStopped = false;
    for (const car of this.cars) {
      if (car.active && Math.abs(car.x - worldX) < 5 && Math.abs(car.y - worldY) < 5) {
        const sentiment = reaction.sentiment || (finalScoreValue > 0 ? 'positive' : finalScoreValue < 0 ? 'negative' : 'neutral');
        car.setReactionFace(sentiment as 'positive' | 'negative' | 'neutral');
        carIsStopped = car.isStopped;
        break;
      }
    }

    // Size scaling: stopped cars = bigger bubbles, moving cars = smaller
    const sizeScale = carIsStopped ? 1.2 : 0.9;
    const animDuration = carIsStopped ? 1600 : 1100;

    // Speech bubble (paper cutout with scissor-cut edges)
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
        const baseFontSize = (wasRaiseBoosted || wasDeflected) ? 14 : 12;
        const fontSize = Math.round(baseFontSize * sizeScale);
        const bubbleW = Math.max(55, bubbleLabel.length * (10 * sizeScale) + 24);
        const bubbleH = Math.round(28 * sizeScale);

        const bg = this.add.graphics();
        const isNegative = finalScoreValue < 0;
        const bubbleFill = isNegative ? 0xf5d0d0 : PALETTE.paperWhite;

        // Hard offset shadow (paper lifted off table)
        bg.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
        bg.fillRoundedRect(
          worldX - bubbleW / 2 + PALETTE.shadowOffsetX,
          worldY - 44 + PALETTE.shadowOffsetY,
          bubbleW, bubbleH, 4
        );

        // Scissor-cut bubble body
        drawScissorCutRect(bg, worldX - bubbleW / 2, worldY - 44, bubbleW, bubbleH, bubbleFill);

        // Triangle tail pointing down toward car
        bg.fillStyle(bubbleFill, 1);
        bg.fillTriangle(
          worldX - 6, worldY - 44 + bubbleH,
          worldX + 6, worldY - 44 + bubbleH,
          worldX, worldY - 44 + bubbleH + 8,
        );
        // Tail outline
        bg.lineStyle(2, PALETTE.markerBlack, 0.9);
        bg.beginPath();
        bg.moveTo(worldX - 6, worldY - 44 + bubbleH);
        bg.lineTo(worldX, worldY - 44 + bubbleH + 8);
        bg.lineTo(worldX + 6, worldY - 44 + bubbleH);
        bg.strokePath();

        bg.setDepth(20);
        bg.setAngle(rotation);

        const text = this.add.text(worldX, worldY - 44 + bubbleH / 2, bubbleLabel, {
          fontFamily: "'Bangers', cursive",
          fontSize: `${fontSize}px`,
          color: isNegative ? '#ef4444' : '#1a1a1a',
          letterSpacing: 1,
        });
        text.setOrigin(0.5);
        text.setDepth(21);
        text.setAngle(rotation);

        // Paper flutter animation: float up + wobble rotation + x drift + fade
        this.tweens.add({
          targets: [bg, text],
          y: `-=${60 + Math.random() * 20}`,
          x: `+=${xDrift}`,
          alpha: 0,
          angle: rotation + (Math.random() - 0.5) * 12,
          duration: animDuration,
          delay: 350,
          ease: 'Quad.easeOut',
          onComplete: () => { bg.destroy(); text.destroy(); },
        });
      }
    }

    // Score floater (Bangers font with scale-bounce)
    if (finalScoreValue !== 0) {
      const sign = finalScoreValue > 0 ? '+' : '';
      const label = `${sign}${finalScoreValue}`;
      const isPositive = finalScoreValue > 0;
      const color = isPositive ? '#22c55e' : '#ef4444';
      const baseFontPx = (wasRaiseBoosted || wasDeflected) ? 28 : 22;
      const fontPx = Math.round(baseFontPx * sizeScale);

      const floater = this.add.text(worldX + 25, worldY - 15, label, {
        fontFamily: "'Bangers', cursive",
        fontSize: `${fontPx}px`,
        color,
        stroke: '#1a1a1a',
        strokeThickness: 3,
        letterSpacing: 1,
      });
      floater.setOrigin(0.5);
      floater.setDepth(22);
      floater.setScale(0.5);

      // Scale-bounce on appear: 0.5 -> 1.1 -> 1.0
      this.tweens.add({
        targets: floater,
        scale: 1.1,
        duration: 120,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: floater,
            scale: 1.0,
            duration: 80,
            ease: 'Sine.easeOut',
          });
        },
      });

      // Float up and fade
      this.tweens.add({
        targets: floater,
        y: worldY - 75,
        alpha: 0,
        duration: 1000,
        delay: 200,
        ease: 'Quad.easeOut',
        onComplete: () => floater.destroy(),
      });
    }
  }

  // ============================================================
  // STOPPED TRAFFIC BANNER
  // ============================================================

  /**
   * Show/hide "STOPPED TRAFFIC x2" paper cutout banner when all lights are red.
   * Slides in from top, slides out when lights go green.
   */
  private updateStoppedTrafficBanner(): void {
    const greenDirs = this.trafficLights.getGreenDirections();
    const isAllRedPhase = greenDirs.length === 0;

    if (isAllRedPhase && !this.isShowingStoppedBanner) {
      this.isShowingStoppedBanner = true;
      this.showStoppedBanner();
    } else if (!isAllRedPhase && this.isShowingStoppedBanner) {
      this.isShowingStoppedBanner = false;
      this.hideStoppedBanner();
    }
  }

  private showStoppedBanner(): void {
    if (this.stoppedTrafficBanner) {
      this.stoppedTrafficBanner.destroy();
    }

    const viewW = this.scale.width;
    const bannerW = 220;
    const bannerH = 36;

    // Paper cutout background
    const bg = this.add.graphics();
    // Shadow
    bg.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    bg.fillRoundedRect(-bannerW / 2 + 3, 3, bannerW, bannerH, 4);
    // Body
    drawScissorCutRect(bg, -bannerW / 2, 0, bannerW, bannerH, PALETTE.stoplightRed);

    const text = this.add.text(0, bannerH / 2, 'STOPPED TRAFFIC x2', {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color: '#fbbf24',
      stroke: '#1a1a1a',
      strokeThickness: 3,
      letterSpacing: 2,
    });
    text.setOrigin(0.5);

    this.stoppedTrafficBanner = this.add.container(viewW / 2, -40, [bg, text]);
    this.stoppedTrafficBanner.setScrollFactor(0);
    this.stoppedTrafficBanner.setDepth(150);

    // Slide in from top
    this.tweens.add({
      targets: this.stoppedTrafficBanner,
      y: 70,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private hideStoppedBanner(): void {
    if (!this.stoppedTrafficBanner) return;

    const banner = this.stoppedTrafficBanner;
    this.tweens.add({
      targets: banner,
      y: -50,
      duration: 250,
      ease: 'Quad.easeIn',
      onComplete: () => {
        banner.destroy();
        if (this.stoppedTrafficBanner === banner) {
          this.stoppedTrafficBanner = null;
        }
      },
    });
  }

  // ============================================================
  // UI OVERLAY
  // ============================================================

  private createUI(): void {
    const viewW = this.scale.width;
    const viewH = this.scale.height;

    // --- Score display (top right, neobrutalist paper cutout card) ---
    const scoreCardW = 155;
    const scoreCardH = 42;
    const scoreX = viewW - scoreCardW - 20;
    const scoreY = 15;

    // Hard offset shadow
    const scoreShadow = this.add.graphics();
    scoreShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    scoreShadow.fillRoundedRect(scoreX + 3, scoreY + 3, scoreCardW, scoreCardH, 4);
    scoreShadow.setScrollFactor(0);
    scoreShadow.setDepth(98);

    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(PALETTE.paperWhite, 0.95);
    scoreBg.fillRoundedRect(scoreX, scoreY, scoreCardW, scoreCardH, 4);
    scoreBg.lineStyle(3, PALETTE.markerBlack, 1);
    scoreBg.strokeRoundedRect(scoreX, scoreY, scoreCardW, scoreCardH, 4);
    scoreBg.setScrollFactor(0);
    scoreBg.setDepth(99);

    this.scoreText = this.add.text(0, 0, '0 HONKS', {
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

    // --- Timer / Clock display (top center, neobrutalist card) ---
    const timerCardW = 100;
    const timerCardH = 48;
    const timerX = viewW / 2 - timerCardW / 2;
    const timerY = 10;

    const timerShadow = this.add.graphics();
    timerShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    timerShadow.fillRoundedRect(timerX + 3, timerY + 3, timerCardW, timerCardH, 4);
    timerShadow.setScrollFactor(0);
    timerShadow.setDepth(98);

    const timerBg = this.add.graphics();
    timerBg.fillStyle(PALETTE.paperWhite, 0.95);
    timerBg.fillRoundedRect(timerX, timerY, timerCardW, timerCardH, 4);
    timerBg.lineStyle(3, PALETTE.markerBlack, 1);
    timerBg.strokeRoundedRect(timerX, timerY, timerCardW, timerCardH, 4);
    timerBg.setScrollFactor(0);
    timerBg.setDepth(99);

    this.timerText = this.add.text(0, 0, '3:00', {
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

    // --- Confidence meter ---
    this.createConfidenceUI(viewW, viewH);

    // --- Fatigue meter ---
    this.createFatigueUI(viewW, viewH);

    // --- Action buttons (bottom) ---
    this.createActionButtons(viewW, viewH);

    // --- Paper cutout analog clock (top center, above timer) ---
    this.createClockUI(viewW);

    // --- In-game menu button (top left, below mute) ---
    this.createMenuButton(viewW, viewH);

    // --- Settings/Mute button (top left, neobrutalist card) ---
    const muteShadow = this.add.graphics();
    muteShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    muteShadow.fillRoundedRect(18, 18, 42, 42, 4);
    muteShadow.setScrollFactor(0);
    muteShadow.setDepth(98);

    this.muteBtnBg = this.add.graphics();
    this.muteBtnBg.fillStyle(PALETTE.paperWhite, 0.9);
    this.muteBtnBg.fillRoundedRect(15, 15, 42, 42, 4);
    this.muteBtnBg.lineStyle(3, PALETTE.markerBlack, 1);
    this.muteBtnBg.strokeRoundedRect(15, 15, 42, 42, 4);
    this.muteBtnBg.setScrollFactor(0);
    this.muteBtnBg.setDepth(99);

    this.muteBtn = this.add.text(36, 36, '\uD83D\uDD0A', {
      fontSize: '20px',
    });
    this.muteBtn.setOrigin(0.5);
    this.muteBtn.setScrollFactor(0);
    this.muteBtn.setDepth(100);
    this.muteBtn.setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      this.muteBtnBg.setPosition(2, 2);
      this.muteBtn.setPosition(38, 38);
    });
    this.muteBtn.on('pointerup', () => {
      this.muteBtnBg.setPosition(0, 0);
      this.muteBtn.setPosition(36, 36);
      const muted = this.audioSystem.toggleMute();
      this.muteBtn.setText(muted ? '\uD83D\uDD07' : '\uD83D\uDD0A');
    });
    this.muteBtn.on('pointerout', () => {
      this.muteBtnBg.setPosition(0, 0);
      this.muteBtn.setPosition(36, 36);
    });

    // Listen for resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.timerText.setPosition(gameSize.width / 2, timerY + timerCardH / 2);
      this.cameras.main.scrollX = this.config.centerX - gameSize.width / 2;
      this.cameras.main.scrollY = this.config.centerY - gameSize.height / 2;
      this.repositionUI(gameSize.width, gameSize.height);
    });
  }

  /**
   * Confidence meter — Neobrutalist paper cutout card, bottom-right.
   * Paper-textured bar background with cardboard grain lines, marker border,
   * hard offset shadow. Bangers label.
   */
  private createConfidenceUI(viewW: number, viewH: number): void {
    const cardW = 165;
    const cardH = 40;
    const barX = viewW - cardW - 15;
    const barY = viewH - cardH - 15;

    // Hard offset shadow
    const confShadow = this.add.graphics();
    confShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    confShadow.fillRoundedRect(barX + 3, barY + 3, cardW, cardH, 4);
    confShadow.setScrollFactor(0);
    confShadow.setDepth(98);

    // Paper card background
    const confCard = this.add.graphics();
    confCard.fillStyle(PALETTE.paperWhite, 0.95);
    confCard.fillRoundedRect(barX, barY, cardW, cardH, 4);
    confCard.lineStyle(3, PALETTE.markerBlack, 1);
    confCard.strokeRoundedRect(barX, barY, cardW, cardH, 4);
    confCard.setScrollFactor(0);
    confCard.setDepth(99);

    // Label
    this.confidenceLabel = this.add.text(barX + 12, barY + 5, 'CONFIDENCE', {
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

    this.confidenceBarBg = this.add.rectangle(barInnerX, barInnerY, barWidth, barHeight, PALETTE.cardboard);
    this.confidenceBarBg.setOrigin(0, 0);
    this.confidenceBarBg.setStrokeStyle(2, PALETTE.markerBlack, 0.9);
    this.confidenceBarBg.setScrollFactor(0);
    this.confidenceBarBg.setDepth(100);

    // Bar fill
    const initialWidth = (CONFIDENCE_DEFAULTS.startingConfidence / 100) * barWidth;
    this.confidenceBarFill = this.add.rectangle(barInnerX + 1, barInnerY + 1, initialWidth - 2, barHeight - 2, PALETTE.stoplightGreen);
    this.confidenceBarFill.setOrigin(0, 0);
    this.confidenceBarFill.setScrollFactor(0);
    this.confidenceBarFill.setDepth(101);
  }

  /**
   * Fatigue meter — Neobrutalist paper cutout card, bottom-left.
   * Paper-textured bar background, marker border, hard offset shadow.
   * Border color-codes to traffic phase: green = push, yellow = conserve.
   */
  private createFatigueUI(_viewW: number, viewH: number): void {
    const cardW = 160;
    const cardH = 40;
    const barX = 15;
    const barY = viewH - cardH - 15;

    // Hard offset shadow
    const fatShadow = this.add.graphics();
    fatShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    fatShadow.fillRoundedRect(barX + 3, barY + 3, cardW, cardH, 4);
    fatShadow.setScrollFactor(0);
    fatShadow.setDepth(98);

    // Paper card background
    const fatCard = this.add.graphics();
    fatCard.fillStyle(PALETTE.paperWhite, 0.95);
    fatCard.fillRoundedRect(barX, barY, cardW, cardH, 4);
    fatCard.lineStyle(3, PALETTE.markerBlack, 1);
    fatCard.strokeRoundedRect(barX, barY, cardW, cardH, 4);
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

    this.fatigueBarBg = this.add.rectangle(barInnerX, barInnerY, barWidth, barHeight, PALETTE.cardboard);
    this.fatigueBarBg.setOrigin(0, 0);
    this.fatigueBarBg.setStrokeStyle(2, PALETTE.markerBlack, 0.9);
    this.fatigueBarBg.setScrollFactor(0);
    this.fatigueBarBg.setDepth(100);

    // Bar fill (starts empty)
    this.fatigueBarFill = this.add.rectangle(barInnerX + 1, barInnerY + 1, 0, barHeight - 2, PALETTE.stoplightGreen);
    this.fatigueBarFill.setOrigin(0, 0);
    this.fatigueBarFill.setScrollFactor(0);
    this.fatigueBarFill.setDepth(101);
  }

  /**
   * Action buttons — Neobrutalist style: thick borders, hard offset shadows,
   * press-into-shadow on pointerdown.
   */
  private createActionButtons(viewW: number, viewH: number): void {
    const btnY = viewH - 80;
    const btnHeight = 48;
    const btnGap = 12;

    // --- RAISE button (center, large) --- Neobrutalist style
    const raiseBtnWidth = 140;

    // Shadow (behind the container, fixed position)
    this.raiseBtnShadow = this.add.graphics();
    this.raiseBtnShadow.fillStyle(PALETTE.shadowDark, 0.5);
    this.raiseBtnShadow.fillRoundedRect(-raiseBtnWidth / 2 + 3, -btnHeight / 2 + 3, raiseBtnWidth, btnHeight, 4);
    this.raiseBtnShadow.setScrollFactor(0);
    this.raiseBtnShadow.setDepth(109);
    this.raiseBtnShadow.setPosition(viewW / 2, btnY);

    const raiseBg = this.add.rectangle(0, 0, raiseBtnWidth, btnHeight, PALETTE.safetyYellow);
    raiseBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
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
    const HOLD_THRESHOLD = 200;
    const TAP_RAISE_DURATION = 800;

    this.raiseBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      raiseDownTime = this.time.now;
      this.raiseHoldActive = true;
      this.fatigueSystem.setRaised(true);
      this.audioSystem.playRaiseSign();
      this.raiseBtnBg.setFillStyle(0xe89b0c);
      this.raiseBtnText.setText('RAISED!');
      // Press-into-shadow effect
      this.raiseBtn.setPosition(viewW / 2 + 2, btnY + 2);
    });

    this.raiseBtn.on('pointerup', () => {
      if (!this.raiseHoldActive) return;
      this.raiseHoldActive = false;
      // Restore position
      this.raiseBtn.setPosition(viewW / 2, btnY);
      const holdDuration = this.time.now - raiseDownTime;

      if (holdDuration < HOLD_THRESHOLD) {
        if (this.raiseTapTimer) this.raiseTapTimer.destroy();
        this.raiseTapTimer = this.time.delayedCall(TAP_RAISE_DURATION, () => {
          this.fatigueSystem.setRaised(false);
          this.raiseBtnBg.setFillStyle(PALETTE.safetyYellow);
          this.raiseBtnText.setText('RAISE');
          this.raiseTapTimer = null;
        });
      } else {
        this.fatigueSystem.setRaised(false);
        this.raiseBtnBg.setFillStyle(PALETTE.safetyYellow);
        this.raiseBtnText.setText('RAISE');
      }
    });

    this.raiseBtn.on('pointerout', () => {
      if (!this.raiseHoldActive) return;
      this.raiseHoldActive = false;
      this.raiseBtn.setPosition(viewW / 2, btnY);
      if (!this.raiseTapTimer) {
        this.fatigueSystem.setRaised(false);
        this.raiseBtnBg.setFillStyle(PALETTE.safetyYellow);
        this.raiseBtnText.setText('RAISE');
      }
    });

    // --- Switch Arms button (left of raise) --- Neobrutalist style
    const switchBtnWidth = 100;
    const switchX = viewW / 2 - raiseBtnWidth / 2 - btnGap - switchBtnWidth / 2;

    this.switchBtnShadow = this.add.graphics();
    this.switchBtnShadow.fillStyle(PALETTE.shadowDark, 0.5);
    this.switchBtnShadow.fillRoundedRect(-switchBtnWidth / 2 + 3, -btnHeight / 2 + 3, switchBtnWidth, btnHeight, 4);
    this.switchBtnShadow.setScrollFactor(0);
    this.switchBtnShadow.setDepth(109);
    this.switchBtnShadow.setPosition(switchX, btnY);

    const switchBg = this.add.rectangle(0, 0, switchBtnWidth, btnHeight, PALETTE.actionBlue);
    switchBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    this.switchBtnBg = switchBg;
    const switchText = this.add.text(0, 0, 'SWITCH\nARMS', {
      fontFamily: "'Bangers', cursive",
      fontSize: '14px',
      color: '#f5f0e8',
      align: 'center',
      letterSpacing: 1,
    });
    switchText.setOrigin(0.5);

    this.switchArmBtn = this.add.container(switchX, btnY, [switchBg, switchText]);
    this.switchArmBtn.setScrollFactor(0);
    this.switchArmBtn.setDepth(110);
    this.switchArmBtn.setSize(switchBtnWidth, btnHeight);
    this.switchArmBtn.setInteractive({ useHandCursor: true });
    this.switchArmBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      // Press-into-shadow
      this.switchArmBtn.setPosition(switchX + 2, btnY + 2);
      const switched = this.fatigueSystem.trySwitchArm();
      if (switched) {
        switchBg.setFillStyle(PALETTE.stoplightGreen);
        const arm = this.gameState.getState().activeArm;
        switchText.setText(`${arm === 'left' ? 'Left' : 'Right'}\nArm`);
        this.time.delayedCall(500, () => {
          switchBg.setFillStyle(PALETTE.actionBlue);
          switchText.setText('SWITCH\nARMS');
        });
      } else {
        switchBg.setFillStyle(PALETTE.stoplightRed);
        this.time.delayedCall(300, () => {
          switchBg.setFillStyle(PALETTE.actionBlue);
        });
      }
    });
    this.switchArmBtn.on('pointerup', () => {
      this.switchArmBtn.setPosition(switchX, btnY);
    });
    this.switchArmBtn.on('pointerout', () => {
      this.switchArmBtn.setPosition(switchX, btnY);
    });

    // --- Rest button (right of raise) --- Neobrutalist style
    const restBtnWidth = 100;
    const restX = viewW / 2 + raiseBtnWidth / 2 + btnGap + restBtnWidth / 2;

    this.restBtnShadow = this.add.graphics();
    this.restBtnShadow.fillStyle(PALETTE.shadowDark, 0.5);
    this.restBtnShadow.fillRoundedRect(-restBtnWidth / 2 + 3, -btnHeight / 2 + 3, restBtnWidth, btnHeight, 4);
    this.restBtnShadow.setScrollFactor(0);
    this.restBtnShadow.setDepth(109);
    this.restBtnShadow.setPosition(restX, btnY);

    const restBg = this.add.rectangle(0, 0, restBtnWidth, btnHeight, 0x6b7280);
    restBg.setStrokeStyle(3, PALETTE.markerBlack, 1);
    this.restBtnBg = restBg;
    const restText = this.add.text(0, 0, 'REST', {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color: '#f5f0e8',
      letterSpacing: 2,
    });
    restText.setOrigin(0.5);

    this.restBtn = this.add.container(restX, btnY, [restBg, restText]);
    this.restBtn.setScrollFactor(0);
    this.restBtn.setDepth(110);
    this.restBtn.setSize(restBtnWidth, btnHeight);
    this.restBtn.setInteractive({ useHandCursor: true });
    this.restBtnText = restText;

    this.restBtn.on('pointerdown', () => {
      if (!this.gameState.isActive()) return;
      // Press-into-shadow
      this.restBtn.setPosition(restX + 2, btnY + 2);
      this.fatigueSystem.toggleRest();
      const isResting = this.gameState.getState().isResting;
      restBg.setFillStyle(isResting ? PALETTE.stoplightGreen : 0x6b7280);
      restText.setText(isResting ? 'Resting...' : 'REST');
    });
    this.restBtn.on('pointerup', () => {
      this.restBtn.setPosition(restX, btnY);
    });
    this.restBtn.on('pointerout', () => {
      this.restBtn.setPosition(restX, btnY);
    });
  }

  /**
   * Paper cutout analog clock — marker-drawn face, popsicle stick mount,
   * hour/minute hands animating from 10:00 AM to 12:00 PM over session duration.
   */
  private createClockUI(viewW: number): void {
    const clockX = viewW / 2;
    const clockY = 100; // Below the timer card
    const radius = 38;

    this.clockContainer = this.add.container(clockX, clockY);
    this.clockContainer.setScrollFactor(0);
    this.clockContainer.setDepth(100);

    // Popsicle stick mount below the clock
    const stickG = this.add.graphics();
    drawPopsicleStick(stickG, -4, radius + 2, 8, 22);
    this.clockContainer.add(stickG);

    // Clock face shadow (hard offset)
    const shadowG = this.add.graphics();
    drawPaperShadowCircle(shadowG, 0, 0, radius);
    this.clockContainer.add(shadowG);

    // Clock face circle (paper white with scissor-cut wobble)
    const faceG = this.add.graphics();
    // Draw wobbled circle (approximate with polygon)
    const numSegments = 24;
    const facePoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      const wobble = (Math.random() - 0.5) * 2.5;
      facePoints.push({
        x: Math.cos(angle) * (radius + wobble),
        y: Math.sin(angle) * (radius + wobble),
      });
    }
    faceG.fillStyle(PALETTE.paperWhite, 1);
    faceG.lineStyle(2, PALETTE.markerBlack, 0.9);
    faceG.beginPath();
    faceG.moveTo(facePoints[0].x, facePoints[0].y);
    for (let i = 1; i < facePoints.length; i++) {
      faceG.lineTo(facePoints[i].x, facePoints[i].y);
    }
    faceG.closePath();
    faceG.fillPath();
    faceG.strokePath();
    this.clockContainer.add(faceG);

    // 12 tick marks at hour positions
    const tickG = this.add.graphics();
    for (let h = 0; h < 12; h++) {
      const angle = (h / 12) * Math.PI * 2 - Math.PI / 2; // 12 at top
      const innerR = radius - 8;
      const outerR = radius - 3;
      tickG.lineStyle(h % 3 === 0 ? 2.5 : 1.5, PALETTE.markerBlack, 0.85);
      tickG.beginPath();
      tickG.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      tickG.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      tickG.strokePath();
    }
    this.clockContainer.add(tickG);

    // Hour numbers: 12, 3, 6, 9
    const numberPositions = [
      { text: '12', angle: -Math.PI / 2, dist: radius - 15 },
      { text: '3', angle: 0, dist: radius - 13 },
      { text: '6', angle: Math.PI / 2, dist: radius - 15 },
      { text: '9', angle: Math.PI, dist: radius - 13 },
    ];
    for (const np of numberPositions) {
      const nx = Math.cos(np.angle) * np.dist;
      const ny = Math.sin(np.angle) * np.dist;
      const numText = this.add.text(nx, ny, np.text, {
        fontFamily: "'Bangers', cursive",
        fontSize: '9px',
        color: '#3a3a3a',
      });
      numText.setOrigin(0.5);
      this.clockContainer.add(numText);
    }

    // Clock hands (drawn each frame)
    this.clockHandGraphics = this.add.graphics();
    this.clockContainer.add(this.clockHandGraphics);

    // Center dot
    const centerDot = this.add.graphics();
    centerDot.fillStyle(PALETTE.markerBlack, 1);
    centerDot.fillCircle(0, 0, 3);
    this.clockContainer.add(centerDot);
  }

  /**
   * Paper cutout menu button — hamburger icon in top-left, below mute button.
   * Opens pause overlay with Resume, Restart, Quit to Title.
   */
  private createMenuButton(_viewW: number, _viewH: number): void {
    const btnX = 15;
    const btnY = 65; // Below the mute button
    const btnSize = 36;

    // Shadow
    const menuShadow = this.add.graphics();
    menuShadow.fillStyle(PALETTE.shadowDark, PALETTE.shadowAlpha);
    menuShadow.fillRoundedRect(btnX + 3, btnY + 3, btnSize, btnSize, 4);
    menuShadow.setScrollFactor(0);
    menuShadow.setDepth(104);

    // Button background (paper cutout)
    const menuBg = this.add.graphics();
    menuBg.fillStyle(PALETTE.paperWhite, 0.9);
    menuBg.fillRoundedRect(btnX, btnY, btnSize, btnSize, 4);
    menuBg.lineStyle(2.5, PALETTE.markerBlack, 1);
    menuBg.strokeRoundedRect(btnX, btnY, btnSize, btnSize, 4);
    menuBg.setScrollFactor(0);
    menuBg.setDepth(105);

    // Hamburger icon (three marker lines)
    const iconG = this.add.graphics();
    const cx = btnX + btnSize / 2;
    const cy = btnY + btnSize / 2;
    iconG.lineStyle(3, PALETTE.markerBlack, 0.9);
    for (let i = -1; i <= 1; i++) {
      const ly = cy + i * 7;
      iconG.beginPath();
      iconG.moveTo(cx - 9, ly);
      iconG.lineTo(cx + 9, ly);
      iconG.strokePath();
    }
    iconG.setScrollFactor(0);
    iconG.setDepth(106);

    // Interactive hit area
    const hitArea = this.add.rectangle(cx, cy, btnSize, btnSize);
    hitArea.setScrollFactor(0);
    hitArea.setDepth(107);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.setAlpha(0.001); // Invisible but interactive

    hitArea.on('pointerdown', () => {
      this.toggleMenuOverlay();
    });
  }

  /**
   * Toggle menu overlay — creates or destroys the pause panel.
   */
  private toggleMenuOverlay(): void {
    if (this.menuOverlay) {
      // Close overlay, resume
      this.menuOverlay.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
      return;
    }

    // Open overlay, pause
    this.isPaused = true;

    const viewW = this.scale.width;
    const viewH = this.scale.height;

    // Dark overlay background
    const darkBg = this.add.rectangle(0, 0, viewW, viewH, 0x000000, 0.6);
    darkBg.setOrigin(0, 0);

    // Paper cutout panel
    const panelW = 240;
    const panelH = 220;
    const panelX = viewW / 2 - panelW / 2;
    const panelY = viewH / 2 - panelH / 2;

    const panelG = this.add.graphics();
    // Shadow
    drawPaperShadow(panelG, panelX, panelY, panelW, panelH);
    // Body
    drawScissorCutRect(panelG, panelX, panelY, panelW, panelH, PALETTE.cardboard);

    // Title: "PAUSED"
    const titleText = this.add.text(viewW / 2, panelY + 30, 'PAUSED', {
      fontFamily: "'Bangers', cursive",
      fontSize: '32px',
      color: '#fbbf24',
      stroke: '#1a1a1a',
      strokeThickness: 4,
      letterSpacing: 3,
    });
    titleText.setOrigin(0.5);

    // Button factory
    const createMenuBtn = (
      y: number,
      label: string,
      fillColor: number,
      callback: () => void,
    ): Phaser.GameObjects.Container => {
      const bw = 180;
      const bh = 42;
      const bx = viewW / 2;

      const btnShadow = this.add.graphics();
      btnShadow.fillStyle(PALETTE.shadowDark, 0.5);
      btnShadow.fillRoundedRect(-bw / 2 + 3, -bh / 2 + 3, bw, bh, 4);

      const bg = this.add.rectangle(0, 0, bw, bh, fillColor);
      bg.setStrokeStyle(3, PALETTE.markerBlack, 1);

      const text = this.add.text(0, 0, label, {
        fontFamily: "'Bangers', cursive",
        fontSize: '20px',
        color: '#f5f0e8',
        letterSpacing: 2,
      });
      text.setOrigin(0.5);

      const container = this.add.container(bx, y, [btnShadow, bg, text]);
      container.setSize(bw, bh);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => {
        container.setPosition(bx + 2, y + 2);
      });
      container.on('pointerup', () => {
        container.setPosition(bx, y);
        callback();
      });
      container.on('pointerout', () => {
        container.setPosition(bx, y);
      });

      return container;
    };

    const btnStartY = panelY + 75;
    const btnGap = 50;

    // Resume button
    const resumeBtn = createMenuBtn(btnStartY, 'RESUME', PALETTE.stoplightGreen, () => {
      this.toggleMenuOverlay();
    });

    // Restart button
    const restartBtn = createMenuBtn(btnStartY + btnGap, 'RESTART', PALETTE.actionBlue, () => {
      this.menuOverlay?.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
      this.scene.restart();
    });

    // Quit to Title button
    const quitBtn = createMenuBtn(btnStartY + btnGap * 2, 'QUIT TO TITLE', PALETTE.stoplightRed, () => {
      this.menuOverlay?.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
      this.scene.start('BootScene');
    });

    this.menuOverlay = this.add.container(0, 0, [
      darkBg, panelG, titleText, resumeBtn, restartBtn, quitBtn,
    ]);
    this.menuOverlay.setScrollFactor(0);
    this.menuOverlay.setDepth(500);
  }

  /**
   * Update clock hands based on game progress.
   * Maps session time to 10:00 AM -> 12:00 PM (2 hours).
   */
  private updateClock(): void {
    if (!this.clockHandGraphics) return;

    const state = this.gameState.getState();
    const sessionDuration = this.config.sessionDuration;
    const gameProgress = 1 - (state.timeRemaining / sessionDuration); // 0.0 -> 1.0

    // Map to clock positions:
    // 10:00 AM = hour hand at 10 o'clock, minute hand at 12
    // 12:00 PM = hour hand at 12 o'clock, minute hand at 12
    // Hour hand: 10 o'clock = 300 degrees, 12 o'clock = 360 degrees (60 degree sweep)
    // Minute hand: 2 full rotations (0 -> 720 degrees)

    // Convert clock positions to radians (0 = 12 o'clock position, clockwise)
    // 10 o'clock in radians from 12 = (10/12) * 2PI = 5PI/3
    const hourStartRad = (10 / 12) * Math.PI * 2; // 10 o'clock
    const hourEndRad = Math.PI * 2; // 12 o'clock (full circle)
    const hourAngle = hourStartRad + (hourEndRad - hourStartRad) * gameProgress;

    // Minute hand: 2 full rotations
    const minuteAngle = gameProgress * Math.PI * 2 * 2;

    this.clockHandGraphics.clear();

    // Hour hand (short, thick)
    const hourLen = 16;
    // Offset by -PI/2 so 0 radians points up (12 o'clock)
    const hx = Math.cos(hourAngle - Math.PI / 2) * hourLen;
    const hy = Math.sin(hourAngle - Math.PI / 2) * hourLen;
    this.clockHandGraphics.lineStyle(3, PALETTE.markerBlack, 1);
    this.clockHandGraphics.beginPath();
    this.clockHandGraphics.moveTo(0, 0);
    this.clockHandGraphics.lineTo(hx, hy);
    this.clockHandGraphics.strokePath();

    // Minute hand (longer, thinner)
    const minLen = 26;
    const mx = Math.cos(minuteAngle - Math.PI / 2) * minLen;
    const my = Math.sin(minuteAngle - Math.PI / 2) * minLen;
    this.clockHandGraphics.lineStyle(2, PALETTE.markerBlack, 0.9);
    this.clockHandGraphics.beginPath();
    this.clockHandGraphics.moveTo(0, 0);
    this.clockHandGraphics.lineTo(mx, my);
    this.clockHandGraphics.strokePath();
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

    // --- Stopped traffic banner ---
    this.updateStoppedTrafficBanner();

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

    // Clean up menu overlay
    if (this.menuOverlay) {
      this.menuOverlay.destroy();
      this.menuOverlay = null;
      this.isPaused = false;
    }

    // Clean up stopped traffic banner
    if (this.stoppedTrafficBanner) {
      this.stoppedTrafficBanner.destroy();
      this.stoppedTrafficBanner = null;
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
