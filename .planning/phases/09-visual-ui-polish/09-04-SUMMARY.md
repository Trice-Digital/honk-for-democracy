---
phase: 09-visual-ui-polish
plan: 04
subsystem: entities
tags: [phaser, paper-craft, player, traffic-lights, paperArt, wobble, fatigue]

requires:
  - phase: 09-01
    provides: paletteConfig.ts and paperArt.ts utility functions
  - phase: 09-03
    provides: intersection background with paper cutout aesthetic
provides:
  - Paper cutout player character with head, body, arms, legs, popsicle stick sign mount
  - Hard-offset drop shadow and scissor-cut outline on player
  - Arm crease at 70%+ fatigue, arm droop at 85%+ fatigue
  - Idle wobble on player container (0.5 degrees)
  - Paper cutout traffic lights on popsicle stick mounts
  - Active light glow-through-paper effect with halo
  - Camera flash and scale-bounce pulse on traffic light phase change
  - Idle wobble on traffic light containers (1 degree)
affects: [09-visual-ui-polish]

tech-stack:
  added: []
  patterns: [container-based wobble animation, per-frame light state redraw, fatigue visual feedback]

key-files:
  created: []
  modified:
    - src/game/entities/Player.ts
    - src/game/scenes/IntersectionScene.ts

key-decisions:
  - "Player uses separate Graphics objects per body part for independent fatigue animation (arm rotation)"
  - "Traffic light housing drawn on shared lightGraphics layer (redrawn each frame), popsicle sticks in containers (drawn once)"
  - "Active light pulse uses temporary Graphics overlay that auto-destroys after 500ms"
  - "Player head drawn as scissor-cut polygon approximation of a circle for organic paper feel"
  - "Skin color is warm paper tone (0xf5c692), not PALETTE.safetyYellow, to read as human"

verified:
  - npm run build succeeds with no TypeScript errors
  - All existing public methods preserved: setSignMessage, setSignMaterial, setSignTexture
  - No game logic changed in IntersectionScene (traffic, car spawning, reactions all untouched)
  - Traffic light phase change listener augmented with camera flash, not replaced
---

## What Changed

**Player.ts** — Complete rewrite as paper cutout person. Construction paper body (blue shirt), skin-tone head with marker eyes/mouth (scissor-cut polygon circle), two arms (left at side, right holding sign), legs with shoes, popsicle stick sign post, sign board with paper shadow and scissor-cut edges. Full character drop shadow rendered first. Fatigue visuals: crease line on sign arm at 70%+ (gets thicker with fatigue), arm rotation droop at 85%+. Idle wobble via wobbleSine at 0.5 degrees when not raising sign.

**IntersectionScene.ts** — Traffic lights upgraded to paper cutout aesthetic. Each light gets a popsicle stick pole mount (drawn once in a Container for wobble). Housing is a dark paper cutout rectangle with scissor-cut edges and drop shadow. Active light has glow halo at 0.3 alpha behind it plus road surface glow ellipse. Inactive lights dim at 0.15 alpha. Phase change triggers camera flash (150ms, very subtle) and scale-bounce tween on active lights. Traffic light containers wobble at 1 degree. Player fatigue visuals and wobble wired into update().
