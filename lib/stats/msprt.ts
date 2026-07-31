/**
 * ============================================================================
 * mSPRT — mixture Sequential Probability Ratio Test for two proportions
 * ============================================================================
 *
 * WHAT THIS SOLVES
 * ----------------
 * A fixed-horizon two-proportion z-test is only valid if you look **once**, at
 * a sample size you committed to in advance. If you watch the p-value as data
 * streams in and stop the moment it dips under 0.05, you are running many
 * correlated tests. Under the null the p-value random-walks; given enough
 * looks it will eventually wander below 0.05 with probability approaching 1.
 * Continuously peeking at a nominal-5% z-test empirically produces false
 * positives in the 20-40% range (see `msprt.test.ts`, which measures this).
 *
 * The mSPRT gives an **always-valid** p-value: a sequence p_1, p_2, ... such
 * that for ANY stopping rule tau (including "stop as soon as it looks good"),
 *
 *     P_H0( p_tau <= alpha )  <=  alpha.
 *
 * You may evaluate it after every single swipe, forever, and stop whenever you
 * like. That is what makes early stopping legitimate rather than cheating.
 *
 *
 * THE MODEL
 * ---------
 * Variant A has back-rate p_A, variant B has p_B. The effect is the difference
 *
 *     theta = p_B - p_A,      H0: theta = 0,   H1: theta != 0.
 *
 * After n_A observations on A and n_B on B, the observed effect
 *
 *     theta_hat = p_hat_B - p_hat_A
 *
 * is asymptotically normal around theta with variance estimated under the null
 * by the pooled-proportion formula
 *
 *     V = p_hat * (1 - p_hat) * (1/n_A + 1/n_B),
 *     p_hat = (backs_A + backs_B) / (n_A + n_B).
 *
 * So we work with the asymptotic observation model  theta_hat ~ N(theta, V).
 *
 *
 * THE MIXTURE LIKELIHOOD RATIO
 * ----------------------------
 * A simple SPRT needs a point alternative, which we do not have — we do not
 * know the true lift in advance. The mSPRT removes that by placing a prior
 * (the "mixing distribution") over the effect and integrating it out. We use a
 * mean-zero normal prior with mixing variance tau^2:
 *
 *     theta ~ H = N(0, tau^2).
 *
 * For a fixed theta, the likelihood ratio of H1 against H0 is
 *
 *     L(theta)/L(0) = exp( (2*theta_hat*theta - theta^2) / (2V) ).
 *
 * Mixing over H and doing the Gaussian integral gives the mixture LR:
 *
 *     Lambda_n = sqrt( V / (V + tau^2) )
 *                * exp( tau^2 * theta_hat^2 / ( 2 * V * (V + tau^2) ) ).
 *
 * (Derivation: the exponent is -a*theta^2 + b*theta with a = (V+tau^2)/(2 tau^2 V)
 * and b = theta_hat/V; use  ∫exp(-a t^2 + b t)dt = sqrt(pi/a) exp(b^2/4a),
 * then fold in the 1/sqrt(2 pi tau^2) prior normaliser.)
 *
 * Note the shape: the sqrt term is a penalty < 1 that shrinks as evidence
 * accumulates (V falls), and the exponential term rewards a large standardised
 * effect. Early on, when V >> tau^2, the penalty dominates and Lambda stays
 * near or below 1 — the test is intrinsically reluctant to fire on tiny
 * samples. That built-in cost of peeking is precisely what buys validity.
 *
 *
 * WHY CONTINUOUS MONITORING STAYS VALID
 * -------------------------------------
 * Under H0 the mixture LR is a non-negative martingale with E[Lambda_0] = 1:
 * each factor is a likelihood ratio against the true data-generating density,
 * and mixing over theta preserves the martingale property (it is an average of
 * martingales). Ville's inequality — the martingale analogue of Markov's —
 * then bounds the probability that it EVER gets large:
 *
 *     P_H0( sup_n Lambda_n >= 1/alpha )  <=  alpha.
 *
 * The bound is on the supremum over the whole infinite sequence, not on any
 * single n. So define the always-valid p-value as the reciprocal of the
 * running maximum:
 *
 *     p_n = min( 1, 1 / max_{k <= n} Lambda_k ).
 *
 * Then { p_n <= alpha for some n } is exactly { sup_n Lambda_n >= 1/alpha },
 * which has probability at most alpha. Stopping the first time p_n < 0.05
 * therefore controls type-I error at 5% no matter how often you look. As a
 * bonus p_n is monotone non-increasing by construction, so a verdict never
 * flip-flops back and forth as more data arrives.
 *
 *
 * HONEST CAVEATS
 * --------------
 * 1. This is the *asymptotic* mSPRT (Johari, Koomen, Pekelis & Walsh, "Always
 *    Valid Inference: Continuous Monitoring of A/B Tests"). We substitute an
 *    estimated variance V into a normal approximation of a binomial, so the
 *    martingale property holds asymptotically rather than exactly. With very
 *    few samples per arm the approximation is poor, so `minSamplesPerArm`
 *    gates the verdict (not the arithmetic) until the normal approximation is
 *    reasonable. This is about approximation quality, not about the peeking
 *    correction.
 * 2. tau^2 tunes power, never validity. The test is most powerful when tau is
 *    close to the true |theta|; a badly mis-set tau costs samples but cannot
 *    inflate the false-positive rate. Default tau = 0.05 (absolute difference
 *    in back-rate), i.e. tuned to detect lifts on the order of 5 points.
 * 3. Always-valid p-values are conservative relative to a correctly-run
 *    fixed-horizon test at the same n. You pay some samples in the worst case
 *    in exchange for the right to stop early in the common case.
 * ============================================================================
 */

