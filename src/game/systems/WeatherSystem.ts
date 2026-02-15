import Phaser from 'phaser';
import type { GameStateManager } from './GameStateManager';
import type { WeatherConfig } from '../config/eventConfig';
import { WEATHER_DEFAULTS } from '../config/eventConfig';
import type { SignMaterial } from '../config/signConfig';
import type { DifficultyConfig } from '../config/difficultyConfig';
import { PALETTE } from '../config/paletteConfig';

/**
 * WeatherSystem — Manages weather state and rain effects.
 *
 * Rain degrades sign quality over time (affected by material durability),
 * causes some NPC protesters to leave, shifts reactions negative,
 * and adds a visual rain overlay.
 *
 * Integrates with:
 * - GameStateManager (confidence drain, group size)
 * - Sign durability (material-driven degradation)
 * - Visual layer (rain particles, sign darkening)
 */

export type WeatherState = 'clear' | 'rain';

export class WeatherSystem extends Phaser.Events.EventEmitter {
  private gameState: GameStateManager;
  private config: WeatherConfig;
  private materialDurability: number;
  private difficultyWeatherMultiplier: number;

  // State
  private currentWeather: WeatherState = 'clear';
  private rainTimeRemaining: number = 0;
  private signDegradation: number = 0; // 0 = pristine, 1.0 = destroyed
  private npcLeaveCooldown: number = 0;

