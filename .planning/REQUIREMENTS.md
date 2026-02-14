# Requirements: Honk For Democracy

**Defined:** 2026-02-14
**Core Value:** The traffic light learning mechanic turns "hold a sign" into a real game with a skill ceiling.

## v1 Requirements

Requirements for Milestone 1: The Intersection — full core loop playable and deployed.

### Infrastructure

- [ ] **INFRA-01**: Astro 5.x project scaffolded with TypeScript
- [ ] **INFRA-02**: Phaser 3.90.0 boots and renders in an Astro page
- [ ] **INFRA-03**: Game canvas fills mobile screen (portrait, FIT mode, 720x1280 base)
- [ ] **INFRA-04**: Touch input captured without triggering browser gestures (scroll, zoom, back-swipe)
- [ ] **INFRA-05**: Site deployed to Cloudflare Pages with custom domain support
- [ ] **INFRA-06**: Total initial asset payload under 3MB
- [ ] **INFRA-07**: Loading screen displays while assets load

### Sign Crafting

- [ ] **SIGN-01**: Player can select sign material from options (cardboard, posterboard, foam board)
- [ ] **SIGN-02**: Player can type a custom message on their sign
- [ ] **SIGN-03**: Material choice affects sign durability (how fast weather degrades it)
- [ ] **SIGN-04**: Message affects crowd reaction multiplier (longer/wittier = better, but map-appropriate)
- [ ] **SIGN-05**: Player sees a preview of their completed sign before starting gameplay
- [ ] **SIGN-06**: Player's sign is visible on the player character during gameplay

### Core Gameplay

- [ ] **GAME-01**: Top-down intersection map renders with four-way roads and traffic lights
- [ ] **GAME-02**: Player character stands near-center of intersection holding their sign
- [ ] **GAME-03**: Player drags/swipes to rotate visibility cone (one-finger, arc gesture)
- [ ] **GAME-04**: Visibility cone is visually indicated on screen (semi-transparent arc)
- [ ] **GAME-05**: Cars spawn from roads based on traffic light state (green direction = cars flowing)
- [ ] **GAME-06**: Traffic light cycle is deterministic and repeating (learnable pattern)
- [ ] **GAME-07**: Cars that pass through visibility cone are "reached" and generate reactions
- [ ] **GAME-08**: Cars outside visibility cone pass without reaction (missed opportunity)
- [ ] **GAME-09**: Session has a fixed duration timer (e.g., 3-5 minutes)
- [ ] **GAME-10**: Player can see traffic lights on screen changing colors

### Reactions

- [ ] **REACT-01**: Reached cars produce reactions from weighted probability: wave (+5), honk (+10), go bananas (+25 combo), nothing (0), thumbs down (-5), middle finger (-10), yelled at (-15), coal roller (-20)
- [ ] **REACT-02**: Reaction icons pop visually from reacting cars (emoji or illustrated icons)
- [ ] **REACT-03**: Score floaters appear on screen (+5, +10, -10, etc.) with color coding
- [ ] **REACT-04**: Running score is displayed on screen during gameplay
- [ ] **REACT-05**: Sound effects differentiate positive vs negative reactions (honk sounds, angry sounds)

### Confidence Meter

- [ ] **CONF-01**: Confidence meter displays on screen (0-100%, starts at ~30%)
- [ ] **CONF-02**: Positive reactions increase confidence (scaled by reaction value)
- [ ] **CONF-03**: Negative reactions decrease confidence
- [ ] **CONF-04**: Long streaks of no reaction slowly drain confidence
- [ ] **CONF-05**: NPC group size affects confidence (more people = higher baseline)
- [ ] **CONF-06**: If confidence hits 0%, session ends early ("You went home early")
- [ ] **CONF-07**: Confidence meter bar animates smoothly on changes

### Arm Fatigue

- [ ] **FATG-01**: Arm fatigue meter displays on screen (drains over time)
- [ ] **FATG-02**: Player can tap to switch arms (brief animation, resets some fatigue)
- [ ] **FATG-03**: Player can rest (sign drops temporarily, reduced visibility, fatigue recovers)
- [ ] **FATG-04**: Sign material affects fatigue drain rate (heavier = faster drain)
- [ ] **FATG-05**: When fatigue is maxed, visibility cone shrinks (sign drooping)

### Events

- [ ] **EVNT-01**: Cop check event triggers mid-game: dialogue overlay with first amendment rights options
- [ ] **EVNT-02**: Correct cop check responses = quick resolution + confidence boost; wrong = confidence drain
- [ ] **EVNT-03**: Weather shift event: rain starts, affecting sign durability and some NPC protesters leave
- [ ] **EVNT-04**: Rain visually degrades sign appearance over time (ink running effect)
- [ ] **EVNT-05**: Karma moment event: MAGA truck burnout followed by cop pulling them over, crowd celebration, major confidence spike
- [ ] **EVNT-06**: Events overlay on gameplay without fully pausing traffic flow

### Score Screen

- [ ] **SCOR-01**: End-of-session score screen shows: cars reached, reaction breakdown (honks, waves, bananas, fingers, coal rollers), time stood, sign rating
- [ ] **SCOR-02**: Score screen is styled as a shareable card (bold, clean, screenshot-ready)
- [ ] **SCOR-03**: Score screen includes player's sign message
- [ ] **SCOR-04**: Score screen has a "Play Again" button

