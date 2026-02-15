/**
 * ShareConfig — Share card layout constants for 1080x1080 Polaroid-style image.
 *
 * Used by ShareCardGenerator (src/lib/ShareCardGenerator.ts) to composite
 * a shareable image from the player's sign, score, and grade.
 *
 * Paper Mario protest aesthetic: construction paper, Bangers font,
 * hard-offset shadows, masking tape accents.
 */

export const SHARE_CONFIG = {
  // Canvas dimensions (optimized for social media square format)
  canvas: {
    width: 1080,
    height: 1080,
  },

  // Background — cardboard color with paper grain overlay
  background: {
    color: '#c5a059',
    grainColor: '#1a1a1a',
    grainAlpha: 0.04,
    /** Approximate grain line density: one line per N square pixels */
    grainLineDensity: 200,
    /** Approximate grain dot density: one dot per N square pixels */
    grainDotDensity: 600,
  },

  // Polaroid frame — white rectangle with hard-offset shadow
  frame: {
    inset: 60,
    color: '#f5f0e8',
    borderWidth: 3,
    borderColor: '#1a1a1a',
    // Hard-offset drop shadow (no blur — paper cutout style)
    shadow: {
      offsetX: 3,
      offsetY: 3,
      color: '#2a2a2a',
      alpha: 0.35,
    },
    /** Inner padding within the Polaroid frame */
    padding: 30,
  },

  // Sign image area — centered in top portion of frame
  signImage: {
    maxWidth: 800,
    maxHeight: 500,
    /** Vertical offset from top of frame interior */
    topOffset: 30,
    /** Thin border around sign image for definition */
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },

  // Caption text: "I stood my ground at [Intersection Name]"
  caption: {
    template: 'I stood my ground at {intersectionName}',
    font: "'Bangers', 'Impact', sans-serif",
    fontSize: 42,
    color: '#1a1a1a',
    /** Min font size before giving up on fitting */
    minFontSize: 28,
    /** Gap below sign image */
    topGap: 24,
  },

  // Score display: grade badge + score pts
  score: {
    font: "'Bangers', 'Impact', sans-serif",
    gradeFontSize: 56,
    scoreFontSize: 48,
    /** Grade letter drawn inside a filled circle */
    gradeCircleRadius: 36,
    gradeCircleBorderWidth: 3,
    gradeCircleBorderColor: '#1a1a1a',
    scoreColor: '#1a1a1a',
    ptsLabel: 'pts',
    /** Gap below caption */
    topGap: 20,
  },

  // Branding: "HonkForDemocracy.org"
  branding: {
    text: 'HonkForDemocracy.org',
    font: "'Bangers', 'Impact', sans-serif",
    fontSize: 36,
    color: '#3b82f6',
    /** Gap from bottom of frame interior */
    bottomGap: 16,
  },

  // Tape accent — rotated semi-transparent strip on top-right corner
  tape: {
    width: 120,
    height: 30,
    color: '#f0ead6',
    alpha: 0.55,
    /** Rotation angle in degrees (converted to radians at draw time) */
    angleDeg: 15,
    /** Wobble amplitude for ragged edges (pixels) */
    wobbleAmount: 1.5,
    /** Number of wobble points per edge */
    wobblePoints: 3,
  },

  // Default intersection name (hardcoded for MVP — only one map)
  defaultIntersectionName: 'The Corner',
} as const;
