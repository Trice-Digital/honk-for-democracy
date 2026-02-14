import Phaser from 'phaser';
import type { LightPhase, TrafficDirection, IntersectionMapConfig } from '../config/intersectionConfig';

/**
 * TrafficLightSystem — Data-driven traffic light cycle.
 *
 * Reads light cycle config, advances phases on timer,
 * emits events on phase changes. Systems query current state.
 */

export interface TrafficLightState {
  /** Current phase index in the cycle */
  currentPhaseIndex: number;
  /** Current phase definition */
  currentPhase: LightPhase;
  /** Time remaining in current phase (ms) */
  timeInPhase: number;
  /** Phase progress 0-1 */
  phaseProgress: number;
}

export class TrafficLightSystem extends Phaser.Events.EventEmitter {
  private phases: LightPhase[];
  private currentPhaseIndex: number = 0;
  private phaseTimer: number = 0;
  private durationMultiplier: number;

  constructor(config: IntersectionMapConfig, durationMultiplier: number = 1.0) {
    super();
    this.phases = config.lightCycle;
    this.durationMultiplier = durationMultiplier;
    this.phaseTimer = this.getCurrentPhaseDuration();
  }

  private getCurrentPhaseDuration(): number {
    return this.phases[this.currentPhaseIndex].duration * this.durationMultiplier;
  }

  update(delta: number): void {
    this.phaseTimer -= delta;

    if (this.phaseTimer <= 0) {
      this.advancePhase();
    }
  }

  private advancePhase(): void {
    this.currentPhaseIndex = (this.currentPhaseIndex + 1) % this.phases.length;
    this.phaseTimer = this.getCurrentPhaseDuration();
    this.emit('phaseChanged', this.getState());
  }

  getState(): TrafficLightState {
    const duration = this.getCurrentPhaseDuration();
    return {
      currentPhaseIndex: this.currentPhaseIndex,
      currentPhase: this.phases[this.currentPhaseIndex],
      timeInPhase: this.phaseTimer,
      phaseProgress: 1 - (this.phaseTimer / duration),
    };
  }

  /** Check if a direction currently has green */
  isGreen(direction: TrafficDirection): boolean {
    return this.phases[this.currentPhaseIndex].greenDirections.includes(direction);
  }

  /** Check if a direction has yellow (green phase near end) */
  isYellow(direction: TrafficDirection): boolean {
    const phase = this.phases[this.currentPhaseIndex];
    if (!phase.greenDirections.includes(direction)) return false;
    // Yellow in last 20% of green phase
    const duration = this.getCurrentPhaseDuration();
    return this.phaseTimer < duration * 0.2;
  }

  /** Get the light color for a direction */
  getLightColor(direction: TrafficDirection): 'green' | 'yellow' | 'red' {
    if (this.isYellow(direction)) return 'yellow';
    if (this.isGreen(direction)) return 'green';
    return 'red';
  }

  /** Get all directions that currently have green */
  getGreenDirections(): TrafficDirection[] {
    return this.phases[this.currentPhaseIndex].greenDirections;
  }
}
