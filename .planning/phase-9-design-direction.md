# Phase 9 Design Direction: "Paper Mario Protest"

**Locked:** 2026-02-14
**Decided by:** Scott + Zoey
**Reference:** Paper Mario aesthetic — everything looks like paper cutouts on a craft table

---

## Art Direction

**Core concept:** The entire game world is made of paper, cardboard, and craft supplies. The sign creator already IS this — you're literally making a paper sign. Now the whole world matches.

**Key principles:**
- Flat 2D paper cutouts with offset drop shadows (no blur — like paper lifted off a table)
- Scissor-cut edges on SVG assets (slightly imperfect, not perfectly straight)
- Construction paper color palette — warm, muted, handmade feel
- Slight wobble/bounce on idle objects (paper catching the breeze)
- Hand-drawn marker aesthetic on UI text and borders

---

## Asset Sources (Free/Open Source SVGs)

### Emoji (Sign Creator + Reactions)
- **OpenMoji** (CC BY-SA 4.0) — 4,000+ emoji as SVGs. Black outlines fit paper cutout style. `npm install openmoji`
- **Twemoji** (CC-BY 4.0) — 3,600+ emoji SVGs. Twitter's set.
- **Noto Emoji** (Apache 2.0) — Google's full Unicode set. Most permissive license.

### Vehicles & Game Props
- **Game-icons.net** (CC BY 3.0 / CC0) — 4,170+ game-focused icons. Monochrome, iconic — perfect for paper cutout.
- **UXWing** (Free, no attribution) — Car/truck side-views, buildings, trees.
- **SVG Repo** (CC0/MIT varies) — Massive library. Side-view vehicles, traffic lights, buildings.

### Characters
- **SVG Silh** (CC0) — 131+ stick figures in poses. Paper protester base.
- **FreeSVG.org** (CC0) — Stick figures, paper dolls, silhouettes.

### General UI Icons
- **Lucide** (ISC) — 1,000+ consistent stroke-based icons. `npm install lucide`
- **Bootstrap Icons** (MIT) — 2,000+ general purpose. `npm install bootstrap-icons`

---

## Asset Priorities (SVG Paper Cutouts)

### Cars (highest impact upgrade — replaces colored rectangles)
- Sedan, SUV, Truck, Pickup — side-view paper cutouts
- Each has paper texture fill + scissor-cut outline
- Drop shadow underneath suggesting they're "standing up"
- Coal roller truck gets crumpled gray paper smoke puffs
- Paper wobble animation when passing (like catching wind)

### Player Character
- Paper person holding paper sign (the Fabric.js sign fits naturally)
- Arm fatigue = sign physically droops (tilt angle increases)
- Sign rotates/turns with character facing direction
- Simple but expressive — think Paper Mario partners

### Intersection / Environment
- Layered paper backdrop with subtle parallax:
  - Foreground: curb, sidewalk (lighter paper)
  - Mid-ground: road, lane markings (masking tape strips, not painted lines)
  - Background: buildings, trees, sky (layered construction paper)
- Each layer slightly different shade/texture
- Harford County touches welcome but not required (Rt 22 sign, etc.)

### Traffic Light
- Paper cutout on a popsicle stick
- Lights GLOW through the paper (like holding construction paper up to a lamp)
- Phaser post-FX bloom on active light, muted on inactive

### Reactions & Speech Bubbles
- Paper speech bubbles that pop up and flutter away
- Honks, thumbs up, middle fingers — marker-drawn style
- Expletive bubbles: `&*#%#` style censored swearing from angry drivers
- Positive = warm colors, negative = red/gray
- Float up and fade like paper in the wind

### Weather Overlays
- Rain: paper teardrop cutouts falling + marker bleed effect on sign (slow blur shader)
- Overcast: gray paper layer sliding across top (desaturated vellum overlay)
- Sunny: warm yellow tint, high contrast
- Camera color grading tint per weather type (WeatherSystem already exists)

---

## UI Polish

