import { CARDS, SECTORS } from "./cards";
import type { Sector } from "./types";

/**
 * Deck composition — what's still ahead, rather than what a card says.
 *
 * How many cards of each sector remain, counted from `fromIndex`:
 * `{ Semis: 2, Energy: 1, Retail: 0, … }`.
 *
 * A Fact is worth exactly as many cards as remain in its sector, so this number
 * sits next to every Fact on the keep, swap, loadout and Brain screens. It's
 * what turns "do I save this?" from a guess into a decision — and it's how a
 * Fact gets marked as spent once its sector is played out.
 */
export function remainingBySector(fromIndex: number): Record<Sector, number> {
  const out = Object.fromEntries(SECTORS.map((s) => [s, 0])) as Record<
    Sector,
    number
  >;
  for (let i = fromIndex; i < CARDS.length; i++) out[CARDS[i].sector] += 1;
  return out;
}

/** The sectors still ahead, busiest first. Ready to render as chips. */
export function upcomingSectors(fromIndex: number): [Sector, number][] {
  const left = remainingBySector(fromIndex);
  return (Object.entries(left) as [Sector, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}
