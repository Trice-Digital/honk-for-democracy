/**
 * EventConfig — Configuration for mid-game events.
 *
 * Config-driven. Events break up the core loop with variety,
 * real-world learning (cop check / first amendment), weather endurance,
 * and organic karma moments.
 *
 * Event timing uses a window system: events can fire within time windows
 * during the session, with minimum spacing between events.
 */

// ============================================================
// COP CHECK — First Amendment Dialogue
// ============================================================

export interface CopDialogueOption {
  /** Text shown to the player */
  text: string;
  /** Whether this is the correct/best response */
  isCorrect: boolean;
  /** Confidence change on selection */
  confidenceChange: number;
  /** Score change on selection */
  scoreChange: number;
  /** Cop's reply text */
  copReply: string;
  /** Time penalty in seconds (how long the encounter takes) */
  timePenalty: number;
}

export interface CopCheckConfig {
  /** Cop's opening line */
  openingLine: string;
  /** Cop's description text */
  description: string;
  /** Dialogue options (player picks one) */
  options: CopDialogueOption[];
  /** How long the overlay stays before auto-resolving if player doesn't respond (seconds) */
  autoResolveTime: number;
  /** Confidence penalty for not responding (auto-resolve) */
  autoResolvePenalty: number;
}

export const COP_CHECK_SCENARIOS: CopCheckConfig[] = [
  {
    openingLine: '"Excuse me. You need a permit to be out here."',
    description: 'A police officer approaches you.',
    options: [
      {
        text: '"The First Amendment protects my right to protest in public spaces without a permit."',
        isCorrect: true,
        confidenceChange: 15,
        scoreChange: 50,
        copReply: '"...Alright. Just keep the sidewalk clear."',
        timePenalty: 3,
      },
      {
        text: '"Oh, sorry officer. I\'ll pack up."',
        isCorrect: false,
        confidenceChange: -20,
        scoreChange: -10,
        copReply: '"Appreciate the cooperation."',
        timePenalty: 8,
      },
      {
        text: '"Am I being detained? I\'d like your badge number."',
        isCorrect: false,
        confidenceChange: 5,
        scoreChange: 10,
        copReply: '"Nobody\'s being detained. Just checking in."',
        timePenalty: 6,
      },
    ],
    autoResolveTime: 15,
    autoResolvePenalty: -10,
  },
  {
    openingLine: '"We\'ve gotten some complaints about you blocking traffic."',
    description: 'A police officer walks over, arms crossed.',
    options: [
      {
        text: '"I\'m on the sidewalk, which is a traditional public forum. I have a constitutional right to be here."',
        isCorrect: true,
        confidenceChange: 15,
        scoreChange: 50,
        copReply: '"...Fair enough. Stay on the sidewalk."',
        timePenalty: 3,
      },
      {
        text: '"I didn\'t mean to cause trouble. I\'ll move."',
        isCorrect: false,
        confidenceChange: -15,
        scoreChange: -10,
        copReply: '"Probably for the best."',
        timePenalty: 8,
      },
      {
        text: '"I\'m not blocking anything. People just don\'t like my sign."',
        isCorrect: false,
        confidenceChange: 0,
        scoreChange: 5,
        copReply: '"Well... keep it peaceful."',
        timePenalty: 5,
      },
    ],
    autoResolveTime: 15,
    autoResolvePenalty: -10,
  },
  {
    openingLine: '"I need to see some ID. What organization are you with?"',
    description: 'An officer pulls up in a cruiser.',
    options: [
      {
        text: '"I\'m not required to show ID for exercising my First Amendment rights. I\'m an individual citizen."',
        isCorrect: true,
        confidenceChange: 15,
        scoreChange: 50,
        copReply: '"...Okay. Carry on."',
        timePenalty: 3,
      },
      {
        text: '"Sure, here you go..." *hands over ID*',
        isCorrect: false,
        confidenceChange: -10,
        scoreChange: 0,
        copReply: '"Alright, everything checks out. Have a good one."',
        timePenalty: 10,
      },
      {
        text: '"I\'m with the Constitution of the United States."',
        isCorrect: false,
        confidenceChange: 10,
        scoreChange: 15,
        copReply: '*sighs* "...Just stay out of the road."',
        timePenalty: 4,
      },
    ],
    autoResolveTime: 15,
    autoResolvePenalty: -10,
  },
];

// ============================================================
// WEATHER — Rain system
// ============================================================

