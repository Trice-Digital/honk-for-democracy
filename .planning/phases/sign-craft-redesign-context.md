# Sign Craft UX Redesign — Phase Context

**Phase type:** Insert as new phase (recommend `/gsd:insert-phase` between Phase 12 and Phase 13, or `/gsd:add-phase`)
**Mockup reference:** `mockups/sign-craft-redesign.html` — **THIS IS THE DESIGN SOURCE OF TRUTH. Open it in a browser. All layout, styling, and interaction patterns must match this mockup.**

---

## Goal

Rebuild the Sign Craft scene UX from the ground up. The current implementation (SignCraftScene.ts, 897 lines) is a functional proof-of-concept with layout problems: everything is a single scrolling column, the sign preview gets lost on scroll, the CTA is buried below the fold, and it doesn't match the Paper Mario neobrutalist visual language established in Phase 9.

The redesign introduces:
- **Responsive two-column layout** (desktop: sign left + controls right; mobile: sticky sign top + scrollable controls below)
- **Hybrid tabbed controls** (Material / Message / Decorate tabs with subtle 1-2-3 numbering — user can jump to any tab)
- **Randomize feature** (shuffles message, font, text color, material — instant sign generation)
- **Bigger sign preview** on desktop (520px max-width vs current narrow column)
- **START PROTESTING + RANDOMIZE side by side** directly under the sign preview (no scrolling needed)
- **Orientation hint** for new users: brief text explaining the flow
- **Expanded materials** with color variants (4 cardboard colors, 4 posterboard colors, 3 foam board colors, 2 wood planks = 13 total swatches vs current 4)
- **Font cards that show actual font rendering** ("HONK!" rendered in each font, not just a text label)
- **Tape feature CUT** — stickers stay, tape removed (scope reduction for launch)

---

## What EXISTS Now (Preserve)

These systems work and should be preserved/adapted, not rewritten from scratch:

1. **Fabric.js sign editor** (`src/lib/signEditor.ts`) — canvas-based sign editor. Keep the Fabric.js canvas for actual sign composition. The mockup's "sign preview" maps to this canvas.
2. **Material textures** (`src/lib/signMaterials.ts`, `generateMaterialTexture()`) — procedural canvas textures for cardboard, posterboard, foam, wood. Keep and expand with color variants.
3. **PNG export pipeline** — `SignEditor.exportAsPNG()` → `signData.signImageDataUrl` → Phaser texture. This pipeline is critical. Don't break it.
4. **Sign config** (`src/game/config/signConfig.ts`) — `SIGN_MATERIALS`, `SIGN_FONTS`, `SIGN_COLORS`, `SignData` type, `scoreMessageQuality()`. Expand these arrays for new variants.
5. **Decoration system** (`src/lib/signDecorations.ts`) — SVG stickers + emoji categories. Keep stickers, **remove tape**.
6. **DOM overlay architecture** — Fabric.js lives in a DOM overlay over Phaser canvas. This pattern stays.
7. **Scene flow** — SignCraftScene → IntersectionScene. The `startProtesting()` method exports the sign and transitions. Keep this.

---

## What CHANGES

### Layout (the big one)

**Current:** Single scrolling column. Material → message → sign preview → font → color → decorations → remove → start. Sign preview in the middle of the scroll.

**New (per mockup):**
- **Desktop:** CSS Grid two-column — sign area (left, sticky, `max-width: 520px`) + controls sidebar (right, `360px`, scrollable)
- **Mobile:** Sign area sticky at top with kraft background + border-bottom. Controls scroll below.
- **Sign preview** is always visible regardless of which control tab is active

### Controls Organization

**Current:** All controls visible in one long scroll.

**New:** Three tabs — **Material** (tab 1), **Message** (tab 2), **Decorate** (tab 3). Subtle step numbers but user can jump to any tab (hybrid flow, not a locked wizard). Each tab contains one or more "panels" (neobrutalist cards with `3px solid #1a1a1a` border + `4px 4px 0` drop shadow).

### Tab 1: Material
- **Section groups** with emoji labels: 📦 Cardboard, 🎨 Posterboard, 🧊 Foam Board, 🪵 Wood Plank
- **Color variants within each material** (see mockup for exact colors)
- Material swatches: `52x52px`, `2px solid #1a1a1a`, `2px 2px 0` shadow, `border-radius: 4px`
- Selected state: `3px solid #fbbf24` outline with checkmark

### Tab 2: Message
- **Text input** (textarea, 2 rows, 60 char max) with character counter
- **Text color picker** — 9 color dots (see mockup), circle swatches with yellow outline on select
- **Font picker** — 2x4 grid of font cards. Each card renders "HONK!" in that font so the user sees what it looks like. Selected state = yellow background.
- Font list (8 fonts, expanded from 4): Bangers, Permanent Marker, Bungee, Caveat, Fredoka, Protest Guerrilla, Rubik Mono One, Shrikhand. All are Google Fonts.

