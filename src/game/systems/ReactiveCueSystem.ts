/**
 * ReactiveCueSystem — Stadium crowd audio cues triggered at confidence thresholds.
 *
 * Fires punctuation sounds at confidence threshold crossings:
 *   - Organ stinger: Triumphant chord hit on crossing HIGH threshold upward
 *   - Stomp-stomp-clap: "We Will Rock You" pattern on crossing MID threshold upward
 *   - Cowbell: Rhythmic burst at HIGH confidence (periodic)
 *   - Snare roll: Crescendo on crossing HIGH threshold upward
 *   - Tension drone: Low droning note when confidence drops below LOW threshold
 *
 * All sounds are procedural via Tone.js — no audio files.
 * Uses threshold CROSSING detection (not just "above threshold") to prevent
 * cues firing every frame. Cooldown prevents spamming.
 *
 * Does NOT connect to destination directly — exposes connectTo() for mixer wiring.
 * Registered in Phaser registry for cross-scene access.
 *
 * @stateAccess Receives confidence value via update(confidence, delta) method. Does not read GameStateManager directly.
 */

import {
  FMSynth,
  NoiseSynth,
  MetalSynth,
  Gain,
  getTransport,
  type InputNode,
} from 'tone';
import { AUDIO_CONFIG } from '../config/audioConfig';

export class ReactiveCueSystem {
  // Output
  private gain: Gain;

  // Synth instances for each cue type
  private organSynth: FMSynth;
  private stompSynth: NoiseSynth;
  private clapSynth: NoiseSynth;
  private cowbellSynth: MetalSynth;
  private snareSynth: NoiseSynth;
  private droneSynth: FMSynth;

  // State tracking
  private currentConfidence: number = 50;
  private previousConfidence: number = 50;
  private lastCueTime: number = 0;
  private isDroning: boolean = false;
  private lastCowbellTime: number = 0;

