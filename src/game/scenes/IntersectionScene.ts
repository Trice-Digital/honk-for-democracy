import Phaser from 'phaser';
import { INTERSECTION_CONFIG } from '../config/intersectionConfig';
import type { LaneDefinition, TrafficDirection } from '../config/intersectionConfig';
import { DIFFICULTY_MEDIUM } from '../config/difficultyConfig';
import { CONFIDENCE_DEFAULTS } from '../config/confidenceConfig';
import { getSignData, type SignData } from '../config/signConfig';
import { GameStateManager } from '../systems/GameStateManager';
import { TrafficLightSystem } from '../systems/TrafficLightSystem';
import { ReactionSystem } from '../systems/ReactionSystem';
import { ConfidenceSystem } from '../systems/ConfidenceSystem';
import { FatigueSystem } from '../systems/FatigueSystem';
import { EventSystem } from '../systems/EventSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { AudioSystem } from '../systems/AudioSystem';
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

    // --- Traffic lights visual ---
    this.lightGraphics = this.add.graphics();
    this.lightGraphics.setDepth(10);

    // --- Player ---
    this.player = new Player(this, this.config.playerX, this.config.playerY);
    this.player.setDepth(15);

    // --- Apply sign data to player character ---
    this.player.setSignMessage(this.signData.message);
    this.player.setSignMaterial(this.signData.material);

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
  }

  // ============================================================
  // INTERSECTION RENDERING
  // ============================================================

  private drawIntersection(): void {
    const g = this.add.graphics();
    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const rw = this.config.roadWidth;
    const hw = rw / 2;

    // Ground/grass
    g.fillStyle(0x4a7c59, 1);
    g.fillRect(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Sidewalks
    const sidewalkWidth = 30;
    g.fillStyle(0xc2b280, 1);
    g.fillRect(cx - hw - sidewalkWidth, 0, sidewalkWidth, this.config.worldHeight);
    g.fillRect(cx + hw, 0, sidewalkWidth, this.config.worldHeight);
    g.fillRect(0, cy - hw - sidewalkWidth, this.config.worldWidth, sidewalkWidth);
    g.fillRect(0, cy + hw, this.config.worldWidth, sidewalkWidth);
    g.fillRect(cx - hw - sidewalkWidth, cy - hw - sidewalkWidth, sidewalkWidth, sidewalkWidth);
    g.fillRect(cx + hw, cy - hw - sidewalkWidth, sidewalkWidth, sidewalkWidth);
    g.fillRect(cx - hw - sidewalkWidth, cy + hw, sidewalkWidth, sidewalkWidth);
    g.fillRect(cx + hw, cy + hw, sidewalkWidth, sidewalkWidth);

    // Roads
    g.fillStyle(0x3d3d3d, 1);
    g.fillRect(cx - hw, 0, rw, this.config.worldHeight);
    g.fillRect(0, cy - hw, this.config.worldWidth, rw);

    // Center intersection
    g.fillStyle(0x444444, 1);
    g.fillRect(cx - hw, cy - hw, rw, rw);

    // Lane markings
    g.lineStyle(3, 0xfbbf24, 0.8);
    for (let y = 0; y < cy - hw; y += 30) {
      g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, Math.min(y + 18, cy - hw)); g.strokePath();
    }
    for (let y = cy + hw + 12; y < this.config.worldHeight; y += 30) {
      g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, Math.min(y + 18, this.config.worldHeight)); g.strokePath();
    }
    for (let x = 0; x < cx - hw; x += 30) {
      g.beginPath(); g.moveTo(x, cy); g.lineTo(Math.min(x + 18, cx - hw), cy); g.strokePath();
    }
    for (let x = cx + hw + 12; x < this.config.worldWidth; x += 30) {
      g.beginPath(); g.moveTo(x, cy); g.lineTo(Math.min(x + 18, this.config.worldWidth), cy); g.strokePath();
    }

    // Crosswalks
    g.fillStyle(0xffffff, 0.7);
    const cwWidth = 8;
    const cwGap = 12;
    const cwOffset = hw + 5;

    for (let x = cx - hw + 5; x < cx + hw - 5; x += cwWidth + cwGap) {
      g.fillRect(x, cy - cwOffset - 20, cwWidth, 20);
    }
    for (let x = cx - hw + 5; x < cx + hw - 5; x += cwWidth + cwGap) {
      g.fillRect(x, cy + cwOffset, cwWidth, 20);
    }
    for (let y = cy - hw + 5; y < cy + hw - 5; y += cwWidth + cwGap) {
      g.fillRect(cx - cwOffset - 20, y, 20, cwWidth);
    }
    for (let y = cy - hw + 5; y < cy + hw - 5; y += cwWidth + cwGap) {
      g.fillRect(cx + cwOffset, y, 20, cwWidth);
    }

    // Stop lines
    g.fillStyle(0xffffff, 0.9);
    const stopOffset = hw + 2;
    g.fillRect(cx - hw, cy - stopOffset - 4, rw, 4);
    g.fillRect(cx - hw, cy + stopOffset, rw, 4);
    g.fillRect(cx - stopOffset - 4, cy - hw, 4, rw);
    g.fillRect(cx + stopOffset, cy - hw, 4, rw);

    g.setDepth(0);
  }

  // ============================================================
  // TRAFFIC LIGHTS
  // ============================================================

  private drawTrafficLights(): void {
    const g = this.lightGraphics;
    g.clear();

    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const hw = this.config.roadWidth / 2;
    const offset = hw + 45;

    const positions: { x: number; y: number; direction: TrafficDirection }[] = [
      { x: cx + offset, y: cy - offset, direction: 'south' },
      { x: cx - offset, y: cy + offset, direction: 'north' },
      { x: cx + offset, y: cy + offset, direction: 'west' },
      { x: cx - offset, y: cy - offset, direction: 'east' },
    ];

    for (const pos of positions) {
      const color = this.trafficLights.getLightColor(pos.direction);
      g.fillStyle(0x1a1a1a, 1);
      g.fillRoundedRect(pos.x - 10, pos.y - 15, 20, 30, 4);
      g.fillStyle(color === 'red' ? 0xff0000 : 0x330000, 1);
      g.fillCircle(pos.x, pos.y - 8, 6);
      g.fillStyle(color === 'yellow' ? 0xffff00 : 0x333300, 1);
      g.fillCircle(pos.x, pos.y, 6);
      g.fillStyle(color === 'green' ? 0x00ff00 : 0x003300, 1);
      g.fillCircle(pos.x, pos.y + 8, 6);
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

  private showReactionFeedback(
    worldX: number,
    worldY: number,
    reaction: { emoji: string; scoreValue: number; color: number; label: string },
    wasRaiseBoosted: boolean,
    wasDeflected: boolean,
    finalScoreValue: number,
  ): void {
    // Emoji pop
    if (reaction.emoji) {
      const emojiText = wasDeflected ? '🛡️' : reaction.emoji;
      const emoji = this.add.text(worldX, worldY - 20, emojiText, {
        fontSize: wasRaiseBoosted || wasDeflected ? '36px' : '28px',
      });
      emoji.setOrigin(0.5);
      emoji.setDepth(20);

      this.tweens.add({
        targets: emoji,
        y: worldY - 80,
        alpha: 0,
        duration: 1200,
        ease: 'Quad.easeOut',
        onComplete: () => emoji.destroy(),
      });
    }

    // Score floater
    if (finalScoreValue !== 0) {
      const sign = finalScoreValue > 0 ? '+' : '';
      let label = `${sign}${finalScoreValue}`;
      if (wasRaiseBoosted) label += ' BONUS!';
      if (wasDeflected) label += ' DEFLECT!';

      const color = finalScoreValue > 0 ? '#22c55e' : '#ef4444';
      const fontSize = (wasRaiseBoosted || wasDeflected) ? '26px' : '22px';

      const floater = this.add.text(worldX + 20, worldY - 10, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize,
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      });
      floater.setOrigin(0.5);
      floater.setDepth(21);

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

    // --- Score text (top left) ---
    this.scoreText = this.add.text(0, 0, 'Score: 0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      padding: { x: 8, y: 4 },
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(100);
    this.scoreText.setPosition(20, 20);

    // --- Timer text (top right) ---
    this.timerText = this.add.text(0, 0, '3:00', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      padding: { x: 8, y: 4 },
    });
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(100);
    this.timerText.setOrigin(1, 0);
    this.timerText.setPosition(viewW - 20, 20);

    // --- Confidence meter (left side, vertical bar) ---
    this.createConfidenceUI(viewW, viewH);

    // --- Fatigue meter (right side, vertical bar) ---
    this.createFatigueUI(viewW, viewH);

    // --- Action buttons (bottom) ---
    this.createActionButtons(viewW, viewH);

    // --- Mute button (top center) ---
    this.muteBtn = this.add.text(viewW / 2, 24, '\uD83D\uDD0A', {
      fontSize: '24px',
      backgroundColor: '#1a1a2e99',
      padding: { x: 8, y: 4 },
    });
    this.muteBtn.setOrigin(0.5, 0);
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

  private createConfidenceUI(viewW: number, _viewH: number): void {
    const barX = 24;
    const barY = 70;
    const barWidth = 160;
    const barHeight = 18;

    // Label
    this.confidenceLabel = this.add.text(barX, barY - 4, 'Confidence: 30%', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.confidenceLabel.setScrollFactor(0);
    this.confidenceLabel.setDepth(100);
    this.confidenceLabel.setOrigin(0, 1);

    // Background
    this.confidenceBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x1a1a1a, 0.8);
    this.confidenceBarBg.setOrigin(0, 0);
    this.confidenceBarBg.setStrokeStyle(2, 0xffffff, 0.3);
    this.confidenceBarBg.setScrollFactor(0);
    this.confidenceBarBg.setDepth(100);

    // Fill
    const initialWidth = (CONFIDENCE_DEFAULTS.startingConfidence / 100) * barWidth;
    this.confidenceBarFill = this.add.rectangle(barX + 2, barY + 2, initialWidth - 4, barHeight - 4, 0xfbbf24);
    this.confidenceBarFill.setOrigin(0, 0);
    this.confidenceBarFill.setScrollFactor(0);
    this.confidenceBarFill.setDepth(101);
  }

  private createFatigueUI(viewW: number, _viewH: number): void {
    const barWidth = 160;
    const barHeight = 18;
    const barX = viewW - barWidth - 24;
    const barY = 70;

    // Label
    this.fatigueLabel = this.add.text(barX, barY - 4, 'Fatigue: 0%', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.fatigueLabel.setScrollFactor(0);
    this.fatigueLabel.setDepth(100);
    this.fatigueLabel.setOrigin(0, 1);

    // Background
    this.fatigueBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x1a1a1a, 0.8);
    this.fatigueBarBg.setOrigin(0, 0);
    this.fatigueBarBg.setStrokeStyle(2, 0xffffff, 0.3);
    this.fatigueBarBg.setScrollFactor(0);
    this.fatigueBarBg.setDepth(100);

    // Fill (starts empty)
    this.fatigueBarFill = this.add.rectangle(barX + 2, barY + 2, 0, barHeight - 4, 0x22c55e);
    this.fatigueBarFill.setOrigin(0, 0);
    this.fatigueBarFill.setScrollFactor(0);
    this.fatigueBarFill.setDepth(101);
  }

  private createActionButtons(viewW: number, viewH: number): void {
    const btnY = viewH - 80;
    const btnHeight = 48;
    const btnGap = 12;

    // --- RAISE button (center, large) ---
    const raiseBtnWidth = 140;
    const raiseBg = this.add.rectangle(0, 0, raiseBtnWidth, btnHeight, 0xfbbf24);
    raiseBg.setStrokeStyle(3, 0xffffff, 0.6);
    const raiseText = this.add.text(0, 0, 'RAISE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#1a1a1a',
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

    // --- Switch Arms button (left of raise) ---
    const switchBtnWidth = 100;
    const switchBg = this.add.rectangle(0, 0, switchBtnWidth, btnHeight, 0x3b82f6);
    switchBg.setStrokeStyle(2, 0xffffff, 0.4);
    const switchText = this.add.text(0, 0, 'Switch\nArms', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
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

    // --- Rest button (right of raise) ---
    const restBtnWidth = 100;
    const restBg = this.add.rectangle(0, 0, restBtnWidth, btnHeight, 0x6b7280);
    restBg.setStrokeStyle(2, 0xffffff, 0.4);
    const restText = this.add.text(0, 0, 'Rest', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
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

    // Score
    this.scoreText.setText(`Score: ${state.score}`);

    // Timer
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = Math.floor(state.timeRemaining % 60);
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    if (state.timeRemaining <= 30) {
      this.timerText.setColor(state.timeRemaining % 1 < 0.5 ? '#ef4444' : '#ffffff');
    }

    // --- Confidence bar ---
    const confPct = state.confidence / 100;
    const confBarMaxWidth = 160 - 4; // barWidth - padding
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
    this.confidenceLabel.setText(`Confidence: ${Math.round(state.confidence)}%`);

    // --- Fatigue bar ---
    const fatPct = state.armFatigue / 100;
    const fatBarMaxWidth = 160 - 4;
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
    this.fatigueLabel.setText(`Fatigue: ${Math.round(state.armFatigue)}%`);

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

  private showEventBannerText(text: string, color: string): void {
    const viewW = this.scale.width;

    const banner = this.add.text(viewW / 2, 120, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#1a1a2eee',
      padding: { x: 12, y: 6 },
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
