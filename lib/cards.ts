/**
 * The card deck under test.
 *
 * EVERYTHING HERE IS FICTIONAL. The tickers do not correspond to real listed
 * companies and the theses are illustrative copy written to give the
 * experiment something to measure. Nothing in this file is investment advice.
 *
 * Each card picks ONE framing axis (see `axes.ts`) and writes its two variants
 * as that axis's two poles for that stock. Three cards per axis, so every axis
 * pools enough traffic to reach a verdict while the deck rotates.
 *
 * The copy is written TO the axis, not merely labelled with it. A card on the
 * risk-upside axis genuinely leads with the downside in one variant and the
 * opportunity in the other, and nothing else about the two is meant to differ.
 * That is what makes pooling across cards measure the framing rather than an
 * accident of wording.
 */

import { fnv1a } from "./assign";
import type { AxisId, PoleId } from "./axes";

export interface CardVariant {
  /** The axis this variant participates in. */
  axis: AxisId;
  /** Which pole of that axis this variant embodies. */
  pole: PoleId;
  thesis: string;
  catalyst: string;
  risk: string;
  sizing: string;
}

/** Just the rendered copy — what the content hash is computed over. */
export type CardVariantContent = Pick<
  CardVariant,
  "thesis" | "catalyst" | "risk" | "sizing"
>;

export interface Card {
  id: string;
  ticker: string;
  company: string;
  sector: string;
  /** The axis both variants belong to. */
  axis: AxisId;
  variants: Record<"A" | "B", CardVariant>;
}