export interface WeatherConfig {
  /** Sign durability drain per second during rain (before material multiplier) */
  rainSignDrainRate: number;
  /** Maximum sign degradation (0-1, where 1.0 = fully destroyed) */
  maxSignDegradation: number;
  /** Reaction weight shift during rain (negative reactions become more likely) */
  rainNegativeShift: number;
  /** Chance per second that an NPC protester leaves during rain (0-1) */
  npcLeaveChancePerSecond: number;
  /** Minimum NPCs that stay regardless of rain */
  minNpcCount: number;
  /** How long rain lasts in seconds */
  rainDurationMin: number;
  rainDurationMax: number;
  /** Rain particle count */
  rainParticleCount: number;
  /** Confidence drain per second during rain (morale hit) */
  rainConfidenceDrain: number;
}

export const WEATHER_DEFAULTS: WeatherConfig = {
  rainSignDrainRate: 3.0,
  maxSignDegradation: 0.8,
  rainNegativeShift: 0.1,
  npcLeaveChancePerSecond: 0.08,
  minNpcCount: 1,
  rainDurationMin: 20,
  rainDurationMax: 40,
  rainParticleCount: 80,
  rainConfidenceDrain: 0.5,
};

// ============================================================
// KARMA MOMENT — MAGA Truck Burnout Sequence
// ============================================================

export interface KarmaPhase {
  /** Description of what's happening */
  description: string;
  /** Duration in seconds */
  duration: number;
  /** Visual banner text shown to player */
  bannerText: string;
  /** Confidence change at start of phase */
  confidenceChange: number;
  /** Score change at start of phase */
  scoreChange: number;
}

export interface KarmaConfig {
  /** Sequence of phases that play out */
  phases: KarmaPhase[];
  /** Total confidence boost from witnessing the full sequence */
  totalConfidenceBoost: number;
}

export const KARMA_DEFAULTS: KarmaConfig = {
  phases: [
    {
      description: 'A lifted truck with MAGA flags peels around the corner',
      duration: 3,
      bannerText: '*SCREEEECH* A lifted truck with flags tears around the corner...',
      confidenceChange: -5,
      scoreChange: 0,
    },
    {
      description: 'The truck does a burnout in the intersection, honking aggressively',
      duration: 3,
      bannerText: 'The truck does a BURNOUT in the intersection! Smoke everywhere!',
      confidenceChange: -10,
      scoreChange: -20,
    },
    {
      description: 'A police cruiser lights up behind the truck',
      duration: 2,
      bannerText: '...Wait. Red and blue lights behind them.',
      confidenceChange: 5,
      scoreChange: 0,
    },
    {
      description: 'The cop pulls the truck over. The crowd erupts in cheers.',
      duration: 4,
      bannerText: 'COP PULLS THEM OVER! The crowd goes WILD!',
      confidenceChange: 30,
      scoreChange: 100,
    },
  ],
  totalConfidenceBoost: 20,
};

// ============================================================
// EVENT SCHEDULING
// ============================================================

export type EventType = 'copCheck' | 'weather' | 'karma';

export interface EventScheduleConfig {
  /** Minimum time (seconds) before first event can fire */
  firstEventMinTime: number;
  /** Maximum time (seconds) before first event must fire */
  firstEventMaxTime: number;
  /** Minimum spacing between events in seconds */
  minEventSpacing: number;
  /** Maximum events per session */
  maxEventsPerSession: number;
  /** Base probability per second of an event triggering (after min time) */
  baseTriggerChancePerSecond: number;
  /** Event type weights (probability of each type when an event triggers) */
  eventWeights: Record<EventType, number>;
  /** Events that must happen at least once per session (guaranteed) */
  guaranteedEvents: EventType[];
  /** Minimum confidence to trigger cop check (don't pile on when player is struggling) */
  copCheckMinConfidence: number;
  /** Minimum elapsed time for karma event (should be mid-to-late game) */
  karmaMinTime: number;
}

export const EVENT_SCHEDULE_DEFAULTS: EventScheduleConfig = {
  firstEventMinTime: 25,
  firstEventMaxTime: 50,
  minEventSpacing: 25,
  maxEventsPerSession: 4,
  baseTriggerChancePerSecond: 0.04,
  eventWeights: {
    copCheck: 0.4,
    weather: 0.35,
    karma: 0.25,
  },
  guaranteedEvents: ['copCheck'],
  copCheckMinConfidence: 20,
  karmaMinTime: 60,
};
