/**
 * AudioSystem — Procedural sound effects via Web Audio API.
 *
 * No asset files needed. All sounds synthesized on the fly.
 * Lazy AudioContext creation (requires user gesture on mobile).
 * Registered in Phaser registry for cross-scene access.
 *
 * Enhanced in Plan 10-04: 4 honk variants with doppler pitch shift,
 * improved coal roller with engine roar, traffic light clunk.
 *
 * @stateAccess Does not read GameStateManager. Stateless sound generator. Triggered by events/method calls.
 */

import { AUDIO_CONFIG } from '../config/audioConfig';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;
  private baseVolume: number = 0.3;

  /**
   * Initialize AudioContext. Must be called from a user gesture handler.
   */
  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.baseVolume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch {
      console.warn('[HFD] Web Audio API not available');
    }
  }

  /**
   * Ensure context is resumed (required after user gesture on some browsers).
   */
  private ensureResumed(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.baseVolume;
    }
    return this.muted;
  }

  /**
   * Set master volume level (0-1 range). Used by AudioMixerSystem to
   * coordinate volume across systems without sharing AudioContext.
   */
  setVolume(level: number): void {
    this.baseVolume = Math.max(0, Math.min(1, level));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.baseVolume;
    }
  }

  /**
   * Get current base volume level (0-1 range).
   */
  getVolume(): number {
    return this.baseVolume;
  }

  // ============================================================
  // REACTION SOUNDS
  // ============================================================

  playReactionSound(reactionId: string): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();

    switch (reactionId) {
      case 'honk':
        this.playRandomHonk();
        break;
      case 'wave':
        this.playChime(800, 0.1);
        break;
      case 'bananas':
        this.playCrowdCheer();
        break;
      case 'peace':
        this.playChime(1000, 0.08);
        break;
      case 'thumbsdown':
        this.playBuzz();
        break;
      case 'finger':
        this.playAngryHorn();
        break;
      case 'yell':
        this.playYell();
        break;
      case 'coalroller':
        this.playDieselRumble();
        break;
      // nothing, stare = silence
    }
  }

  // ============================================================
  // GAME EVENT SOUNDS
  // ============================================================

  playSessionStart(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();
    this.playFanfare();
  }

  playSessionEnd(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();
    this.playWindDown();
  }

  playConfidenceZero(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();
    this.playSadTrombone();
  }

  playRaiseSign(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();
    this.playWhoosh();
  }

  playDeflect(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();
    this.playShieldClang();
  }

  /**
   * Play traffic light phase change sound — mechanical relay clunk.
   * Called from IntersectionScene when traffic light phase changes.
   */
  playTrafficLightChange(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.ensureResumed();
    this.playTrafficLightClunk();
  }

  // ============================================================
  // HONK VARIANTS (4 distinct car horns with doppler pitch shift)
  // ============================================================

  /**
   * Randomly select one of 4 honk variants.
   */
  private playRandomHonk(): void {
    const variant = Math.floor(Math.random() * AUDIO_CONFIG.sfx.honkVariants);
    switch (variant) {
      case 0:
        this.playHonkShort();
        break;
      case 1:
        this.playHonkLong();
        break;
      case 2:
        this.playHonkDeep();
        break;
      case 3:
        this.playHonkCheerful();
        break;
    }
  }

  /**
   * Quick toot — compact car. Square wave, 400Hz, 0.08s.
   */
  private playHonkShort(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const cfg = AUDIO_CONFIG.sfx;
    const duration = 0.08;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    const baseFreq = 400;
    // Doppler: start high, ramp down
    osc.frequency.setValueAtTime(baseFreq * cfg.dopplerMaxRate, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * cfg.dopplerMinRate, now + duration);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Sustained horn — sedan. Square wave, 350Hz, 0.25s with slight frequency drift.
   */
  private playHonkLong(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const cfg = AUDIO_CONFIG.sfx;
    const duration = 0.25;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    const baseFreq = 350;
    // Doppler: start high, ramp down over full duration
    osc.frequency.setValueAtTime(baseFreq * cfg.dopplerMaxRate, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * cfg.dopplerMinRate, now + duration);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.setValueAtTime(0.22, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Low truck horn — pickup truck. Square wave, 200Hz + 220Hz detuned, 0.3s.
   */
  private playHonkDeep(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const cfg = AUDIO_CONFIG.sfx;
    const duration = 0.3;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';

    const baseFreq1 = 200;
    const baseFreq2 = 220;
    // Doppler on both oscillators
    osc1.frequency.setValueAtTime(baseFreq1 * cfg.dopplerMaxRate, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq1 * cfg.dopplerMinRate, now + duration);
    osc2.frequency.setValueAtTime(baseFreq2 * cfg.dopplerMaxRate, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq2 * cfg.dopplerMinRate, now + duration);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Two-tone cheerful honk — friendly double-tap. 500Hz then 600Hz.
   */
  private playHonkCheerful(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const cfg = AUDIO_CONFIG.sfx;
    const tapDuration = 0.08;
    const gap = 0.06;

    // First tap
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    const baseFreq1 = 500;
    osc1.frequency.setValueAtTime(baseFreq1 * cfg.dopplerMaxRate, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq1 * cfg.dopplerMinRate, now + tapDuration);
    gain1.gain.setValueAtTime(0.20, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + tapDuration);
    osc1.connect(gain1);
    gain1.connect(this.masterGain!);
    osc1.start(now);
    osc1.stop(now + tapDuration);

    // Second tap (slightly higher pitch)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    const baseFreq2 = 600;
    const t2 = now + tapDuration + gap;
    osc2.frequency.setValueAtTime(baseFreq2 * cfg.dopplerMaxRate, t2);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq2 * cfg.dopplerMinRate, t2 + tapDuration);
    gain2.gain.setValueAtTime(0.20, t2);
    gain2.gain.exponentialRampToValueAtTime(0.01, t2 + tapDuration);
    osc2.connect(gain2);
    gain2.connect(this.masterGain!);
    osc2.start(t2);
    osc2.stop(t2 + tapDuration);
  }

  // ============================================================
  // SOUND GENERATORS
  // ============================================================

  /** @deprecated Use playRandomHonk() — kept for backward compat */
  private playHonk(): void {
    this.playRandomHonk();
  }

  private playChime(freq: number, duration: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + duration);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playCrowdCheer(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Noise burst for crowd sound
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass for crowd-like frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.3);

    // Add harmonics
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playBuzz(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playAngryHorn(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(210, now); // Slight detune for harshness

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  private playYell(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Noise component
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.25);

    // Low frequency base
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.2);
    oscGain.gain.setValueAtTime(0.1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Enhanced diesel rumble — longer duration (0.8s), engine roar filter sweep,
   * stronger sub-bass, initial cloud puff noise burst.
   */
  private playDieselRumble(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const duration = 0.8;

    // --- Initial cloud puff: short burst of higher-frequency noise ---
    const puffSize = ctx.sampleRate * 0.1;
    const puffBuffer = ctx.createBuffer(1, puffSize, ctx.sampleRate);
    const puffData = puffBuffer.getChannelData(0);
    for (let i = 0; i < puffSize; i++) {
      puffData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const puffNoise = ctx.createBufferSource();
    puffNoise.buffer = puffBuffer;

    const puffFilter = ctx.createBiquadFilter();
    puffFilter.type = 'bandpass';
    puffFilter.frequency.value = 1500;
    puffFilter.Q.value = 0.8;

    const puffGain = ctx.createGain();
    puffGain.gain.setValueAtTime(0.15, now);
    puffGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    puffNoise.connect(puffFilter);
    puffFilter.connect(puffGain);
    puffGain.connect(this.masterGain!);
    puffNoise.start(now);
    puffNoise.stop(now + 0.1);

    // --- Main diesel rumble: low noise with extended duration ---
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Primary lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    // Second filter: engine roar character — frequency sweeps from 300 down to 100
    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.setValueAtTime(300, now);
    roarFilter.frequency.exponentialRampToValueAtTime(100, now + duration);
    roarFilter.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.setValueAtTime(0.28, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(roarFilter);
    roarFilter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + duration);

    // --- Enhanced sub-bass oscillator (more prominent, longer) ---
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(60, now + duration * 0.8);
    oscGain.gain.setValueAtTime(0.20, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + duration * 0.8);
  }

  // ============================================================
  // TRAFFIC LIGHT CLUNK
  // ============================================================

  /**
   * Mechanical relay clunk — simulates the physical click of old traffic signals.
   * High-frequency metallic hit (1500Hz, 0.04s) + lower thud (200Hz, 0.06s).
   */
  private playTrafficLightClunk(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Metallic hit — high-frequency sine with very fast decay
    const metalOsc = ctx.createOscillator();
    const metalGain = ctx.createGain();
    metalOsc.type = 'sine';
    metalOsc.frequency.setValueAtTime(1500, now);
    metalOsc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
    metalGain.gain.setValueAtTime(0.12, now);
    metalGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    metalOsc.connect(metalGain);
    metalGain.connect(this.masterGain!);
    metalOsc.start(now);
    metalOsc.stop(now + 0.04);

    // Lower thud — 200Hz sine with slightly longer decay
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(200, now);
    thudGain.gain.setValueAtTime(0.10, now);
    thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain!);
    thudOsc.start(now);
    thudOsc.stop(now + 0.06);
  }

  // ============================================================
  // GAME EVENT SOUND GENERATORS
  // ============================================================

  private playFanfare(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Quick ascending notes
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.2);
    });
  }

  private playWindDown(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.6);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  private playSadTrombone(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Descending notes: B4, Bb4, A4, Ab4
    const notes = [494, 466, 440, 415];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.3);

      gain.gain.setValueAtTime(0.1, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.28);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.28);
    });
  }

  private playWhoosh(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.15);
  }

  private playShieldClang(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Metallic clang: high frequency sine + noise burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);

    // Second harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3200, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc2.connect(gain2);
    gain2.connect(this.masterGain!);
    osc2.start(now);
    osc2.stop(now + 0.1);
  }

  // ============================================================
  // REGISTRY HELPERS
  // ============================================================

  static register(scene: Phaser.Scene, audio: AudioSystem): void {
    scene.registry.set('audioSystem', audio);
  }

  static get(scene: Phaser.Scene): AudioSystem | null {
    return (scene.registry.get('audioSystem') as AudioSystem) ?? null;
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.initialized = false;
  }
}
