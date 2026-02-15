import Phaser from 'phaser';
import type { GameStateManager } from './GameStateManager';
import type { TrafficLightSystem } from './TrafficLightSystem';
import type { ConfidenceSystem } from './ConfidenceSystem';
import type { FatigueSystem } from './FatigueSystem';
import type { EventSystem } from './EventSystem';
import type { WeatherSystem } from './WeatherSystem';
import type { Car } from '../entities/Car';
import type { VisibilityCone } from '../entities/VisibilityCone';
import { CONFIDENCE_DEFAULTS } from '../config/confidenceConfig';
import { FATIGUE_DEFAULTS } from '../config/fatigueConfig';
import { EVENT_SCHEDULE_DEFAULTS } from '../config/eventConfig';

/**
 * DebugOverlay — Dev-only real-time system monitor and tuning panel.
 *
 * Toggle with backtick (`) or D key.
 * Shows all live system values. Provides slider controls for hot-tuning
 * key config values without rebuilding.
 *
 * Only instantiated when import.meta.env.DEV is true.
 */

interface DebugSystems {
  gameState: GameStateManager;
  trafficLights: TrafficLightSystem;
  confidenceSystem: ConfidenceSystem;
  fatigueSystem: FatigueSystem;
  eventSystem: EventSystem;
  weatherSystem: WeatherSystem;
  cars: () => Car[];
  cone: VisibilityCone;
}

interface TunableValue {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  getValue: () => number;
  setValue: (v: number) => void;
}

export class DebugOverlay {
  private scene: Phaser.Scene;
  private systems: DebugSystems;
  private visible: boolean = false;

  // DOM elements
  private container: HTMLDivElement | null = null;
  private valuesDiv: HTMLDivElement | null = null;
  private slidersDiv: HTMLDivElement | null = null;

  // Tunable values with live references
  private tunables: TunableValue[] = [];

  // FPS tracking
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 60;

  constructor(scene: Phaser.Scene, systems: DebugSystems) {
    this.scene = scene;
    this.systems = systems;

    this.setupTunables();
    this.createDOM();
    this.setupKeyboardToggle();
  }

  private setupTunables(): void {
    this.tunables = [
      {
        label: 'Confidence Gain/Loss Mult',
        key: 'confMult',
        min: 0.1,
        max: 3.0,
        step: 0.1,
        getValue: () => CONFIDENCE_DEFAULTS.reactionToConfidenceMultiplier,
        setValue: (v: number) => {
          (CONFIDENCE_DEFAULTS as any).reactionToConfidenceMultiplier = v;
        },
      },
      {
        label: 'Confidence No-Reaction Drain',
        key: 'confDrain',
        min: 0,
        max: 5.0,
        step: 0.1,
        getValue: () => CONFIDENCE_DEFAULTS.noReactionDrainRate,
        setValue: (v: number) => {
          (CONFIDENCE_DEFAULTS as any).noReactionDrainRate = v;
        },
      },
      {
        label: 'Fatigue Base Drain Rate',
        key: 'fatDrain',
        min: 0,
        max: 8.0,
        step: 0.2,
        getValue: () => FATIGUE_DEFAULTS.baseDrainRate,
        setValue: (v: number) => {
          (FATIGUE_DEFAULTS as any).baseDrainRate = v;
        },
      },
      {
        label: 'Event Trigger Chance/sec',
        key: 'eventFreq',
        min: 0,
        max: 0.2,
        step: 0.005,
        getValue: () => EVENT_SCHEDULE_DEFAULTS.baseTriggerChancePerSecond,
        setValue: (v: number) => {
          (EVENT_SCHEDULE_DEFAULTS as any).baseTriggerChancePerSecond = v;
        },
      },
      {
        label: 'Fatigue Raise Drain Rate',
        key: 'raiseDrain',
        min: 0,
        max: 15.0,
        step: 0.5,
        getValue: () => FATIGUE_DEFAULTS.raiseDrainRate,
        setValue: (v: number) => {
          (FATIGUE_DEFAULTS as any).raiseDrainRate = v;
        },
      },
    ];
  }