### In-Game Clock (NEW)
- Paper cutout analog clock face
- Game starts at 10:00 AM, ends at 12:00 PM (clock hands animate over game duration)
- Replaces or supplements the numeric timer
- Craft aesthetic: clock drawn with markers, popsicle stick mount

### In-Game Menu Button (NEW)
- Hamburger or gear icon (paper cutout style)
- Opens overlay with: Settings, Restart, Quit to Title
- Must not obstruct gameplay — corner placement

### Sign Creator (existing — polish, don't rebuild)
- Already fits the paper world perfectly
- Add: subtle paper texture to the editor background
- Add: scissor-cut border around the canvas area
- Font/color/material pickers already work — just visual polish

### Event Dialogue UI (RESKIN + BUG FIX)
- Current mouseover hitboxes don't align with visual elements — FIX
- Reskin to match paper aesthetic (speech bubbles, marker fonts, cardboard panels)

### HUD / Overlays
- Neobrutalist buttons: chunky, hard black shadows, high contrast
- Hand-drawn wobble filter on UI borders (SVG filter)
- Fatigue indicator: arm icon that physically droops + turns red
- Confidence bar: polish existing bar with paper texture fill
- Score: marker-font numbers, slight bounce on increment

### Traffic Light Bloom
- Phaser PostFX pipeline or simple glow sprite
- Light change should feel significant — brief camera pulse

### Overall UI Cohesion
- All HUD elements should feel like they belong on the same craft table
- Consistent use of paper textures, marker fonts, drop shadows across ALL UI

---

## Landing Page ("The Staging Area")
- **Replicate Scott's sign style** — NOT the actual photo. Black board, white letters, "HONK / FOR / DEMOCRACY" each word on its own line. Reference images in inspirations folder for the vibe.
- Protest poster aesthetic — bold, high contrast
- Single massive "STAND UP" CTA button
- Paper texture background
- Keep it simple — one screen, one action

---

## Social Share Card (Phase 11, but design now)
- Polaroid-style layout:
  - Top: Player's crafted sign (PNG from Fabric.js)
  - Middle: "I stood my ground at [Intersection Name]"
  - Bottom: Score + grade + "HonkForDemocracy.org" in stencil font
- Tape SVG on top corner (stuck to social feed)
- Screenshot-ready, social-media-optimized dimensions

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Asphalt | #3a3a3a | Road, dark backgrounds |
| Cardboard | #c5a059 | UI panels, sign materials |
| Construction Paper White | #f5f0e8 | Light surfaces, paper |
| Marker Black | #1a1a1a | Outlines, text shadows |
| Safety Yellow | #fbbf24 | Score, highlights, traffic light |
| Stoplight Red | #ef4444 | Danger, fatigue, negative reactions |
| Stoplight Green | #22c55e | Go, positive reactions, confidence |
| Action Blue | #3b82f6 | Buttons, CTAs, interactive elements |
| Craft Brown | #92400e | Popsicle sticks, sign poles |

---

## Animation & Texture Notes

- **Popsicle stick pivot:** Cars don't rotate smoothly — they flip/wobble on a center axis, like paper glued to a stick.
- **Cardboard fiber grain overlay:** Low-opacity paper grain texture across the entire Phaser canvas. Kills digital flatness.
- **Masking tape lane markings:** Road lanes are strips of white masking tape, not painted lines.
- **Arm crease at fatigue:** At 70%+ fatigue, the paper arm develops a visible fold/crease at the elbow before drooping.
- **Displacement map for UI wobble:** Use Phaser displacement map for "boiling line" effect on UI borders.
- **Wind catch on cars:** When a car enters the sign's visibility cone, 5-degree tilt-and-back animation.
- **Weather blends:** Rain = blue tint + paper teardrops + marker bleed. Overcast = desaturated vellum overlay. Sunset = warm orange multiply blend.
- **"Protest diorama" framing:** We're not building a sim — we're building a tabletop diorama you operate.

---

## Traffic Light Emphasis (make it a NOTICEABLE mechanic)

