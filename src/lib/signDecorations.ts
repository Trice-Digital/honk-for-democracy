/**
 * SignDecorations — Decorative elements for sign editor.
 *
 * Provides:
 * - Emoji stickers (rendered as text on canvas, no asset files needed)
 *
 * Architecture: Pure TypeScript, no dependencies. SignEditor loads emoji
 * stickers as FabricText objects.
 */

export interface DecorationDef {
  id: string;
  category: 'sticker';
  label: string;
  svgString: string;
  defaultWidth: number;
  defaultHeight: number;
}

/** Emoji sticker definition (rendered as FabricText, not SVG) */
export interface EmojiDef {
  emoji: string;
  label: string;
}

// ============================================================
// EMOJI CATEGORIES — organized for easy browsing
// ============================================================

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: EmojiDef[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'protest',
    label: 'Protest',
    emojis: [
      { emoji: '\u270A', label: 'Raised Fist' },
      { emoji: '\u2764\uFE0F', label: 'Red Heart' },
      { emoji: '\u262E\uFE0F', label: 'Peace' },
      { emoji: '\u2728', label: 'Sparkles' },
      { emoji: '\uD83D\uDCE2', label: 'Loudspeaker' },
      { emoji: '\uD83D\uDCAA', label: 'Flexed Bicep' },
      { emoji: '\uD83C\uDF1F', label: 'Glowing Star' },
      { emoji: '\uD83D\uDD25', label: 'Fire' },
      { emoji: '\uD83D\uDCAF', label: '100' },
      { emoji: '\uD83C\uDDF8', label: 'Flag S' },
      { emoji: '\uD83D\uDDE3\uFE0F', label: 'Speaking Head' },
      { emoji: '\uD83E\uDD1D', label: 'Handshake' },
      { emoji: '\uD83C\uDF0D', label: 'Globe' },
      { emoji: '\uD83D\uDCCC', label: 'Pushpin' },
      { emoji: '\uD83C\uDFC6', label: 'Trophy' },
    ],
  },
  {
    id: 'faces',
    label: 'Faces',
    emojis: [
      { emoji: '\uD83D\uDE00', label: 'Grinning' },
      { emoji: '\uD83D\uDE02', label: 'Tears of Joy' },
      { emoji: '\uD83D\uDE0D', label: 'Heart Eyes' },
      { emoji: '\uD83E\uDD29', label: 'Star Struck' },
      { emoji: '\uD83E\uDD2F', label: 'Mind Blown' },
      { emoji: '\uD83D\uDE0E', label: 'Sunglasses' },
      { emoji: '\uD83E\uDD14', label: 'Thinking' },
      { emoji: '\uD83D\uDE21', label: 'Angry' },
      { emoji: '\uD83D\uDE31', label: 'Screaming' },
      { emoji: '\uD83E\uDD7A', label: 'Pleading' },
      { emoji: '\uD83E\uDD73', label: 'Partying' },
      { emoji: '\uD83E\uDEE1', label: 'Salute' },
      { emoji: '\uD83D\uDE09', label: 'Winking' },
      { emoji: '\uD83D\uDE4F', label: 'Folded Hands' },
      { emoji: '\uD83D\uDE4C', label: 'Raising Hands' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    emojis: [
      { emoji: '\u2B50', label: 'Star' },
      { emoji: '\u26A1', label: 'Lightning' },
      { emoji: '\uD83C\uDF08', label: 'Rainbow' },
      { emoji: '\u2705', label: 'Check Mark' },
      { emoji: '\u274C', label: 'Cross Mark' },
      { emoji: '\u2757', label: 'Exclamation' },
      { emoji: '\u2753', label: 'Question' },
      { emoji: '\u267B\uFE0F', label: 'Recycle' },
      { emoji: '\uD83D\uDCA5', label: 'Boom' },
      { emoji: '\uD83D\uDCAB', label: 'Dizzy' },
      { emoji: '\uD83C\uDF1E', label: 'Sun Face' },
      { emoji: '\uD83C\uDF3B', label: 'Sunflower' },
      { emoji: '\uD83C\uDF3A', label: 'Hibiscus' },
      { emoji: '\uD83C\uDF40', label: 'Four Leaf Clover' },
      { emoji: '\uD83E\uDD8B', label: 'Butterfly' },
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    emojis: [
      { emoji: '\uD83E\uDD86', label: 'Duck' },
      { emoji: '\uD83D\uDC25', label: 'Baby Chick' },
      { emoji: '\uD83D\uDC1D', label: 'Bee' },
      { emoji: '\uD83E\uDD85', label: 'Eagle' },
      { emoji: '\uD83E\uDD81', label: 'Lion' },
      { emoji: '\uD83D\uDC3B', label: 'Bear' },
      { emoji: '\uD83D\uDC36', label: 'Dog' },
      { emoji: '\uD83D\uDC31', label: 'Cat' },
      { emoji: '\uD83E\uDD8A', label: 'Fox' },
      { emoji: '\uD83E\uDD89', label: 'Owl' },
      { emoji: '\uD83D\uDC22', label: 'Turtle' },
      { emoji: '\uD83D\uDC0D', label: 'Snake' },
    ],
  },
  {
    id: 'objects',
    label: 'Things',
    emojis: [
      { emoji: '\uD83D\uDE97', label: 'Car' },
      { emoji: '\uD83D\uDEA8', label: 'Police Light' },
      { emoji: '\uD83C\uDFB5', label: 'Musical Note' },
      { emoji: '\uD83C\uDFA4', label: 'Microphone' },
      { emoji: '\uD83D\uDCF7', label: 'Camera' },
      { emoji: '\uD83D\uDCFA', label: 'Television' },
      { emoji: '\uD83D\uDCF0', label: 'Newspaper' },
      { emoji: '\uD83C\uDFAC', label: 'Clapper Board' },
      { emoji: '\uD83D\uDD14', label: 'Bell' },
      { emoji: '\uD83C\uDF89', label: 'Party Popper' },
      { emoji: '\uD83C\uDF88', label: 'Balloon' },
      { emoji: '\uD83C\uDF86', label: 'Fireworks' },
    ],
  },
];

// ============================================================
// EXPORTS
// ============================================================

export const DECORATIONS: DecorationDef[] = [
  // No SVG decorations — stickers are emoji-based via EMOJI_CATEGORIES
];

/**
 * Get decorations filtered by category.
 */
export function getDecorationsByCategory(category: string): DecorationDef[] {
  return DECORATIONS.filter((d) => d.category === category);
}
