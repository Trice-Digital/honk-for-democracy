# Requirements: Honk For Democracy

**Defined:** 2026-02-14
**Core Value:** The traffic light learning mechanic turns "hold a sign" into a real game with a skill ceiling.

## M1 Requirements (Complete)

All 52 M1 requirements shipped. See MILESTONES.md for summary.

## M2 Requirements

Requirements for Milestone 2: The Sign & The Polish — sign creator, visual/audio polish, social sharing, game tuning.

### Sign Creator

- [ ] **SIGN-10**: Player can choose from multiple font styles for their sign message (e.g., Permanent Marker, block letters, stencil, brush script)
- [ ] **SIGN-11**: Player can pick sign text color from a palette of marker/paint colors
- [ ] **SIGN-12**: Player can select sign material with visual fidelity (cardboard with corrugation texture, posterboard smooth, foam board thick, wood plank)
- [ ] **SIGN-13**: Player can add decorative elements to their sign (glitter accents, duct tape borders, sticker embellishments, drawn stars/hearts)
- [ ] **SIGN-14**: Sign preview renders in real-time as player makes choices (WYSIWYG)
- [ ] **SIGN-15**: Sign creator feels like arts & crafts — tactile, creative, not a form
- [ ] **SIGN-16**: Player's crafted sign (with all customizations) is visible on their character during gameplay
- [ ] **SIGN-17**: Sign creator scene is a full-screen creative tool, not a modal or overlay
- [ ] **SIGN-18**: Material choice visually affects the sign in-game (cardboard looks different from foam board)
- [ ] **SIGN-19**: Player can see their sign from the score screen (featured prominently with customizations intact)

### Visual & UI Polish

- [ ] **VISL-01**: Placeholder graphics replaced with clean SVG or styled graphics for intersection elements (roads, buildings, traffic lights, cars)
- [ ] **VISL-02**: Reaction indicators use clear, distinct icons (not ambiguous placeholders)
- [ ] **VISL-03**: Session timer is clearly visible and player understands when game will end
- [ ] **VISL-04**: Game-end transition is clear — player knows the session ended and why (time, confidence, etc.)
- [ ] **VISL-05**: Controls feel responsive and intuitive — visibility cone rotation is smooth on mobile
- [ ] **VISL-06**: UI elements have consistent visual language (colors, spacing, typography)
- [ ] **VISL-07**: Feedback loops are clear: player action -> visible result -> score change is obvious
- [ ] **VISL-08**: Confidence and fatigue meters have polished visual design with clear state indication
- [ ] **VISL-09**: Event overlays (cop check, weather, karma) have polished visual presentation

### Audio Polish

- [ ] **AUDI-01**: Reaction sounds are balanced — no single sound dominates or is jarring
- [ ] **AUDI-02**: Background ambient layer exists (street noise, distant traffic, birds) that sets the scene
- [ ] **AUDI-03**: Background music loop exists (lo-fi protest energy, not intrusive)
- [ ] **AUDI-04**: Sound design matches emotional arc — confidence-low sounds tense, confidence-high sounds energized
- [ ] **AUDI-05**: Audio transitions are smooth (no pops, clicks, or abrupt cuts)
- [ ] **AUDI-06**: Volume balance is comfortable across all sound layers (music, ambient, SFX)

### Social Share

- [ ] **SHAR-01**: Post-game generates a shareable image: player's sign + score grade + "I protested at honkfordemocracy.org"
- [ ] **SHAR-02**: Shareable image is generated client-side (Canvas API or equivalent, no server)
- [ ] **SHAR-03**: Player can download the shareable image directly to their device
- [ ] **SHAR-04**: Player can trigger native share (Web Share API where supported) with the image
- [ ] **SHAR-05**: Share flow and activism end screen work together — share your sign, then see how to take real action
- [ ] **SHAR-06**: Shareable image looks good on social media (correct dimensions, readable text, clear branding)
- [ ] **SHAR-07**: Share prompt appears naturally in the score-to-activism flow without blocking it

