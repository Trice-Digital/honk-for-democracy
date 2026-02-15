/**
 * MusicSystem — Confidence-reactive stadium organ music using Tone.js.
 *
 * Produces procedural stadium organ music that shifts energy with confidence:
 *   - LOW (<30): Minor key, sparse, slow half-note chords
 *   - MID (30-80): Moderate major chords, quarter-note rhythm
 *   - HIGH (>80): Triumphant major key, energetic eighth-note staccato
 *
 * The organ sound uses FM synthesis (PolySynth + FMSynth) for a playful
 * baseball-stadium-organ feel — think "charge" riff, not church organ.
 *
 * Does NOT connect to destination directly — exposes connectTo() for mixer wiring.
 * Energy transitions happen at phrase boundaries to avoid jarring mid-phrase changes.
 *
 * Registered in Phaser registry for cross-scene access.
 */

import { PolySynth, FMSynth, Gain, Loop, getTransport, type InputNode } from 'tone';
import { AUDIO_CONFIG } from '../config/audioConfig';

type EnergyLevel = 'low' | 'mid' | 'high';

/** Chord definitions for each energy level */
const PHRASE_SETS: Record<EnergyLevel, string[][]> = {
  // Minor key, sparse — tense, uncertain
  low: [
    ['C3', 'Eb3', 'G3'],
    ['F3', 'Ab3', 'C4'],
    ['Ab3', 'C4', 'Eb4'],
    ['G3', 'Bb3', 'D4'],
  ],
  // Major key, steady — moderate confidence
  mid: [
    ['C3', 'E3', 'G3'],
    ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4'],
    ['C3', 'E3', 'G3'],
  ],
  // Major key, triumphant — high energy
  high: [
    ['C4', 'E4', 'G4'],
    ['F4', 'A4', 'C5'],
    ['G4', 'B4', 'D5'],
    ['A3', 'C4', 'E4'],
    ['F4', 'A4', 'C5'],
    ['G4', 'B4', 'D5'],
    ['C4', 'E4', 'G4', 'C5'],
    ['C4', 'E4', 'G4', 'C5'],
  ],
};

/** Note durations per energy level (in Tone.js notation) */
const RHYTHM: Record<EnergyLevel, string> = {
  low: '2n',   // half note — one chord every 2 beats
  mid: '4n',   // quarter note — one chord every beat
  high: '8n',  // eighth note — one chord every half beat
};

/** Velocity / expression per energy level */
const VELOCITY: Record<EnergyLevel, number> = {
  low: 0.3,
  mid: 0.5,
  high: 0.75,
};

/** Harmonicity settings per energy level (organ character) */
const HARMONICITY: Record<EnergyLevel, number> = {
  low: 2,    // muted, less overtones
  mid: 3,    // standard organ
  high: 4,   // bright, more overtones
};

export class MusicSystem {
  private synth: PolySynth<FMSynth>;
  private gain: Gain;
  private loop: Loop | null = null;
  private isPlaying: boolean = false;

  private currentEnergy: EnergyLevel = 'mid';
  private pendingEnergy: EnergyLevel | null = null;
  private phraseIndex: number = 0;
  private currentConfidence: number = 50;

  constructor() {
    const cfg = AUDIO_CONFIG.music;

    // Stadium organ: FM synthesis with rich harmonics
    this.synth = new PolySynth(FMSynth, {
      maxPolyphony: 8,
      voice: {
        harmonicity: HARMONICITY.mid,
        modulationIndex: 10,
        envelope: {
          attack: cfg.organAttack,
          decay: cfg.organDecay,
          sustain: cfg.organSustain,
          release: cfg.organRelease,
        },
        modulation: {
          type: 'square',
        },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.3,
          release: 0.5,
        },
      } as Partial<ConstructorParameters<typeof FMSynth>[0]>,
    });

    // Output gain — starts at 1 (volume managed by mixer layer)
    this.gain = new Gain({ gain: 1 });

