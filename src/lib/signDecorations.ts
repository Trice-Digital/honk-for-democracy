/**
 * SignDecorations — SVG-based decorative elements for sign editor.
 *
 * Provides stickers, tape accents, and drawn flourishes that players can
 * drag onto their signs for arts & crafts personality.
 *
 * Architecture: Pure TypeScript, no dependencies. SignEditor loads these
 * as Fabric.js FabricImage objects via data URLs.
 */

export interface DecorationDef {
  id: string;
  category: 'sticker' | 'tape' | 'drawn';
  label: string;
  svgString: string;
  defaultWidth: number;
  defaultHeight: number;
}

// ============================================================
// STICKERS — Small SVG shapes placed on the sign
// ============================================================

const STICKER_PEACE: DecorationDef = {
  id: 'peace-sign',
  category: 'sticker',
  label: 'Peace Sign',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" stroke-width="6"/>
    <line x1="50" y1="50" x2="50" y2="10" stroke="#1a1a1a" stroke-width="6"/>
    <line x1="50" y1="50" x2="20" y2="80" stroke="#1a1a1a" stroke-width="6"/>
    <line x1="50" y1="50" x2="80" y2="80" stroke="#1a1a1a" stroke-width="6"/>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 60,
};

const STICKER_HEART: DecorationDef = {
  id: 'heart',
  category: 'sticker',
  label: 'Heart',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M50,85 C50,85 15,60 15,40 C15,25 25,15 35,15 C42,15 47,20 50,25 C53,20 58,15 65,15 C75,15 85,25 85,40 C85,60 50,85 50,85 Z"
          fill="#dc2626" stroke="#1a1a1a" stroke-width="3"/>
  </svg>`,
  defaultWidth: 50,
  defaultHeight: 50,
};

const STICKER_STAR: DecorationDef = {
  id: 'star',
  category: 'sticker',
  label: 'Star',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M50,10 L60,40 L90,40 L65,60 L75,90 L50,70 L25,90 L35,60 L10,40 L40,40 Z"
          fill="#ca8a04" stroke="#1a1a1a" stroke-width="3"/>
  </svg>`,
  defaultWidth: 55,
  defaultHeight: 55,
};

const STICKER_FIST: DecorationDef = {
  id: 'fist',
  category: 'sticker',
  label: 'Raised Fist',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="30" y="50" width="40" height="35" rx="5" fill="#1a1a1a"/>
    <rect x="25" y="35" width="10" height="20" rx="3" fill="#1a1a1a"/>
    <rect x="35" y="30" width="10" height="25" rx="3" fill="#1a1a1a"/>
    <rect x="45" y="28" width="10" height="27" rx="3" fill="#1a1a1a"/>
    <rect x="55" y="30" width="10" height="25" rx="3" fill="#1a1a1a"/>
    <rect x="65" y="35" width="10" height="20" rx="3" fill="#1a1a1a"/>
    <ellipse cx="50" cy="85" rx="22" ry="12" fill="#1a1a1a"/>
  </svg>`,
  defaultWidth: 50,
  defaultHeight: 70,
};

const STICKER_MEGAPHONE: DecorationDef = {
  id: 'megaphone',
  category: 'sticker',
  label: 'Megaphone',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M20,40 L60,20 L60,80 L20,60 Z" fill="#2563eb" stroke="#1a1a1a" stroke-width="3"/>
    <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2563eb" stroke="#1a1a1a" stroke-width="3"/>
    <path d="M60,30 L75,25 L75,75 L60,70" fill="#e0e0e0" stroke="#1a1a1a" stroke-width="2"/>
    <circle cx="80" cy="50" r="12" fill="none" stroke="#1a1a1a" stroke-width="2"/>
    <circle cx="90" cy="50" r="8" fill="none" stroke="#1a1a1a" stroke-width="2"/>
  </svg>`,
  defaultWidth: 65,
  defaultHeight: 50,
};

