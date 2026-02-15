import Phaser from 'phaser';
import type { EventSystem } from './EventSystem';
import type { EventType } from '../config/eventConfig';

/**
 * DevControls — Centralized dev-only keyboard controls for gameplay tuning.
 *
 * Only instantiated when import.meta.env.DEV is true.
 * Provides:
 * - Speed control ([ and ] to cycle speed: 0.25x, 0.5x, 1x, 2x)
 * - Pause/step (P to pause, N to advance one frame)
 * - Event force triggers (1=copCheck, 2=weather, 3=karma)
 * - Quick restart (R)
 *
 * All controls log to console with [HFD-DEV] prefix.
 */
export class DevControls {
  private scene: Phaser.Scene;
  private eventSystem: EventSystem;
  private getSpeedMultiplier: () => number;
  private setSpeedMultiplier: (v: number) => void;
  private setPaused: (v: boolean) => void;
  private getPaused: () => boolean;
  private stepFrame: () => void;
  private restartScene: () => void;

  // Public property so DebugOverlay can read it
  public lastTriggeredEvent: string = '';

  // Available speed values for cycling
  private readonly speedValues = [0.25, 0.5, 1, 2];

  constructor(
    scene: Phaser.Scene,
    eventSystem: EventSystem,
    getSpeedMultiplier: () => number,
    setSpeedMultiplier: (v: number) => void,
    setPaused: (v: boolean) => void,
    getPaused: () => boolean,
    stepFrame: () => void,
    restartScene: () => void,
  ) {
    this.scene = scene;
    this.eventSystem = eventSystem;
    this.getSpeedMultiplier = getSpeedMultiplier;
    this.setSpeedMultiplier = setSpeedMultiplier;
    this.setPaused = setPaused;
    this.getPaused = getPaused;
    this.stepFrame = stepFrame;
    this.restartScene = restartScene;

    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      // Speed controls
      if (event.key === '[') {
        this.cycleSpeed(-1);
      } else if (event.key === ']') {
        this.cycleSpeed(1);
      }

      // Pause/step controls
      else if (event.key === 'p' || event.key === 'P') {
        const newPaused = !this.getPaused();
        this.setPaused(newPaused);
        console.log(`[HFD-DEV] ${newPaused ? 'Paused' : 'Resumed'}`);
      } else if (event.key === 'n' || event.key === 'N') {
        if (this.getPaused()) {
          this.stepFrame();
          console.log('[HFD-DEV] Step frame');
        }
      }

      // Event force triggers
      else if (event.key === '1') {
        this.forceTriggerEvent('copCheck');
      } else if (event.key === '2') {
        this.forceTriggerEvent('weather');
      } else if (event.key === '3') {
        this.forceTriggerEvent('karma');
      }

      // Quick restart
      else if (event.key === 'r' || event.key === 'R') {
        console.log('[HFD-DEV] Restarting scene');
        this.restartScene();
      }
    });
  }

  private cycleSpeed(direction: -1 | 1): void {
    const current = this.getSpeedMultiplier();
    const currentIndex = this.speedValues.indexOf(current);

    if (currentIndex === -1) {
      // Current speed not in list, snap to nearest
      this.setSpeedMultiplier(1);
      console.log('[HFD-DEV] Speed: 1x');
      return;
    }

    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= this.speedValues.length) {
      // Clamp at ends
      return;
    }

    const newSpeed = this.speedValues[newIndex];
    this.setSpeedMultiplier(newSpeed);
    console.log(`[HFD-DEV] Speed: ${newSpeed}x`);
  }

  private forceTriggerEvent(type: EventType): void {
    this.eventSystem.forceTrigger(type);
    this.lastTriggeredEvent = type;
  }

  destroy(): void {
    this.scene.input.keyboard?.removeAllListeners('keydown');
  }
}