The traffic light cycle is the core strategic layer: red = cars stopped = max exposure, green = cars zip by = low exposure. Currently it feels like background furniture. Fix that:

- **Visual drama on light change:** Bloom/glow-through-paper effect + brief camera pulse or flash. Light changes should feel like an EVENT.
- **Score multiplier during red:** Show "STOPPED TRAFFIC" banner or visible x2 indicator. Players instantly connect red = big points.
- **Car behavior contrast:** Stopped cars visibly react more (emoji faces turn toward sign?). Moving cars barely glance. Reaction density difference should be obvious.
- **Fatigue strategy hint:** Subtle UI cue — fatigue bar turns green during red lights ("push now"), yellow during green ("conserve"). Teaches the rhythm without a tutorial.
- **Audio cue (Phase 10):** Light change sound + ambient difference between idling vs flowing traffic.

Casual players won't notice — they hold sign and score. Second playthrough, the pattern clicks. Good depth without gatekeeping.

---

## Intersection Design (V1)

**Layout:** Basic 4-way intersection, 2-lane road each direction. Sidewalks on all sides. Buildings/trees on corners for visual framing.

**Why this scale:**
- 4-way gives traffic from multiple directions = strategic sign positioning
- 2 lanes keeps it readable at a glance, especially mobile
- Clean red/green cycle without complex turn arrows or multi-phase lights
- Room for cars to queue 4-5 deep at red lights (important for traffic light mechanic)

**Space & scale:**
- Current game scale feels right — keep it. Minor tweaks through playtesting.
- Cars need long approach distance (see them coming, anticipate)
- Sidewalk wide enough for player + fellow protestors + passing pedestrians
- On desktop: fills screen comfortably. Mobile: crops tighter but intersection stays same size.

**Environmental dressing (corners):**
- Buildings with paper cutout facades
- Trees (construction paper canopy circles)
- Small details: bus stop bench, newspaper box, fire hydrant, trash can
- Frames the action without cluttering it
- One intersection done well for MVP. Different locations = M3 content.

**Mockup reference:** mockups/paper-mario-style.html (note: mockup is compressed for display — actual game has more breathing room per current implementation)

---

## Mockup Review Notes (post-review corrections)

- **People/car avatars = face emoji ONLY.** No hand gestures on avatars. Just 😤😊😠😐 etc. Hand gestures (🤘✊🖕) go in speech bubbles only.
- **Ditch circle-body for people.** Don't render a circle body with a face on top. Instead: just the face emoji itself, sized up (~32-48px), with a paper cutout drop shadow for depth. Simpler, reads better at game scale.
- **Player's sign shows their ACTUAL crafted sign** — the Fabric.js PNG export, not placeholder text. That's the entire point of the sign creator.
- **Reactions are expandable** — don't hardcode a fixed set. Start with basics (honk, thumbs up, expletives, middle finger) and the system should support adding more.
- **One intersection for MVP** — nail one location, ship it. Different intersections/locations = M3 content variety. Architecture should support swappable intersection configs.
- **Side-profile vehicles** reserved for non-gameplay contexts only (score screen, landing page, share card).

---

## What NOT to do in Phase 9
- Don't rebuild the sign creator UI (it works)
- Don't add new game mechanics (QTEs, hydration, NPC interactions, etc.)
- Don't build a global stats backend
- Don't create a full map — we're intersection-level
- Don't over-engineer the confidence meter metaphor
- Don't implement controls rework (Phase 9.5 — needs design discussion first)
- Focus: visual upgrade of EXISTING systems, not new features

---

## Execution Notes for GSD
- SVG assets should be inline-able (no external sprite sheets needed for v1)
- Paper textures can be procedural (like signMaterials.ts already does)
- Drop shadows: CSS-style offset (2-3px right, 2-3px down, dark, no blur)
- Wobble: simple sine-wave rotation on idle objects (amplitude: 1-2 degrees)
- This is a POLISH phase — every system exists, we're skinning it
