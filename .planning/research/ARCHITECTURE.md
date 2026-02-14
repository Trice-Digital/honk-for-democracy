# Architecture Patterns

**Domain:** Mobile-first web game (Astro + Phaser 3)
**Researched:** 2026-02-14

## Recommended Architecture

Two distinct layers with clean separation:

```
┌─────────────────────────────────────────────┐
│              ASTRO SITE SHELL               │
│  Landing page, About, Resources, Game page  │
│  Static HTML + minimal JS                   │
└─────────────┬───────────────────────────────┘
              │ <div id="game-container">
              ▼
┌─────────────────────────────────────────────┐
│            PHASER GAME ENGINE               │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Sign    │  │Intersect │  │  Score   │  │
│  │ Crafting │→ │ Gameplay │→ │  Screen  │  │
│  │  Scene   │  │  Scene   │  │  Scene   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                     │                       │
│        ┌────────────┼────────────┐          │
│        ▼            ▼            ▼          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Traffic  │ │ Reaction │ │  Event   │   │
│  │ Manager  │ │  System  │ │  System  │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│        │            │            │          │
│        ▼            ▼            ▼          │
│  ┌──────────────────────────────────────┐  │
│  │         GAME STATE MANAGER           │  │
│  │  score, confidence, fatigue, weather │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Astro Site Shell** | Static pages, routing, layout, meta tags, social sharing | Phaser (via game container div) |
| **Sign Crafting Scene** | Material selection, message input, sign preview | Game State (sign properties) |
| **Intersection Scene** | Core gameplay — traffic, aiming, reactions, events | All game systems |
| **Score Scene** | End-of-session stats, shareable card, activism links | Game State (read final stats) |
| **Traffic Manager** | Traffic light cycles, car spawning, car movement paths | Intersection Scene |
| **Reaction System** | Determines car reactions based on sign + aim + randomness | Traffic Manager, Game State |
| **Event System** | Cop check, weather, karma moment triggers and handlers | Game State (confidence thresholds) |
| **Game State Manager** | Central state: score, confidence, fatigue, weather, sign | All systems (read/write) |

### Data Flow

```
Player Input (touch drag)
  → Visibility Cone rotation
  → Traffic Manager checks which cars are in cone
  → Reaction System rolls reactions for visible cars
  → Reactions update Game State (score, confidence)
  → Visual feedback (emoji pops, score floaters, meter animations)
  → Event System checks thresholds, triggers events
  → Events modify Game State (confidence, weather, group size)
  → Loop continues until session timer ends
  → Score Scene reads final Game State
```

## Phaser Scene Structure

Phaser's scene system is the natural unit of organization:

```typescript
// Scene flow
BootScene        → Load assets, show loading bar
SignCraftScene   → Material picker + message input → produces SignConfig
IntersectionScene → Core gameplay loop
ScoreScene       → Stats display + share card + activism links
```

Each scene is self-contained with its own `preload()`, `create()`, `update()` lifecycle.

## Patterns to Follow

### Pattern 1: Centralized Game State
**What:** Single GameState object passed between scenes via Phaser's scene data or a registry.
**When:** Always. Every system needs to read/write shared state.
**Example:**
```typescript
interface GameState {
  sign: { material: string; message: string; durability: number; multiplier: number };
  score: number;
  confidence: number;     // 0-100
  armFatigue: number;     // 0-100
  activeArm: 'left' | 'right';
  weather: WeatherState;
  groupSize: number;
  timeRemaining: number;
  events: CompletedEvent[];
  reactions: ReactionTally;
}
```

### Pattern 2: Event-Driven Game Systems
**What:** Systems communicate via Phaser's EventEmitter, not direct calls.
**When:** Cross-system communication (reaction triggers confidence change, weather triggers fatigue change).
**Example:**
```typescript
// Reaction system emits
this.events.emit('reaction', { type: 'honk', value: 10 });