### Tab 3: Decorate
- **Stickers only** (tape removed)
- Category pills: Protest, Faces, Symbols, Animals, Things (existing categories from `signDecorations.ts`)
- 6-column sticker grid
- "On your sign" section showing placed stickers with ✕ remove buttons
- **NO "Remove Selected" danger button** — removal is per-sticker via the placed list

### Buttons Under Sign
- **RANDOMIZE** (🎲) and **START PROTESTING** (🪧) side by side directly under the sign preview
- Both visible without scrolling on any device
- Old fixed-bottom CTA removed

### Randomize Feature (NEW)

Completely new functionality. When tapped:
1. Pick a random material (from all 13 material swatches)
2. Pick a random font (from all 8 fonts)
3. Pick a random text color (contrast-aware: dark colors for light materials, light colors for dark materials)
4. Pick a random message from a preset list (see mockup JS for the full list of 15 messages)
5. Place 0-3 random stickers at random positions/rotations
6. Update the sign preview, textarea, and all selected indicators

**Preset message pool:** 'HONK FOR DEMOCRACY', 'HONK IF YOU CARE', 'RESIST', 'PEOPLE OVER PROFIT', 'WE THE PEOPLE', 'NOT ON OUR WATCH', 'USE YOUR VOICE', 'STAND UP SPEAK OUT', 'ACCOUNTABILITY NOW', 'PROTECT OUR RIGHTS', 'NO KINGS', 'POWER TO THE PEOPLE', 'ENOUGH IS ENOUGH', 'HONK HONK HONK', 'DEMOCRACY IS NOT A SPECTATOR SPORT'

### Orientation Hint

Below the two buttons, a brief text:
> 🎲 **Randomize** for instant inspiration — or customize below
> Pick your material, write your message, add stickers. Then hit the streets!

Font: Patrick Hand. Color: muted (#3a3a3a). Centered.

### Empty/Default State

Sign shows "HONK FOR DEMOCRACY" as ghost text (30% opacity) in Permanent Marker font. Not editable until user taps the textarea or hits randomize.

---

## Visual Style (Match the Game)

The mockup uses the SAME visual language as the landing page and in-game Paper Mario aesthetic:

- **Background:** Kraft/cardboard (#c5a059) with SVG fractal noise texture overlay at 12% opacity
- **Borders:** `3px solid #1a1a1a` on panels, `2px solid #1a1a1a` on smaller elements
- **Drop shadows:** `4px 4px 0 rgba(0,0,0,0.4)` on panels, `2px 2px 0` on smaller elements
- **Primary accent:** `#fbbf24` (yellow) — used for selected states, active tabs, buttons
- **Fonts:** `Bangers` for headings/labels, `Patrick Hand` for body text/hints
- **Panel titles:** Use "tape strip" style labels (translucent paper background, slight rotation)
- **Button press effect:** `translate(Npx, Npx)` with shadow reduction on hover/active
- **Sign canvas:** Slight rotation (`transform: rotate(-1.5deg)`) for craft-table feel

---

## What to CUT

- **Tape decorations** — Remove from `signDecorations.ts` exports and UI. Stickers only.
- **"Remove Selected" button** — Replace with per-sticker ✕ in the placed list
- **Fixed bottom CTA** — CTA lives next to Randomize now
- **Single-column layout** — Replaced by responsive two-column / sticky-header

---

## Technical Notes

- `SignCraftScene.ts` (897 lines) will be substantially rewritten for the new DOM structure. The Fabric.js integration and export logic should be preserved as-is.
- New Google Fonts need to be added to the Astro layout head or loaded dynamically: Bungee, Caveat, Fredoka, Protest Guerrilla, Rubik Mono One, Shrikhand (Bangers and Permanent Marker already loaded).
- `signConfig.ts` needs expanded `SIGN_MATERIALS` (13 variants with colors), `SIGN_FONTS` (8 fonts), `SIGN_COLORS` (9 colors).
- The randomize function should live in a utility or method, not inline — it'll be called from the UI button and could be reused for "random sign" in score/share screens later.
- Material system is **purely cosmetic** — no gameplay effects.

---

## Files That Will Change

| File | Change |
|------|--------|
| `src/game/scenes/SignCraftScene.ts` | Major rewrite — new DOM structure, tabbed UI, responsive layout, randomize |
| `src/game/config/signConfig.ts` | Expand materials (13), fonts (8), colors (9), add preset messages |
| `src/lib/signMaterials.ts` | Add color variant texture generation for new materials |
| `src/lib/signDecorations.ts` | Remove tape category, keep stickers |
| `src/layouts/Layout.astro` | Add new Google Fonts |

---

## Success Criteria

1. Sign preview is always visible while editing (sticky on mobile, side-by-side on desktop)
2. Randomize produces a complete, contrast-correct sign with one tap
3. All 13 material swatches, 8 fonts, and 9 colors are selectable and render correctly on the sign
4. Tape is gone, stickers work with per-sticker removal
5. START PROTESTING and RANDOMIZE buttons are visible without scrolling
6. Layout matches the mockup at `mockups/sign-craft-redesign.html` on both mobile (375px) and desktop (1200px+)
7. Existing PNG export pipeline still works — crafted signs appear in-game and on score screen