  private createDOM(): void {
    // Create the overlay container as a DOM element over the game canvas
    this.container = document.createElement('div');
    this.container.id = 'hfd-debug-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      max-height: 100vh;
      overflow-y: auto;
      background: rgba(10, 10, 20, 0.88);
      color: #e0e0e0;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.5;
      padding: 10px 12px;
      z-index: 10000;
      pointer-events: auto;
      border-left: 2px solid rgba(251, 191, 36, 0.4);
      display: none;
      user-select: text;
      -webkit-user-select: text;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'font-size: 13px; font-weight: bold; color: #fbbf24; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;';
    header.textContent = 'DEBUG OVERLAY [` or D to toggle]';
    this.container.appendChild(header);

    // Values section
    this.valuesDiv = document.createElement('div');
    this.valuesDiv.style.cssText = 'margin-bottom: 12px;';
    this.container.appendChild(this.valuesDiv);

    // Sliders section
    const sliderHeader = document.createElement('div');
    sliderHeader.style.cssText = 'font-size: 12px; font-weight: bold; color: #3b82f6; margin-bottom: 6px; border-top: 1px solid #333; padding-top: 8px;';
    sliderHeader.textContent = 'HOT TUNE';
    this.container.appendChild(sliderHeader);

    this.slidersDiv = document.createElement('div');
    this.container.appendChild(this.slidersDiv);

    // Create slider controls
    for (const t of this.tunables) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom: 6px;';

      const label = document.createElement('div');
      label.style.cssText = 'color: #9ca3af; font-size: 10px;';
      label.textContent = t.label;

      const sliderRow = document.createElement('div');
      sliderRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(t.min);
      slider.max = String(t.max);
      slider.step = String(t.step);
      slider.value = String(t.getValue());
      slider.style.cssText = 'flex: 1; height: 14px; accent-color: #3b82f6; cursor: pointer;';

      const valueLabel = document.createElement('span');
      valueLabel.style.cssText = 'color: #fbbf24; min-width: 40px; text-align: right; font-size: 11px;';
      valueLabel.textContent = t.getValue().toFixed(2);
      valueLabel.id = `hfd-tune-${t.key}`;

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        t.setValue(val);
        valueLabel.textContent = val.toFixed(t.step < 0.01 ? 3 : 2);
      });

      sliderRow.appendChild(slider);
      sliderRow.appendChild(valueLabel);
      row.appendChild(label);
      row.appendChild(sliderRow);
      this.slidersDiv.appendChild(row);
    }

    // Append to document body
    document.body.appendChild(this.container);
  }

  private setupKeyboardToggle(): void {
    this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === '`' || event.key === 'd' || event.key === 'D') {
        this.toggle();
      }
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.container) {
      this.container.style.display = this.visible ? 'block' : 'none';
    }
  }

  show(): void {
    this.visible = true;
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  hide(): void {
    this.visible = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Called every frame from IntersectionScene.update().
   * Updates all displayed values.
   */
  update(delta: number): void {
    if (!this.visible || !this.valuesDiv) return;

    // FPS calculation
    this.fpsAccumulator += delta;
    this.frameCount++;
    if (this.fpsAccumulator >= 500) {
      this.currentFps = Math.round((this.frameCount / this.fpsAccumulator) * 1000);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    const gs = this.systems.gameState;
    const state = gs.getState();
    const difficulty = gs.getDifficulty();
    const elapsed = gs.getElapsed();
    const cars = this.systems.cars();
    const lightState = this.systems.trafficLights.getState();
    const weather = this.systems.weatherSystem;
    const events = this.systems.eventSystem;
    const fatigueSys = this.systems.fatigueSystem;

    const confFloor = gs.getConfidenceFloor();
    const timeSinceReaction = gs.getTimeSinceLastReaction();
    const coneWidth = fatigueSys.getConeWidth();
    const visFactor = fatigueSys.getVisibilityFactor();

    // Build values display
    const lines: string[] = [];

    // Performance
    lines.push(this.section('PERFORMANCE'));
    lines.push(this.row('FPS', `${this.currentFps}`));

    // Session
    lines.push(this.section('SESSION'));
    lines.push(this.row('Score', `${state.score}`));
    lines.push(this.row('Time Left', `${state.timeRemaining.toFixed(1)}s`));
    lines.push(this.row('Elapsed', `${elapsed.toFixed(1)}s`));
    lines.push(this.row('Active', `${state.isSessionActive}`));
    lines.push(this.row('End Reason', `${state.endReason ?? 'n/a'}`));
    lines.push(this.row('Difficulty', `${difficulty.label}`));

    // Confidence
    lines.push(this.section('CONFIDENCE'));
    lines.push(this.row('Value', `${state.confidence.toFixed(1)}%`));
    lines.push(this.row('Floor', `${confFloor.toFixed(1)}%`));
    lines.push(this.row('Group Size', `${state.groupSize}`));
    lines.push(this.row('Time Since Rxn', `${timeSinceReaction.toFixed(1)}s`));
    lines.push(this.row('Drain Active', `${timeSinceReaction > CONFIDENCE_DEFAULTS.noDrainGracePeriod ? 'YES' : 'no'}`));

    // Fatigue
    lines.push(this.section('FATIGUE'));
    lines.push(this.row('Value', `${state.armFatigue.toFixed(1)}%`));
    lines.push(this.row('Active Arm', state.activeArm));
    lines.push(this.row('Resting', `${state.isResting}`));
    lines.push(this.row('Raised', `${state.isRaised}`));
    lines.push(this.row('Switch Cooldown', `${fatigueSys.getSwitchCooldownRemaining().toFixed(1)}s`));

    // Visibility Cone
    lines.push(this.section('CONE'));
    lines.push(this.row('Width', `${coneWidth.toFixed(1)} deg`));
    lines.push(this.row('Vis Factor', `${visFactor.toFixed(2)}`));

    // Weather
    lines.push(this.section('WEATHER'));
    lines.push(this.row('State', state.weatherState));
    lines.push(this.row('Sign Degrade', `${(state.signDegradation * 100).toFixed(1)}%`));
    lines.push(this.row('Rain Timer', `${weather.getRainTimeRemaining().toFixed(1)}s`));

    // Events
    lines.push(this.section('EVENTS'));
    lines.push(this.row('State', events.getEventState()));
    lines.push(this.row('Triggered', events.getEventsTriggered().join(', ') || 'none'));
    lines.push(this.row('In Progress', `${events.isEventInProgress()}`));

    // Traffic
    lines.push(this.section('TRAFFIC'));
    lines.push(this.row('Active Cars', `${cars.filter(c => c.active).length}`));
    lines.push(this.row('Total Spawned', `${state.carsReached + state.carsMissed}`));
    lines.push(this.row('Light Phase', `${lightState.currentPhaseIndex} (${lightState.currentPhase.greenDirections.join(',') || 'all-red'})`));
    lines.push(this.row('Phase Timer', `${(lightState.timeInPhase / 1000).toFixed(1)}s`));

    // Reactions summary
    lines.push(this.section('REACTIONS'));
    lines.push(this.row('Reached', `${state.carsReached}`));
    lines.push(this.row('Missed', `${state.carsMissed}`));

    this.valuesDiv.innerHTML = lines.join('');

    // Update slider value labels (in case external code changed the config)
    for (const t of this.tunables) {
      const el = document.getElementById(`hfd-tune-${t.key}`);
      if (el) {
        el.textContent = t.getValue().toFixed(t.step < 0.01 ? 3 : 2);
      }
    }
  }

  private section(title: string): string {
    return `<div style="color:#3b82f6;font-weight:bold;margin-top:6px;font-size:10px;letter-spacing:0.1em;">${title}</div>`;
  }

  private row(label: string, value: string): string {
    return `<div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">${label}</span><span style="color:#e5e7eb;">${value}</span></div>`;
  }

  destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.valuesDiv = null;
    this.slidersDiv = null;
  }
}
