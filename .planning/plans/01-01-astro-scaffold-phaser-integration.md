# Plan 01-01: Astro Project Scaffold + Phaser Integration

**Phase:** 1 — Scaffolding & Game Boot
**Requirements:** INFRA-01, INFRA-02
**Estimated effort:** Medium
**Created:** 2026-02-14

## Goal

Astro 5.x project scaffolded with TypeScript. Phaser 3.90.0 boots and renders a game canvas inside an Astro page. The project builds successfully with `astro build`.

## Steps

### 1. Initialize Astro 5.x project with TypeScript
- Run `npm create astro@latest` in the repo root (select: empty project, TypeScript strict)
- Or manually scaffold: `package.json`, `astro.config.mjs`, `tsconfig.json`
- Verify `npm run dev` serves at localhost

### 2. Install Phaser 3.90.0
- `npm install phaser@3.90.0`
- Verify Phaser can be imported in a TypeScript file without errors

### 3. Create project directory structure
```
src/
  game/              <- Phaser-only code
    main.ts          <- Game boot function
    scenes/          <- Phaser scenes
      BootScene.ts   <- Initial scene (placeholder)
    config/          <- Game configuration
      gameConfig.ts  <- Phaser game config
  pages/
    index.astro      <- Landing page (placeholder)
    play.astro       <- Game page (hosts game-container div)
  layouts/
    Layout.astro     <- Base layout with meta tags
  styles/
    global.css       <- Global styles
```

### 4. Create base Astro layout
- `Layout.astro` with proper HTML head (charset, viewport meta, title)
- Import global CSS
- Slot for page content

### 5. Create the game page (`play.astro`)
- Full-viewport `<div id="game-container">` element
- Client-side `<script>` that imports and calls `bootGame()`
- No framework component wrapping — plain script tag, per architecture notes

### 6. Create Phaser game config (`gameConfig.ts`)
- `type: Phaser.AUTO` (WebGL with Canvas fallback)
- `parent: 'game-container'`
- `scale.mode: Phaser.Scale.FIT`
- `scale.autoCenter: Phaser.Scale.CENTER_BOTH`
- `scale.width: 720, scale.height: 1280` (portrait mobile base)
- Scene array with BootScene

### 7. Create BootScene (placeholder)
- Renders a colored background (game's palette blue)
- Displays "Honk For Democracy" text centered on canvas
- Confirms Phaser is rendering successfully

### 8. Create game boot function (`main.ts`)
- `bootGame(containerId: string)` function
- Creates `new Phaser.Game(config)` with the container
- Exports the function for the Astro page script to call

### 9. Create placeholder landing page (`index.astro`)
- Simple page with link to `/play`
- Uses Layout component

### 10. Configure Astro for static output
- `astro.config.mjs`: `output: 'static'`
- Verify `npm run build` produces static output in `dist/`

### 11. Verify build
- `npm run build` succeeds without errors
- `dist/` contains HTML, JS bundles, assets
- Dev server shows Phaser canvas rendering at `/play`

## Success Criteria

- [ ] `npm run dev` starts Astro dev server
- [ ] Navigating to `/play` shows a Phaser game canvas with colored background and text
- [ ] `npm run build` completes without errors
- [ ] Phaser 3.90.0 is in package.json dependencies
- [ ] TypeScript compilation has no errors
- [ ] Directory structure follows the architecture pattern (game/ separated from pages/)

## Architecture Decisions

- Plain `<script>` in Astro page boots Phaser — no framework component wrapper (per ARCHITECTURE.md anti-pattern 1)
- All game code in `src/game/`, all Astro code in `src/pages/` (per architecture pattern 4)
- Static output mode — no SSR needed (per PROJECT.md constraints)
- Cloudflare Workers deployment config deferred to Phase 7 (INFRA-05)

## Risks

- Phaser import with Vite/Astro bundler may need special handling — use dynamic import in client script if needed
- Phaser 3.90.0 TypeScript types may need `skipLibCheck: true` if type conflicts arise
