---
phase: 11-social-share
plan: 03
status: done
---

# 11-03 Summary: OG Image + Meta Tags

## What was built

### 1. `public/og-image.png` — Static OG preview image (1200x630)

Programmatically generated PNG with protest aesthetic:

- **Background**: Cardboard color (#c5a059) with procedural paper grain texture (deterministic pseudo-random short lines + horizontal streaks)
- **Title**: "HONK FOR / DEMOCRACY" in bold Impact, paperWhite (#f5f0e8) fill with markerBlack (#1a1a1a) stroke outline and drop shadow
- **Subtitle**: "A Protest Simulator" in safetyYellow (#fbbf24) with shadow
- **Tagline**: "Craft your sign. Stand your ground." in paperWhite with shadow
- **Border**: Double-line frame — outer markerBlack, inner safetyYellow accent

### 2. `scripts/generate-og-image.cjs` — Generation script

Node.js script using `canvas` (node-canvas) to render the OG image. Can be re-run anytime with `node scripts/generate-og-image.cjs` to regenerate.

### 3. `src/layouts/Layout.astro` — Added missing meta tags

New meta tags added after existing `og:site_name`:

- `og:url` — `https://honkfordemocracy.org`
- `og:image` — `https://honkfordemocracy.org/og-image.png`
- `og:image:width` — `1200`
- `og:image:height` — `630`
- `og:image:type` — `image/png`
- `twitter:image` — `https://honkfordemocracy.org/og-image.png`

All image URLs use absolute production domain for maximum social platform compatibility.

## Verification

- `public/og-image.png` exists: 1200x630 PNG, 148KB
- `og:image` meta tag present in Layout.astro
- `twitter:image` meta tag present in Layout.astro
- `og:url` meta tag present in Layout.astro
- Pre-existing build errors unchanged (5 errors in other files, none from this change)

## Files created/modified

| File | Action | Purpose |
|------|--------|---------|
| `public/og-image.png` | Created | 1200x630 social preview image |
| `scripts/generate-og-image.cjs` | Created | Node-canvas generation script |
| `src/layouts/Layout.astro` | Modified | Added og:image, og:url, twitter:image meta tags |

## Dependencies added

- `canvas` (dev dependency) — node-canvas for OG image generation
