/**
 * SignDecorations — Decorative elements for sign editor.
 *
 * Provides:
 * - Emoji stickers (rendered as text on canvas, no asset files needed)
 * - Tape accents (SVG-based strips)
 *
 * Architecture: Pure TypeScript, no dependencies. SignEditor loads SVG
 * decorations as Fabric.js FabricImage objects, and emoji stickers as
 * FabricText objects.
 */

export interface DecorationDef {
  id: string;
  category: 'sticker' | 'tape';
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
// TAPE ACCENTS — Rectangular strips that look like tape
// ============================================================

const TAPE_DUCT: DecorationDef = {
  id: 'duct-tape',
  category: 'tape',
  label: 'Duct Tape',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 30">
    <rect x="0" y="0" width="150" height="30" fill="#9ca3af"/>
    <rect x="5" y="3" width="140" height="24" fill="#d1d5db" opacity="0.3"/>
    <line x1="0" y1="8" x2="150" y2="8" stroke="#6b7280" stroke-width="0.5" opacity="0.5"/>
    <line x1="0" y1="15" x2="150" y2="15" stroke="#6b7280" stroke-width="0.5" opacity="0.5"/>
    <line x1="0" y1="22" x2="150" y2="22" stroke="#6b7280" stroke-width="0.5" opacity="0.5"/>
  </svg>`,
  defaultWidth: 120,
  defaultHeight: 24,
};

const TAPE_WASHI: DecorationDef = {
  id: 'washi-tape',
  category: 'tape',
  label: 'Washi Tape',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 30">
    <rect x="0" y="0" width="150" height="30" fill="#7c3aed"/>
    <rect x="0" y="0" width="15" height="30" fill="#ffffff" opacity="0.4"/>
    <rect x="30" y="0" width="15" height="30" fill="#ffffff" opacity="0.4"/>
    <rect x="60" y="0" width="15" height="30" fill="#ffffff" opacity="0.4"/>
    <rect x="90" y="0" width="15" height="30" fill="#ffffff" opacity="0.4"/>
    <rect x="120" y="0" width="15" height="30" fill="#ffffff" opacity="0.4"/>
  </svg>`,
  defaultWidth: 120,
  defaultHeight: 24,
};

const TAPE_MASKING: DecorationDef = {
  id: 'masking-tape',
  category: 'tape',
  label: 'Masking Tape',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 30">
    <rect x="0" y="0" width="150" height="30" fill="#d4a574"/>
    <path d="M0,0 L5,2 L10,0 L15,3 L20,1 L25,2 L30,0 L35,3 L40,1 L45,2 L50,0 L55,3 L60,1 L65,2 L70,0 L75,3 L80,1 L85,2 L90,0 L95,3 L100,1 L105,2 L110,0 L115,3 L120,1 L125,2 L130,0 L135,3 L140,1 L145,2 L150,0 L150,30 L0,30 Z"
          fill="#e5be8f" opacity="0.5"/>
    <path d="M150,30 L145,28 L140,30 L135,27 L130,29 L125,28 L120,30 L115,27 L110,29 L105,28 L100,30 L95,27 L90,29 L85,28 L80,30 L75,27 L70,29 L65,28 L60,30 L55,27 L50,29 L45,28 L40,30 L35,27 L30,29 L25,28 L20,30 L15,27 L10,29 L5,28 L0,30"
          fill="#78350f" opacity="0.3" stroke="none"/>
  </svg>`,
  defaultWidth: 120,
  defaultHeight: 24,
};

// ============================================================
// EXPORTS
// ============================================================

export const DECORATIONS: DecorationDef[] = [
  // Tape accents
  TAPE_DUCT,
  TAPE_WASHI,
  TAPE_MASKING,
];

/**
 * Get decorations filtered by category.
 */
export function getDecorationsByCategory(category: string): DecorationDef[] {
  return DECORATIONS.filter((d) => d.category === category);
}
