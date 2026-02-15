/**
 * ReactionConfig — Reaction types, weights, scoring, and visuals.
 *
 * Shared across all maps. Weights adjusted by DifficultyConfig.
 */

export interface ReactionType {
  id: string;
  label: string;
  emoji: string;
  /** Text portion of speech bubble (Bangers font). Matches mockup Section 5. */
  bubbleLabel: string;
  /** Emoji portion of speech bubble (system emoji font). Rendered separately to avoid boxes. */
  bubbleEmoji: string;
  scoreValue: number;
  /** Base weight (before difficulty adjustment). Must sum to 1.0 across all types. */
  baseWeight: number;
  /** 'positive' | 'neutral' | 'negative' */
  sentiment: 'positive' | 'neutral' | 'negative';
  /** Color for score floater */
  color: number;
}

export const REACTION_TYPES: ReactionType[] = [
  // Positive (~60% base) — bubble content matches mockup Section 5
  { id: 'thumbsup',   label: 'Thumbs Up',     emoji: '👍', bubbleLabel: '',       bubbleEmoji: '👍', scoreValue: 5,   baseWeight: 0.25, sentiment: 'positive', color: 0x22c55e },
  { id: 'honk',       label: 'Honk!',         emoji: '🎺', bubbleLabel: 'HONK!',  bubbleEmoji: '🎺', scoreValue: 10,  baseWeight: 0.20, sentiment: 'positive', color: 0x22c55e },
  { id: 'yeah',       label: 'Yeah!',         emoji: '✊', bubbleLabel: 'YEAH!',  bubbleEmoji: '✊', scoreValue: 25,  baseWeight: 0.05, sentiment: 'positive', color: 0xfbbf24 },
  { id: 'rockon',     label: 'Rock On',       emoji: '🤘', bubbleLabel: '',       bubbleEmoji: '🤘', scoreValue: 8,   baseWeight: 0.10, sentiment: 'positive', color: 0x22c55e },

  // Neutral (~25% base)
  { id: 'nothing',    label: 'Nothing',       emoji: '',   bubbleLabel: '',       bubbleEmoji: '',   scoreValue: 0,   baseWeight: 0.15, sentiment: 'neutral',  color: 0x6b7280 },
  { id: 'stare',      label: 'Stare',         emoji: '',   bubbleLabel: '. . .',  bubbleEmoji: '',   scoreValue: 0,   baseWeight: 0.10, sentiment: 'neutral',  color: 0x6b7280 },

  // Negative (~15% base)
  { id: 'thumbsdown', label: 'Thumbs Down',   emoji: '👎', bubbleLabel: '',       bubbleEmoji: '👎', scoreValue: -5,  baseWeight: 0.05, sentiment: 'negative', color: 0xef4444 },
  { id: 'finger',     label: 'Middle Finger', emoji: '🖕', bubbleLabel: '',       bubbleEmoji: '🖕', scoreValue: -10, baseWeight: 0.05, sentiment: 'negative', color: 0xef4444 },
  { id: 'yell',       label: 'Yelled At',     emoji: '🤬', bubbleLabel: '&*#%!', bubbleEmoji: '',   scoreValue: -15, baseWeight: 0.03, sentiment: 'negative', color: 0xef4444 },
  { id: 'coalroller', label: 'Coal Roller',   emoji: '💨', bubbleLabel: '',       bubbleEmoji: '💨', scoreValue: -20, baseWeight: 0.02, sentiment: 'negative', color: 0x7f1d1d },
];

/**
 * Adjust reaction weights based on difficulty sentiment multipliers.
 * Returns a new array with recalculated weights that sum to 1.0.
 */
export function getAdjustedWeights(
  positiveMultiplier: number,
  neutralMultiplier: number,
  negativeMultiplier: number,
): { id: string; weight: number }[] {
  const adjusted = REACTION_TYPES.map((r) => {
    let multiplier = 1;
    switch (r.sentiment) {
      case 'positive': multiplier = positiveMultiplier; break;
      case 'neutral':  multiplier = neutralMultiplier; break;
      case 'negative': multiplier = negativeMultiplier; break;
    }
    return { id: r.id, weight: r.baseWeight * multiplier };
  });

  // Normalize to sum to 1.0
  const total = adjusted.reduce((sum, a) => sum + a.weight, 0);
  return adjusted.map((a) => ({ id: a.id, weight: a.weight / total }));
}

/**
 * Pick a reaction based on weighted random selection.
 */
export function rollReaction(weights: { id: string; weight: number }[]): ReactionType {
  const roll = Math.random();
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w.weight;
    if (roll <= cumulative) {
      const found = REACTION_TYPES.find((r) => r.id === w.id);
      if (found) return found;
    }
  }
  // Fallback (should never happen if weights sum to 1)
  return REACTION_TYPES.find((r) => r.id === 'nothing') ?? REACTION_TYPES[0];
}
