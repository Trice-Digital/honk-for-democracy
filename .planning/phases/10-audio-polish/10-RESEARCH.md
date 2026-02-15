# Phase 10: Audio Polish - Research

**Researched:** 2026-02-14
**Domain:** Game audio (procedural synthesis, music loops, SFX, audio sprites)
**Confidence:** HIGH

## Summary

Phase 10 transforms the existing procedural Web Audio API AudioSystem into a full stadium-rally audio experience. The current system has basic oscillator-based SFX for reactions and game events. The goal is to add: (1) ambient background layer, (2) confidence-reactive background music with Americana/folk feel, (3) improved SFX variety (honk pack, doppler, coal roller rumble, traffic light clunk), and (4) reactive audio cues (organ stingers, stomp-stomp-clap, cowbell, snare rolls) layered by confidence level.

Two audio approaches are available: Tone.js (MIT, ~150KB gzipped) for procedural/reactive music generation, and Phaser 3's built-in audio system for pre-recorded audio sprites (OGG + MP3). The recommended approach uses Tone.js for the reactive background music system (it excels at scheduling, transport, and synth layering) and Phaser 3 audio sprites for short SFX (honks, clunks, cues).

**Primary recommendation:** Hybrid approach — Tone.js for procedural/reactive music, Phaser audio sprites for short SFX, existing Web Audio API for current reaction sounds.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tone.js | 15.x (latest) | Procedural music, reactive loops, transport scheduling | MIT, purpose-built for interactive web audio, Transport + Loop + Synth abstractions |
| Phaser 3 (built-in) | 3.90.0 | Audio sprites, SFX playback, volume management | Already in project, native audio sprite support with JSON timestamps |
| Web Audio API (raw) | N/A | Existing reaction sounds | Already implemented, works well for one-shot procedural SFX |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| audiosprite (npm) | latest | Generate audio sprite JSON + combined files from individual samples | Build step: combine individual SFX files into sprite sheets |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tone.js for music | Kevin MacLeod MP3 loops | Simpler but no confidence-reactive energy shifts |
| Tone.js for music | Howler.js | Better for playback, but no synthesis/scheduling |
| audiosprite tool | Manual JSON | Error-prone, tedious |

**Installation:**
```bash
npm install tone
npm install -D audiosprite
```

## Architecture Patterns

### Recommended Audio Layer Structure
```
src/game/systems/
├── AudioSystem.ts          # EXISTING: Reaction SFX (Web Audio API) — enhance
├── MusicSystem.ts          # NEW: Tone.js reactive background music
├── AmbientSystem.ts        # NEW: Ambient street sounds (Tone.js noise + filters)
└── AudioMixerSystem.ts     # NEW: Master volume bus, per-layer control, crossfading
```

### Pattern 1: Audio Layer Architecture
**What:** Separate audio into independent layers with a mixer bus
**When to use:** Multiple simultaneous audio sources need independent volume control
```
Layer 1: Ambient (street noise, traffic hum) — continuous, low-level
Layer 2: Music (stadium organ, Americana loops) — confidence-reactive
Layer 3: Reactive Cues (organ stingers, stomp-clap, cowbell) — triggered by confidence thresholds
Layer 4: SFX (honks, clunks, reactions) — one-shot, event-driven
```

### Pattern 2: Tone.js Transport for Reactive Music
**What:** Use Tone.Transport as master clock, schedule musical phrases that change with confidence
**When to use:** Music needs to react to game state in real-time
```typescript
// Tone.js Transport pattern
import * as Tone from 'tone';

const transport = Tone.getTransport();
transport.bpm.value = 120;

const organ = new Tone.PolySynth(Tone.FMSynth).toDestination();
const loop = new Tone.Loop((time) => {
  // Play phrase based on current confidence level
  organ.triggerAttackRelease(currentPhrase, "8n", time);
}, "4n").start(0);

transport.start();
```

### Pattern 3: Phaser Audio Sprites for SFX
**What:** Pack multiple short SFX into one audio file with JSON timestamps
**When to use:** Many short sounds, minimize HTTP requests, dual-format (OGG + MP3)
```typescript
// In BootScene preload:
this.load.audioSprite('sfx', 'audio/sfx.json', [
  'audio/sfx.ogg',
  'audio/sfx.mp3'
]);

// Play from sprite:
this.sound.playAudioSprite('sfx', 'honk-short');
```

### Pattern 4: Tone.js User Gesture Requirement
**What:** Tone.js requires Tone.start() from user gesture, same as AudioContext
**When to use:** Always — mandatory on mobile browsers
```typescript
// On first user interaction:
await Tone.start();
console.log('Tone.js audio context started');
```

### Anti-Patterns to Avoid
- **Multiple AudioContexts:** Tone.js creates its own. Don't create a second one alongside the existing Web Audio API AudioContext. Use Tone.getContext() or share.
- **Loading large audio files synchronously:** Use Phaser's preloader for audio sprites, Tone.js for procedural.
- **Forgetting OGG fallback:** Always ship OGG + MP3. iOS Safari needs MP3, Firefox prefers OGG.
- **Not gating Tone.start():** Must be called from user gesture handler or audio will be silent on mobile.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Music scheduling/tempo | Custom setInterval loop | Tone.Transport + Tone.Loop | Drift-free scheduling, tempo control |
| Synth sounds (organ, etc) | Manual oscillator wiring | Tone.FMSynth, Tone.AMSynth, Tone.PolySynth | Tested, tuned, envelope control |
| Audio sprites | Manual buffer slicing | Phaser audioSprite loader | JSON-driven, cross-browser format selection |
| Volume crossfading | Linear gain.value tweaks | Tone.js Gain + rampTo or Phaser volume tween | Exponential curves, no clicks |
| Noise generation | Manual buffer filling | Tone.Noise | Brown/pink/white noise with proper spectral shape |

