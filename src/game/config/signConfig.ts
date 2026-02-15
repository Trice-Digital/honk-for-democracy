/**
 * SignConfig — Sign material properties and message quality scoring.
 *
 * Config-driven. Material choice affects fatigue drain (Phase 4)
 * and weather durability (Phase 5). Message quality affects
 * reaction multiplier during gameplay.
 */

export interface SignMaterial {
  id: string;
  label: string;
  description: string;
  /** Sign board color (hex) */
  boardColor: number;
  /** Sign board stroke color */
  strokeColor: number;
  /** Text color on the sign */
  textColor: string;
  /** Weight affects arm fatigue drain rate (1.0 = normal) */
  fatigueMultiplier: number;
  /** Durability affects how fast weather degrades the sign (1.0 = normal, higher = more durable) */
  durability: number;
  /** Visual style label shown in picker */
  styleLabel: string;
}

export const SIGN_MATERIALS: SignMaterial[] = [
  {
    id: 'cardboard',
    label: 'Cardboard',
    description: 'Light but fragile. Classic protest energy.',
    boardColor: 0xd4a574,
    strokeColor: 0x78350f,
    textColor: '#1a1a1a',
    fatigueMultiplier: 0.8,
    durability: 0.6,
    styleLabel: 'Light / Fragile',
  },
  {
    id: 'posterboard',
    label: 'Posterboard',
    description: 'Clean and balanced. The sensible choice.',
    boardColor: 0xffffff,
    strokeColor: 0x9ca3af,
    textColor: '#1a1a1a',
    fatigueMultiplier: 1.0,
    durability: 1.0,
    styleLabel: 'Balanced',
  },
  {
    id: 'foamboard',
    label: 'Foam Board',
    description: 'Heavy but tough. Built to last.',
    boardColor: 0xf0f0f0,
    strokeColor: 0x374151,
    textColor: '#111827',
    fatigueMultiplier: 1.4,
    durability: 1.6,
    styleLabel: 'Heavy / Durable',
  },
  {
    id: 'wood',
    label: 'Wood Plank',
    description: 'Very heavy, very durable. Serious business.',
    boardColor: 0x8B6914,
    strokeColor: 0x5C4033,
    textColor: '#ffffff',
    fatigueMultiplier: 1.8,
    durability: 2.0,
    styleLabel: 'Heavy / Very Durable',
  },
];

export function getSignMaterial(id: string): SignMaterial {
  return SIGN_MATERIALS.find((m) => m.id === id) ?? SIGN_MATERIALS[0];
}

// ============================================================
// SIGN FONTS AND COLORS (for Fabric.js editor)
// ============================================================

export const SIGN_FONTS = [
  'Permanent Marker',  // Hand-drawn protest sign energy (Google Fonts)
  'Impact',            // Classic bold block letters
  'Courier New',       // Stencil-like monospace
  'Comic Sans MS',     // Casual/fun handwritten
  'Bangers',           // Comic book / pop art bold (Google Fonts)
  'Rubik Mono One',    // Chunky rounded monospace (Google Fonts)
  'Bungee',            // Urban signage / display (Google Fonts)
  'Georgia',           // Elegant serif — "serious protester" energy
];

export const SIGN_COLORS = [
  '#1a1a1a',  // Black (Sharpie)
  '#dc2626',  // Red
  '#2563eb',  // Blue
  '#ffffff',  // White
  '#16a34a',  // Green
  '#7c3aed',  // Purple
  '#ca8a04',  // Gold
];

// ============================================================
// MESSAGE QUALITY SCORING
// ============================================================

/** Keywords that boost message quality (protest-relevant, witty) */
const QUALITY_KEYWORDS = [
  // Thematic
  'honk', 'democracy', 'vote', 'rights', 'freedom', 'peace', 'justice',
  'truth', 'hope', 'change', 'resist', 'unite', 'power', 'people',
  'love', 'future', 'equal', 'fair', 'speak', 'stand',
  // Witty / fun
  'beep', 'toot', 'hey', 'yo', 'wow', 'yes', 'no',
];

/** Phrases that are extra spicy (bonus points) */
const BONUS_PHRASES = [
  'honk for democracy',
  'honk if you',
  'i can\'t believe',
  'this is fine',
  'we the people',
  'land of the free',
  'no justice no peace',
];

/**
 * Score message quality from 0.0 to 1.0.
 *
 * Scoring factors:
 * - Length sweet spot (5-40 chars = good, too short or too long penalized)
 * - Keyword matches
 * - Bonus phrase matches
 * - Has punctuation (! or ?)
 */
export function scoreMessageQuality(message: string): number {
  if (!message || message.trim().length === 0) return 0.1; // Blank sign = minimal quality

  const text = message.trim().toLowerCase();
  let score = 0;

  // Length scoring (0-0.3)
  const len = text.length;
  if (len >= 3 && len <= 8) score += 0.15;       // Short but punchy
  else if (len >= 9 && len <= 25) score += 0.3;   // Sweet spot
  else if (len >= 26 && len <= 40) score += 0.2;  // Getting long but ok
  else if (len > 40) score += 0.1;                // Too wordy
  else score += 0.05;                              // Too short

  // Keyword matches (0-0.35)
  let keywordHits = 0;
  for (const kw of QUALITY_KEYWORDS) {
    if (text.includes(kw)) keywordHits++;
  }
  score += Math.min(keywordHits * 0.1, 0.35);

  // Bonus phrases (0-0.2)
  for (const phrase of BONUS_PHRASES) {
    if (text.includes(phrase)) {
      score += 0.2;
      break; // Only one bonus
    }
  }

  // Punctuation bonus (0-0.1)
  if (text.includes('!') || text.includes('?')) {
    score += 0.1;
  }

  // All caps bonus (shows enthusiasm)
  if (message.trim() === message.trim().toUpperCase() && message.trim().length > 2) {
    score += 0.05;
  }

  // Clamp to 0.1 - 1.0 (minimum 0.1 so even bad signs get some reactions)
  return Math.min(Math.max(score, 0.1), 1.0);
}

// ============================================================
// SIGN DATA (cross-scene transfer)
// ============================================================

export interface SignData {
  material: SignMaterial;
  message: string;
  qualityScore: number;
  // Extended fields for Fabric.js editor (M2 Phase 8)
  fontFamily?: string;
  textColor?: string;
  decorations?: string[];
  signImageDataUrl?: string | null;
}

/** Default sign data used when SignCraftScene is skipped */
export const DEFAULT_SIGN_DATA: SignData = {
  material: SIGN_MATERIALS[0], // Cardboard
  message: 'HONK!',
  qualityScore: 0.4,
  fontFamily: SIGN_FONTS[0], // 'Permanent Marker'
  textColor: SIGN_COLORS[0], // '#1a1a1a' (black)
  decorations: [],
  signImageDataUrl: null,
};

/** Store sign data in Phaser registry */
export function setSignData(scene: Phaser.Scene, data: SignData): void {
  scene.registry.set('signData', data);
}

/** Read sign data from Phaser registry (with fallback) */
export function getSignData(scene: Phaser.Scene): SignData {
  return (scene.registry.get('signData') as SignData) ?? DEFAULT_SIGN_DATA;
}
