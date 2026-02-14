# Feature Landscape

**Domain:** Mobile-first web protest simulator game
**Researched:** 2026-02-14

## Table Stakes

Features the game must have to function as a game, not a tech demo.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Core game loop (aim + react) | Without this there's no game | High | Visibility cone + traffic + reactions. THE thing to get right. |
| Traffic pattern system | The skill ceiling — reactive to predictive to flow state | Medium | State machine for light cycles, car spawning tied to light state |
| Score tracking | Players need feedback | Low | Running score, end-of-session tallying |
| Mobile touch controls | Primary platform is phones | Medium | Single-finger drag to rotate. Must feel good or game dies. |
| Responsive game canvas | Phones are different sizes | Low | Phaser Scale.FIT handles this. Base 720x1280 portrait. |
| Visual feedback for reactions | Players need to see what happened | Medium | Emoji/icon pop-ups from cars, score floaters, confidence bar animation |
| Session start/end flow | Game needs boundaries | Low | Crafting -> gameplay -> score screen flow |
| Sound effects | Games without sound feel broken | Low | Honks, chants, ambient traffic. Can be minimal but must exist. |

## Differentiators

Features that make this game special — not expected, but define the experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sign crafting mini-game | Creative expression before gameplay. YOUR sign, YOUR message. | Medium | Material picker + text input for v1. Affects durability + reaction multiplier. |
| Confidence meter | Emotional arc — anxiety to empowerment | Medium | Rises/falls with reactions + group size. Bottoms out = go home early. |
| Arm fatigue mechanic | Physical comedy + real constraint from protesting | Low | Timer-based drain, switch arms action, craft materials affect rate |
| Event system (cop, weather, karma) | Breaks up core loop, teaches real skills | High | Dialogue trees for cop check, weather state changes, scripted karma sequence |
| Traffic light learning as skill ceiling | Turns casual game into something with mastery depth | Medium | Light cycle patterns to memorize. Early = reactive, late = flow state. |
| Activism end screen | The Trojan horse payload | Low | "This was a game. This is also real." + resource links |
| Shareable score card | Viral distribution mechanism | Low | Screenshot-ready HTML stat screen |
| Weather system | Adds variety, affects sign durability and group size | Medium | Visual + mechanical (rain = ink runs, wind = fatigue faster) |

## Anti-Features

Features to explicitly NOT build for v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multiplayer / online features | Massive complexity, no backend constraint, not core to the experience | Single-player only. The "group" is NPCs that grow/shrink. |
| User accounts / login | Friction kills viral spread. Zero barriers to play. | No accounts. Play immediately from shared link. |
| Leaderboards | Requires backend, introduces competition that conflicts with cooperation message | Share your own score via screenshot. Personal achievement. |
| In-app purchases / monetization | This is activism, not a business. Monetization poisons the message. | Free forever. No ads. |
| Realistic 3D graphics | Performance killer on mobile, art direction is flat/illustrated | Flat 2D art with thick outlines, editorial cartoon style |
| Procedural sign generation via AI | Overengineered, removes creative expression, adds dependency | Player types their own message. That's the point. |
| Tutorial popups / onboarding walls | Kills momentum, condescending | Teach through play (organizer pep talk is the tutorial, cop event teaches rights) |

## Feature Dependencies

```
Sign Crafting → Core Gameplay (sign affects reaction multiplier + durability)
Traffic Pattern System → Reaction System (cars must exist to react)
Reaction System → Confidence Meter (reactions drive confidence)
Confidence Meter → Event System (confidence thresholds trigger events)
Core Gameplay → Score Screen (need data to score)
Score Screen → Activism End Screen (score leads to resources)
Weather System → Sign Durability (weather degrades signs)
Weather System → Arm Fatigue (weather affects fatigue rate)
```

## MVP Recommendation

Build in this order:

1. **Core game loop** — top-down intersection, visibility cone, cars, basic reactions (this IS the game)
2. **Traffic pattern system** — light cycles, car spawning, the skill mechanic
3. **Sign crafting** — simple material picker + text, feed into gameplay
4. **Confidence meter + arm fatigue** — the emotional + physical layer
5. **Score screen + activism end screen** — the session boundary and the payload
6. **Event system** — cop check, weather, karma (breaks up the loop)
7. **Sound + polish** — audio, visual feedback, animation polish

Defer to v2: Additional maps, community features, drag-and-drop sign builder, canvas-rendered share images.

## Sources

- Game design doc and storyboard (primary source — lived experience)
- Phaser 3 mobile game patterns: https://docs.phaser.io/phaser/concepts/input
- Mobile web game best practices: https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch
