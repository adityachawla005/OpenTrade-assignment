export type Sector = "Semis" | "Energy" | "Retail" | "Biotech" | "Banks" | "Autos";

export type Direction = "UP" | "DOWN";

/**
 * What a Fact does for you when the deck deals a card in its sector.
 *
 * `read`  — persistent. Unlocks a line of analysis before you call it.
 * `hedge` — single-use. Absorbs a wrong call, or converts to a life on a right one.
 *
 * The two are deliberately not comparable: a read is information, a hedge is
 * insurance. Which one you protect when the Brain fills up is the whole game.
 */
export type EdgeKind = "read" | "hedge";

export interface Fact {
  id: string;
  sector: Sector;
  /** Chip-sized. This is what the player scans when the Brain is full. */
  title: string;
  /** The principle itself, in one sentence. */
  detail: string;
  edge: EdgeKind;
  /** Shown on a matching card *before* the call. `read` facts only. */
  hint?: string;
  rarity: "Common" | "Sharp" | "Rare";
}

export interface Card {
  id: string;
  ticker: string;
  company: string;
  sector: Sector;
  setup: string;
  /** Two or three scannable lines under the setup. */
  lines: string[];
  /** Share of the field calling UP. The crowd is the opponent you're rated against. */
  consensus: number;
  truth: Direction;
  /** What the stock actually did, e.g. "-8.2%". */
  move: string;
  /** Why. This is the part the player keeps. */
  because: string;
  /** Earned on a correct call. */
  reward: Fact;
}