export const CARDS: Card[] = [
  /* ---------------- Axis: risk-first vs upside-first ---------------- */
  {
    id: "hlxb",
    ticker: "HLXB",
    company: "Helixor Biolabs",
    sector: "Biotech",
    axis: "risk-upside",
    variants: {
      A: {
        axis: "risk-upside",
        pole: "upside-first",
        thesis:
          "Its assay platform is winning decentralised-trial contracts faster than anyone modelled.",
        catalyst: "A Phase II readout could double the addressable market.",
        risk: "Clinical programmes carry the usual binary risk.",
        sizing: "Starter position, 1-2%.",
      },
      B: {
        axis: "risk-upside",
        pole: "risk-first",
        thesis:
          "One programme is 70% of this company. If it misses, the stock halves.",
        catalyst: "That readout lands in March and decides everything.",
        risk: "There is no funded second act. A miss means raising at a much lower mark.",
        sizing: "1% at most, and only money you can watch go to zero.",
      },
    },
  },
  {
    id: "casq",
    ticker: "CASQ",
    company: "Cascadia Quantum",
    sector: "Deep Tech",
    axis: "risk-upside",
    variants: {
      A: {
        axis: "risk-upside",
        pole: "upside-first",
        thesis:
          "Error-correction research with a real shot at a step-change in the field.",
        catalyst: "Two lab partnerships could convert into commercial licences.",
        risk: "Pre-revenue, as early-stage science usually is.",
        sizing: "Speculative sleeve, 1%.",
      },
      B: {
        axis: "risk-upside",
        pole: "risk-first",
        thesis:
          "Eleven months of cash and no revenue. The next raise is the story, not the science.",
        catalyst: "A funding announcement matters more here than any lab result.",
        risk: "Dilution at a lower mark is the base case, not the bear case.",
        sizing: "0.5% maximum. Treat it as an expense, not a position.",
      },
    },
  },
  {
    id: "qstl",
    ticker: "QSTL",
    company: "Quaystone Lending",
    sector: "Financials",
    axis: "risk-upside",
    variants: {
      A: {
        axis: "risk-upside",
        pole: "upside-first",
        thesis:
          "A specialty lender earning wide spreads while its deposits reprice in its favour.",
        catalyst: "Margins expand as 60% of the book reprices this year.",
        risk: "Credit costs rise if the cycle turns.",
        sizing: "2-3% position.",
      },
      B: {
        axis: "risk-upside",
        pole: "risk-first",
        thesis:
          "This is a loan book. In a bad cycle charge-offs go from 0.9% to 6% and two years of earnings vanish.",
        catalyst:
          "The next credit-quality disclosure tells you which world you are in.",
        risk: "Concentrated in one region, so a local downturn is a company-level event.",
        sizing: "2%, never more. One lender is not a portfolio.",
      },
    },
  },

  /* ---------------- Axis: number-led vs story-led ---------------- */
  {
    id: "orbx",
    ticker: "ORBX",
    company: "Orbex Freight Systems",
    sector: "Logistics",
    axis: "number-story",
    variants: {
      A: {
        axis: "number-story",
        pole: "story-led",
        thesis:
          "A regional consolidator that quietly took over the lanes its competitors walked away from.",
        catalyst: "New terminals should lift utilisation as the network fills in.",
        risk: "Freight is cyclical and spreads compress quickly.",
        sizing: "Core holding, 3-4%.",
      },
      B: {
        axis: "number-story",
        pole: "number-led",
        thesis:
          "Price per mile up 11% while volumes stayed flat — that is pricing power, not growth.",
        catalyst: "Two terminals open in Q3, adding 18% network capacity.",
        risk: "In 2019 spreads compressed 40% in two quarters.",
        sizing: "3%, add below a 20% drawdown.",
      },
    },
  },
  {
    id: "numa",
    ticker: "NUMA",
    company: "Numath Grid",
    sector: "Industrials",
    axis: "number-story",
    variants: {
      A: {
        axis: "number-story",
        pole: "story-led",
        thesis:
          "The grid needs hardening, and this is the specialist utilities call first.",
        catalyst: "Budget approvals convert a long pipeline into real backlog.",
        risk: "Order timing depends on regulators, and regulators are slow.",
        sizing: "2-3%, scaled in over time.",
      },
      B: {
        axis: "number-story",
        pole: "number-led",
        thesis:
          "$2.1bn of backlog against $600m of revenue — three and a half years of work already signed.",
        catalyst: "Rate cases in two states decide another $400m by year end.",
        risk: "A single deferral pushes 30% of the pipeline a year to the right.",
        sizing: "2% now, 4% if the rate cases clear.",
      },
    },
  },
  {
    id: "terv",
    ticker: "TERV",
    company: "Tervo Materials",
    sector: "Materials",
    axis: "number-story",
    variants: {
      A: {
        axis: "number-story",
        pole: "story-led",
        thesis:
          "A coatings supplier riding a retrofit cycle that the market has not caught up with.",
        catalyst: "New capacity unlocks customers it has been turning away.",
        risk: "Input costs swing hard and are difficult to hedge.",
        sizing: "Moderate position, 2-3%.",
      },
      B: {
        axis: "number-story",
        pole: "number-led",
        thesis:
          "9x earnings, growing 20%. The market still models it as a commodity chemical.",
        catalyst: "A new line commissions in Q2, taking capacity up 35%.",
        risk: "Feedstock is 45% of COGS and unhedged beyond six months.",
        sizing: "2.5%, trim above 15x.",
      },
    },
  },

  /* ---------------- Axis: punchy vs hedged ---------------- */
  {
    id: "kelv",
    ticker: "KELV",
    company: "Kelvin Cold Chain",
    sector: "Infrastructure",
    axis: "punchy-hedged",
    variants: {
      A: {
        axis: "punchy-hedged",
        pole: "hedged",
        thesis:
          "A cold-storage owner with inflation-linked leases that should, over time, reprice favourably.",
        catalyst:
          "Renewals are expected to come through at higher rents, subject to tenant demand.",
        risk: "Rate sensitivity may continue to weigh on the multiple for some time.",
        sizing: "A modest income position, in the region of 3%.",
      },
      B: {
        axis: "punchy-hedged",
        pole: "punchy",
        thesis:
          "Down 40% on rate fear. 80% of its leases go up with inflation automatically.",
        catalyst: "62% of the book renews in 18 months at ~15% higher rents.",
        risk: "If rates stay high this stays cheap. That can last years.",
        sizing: "3%. Reinvest the distributions and wait.",
      },
    },
  },
  {
    id: "vntr",
    ticker: "VNTR",
    company: "Vantera Robotics",
    sector: "Automation",
    axis: "punchy-hedged",
    variants: {
      A: {
        axis: "punchy-hedged",
        pole: "hedged",
        thesis:
          "A warehouse automation supplier that appears well positioned within a large addressable market.",
        catalyst: "Enterprise pilots may convert to broader rollouts in due course.",
        risk: "Sales cycles are long, which makes revenue timing difficult to forecast.",
        sizing: "A measured allocation of around 2-3%.",
      },
      B: {
        axis: "punchy-hedged",
        pole: "punchy",
        thesis:
          "Three of the five biggest grocery chains already run its arms. The fourth is deciding now.",
        catalyst: "That decision lands in Q4 and is worth a quarter of revenue.",
        risk: "Top three customers are 61% of sales. Lose one and it hurts.",
        sizing: "2% now. Double it if the fourth signs.",
      },
    },
  },
  {
    id: "kryo",
    ticker: "KRYO",
    company: "Kryotek Semiconductors",
    sector: "Semiconductors",
    axis: "punchy-hedged",
    variants: {
      A: {
        axis: "punchy-hedged",
        pole: "hedged",
        thesis:
          "An analog chipmaker whose design wins should support content growth through the cycle.",
        catalyst:
          "Content per unit is expected to continue rising across product generations.",
        risk: "Semiconductor demand is cyclical and near-term visibility is limited.",
        sizing: "A long-term holding of approximately 3%.",
      },
      B: {
        axis: "punchy-hedged",
        pole: "punchy",
        thesis:
          "Inventory peaked two quarters ago. This is late-downcycle, not mid.",
        catalyst: "Restocking starts one to two quarters after that peak. So: now.",
        risk: "Call the bottom wrong and there is another 30% underneath.",
        sizing: "1.5% starter. Average in, do not lump in.",
      },
    },
  },

  /* ---------------- Axis: concrete-catalyst vs open-thesis ---------------- */
  {
    id: "mrdn",
    ticker: "MRDN",
    company: "Meridian Aqua Works",
    sector: "Water",
    axis: "catalyst-thesis",
    variants: {
      A: {
        axis: "catalyst-thesis",
        pole: "open-thesis",
        thesis:
          "Municipal water treatment is slow, regulated and inflation-linked — and this operator compounds quietly through it.",
        catalyst: "Steady contract renewals and the occasional tuck-in acquisition.",
        risk: "Municipal budgets can delay capital projects indefinitely.",
        sizing: "Core defensive holding, 3%.",
      },
      B: {
        axis: "catalyst-thesis",
        pole: "concrete-catalyst",
        thesis:
          "Four concessions covering 30% of revenue come up for renewal before June.",
        catalyst: "The first renewal decision is published on 12 April.",
        risk: "Losing one concession is a 25% drawdown, not a wobble.",
        sizing: "3%, reassess the day the April decision lands.",
      },
    },
  },
  {
    id: "slne",
    ticker: "SLNE",
    company: "Solnera Grid Storage",
    sector: "Energy",
    axis: "catalyst-thesis",
    variants: {
      A: {
        axis: "catalyst-thesis",
        pole: "open-thesis",
        thesis:
          "Grid-scale storage is a decade-long buildout and this integrator is positioned across it.",
        catalyst: "Falling cell costs and supportive policy keep demand compounding.",
        risk: "Incumbents are entering and competition is intensifying.",
        sizing: "Thematic sleeve, 2%.",
      },
      B: {
        axis: "catalyst-thesis",
        pole: "concrete-catalyst",
        thesis:
          "1.8 GWh of signed offtake starts converting to revenue next quarter.",
        catalyst: "The first utility contract begins delivery on 1 October.",
        risk: "Fixed-price contracts mean any cell cost inflation lands on them.",
        sizing: "2%, stop out if gross margin breaks 18%.",
      },
    },
  },
  {
    id: "aeth",
    ticker: "AETH",
    company: "Aetheron Aerospace",
    sector: "Aerospace",
    axis: "catalyst-thesis",
    variants: {
      A: {
        axis: "catalyst-thesis",
        pole: "open-thesis",
        thesis:
          "A tier-two aerostructures supplier on a platform that should run for decades.",
        catalyst: "Production rates rise as the airframer works through its backlog.",
        risk: "Programme delays push everything to the right.",
        sizing: "Patient 2-3% position.",
      },
      B: {
        axis: "catalyst-thesis",
        pole: "concrete-catalyst",
        thesis:
          "The airframer's rate-8 decision is scheduled for 30 November. That date is the whole thesis.",
        catalyst:
          "Rate 8 confirmed on 30 November; every unit past rate 7 drops 40% incremental margin.",
        risk: "Rate guidance has already slipped twice. A third slip breaks the maths.",
        sizing: "2% now, 4% only once rate 7 is confirmed.",
      },
    },
  },
];

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): Card | undefined {
  return CARD_BY_ID.get(id);
}

