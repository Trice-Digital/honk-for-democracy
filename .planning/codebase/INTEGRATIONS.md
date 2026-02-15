# External Integrations

**Analysis Date:** 2025-02-15

## APIs & External Services

**Web APIs (Browser-based):**
- Web Audio API - Procedural sound synthesis via `src/game/systems/AudioSystem.ts`
- Canvas 2D API - Image composition for share cards via `src/lib/ShareCardGenerator.ts`
- Web Share API - Social sharing with file support (feature-detected)
  - Implementation: `src/lib/ShareService.ts`
  - Fallback: Direct PNG download if Web Share API unavailable

**Fonts:**
- Google Fonts - Dynamically loaded fonts via CDN
  - Fonts: Permanent Marker, Bangers, Rubik Mono One, Bungee
  - Loaded in: `src/lib/signEditor.ts` (preloadGoogleFont method)
  - Also loaded via: `src/layouts/Layout.astro` (Google Fonts CDN link)

## Data Storage

**Databases:**
- None - This is a static, client-side game with no backend persistence

**File Storage:**
- Local browser storage - Game state managed in-memory only
- Canvas blobs - Share card PNG generated client-side and shared/downloaded

**Caching:**
- None configured - Cloudflare Workers handles caching at edge level

## Authentication & Identity

**Auth Provider:**
- None - No user authentication required

## Monitoring & Observability

**Error Tracking:**
- None - Console logging only via `console.warn()` and `console.error()`

**Logs:**
- Browser console - Runtime warnings and errors
  - Example: "[HFD] Web Audio API not available" from `AudioSystem.ts`

## CI/CD & Deployment

**Hosting:**
- Cloudflare Workers + Static hosting
- Build output: Static HTML/CSS/JS served from `./dist`

**CI Pipeline:**
- None detected - Deploy via Wrangler CLI or git integration

## Environment Configuration

**Required env vars:**
- None - Static site with no runtime configuration

**Secrets location:**
- No secrets stored (public open-source project)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Web Share API calls (browser-managed, not application-controlled)

## Asset Dependencies

**External CDNs:**
- Google Fonts (Permanent Marker, Bangers, Rubik Mono One, Bungee)

**Embedded Assets:**
- SVG reference mockup: `mockups/paper-mario-style.html` (design reference only, not runtime)

## Browser Compatibility

**Required Web APIs:**
- Canvas API (2D context)
- Web Audio API (optional - gracefully degrades)
- Web Share API (optional - feature-detected with fallback)

**Graphics Rendering:**
- Phaser AUTO mode (WebGL with Canvas fallback)

---

*Integration audit: 2025-02-15*