// Confidence meter listens
this.events.on('reaction', (data) => {
  this.gameState.confidence += data.value * confidenceScale;
});
```

### Pattern 3: Configuration-Driven Traffic
**What:** Traffic light patterns, car spawn rates, reaction probabilities — all defined in config objects, not hardcoded.
**When:** Always. Enables tuning without code changes, prepares for multiple maps.
**Example:**
```typescript
const INTERSECTION_CONFIG = {
  lightCycle: [
    { direction: 'north-south', duration: 30, type: 'green' },
    { direction: 'north-south', duration: 5, type: 'yellow' },
    { direction: 'east-west', duration: 25, type: 'green' },
    { direction: 'east-west', duration: 5, type: 'yellow' },
    { direction: 'east-west', duration: 15, type: 'left-arrow' },
  ],
  spawnRate: { min: 800, max: 2000 },  // ms between cars
  reactionWeights: {
    wave: 0.25, honk: 0.15, bananas: 0.05,
    nothing: 0.30, thumbsDown: 0.10, finger: 0.08,
    coalRoller: 0.02, yelledAt: 0.05,
  },
};
```

### Pattern 4: Separate Game Code from Astro Code
**What:** All game logic lives in `src/game/`, all Astro pages in `src/pages/`. No game logic in Astro components, no Astro imports in game code.
**When:** Always. Clean boundary.
```
src/
  game/              ← Phaser-only code
    main.ts          ← Game boot function
    scenes/          ← Phaser scenes
    systems/         ← Traffic, reactions, events, state
    config/          ← Map configs, reaction weights
    assets/          ← Sprites, audio, fonts
  pages/             ← Astro pages
    index.astro      ← Landing page
    play.astro       ← Game page (hosts game-container div)
    resources.astro  ← Activism resource links
  layouts/           ← Astro layouts
  components/        ← Astro UI components (nav, footer)
  styles/            ← Global CSS
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Phaser Inside a React/Vue Component
**What:** Wrapping Phaser in a framework component island
**Why bad:** Unnecessary framework overhead, lifecycle conflicts, Phaser manages its own DOM. Islands are for interactive UI components, not full game engines.
**Instead:** Plain `<script>` tag in Astro page imports and boots Phaser directly.

### Anti-Pattern 2: Game State in Astro
**What:** Trying to share state between Astro components and Phaser
**Why bad:** Astro renders on the server/at build time. Phaser runs on the client. State sync is a nightmare.
**Instead:** All game state lives in Phaser. Astro pages are static shells.

### Anti-Pattern 3: One Giant Scene
**What:** Putting sign crafting, gameplay, and scoring all in one Phaser scene
**Why bad:** Unmanageable complexity, can't easily transition between phases, hard to test.
**Instead:** Separate scenes with clean data handoff.

### Anti-Pattern 4: Hardcoded Game Tuning
**What:** Magic numbers scattered through game logic (reaction rates, timing, thresholds)
**Why bad:** Tuning is iterative. Finding numbers buried in code is painful.
**Instead:** Configuration objects with all tunable values in one place.

## Scalability Considerations

| Concern | At Launch | At 10K Players | At Viral |
|---------|-----------|----------------|----------|
| Hosting | CF Pages free tier | Still free tier (static files) | Still free tier (CDN scales) |
| Performance | FIT mode handles phones | Same | Same — all client-side |
| Sharing | Screenshot + paste | Same | May want canvas-rendered share images |
| Analytics | None needed | Simple page analytics | CF Analytics or Plausible |

No backend means no scaling concerns. The game is fully client-side. Cloudflare's CDN handles traffic spikes. This is the beauty of static.

## Sources

- Phaser 3 Scene API: Context7 docs (HIGH confidence)
- Phaser 3 Event system: Context7 docs (HIGH confidence)
- Astro islands architecture: Context7 docs (HIGH confidence)
- Phaser + static site integration: Pattern derived from Astro client script docs + Phaser parent config (HIGH confidence)
