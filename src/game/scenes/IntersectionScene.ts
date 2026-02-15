import Phaser from 'phaser';
import { INTERSECTION_CONFIG } from '../config/intersectionConfig';
import { DIFFICULTY_MEDIUM } from '../config/difficultyConfig';
import { getSignData, type SignData } from '../config/signConfig';
import { PALETTE } from '../config/paletteConfig';
import { drawPaperShadow, drawScissorCutRect, applyPaperGrain, wobbleSine } from '../utils/paperArt';
import { GameStateManager } from '../systems/GameStateManager';
import { TrafficLightSystem } from '../systems/TrafficLightSystem';
import { ReactionSystem } from '../systems/ReactionSystem';
import { ConfidenceSystem } from '../systems/ConfidenceSystem';
import { FatigueSystem } from '../systems/FatigueSystem';
import { EventSystem } from '../systems/EventSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { AudioMixerSystem } from '../systems/AudioMixerSystem';
import { AmbientSystem } from '../systems/AmbientSystem';
import { MusicSystem } from '../systems/MusicSystem';
import { ReactiveCueSystem } from '../systems/ReactiveCueSystem';
import { DebugOverlay } from '../systems/DebugOverlay';
import { Player } from '../entities/Player';
import { VisibilityCone } from '../entities/VisibilityCone';
import { IntersectionRenderer } from '../managers/IntersectionRenderer';
import { TrafficLightRenderer } from '../managers/TrafficLightRenderer';
import { TrafficManager } from '../managers/TrafficManager';
import { ReactionFeedbackManager } from '../managers/ReactionFeedbackManager';
import { PlayerController } from '../managers/PlayerController';
import { HUDManager } from '../managers/HUDManager';
import { MenuManager } from '../managers/MenuManager';