export type Variant = "A" | "B";

export interface MsprtConfig {
  /** Mixing variance of the N(0, tau^2) prior over the effect size. */
  tau2: number;
  /** Significance threshold for declaring a winner. */
  alpha: number;
  /**
   * Verdict gate: minimum observations per arm before a winner may be
   * declared. Guards the normal approximation, not the peeking correction.
   */
  minSamplesPerArm: number;
}

export const DEFAULT_CONFIG: MsprtConfig = {
  tau2: 0.0025, // tau = 0.05 absolute back-rate difference
  alpha: 0.05,
  minSamplesPerArm: 50,
};

export interface MsprtState {
  nA: number;
  backsA: number;
  nB: number;
  backsB: number;
  /** log of the current mixture likelihood ratio, Lambda_n. */
  logLR: number;
  /** log of the running maximum of Lambda over all steps so far. */
  maxLogLR: number;
  /** Always-valid p-value: min(1, 1 / max Lambda). Monotone non-increasing. */
  pValue: number;
  /** Total observations processed. */
  n: number;
  /** Index (1-based, in total swipes) of the first crossing of alpha, else null. */
  stoppedAtN: number | null;
}

export type Verdict = "monitoring" | "A" | "B";

export interface MsprtSummary extends MsprtState {
  rateA: number;
  rateB: number;
  /** Observed effect theta_hat = rateB - rateA. */
  effect: number;
  verdict: Verdict;
  /** True once the always-valid p-value has crossed alpha with enough samples. */
  decided: boolean;
}

/** A single swipe observation. */
export interface Observation {
  variant: Variant;
  /** true = swiped right ("back"), false = swiped left ("pass"). */
  backed: boolean;
}

export function initMsprt(): MsprtState {
  return {
    nA: 0,
    backsA: 0,
    nB: 0,
    backsB: 0,
    logLR: 0,
    maxLogLR: 0,
    pValue: 1,
    n: 0,
    stoppedAtN: null,
  };
}

/**
 * Compute log(Lambda_n) from sufficient statistics.
 *
 *   log Lambda = 0.5*log( V / (V + tau^2) )
 *              + tau^2 * theta_hat^2 / ( 2 * V * (V + tau^2) )
 *
 * Returns 0 (Lambda = 1, i.e. no evidence) when the variance estimate is
 * degenerate: either arm empty, or every observation identical so V = 0. In
 * the degenerate-V case theta_hat is 0 as well, so LR = 1 is also the limit.
 */
export function logMixtureLR(
  nA: number,
  backsA: number,
  nB: number,
  backsB: number,
  tau2: number,
): number {
  if (nA <= 0 || nB <= 0) return 0;

  const pooled = (backsA + backsB) / (nA + nB);
  const V = pooled * (1 - pooled) * (1 / nA + 1 / nB);
  if (!(V > 1e-12)) return 0;

  const thetaHat = backsB / nB - backsA / nA;

  const penalty = 0.5 * Math.log(V / (V + tau2));
  const evidence = (tau2 * thetaHat * thetaHat) / (2 * V * (V + tau2));
  return penalty + evidence;
}

/**
 * Pure incremental update: fold one swipe into the running state.
 *
 * Does not mutate `state`; returns a new state object. Calling this after
 * every swipe and reading `pValue` is safe — that is the whole point of the
 * always-valid construction.
 */
export function updateMsprt(
  state: MsprtState,
  obs: Observation,
  config: MsprtConfig = DEFAULT_CONFIG,
): MsprtState {
  const nA = state.nA + (obs.variant === "A" ? 1 : 0);
  const backsA = state.backsA + (obs.variant === "A" && obs.backed ? 1 : 0);
  const nB = state.nB + (obs.variant === "B" ? 1 : 0);
  const backsB = state.backsB + (obs.variant === "B" && obs.backed ? 1 : 0);
  const n = state.n + 1;

  const logLR = logMixtureLR(nA, backsA, nB, backsB, config.tau2);

  // The running maximum is only allowed to advance once both arms have enough
  // data for the normal approximation to mean anything. Before that we hold
  // the p-value at its previous value rather than let approximation error at
  // n = 3 permanently lock in a spurious maximum.
  const eligible =
    nA >= config.minSamplesPerArm && nB >= config.minSamplesPerArm;
  const maxLogLR = eligible ? Math.max(state.maxLogLR, logLR) : state.maxLogLR;

  const pValue = Math.min(1, Math.exp(-maxLogLR));

  const crossed = pValue < config.alpha;
  const stoppedAtN = state.stoppedAtN ?? (crossed ? n : null);

  return { nA, backsA, nB, backsB, logLR, maxLogLR, pValue, n, stoppedAtN };
}

/** Fold a batch of observations. Convenience wrapper over `updateMsprt`. */
export function updateMsprtBatch(
  state: MsprtState,
  observations: Observation[],
  config: MsprtConfig = DEFAULT_CONFIG,
): MsprtState {
  let s = state;
  for (const obs of observations) s = updateMsprt(s, obs, config);
  return s;
}

/** Derive rates, effect and verdict from a state. */
export function summarize(
  state: MsprtState,
  config: MsprtConfig = DEFAULT_CONFIG,
): MsprtSummary {
  const rateA = state.nA > 0 ? state.backsA / state.nA : 0;
  const rateB = state.nB > 0 ? state.backsB / state.nB : 0;
  const effect = rateB - rateA;

  const enough =
    state.nA >= config.minSamplesPerArm && state.nB >= config.minSamplesPerArm;
  const decided = enough && state.pValue < config.alpha;

  let verdict: Verdict = "monitoring";
  if (decided) verdict = effect > 0 ? "B" : "A";

  return { ...state, rateA, rateB, effect, verdict, decided };
}
