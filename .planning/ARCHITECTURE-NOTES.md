# Architecture & Design Notes

Captured during design session (2026-02-14). These inform how phases are planned and executed.

---

## Architecture-First Mandate

**Phase 2 must build a reusable game engine, not just "make the intersection work."**

The following must be shared systems, not per-feature hacks:

- **Game state manager** — Single source of truth: confidence, fatigue, score, time, weather, difficulty config. All systems read/write here.
- **Entity system** — Cars, protesters, signs as reusable entities. Same car entity works on any map.
- **Traffic system** — Data-driven. Light patterns, car spawning, lane definitions are CONFIG, not code. The Intersection is the first config. The Overpass is a second config loaded into the same engine later.
- **Reaction system** — Reaction types, scoring, visual feedback, probability weights. Shared across all maps.
- **Event system** — Pluggable events that fire on any map. Cop check, weather, karma = event plugins, not hardcoded sequences.
- **Input handler** — The swipe/arc aim mechanic. One implementation, works everywhere.
- **UI overlay system** — Confidence meter, fatigue bar, score, timer. Consistent and reusable.
- **Scene manager** — Clean Phaser scene flow: Menu → Sign Crafting → Gameplay → Score → Resources. Reusable shells, not one-offs.

**Why this matters:** Without this, every future map/feature/event reinvents the wheel. With it, adding the Overpass in v2 is just a new config file + art assets.

---

## Difficulty as Config Multiplier

**Everyone experiences the same mechanics and events.** Difficulty dials tuning knobs, not feature toggles.

### Difficulty Tiers (Themed)

| Tier | Label | Vibe |
|------|-------|------|
| Easy | "First Time Out" | Your first protest. Manageable. |
| Medium | "Regular" | The real experience. Balanced. |
| Hard | "Rush Hour" | Sunday 4-6 PM on the overpass. Chaos. |

### What Difficulty Dials

| System | Easy | Medium | Hard |
|--------|------|--------|------|
| Traffic speed | Slow | Normal | Fast |
| Traffic density | Light | Normal | Heavy |
| Light cycle | Long, simple | Standard | Short, complex |
| Reaction ratios | More friendly | Balanced | More hostile |
| Event frequency | Low | Normal | High |
| Event intensity | Gentler | Standard | Full chaos |
| Arm fatigue drain | Slow | Normal | Fast |
| Sign weather durability | Forgiving | Normal | Harsh |

**Implementation:** A `DifficultyConfig` object that multiplies base values. Systems don't know about difficulty — they just read their config. Swapping difficulty = swapping one config object.

**No mechanic is hidden from any difficulty.** A boomer on "First Time Out" still gets arm fatigue (slower), still gets the cop check (less pressured), still gets the coal roller. The events ARE the message — everyone sees them.

### Unlock Flow (v1 nice-to-have, v2 if needed)

First Time Out → unlocks Regular → unlocks Rush Hour. Mirrors real protester progression.

---

## Phaser Research Needed

Before Phase 2 planning, research:

- **Phaser 3 + Astro integration patterns** — Best practices for embedding Phaser in an Astro page, asset loading, lifecycle management
- **Top-down game architecture in Phaser** — Entity patterns, scene management, input handling for rotation mechanics
- **Mobile touch game patterns** — Preventing browser gestures, touch-drag for rotation, performance on low-end phones
- **Data-driven game config** — How to structure map configs, difficulty configs, event configs in Phaser
- **Asset pipeline** — Sprite sheets, shared palettes, loading strategies for <3MB budget

---

## Deployment: Cloudflare Workers (Not Pages)

**Pages is deprecated / merging into Workers.** New projects should deploy to Cloudflare Workers with static asset support from the start.

- Astro builds to static output → served via Workers static assets
- `wrangler.jsonc` config with `assets` directory pointing to Astro build output
- Custom domain via Workers route or custom domain binding
- If server-side needs arise later, we're already on Workers — no migration needed

---

## Viewport Strategy: Hybrid Flex + Side Panels

**Decision:** Game works across all screen sizes with a flexible aspect ratio AND optional desktop side panels.

### Breakpoint Behavior

| Context | Aspect Ratio | Behavior |
|---------|-------------|----------|
| Phone portrait | ~9:16 | Full game canvas, UI overlaid on game world. Tight, intense. |
| Tablet / small desktop | ~3:4 to ~4:3 | Game world expands wider, more intersection visible. No side panels. |
| Wide desktop | 16:9+ | Game world fills center, side panels appear (score feed, sign preview, reactions). |

### Implementation Rules

- **Phaser EXPAND scaling mode** instead of FIT — game world grows to fill available space, no letterboxing
- **Minimum playable area = 720x1280** — everything within this rect works on any device
- **Extra world space is bonus visibility** — wider screens see more intersection, not stretched graphics
- **Side panels are Astro/HTML, not Phaser** — they read game state but render outside the canvas. Clean DOM separation.
- **Panels are progressive enhancement** — game is 100% playable without them. They appear when viewport width exceeds ~1200px.
- **Game state emits events** (score change, reaction, fatigue) → panels subscribe. One-way data flow.

### What This Means for Phase 2

- Intersection map must be larger than minimum viewport (design for ~1920x1280 world, camera shows what fits)
- Camera follows player or centers on intersection based on available space
- UI overlay elements (confidence meter, timer, score) anchor to viewport edges, not world coordinates
- Touch input works identically regardless of viewport size

---

## Visual Style Direction

- **Flat illustration** with thick outlines
- **Limited palette:** American flag blue/red/white + road grays + cardboard brown
- **Hand-drawn energy** for signs and text (Permanent Marker font)
- **Clean modern UI** around the game canvas
- **Emojis as reaction indicators** — 👋 ✊ 📯 🖕 popping off cars. Used as game feedback, NOT as art style.
- Think: newspaper editorial cartoon meets indie mobile game

---

## Sign Design by Map Context

| Map | Sign Style | Why |
|-----|-----------|-----|
| Intersection | Clever, wordy, detailed | Cars stopped at lights, time to read |
| Overpass | BIG block letters, 3-4 words max | 65mph, 2-second window |
| Park Rally | Creative, artistic, expressive | Crowd validates, media photographs |
| Main Street | Double-sided, portable | Walking, both directions matter |

For v1 (Intersection only): sign crafting can allow longer messages. Readability score not critical at intersection speed.

---

*Notes from Monks booth design session, Valentine's Day 2026.*
