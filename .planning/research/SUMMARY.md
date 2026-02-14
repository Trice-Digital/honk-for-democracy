# Research Summary: Honk For Democracy

**Domain:** Mobile-first web protest simulator game
**Researched:** 2026-02-14
**Overall confidence:** HIGH

## Executive Summary

Honk For Democracy is a mobile-first 2D web game built with Astro 5.x (site shell) and Phaser 3.90.0 (game engine), deployed to Cloudflare Pages. The stack is well-suited: Astro handles static pages with zero JS by default, Phaser handles the game canvas with mature mobile/touch support, and CF Pages provides free, scalable static hosting.

The integration pattern is clean: Astro renders a game container div, a client-side script boots Phaser into it. No framework bridging needed. All game logic lives in Phaser scenes and systems; all site content lives in Astro pages. The separation is natural and avoids the common pitfall of trying to make a game engine talk to a UI framework.

The core technical risk is touch input feel on mobile. The visibility cone drag-to-rotate mechanic is the heart of the game, and if it feels laggy, imprecise, or conflicts with browser gestures, the game fails. Prevention: capture touch events aggressively, disable browser gestures on the game container, test on real phones from day 1, and use angle-based (atan2) rotation math rather than raw pixel deltas.

The phaser3-rex-plugins library provides battle-tested drag-rotate gesture recognition that maps directly to the visibility cone mechanic, saving significant custom implementation work.

## Key Findings

**Stack:** Astro 5.17 + Phaser 3.90.0 + CF Pages. Stable, mature, well-documented. No bleeding-edge risk.
**Architecture:** Two-layer separation — Astro site shell, Phaser game engine. Communicate via DOM element only.
**Critical pitfall:** Mobile touch input feel. Browser gesture conflicts. Test on real phones from day 1.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Project Scaffolding + Game Boot** — Get Astro + Phaser integrated and rendering on mobile
   - Addresses: Infrastructure, basic rendering, mobile viewport
   - Avoids: Phaser/Vite import issues, canvas sizing bugs

2. **Core Game Loop** — Visibility cone, traffic, basic reactions
   - Addresses: The fundamental mechanic that makes this a game
   - Avoids: Touch input feeling wrong by getting it right early

3. **Sign Crafting** — Material picker, message input, sign properties
   - Addresses: Pre-game creative expression, feeds into gameplay
   - Avoids: Disconnected feeling by wiring sign -> reaction multiplier

4. **Game Systems** — Confidence meter, arm fatigue, weather
   - Addresses: The emotional and physical layer that makes gameplay feel real
   - Avoids: Health-bar feeling by framing as emotional energy

5. **Event System** — Cop check, karma moment, weather shifts
   - Addresses: Variety, real-world learning, flow-state breaks
   - Avoids: Flow interruption by making events overlay, not pause

6. **Score + End Screen** — Stats, share card, activism resources
   - Addresses: Session boundary, viral sharing, the Trojan horse payload
   - Avoids: Weak sharing by making score screen screenshot-worthy

7. **Landing Page + Polish + Deploy** — Astro site pages, audio, visual polish, CF Pages deploy
   - Addresses: First impression, discoverability, production readiness
   - Avoids: Asset loading issues by optimizing early

**Phase ordering rationale:**
- Scaffolding first: foundation must work before anything else
- Core loop before sign crafting: prove the game is fun before polishing the pre-game
- Systems before events: meters and state must exist for events to modify them
- Score/end screen before polish: complete the player arc before making it pretty
- Landing page last: game must be playable before marketing it

**Research flags for phases:**
- Phase 2 (Core Game Loop): Needs careful attention to touch input. Consider deeper research into atan2-based rotation and phaser3-rex-plugins drag-rotate specifically.
- Phase 7 (Deploy): Standard patterns, CF Pages + Astro adapter is well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified current via Context7 and official sources. Versions confirmed. |
| Features | HIGH | Feature set derived from comprehensive game design doc based on lived experience. |
| Architecture | HIGH | Astro + Phaser integration pattern is straightforward, well-supported by both frameworks. |
| Pitfalls | MEDIUM | Mobile touch pitfalls well-documented in community. Specific visibility cone math is novel — needs in-development testing. |

## Gaps to Address

- **Exact phaser3-rex-plugins API for drag-rotate:** Identified as useful but didn't deep-dive into exact API. Phase 2 research should investigate.
- **Audio format support across mobile browsers:** Phaser handles format fallback, but testing needed.
- **iOS Safari specific viewport quirks:** Known issue area. Needs device testing, not just research.
- **Optimal reaction weights for fun gameplay:** Can only be determined through playtesting, not research. Start with design doc weights, iterate.