/** Cards currently testing a given axis. */
export function cardsOnAxis(axisId: AxisId): Card[] {
  return CARDS.filter((c) => c.axis === axisId);
}

/** The pole a given card variant embodies. */
export function poleOf(card: Card, variant: "A" | "B"): PoleId {
  return card.variants[variant].pole;
}

/* ------------------------------------------------------------------------
 * Content hashing — what makes a variant a *treatment* rather than a label.
 *
 * "Variant B" is not a stable thing. It is whatever copy variant B happened
 * to be showing at the time. Edit the thesis and the swipes collected before
 * and after measured two different treatments; pooling them under one label
 * produces a confident wrong answer, which is the one failure mode this whole
 * project exists to prevent.
 *
 * So each variant carries a hash of the copy actually rendered, the swipe log
 * records it, and a verdict only counts swipes that saw the copy live today.
 *
 * Normalisation: each field is trimmed and its internal whitespace collapsed
 * before hashing. Re-wrapping a line or fixing double spaces therefore does
 * NOT reset an experiment, while any real character change does. Fields are
 * joined with U+001F (unit separator), a character that cannot occur in the
 * copy, so moving text between fields cannot collide with leaving it put.
 *
 * The axis and pole tags are deliberately NOT hashed: they describe where a
 * swipe is counted, not what the user read.
 * ---------------------------------------------------------------------- */