  constructor() {
    // Output gain — volume managed by mixer layer
    this.gain = new Gain({ gain: 1 });

    // Organ stinger: bright FM chord hit
    this.organSynth = new FMSynth({
      harmonicity: 4,
      modulationIndex: 12,
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.1,
        release: 0.6,
      },
      modulation: { type: 'square' },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.2,
        release: 0.3,
      },
    });
    this.organSynth.connect(this.gain);

    // Stomp: low noise thud
    this.stompSynth = new NoiseSynth({
      noise: { type: 'brown' },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.05,
      },
    });
    this.stompSynth.connect(this.gain);

    // Clap: bright noise crack
    this.clapSynth = new NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0,
        release: 0.03,
      },
    });
    this.clapSynth.connect(this.gain);

    // Cowbell: metallic hit
    this.cowbellSynth = new MetalSynth({
      frequency: 800,
      envelope: {
        attack: 0.001,
        decay: 0.1,
        release: 0.05,
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    });
    this.cowbellSynth.connect(this.gain);

    // Snare: highpass noise for rolls
    this.snareSynth = new NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.05,
      },
    });
    this.snareSynth.connect(this.gain);

    // Tension drone: low rumbling FM note
    this.droneSynth = new FMSynth({
      harmonicity: 1.5,
      modulationIndex: 5,
      envelope: {
        attack: 1.0,
        decay: 0.5,
        sustain: 0.8,
        release: 2.0,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.5,
        decay: 0.3,
        sustain: 0.6,
        release: 1.0,
      },
    });
    this.droneSynth.connect(this.gain);
  }

  /**
   * Connect the cue output to a destination node (e.g., mixer cues channel).
   */
  connectTo(destination: InputNode): void {
    this.gain.connect(destination);
  }

  /**
   * Called each frame. Checks confidence threshold crossings and triggers cues.
   */
  update(confidence: number, deltaMs: number): void {
    const clamped = Math.max(0, Math.min(100, confidence));
    this.previousConfidence = this.currentConfidence;
    this.currentConfidence = clamped;

    const cfg = AUDIO_CONFIG.cues;
    const now = Date.now();

    // --- Tension drone: continuous while below low threshold ---
    if (this.crossedBelow(cfg.lowConfidenceCue)) {
      this.startTensionDrone();
    }
    if (this.crossedAbove(cfg.lowConfidenceCue) && this.isDroning) {
      this.stopTensionDrone();
    }

    // --- Threshold crossing cues (with cooldown) ---
    const cooldownOk = now - this.lastCueTime >= cfg.cueIntervalMs;

    // Crossing upward past HIGH threshold: organ stinger + snare roll
    if (this.crossedAbove(cfg.highConfidenceCue) && cooldownOk) {
      this.playOrganStinger();
      this.playSnareRoll();
      this.lastCueTime = now;
    }
    // Crossing upward past MID threshold: stomp-stomp-clap
    else if (this.crossedAbove(cfg.risingConfidenceCue) && cooldownOk) {
      this.playStompClap();
      this.lastCueTime = now;
    }

    // --- Periodic cowbell at HIGH confidence ---
    if (
      this.currentConfidence >= cfg.highConfidenceCue &&
      now - this.lastCowbellTime >= cfg.cueIntervalMs
    ) {
      this.playCowbell();
      this.lastCowbellTime = now;
    }
  }

  /**
   * Dispose all Tone.js nodes and free resources.
   */
  destroy(): void {
    if (this.isDroning) {
      this.droneSynth.triggerRelease();
      this.isDroning = false;
    }

    this.organSynth.dispose();
    this.stompSynth.dispose();
    this.clapSynth.dispose();
    this.cowbellSynth.dispose();
    this.snareSynth.dispose();
    this.droneSynth.dispose();
    this.gain.dispose();
  }

  // --- Private: Threshold Detection ---

  /** Did confidence just cross above the given threshold? */
  private crossedAbove(threshold: number): boolean {
    return this.previousConfidence < threshold && this.currentConfidence >= threshold;
  }

  /** Did confidence just cross below the given threshold? */
  private crossedBelow(threshold: number): boolean {
    return this.previousConfidence >= threshold && this.currentConfidence < threshold;
  }

  // --- Private: Cue Players ---

  /**
   * Organ stinger: Triumphant major chord hit (like after a home run).
   */
  private playOrganStinger(): void {
    const now = getTransport().immediate();
    // Play a quick C major chord arpeggio — 3 notes staggered
    this.organSynth.triggerAttackRelease('C5', '8n', now, 0.7);
    this.organSynth.triggerAttackRelease('E5', '8n', now + 0.05, 0.7);
    this.organSynth.triggerAttackRelease('G5', '8n', now + 0.1, 0.8);
  }

  /**
   * Stomp-stomp-clap: "We Will Rock You" rhythmic pattern.
   * Two low thuds followed by one bright clap.
   */
  private playStompClap(): void {
    const cfg = AUDIO_CONFIG.cues;
    const beatDuration = 60 / cfg.stompClapBpm;
    const now = getTransport().immediate();

    // Stomp 1 (beat 1)
    this.stompSynth.triggerAttackRelease('8n', now, 0.6);
    // Stomp 2 (beat 2)
    this.stompSynth.triggerAttackRelease('8n', now + beatDuration, 0.6);
    // Clap (beat 3)
    this.clapSynth.triggerAttackRelease('8n', now + beatDuration * 2, 0.7);
  }

  /**
   * Cowbell: Quick rhythmic burst — 4 hits over ~1 second.
   */
  private playCowbell(): void {
    const now = getTransport().immediate();
    const spacing = 0.25; // 250ms between hits

    for (let i = 0; i < 4; i++) {
      this.cowbellSynth.triggerAttackRelease('16n', now + i * spacing, 0.4 + i * 0.1);
    }
  }

  /**
   * Snare roll: 8 rapid hits with crescendo — building excitement.
   */
  private playSnareRoll(): void {
    const now = getTransport().immediate();
    const hits = 8;
    const totalDuration = 0.8; // seconds
    const spacing = totalDuration / hits;

    for (let i = 0; i < hits; i++) {
      const velocity = 0.2 + (i / hits) * 0.6; // crescendo from 0.2 to 0.8
      this.snareSynth.triggerAttackRelease('32n', now + i * spacing, velocity);
    }
  }

  /**
   * Start tension drone: low ominous note when confidence is dangerously low.
   */
  private startTensionDrone(): void {
    if (this.isDroning) return;
    this.droneSynth.triggerAttack('C2', undefined, 0.3);
    this.isDroning = true;
  }

  /**
   * Stop tension drone: fade out when confidence rises.
   */
  private stopTensionDrone(): void {
    if (!this.isDroning) return;
    this.droneSynth.triggerRelease();
    this.isDroning = false;
  }

  // --- Phaser Registry Pattern ---

  static register(scene: Phaser.Scene, system: ReactiveCueSystem): void {
    scene.registry.set('reactiveCueSystem', system);
  }

  static get(scene: Phaser.Scene): ReactiveCueSystem | undefined {
    return scene.registry.get('reactiveCueSystem') as ReactiveCueSystem | undefined;
  }
}