    // Wire: synth -> gain (not to destination)
    this.synth.connect(this.gain);
  }

  /**
   * Connect the music output to a destination node (e.g., mixer music channel).
   */
  connectTo(destination: InputNode): void {
    this.gain.connect(destination);
  }

  /**
   * Start the music loop using Tone.js Transport.
   */
  start(): void {
    if (this.isPlaying) return;

    const cfg = AUDIO_CONFIG.music;
    const transport = getTransport();
    transport.bpm.value = cfg.bpm;

    this.phraseIndex = 0;

    // Create the music loop — fires on each rhythmic subdivision
    this.loop = new Loop((time) => {
      this.playBeat(time);
    }, RHYTHM[this.currentEnergy]);

    this.loop.start(0);

    if (transport.state !== 'started') {
      transport.start();
    }

    this.isPlaying = true;
  }

  /**
   * Stop the music loop, letting the tail ring out naturally.
   */
  stop(): void {
    if (!this.isPlaying) return;

    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }

    // Let sustain/release tail ring out — don't hard-cut
    this.synth.releaseAll();
    this.isPlaying = false;
  }

  /**
   * Update confidence level. Energy transitions happen at phrase boundaries.
   */
  updateConfidence(level: number): void {
    this.currentConfidence = Math.max(0, Math.min(100, level));
    const cfg = AUDIO_CONFIG.music;

    let targetEnergy: EnergyLevel;
    if (this.currentConfidence < cfg.lowThreshold) {
      targetEnergy = 'low';
    } else if (this.currentConfidence >= cfg.highThreshold) {
      targetEnergy = 'high';
    } else {
      targetEnergy = 'mid';
    }

    if (targetEnergy !== this.currentEnergy) {
      this.pendingEnergy = targetEnergy;
    }
  }

  /**
   * Set the music output volume in dB.
   */
  setVolume(dB: number): void {
    this.gain.gain.rampTo(Math.pow(10, dB / 20), 0.1);
  }

  /**
   * Dispose all Tone.js nodes and free resources.
   */
  destroy(): void {
    this.stop();
    this.synth.dispose();
    this.gain.dispose();
  }

  // --- Private ---

  /**
   * Play a single beat of the organ chord progression.
   * At phrase boundaries, apply any pending energy change.
   */
  private playBeat(time: number): void {
    const phrases = PHRASE_SETS[this.currentEnergy];

    // Phrase boundary: start of chord progression loop
    if (this.phraseIndex >= phrases.length) {
      this.phraseIndex = 0;

      // Apply pending energy change at phrase boundary
      if (this.pendingEnergy !== null) {
        this.applyEnergyChange(this.pendingEnergy);
        this.pendingEnergy = null;
      }
    }

    const chord = PHRASE_SETS[this.currentEnergy][this.phraseIndex];
    const velocity = VELOCITY[this.currentEnergy];
    const duration = RHYTHM[this.currentEnergy];

    // Release previous notes before triggering new chord
    this.synth.releaseAll(time);
    this.synth.triggerAttackRelease(chord, duration, time, velocity);

    this.phraseIndex++;
  }

  /**
   * Apply an energy level change — update synth parameters and loop interval.
   */
  private applyEnergyChange(newEnergy: EnergyLevel): void {
    this.currentEnergy = newEnergy;
    this.phraseIndex = 0;

    // Update synth character for new energy
    this.synth.set({
      harmonicity: HARMONICITY[newEnergy],
    });

    // Update loop interval for new rhythm
    if (this.loop) {
      this.loop.interval = RHYTHM[newEnergy];
    }
  }

  // --- Phaser Registry Pattern ---

  static register(scene: Phaser.Scene, system: MusicSystem): void {
    scene.registry.set('musicSystem', system);
  }

  static get(scene: Phaser.Scene): MusicSystem | undefined {
    return scene.registry.get('musicSystem') as MusicSystem | undefined;
  }
}
