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
  /** Base color (hex string) for CSS background in UI swatches */
  baseColor: string;
}

export const SIGN_MATERIALS: SignMaterial[] = [
  // Cardboard variants (4)
  {
    id: 'cardboard',
    label: 'Cardboard (Kraft)',
    description: 'Light but fragile. Classic protest energy.',
    boardColor: 0xc4956a,
    strokeColor: 0x78350f,
    textColor: '#1a1a1a',
    fatigueMultiplier: 0.8,
    durability: 0.6,
    styleLabel: 'Light / Fragile',
    baseColor: '#c4956a',
  },
  {
    id: 'cardboard-red',
    label: 'Cardboard (Red)',
    description: 'Light but fragile. Bold color.',
    boardColor: 0xb85c4a,
    strokeColor: 0x78350f,
    textColor: '#1a1a1a',
    fatigueMultiplier: 0.8,
    durability: 0.6,
    styleLabel: 'Light / Fragile',
    baseColor: '#b85c4a',
  },
  {
    id: 'cardboard-blue',
    label: 'Cardboard (Blue)',
    description: 'Light but fragile. Cool tone.',
    boardColor: 0x6a8fb8,
    strokeColor: 0x78350f,
    textColor: '#1a1a1a',
    fatigueMultiplier: 0.8,
    durability: 0.6,
    styleLabel: 'Light / Fragile',
    baseColor: '#6a8fb8',
  },
  {
    id: 'cardboard-green',
    label: 'Cardboard (Green)',
    description: 'Light but fragile. Earthy vibes.',
    boardColor: 0x7a9a6a,
    strokeColor: 0x78350f,
    textColor: '#1a1a1a',
    fatigueMultiplier: 0.8,
    durability: 0.6,
    styleLabel: 'Light / Fragile',
    baseColor: '#7a9a6a',
  },
  // Posterboard variants (4)
  {
    id: 'posterboard',
    label: 'Posterboard (White)',
    description: 'Clean and balanced. The sensible choice.',
    boardColor: 0xf5f0e8,
    strokeColor: 0x9ca3af,
    textColor: '#1a1a1a',
    fatigueMultiplier: 1.0,
    durability: 1.0,
    styleLabel: 'Balanced',
    baseColor: '#f5f0e8',
  },
  {
    id: 'posterboard-yellow',
    label: 'Posterboard (Yellow)',
    description: 'Clean and balanced. Bright and visible.',
    boardColor: 0xfbbf24,
    strokeColor: 0x9ca3af,
    textColor: '#1a1a1a',
    fatigueMultiplier: 1.0,
    durability: 1.0,
    styleLabel: 'Balanced',
    baseColor: '#fbbf24',
  },
  {
    id: 'posterboard-pink',
    label: 'Posterboard (Pink)',
    description: 'Clean and balanced. Fun and friendly.',
    boardColor: 0xf472b6,
    strokeColor: 0x9ca3af,
    textColor: '#1a1a1a',
    fatigueMultiplier: 1.0,
    durability: 1.0,
    styleLabel: 'Balanced',
    baseColor: '#f472b6',
  },
  {
    id: 'posterboard-sky',
    label: 'Posterboard (Sky)',
    description: 'Clean and balanced. Sky blue.',
    boardColor: 0x7dd3fc,
    strokeColor: 0x9ca3af,
    textColor: '#1a1a1a',
    fatigueMultiplier: 1.0,
    durability: 1.0,
    styleLabel: 'Balanced',
    baseColor: '#7dd3fc',
  },
  // Foam Board variants (3)
  {
    id: 'foamboard',
    label: 'Foam Board (White)',
    description: 'Heavy but tough. Built to last.',
    boardColor: 0xe8e8e8,
    strokeColor: 0x374151,
    textColor: '#111827',
    fatigueMultiplier: 1.4,
    durability: 1.6,
    styleLabel: 'Heavy / Durable',
    baseColor: '#e8e8e8',
  },
  {
    id: 'foamboard-green',
    label: 'Foam Board (Green)',
    description: 'Heavy but tough. Fresh green.',
    boardColor: 0x86efac,
    strokeColor: 0x374151,
    textColor: '#111827',
    fatigueMultiplier: 1.4,
    durability: 1.6,
    styleLabel: 'Heavy / Durable',
    baseColor: '#86efac',
  },
  {
    id: 'foamboard-purple',
    label: 'Foam Board (Purple)',
    description: 'Heavy but tough. Bold purple.',
    boardColor: 0xc4b5fd,
    strokeColor: 0x374151,
    textColor: '#111827',
    fatigueMultiplier: 1.4,
    durability: 1.6,
    styleLabel: 'Heavy / Durable',
    baseColor: '#c4b5fd',
  },
  // Wood Plank variants (2)
  {
    id: 'wood',
    label: 'Wood Plank (Light)',
    description: 'Very heavy, very durable. Serious business.',
    boardColor: 0xDEB887,
    strokeColor: 0x5C4033,
    textColor: '#1a1a1a',
    fatigueMultiplier: 1.8,
    durability: 2.0,
    styleLabel: 'Heavy / Very Durable',
    baseColor: 'linear-gradient(180deg, #DEB887 0%, #B8860B 100%)',
  },
  {
    id: 'wood-dark',
    label: 'Wood Plank (Dark)',
    description: 'Very heavy, very durable. Dark stain.',
    boardColor: 0x8B7355,
    strokeColor: 0x5C4033,
    textColor: '#ffffff',
    fatigueMultiplier: 1.8,
    durability: 2.0,
    styleLabel: 'Heavy / Very Durable',
    baseColor: 'linear-gradient(180deg, #8B7355 0%, #5C4033 100%)',
  },
];

