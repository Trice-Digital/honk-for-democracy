# Technology Stack

**Project:** Honk For Democracy
**Researched:** 2026-02-14

## Recommended Stack

### Site Shell
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Astro | 5.x (latest 5.17) | Static site framework — landing page, about, resources pages | Static-first, ships zero JS by default, islands architecture for embedding Phaser. Astro 6 is in beta — stick with 5.x for stability. |
| TypeScript | 5.x | Type safety across site and game code | Phaser 3 has excellent TS support. Astro supports TS out of the box. Catch bugs early in game logic. |

### Game Engine
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Phaser | 3.90.0 "Tsugumi" | 2D game engine — all gameplay | Latest stable Phaser 3. Mature, well-documented, excellent mobile/touch support, Canvas + WebGL rendering. Phaser 4 is in beta — too early. |

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare Workers | N/A | Static hosting via Workers static assets + CDN | Fast global CDN, free tier generous, custom domain support. Pages is deprecated/merging into Workers. |
| Wrangler | latest | Cloudflare CLI for deploys | Standard CF Workers tooling. `wrangler.jsonc` with `assets` directory. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @astrojs/cloudflare | latest | Astro adapter for CF Workers | Deployment configuration (Phase 7) |
| phaser3-rex-plugins | latest | Phaser plugin collection | Gesture recognition (drag-rotate), UI components. Has excellent rotate/drag gesture plugins that map directly to the visibility cone mechanic. |
| @fontsource/permanent-marker | latest | "Permanent Marker" font | Sign crafting UI, protest aesthetic. Self-hosted, no external font requests. |

### Dev Tools
| Tool | Purpose |
|------|---------|
| Vite | Bundled with Astro. Handles Phaser imports, HMR during development. |
| ESLint + Prettier | Code quality. Standard Astro config. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Site shell | Astro 5.x | Next.js, plain HTML | Next.js is overkill (no SSR needed, no React needed). Plain HTML works but loses component structure, routing, and build pipeline. |
| Game engine | Phaser 3.90 | PixiJS, Phaser 4, raw Canvas | PixiJS is a renderer, not a game framework (no scenes, input, physics built in). Phaser 4 is beta. Raw canvas = reinventing wheels. |
| Hosting | CF Pages | Vercel, Netlify | CF Pages is the stated constraint. Also excellent for static sites. |
| Gesture lib | phaser3-rex-plugins | Custom implementation | Rex plugins are battle-tested for exactly the drag-rotate pattern we need. Writing custom gesture recognition is error-prone. |

## Astro + Phaser Integration Pattern

Astro doesn't natively "know" about Phaser. The integration pattern is:

1. **Astro page** renders a `<div id="game-container">` element
2. **Client-side `<script>`** in the Astro page imports Phaser and boots the game into that div
3. Phaser's Scale Manager handles canvas sizing within the container
4. Astro handles everything outside the game canvas (nav, landing page, resource pages)

This is clean separation: Astro owns the site, Phaser owns the game canvas. No framework component needed — just a script tag with `type="module"`.

```astro
---
// game.astro
import Layout from '../layouts/Layout.astro';
---
<Layout title="Play">
  <div id="game-container"></div>
  <script>
    import { bootGame } from '../game/main';
    bootGame('game-container');
  </script>
</Layout>
```

## Phaser Scale Manager Config (Mobile-First)

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,  // WebGL with Canvas fallback
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,  // Fit within parent, maintain aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,   // Portrait mobile base resolution
    height: 1280,
  },
  input: {
    touch: { capture: true },
  },
  scene: [/* scenes */],
};
```

Key: `Phaser.Scale.FIT` + portrait base resolution (720x1280) gives us mobile-first scaling that also works on desktop.

## Installation

```bash
# Core
npm create astro@latest
npm install phaser@3.90.0

# Supporting
npm install phaser3-rex-plugins
npm install @fontsource/permanent-marker

# Cloudflare
npm install -D @astrojs/cloudflare wrangler
```

## Sources

- Astro 5.x docs: https://docs.astro.build (Context7 verified, HIGH confidence)
- Phaser 3.90.0: https://phaser.io/download/stable (official, HIGH confidence)
- Phaser Scale Manager: Context7 Phaser API docs (HIGH confidence)
- Phaser touch input: Context7 + https://docs.phaser.io/phaser/concepts/input (HIGH confidence)
- phaser3-rex-plugins drag-rotate: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/dragrotate/ (MEDIUM confidence)
- Astro client directives / islands: Context7 Astro docs (HIGH confidence)
