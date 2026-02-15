# Plan 02-03: Car Reactions and Scoring System

**Phase:** 2 — Core Game Loop
**Requirements:** GAME-07, GAME-08, REACT-01, REACT-02, REACT-03, REACT-04
**Estimated effort:** Large
**Created:** 2026-02-14

## Goal

Cars passing through the visibility cone generate scored reactions. Cars outside the cone pass without reaction. Reactions pop visually with icons and colored score floaters. Running score is displayed.

## Steps

### 1. Create ReactionSystem (shared, config-driven)
- Reaction types with weighted probabilities:
  - wave (+5, 25%), honk (+10, 20%), go bananas (+25, 5%)
  - nothing (0, 10%), thumbs down (-5, 15%), middle finger (-10, 10%)
  - yelled at (-15, 5%), coal roller (-20, 2%)
- ~60% positive, ~25% neutral, ~15% negative (per design defaults)
- Weights configurable via DifficultyConfig

### 2. Create cone-car intersection detection
- Each frame, check which cars overlap with visibility cone arc
- Mark cars as "reached" when they enter the cone
- Each car can only be reached once per pass through intersection
- Cars outside cone are "missed" (no reaction)

### 3. Create reaction visual feedback
- Emoji/icon pops from reacting cars
- Icons float upward briefly then fade
- Reaction types: wave hand, car horn, celebration, nothing, thumbs down, middle finger, speech bubble, truck
- Simple text-based emoji rendering (no sprite assets needed)

### 4. Create score floaters
- Colored numbers pop from reaction point
- +green for positive, -red for negative
- Float upward and fade out over ~1 second
- Clear visual distinction between positive and negative

### 5. Update running score display
- Score updates in real-time as reactions occur
- Score stored in GameStateManager
- Animated score counter (brief scale-up on change)

### 6. Wire everything together
- Car enters cone -> ReactionSystem rolls reaction -> visual feedback + score update
- Car passes without entering cone -> nothing happens
- All systems communicate via events (Pattern 2)

## Success Criteria

- [ ] Cars in cone generate weighted random reactions
- [ ] Cars outside cone pass silently (missed opportunity)
- [ ] Reaction icons pop visually from cars
- [ ] Score floaters show colored +/- values
- [ ] Running score updates in real-time on screen
- [ ] Reaction weights match ~60/25/15 split

## Architecture Decisions

- Reaction system is config-driven (weights from DifficultyConfig)
- Visual feedback is a separate concern from reaction logic
- Score changes flow through GameStateManager events
- Same reaction system works on any map (shared engine)