export function getSignMaterial(id: string): SignMaterial {
  return SIGN_MATERIALS.find((m) => m.id === id) ?? SIGN_MATERIALS[0];
}

// ============================================================
// SIGN FONTS AND COLORS (for Fabric.js editor)
// ============================================================

export const SIGN_FONTS = [
  'Bangers',
  'Permanent Marker',
  'Bungee',
  'Caveat',
  'Fredoka',
  'Protest Guerrilla',
  'Rubik Mono One',
  'Shrikhand',
];

export const SIGN_COLORS = [
  '#1a1a1a',  // Black
  '#FFFFFF',  // White
  '#DC143C',  // Red
  '#1E90FF',  // Blue
  '#228B22',  // Green
  '#fbbf24',  // Yellow
  '#FF8C00',  // Orange
  '#8B008B',  // Purple
  '#FF1493',  // Hot Pink
];

// ============================================================
// PRESET MESSAGES (for randomize feature)
// ============================================================

export const PRESET_MESSAGES = [
  'HONK FOR DEMOCRACY',
  'HONK IF YOU CARE',
  'RESIST',
  'PEOPLE OVER PROFIT',
  'WE THE PEOPLE',
  'NOT ON OUR WATCH',
  'USE YOUR VOICE',
  'STAND UP SPEAK OUT',
  'ACCOUNTABILITY NOW',
  'PROTECT OUR RIGHTS',
  'NO KINGS',
  'POWER TO THE PEOPLE',
  'ENOUGH IS ENOUGH',
  'HONK HONK HONK',
  'DEMOCRACY IS NOT A SPECTATOR SPORT',
];

// ============================================================
// MATERIAL GROUPS (for UI organization)
// ============================================================

export type MaterialGroup = { label: string; emoji: string; materials: SignMaterial[] };

export function getMaterialGroups(): MaterialGroup[] {
  return [
    { label: 'Cardboard', emoji: '\uD83D\uDCE6', materials: SIGN_MATERIALS.filter(m => m.id.startsWith('cardboard')) },
    { label: 'Posterboard', emoji: '\uD83C\uDFA8', materials: SIGN_MATERIALS.filter(m => m.id.startsWith('posterboard')) },
    { label: 'Foam Board', emoji: '\uD83E\uDDCA', materials: SIGN_MATERIALS.filter(m => m.id.startsWith('foamboard')) },
    { label: 'Wood Plank', emoji: '\uD83E\uDEB5', materials: SIGN_MATERIALS.filter(m => m.id.startsWith('wood')) },
  ];
}

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
