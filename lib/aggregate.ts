/**
 * Axis-level aggregation — the experiments this product actually runs.
 *
 * Swipes are pooled by (axis, pole) ACROSS EVERY CARD on that axis, then fed
 * to the mSPRT as two arms. The engine is untouched; only what gets grouped
 * and handed to it changed.
 *
 * Two experiments run per axis, on the same engine, from two observation
 * streams:
 *
 *   BACKS      did users swipe right?         (every pooled swipe)
 *   RETENTION  did the ones who backed stay?  (backed swipes with a known outcome)
 *
 * The interesting result is when they disagree: a framing can manufacture
 * swipes from users who churn a week later, and a back-rate test alone will
 * cheerfully tell you to ship it.
 *
 * Adding a new axis requires no change here — append it to `AXES` and tag
 * cards with its two poles.
 */

import { AXES, getAxis, type AxisId, type FramingAxis, type PoleId } from "./axes";
import { cardHashes, cardsOnAxis, type Card } from "./cards";
import { getSwipesForCard, swipeSourceCounts, type SwipeRow } from "./db";
import { axisTruth } from "./groundTruth";
import {
  DEFAULT_CONFIG,
  initMsprt,
  summarize,
  updateMsprt,
  type MsprtConfig,
} from "./stats/msprt";
import { twoProportionZTest } from "./stats/ztest";

export interface PoleArm {
  id: PoleId;
  label: string;
  description: string;
  phrase: string;
  /** Observations pooled into this arm, across all cards on the axis. */
  n: number;
  /** Positive outcomes (backs, or retentions). */
  wins: number;
  rate: number;
}

export interface CurvePoint {
  n: number;
  msprtP: number;
  naiveP: number;
}

export type Outcome = "leader" | "too-close" | "thin";

export interface MetricResult {
  left: PoleArm;
  right: PoleArm;
  total: number;
  winner: PoleId | null;
  outcome: Outcome;
  /** Relative gain of the winner over the loser, e.g. 0.32 = "32% more". */
  relativeGain: number | null;
  absoluteGain: number | null;
  /** Observation at which the verdict became safe to act on. */
  decidedAt: number | null;
  pValue: number;
  naive: {
    pValue: number;
    z: number;
    firstCrossedAt: number | null;
    flipFlops: number;
  };
  curve: CurvePoint[];
}

export interface CardBreakdown {
  cardId: string;
  ticker: string;
  company: string;
  sector: string;
  leftRate: number;
  rightRate: number;
  leftN: number;
  rightN: number;
  total: number;
}

export interface AxisResult {
  id: AxisId;
  name: string;
  question: string;
  cardCount: number;
  tickers: string[];
  backs: MetricResult;
  retention: MetricResult;
  /** One pole wins on backs and loses on retention. */
  retentionConflict: boolean;
  /** Per-card contribution, for the supporting-detail drawer. */
  cards: CardBreakdown[];
  /** What the simulator knows to be true. Verifies claims, never decides. */
  groundTruth: { isNull: boolean; hasConflict: boolean };
}

const MAX_CURVE_POINTS = 120;

/** Metrics tested per axis: backs, and retention. */
const METRICS_PER_AXIS = 2;

/**
 * Family-wise significance budget.
 *
 * Each individual test is always-valid at its own alpha — that is what makes
 * peeking safe *in time*. It says nothing about looking across many
 * experiments at once. With 4 axes x 2 metrics there are 8 simultaneous tests,
 * and under a global null the chance that at least one fires is
 * 1 - 0.95^8 = 34%, not 5%.
 *
 * So the dashboard spends a Bonferroni-split budget: each test runs at
 * 0.05 / (axes x metrics), which holds the probability that ANY axis lights up
 * spuriously at 5% overall. Derived from AXES.length rather than hardcoded, so
 * adding an axis automatically tightens the budget instead of silently
 * widening the family.
 *
 * The cost is power: each individual test needs more evidence before it fires.
 * That is the correct trade for a board someone scans all at once.
 */
export function familyAlpha(overallAlpha = 0.05): number {
  return overallAlpha / (AXES.length * METRICS_PER_AXIS);
}

