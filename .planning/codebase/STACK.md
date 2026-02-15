# Technology Stack

**Analysis Date:** 2025-02-15

## Languages

**Primary:**
- TypeScript 5.9.3 - Game engine, systems, managers, utilities
- JavaScript (ES modules) - Configuration and build scripts
- HTML/CSS - Landing page and layout structure

**Markup:**
- Astro (.astro files) - Site shell and page scaffolding

## Runtime

**Environment:**
- Node.js - Development and build environment (no version constraint in package.json)

**Package Manager:**
- npm - Package management
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- Phaser 3.90.0 - 2D game engine (Canvas/WebGL rendering)
- Astro 5.17.1 - Static site framework with Cloudflare adapter

**Audio:**
- Tone.js 15.1.22 - Procedural audio synthesis (Web Audio API wrapper)

**Graphics:**
- Fabric.js 7.1.0 - Canvas sign editor with text/image manipulation
- Canvas 3.2.1 (dev) - Node.js canvas support for server-side rendering (dev-only)

## Key Dependencies

**Critical:**
- `@astrojs/cloudflare` 12.6.12 - Cloudflare Workers deployment adapter
- `phaser` 3.90.0 - Game engine; heavily optimized in Vite config with manual chunking
- `tone` 15.1.22 - Audio synthesis library; used for stadium organ music and ambient sounds
- `fabric` 7.1.0 - Sign editor canvas library; enables interactive text/image/decoration editing

**Dev-only:**
- `@astrojs/check` 0.9.6 - Type checking for Astro components
- `canvas` 3.2.1 - Node.js canvas for share card image generation (server-side)

## Configuration

**Environment:**
- Static site with no runtime env vars required
- Cloudflare Workers compatibility flags enabled (`nodejs_compat`)

**Build:**
- `astro.config.mjs` - Main Astro configuration
  - Cloudflare adapter with platform proxy enabled
  - Static output mode (no SSR)
  - Vite optimizations for Phaser (manual chunking to avoid warnings)
  - Chunk size warning limit increased to 1600KB (Phaser bundle is large)
- `tsconfig.json` - TypeScript strict mode configuration
- `wrangler.toml` - Cloudflare Workers configuration
  - Compatibility date: 2025-01-01
  - Static assets served from `./dist` directory

## Platform Requirements

**Development:**
- Node.js (any modern version)
- npm 6+
- TypeScript 5.9.3+

**Production:**
- Cloudflare Workers + Static hosting
- Build output: `./dist` directory
- Static HTML/CSS/JS (no server-side logic required)

---

*Stack analysis: 2025-02-15*
