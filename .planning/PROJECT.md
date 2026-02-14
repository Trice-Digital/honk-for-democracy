# Honk For Democracy

## What This Is

A web-based protest simulator game where players craft protest signs, stand on real Harford County, Maryland street corners, learn traffic light patterns, aim signs at passing cars, and experience the full spectrum of reactions — from friendly honks to coal-rolling diesel trucks. Pro-democracy, anti-MAGA, but through lived experience rather than lecturing. The viral gameplay is the Trojan horse; real activism resources at the end are the payload.

**Domain:** honkfordemocracy.org
**Tagline:** "Stand Up. Speak Out."

## Core Value

The traffic light learning mechanic — reactive, predictive, flow state — turns "hold a sign at an intersection" into a real game loop with a skill ceiling. Without this, it's a toy. With it, it's a game people replay.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Sign crafting mini-game (pick materials + type message, affects durability and reaction multiplier)
- [ ] Top-down intersection map with traffic light cycle pattern to learn
- [ ] Visibility cone mechanic (swipe/drag to aim, cars in cone = scored)
- [ ] Reaction spectrum (wave, honk, go bananas, nothing, thumbs down, middle finger, coal roller)
- [ ] Confidence meter (starts low, rises/falls with reactions and group size)
- [ ] Arm fatigue mechanic (drains over time, switch arms, rest, craft material affects rate)
- [ ] Event system (cop check with first amendment dialogue, weather shifts, karma moment)
- [ ] Score screen with shareable stat card (HTML, screenshot-ready)
- [ ] Activism resource end screen ("This was a game. This is also real.")
- [ ] Landing page with game branding
- [ ] Mobile-first, touch-first responsive design
- [ ] Deployed to Cloudflare Pages

### Out of Scope

- Drag-and-drop sign builder — v1 uses simple material picker + text input. Polish for later.
- Canvas-rendered shareable image generation — v1 is styled HTML that people screenshot manually.
- Overpass map — different geometry, different sign design mechanic, different game feel. Milestone 2.
- Park Rally map — crowd mechanics, not traffic mechanics. Different game entirely. Later.
- Main Street March map — walking route, pedestrian interactions. Later.
- Rush Hour bonus round — needs base maps working first.
- Community sign voting / templates — needs a user base first.
- Tower defense variant — interesting but separate game mode, not core loop.
- Chant rhythm mini-game — complex interaction design, v1 chants are passive group buffs only.
- Counter-protester event — needs de-escalation dialogue tree polish. Milestone 2.
- Media arrives event — bonus multiplier complexity. Milestone 2.
- OAuth / accounts / user profiles — no accounts needed for v1. Play and share.
- Backend / API / database — fully static, no server-side anything.

## Context

- **Source material:** Game design derived from Scott's real protest experience in Harford County, MD. Photos from Bel Air intersections, Rt. 22/I-95 overpass, Shamrock Park rallies. The traffic light learning mechanic, the reaction spectrum, the arm fatigue, the cop checks — all real.
- **Storyboard:** 20-panel, 6-act storyboard exists at the business brain repo covering the full player arc from kitchen table sign crafting through the drive home.
- **Design doc:** Comprehensive game design document covers all maps, mechanics, and the activism layer.
- **Visual direction:** Clean, bold, slightly playful. Flat illustration style with thick outlines. Limited palette — American flag blue/red/white + road grays + cardboard brown. Hand-drawn energy for signs (Permanent Marker font vibes). Clean modern UI around the game canvas. Emojis used sparingly as reaction indicators popping off cars but NOT as the art style. Newspaper editorial cartoon meets indie mobile game.
- **Perspective:** Top-down for all maps. Player character near-center of intersection.
- **Core interaction:** Single-finger drag/swipe to rotate visibility cone. Cars passing through cone = scored/reacted. Like a flashlight in a stealth game, inverted — you WANT to be seen.
- **Sign design varies by map context:** Intersection = clever/detailed (cars stopped at lights, time to read). Overpass = big block letters (65mph, 2 seconds). This affects the crafting mini-game per map.

## Constraints

- **Stack**: Astro 5.x site shell + Phaser 3 game engine + Cloudflare Pages — decided, non-negotiable
- **Mobile-first**: Touch-first design, desktop secondary. Spreads on phones via social media.
- **Performance**: Lightweight, fast-loading, no heavy dependencies. People find this on phones via shared links.
- **No backend**: Fully static. No accounts, no API, no database. Play and share.
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

---
*Last updated: 2026-02-14 after initialization*