function armOf(axis: FramingAxis, id: PoleId, n: number, wins: number): PoleArm {
  const pole = axis.poles.find((p) => p.id === id)!;
  return {
    id,
    label: pole.label,
    description: pole.description,
    phrase: pole.phrase,
    n,
    wins,
    rate: n > 0 ? wins / n : 0,
  };
}

function downsample(points: CurvePoint[], keepAt: number | null): CurvePoint[] {
  if (points.length <= MAX_CURVE_POINTS) return points;
  const step = points.length / MAX_CURVE_POINTS;
  const kept = new Map<number, CurvePoint>();
  for (let i = 0; i < MAX_CURVE_POINTS; i++) {
    const idx = Math.min(points.length - 1, Math.floor(i * step));
    kept.set(idx, points[idx]);
  }
  kept.set(0, points[0]);
  kept.set(points.length - 1, points[points.length - 1]);
  if (keepAt !== null) {
    const idx = points.findIndex((p) => p.n === keepAt);
    if (idx >= 0) {
      kept.set(idx, points[idx]);
      if (idx > 0) kept.set(idx - 1, points[idx - 1]);
    }
  }
  return [...kept.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);
}

/**
 * Feed one pooled observation stream through the engine.
 *
 * The arm is chosen by the observation's POLE, not by which card it came from
 * — that is the whole point of axis-level aggregation.
 */
function runMetric(
  axis: FramingAxis,
  observations: Array<{ pole: PoleId; win: boolean }>,
  config: MsprtConfig,
): MetricResult {
  const [leftPole, rightPole] = axis.poles;

  let state = initMsprt();
  const curve: CurvePoint[] = [];

  let naiveFirstCrossedAt: number | null = null;
  let naiveFlips = 0;
  let lastSig = false;
  let everEvaluated = false;

  for (const obs of observations) {
    const variant = obs.pole === leftPole.id ? "A" : "B";
    state = updateMsprt(state, { variant, backed: obs.win }, config);

    const z = twoProportionZTest(
      state.nA,
      state.backsA,
      state.nB,
      state.backsB,
      config.alpha,
    );
    const eligible =
      state.nA >= config.minSamplesPerArm && state.nB >= config.minSamplesPerArm;

    if (eligible) {
      if (z.significant && naiveFirstCrossedAt === null) {
        naiveFirstCrossedAt = state.n;
      }
      if (everEvaluated && z.significant !== lastSig) naiveFlips++;
      lastSig = z.significant;
      everEvaluated = true;
    }

    curve.push({
      n: state.n,
      msprtP: state.pValue,
      naiveP: eligible ? z.pValue : 1,
    });
  }

  const s = summarize(state, config);
  const finalZ = twoProportionZTest(
    state.nA,
    state.backsA,
    state.nB,
    state.backsB,
    config.alpha,
  );

  const left = armOf(axis, leftPole.id, state.nA, state.backsA);
  const right = armOf(axis, rightPole.id, state.nB, state.backsB);

  const enough =
    state.nA >= config.minSamplesPerArm && state.nB >= config.minSamplesPerArm;
  const winner: PoleId | null = s.decided
    ? s.verdict === "A"
      ? leftPole.id
      : rightPole.id
    : null;

  const hi = winner === leftPole.id ? left.rate : right.rate;
  const lo = winner === leftPole.id ? right.rate : left.rate;

  return {
    left,
    right,
    total: state.n,
    winner,
    outcome: s.decided ? "leader" : enough ? "too-close" : "thin",
    relativeGain: winner && lo > 0 ? (hi - lo) / lo : null,
    absoluteGain: winner ? hi - lo : null,
    decidedAt: s.decided ? state.stoppedAtN : null,
    pValue: state.pValue,
    naive: {
      pValue: finalZ.pValue,
      z: finalZ.z,
      firstCrossedAt: naiveFirstCrossedAt,
      flipFlops: naiveFlips,
    },
    curve: downsample(curve, s.decided ? state.stoppedAtN : null),
  };
}