### Debug & Tuning

- [ ] **TUNE-01**: Confidence system values are tuned for satisfying emotional arc (not too easy, not punishing)
- [ ] **TUNE-02**: Fatigue drain rate feels right — strategic rest decisions, not constant annoyance
- [ ] **TUNE-03**: Reaction balance creates varied, believable sessions (not monotonous)
- [ ] **TUNE-04**: Event timing and frequency create surprise without frustration
- [ ] **TUNE-05**: Single intersection map is polished and balanced as THE definitive experience

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### M3 — Maps & NPCs

- **MAP-01**: Overpass map with one-direction highway traffic, wind mechanic, sign design for speed
- **MAP-02**: Park Rally map with crowd mechanics, media, speakers, different energy
- **MAP-03**: Main Street March with walking route, pedestrian interactions
- **MAP-04**: Rush Hour bonus round (any map, 3x traffic, score multiplier)
- **NPC-01**: NPC protesters with personalities (Organizer, Veteran, Newbie)
- **NPC-02**: Counter-protester event with de-escalation dialogue
- **NPC-03**: Media arrives event with sign visibility bonus multiplier
- **NPC-04**: Chant rhythm mini-game with NPC group energy

### M4 — Community

- **COMM-01**: Community sign gallery/voting
- **COMM-02**: Unlockable sign templates from community favorites

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New maps (overpass, rally, march) | M3 — need one perfect map first |
| NPC protesters | M3 — need polish before adding complexity |
| Community gallery/voting | M4 — needs a user base first |
| User accounts / login | Zero friction to play. No signup walls. |
| Server-side storage | Client-side only. No moderation needed. |
| Backend / API / database | Fully static. No server. |
| Multiplayer / online | No backend, massive complexity |
| In-app purchases / ads | This is activism. Monetization poisons the message. |
| Native mobile app | Web-first. Share a link, play immediately. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIGN-10 | Phase 8 | Pending |
| SIGN-11 | Phase 8 | Pending |
| SIGN-12 | Phase 8 | Pending |
| SIGN-13 | Phase 8 | Pending |
| SIGN-14 | Phase 8 | Pending |
| SIGN-15 | Phase 8 | Pending |
| SIGN-16 | Phase 8 | Pending |
| SIGN-17 | Phase 8 | Pending |
| SIGN-18 | Phase 8 | Pending |
| SIGN-19 | Phase 8 | Pending |
| VISL-01 | Phase 9 | Pending |
| VISL-02 | Phase 9 | Pending |
| VISL-03 | Phase 9 | Pending |
| VISL-04 | Phase 9 | Pending |
| VISL-05 | Phase 9 | Pending |
| VISL-06 | Phase 9 | Pending |
| VISL-07 | Phase 9 | Pending |
| VISL-08 | Phase 9 | Pending |
| VISL-09 | Phase 9 | Pending |
| AUDI-01 | Phase 10 | Pending |
| AUDI-02 | Phase 10 | Pending |
| AUDI-03 | Phase 10 | Pending |
| AUDI-04 | Phase 10 | Pending |
| AUDI-05 | Phase 10 | Pending |
| AUDI-06 | Phase 10 | Pending |
| SHAR-01 | Phase 11 | Pending |
| SHAR-02 | Phase 11 | Pending |
| SHAR-03 | Phase 11 | Pending |
| SHAR-04 | Phase 11 | Pending |
| SHAR-05 | Phase 11 | Pending |
| SHAR-06 | Phase 11 | Pending |
| SHAR-07 | Phase 11 | Pending |
| TUNE-01 | Phase 12 | Pending |
| TUNE-02 | Phase 12 | Pending |
| TUNE-03 | Phase 12 | Pending |
| TUNE-04 | Phase 12 | Pending |
| TUNE-05 | Phase 12 | Pending |

**Coverage:**
- M2 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after M2 definition*