const FIELD_SEPARATOR = "";

function normalizeField(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Canonical string a variant's hash is computed over. Exported for tests. */
export function canonicalizeVariant(content: CardVariantContent): string {
  return [content.thesis, content.catalyst, content.risk, content.sizing]
    .map(normalizeField)
    .join(FIELD_SEPARATOR);
}

/**
 * 64-bit content hash as 16 hex chars, built from two FNV-1a passes over the
 * canonical string. Dependency-free so it runs identically on server and
 * client; 64 bits makes an accidental collision across a deck of this size
 * vanishingly unlikely.
 */
export function contentHash(content: CardVariantContent): string {
  const canonical = canonicalizeVariant(content);
  const lo = fnv1a(canonical);
  const hi = fnv1a(`${canonical}`);
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}

/** Hash of the copy variant `variant` of `card` is showing right now. */
export function variantHash(card: Card, variant: "A" | "B"): string {
  return contentHash(card.variants[variant]);
}

/** Both live hashes for a card. */
export function cardHashes(card: Card): { A: string; B: string } {
  return { A: variantHash(card, "A"), B: variantHash(card, "B") };
}

export function variantHashById(
  cardId: string,
  variant: "A" | "B",
): string | null {
  const card = getCard(cardId);
  return card ? variantHash(card, variant) : null;
}
