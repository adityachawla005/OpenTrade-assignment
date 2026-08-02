import type { Card, Fact } from "./types";

export interface Tier {
  key: string;
  name: string;
  floor: number;
  /** Neurons at this tier. This is the flywheel: rating buys capacity. */
  neurons: number;
  mark: string;
  blurb: string;
  unlocks: string[];
  arena: boolean;
}

/**
 * The Brain is measured in neurons: one Fact, one neuron.
 *
 * Kept as a function rather than inlined as `brain.length` so the cost model
 * is a single edit away if Facts ever need to be priced differently.
 */
export const NEURON_COST = 1;

export function neuronCost(_fact: Fact): number {
  return NEURON_COST;
}

export function neuronsUsed(brain: Fact[]): number {
  return brain.length * NEURON_COST;
}

export const TIERS: Tier[] = [
  {
    key: "rookie",
    name: "Rookie",
    floor: 0,
    neurons: 5,
    mark: "R",
    blurb: "You're calling cards on instinct. Everything you learn is new.",
    unlocks: ["5 neurons", "Daily deck", "Rookie badge"],
    arena: false,
  },
  {
    key: "analyst",
    name: "Analyst",
    floor: 1100,
    neurons: 6,
    mark: "A",
    blurb: "You've started keeping the right Facts instead of the last ones.",
    unlocks: ["6 neurons", "Analyst badge", "Sector streak tracking"],
    arena: false,
  },
  {
    key: "trader",
    name: "Trader",
    floor: 1250,
    neurons: 7,
    mark: "T",
    blurb: "You hold a thesis across cards. The deck starts fighting back.",
    unlocks: [
      "7 neurons",
      "Trader badge",
      "Graphite card finish",
      "Head-to-head challenges",
    ],
    arena: false,
  },
  {
    key: "pm",
    name: "Portfolio Manager",
    floor: 1400,
    neurons: 8,
    mark: "PM",
    blurb: "You're beating the field on the cards the field gets wrong.",
    unlocks: [
      "8 neurons",
      "Portfolio Manager badge",
      "Gold card finish",
      "Arena access",
    ],
    arena: true,
  },
  {
    key: "wallst",
    name: "Wall Street",
    floor: 1550,
    neurons: 10,
    mark: "WS",
    blurb: "Top of the ladder. Seasonal, and you have to hold it.",
    unlocks: [
      "10 neurons",
      "Wall Street badge",
      "Animated card finish",
      "Arena seeding + seasonal leaderboard",
    ],
    arena: true,
  },
];

export const START_RATING = 1060;
export const MAX_LIVES = 5;
export const START_LIVES = 3;

/** Standard Elo K-factor. High enough that a ten-card session actually moves. */
const K = 40;

export function tierIndexFor(rating: number): number {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (rating >= TIERS[i].floor) idx = i;
  return idx;
}

export function tierFor(rating: number): Tier {
  return TIERS[tierIndexFor(rating)];
}

export function nextTier(rating: number): Tier | null {
  const i = tierIndexFor(rating);
  return i + 1 < TIERS.length ? TIERS[i + 1] : null;
}

export function neuronsFor(rating: number): number {
  return tierFor(rating).neurons;
}

/** Progress through the current tier, 0..1. Tops out at 1 on the last tier. */
export function tierProgress(rating: number): number {
  const t = tierFor(rating);
  const n = nextTier(rating);
  if (!n) return 1;
  return Math.min(1, Math.max(0, (rating - t.floor) / (n.floor - t.floor)));
}

/**
 * How hard this card was for the field — the share of players who got it wrong.
 * That share *is* the difficulty, so the crowd sets the opponent's rating.
 */
export function crowdWrongShare(card: Card): number {
  return card.truth === "UP" ? 1 - card.consensus : card.consensus;
}

/**
 * The card, expressed as an opponent. A card 20% of the field misses is a weak
 * opponent (~1040); one 80% of the field misses is a strong one (~1460).
 * Beating a strong opponent is worth far more than beating a weak one — which
 * is exactly the "reward skill, not luck" property, straight out of Elo.
 */
export function opponentRating(card: Card): number {
  return Math.round(900 + crowdWrongShare(card) * 700);
}

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - rating) / 400));
}

/* --------------------------------------------------------------------------
   XP → rating

   XP is the number the player watches. It only ever goes up, it's earned by
   playing, and it is what raises the skill rating — the rating is downstream,
   not a second currency.

   The weighting all lives in the XP: a call the field got wrong pays roughly
   five times what a call the field also got right pays. Rating then converts a
   share of that XP, scaled by how surprising the win was *for you at your
   rating* — so the same card pays a Rookie more than it pays a Wall Street
   player. That's the self-correcting part of Elo, kept intact.

   Losses stay pure Elo: miss a card the field saw, and it costs; miss a card
   the field also missed, and it barely does.
   -------------------------------------------------------------------------- */

/** Earned for making the call at all — never converts to rating. */
export const XP_PER_CALL = 5;
/** Floor for any correct call, before difficulty. */
const XP_CORRECT_BASE = 20;
/** The difficulty-weighted part, scaled by the share of the field that missed. */
const XP_DIFFICULTY = 80;
const XP_STREAK_STEP = 10;
const XP_STREAK_CAP = 30;
/** Share of skill XP that becomes rating, before the expectation scale. */
const XP_TO_RATING = 0.5;

export interface CallOutcome {
  opponent: number;
  expected: number;
  /** Total XP for this card. */
  xp: number;
  xpCall: number;
  xpSkill: number;
  xpStreak: number;
  /** Rating change. Positive comes out of the XP; negative is Elo's own. */
  delta: number;
}

export function callOutcome(
  rating: number,
  card: Card,
  correct: boolean,
  streakBefore: number,
): CallOutcome {
  const opponent = opponentRating(card);
  const expected = expectedScore(rating, opponent);

  const xpCall = XP_PER_CALL;
  const xpSkill = correct
    ? XP_CORRECT_BASE + Math.round(XP_DIFFICULTY * crowdWrongShare(card))
    : 0;
  const xpStreak =
    correct && streakBefore >= 1
      ? Math.min(XP_STREAK_CAP, streakBefore * XP_STREAK_STEP)
      : 0;

  const delta = correct
    ? Math.round((xpSkill + xpStreak) * XP_TO_RATING * (1 - expected))
    : -Math.round(K * expected);

  return {
    opponent,
    expected,
    xp: xpCall + xpSkill + xpStreak,
    xpCall,
    xpSkill,
    xpStreak,
    delta,
  };
}

export type Difficulty = {
  label: string;
  note: string;
  tone: "hard" | "mid" | "easy";
};

export function difficultyOf(card: Card): Difficulty {
  const wrong = crowdWrongShare(card);
  const pct = Math.round(wrong * 100);
  if (wrong >= 0.62)
    return {
      label: "Contrarian",
      note: `${pct}% of the field called this wrong`,
      tone: "hard",
    };
  if (wrong >= 0.4)
    return {
      label: "Split",
      note: `${pct}% of the field called this wrong`,
      tone: "mid",
    };
  return {
    label: "Consensus",
    note: `only ${pct}% of the field missed this`,
    tone: "easy",
  };
}