const STICKER_SMILEY: DecorationDef = {
  id: 'smiley',
  category: 'sticker',
  label: 'Smiley Face',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="#ca8a04" stroke="#1a1a1a" stroke-width="4"/>
    <circle cx="35" cy="40" r="5" fill="#1a1a1a"/>
    <circle cx="65" cy="40" r="5" fill="#1a1a1a"/>
    <path d="M30,60 Q50,75 70,60" fill="none" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
  </svg>`,
  defaultWidth: 50,
  defaultHeight: 50,
};

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
// DRAWN ACCENTS — Hand-drawn SVG flourishes
// ============================================================

const DRAWN_STARS: DecorationDef = {
  id: 'drawn-stars',
  category: 'drawn',
  label: 'Drawn Stars',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">
    <path d="M15,20 L17,25 L23,25 L18,29 L20,35 L15,31 L10,35 L12,29 L7,25 L13,25 Z"
          fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50,15 L52,21 L58,21 L53,25 L55,31 L50,27 L45,31 L47,25 L42,21 L48,21 Z"
          fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M85,18 L87,23 L93,23 L88,27 L90,33 L85,29 L80,33 L82,27 L77,23 L83,23 Z"
          fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 32,
};

const DRAWN_HEARTS: DecorationDef = {
  id: 'drawn-hearts',
  category: 'drawn',
  label: 'Drawn Hearts',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
    <path d="M20,25 C20,18 25,15 28,15 C30,15 32,17 33,20 C34,17 36,15 38,15 C41,15 46,18 46,25 C46,32 33,42 33,42 C33,42 20,32 20,25 Z"
          fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M54,20 C54,14 58,12 61,12 C63,12 64,14 65,16 C66,14 67,12 69,12 C72,12 76,14 76,20 C76,26 65,35 65,35 C65,35 54,26 54,20 Z"
          fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 40,
};

const DRAWN_ARROW: DecorationDef = {
  id: 'drawn-arrow',
  category: 'drawn',
  label: 'Drawn Arrow',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">
    <path d="M5,20 Q30,18 50,20 T95,20"
          fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
    <path d="M85,10 L95,20 L85,30"
          fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 32,
};

const DRAWN_UNDERLINE: DecorationDef = {
  id: 'drawn-underline',
  category: 'drawn',
  label: 'Wavy Underline',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20">
    <path d="M5,10 Q15,5 25,10 T45,10 T65,10 T85,10 T105,10 L115,10"
          fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  defaultWidth: 100,
  defaultHeight: 16,
};

const DRAWN_EXCLAMATIONS: DecorationDef = {
  id: 'drawn-exclamations',
  category: 'drawn',
  label: 'Exclamation Marks',
  svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60">
    <line x1="20" y1="10" x2="20" y2="35" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="20" cy="45" r="3" fill="#1a1a1a"/>
    <line x1="40" y1="15" x2="40" y2="38" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="40" cy="48" r="3" fill="#1a1a1a"/>
    <line x1="60" y1="12" x2="60" y2="37" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="60" cy="47" r="3" fill="#1a1a1a"/>
  </svg>`,
  defaultWidth: 65,
  defaultHeight: 50,
};

// ============================================================
// EXPORTS
// ============================================================

export const DECORATIONS: DecorationDef[] = [
  // Stickers
  STICKER_PEACE,
  STICKER_HEART,
  STICKER_STAR,
  STICKER_FIST,
  STICKER_MEGAPHONE,
  STICKER_SMILEY,
  // Tape accents
  TAPE_DUCT,
  TAPE_WASHI,
  TAPE_MASKING,
  // Drawn accents
  DRAWN_STARS,
  DRAWN_HEARTS,
  DRAWN_ARROW,
  DRAWN_UNDERLINE,
  DRAWN_EXCLAMATIONS,
];

/**
 * Get decorations filtered by category.
 */
export function getDecorationsByCategory(category: string): DecorationDef[] {
  return DECORATIONS.filter((d) => d.category === category);
}
