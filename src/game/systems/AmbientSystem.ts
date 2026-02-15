/**
 * AmbientSystem — Continuous ambient street noise using Tone.js.
 *
 * Produces brown noise filtered to sound like distant street traffic
 * with subtle variation from a slow AutoFilter sweep. Does NOT connect
 * to destination directly — exposes connectTo() for the mixer to wire.
 *
 * Chain: Noise -> Filter (lowpass) -> AutoFilter (slow sweep) -> Gain
 *
 * Registered in Phaser registry for cross-scene access.
 */

import { Noise, Filter, AutoFilter, Gain, type InputNode } from 'tone';
import { AUDIO_CONFIG } from '../config/audioConfig';

export class AmbientSystem {
  private noise: Noise;
  private filter: Filter;
  private autoFilter: AutoFilter;
  private gain: Gain;
  private isPlaying: boolean = false;

  constructor() {
    const cfg = AUDIO_CONFIG.ambient;

    // Brown noise source — low rumble, street-like
    this.noise = new Noise({ type: cfg.noiseType });

    // Lowpass filter — cuts high frequencies for distant traffic feel
    this.filter = new Filter({
      frequency: cfg.filterFrequency,
      type: 'lowpass',
      Q: cfg.filterQ,
    });

    // Slow AutoFilter — adds subtle breathing variation so it's not static
    this.autoFilter = new AutoFilter({
      frequency: cfg.autoFilterFrequency,
      baseFrequency: cfg.autoFilterBaseFreq,
      octaves: cfg.autoFilterOctaves,
    });

    // Output gain — starts at 0 for fade-in
    this.gain = new Gain({ gain: 0 });

    // Wire the chain: noise -> filter -> autoFilter -> gain
    this.noise.connect(this.filter);
    this.filter.connect(this.autoFilter);
    this.autoFilter.connect(this.gain);
    // gain is NOT connected to destination — connectTo() handles that
  }

  /**
   * Connect the ambient output to a destination node (e.g., mixer channel).
   */
  connectTo(destination: InputNode): void {
    this.gain.connect(destination);
  }

  /**
   * Start ambient noise with fade-in.
   */
  start(): void {
    if (this.isPlaying) return;

    const cfg = AUDIO_CONFIG.ambient;

    this.noise.start();
    this.autoFilter.start();
    this.gain.gain.rampTo(1, cfg.fadeInTime);
    this.isPlaying = true;
  }

  /**
   * Stop ambient noise with fade-out, then stop source.
   */
  stop(): void {
    if (!this.isPlaying) return;

    const cfg = AUDIO_CONFIG.ambient;
    const fadeOut = cfg.fadeOutTime;

    this.gain.gain.rampTo(0, fadeOut);

    // Stop noise source after fade-out completes
    setTimeout(() => {
      this.noise.stop();
      this.autoFilter.stop();
      this.isPlaying = false;
    }, fadeOut * 1000);
  }

  /**
   * Set the ambient output volume in dB.
   */
  setVolume(dB: number): void {
    this.gain.gain.rampTo(Math.pow(10, dB / 20), 0.1);
  }

  /**
   * Whether the ambient system is currently playing.
   */
  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Dispose all Tone.js nodes and free resources.
   */
  destroy(): void {
    if (this.isPlaying) {
      this.noise.stop();
      this.autoFilter.stop();
      this.isPlaying = false;
    }

    this.noise.dispose();
    this.filter.dispose();
    this.autoFilter.dispose();
    this.gain.dispose();
  }

  // --- Phaser Registry Pattern ---

  /**
   * Register this system in a Phaser scene registry.
   */
  static register(scene: Phaser.Scene, system: AmbientSystem): void {
    scene.registry.set('ambientSystem', system);
  }

  /**
   * Retrieve the AmbientSystem from a Phaser scene registry.
   */
  static get(scene: Phaser.Scene): AmbientSystem | undefined {
    return scene.registry.get('ambientSystem') as AmbientSystem | undefined;
  }
}
