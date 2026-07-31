/**
 * Plain fixed-horizon two-proportion z-test — the "before" picture.
 *
 * This is the test the original Visus project used: pool the two proportions,
 * form a z statistic, take a two-sided normal tail probability.
 *
 *     p_hat = (backs_A + backs_B) / (n_A + n_B)
 *     se    = sqrt( p_hat (1 - p_hat) (1/n_A + 1/n_B) )
 *     z     = (p_hat_B - p_hat_A) / se
 *     p     = 2 * (1 - Phi(|z|))
 *
 * It is perfectly correct — *if* you commit to a sample size in advance and
 * look exactly once. The dashboard deliberately evaluates it after every swipe
 * instead, which is the mistake it cannot survive: the resulting "significant"
 * verdicts fire far more often than 5% of the time under the null. That is the
 * contrast the whole app exists to show. See `msprt.ts` for the fix.
 */

import { twoSidedNormalP } from "./normal";

export interface ZTestResult {
  z: number;
  pValue: number;
  rateA: number;
  rateB: number;
  /** Significant at alpha *under fixed-horizon assumptions*. */
  significant: boolean;
  /** Winner if significant, else null. */
  winner: "A" | "B" | null;
}

export function twoProportionZTest(
  nA: number,
  backsA: number,
  nB: number,
  backsB: number,
  alpha = 0.05,
): ZTestResult {
  const rateA = nA > 0 ? backsA / nA : 0;
  const rateB = nB > 0 ? backsB / nB : 0;

  if (nA <= 0 || nB <= 0) {
    return { z: 0, pValue: 1, rateA, rateB, significant: false, winner: null };
  }

  const pooled = (backsA + backsB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));

  if (!(se > 1e-12)) {
    return { z: 0, pValue: 1, rateA, rateB, significant: false, winner: null };
  }

  const z = (rateB - rateA) / se;
  const pValue = twoSidedNormalP(z);
  const significant = pValue < alpha;

  return {
    z,
    pValue,
    rateA,
    rateB,
    significant,
    winner: significant ? (z > 0 ? "B" : "A") : null,
  };
}