## Common Pitfalls

### Pitfall 1: Dual AudioContext Conflict
**What goes wrong:** Tone.js creates its own AudioContext, existing AudioSystem has another. Two contexts = weird timing, doubled CPU.
**Why it happens:** Each library defaults to its own context.
**How to avoid:** Either migrate existing AudioSystem sounds to Tone.js, OR use `Tone.setContext(existingContext)` to share. Recommended: keep existing AudioSystem for its working reaction sounds, use Tone.js with its own context for music/ambient (they're independent concerns).
**Warning signs:** Audio glitches, sounds playing at wrong times.

### Pitfall 2: Mobile AudioContext Suspended State
**What goes wrong:** Audio doesn't play on iOS Safari.
**Why it happens:** Browser requires user gesture to start AudioContext.
**How to avoid:** Gate both `AudioSystem.init()` AND `Tone.start()` on the same user gesture. The existing code already handles this for AudioSystem — extend the pattern.
**Warning signs:** Desktop works, mobile silent.

### Pitfall 3: Tone.js Bundle Size
**What goes wrong:** 150KB+ added to bundle for music system.
**Why it happens:** Tone.js is comprehensive.
**How to avoid:** Tree-shake by importing specific classes: `import { Transport, Loop, FMSynth } from 'tone'`. Consider lazy-loading the music system after game boot.
**Warning signs:** Bundle size jump on lighthouse.

### Pitfall 4: Audio Sprite Format Compatibility
**What goes wrong:** Audio plays on Chrome but not Safari, or vice versa.
**Why it happens:** Safari doesn't support OGG, Firefox historically preferred OGG over MP3.
**How to avoid:** Ship BOTH OGG and MP3 for every audio sprite. Phaser's loader auto-selects the right format.
**Warning signs:** Silent audio on specific browsers.

### Pitfall 5: Volume Balancing Across Layers
**What goes wrong:** Music drowns out SFX, or ambient is too loud.
**Why it happens:** Each layer has independent volume, no master coordination.
**How to avoid:** Create AudioMixerSystem with per-layer gain nodes feeding a master bus. Default levels: Ambient 0.15, Music 0.20, Cues 0.25, SFX 0.30.
**Warning signs:** Tester says "I can't hear the honks."

## Code Examples

### Tone.js Reactive Music System (organ riff pattern)
```typescript
import * as Tone from 'tone';

// Stadium organ riff - changes phrases based on confidence
const organ = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 3,
  modulationIndex: 10,
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
}).toDestination();

// Low confidence: minor, slow
const lowPhrases = [['C3', 'Eb3', 'G3'], ['Ab2', 'C3', 'Eb3']];
// High confidence: major, energetic
const highPhrases = [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5']];

let currentConfidence = 50;
const musicLoop = new Tone.Loop((time) => {
  const phrases = currentConfidence > 60 ? highPhrases : lowPhrases;
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  organ.triggerAttackRelease(phrase, "8n", time);
}, "2n").start(0);
```

### Ambient Street Noise with Tone.js
```typescript
const noise = new Tone.Noise('brown').start();
const filter = new Tone.AutoFilter({
  frequency: 0.1,
  baseFrequency: 200,
  octaves: 2
}).toDestination().start();
noise.connect(filter);
noise.volume.value = -20; // Quiet background
```

### Phaser Audio Sprite Loading
```typescript
// BootScene preload:
this.load.audioSprite('sfx', 'audio/sfx.json', [
  'audio/sfx.ogg',
  'audio/sfx.mp3'
]);

// IntersectionScene usage:
this.sound.playAudioSprite('sfx', 'honk-short', { volume: 0.4 });
this.sound.playAudioSprite('sfx', 'traffic-light-clunk', { volume: 0.3 });
```

## Open Questions

1. **Tone.js context sharing with existing AudioContext**
   - What we know: Both can run independently
   - What's unclear: Whether sharing contexts improves performance or causes issues
   - Recommendation: Start with separate contexts, optimize later if needed

2. **Audio asset sourcing**
   - What we know: Freesound.org (CC0), Incompetech (CC-BY 4.0), Pixabay (no attribution), Sonniss GDC packs
   - What's unclear: Whether procedural Tone.js can replace all pre-recorded SFX needs
   - Recommendation: Use procedural for music/ambient, pre-recorded for short SFX (honks, clunks)

## Sources

### Primary (HIGH confidence)
- Context7 /tonejs/tone.js — Transport, Loop, Synth, Noise, scheduling patterns
- Context7 /websites/phaser_io_api-documentation — audioSprite loader, WebAudioSoundManager

### Secondary (MEDIUM confidence)
- Tone.js README and wiki (GitHub) — architecture patterns, user gesture requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Tone.js and Phaser audio are well-documented, verified via Context7
- Architecture: HIGH — layered audio is standard game audio pattern
- Pitfalls: HIGH — AudioContext issues well-documented, dual-format requirement known

**Research date:** 2026-02-14
**Valid until:** 2026-03-14
