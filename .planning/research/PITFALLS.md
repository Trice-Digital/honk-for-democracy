# Domain Pitfalls

**Domain:** Mobile-first web game (Phaser 3 + Astro)
**Researched:** 2026-02-14

## Critical Pitfalls

Mistakes that cause rewrites or make the game unplayable.

### Pitfall 1: Touch Input Feels Bad on Mobile
**What goes wrong:** Drag-to-rotate feels laggy, imprecise, or conflicts with browser gestures (scroll, zoom, back-swipe). Players can't aim the visibility cone smoothly.
**Why it happens:** Browser touch events have default behaviors. Phaser's input needs explicit touch capture. Not testing on actual phones during development.
**Consequences:** Core mechanic is broken. Game is unplayable on its primary platform.
**Prevention:**
- Set `input.touch.capture: true` in Phaser config to prevent browser from stealing touch events
- Use `touch-action: none` CSS on the game container to prevent browser gestures
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` to prevent zoom
- Test on real phones early and often — not just browser dev tools mobile emulation
- The drag-rotate gesture should use pointer angle calculation (atan2 from center), not raw pixel delta
**Detection:** If testers say "it feels weird" or "I keep accidentally scrolling" — this is the problem.

### Pitfall 2: Phaser Canvas Sizing on Mobile
**What goes wrong:** Game canvas doesn't fill the screen properly, has weird gaps, overflows, or renders at wrong resolution. Notch/safe area issues on modern phones.
**Why it happens:** Phaser's Scale Manager needs a properly sized parent element. CSS `100vh` on mobile doesn't account for browser chrome (address bar). Different phones have different aspect ratios.
**Consequences:** Game looks broken. Worst case: content cut off by notch or browser UI.
**Prevention:**
- Use `Phaser.Scale.FIT` with a fixed aspect ratio (9:16 portrait) — predictable on all devices
- Parent div: `width: 100%; height: 100dvh` (dynamic viewport height, accounts for browser chrome)
- Test on iOS Safari specifically — most problematic for viewport sizing
- Use safe-area-inset CSS variables for notch devices: `padding: env(safe-area-inset-top)`
**Detection:** Visual inspection on multiple device sizes. If the canvas isn't centered or has black bars in unexpected places.

### Pitfall 3: Game Loop Performance on Low-End Mobile
**What goes wrong:** Game runs at <30fps on budget Android phones. Animations stutter. Input feels delayed.
**Why it happens:** Too many game objects, unoptimized sprites, expensive per-frame calculations, particle effects, no object pooling for cars.
**Consequences:** Bad experience on the devices most likely to be used by the target audience.
**Prevention:**
- Object pool cars — don't create/destroy, reuse from a pool
- Keep total active game objects under ~100 at any time
- Use sprite sheets / texture atlases (one draw call per atlas)
- Avoid per-frame physics calculations where timers suffice (arm fatigue is timer-based, not physics)
- Profile on Chrome DevTools with CPU throttling (4x slowdown)
- Set `autoMobilePipeline: true` in Phaser config for mobile GPU optimization
**Detection:** FPS counter drops below 30 on throttled CPU. Visible stuttering.

### Pitfall 4: Asset Loading Kills First Impression
**What goes wrong:** Player clicks "Play" and waits 10+ seconds for assets to load. On slow mobile connections, they leave.
**Why it happens:** Large uncompressed sprites, audio files as WAV/MP3 instead of compressed formats, no loading screen, loading everything upfront.
**Consequences:** Bounce rate through the roof. The game never gets played.
**Prevention:**
- Compress all images (WebP where possible, PNG fallback)
- Audio as MP3 + OGG (small files, Phaser handles format selection)
- Show a loading bar in BootScene — even a simple one
- Lazy-load non-critical assets (event-specific sounds can load during gameplay)
- Total initial payload target: <3MB
- Use Astro's built-in image optimization for site assets (not game assets)
**Detection:** Network tab shows >5MB initial load. Time to interactive >5 seconds on 3G throttle.

## Moderate Pitfalls

### Pitfall 5: Visibility Cone Math is Wrong
**What goes wrong:** Cars that look like they should be "in view" aren't scored, or cars clearly behind the player register as visible.
**Prevention:**
- Use angle-based cone detection, not box collision
- Cone angle should be configurable (start wide ~90 degrees, narrow as skill increases?)
- Visual debug mode: draw the cone during development so you can SEE what the math is doing
- Edge case: cars at exactly the cone boundary — use a small grace margin

### Pitfall 6: Traffic Pattern Feels Random, Not Learnable
**What goes wrong:** Players never feel the "I learned the pattern" moment. The skill ceiling doesn't exist.
**Prevention:**
- Traffic light cycle MUST be deterministic and repeating (same pattern every cycle)
- Cars spawn at fixed intervals tied to light state, not random timers
- Visual cues: traffic lights visible on screen, changing colors
- Audio cue: subtle tick when lights are about to change
- The pattern should be learnable in 3-4 cycles (60-90 seconds of play)

### Pitfall 7: Reaction Feedback is Too Subtle
**What goes wrong:** Players can't tell what reaction they got. Score changes but they don't know why. No emotional response.
**Prevention:**
- Big, clear reaction icons that pop from cars (emoji or illustrated icons)
- Score floaters (+5, +10, +25 COMBO!) with color coding (green positive, red negative)
- Screen shake on coal roller / extreme negative events
- Confidence meter bar is always visible and animates smoothly
- Sound effects differentiate reaction types (friendly honk vs angry horn vs diesel engine)

### Pitfall 8: Sign Crafting Feels Disconnected from Gameplay
**What goes wrong:** Player makes a sign, then forgets about it. The sign choice doesn't visibly matter.
**Prevention:**
- Show the player's sign on-screen during gameplay (the character holds it)
- Reaction multiplier from sign should be FELT — clever signs get noticeably more positive reactions
- Material choice should visibly matter — rain makes cheap sign deteriorate on screen
- Score screen should show "Sign of the Day" rating

## Minor Pitfalls

### Pitfall 9: Confidence Meter Feels Like a Health Bar
**What goes wrong:** Players treat confidence as HP and play defensively instead of engaging.
**Prevention:** Frame it as emotional energy, not health. It should fluctuate naturally. Don't make "bottoming out" feel like failure — frame it as "you went home early, try again." Recovery should be possible (one good honk streak can pull you back).

### Pitfall 10: Event System Interrupts Flow State
**What goes wrong:** Player is in the zone with traffic patterns, then a cop event pops up and breaks their rhythm.
**Prevention:** Events should not pause core gameplay abruptly. Cop check can overlay while traffic continues. Weather shifts are gradual. Karma moment is a visual event that doesn't require player input.

### Pitfall 11: Desktop Players Get a Bad Experience
**What goes wrong:** Mouse feels wrong for the touch-designed drag mechanic. Desktop layout has wasted space.
**Prevention:** Mouse drag should work identically to touch drag. Consider showing keyboard shortcut hints (arrow keys to rotate?). Center the game canvas on desktop with a styled background.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project scaffolding | Phaser import issues with Astro's Vite bundler | Use dynamic import in client script, not Astro frontmatter |
| Core game loop | Touch input feels wrong | Test on real phone from day 1, capture touch events properly |
| Traffic system | Pattern not learnable | Deterministic light cycles, visual cues, fixed spawn intervals |
| Reactions | Feedback too subtle | Big icons, score floaters, sound effects, screen effects |
| Events | Break flow state | Events overlay, don't pause. Gradual weather. Non-blocking karma. |
| Score screen | Not shareable enough | Bold design, clear stats, branded layout, screenshot-friendly |
| Deployment | CF Pages build fails | Test `astro build` + `wrangler pages deploy` early |

## Sources

- Phaser 3 mobile performance: https://phaser.io/tutorials (MEDIUM confidence — community patterns)
- Mobile viewport issues: https://developer.mozilla.org/en-US/docs/Web/CSS/length#dynamic_viewport_units (HIGH confidence)
- Touch event handling: https://docs.phaser.io/phaser/concepts/input (HIGH confidence)
- Phaser Scale Manager caveats: Context7 API docs (HIGH confidence)