  // Visual elements (managed by scene, set externally)
  private rainGraphics: Phaser.GameObjects.Graphics | null = null;
  private rainDrops: { x: number; y: number; speed: number; length: number }[] = [];
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    gameState: GameStateManager,
    material: SignMaterial,
    difficulty: DifficultyConfig,
    config?: Partial<WeatherConfig>,
  ) {
    super();
    this.scene = scene;
    this.gameState = gameState;
    this.config = { ...WEATHER_DEFAULTS, ...config };
    this.materialDurability = material.durability;
    this.difficultyWeatherMultiplier = difficulty.weatherDurabilityMultiplier;
  }

  /**
   * Start rain. Called by EventSystem when weather event triggers.
   */
  startRain(): void {
    if (this.currentWeather === 'rain') return;

    this.currentWeather = 'rain';
    const duration = Phaser.Math.Between(
      this.config.rainDurationMin,
      this.config.rainDurationMax,
    );
    this.rainTimeRemaining = duration;

    // Create rain visual
    this.createRainVisual();

    this.emit('weatherChanged', 'rain');
    console.log(`[HFD] Weather: Rain started. Duration: ${duration}s`);
  }

  /**
   * Stop rain (called when duration expires or session ends).
   */
  stopRain(): void {
    if (this.currentWeather === 'clear') return;

    this.currentWeather = 'clear';
    this.rainTimeRemaining = 0;

    // Remove rain visual
    this.destroyRainVisual();

    this.emit('weatherChanged', 'clear');
    console.log('[HFD] Weather: Rain stopped.');
  }

  /**
   * Called every frame. Updates rain effects.
   */
  update(delta: number): void {
    if (this.currentWeather !== 'rain') return;

    const deltaSec = delta / 1000;

    // Count down rain duration
    this.rainTimeRemaining -= deltaSec;
    if (this.rainTimeRemaining <= 0) {
      this.stopRain();
      return;
    }

    // Degrade sign
    this.updateSignDegradation(deltaSec);

    // Drain confidence (rain is demoralizing)
    this.gameState.addConfidence(-this.config.rainConfidenceDrain * deltaSec);

    // Chance for NPCs to leave
    this.updateNpcLeaving(deltaSec);

    // Animate rain
    this.updateRainVisual(deltaSec);
  }

  /**
   * Degrade sign quality based on rain, material durability, and difficulty.
   */
  private updateSignDegradation(deltaSec: number): void {
    // Higher durability = slower degradation. Higher difficulty multiplier = slower.
    const effectiveDurability = this.materialDurability * this.difficultyWeatherMultiplier;
    const drainRate = this.config.rainSignDrainRate / Math.max(effectiveDurability, 0.1);

    this.signDegradation = Math.min(
      this.config.maxSignDegradation,
      this.signDegradation + (drainRate / 100) * deltaSec,
    );

    this.emit('signDegraded', this.signDegradation);
  }

  /**
   * NPCs may leave during rain (reduces group size / confidence floor).
   */
  private updateNpcLeaving(deltaSec: number): void {
    this.npcLeaveCooldown -= deltaSec;
    if (this.npcLeaveCooldown > 0) return;

    const state = this.gameState.getState();
    if (state.groupSize <= this.config.minNpcCount) return;

    if (Math.random() < this.config.npcLeaveChancePerSecond) {
      this.gameState.setGroupSize(state.groupSize - 1);
      this.npcLeaveCooldown = 3; // Don't check again for 3 seconds
      this.emit('npcLeft', state.groupSize - 1);
      console.log(`[HFD] Weather: NPC protester left. Group size: ${state.groupSize - 1}`);
    }
  }

  // ============================================================
  // RAIN VISUALS
  // ============================================================

  private createRainVisual(): void {
    this.rainGraphics = this.scene.add.graphics();
    this.rainGraphics.setScrollFactor(0);
    this.rainGraphics.setDepth(150);

    // Initialize rain drops
    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;
    this.rainDrops = [];

    for (let i = 0; i < this.config.rainParticleCount; i++) {
      this.rainDrops.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        speed: 400 + Math.random() * 300,
        length: 8 + Math.random() * 12,
      });
    }

    // Blue vellum overlay — desaturated blue tint like blue construction paper laid over scene
    const overlay = this.scene.add.rectangle(
      viewW / 2, viewH / 2, viewW, viewH, 0x3366aa, 0.08,
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(149);
    overlay.setName('rainOverlay');
  }

  /**
   * Update rain visual — Paper teardrop particles from mockup.
   * Each drop is a small paper cutout teardrop shape with marker outline.
   */
  private updateRainVisual(deltaSec: number): void {
    if (!this.rainGraphics) return;

    const viewW = this.scene.scale.width;
    const viewH = this.scene.scale.height;

    this.rainGraphics.clear();

    for (const drop of this.rainDrops) {
      drop.y += drop.speed * deltaSec;
      drop.x -= 30 * deltaSec; // Slight wind angle

      // Wrap around
      if (drop.y > viewH) {
        drop.y = -drop.length;
        drop.x = Math.random() * viewW;
      }
      if (drop.x < -20) {
        drop.x = viewW + 10;
      }

      // Paper teardrop cutout shape — blue construction paper raindrop
      const tx = drop.x;
      const ty = drop.y;
      const r = drop.length * 0.3;

      // Fill: blue construction paper cutout color
      this.rainGraphics.fillStyle(0x6699cc, 0.4);
      this.rainGraphics.beginPath();
      this.rainGraphics.moveTo(tx, ty);
      this.rainGraphics.lineTo(tx - r, ty + r * 2.5);
      this.rainGraphics.arc(tx, ty + r * 2.5, r, Math.PI, 0, false);
      this.rainGraphics.lineTo(tx + r, ty + r * 2.5);
      this.rainGraphics.closePath();
      this.rainGraphics.fillPath();

      // Subtle darker border (marker outline)
      this.rainGraphics.lineStyle(1, PALETTE.markerBlack, 0.2);
      this.rainGraphics.beginPath();
      this.rainGraphics.moveTo(tx, ty);
      this.rainGraphics.lineTo(tx - r, ty + r * 2.5);
      this.rainGraphics.arc(tx, ty + r * 2.5, r, Math.PI, 0, false);
      this.rainGraphics.lineTo(tx + r, ty + r * 2.5);
      this.rainGraphics.closePath();
      this.rainGraphics.strokePath();
    }
  }

  private destroyRainVisual(): void {
    if (this.rainGraphics) {
      this.rainGraphics.destroy();
      this.rainGraphics = null;
    }

    // Remove rain overlay
    const overlay = this.scene.children.getByName('rainOverlay');
    if (overlay) {
      overlay.destroy();
    }

    this.rainDrops = [];
  }

  // ============================================================
  // GETTERS
  // ============================================================

  getWeather(): WeatherState {
    return this.currentWeather;
  }

  isRaining(): boolean {
    return this.currentWeather === 'rain';
  }

  getSignDegradation(): number {
    return this.signDegradation;
  }

  /**
   * Get the reaction weight shift caused by rain.
   * Returns a negative shift value to increase negative reactions.
   */
  getRainNegativeShift(): number {
    return this.currentWeather === 'rain' ? this.config.rainNegativeShift : 0;
  }

  getRainTimeRemaining(): number {
    return this.rainTimeRemaining;
  }

  destroy(): void {
    this.destroyRainVisual();
    this.removeAllListeners();
  }
}
