# Testing Patterns

**Analysis Date:** 2026-02-15

## Test Framework

**Current Status:**
- No test framework configured
- No test files present in `src/` directory
- TypeScript strict mode enabled; compiler type checking provides foundational coverage
- Manual testing via `npm run dev` (dev server)

**Potential Frameworks:**
- Jest, Vitest, or Mocha could be integrated but not currently in use
- Canvas/Node test environment would be needed for Phaser 3 game testing

**Run Commands (when testing infrastructure is added):**
```bash
npm test              # Run all tests (not configured)
npm run test:watch   # Watch mode (not configured)
npm run test:coverage # Coverage report (not configured)
```

## Development Testing Approach

**Current Strategy:**
- Local dev server: `npm run dev` → http://localhost:4321
- Manual gameplay testing in browser
- TypeScript compiler catches type errors at build time
- Browser DevTools console logs validation:
  - Prefixed messages: `[HFD]`, `[ScoreScene]`, `[SignCraftScene]`
  - Warnings for configuration issues
  - Errors for promise-based operations

**Debug Tools:**
- DebugOverlay class (`src/game/systems/DebugOverlay.ts`) provides in-game debugging
- Console warnings for out-of-range config values
- Scene initialization logs confirm system setup

## Code Patterns That Facilitate Testing (When Added)

**Observable State Management:**
- `GameStateManager` extends `Phaser.Events.EventEmitter`
- State changes emit events systems can observe:
  ```typescript
  this.gameState.on('stateChange', (state: GameState) => {
    // React to state changes
  });
  ```
- Full state snapshot available via `getState()` for assertions

**Dependency Injection:**
- Systems and managers accept dependencies in constructor:
  ```typescript
  constructor(
    private scene: Phaser.Scene,
    private config: IntersectionMapConfig,
    private difficulty: DifficultyConfig,
    private trafficLights: TrafficLightSystem,
    private gameState: GameStateManager,
  ) {}
  ```
- Enables mock/stub injection for unit tests

**Modular System Design:**
- Stateful systems separated from presentation: `ReactionSystem` (logic) vs `ReactionFeedbackManager` (display)
- Config-driven behavior: `DifficultyConfig`, `IntersectionMapConfig`, `ScoreGrade`
- Pure utility functions: `paperArt.ts` functions take Graphics object, don't depend on scene

**Data-Driven Configuration:**
- All game parameters in config files: `gameConfig.ts`, `difficultyConfig.ts`, `scoreConfig.ts`
- Constants easily swappable: `SMOKE_PUFF_INTERVAL_MS = 500`, `PASSENGER_CHANCE = 0.3`
- Mock configs can be injected for testing

## Testable Components

**Systems (Good Test Candidates):**
- `GameStateManager` — state transitions, event emission
- `ConfidenceSystem` — confidence value calculations based on reactions
- `FatigueSystem` — fatigue drain and recovery logic
- `TrafficLightSystem` — light cycle timing and state
- `ReactionSystem` — reaction weighting and selection

**Managers (Unit Test Targets):**
- `TrafficManager` — car spawning, pooling, collision detection
- `ReactionFeedbackManager` — feedback animation logic
- `PlayerController` — input handling to state changes

**Utilities (Pure Function Tests):**
- `paperArt.ts` functions: `drawPaperShadow()`, `drawScissorCutRect()`, `wobbleSine()`
- Config helpers: `getScoreGrade()`, `getSignRatingLabel()`, `formatTime()`
- `signDecorations.ts` — emoji/tape decoration selection

**Entities (Integration Tests):**
- `Car` — rendering, movement, stop line detection
- `Player` — animation, fatigue visualization
- `VisibilityCone` — cone rendering and car visibility check

## Integration Testing Scenarios

**Gameplay Flow:**
1. SignCraftScene → IntersectionScene → ScoreScene → ActivismScene
2. State persistence across scene transitions via Phaser registry
3. Configuration initialization and validation

**System Interactions:**
- Player reaction → ReactionSystem → ConfidenceSystem → UI update
- Car reaching player → Scoring system → HUD update
- Time passing → Fatigue drain → UI update → Visual feedback

**External Dependencies:**
- Web Audio API initialization (AudioSystem) with fallback
- Canvas rendering (Phaser.GameObjects)
- DOM manipulation (Fabric.js sign editor in SignCraftScene)

## Mock Data / Fixtures (When Testing)

**Car Fixture:**
```typescript
const mockCar = {
  type: 'sedan' as CarType,
  x: 100,
  y: 200,
  direction: 'north' as TrafficDirection,
  carLength: 90,
  isStopped: false,
  isPastStopLine: () => false,
};
```

**GameState Fixture:**
```typescript
const mockState: GameState = {
  score: 0,
  timeRemaining: 120,
  sessionDuration: 120,
  carsReached: 0,
  carsMissed: 0,
  reactions: {
    wave: 0, honk: 0, bananas: 0, peace: 0,
    nothing: 0, stare: 0, thumbsdown: 0, finger: 0, yell: 0, coalroller: 0,
  },
  isSessionActive: true,
  confidence: 50,
  lastReactionTime: 0,
  groupSize: 1,
  armFatigue: 0,
  activeArm: 'right' as const,
  isResting: false,
  isRaised: false,
  endReason: null,
  weatherState: 'clear' as const,
  signDegradation: 0,
  eventsTriggered: [],
};
```

**Config Fixtures:**
- `DIFFICULTY_MEDIUM` already exported for testing
- Configs in `src/game/config/` can be imported directly

## Coverage Gaps (If Tests Were Added)

**Untested Logic:**
- `TrafficManager.findCarAhead()` — car detection and distance calculation
- `TrafficLightSystem` — light cycle timing and state transitions
- `Player` fatigue visualization — animation conditions at 70% and 85%
- `EventSystem` — event triggering and probability calculations
- Share card generation (`ShareCardGenerator.ts`) — complex canvas operations
- `ReactiveCueSystem` — audio cue timing and playback
- `MusicSystem` — music track transitions and fade timing

**Presentation Layers (Hard to Test Without UI):**
- HUDManager UI updates and positioning
- Scene transitions and initialization order
- TextureGenerator rendering (car/tree baking)
- Paper grain overlay visual fidelity

**Async Scenarios:**
- Web Audio startup race conditions
- Promise handling in ScoreScene share generation
- Tone.js audio loading and playback

## Testing Recommendations

**Phase 1: Unit Tests (Highest ROI)**
- GameStateManager state transitions
- ConfidenceSystem confidence calculations
- FatigueSystem fatigue drain rates
- ReactionSystem reaction weighting
- Config helper functions (scoreConfig.ts, etc.)

**Phase 2: Integration Tests**
- TrafficManager with multiple cars and light cycles
- System event propagation through GameStateManager
- Scene transition data persistence

**Phase 3: E2E/Gameplay Tests**
- Full game session flow: SignCraft → Intersection → Score → Activism
- User input processing (raise sign, rotate sign, reactions)
- Win/loss conditions and session end

**Technology Stack Recommendation:**
- Vitest for speed and Vite integration
- @testing-library/phaser or phaser-test-utils for game object mocking
- Canvas mock for texture generation tests

---

*Testing analysis: 2026-02-15*
