/**
 * Framing axes — the experiments this product actually runs.
 *
 * WHY AXES INSTEAD OF CARDS
 * -------------------------
 * Testing one card against itself does not work in production. The deck
 * rotates daily, so any individual card gathers a few hundred swipes and then
 * disappears — never enough to resolve a realistic effect before it is gone.
 * Worse, if every card tests its own bespoke comparison ("growth story vs
 * valuation-anchored" on one, "optionality vs cash-runway" on another) there
 * is nothing to pool: twelve unrelated questions, none of them answered.
 *
 * What persists across the rotation is the *axis*: a single, reusable
 * dimension of copy, independent of which stock it describes. Every card
 * picks one axis and writes its two variants as that axis's two poles. Swipes
 * then pool by (axis, pole) across every card, and each axis keeps
 * accumulating signal every day no matter which tickers are live.
 *
 * WHY POOLING ACROSS CARDS IS SAFE
 * --------------------------------
 * Pooling different cards into one proportion invites Simpson's paradox: if an
 * appealing card sent most of its traffic to one pole and a dull card to the
 * other, the comparison would measure the stocks rather than the writing.
 * That cannot happen here, because assignment is a 50/50 deterministic hash
 * *within each card*. Both poles therefore see the same mix of cards in the
 * same proportion, and card-level appeal cancels instead of confounding.
 *
 * EXTENSIBILITY
 * -------------
 * Axes are data. Adding one means appending an entry here and tagging cards
 * with its two poles — the engine, the aggregation and the dashboard all read
 * from this table and need no changes.
 */

export type AxisId =
  | "risk-upside"
  | "number-story"
  | "punchy-hedged"
  | "catalyst-thesis";

export type PoleId =
  | "risk-first"
  | "upside-first"
  | "number-led"
  | "story-led"
  | "punchy"
  | "hedged"
  | "concrete-catalyst"
  | "open-thesis";

export interface Pole {
  id: PoleId;
  /** Short name, e.g. "Risk-first". */
  label: string;
  /** One line a non-specialist can act on. */
  description: string;
  /** Sentence subject used in verdicts: "<phrase> wins". */
  phrase: string;
}

export interface FramingAxis {
  id: AxisId;
  /** e.g. "Risk-first vs Upside-first" */
  name: string;
  /** Plain-English question this axis answers. */
  question: string;
  /** Exactly two competing poles. */
  poles: [Pole, Pole];
}

export const AXES: FramingAxis[] = [
  {
    id: "risk-upside",
    name: "Risk-first vs Upside-first",
    question: "Should a card lead with what could go wrong, or what could go right?",
    poles: [
      {
        id: "risk-first",
        label: "Risk-first",
        description: "Leads with what could go wrong",
        phrase: "Leading with the risk",
      },
      {
        id: "upside-first",
        label: "Upside-first",
        description: "Leads with what could go right",
        phrase: "Leading with the upside",
      },
    ],
  },
  {
    id: "number-story",
    name: "Number-led vs Story-led",
    question: "Should a card open with a hard stat, or with the narrative?",
    poles: [
      {
        id: "number-led",
        label: "Number-led",
        description: "Opens with a hard stat",
        phrase: "Opening with a number",
      },
      {
        id: "story-led",
        label: "Story-led",
        description: "Opens with the narrative",
        phrase: "Opening with the story",
      },
    ],
  },
  {
    id: "punchy-hedged",
    name: "Punchy vs Hedged",
    question: "Should a card sound short and confident, or careful and qualified?",
    poles: [
      {
        id: "punchy",
        label: "Punchy",
        description: "Short and confident",
        phrase: "The confident voice",
      },
      {
        id: "hedged",
        label: "Hedged",
        description: "Careful and qualified",
        phrase: "The careful voice",
      },
    ],
  },
  {
    id: "catalyst-thesis",
    name: "Concrete-catalyst vs Open-thesis",
    question: "Should a card hang on a dated event, or on a general thesis?",
    poles: [
      {
        id: "concrete-catalyst",
        label: "Concrete-catalyst",
        description: "Hangs on a specific dated event",
        phrase: "Naming a dated catalyst",
      },
      {
        id: "open-thesis",
        label: "Open-thesis",
        description: "Rests on a general, undated thesis",
        phrase: "The open-ended thesis",
      },
    ],
  },
];

export const AXIS_BY_ID = new Map(AXES.map((a) => [a.id, a]));

const POLE_BY_ID = new Map<PoleId, Pole>(
  AXES.flatMap((a) => a.poles.map((p) => [p.id, p] as const)),
);

export function getAxis(id: AxisId): FramingAxis {
  const axis = AXIS_BY_ID.get(id);
  if (!axis) throw new Error(`unknown axis: ${id}`);
  return axis;
}

export function getPole(id: PoleId): Pole {
  const pole = POLE_BY_ID.get(id);
  if (!pole) throw new Error(`unknown pole: ${id}`);
  return pole;
}
