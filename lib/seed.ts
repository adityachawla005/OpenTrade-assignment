/**
 * Deterministic sample-traffic generator.
 *
 * Used to populate the store on a cold start so a deployed instance never shows
 * an empty board. The streaming `/api/simulate` route runs its own loop because
 * it has to emit progress as it goes; this is the same generation logic in
 * one shot.
 *
 * Synthetic users are bucketed through the SAME deterministic hash the real UI
 * uses, so arm sizes come out roughly — not exactly — even, exactly as they
 * would in production.
 */

import { assignVariant } from "./assign";
import { CARDS, cardHashes } from "./cards";
import { ratesFor, retentionFor } from "./groundTruth";
import { mulberry32 } from "./stats/rng";

export interface SeedRow {
  cardId: string;
  variant: "A" | "B";
  userId: string;
  backed: boolean;
  contentHash: string;
  retained: boolean | null;
}

export const DEFAULT_SEED = 21;
export const DEFAULT_SWIPES_PER_CARD = 1500;

export function generateSwipes(
  swipesPerCard = DEFAULT_SWIPES_PER_CARD,
  seed = DEFAULT_SEED,
): SeedRow[] {
  const rng = mulberry32(seed);
  const rows: SeedRow[] = [];

  const sims = CARDS.map((card) => ({
    id: card.id,
    hashes: cardHashes(card),
    rates: ratesFor(card.id),
    retain: retentionFor(card.id),
  }));

  // Round-robin across cards so arrival order interleaves them, which is what
  // the pooled sequential test would actually see in production.
  for (let step = 1; step <= swipesPerCard; step++) {
    for (const sim of sims) {
      const userId = `sim-${seed}-${step}`;
      const variant = assignVariant(userId, sim.id);
      const backed = rng() < (variant === "A" ? sim.rates.A : sim.rates.B);
      // Retention only exists for a user who backed.
      const retained = backed
        ? rng() < (variant === "A" ? sim.retain.A : sim.retain.B)
        : null;

      rows.push({
        cardId: sim.id,
        variant,
        userId,
        backed,
        contentHash: sim.hashes[variant],
        retained,
      });
    }
  }

  return rows;
}
