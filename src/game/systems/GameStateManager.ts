import Phaser from 'phaser';
import type { DifficultyConfig } from '../config/difficultyConfig';
import { DIFFICULTY_MEDIUM } from '../config/difficultyConfig';
import { CONFIDENCE_DEFAULTS } from '../config/confidenceConfig';

/**
 * GameStateManager — Single source of truth for all game state.
 *
 * All systems read/write here. Changes emit events so UI and other
 * systems can react. Registered in Phaser's registry for cross-scene access.
 *
 * @stateAccess Source of truth. Exposes getState() (full readonly snapshot) and individual getters (getElapsed(), getConfidence(), etc). Other systems use whichever is convenient.
 */

export interface ReactionTally {
  wave: number;
  honk: number;
  bananas: number;
  peace: number;
  nothing: number;
  stare: number;
  thumbsdown: number;
  finger: number;
  yell: number;
  coalroller: number;
}

export interface GameState {
  score: number;
  timeRemaining: number;
  sessionDuration: number;
  carsReached: number;
  carsMissed: number;
  reactions: ReactionTally;
  isSessionActive: boolean;

  // Phase 4: Confidence
  confidence: number;
  lastReactionTime: number;
  groupSize: number;

  // Phase 4: Arm Fatigue
  armFatigue: number;
  activeArm: 'left' | 'right';
  isResting: boolean;
  isRaised: boolean;

  // Session end reason
  endReason: 'time' | 'confidence' | null;

  // Phase 5: Events
  weatherState: 'clear' | 'rain';
  signDegradation: number;
  eventsTriggered: string[];
}

function createInitialState(sessionDuration: number): GameState {
  return {
    score: 0,
    timeRemaining: sessionDuration,
    sessionDuration,
    carsReached: 0,
    carsMissed: 0,
    reactions: {
      wave: 0, honk: 0, bananas: 0, peace: 0,
      nothing: 0, stare: 0,
      thumbsdown: 0, finger: 0, yell: 0, coalroller: 0,
    },
    isSessionActive: true,

    // Phase 4
    confidence: CONFIDENCE_DEFAULTS.startingConfidence,
    lastReactionTime: 0,
    groupSize: CONFIDENCE_DEFAULTS.defaultGroupSize,

    armFatigue: 0,
    activeArm: 'right',
    isResting: false,
    isRaised: false,

    endReason: null,

    // Phase 5
    weatherState: 'clear',
    signDegradation: 0,
    eventsTriggered: [],
  };
}

export class GameStateManager extends Phaser.Events.EventEmitter {
  private state: GameState;
  private difficulty: DifficultyConfig;
  /** Elapsed session time in seconds (for tracking lastReactionTime) */
  private elapsed: number = 0;

  constructor(sessionDuration: number, difficulty?: DifficultyConfig) {
    super();
    this.difficulty = difficulty ?? DIFFICULTY_MEDIUM;
    this.state = createInitialState(sessionDuration);
  }

  /** Read-only access to full state */
  getState(): Readonly<GameState> {
    return this.state;
  }

  getDifficulty(): Readonly<DifficultyConfig> {
    return this.difficulty;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  addScore(value: number): void {
    this.state.score += value;
    this.emit('scoreChanged', this.state.score, value);
  }

  recordReaction(reactionId: string, scoreValue: number): void {
    if (reactionId in this.state.reactions) {
      this.state.reactions[reactionId as keyof ReactionTally]++;
    }
    this.state.carsReached++;
    this.addScore(scoreValue);
    this.state.lastReactionTime = this.elapsed;
    this.emit('reaction', { reactionId, scoreValue });
  }

  recordMissedCar(): void {
    this.state.carsMissed++;
    this.emit('carMissed', this.state.carsMissed);
  }

  updateTime(delta: number): void {
    if (!this.state.isSessionActive) return;

    const deltaSec = delta / 1000;
    this.elapsed += deltaSec;

    this.state.timeRemaining -= deltaSec;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.isSessionActive = false;
      this.state.endReason = 'time';
      this.emit('sessionEnd', this.state);
    }
    this.emit('timeChanged', this.state.timeRemaining);
  }

  // ============================================================
  // CONFIDENCE (Phase 4)
  // ============================================================

  addConfidence(value: number): void {
    const prev = this.state.confidence;
    this.state.confidence = Math.max(
      CONFIDENCE_DEFAULTS.min,
      Math.min(CONFIDENCE_DEFAULTS.max, this.state.confidence + value),
    );
    if (this.state.confidence !== prev) {
      this.emit('confidenceChanged', this.state.confidence, value);
    }
    if (this.state.confidence <= CONFIDENCE_DEFAULTS.min && this.state.isSessionActive) {
      this.state.isSessionActive = false;
      this.state.endReason = 'confidence';
      this.emit('confidenceZero');
      this.emit('sessionEnd', this.state);
    }
  }

  getConfidenceFloor(): number {
    return this.state.groupSize * CONFIDENCE_DEFAULTS.groupSizeFloorBonus;
  }

  getTimeSinceLastReaction(): number {
    return this.elapsed - this.state.lastReactionTime;
  }

  setGroupSize(size: number): void {
    this.state.groupSize = Math.max(0, size);
    this.emit('groupSizeChanged', this.state.groupSize);
  }

  // ============================================================
  // WEATHER / EVENTS (Phase 5)
  // ============================================================

  setWeatherState(weather: 'clear' | 'rain'): void {
    if (this.state.weatherState === weather) return;
    this.state.weatherState = weather;
    this.emit('weatherStateChanged', weather);
  }

  setSignDegradation(value: number): void {
    this.state.signDegradation = Math.max(0, Math.min(1, value));
    this.emit('signDegradationChanged', this.state.signDegradation);
  }

  recordEvent(eventType: string): void {
    this.state.eventsTriggered.push(eventType);
  }

  // ============================================================
  // ARM FATIGUE (Phase 4)
  // ============================================================

  setArmFatigue(value: number): void {
    const prev = this.state.armFatigue;
    this.state.armFatigue = Math.max(0, Math.min(100, value));
    if (this.state.armFatigue !== prev) {
      this.emit('fatigueChanged', this.state.armFatigue);
    }
    if (this.state.armFatigue >= 100 && prev < 100) {
      this.emit('fatigueMaxed');
    }
  }

  switchArm(): void {
    this.state.activeArm = this.state.activeArm === 'left' ? 'right' : 'left';
    this.emit('armSwitched', this.state.activeArm);
  }

  setResting(resting: boolean): void {
    if (this.state.isResting === resting) return;
    this.state.isResting = resting;
    // Can't be raised while resting
    if (resting && this.state.isRaised) {
      this.state.isRaised = false;
      this.emit('signLowered');
    }
    this.emit(resting ? 'restStarted' : 'restEnded');
  }

  setRaised(raised: boolean): void {
    if (this.state.isRaised === raised) return;
    // Can't raise while resting
    if (raised && this.state.isResting) return;
    this.state.isRaised = raised;
    this.emit(raised ? 'signRaised' : 'signLowered');
  }

  // ============================================================
  // GENERAL
  // ============================================================

  isActive(): boolean {
    return this.state.isSessionActive;
  }

  reset(): void {
    this.state = createInitialState(this.state.sessionDuration);
    this.elapsed = 0;
    this.emit('stateReset');
  }

  /** Register in a Phaser scene's registry for cross-scene access */
  static register(scene: Phaser.Scene, manager: GameStateManager): void {
    scene.registry.set('gameState', manager);
  }

  static get(scene: Phaser.Scene): GameStateManager {
    return scene.registry.get('gameState') as GameStateManager;
  }
}