/**
 * IntersectionScene — Core gameplay scene.
 *
 * Top-down intersection with traffic lights, cars, player,
 * visibility cone, reactions, scoring, confidence meter,
 * arm fatigue, and raise sign mechanic. This is the game.
 *
 * Slim orchestrator that delegates to manager classes.
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
  private mixerSystem!: AudioMixerSystem;
  private ambientSystem!: AmbientSystem;
  private musicSystem!: MusicSystem;
  private cueSystem!: ReactiveCueSystem;

  // Entities
  private player!: Player;
  private cone!: VisibilityCone;

  // Managers
  private intersectionRenderer!: IntersectionRenderer;
  private trafficLightRenderer!: TrafficLightRenderer;
  private trafficManager!: TrafficManager;
  private reactionFeedback!: ReactionFeedbackManager;
  private playerController!: PlayerController;
  private hudManager!: HUDManager;
  private menuManager!: MenuManager;

  // Debug overlay (dev only)
  private debugOverlay: DebugOverlay | null = null;

  // Tree canopy sprites for idle wobble animation (baked from Graphics)
  private treeCanopies: Phaser.GameObjects.Image[] = [];

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

    // Reuse existing AudioMixerSystem from registry if available (persists across scenes)
    const existingMixer = AudioMixerSystem.get(this);
    if (existingMixer) {
      this.mixerSystem = existingMixer;
    } else {
      this.mixerSystem = new AudioMixerSystem();
      AudioMixerSystem.register(this, this.mixerSystem);
    }

    // --- Ambient, Music, and Reactive Cue systems ---
    // Create fresh instances each scene (they are scene-scoped, not persistent)
    this.ambientSystem = new AmbientSystem();
    this.ambientSystem.connectTo(this.mixerSystem.getLayerGain('ambient'));
    AmbientSystem.register(this, this.ambientSystem);

    this.musicSystem = new MusicSystem();
    this.musicSystem.connectTo(this.mixerSystem.getLayerGain('music'));
    MusicSystem.register(this, this.musicSystem);

    this.cueSystem = new ReactiveCueSystem();
    this.cueSystem.connectTo(this.mixerSystem.getLayerGain('cues'));
    ReactiveCueSystem.register(this, this.cueSystem);

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

    // --- Delegate rendering to IntersectionRenderer ---
    this.intersectionRenderer = new IntersectionRenderer(this, this.config);
    this.treeCanopies = this.intersectionRenderer.render();

    // --- Global paper grain overlay (fixed to camera) ---
    // Bake to texture immediately — the Graphics has thousands of path ops
    // that would get earcut-triangulated every frame otherwise.
    const grainG = applyPaperGrain(this, 0, 0, viewW, viewH, 0.035);
    grainG.generateTexture('grainOverlay', viewW, viewH);
    grainG.destroy();
    const grainImg = this.add.image(0, 0, 'grainOverlay');
    grainImg.setOrigin(0, 0);
    grainImg.setScrollFactor(0);
    grainImg.setDepth(200);

    // --- Traffic light rendering manager ---
    this.trafficLightRenderer = new TrafficLightRenderer(this, this.config, this.trafficLights);

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

    // --- Traffic manager ---
    this.trafficManager = new TrafficManager(this, this.config, this.difficulty, this.trafficLights, this.gameState);
    this.trafficManager.initSpawnTimers();

    // --- Reaction feedback manager ---
    this.reactionFeedback = new ReactionFeedbackManager(this);

    // --- Player controller ---
    this.playerController = new PlayerController(
      this,
      this.config,
      this.cone,
      this.gameState,
      this.fatigueSystem,
      this.audioSystem,
      this.reactionSystem,
      this.reactionFeedback,
      () => this.trafficManager.getCars()
    );

    // --- HUD manager ---
    this.hudManager = new HUDManager(this, this.gameState, this.fatigueSystem, this.trafficLights, this.config);
    this.hudManager.createUI(viewW, viewH);

    // --- Menu manager ---
    this.menuManager = new MenuManager(this, this.audioSystem, this.mixerSystem);
    this.menuManager.createMuteButton();
    this.menuManager.createMenuButton(viewW, viewH);

    // --- Wire player controller input (after MenuManager created) ---
    this.playerController.setupInput(this.menuManager);
    this.playerController.createActionButtons(viewW, viewH);

    // --- Listen for session end ---
    this.gameState.on('sessionEnd', () => {
      const endState = this.gameState.getState();
      if (endState.endReason === 'confidence') {
        this.audioSystem.playConfidenceZero();
      } else {
        this.audioSystem.playSessionEnd();
      }
      // Fade out ambient and music layers smoothly before scene transition
      this.ambientSystem.stop();
      this.musicSystem.stop();
      this.showSessionOver();
    });

    // --- Listen for traffic light changes ---
    this.trafficLights.on('phaseChanged', () => {
      const cars = this.trafficManager.getCars();
      for (const car of cars) {
        if (car.active && car.isStopped) {
          if (this.trafficLights.isGreen(car.direction)) {
            car.isStopped = false;
          }
        }
      }

      // Traffic light clunk sound
      this.audioSystem.playTrafficLightChange();

      // Redraw traffic lights with new phase colors
      this.trafficLightRenderer.draw();

      // Scale-bounce the active light circles
      const activeCircles = this.trafficLightRenderer.getActiveCircles();
      for (const lightCircle of activeCircles) {
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

    // --- Listen for resize ---
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.scrollX = this.config.centerX - gameSize.width / 2;
      this.cameras.main.scrollY = this.config.centerY - gameSize.height / 2;
      this.hudManager.repositionUI(gameSize.width, gameSize.height);
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
        cars: () => this.trafficManager.getCars(),
        cone: this.cone,
      });
    }

    // Initial traffic light draw (subsequent updates are event-driven via phaseChanged)
    this.trafficLightRenderer.draw();

    console.log('[HFD] IntersectionScene created. Manager-based architecture active.');
  }

  update(time: number, delta: number): void {
    if (!this.gameState.isActive()) return;
    if (this.menuManager.getIsPaused()) return;

    // Update systems
    this.gameState.updateTime(delta);
    this.trafficLights.update(delta);
    this.confidenceSystem.update(delta);
    this.fatigueSystem.update(delta);
    this.eventSystem.update(delta);
    this.weatherSystem.update(delta);

    // Update audio systems with current confidence
    const confidence = this.gameState.getState().confidence;
    this.musicSystem.updateConfidence(confidence);
    this.cueSystem.update(confidence, delta);

    // Delegate to traffic manager
    this.trafficManager.updateSpawning(delta);
    this.trafficManager.updateCars(time, delta);

    // Delegate to player controller
    this.playerController.checkConeIntersections();
    this.playerController.updateConeFromFatigue();
    this.playerController.updateRaiseButtonState();

    // Delegate to HUD manager
    this.hudManager.updateUI();

    // Player idle wobble and fatigue visuals
    const state = this.gameState.getState();
    this.player.updateWobble(time, state.isRaised);
    this.player.updateFatigueVisuals(state.armFatigue);

    // Traffic light container idle wobble (1 degree = ~0.01745 rad)
    const trafficLightContainers = this.trafficLightRenderer.getContainers();
    for (let i = 0; i < trafficLightContainers.length; i++) {
      const tlc = trafficLightContainers[i];
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
  // SIGN QUALITY MULTIPLIER (Phase 2)
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
   * Show event banner — Paper cutout card with Bangers font, scissor-cut edges.
   */
  private showEventBannerText(text: string, color: string): void {
    const viewW = this.scale.width;

    const bannerW = Math.min(viewW - 40, 400);
    const bannerH = 44;
    const bannerX = viewW / 2;
    const bannerY = 120;
    const bannerLeft = bannerX - bannerW / 2;
    const bannerTop = bannerY - bannerH / 2;

    const bannerContainer = this.add.container(0, 0);
    bannerContainer.setScrollFactor(0);
    bannerContainer.setDepth(160);

    // Paper shadow
    const shadowGfx = this.add.graphics();
    drawPaperShadow(shadowGfx, bannerLeft, bannerTop, bannerW, bannerH, 2, 2);
    bannerContainer.add(shadowGfx);

    // Scissor-cut cardboard banner
    const bannerGfx = this.add.graphics();
    drawScissorCutRect(bannerGfx, bannerLeft, bannerTop, bannerW, bannerH, PALETTE.cardboard, PALETTE.markerBlack);
    bannerContainer.add(bannerGfx);

    const bannerText = this.add.text(bannerX, bannerY, text, {
      fontFamily: "'Bangers', cursive",
      fontSize: '18px',
      color,
      stroke: '#1a1a1a',
      strokeThickness: 2,
    });
    bannerText.setOrigin(0.5);
    bannerContainer.add(bannerText);

    this.tweens.add({
      targets: bannerContainer,
      y: '-=60',
      alpha: 0,
      duration: 3000,
      delay: 1500,
      ease: 'Quad.easeInOut',
      onComplete: () => bannerContainer.destroy(),
    });
  }

  // ============================================================
  // SESSION END
  // ============================================================

  private showSessionOver(): void {
    // Clean up systems
    this.confidenceSystem.destroy();
    this.fatigueSystem.destroy();
    this.eventSystem.destroy();
    this.weatherSystem.destroy();

    // Clean up audio systems (scene-scoped; mixer persists across scenes via registry)
    if (this.ambientSystem) this.ambientSystem.destroy();
    if (this.musicSystem) this.musicSystem.destroy();
    if (this.cueSystem) this.cueSystem.destroy();

    // Clean up managers
    this.trafficManager.destroy();
    this.playerController.destroy();
    this.menuManager.destroy();

    // Transition to score scene after delay
    this.time.delayedCall(1500, () => {
      this.scene.start('ScoreScene');
    });
  }
}
