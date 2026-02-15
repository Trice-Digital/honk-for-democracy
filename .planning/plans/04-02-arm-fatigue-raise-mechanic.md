# Plan 04-02: Arm Fatigue System + Raise Sign Mechanic

**Phase:** 4 — Game Systems
**Requirements:** FATG-01, FATG-02, FATG-03, FATG-04, FATG-05
**Estimated effort:** Medium-Large
**Created:** 2026-02-14

## Goal

Arm fatigue meter drains over time; player can switch arms (brief animation, resets some fatigue) or rest (sign drops, reduced visibility, fatigue recovers). Sign material affects drain rate. Maxed fatigue shrinks visibility cone. NEW: Raise sign mechanic as active timing layer — raise during honk = bonus, raise during middle finger = deflect, raise at nothing = costs fatigue.

## Steps

### 1. Create fatigueConfig.ts
- `src/game/config/fatigueConfig.ts`
- Config values: baseDrainRate, switchArmRecovery, restRecoveryRate, maxFatigue (100)
- Raise mechanic config: raiseDrainRate, raiseBonus (1.5x), deflectConversion (negative->small positive)
- Cone shrink curve: fatigue% -> cone width mapping
- Rest mode: visibility reduction factor
- Material weight read from signConfig.ts fatigueMultiplier

### 2. Add fatigue state to GameStateManager
- Add `armFatigue: number` (0-100, 0=fresh, 100=exhausted) to GameState
- Add `activeArm: 'left' | 'right'`
- Add `isResting: boolean`
- Add `isRaised: boolean`
- Add methods: `switchArm()`, `startRest()`, `endRest()`, `raiseSign()`, `lowerSign()`
- Emit events: `fatigueChanged`, `armSwitched`, `restStarted`, `restEnded`, `signRaised`, `signLowered`, `fatigueMaxed`

### 3. Create FatigueSystem
- `src/game/systems/FatigueSystem.ts`
- update(delta): drains fatigue over time based on material weight * difficulty multiplier
- Raise state: drains faster while raised
- Switch arm: instant partial recovery + brief cooldown
- Rest mode: recovers fatigue but reduces visibility (smaller cone or hidden sign)
- When fatigue hits 100: emit fatigueMaxed, shrink cone

### 4. Create Raise Sign mechanic
- Part of FatigueSystem or separate handler
- Player taps/holds a "raise" button (UI button) to raise sign
- While raised: fatigue drains faster
- If a positive reaction occurs while raised: 1.5x score bonus
- If a negative reaction (finger/yell/coalroller) occurs while raised: deflect (negate or convert to +2)
- If no reaction occurs while raised: just costs fatigue (can't spam)
- Brief raise animation on player sprite (sign moves up)

### 5. Create fatigue meter UI
- Vertical bar on opposite side from confidence meter
- Shows 0-100% fatigue (fills as fatigue increases)
- Color: green (fresh) -> orange -> red (exhausted)
- "Switch Arms" button below the meter
- "Rest" button (toggles rest mode)
- "Raise" button (large, prominent — the active mechanic)
- All use setScrollFactor(0)

### 6. Hook cone shrink to fatigue (FATG-05)
- VisibilityCone already has setConeWidth(degrees) method
- Map fatigue level to cone width: 0% fatigue = 60deg, 100% = 30deg (halved)
- Smooth interpolation as fatigue changes

### 7. Integrate into IntersectionScene
- Create FatigueSystem in create()
- Add fatigue UI elements
- Wire input buttons (switch arms, rest, raise)
- Hook fatigue to cone width in update loop
- Wire raise mechanic to reaction scoring

## Success Criteria

- [ ] Arm fatigue meter displays and drains over time
- [ ] Player can switch arms (partial fatigue recovery, brief animation)
- [ ] Player can rest (sign drops, reduced visibility, fatigue recovers)
- [ ] Sign material affects fatigue drain rate
- [ ] Maxed fatigue shrinks visibility cone
- [ ] Raise sign mechanic: bonus on positive reaction, deflect on negative, costs fatigue
- [ ] UI buttons for switch arms, rest, and raise sign

## Architecture Decisions

- FatigueSystem is a separate class, same pattern as ConfidenceSystem
- Config-driven in fatigueConfig.ts
- Raise mechanic integrated into reaction scoring pipeline
- Cone shrink uses existing VisibilityCone.setConeWidth()
- Material weight comes from signConfig.ts (already has fatigueMultiplier)
- Difficulty fatigueDrainMultiplier already exists in DifficultyConfig
- Rest and raise are mutually exclusive states
