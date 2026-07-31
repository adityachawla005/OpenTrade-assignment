/**
 * Deterministic variant assignment.
 *
 * Assignment is a pure function of (userId, cardId) — never a per-request coin
 * flip. Consequences that matter for the experiment:
 *
 *  - A returning user always sees the same variant of a card, so the thing we
 *    measure is the variant's effect and not the churn of a user being shown
 *    A on Monday and B on Tuesday.
 *  - The server recomputes the assignment when recording a swipe, so a client
 *    cannot report itself into the other bucket.
 *  - Salting the hash with the cardId makes each card an independent
 *    experiment. Hashing the userId alone would put a user in bucket A for
 *    *every* card, correlating all six experiments into effectively one.
 *
 * FNV-1a 32-bit: tiny, dependency-free, and well enough distributed for
 * bucketing. `Math.imul` keeps the multiply in 32-bit integer space.
 */

import type { Variant } from "./stats/msprt";

export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Map a user onto a variant for a given card.
 * `splitA` is the share of traffic sent to A (0.5 = even split).
 */
export function assignVariant(
  userId: string,
  cardId: string,
  splitA = 0.5,
): Variant {
  const bucket = fnv1a(`${cardId}:${userId}`) % 10000;
  return bucket < splitA * 10000 ? "A" : "B";
}
