# Roadmap: Honk For Democracy

## Overview

Milestone 1 delivers The Intersection — the core protest simulator experience. From sign crafting through gameplay through the activism payoff, playable on mobile, deployed to the world. Seven phases build the game layer by layer: foundation first, then the core loop that makes it a game, then the systems that make it feel real, then the payload that makes it matter.

## Phases

- [x] **Phase 1: Scaffolding & Game Boot** - Astro + Phaser integrated, rendering on mobile
- [x] **Phase 2: Core Game Loop** - Visibility cone, traffic, reactions — the game exists
- [x] **Phase 3: Sign Crafting** - Pre-game creative expression that feeds into gameplay
- [x] **Phase 4: Game Systems** - Confidence meter + arm fatigue — the emotional and physical layer
- [x] **Phase 5: Event System** - Cop check, weather, karma — variety and real-world learning
- [x] **Phase 6: Score & End Screens** - Session boundary, sharing, activism payload
- [ ] **Phase 7: Landing Page, Polish & Deploy** - First impression, audio, optimization, ship it

## Phase Details

### Phase 1: Scaffolding & Game Boot
**Goal**: Astro site and Phaser game engine are integrated, rendering a playable canvas on mobile devices
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-07
**Success Criteria** (what must be TRUE):
  1. Astro dev server runs and serves pages at localhost
  2. Phaser game canvas renders inside an Astro page and fills the mobile screen in portrait mode
  3. Touch input is captured on the game canvas without triggering browser scroll/zoom/back-swipe
  4. A loading screen appears while game assets load
  5. Project builds successfully with `astro build`
**Plans**: Defined (2026-02-14)

Plans:
- [x] 01-01: Astro project scaffold + Phaser integration (2026-02-14)
- [x] 01-02: Mobile viewport, touch capture, loading screen (2026-02-14)

### Phase 2: Core Game Loop
**Goal**: Player can stand at an intersection, aim a visibility cone at traffic, and see reactions — this is a playable game
**Depends on**: Phase 1
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, GAME-10, REACT-01, REACT-02, REACT-03, REACT-04
**Success Criteria** (what must be TRUE):
  1. Player sees a top-down intersection with roads, traffic lights, and their character holding a sign
  2. Player drags to rotate a visible cone, and cars passing through it generate scored reactions
  3. Traffic lights cycle in a deterministic, learnable pattern — cars spawn from green-light directions
  4. Reactions pop visually from cars (icons + score floaters) with clear positive/negative distinction
  5. A running score and session timer are visible, and the session ends when time runs out
**Plans**: Complete (2026-02-14)

Plans:
- [x] 02-01: Intersection map rendering + traffic light system (2026-02-14)
- [x] 02-02: Player character + visibility cone mechanic (2026-02-14)
- [x] 02-03: Car spawning, movement, and reaction system (2026-02-14)

### Phase 3: Sign Crafting
**Goal**: Player crafts their own protest sign before gameplay, and the sign visibly affects their gameplay experience
**Depends on**: Phase 2
**Requirements**: SIGN-01, SIGN-02, SIGN-03, SIGN-04, SIGN-05, SIGN-06
**Success Criteria** (what must be TRUE):
  1. Player can pick a sign material and type a custom message before starting gameplay
  2. Player sees a preview of their completed sign
  3. The sign is visible on the player character during intersection gameplay
  4. Material choice visibly affects durability (tested via weather in Phase 5) and fatigue (tested in Phase 4)
  5. Message quality affects the ratio of positive to negative reactions during gameplay
**Plans**: Complete (2026-02-14)

Plans:
- [x] 03-01: Sign crafting scene (material picker + message input + preview)
- [x] 03-02: Wire sign properties into gameplay (reaction multiplier, player sprite)

### Phase 4: Game Systems
**Goal**: The game feels emotionally and physically real — confidence rises and falls, arms get tired, the player experiences the arc
**Depends on**: Phase 2, Phase 3
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, CONF-07, FATG-01, FATG-02, FATG-03, FATG-04, FATG-05
**Success Criteria** (what must be TRUE):
  1. Confidence meter is visible on screen, starts low (~30%), and visibly rises with honks / falls with hostile reactions
  2. If confidence hits zero, the session ends early with a "You went home" message
  3. Arm fatigue meter drains over time; player can switch arms or rest to manage it
  4. When fatigue maxes out, the visibility cone shrinks (sign drooping)
  5. Sign material affects fatigue drain rate (heavier materials drain faster)
