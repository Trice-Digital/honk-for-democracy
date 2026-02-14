# Honk For Democracy

## What This Is

A web-based protest simulator game where players craft protest signs, stand on real Harford County, Maryland street corners, learn traffic light patterns, aim signs at passing cars, and experience the full spectrum of reactions — from friendly honks to coal-rolling diesel trucks. Pro-democracy, anti-MAGA, but through lived experience rather than lecturing. The viral gameplay is the Trojan horse; real activism resources at the end are the payload.

**Domain:** honkfordemocracy.org
**Tagline:** "Stand Up. Speak Out."

## Core Value

The traffic light learning mechanic — reactive, predictive, flow state — turns "hold a sign at an intersection" into a real game loop with a skill ceiling. Without this, it's a toy. With it, it's a game people replay.

## Current Milestone: v2.0 The Sign & The Polish

**Goal:** Elevate the sign creator into a first-class creative tool, polish visuals/audio/UI, and add social sharing so the sign IS the viral marketing.

**Target features:**
- Sign creator upgrade: fonts, colors, materials (cardboard, markers, paint, glitter, duct tape), arts & crafts energy
- Visual & UI polish: replace placeholders with SVGs/emoji, timer clarity, controls tuning, feedback loops
- Audio polish: tune procedural audio, sound balance, music, ambient
- Social share: post-game generates shareable image (sign + score + URL), client-side only, no server
- Debug & tuning: use existing debug overlay to dial in confidence/fatigue/reactions feel

## Requirements

### Validated

- Sign crafting mini-game (pick materials + type message, affects durability and reaction multiplier) — M1
- Top-down intersection map with traffic light cycle pattern to learn — M1
- Visibility cone mechanic (swipe/drag to aim, cars in cone = scored) — M1
- Reaction spectrum (wave, honk, go bananas, nothing, thumbs down, middle finger, coal roller) — M1
- Confidence meter (starts low, rises/falls with reactions and group size) — M1
- Arm fatigue mechanic (drains over time, switch arms, rest, craft material affects rate) — M1
- Event system (cop check with first amendment dialogue, weather shifts, karma moment) — M1
- Score screen with shareable stat card (HTML, screenshot-ready) — M1
- Activism resource end screen ("This was a game. This is also real.") — M1
- Landing page with game branding — M1
- Mobile-first, touch-first responsive design — M1
- Deployed to Cloudflare Workers (static assets) — M1
- Procedural audio system (Web Audio API, zero assets) — M1
- Debug overlay with hot-tune sliders — M1

### Active

- [ ] First-class sign creator with fonts, colors, materials, arts & crafts energy
- [ ] Visual polish: SVG/emoji graphics replacing placeholders, clear timer/game-end UX
- [ ] Audio tuning: sound balance, background music, ambient layers
- [ ] Social share: client-side shareable image generation (sign + score + CTA)
- [ ] Activism end screen enhanced alongside share flow
- [ ] Game feel tuning via debug overlay (confidence/fatigue/reactions balance)

### Out of Scope

- New maps (overpass, rally, march) — M3
- NPC protesters with personalities/interactions — M3
- Community sign gallery/voting — M4
- User accounts / login — no accounts ever in foreseeable future
- Server-side storage / moderation — client-side only
- Backend / API / database — fully static
- Tower defense variant — separate game mode
- Chant rhythm mini-game — M3+ with NPC protesters

## Context

- **Source material:** Game design derived from Scott's real protest experience in Harford County, MD. Photos from Bel Air intersections, Rt. 22/I-95 overpass, Shamrock Park rallies. The traffic light learning mechanic, the reaction spectrum, the arm fatigue, the cop checks — all real.
- **M1 shipped:** Full game loop playable. 7 phases, 18 plans, all complete 2026-02-14. Config-driven architecture. Engine-first design supporting future map configs.
- **Architecture:** GameStateManager (EventEmitter singleton), TrafficLightSystem, ReactionSystem, ConfidenceSystem, FatigueSystem, EventSystem, WeatherSystem, AudioSystem. All config in src/game/config/.
- **Key files:** Debug overlay (src/game/systems/DebugOverlay.ts), Score scene (src/game/scenes/ScoreScene.ts), Activism scene (src/game/scenes/ActivismScene.ts), Audio (src/game/systems/AudioSystem.ts)
- **Visual direction:** Clean, bold, slightly playful. Flat illustration style with thick outlines. Limited palette — American flag blue/red/white + road grays + cardboard brown. Hand-drawn energy for signs.
- **Viral strategy:** People share signs, not scores. The sign creator is half the experience. Share image = sign + score + "I protested at honkfordemocracy.org". Activism end screen is the CTA alongside share.

## Constraints

- **Stack**: Astro 5.x site shell + Phaser 3 game engine + Cloudflare Workers (static assets) — decided, non-negotiable
- **Mobile-first**: Touch-first design, desktop secondary. Spreads on phones via social media.
- **Performance**: Lightweight, fast-loading, no heavy dependencies. People find this on phones via shared links.
- **No backend**: Fully static. No accounts, no API, no database. Play and share.
- **No moderation**: Client-side image generation. No server storage of user content.
- **Standalone domain**: Not Festivus, not trice.digital. This is its own thing.
- **Tone**: The game doesn't editorialize. It shows you what happens. When one side waves and the other side threatens to kill you, the game doesn't need commentary.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Top-down perspective for all maps | Enables consistent mechanic (visibility cone) across different map geometries. Sets up overpass/march maps naturally. | -- Pending |
| Visibility cone as core mechanic | Single-finger drag, immediately understood on mobile, creates skill ceiling via traffic pattern learning | -- Pending |
| Simple sign crafting for v1 | Material picker + text input gets to core loop fast. Drag-and-drop builder is polish. | -- Pending |
| HTML score card, not canvas-rendered | Ship faster. People can screenshot. Canvas generation is v2 polish. | -- Pending |
| Phaser 3 over alternatives | Mature, well-documented, good mobile support, handles 2D game canvas well | -- Pending |
| Astro 5.x for site shell | Static-first, fast, clean separation of site pages vs game canvas | -- Pending |
| No accounts / backend | Zero friction to play. Share a link, play immediately. No signup walls. | -- Pending |
| Sign creator as M2 centerpiece | The sign IS the viral marketing. People share signs, not scores. Arts & crafts energy makes it half the experience. | -- Pending |
| Client-side share image generation | No server storage, no moderation needed. Canvas API renders sign + score + URL. Player downloads/shares directly. | -- Pending |

---
*Last updated: 2026-02-14 after M2 milestone start*
