---
phase: 11-social-share
plan: 02
status: done
---

# 11-02 Summary: Share UI + Download/Share Service

## What was built

### 1. `src/lib/ShareService.ts` — Download and Web Share API integration

Pure DOM utility module (no Phaser dependency). Exports three functions:

- **`canNativeShare(): boolean`** — Detects Web Share API with file sharing support. Tests `navigator.share`, `navigator.canShare`, and actual file sharing capability via `navigator.canShare({ files: [...] })` wrapped in try/catch.

- **`downloadImage(dataUrl, filename?): Promise<void>`** — Downloads a PNG data URL. Uses the `<a download>` trick on most browsers. iOS Safari fallback: detects missing `download` attribute support and opens the image in a new tab via `window.open()` for long-press save. Default filename: `honk-for-democracy-{timestamp}.png`.

- **`nativeShare(dataUrl, title?, text?): Promise<boolean>`** — Shares via Web Share API with file attachment. Converts data URL to Blob/File, calls `navigator.share()`. Returns true on success, false on user cancel (AbortError). Falls back to `downloadImage()` on other failures. Default title: "My Protest Sign", default text: "I stood my ground at HonkForDemocracy.org".

### 2. `src/game/scenes/ScoreScene.ts` — Share flow UI in score screen

Modified the button area to support a two-phase share flow:

**Phase 1 — Pre-share buttons:**
- "SHARE YOUR PROTEST" (primary, actionBlue, 260x52) — triggers share card generation
- "SKIP TO ACTION" (text link, craftBrown) — goes directly to ActivismScene
- "PLAY AGAIN" (secondary, paperWhite, 260x44) — goes to SignCraftScene

**When "SHARE YOUR PROTEST" is tapped:**
- Button text changes to "CREATING..." with pulse animation
- Calls `generateShareCard()` with sign image, score, grade label, and grade color from registry
- Caches the result in `shareCardDataUrl` to avoid regeneration

**Phase 2 — Post-share buttons (after card generated):**
- Card preview (~200px wide, 1:1 ratio) with paper shadow
- "SAVE IMAGE" (primary, stoplightGreen, 260x48) — calls `downloadImage()`
- "SHARE" (primary, actionBlue, 260x48, only if `canNativeShare()`) — calls `nativeShare()`
- "TAKE REAL ACTION" (secondary, paperWhite, 260x44) — goes to ActivismScene
- "PLAY AGAIN" (text link) — goes to SignCraftScene

**Error handling:** If `generateShareCard()` returns empty string, shows a "Couldn't create share image" toast (fades out after 2s) and falls back to the original Continue + Play Again buttons.

**Key design decisions:**
- All buttons match existing neobrutalist pattern: hard-offset shadow, press-into-shadow on click, hover fill change
- Button area Y calculation uses `height - 240` to accommodate the taller layout
- Pre-share elements are collected in an array and destroyed when transitioning to post-share UI
- Share card data URL is cached on the scene instance so download/share can be tapped multiple times without regeneration
- Download/share buttons restore themselves after a brief delay (200-300ms) for repeat taps

### 3. `src/game/scenes/ActivismScene.ts` — No changes needed

The existing `this.scene.start('ActivismScene')` flow works as-is. ActivismScene reads no share-specific data.

## Verification

- `npm run build` — passes cleanly, no errors or warnings
- `generateShareCard` imported in ScoreScene
- `downloadImage`, `canNativeShare`, `nativeShare` imported in ScoreScene
- `ActivismScene` transitions preserved (both "SKIP TO ACTION" and "TAKE REAL ACTION")
- `SignCraftScene` transitions preserved ("PLAY AGAIN" in both phases)

## Files created/modified

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ShareService.ts` | Created | Download + Web Share API utility module |
| `src/game/scenes/ScoreScene.ts` | Modified | Share button UI, card preview, download/share flow |