**Plans**: Complete (2026-02-14)

Plans:
- [x] 04-01: Confidence meter (display, reaction integration, group size, early exit)
- [x] 04-02: Arm fatigue system (drain, switch arms, rest, material effect, cone shrink) + raise sign mechanic

### Phase 5: Event System
**Goal**: Mid-game events break up the core loop, teach real skills, and add variety — cop checks teach rights, weather tests endurance, karma delivers satisfaction
**Depends on**: Phase 4
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06
**Success Criteria** (what must be TRUE):
  1. A cop check event triggers mid-game with a dialogue overlay; correct first-amendment responses resolve it quickly with a confidence boost
  2. Weather can shift to rain mid-session, visually degrading the sign and causing some NPC protesters to leave
  3. A karma moment event plays out: MAGA truck burnout followed by cop pullover, crowd erupts, confidence spikes
  4. Events overlay on gameplay without fully stopping traffic flow
  5. At least one event triggers per session (timer or threshold-based)
**Plans**: Complete (2026-02-14)

Plans:
- [x] 05-01: Event system framework + cop check event (2026-02-14)
- [x] 05-02: Weather system + rain effects on sign (2026-02-14)
- [x] 05-03: Karma moment event sequence (2026-02-14)

### Phase 6: Score & End Screens
**Goal**: The session has a satisfying conclusion — stats tell the story, the score card is share-worthy, and the activism payload lands
**Depends on**: Phase 5
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04, ACTV-01, ACTV-02, ACTV-03, ACTV-04, REACT-05
**Success Criteria** (what must be TRUE):
  1. End-of-session screen shows full stats: cars reached, reaction breakdown, time stood, sign rating
  2. Score screen is bold, clean, and screenshot-ready with the player's sign message featured
  3. "Play Again" button restarts the game flow
  4. Activism screen follows score: "This was a game. This is also real." with functional resource links
  5. Sound effects differentiate reaction types during gameplay (honk vs angry horn vs diesel)
**Plans**: Complete (2026-02-14)

Plans:
- [x] 06-01: Score screen (stats, shareable card layout, play again) + raise sign tap fix (2026-02-14)
- [x] 06-02: Activism end screen + resource links (2026-02-14)
- [x] 06-03: Sound effects and audio integration (2026-02-14)

### Phase 7: Landing Page, Polish & Deploy
**Goal**: The game is discoverable, polished, and live on the internet — anyone with a link can play
**Depends on**: Phase 6
**Requirements**: INFRA-05, INFRA-06, LAND-01, LAND-02, LAND-03, LAND-04, LAND-05
**Success Criteria** (what must be TRUE):
  1. Landing page at root URL has game branding, tagline, and a clear "Play Now" button
  2. Landing page loads in under 2 seconds on a throttled 3G connection
  3. Total initial game asset payload is under 3MB
  4. Site is deployed to Cloudflare Workers (static assets) and accessible via public URL
  5. Full game flow works end-to-end on a real mobile phone: landing → craft → play → score → activism
**Plans**: TBD

Plans:
- [ ] 07-01: Landing page (branding, CTA, responsive layout)
- [ ] 07-02: Asset optimization + performance audit
- [ ] 07-03: Cloudflare Workers deployment + production config

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffolding & Game Boot | 2/2 | Complete | 2026-02-14 |
| 2. Core Game Loop | 3/3 | Complete | 2026-02-14 |
| 3. Sign Crafting | 2/2 | Complete | 2026-02-14 |
| 4. Game Systems | 2/2 | Complete | 2026-02-14 |
| 5. Event System | 3/3 | Complete | 2026-02-14 |
| 6. Score & End Screens | 3/3 | Complete | 2026-02-14 |
| 7. Landing Page, Polish & Deploy | 0/3 | Not started | - |
