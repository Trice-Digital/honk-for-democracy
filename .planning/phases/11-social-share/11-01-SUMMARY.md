---
phase: 11-social-share
plan: 01
status: done
---

# 11-01 Summary: Share Card Config + Generator

## What was built

### 1. `src/game/config/shareConfig.ts` — Share card layout constants

Exports `SHARE_CONFIG` as a single const object containing all layout values for the 1080x1080 Polaroid-style share card:

- **Canvas**: 1080x1080 px (social media square)
- **Background**: Cardboard color (#c5a059) with paper grain density settings
- **Frame**: Polaroid-style white (#f5f0e8) rectangle, 60px inset, 3px border, hard-offset shadow (3px/3px, #2a2a2a at 0.35 alpha)
- **Sign image**: Max 800x500, centered in top portion with 2px border
- **Caption**: "I stood my ground at {intersectionName}" — Bangers 42px, shrinks to 28px if needed
- **Score**: Grade badge (filled circle with letter) + score pts — Bangers 56px/48px
- **Branding**: "HonkForDemocracy.org" — Bangers 36px, #3b82f6
- **Tape accent**: 120x30px rotated 15deg, #f0ead6 at 55% alpha, wobbled edges
- **Default intersection**: "The Corner"

### 2. `src/lib/ShareCardGenerator.ts` — Canvas API image compositor

Exports `generateShareCard(options: ShareCardOptions): Promise<string>` which returns a PNG data URL.

**ShareCardOptions interface**: `signImageDataUrl`, `score`, `gradeLabel`, `gradeColor`, `intersectionName?`

**Rendering pipeline** (all Canvas 2D API):
1. Cardboard background with procedural paper grain (ported from paperArt.ts)
2. Polaroid frame with hard-offset shadow
3. Sign image (aspect-ratio preserved, placeholder fallback if load fails)
4. Tape accent (rotated, wobbled edges)
5. Caption text (auto-shrinks to fit)
6. Grade badge (colored circle + letter) and score display
7. Branding footer

**Key design decisions**:
- Lives in `src/lib/` (pure DOM/Canvas, no Phaser dependency)
- Waits for Bangers font via `document.fonts.ready` with 3s timeout, falls back to Impact
- Paper grain ported from `paperArt.ts` `applyPaperGrain()` adapted for Canvas 2D context
- Wobble edge logic ported from `paperArt.ts` for tape accent ragged edges
- Full try/catch — returns empty string on failure with console.error

## Verification

- `npm run build` — passes cleanly
- `generateShareCard` exported as async function
- No Phaser imports (only comment references)
- No external dependencies added
- TypeScript compiles with strict mode

## Files created

| File | Purpose |
|------|---------|
| `src/game/config/shareConfig.ts` | Layout constants for 1080x1080 Polaroid card |
| `src/lib/ShareCardGenerator.ts` | Canvas API compositor — generates share PNG |