/** Every swipe from every card on the axis, in true global arrival order. */
function gatherObservations(cards: Card[]): Array<{
  row: SwipeRow;
  pole: PoleId;
  card: Card;
}> {
  const out: Array<{ row: SwipeRow; pole: PoleId; card: Card }> = [];

  for (const card of cards) {
    // Only swipes that saw the copy live right now may count — editing a
    // card's wording must not silently pool two treatments.
    const live = cardHashes(card);
    for (const row of getSwipesForCard(card.id)) {
      if (row.content_hash !== live[row.variant]) continue;
      out.push({ row, pole: card.variants[row.variant].pole, card });
    }
  }

  // `id` is a global autoincrement, so sorting by it restores true arrival
  // order across cards — which is what a sequential test needs.
  out.sort((a, b) => a.row.id - b.row.id);
  return out;
}

export function computeAxis(
  axisId: AxisId,
  config: MsprtConfig = DEFAULT_CONFIG,
): AxisResult {
  const axis = getAxis(axisId);
  const [leftPole, rightPole] = axis.poles;
  const cards = cardsOnAxis(axisId);
  const gathered = gatherObservations(cards);

  const backs = runMetric(
    axis,
    gathered.map((g) => ({ pole: g.pole, win: g.row.backed === 1 })),
    config,
  );

  // Retention is conditional: only a user who backed can be retained, and only
  // simulated traffic has a known follow-up outcome.
  const retention = runMetric(
    axis,
    gathered
      .filter((g) => g.row.backed === 1 && g.row.retained !== null)
      .map((g) => ({ pole: g.pole, win: g.row.retained === 1 })),
    config,
  );

  // Per-card breakdown — supporting detail, never the primary view.
  const breakdown: CardBreakdown[] = cards.map((card) => {
    const rows = gathered.filter((g) => g.card.id === card.id);
    const tally = (pole: PoleId) => {
      const subset = rows.filter((g) => g.pole === pole);
      const backed = subset.filter((g) => g.row.backed === 1).length;
      return { n: subset.length, rate: subset.length ? backed / subset.length : 0 };
    };
    const l = tally(leftPole.id);
    const r = tally(rightPole.id);
    return {
      cardId: card.id,
      ticker: card.ticker,
      company: card.company,
      sector: card.sector,
      leftRate: l.rate,
      rightRate: r.rate,
      leftN: l.n,
      rightN: r.n,
      total: l.n + r.n,
    };
  });

  return {
    id: axis.id,
    name: axis.name,
    question: axis.question,
    cardCount: cards.length,
    tickers: cards.map((c) => c.ticker),
    backs,
    retention,
    retentionConflict:
      backs.winner !== null &&
      retention.winner !== null &&
      backs.winner !== retention.winner,
    cards: breakdown,
    groundTruth: axisTruth(leftPole.id, rightPole.id),
  };
}

export interface AxesPayload {
  config: MsprtConfig;
  generatedAt: number;
  totalSwipes: number;
  /** Real swipes vs simulator-generated. Stated so it is never ambiguous. */
  sources: { ui: number; sim: number };
  axes: AxisResult[];
}

export function computeAllAxes(
  baseConfig: MsprtConfig = DEFAULT_CONFIG,
): AxesPayload {
  // Split the 5% budget across every test on the board (see `familyAlpha`).
  const config: MsprtConfig = { ...baseConfig, alpha: familyAlpha() };
  const axes = AXES.map((a) => computeAxis(a.id, config));
  return {
    config,
    generatedAt: Date.now(),
    totalSwipes: axes.reduce((sum, a) => sum + a.backs.total, 0),
    sources: swipeSourceCounts(),
    // Clean resolved winners first, conflicted winners next, undecided last —
    // so the top row is always the safest thing to act on.
    axes: axes.sort((a, b) => {
      const rank = (x: AxisResult) =>
        x.backs.winner ? (x.retentionConflict ? 1 : 0) : 2;
      const byRank = rank(a) - rank(b);
      if (byRank !== 0) return byRank;
      return (b.backs.relativeGain ?? 0) - (a.backs.relativeGain ?? 0);
    }),
  };
}