### Activism End Screen

- [ ] **ACTV-01**: After score screen, activism resource screen displays: "This was a game. This is also real."
- [ ] **ACTV-02**: Resource links include: register to vote, find a protest, contact your representatives, know your rights, find local organizations
- [ ] **ACTV-03**: Links are real, maintained, functional URLs
- [ ] **ACTV-04**: Screen has clear visual transition from game to activism (deliberate tone shift)

### Landing Page

- [ ] **LAND-01**: Landing page at root URL with game branding (title, tagline, visual identity)
- [ ] **LAND-02**: Clear "Play Now" call-to-action button
- [ ] **LAND-03**: Brief description of what the game is (1-2 sentences)
- [ ] **LAND-04**: Mobile-responsive layout
- [ ] **LAND-05**: Page loads fast (<2 seconds on 3G)

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Additional Maps

- **MAP-01**: Overpass map with one-direction highway traffic, wind mechanic, sign design for speed
- **MAP-02**: Park Rally map with crowd mechanics, media, speakers, different energy
- **MAP-03**: Main Street March with walking route, pedestrian interactions
- **MAP-04**: Rush Hour bonus round (any map, 3x traffic, score multiplier)

### Enhanced Features

- **ENH-01**: Drag-and-drop sign builder with positioning of materials
- **ENH-02**: Canvas-rendered shareable image generation for score cards
- **ENH-03**: Counter-protester event with full de-escalation dialogue tree
- **ENH-04**: Media arrives event with sign visibility bonus multiplier
- **ENH-05**: Chant rhythm mini-game (timing-based group energy mechanic)
- **ENH-06**: Community sign voting and unlockable templates
- **ENH-07**: Multiple protest session types (morning, afternoon, evening lighting)
- **ENH-08**: Progressive difficulty / level system across sessions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiplayer / online | No backend, massive complexity, not core experience |
| User accounts / login | Zero friction to play. No signup walls. |
| Leaderboards | Requires backend, competition conflicts with cooperation message |
| In-app purchases / ads | This is activism. Monetization poisons the message. |
| 3D graphics | Performance killer on mobile, flat 2D is the art direction |
| AI-generated signs | Removes creative expression, adds dependency |
| Tutorial popups | Teach through play, not walls of text |
| Backend / API / database | Fully static. No server. |
| Native mobile app | Web-first. Share a link, play immediately. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 7 | Pending |
| INFRA-06 | Phase 7 | Pending |
| INFRA-07 | Phase 1 | Pending |
| SIGN-01 | Phase 3 | Pending |
| SIGN-02 | Phase 3 | Pending |
| SIGN-03 | Phase 3 | Pending |
| SIGN-04 | Phase 3 | Pending |
| SIGN-05 | Phase 3 | Pending |
| SIGN-06 | Phase 3 | Pending |
| GAME-01 | Phase 2 | Pending |
| GAME-02 | Phase 2 | Pending |
| GAME-03 | Phase 2 | Pending |
| GAME-04 | Phase 2 | Pending |
| GAME-05 | Phase 2 | Pending |
| GAME-06 | Phase 2 | Pending |
| GAME-07 | Phase 2 | Pending |
| GAME-08 | Phase 2 | Pending |
| GAME-09 | Phase 2 | Pending |
| GAME-10 | Phase 2 | Pending |
| REACT-01 | Phase 2 | Pending |
| REACT-02 | Phase 2 | Pending |
| REACT-03 | Phase 2 | Pending |
| REACT-04 | Phase 2 | Pending |
| REACT-05 | Phase 6 | Pending |
| CONF-01 | Phase 4 | Pending |
| CONF-02 | Phase 4 | Pending |
| CONF-03 | Phase 4 | Pending |
| CONF-04 | Phase 4 | Pending |
| CONF-05 | Phase 4 | Pending |
| CONF-06 | Phase 4 | Pending |
| CONF-07 | Phase 4 | Pending |
| FATG-01 | Phase 4 | Pending |
| FATG-02 | Phase 4 | Pending |
| FATG-03 | Phase 4 | Pending |
| FATG-04 | Phase 4 | Pending |
| FATG-05 | Phase 4 | Pending |
| EVNT-01 | Phase 5 | Pending |
| EVNT-02 | Phase 5 | Pending |
| EVNT-03 | Phase 5 | Pending |
| EVNT-04 | Phase 5 | Pending |
| EVNT-05 | Phase 5 | Pending |
| EVNT-06 | Phase 5 | Pending |
| SCOR-01 | Phase 6 | Pending |
| SCOR-02 | Phase 6 | Pending |
| SCOR-03 | Phase 6 | Pending |
| SCOR-04 | Phase 6 | Pending |
| ACTV-01 | Phase 6 | Pending |
| ACTV-02 | Phase 6 | Pending |
| ACTV-03 | Phase 6 | Pending |
| ACTV-04 | Phase 6 | Pending |
| LAND-01 | Phase 7 | Pending |
| LAND-02 | Phase 7 | Pending |
| LAND-03 | Phase 7 | Pending |
| LAND-04 | Phase 7 | Pending |
| LAND-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after initial definition*
