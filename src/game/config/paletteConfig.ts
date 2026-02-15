/** Paper Mario Protest — Color Palette
 *  Locked 2026-02-14. All Phase 9 visuals reference this palette.
 */
export const PALETTE = {
  // Core scene colors
  asphalt:        0x3a3a3a,  // Road, dark backgrounds
  cardboard:      0xc5a059,  // UI panels, sign materials
  paperWhite:     0xf5f0e8,  // Light surfaces, paper
  markerBlack:    0x1a1a1a,  // Outlines, text shadows

  // Traffic light / feedback
  safetyYellow:   0xfbbf24,  // Score, highlights, traffic light
  stoplightRed:   0xef4444,  // Danger, fatigue, negative reactions
  stoplightGreen: 0x22c55e,  // Go, positive reactions, confidence

  // Interactive
  actionBlue:     0x3b82f6,  // Buttons, CTAs, interactive elements
  craftBrown:     0x92400e,  // Popsicle sticks, sign poles

  // Environment
  grassGreen:     0x6b8f5e,  // Construction paper grass (muted, not digital)
  sidewalkTan:    0xd4b896,  // Construction paper sidewalk
  skyBlue:        0xa8c8e8,  // Background sky (muted, papery)

  // Paper shadow (used by all cutout shadows)
  shadowDark:     0x2a2a2a,  // Hard offset shadow color
  shadowAlpha:    0.35,      // Shadow opacity

  // Drop shadow offsets (pixels)
  shadowOffsetX:  3,
  shadowOffsetY:  3,
} as const;

// Construction paper car colors (warm, muted — not digital-bright)
export const CAR_PAPER_COLORS = [
  0xc0392b,  // construction paper red
  0x2980b9,  // construction paper blue
  0x27ae60,  // construction paper green
  0xf39c12,  // construction paper yellow/orange
  0x8e44ad,  // construction paper purple
  0xe67e22,  // construction paper orange
  0x7f8c8d,  // construction paper gray
  0xecf0f1,  // construction paper white
  0x2c3e50,  // construction paper dark blue
  0x16a085,  // construction paper teal
] as const;

/** UI Font: Bangers (chunky, bold, game-feel). Used for HUD, buttons, headings.
 *  Sign Creator Font: Permanent Marker (handwritten). Used inside Fabric.js editor.
 *  Both must be loaded via Google Fonts CDN <link> in index.astro head.
 */
export const FONTS = {
  ui: "'Bangers', cursive",
  signCreator: "'Permanent Marker', cursive",
} as const;
