/**
 * Seeded PRNG (mulberry32) so simulations and tests are reproducible.
 * Not cryptographic — it just needs to be fast and well-distributed.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw a Bernoulli(p) as a boolean. */
export function bernoulli(rng: Rng, p: number): boolean {
  return rng() < p;
}
