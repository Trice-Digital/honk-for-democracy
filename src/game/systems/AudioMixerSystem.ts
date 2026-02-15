/**
 * AudioMixerSystem — Master mixer with per-layer gain control via Tone.js.
 *
 * Provides independent volume control for 4 audio layers:
 *   - ambient: street noise, environmental sounds
 *   - music: confidence-reactive background music
 *   - cues: reactive audio cues (organ stingers, cowbell, etc.)
 *   - sfx: existing reaction sounds and game event SFX
 *
 * All layers feed into a master gain node connected to Tone.js destination.
 * Registered in Phaser registry for cross-scene access (same pattern as AudioSystem).
 */

import * as Tone from 'tone';

export type AudioLayer = 'ambient' | 'music' | 'cues' | 'sfx';

/** Default volume levels per layer (in dB) */
const DEFAULT_VOLUMES: Record<AudioLayer, number> = {
  ambient: -16,
  music: -14,
  cues: -12,
  sfx: -10,
};

export class AudioMixerSystem {
  private masterGain: Tone.Gain;
  private layerGains: Record<AudioLayer, Tone.Gain>;
  private layerMuted: Record<AudioLayer, boolean>;
  private layerVolumes: Record<AudioLayer, number>;
  private masterMuted: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Create master gain node
    this.masterGain = new Tone.Gain(1);
    this.masterGain.connect(Tone.getDestination());

    // Create per-layer gain nodes with default volumes
    this.layerGains = {} as Record<AudioLayer, Tone.Gain>;
    this.layerMuted = {} as Record<AudioLayer, boolean>;
    this.layerVolumes = {} as Record<AudioLayer, number>;

    const layers: AudioLayer[] = ['ambient', 'music', 'cues', 'sfx'];
    for (const layer of layers) {
      const gain = new Tone.Gain();
      gain.gain.value = Tone.dbToGain(DEFAULT_VOLUMES[layer]);
      gain.connect(this.masterGain);
      this.layerGains[layer] = gain;
      this.layerMuted[layer] = false;
      this.layerVolumes[layer] = DEFAULT_VOLUMES[layer];
    }
  }

  /**
   * Initialize Tone.js audio context. Must be called from a user gesture handler.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.initialized = true;
  }

  /**
   * Check if the mixer has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================================
  // LAYER VOLUME CONTROL
  // ============================================================

  /**
   * Set volume for a specific layer in dB.
   */
  setLayerVolume(layer: AudioLayer, dB: number): void {
    this.layerVolumes[layer] = dB;
    if (!this.layerMuted[layer]) {
      this.layerGains[layer].gain.rampTo(Tone.dbToGain(dB), 0.05);
    }
  }

  /**
   * Get current volume for a layer in dB.
   */
  getLayerVolume(layer: AudioLayer): number {
    return this.layerVolumes[layer];
  }

  /**
   * Mute a specific layer.
   */
  muteLayer(layer: AudioLayer): void {
    this.layerMuted[layer] = true;
    this.layerGains[layer].gain.rampTo(0, 0.05);
  }

  /**
   * Unmute a specific layer, restoring its previous volume.
   */
  unmuteLayer(layer: AudioLayer): void {
    this.layerMuted[layer] = false;
    this.layerGains[layer].gain.rampTo(
      Tone.dbToGain(this.layerVolumes[layer]),
      0.05
    );
  }

  /**
   * Check if a layer is muted.
   */
  isLayerMuted(layer: AudioLayer): boolean {
    return this.layerMuted[layer];
  }

  // ============================================================
  // MASTER VOLUME CONTROL
  // ============================================================

  /**
   * Set master mute state. Mutes/unmutes all layers at once.
   */
  setMasterMute(muted: boolean): void {
    this.masterMuted = muted;
    this.masterGain.gain.rampTo(muted ? 0 : 1, 0.05);
  }

  /**
   * Get master mute state.
   */
  getMasterMute(): boolean {
    return this.masterMuted;
  }

  // ============================================================
  // CONNECTION POINTS
  // ============================================================

  /**
   * Get the SFX layer's Tone.js Gain node.
   * Other systems can connect their output to this node to route through the mixer.
   */
  getSfxDestination(): Tone.Gain {
    return this.layerGains.sfx;
  }

  /**
   * Get a layer's raw Tone.js Gain node for direct connection.
   */
  getLayerGain(layer: AudioLayer): Tone.Gain {
    return this.layerGains[layer];
  }

  // ============================================================
  // REGISTRY HELPERS
  // ============================================================

  static register(scene: Phaser.Scene, mixer: AudioMixerSystem): void {
    scene.registry.set('audioMixerSystem', mixer);
  }

  static get(scene: Phaser.Scene): AudioMixerSystem | null {
    return (scene.registry.get('audioMixerSystem') as AudioMixerSystem) ?? null;
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  /**
   * Dispose all Tone.js nodes and clean up.
   */
  destroy(): void {
    const layers: AudioLayer[] = ['ambient', 'music', 'cues', 'sfx'];
    for (const layer of layers) {
      this.layerGains[layer].dispose();
    }
    this.masterGain.dispose();
    this.initialized = false;
  }
}
