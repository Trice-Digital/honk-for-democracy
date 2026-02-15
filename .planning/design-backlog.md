# Design Backlog — Needs Discussion

**Created:** 2026-02-14
**Status:** Raw brain dump, needs triage with Scott

---

## Needs Design Discussion Before Execution

### Controls (Phase 9.5 candidate — CRITICAL)
- Mobile vs desktop control schemes need real thought
- Can't let GSD guess on this — will be wrong
- Questions: virtual joystick? tap targets? swipe? how does sign aiming work on touch?

### Weather Expansion
- Current: rain, overcast, sunny
- Discussed: heat/hydration mechanic, wind gusts
- Questions: how many weather types? do they affect gameplay or just visuals? how aggressive?

### Events Expansion
- Current event system exists but needs more variety
- Discussed: traffic jams, emergency vehicles, random pedestrians, people giving drinks/snacks
- Questions: frequency? how do they interrupt gameplay? reward/penalty?

### Sign Creator Enhancements
- Discussed: more sizes, materials, material colors
- Questions: how much more? what sizes make sense for gameplay? custom material colors or preset expansion?

### ~~Chants System~~ → Stadium Rally Audio (DECIDED — see Phase 10 section)
- **Direction locked:** Stadium/baseball game style audio cues, not literal chanting
- Reactive layering tied to confidence level — audio IS the reward system
- Remaining questions: exact trigger thresholds, how many layers, Tone.js vs pre-recorded

---

## M3 — New Mechanics (Don't Touch in M2)

### Fellow Protestors (NPCs)
- Interact with other protesters at the intersection
- Would need: NPC spawning, dialogue system, behavior AI
- Big scope — changes the feel from solo to community

### Movement Between Traffic Islands
- Currently player is stationary at one spot
- Moving between islands changes core game loop entirely
- Would need: navigation system, multiple vantage points, strategic positioning

### Wind Gust QTE
- Gust of wind, hold sign with quick time event or lose it
- New mechanic layered on existing fatigue system
- Paper Mario aesthetic fits perfectly (paper blowing away)

### Heat / Hydration
- In hot weather, need to hydrate or suffer penalties
- Would need: hydration meter, drink items, temperature system
- Adds survival layer to the protest experience

### Random Pedestrians
- Foot traffic passing through intersection
- Some interact, some ignore, some hostile
- Would need: pedestrian spawning, pathfinding, interaction system

### People Giving Drinks/Snacks
- Random supporters stop to give you supplies
- Restores fatigue? Boosts confidence?
- Would need: NPC approach behavior, item system

### Traffic Jams / Emergency Vehicles
- Random traffic jam = more exposure time but different car behaviors
- Emergency vehicles = everyone pulls over, brief pause
- Would need: traffic flow state machine updates

### Wind Resistance / Draft from Trucks
- Large vehicles create draft that physically pushes your sign
- Temporary aim penalty — visibility cone wobbles
- Phaser sine tween on sign for 1.5s after truck passes

### Doppler Honk (Procedural Audio)
- Pitch shift on honk as car approaches and passes
- Web Audio API oscillator pitch tied to car x-coordinate
- Phase 10 audio territory

---

## Phase 10 — Audio (Already Scoped in Roadmap)

### Direction: Stadium Rally, Not Literal Protest
**DECIDED:** Audio cues should feel like a baseball game / stadium rally — rhythmic, musical, universal. NOT real crowd chanting or protest recordings. Think organ riffs, clap patterns, drum cadences. Paper Mario does this — music reacts to gameplay.

### Background Music
- Patriotic/folk Americana feel — "This Land Is Your Land" vibe, not military
- **Options:** Kevin MacLeod (CC-BY 4.0, easy), Internet Archive folk (public domain, authentic), or Tone.js procedural (most Paper Mario, most scope)
- Tone.js (MIT) can generate fife-and-drum loops procedurally — fits "everything is handmade" philosophy

### Reactive Audio Cues (replaces "chants")
- Stadium organ riffs (charge!, let's go!, rally stingers)
- Rhythmic clap patterns (stomp-stomp-clap, slow clap → fast)
- Drum cadences — snare roll tension, cymbal crash on big moments
- Cowbell (random timing, because cowbell)
- Whistle blasts
- **Layering system:** Low confidence = sparse (lone cowbell). Build confidence = drum cadence. Hit a streak = full stadium organ. Audio IS the reward system.

### SFX
- Car honks — variety pack per vehicle type, audio sprites for performance
- Doppler honk effect (Tone.js pitch shift tied to car x-position)
- Coal roller soot/rumble sound
- Traffic light change — satisfying clunk + ambient shift (idling vs flowing)
- General intersection ambient (distant traffic, birds, breeze)

### Technical Notes
- Phaser 3 does NOT play MIDI natively — convert MIDI → MP3/OGG offline, or use timidity.js (WebAssembly, MIT)
- Ship OGG + MP3 for every sound (Phaser auto-selects per browser)
- Audio sprites for short SFX (single file + JSON timestamps = fewer HTTP requests)
- **Sources:** Freesound.org (CC0 filter), Incompetech/Kevin MacLeod (CC-BY 4.0), Pixabay (no attribution), Sonniss GameAudioGDC archives (free, professional)
- Tone.js for any procedural/reactive audio

---

## Civic Engagement Layer (Phase 9 Plan 07 + future)

### Post-Game "Now Do It For Real" Screen
- **Embed directly:** Vote.org registration widget (free API), TurboVote (embed-ready + webhooks)
- **One-tap actions:** 5calls.org (has API), Resistbot (text number)
- **Essential links:** ACLU state-specific protest guide, League of Women Voters local chapter finder, Common Cause find-your-rep, USA.gov contact officials
- **Legal support:** NLG Legal Hotline (212) 679-2811

### Loading Screen Tips (ACLU Rights Education)
- "A single person with a sign doesn't need a permit on a public sidewalk"
- "Police can ask you to move for pedestrians, but can't make you leave without cause"
- "You have the right to photograph anything in plain view—including police"
- "Counter-protesters can disagree but can't physically disrupt your protest"
- "Disable fingerprint unlock before protesting—passwords have stronger legal protection"
- State-specific facts: "Did you know in Florida, three people standing together can be called a 'riot'?"

### In-Game Events That Teach Rights
- Cop approaches → what police can/can't ask
- Counter-protester arrives → their rights AND yours
- Recording rights card pickup
- Sources: ACLU state affiliates, NLG "Know Your Risks" booklet, EFF digital security tips

### Non-Partisan Positioning (CRITICAL)
- Democracy ≠ partisan. All resources must be genuinely non-partisan.
- YES: Vote.org, LWV, Common Cause, USA.gov, ACLU, Ballotpedia, iCivics
- NO: Indivisible (progressive), any party-aligned orgs
- Framing: "civic engagement tool that happens to be fun"

---

## Misc Notes
- Landing page should use Scott's OG HONK FOR DEMOCRACY sign photo (captured in Phase 9 spec)
- Marker bleed rain effect (captured in Phase 9 spec)
- Expletive speech bubbles `&*#%#` (captured in Phase 9 spec)
