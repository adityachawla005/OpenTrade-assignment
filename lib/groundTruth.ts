/**
 * The truth the simulator draws from, defined at the POLE level.
 *
 * Two rates per pole:
 *   back   — probability a user swipes right on a card written in this pole
 *   retain — probability a user who backed it is still holding a week later
 *
 * Those two can disagree, and that disagreement is the most useful thing this
 * app surfaces. A framing that manufactures swipes from users who churn a week
 * later is worse than one that gets fewer, stickier backs — but a back-rate
 * test alone will happily tell you to ship it.
 *
 * Per-card offsets shift a card's overall appeal without touching the pole
 * gap: both variants of a card move together. Because assignment is a 50/50
 * hash within each card, these offsets cancel in the pooled comparison rather
 * than confounding it.
 *
 * This is simulation metadata. Swipes from real users have no ground truth,
 * and nothing here influences the test, the assignment, or any recorded
 * number — it exists so the dashboard can VERIFY its claims instead of
 * asserting them.
 */

import { getCard } from "./cards";
import type { AxisId, PoleId } from "./axes";

export interface PoleTruth {
  back: number;
  retain: number;
}

export const POLE_TRUTH: Record<PoleId, PoleTruth> = {
  // risk-upside — a clean, real win for naming the risk first, on both metrics.
  "risk-first": { back: 0.41, retain: 0.62 },
  "upside-first": { back: 0.3, retain: 0.55 },

  // number-story — the trap. Number-led wins the swipe by a wide margin and
  // loses retention by a wider one.
  "number-led": { back: 0.38, retain: 0.44 },
  "story-led": { back: 0.28, retain: 0.68 },

  // punchy-hedged — a true null on both. No amount of watching should produce
  // a winner here.
  punchy: { back: 0.34, retain: 0.58 },
  hedged: { back: 0.34, retain: 0.58 },

  // catalyst-thesis — a real but more modest edge for a dated catalyst.
  "concrete-catalyst": { back: 0.37, retain: 0.6 },
  "open-thesis": { back: 0.31, retain: 0.57 },
};

/** Per-card appeal offset. Applied to both variants, so the pole gap survives. */
const CARD_OFFSET: Record<string, number> = {
  hlxb: 0.03,
  casq: -0.03,
  qstl: 0.01,
  orbx: 0.02,
  numa: -0.02,
  terv: 0.03,
  kelv: -0.01,
  vntr: 0.02,
  kryo: -0.02,
  mrdn: 0.01,
  slne: -0.01,
  aeth: 0.02,
};

export interface TrueRates {
  A: number;
  B: number;
}

const clamp = (x: number) => Math.min(0.98, Math.max(0.02, x));

/** True back-rates for a card's two variants. */
export function ratesFor(cardId: string): TrueRates {
  const card = getCard(cardId);
  if (!card) return { A: 0.3, B: 0.3 };
  const offset = CARD_OFFSET[cardId] ?? 0;
  return {
    A: clamp(POLE_TRUTH[card.variants.A.pole].back + offset),
    B: clamp(POLE_TRUTH[card.variants.B.pole].back + offset),
  };
}

/** True retention rates (conditional on backing) for a card's two variants. */
export function retentionFor(cardId: string): TrueRates {
  const card = getCard(cardId);
  if (!card) return { A: 0.5, B: 0.5 };
  return {
    A: clamp(POLE_TRUTH[card.variants.A.pole].retain),
    B: clamp(POLE_TRUTH[card.variants.B.pole].retain),
  };
}

export const FALLBACK_RATES: TrueRates = { A: 0.3, B: 0.3 };

/** A card is a true null when both its poles have identical back-rates. */
export function isNullCard(cardId: string): boolean {
  const r = ratesFor(cardId);
  return Math.abs(r.A - r.B) < 1e-9;
}

/** An axis is a true null when its two poles have identical back-rates. */
export function isNullAxis(left: PoleId, right: PoleId): boolean {
  return POLE_TRUTH[left].back === POLE_TRUTH[right].back;
}

/**
 * True when one pole wins on backs but loses on retention — the case the
 * dashboard highlights, because a back-rate test alone would mis-ship it.
 */
export function hasRetentionConflict(left: PoleId, right: PoleId): boolean {
  const l = POLE_TRUTH[left];
  const r = POLE_TRUTH[right];
  if (l.back === r.back) return false;
  const backWinner = l.back > r.back ? left : right;
  const retainWinner = l.retain > r.retain ? left : right;
  return backWinner !== retainWinner;
}

/** Unused by the engine; kept so an axis's design intent is inspectable. */
export function axisTruth(left: PoleId, right: PoleId): {
  isNull: boolean;
  hasConflict: boolean;
} {
  return {
    isNull: isNullAxis(left, right),
    hasConflict: hasRetentionConflict(left, right),
  };
}

export type { AxisId };
