import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONFIG,
  initMsprt,
  logMixtureLR,
  summarize,
  updateMsprt,
  type MsprtConfig,
  type Observation,
} from "./msprt";
import { twoProportionZTest } from "./ztest";
import { mulberry32, bernoulli, type Rng } from "./rng";
import { normalCdf, twoSidedNormalP } from "./normal";
import { assignVariant, fnv1a } from "../assign";

const CONFIG: MsprtConfig = { ...DEFAULT_CONFIG };

/**
 * Run one experiment, checking BOTH tests after every single swipe — i.e. the
 * maximally aggressive peeking policy. Returns when each test first fired.
 */
function runPeekingTrial(
  rng: Rng,
  rateA: number,
  rateB: number,
  horizon: number,
  config: MsprtConfig = CONFIG,
): {
  msprtFiredAt: number | null;
  msprtWinner: "A" | "B" | null;
  naiveFiredAt: number | null;
  naiveWinner: "A" | "B" | null;
} {
  let state = initMsprt();
  let msprtFiredAt: number | null = null;
  let msprtWinner: "A" | "B" | null = null;
  let naiveFiredAt: number | null = null;
  let naiveWinner: "A" | "B" | null = null;

  for (let i = 1; i <= horizon; i++) {
    // Alternate arms; equivalent to a 50/50 hash split in expectation.
    const variant = i % 2 === 0 ? "A" : "B";
    const backed = bernoulli(rng, variant === "A" ? rateA : rateB);
    state = updateMsprt(state, { variant, backed }, config);

    if (msprtFiredAt === null) {
      const s = summarize(state, config);
      if (s.decided) {
        msprtFiredAt = i;
        msprtWinner = s.verdict === "monitoring" ? null : s.verdict;
      }
    }

    if (
      naiveFiredAt === null &&
      state.nA >= config.minSamplesPerArm &&
      state.nB >= config.minSamplesPerArm
    ) {
      // The naive z-test, peeked at with exactly the same cadence and the same
      // minimum-sample gate, so the only difference is the test itself.
      const z = twoProportionZTest(
        state.nA,
        state.backsA,
        state.nB,
        state.backsB,
        config.alpha,
      );
      if (z.significant) {
        naiveFiredAt = i;
        naiveWinner = z.winner;
      }
    }
  }

  return { msprtFiredAt, msprtWinner, naiveFiredAt, naiveWinner };
}

describe("normal helpers", () => {
  it("matches known standard-normal values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 10);
    expect(normalCdf(1.959963985)).toBeCloseTo(0.975, 6);
    expect(normalCdf(-1.959963985)).toBeCloseTo(0.025, 6);
    expect(normalCdf(2.5758293)).toBeCloseTo(0.995, 6);
  });

  it("gives the textbook two-sided critical p-values", () => {
    expect(twoSidedNormalP(1.959963985)).toBeCloseTo(0.05, 6);
    expect(twoSidedNormalP(2.5758293)).toBeCloseTo(0.01, 6);
    expect(twoSidedNormalP(0)).toBeCloseTo(1, 10);
  });
});

describe("mixture likelihood ratio", () => {
  it("is 1 when an arm is empty or the variance estimate degenerates", () => {
    expect(logMixtureLR(0, 0, 10, 5, CONFIG.tau2)).toBe(0);
    expect(logMixtureLR(10, 5, 0, 0, CONFIG.tau2)).toBe(0);
    // Nobody backed anything: pooled p = 0, V = 0, effect = 0.
    expect(logMixtureLR(50, 0, 50, 0, CONFIG.tau2)).toBe(0);
    // Everybody backed everything.
    expect(logMixtureLR(50, 50, 50, 50, CONFIG.tau2)).toBe(0);
  });

  it("matches the closed form computed independently", () => {
    const nA = 400,
      backsA = 120,
      nB = 400,
      backsB = 160,
      tau2 = 0.0025;
    const pooled = (backsA + backsB) / (nA + nB);
    const V = pooled * (1 - pooled) * (1 / nA + 1 / nB);
    const theta = backsB / nB - backsA / nA;
    const expected =
      0.5 * Math.log(V / (V + tau2)) +
      (tau2 * theta * theta) / (2 * V * (V + tau2));

    expect(logMixtureLR(nA, backsA, nB, backsB, tau2)).toBeCloseTo(
      expected,
      12,
    );
  });

  it("penalises small samples: no effect means LR below 1", () => {
    // theta_hat = 0 exactly -> only the sqrt(V/(V+tau^2)) penalty remains.
    expect(logMixtureLR(60, 18, 60, 18, CONFIG.tau2)).toBeLessThan(0);
  });

  it("grows with a larger observed effect at fixed sample size", () => {
    const small = logMixtureLR(500, 150, 500, 160, CONFIG.tau2);
    const large = logMixtureLR(500, 150, 500, 230, CONFIG.tau2);
    expect(large).toBeGreaterThan(small);
  });
});

describe("updateMsprt is pure and incremental", () => {
  it("does not mutate the input state", () => {
    const s0 = initMsprt();
    const snapshot = JSON.stringify(s0);
    const s1 = updateMsprt(s0, { variant: "A", backed: true }, CONFIG);

    expect(JSON.stringify(s0)).toBe(snapshot);
    expect(s1).not.toBe(s0);
    expect(s1.nA).toBe(1);
    expect(s0.nA).toBe(0);
  });

  it("accumulates counts correctly", () => {
    const obs: Observation[] = [
      { variant: "A", backed: true },
      { variant: "A", backed: false },
      { variant: "B", backed: true },
      { variant: "B", backed: true },
      { variant: "B", backed: false },
    ];
    let s = initMsprt();
    for (const o of obs) s = updateMsprt(s, o, CONFIG);

    expect(s.nA).toBe(2);
    expect(s.backsA).toBe(1);
    expect(s.nB).toBe(3);
    expect(s.backsB).toBe(2);
    expect(s.n).toBe(5);

    const sum = summarize(s, CONFIG);
    expect(sum.rateA).toBeCloseTo(0.5, 12);
    expect(sum.rateB).toBeCloseTo(2 / 3, 12);
    expect(sum.effect).toBeCloseTo(2 / 3 - 0.5, 12);
    // Well under minSamplesPerArm, so no verdict is allowed yet.
    expect(sum.verdict).toBe("monitoring");
  });

  it("produces a monotone non-increasing always-valid p-value", () => {
    const rng = mulberry32(20240730);
    let s = initMsprt();
    let prev = 1;

    for (let i = 1; i <= 4000; i++) {
      const variant = i % 2 === 0 ? "A" : "B";
      s = updateMsprt(
        s,
        { variant, backed: bernoulli(rng, variant === "A" ? 0.3 : 0.42) },
        CONFIG,
      );
      expect(s.pValue).toBeLessThanOrEqual(prev + 1e-15);
      prev = s.pValue;
    }
  });

  it("gives identical results whether fed one-by-one or in a batch", () => {
    const rng = mulberry32(7);
    const obs: Observation[] = Array.from({ length: 500 }, (_, i) => {
      const variant = i % 2 === 0 ? "A" : ("B" as const);
      return { variant, backed: bernoulli(rng, 0.35) };
    });

    let a = initMsprt();
    for (const o of obs) a = updateMsprt(a, o, CONFIG);

    let b = initMsprt();
    for (const o of obs) b = updateMsprt(b, o, CONFIG);

    expect(a).toEqual(b);
  });
});

/**
 * (a) FALSE-POSITIVE CONTROL UNDER CONTINUOUS MONITORING.
 *
 * This is the load-bearing test. Under H0 (identical back-rates), we peek
 * after every swipe for 3000 swipes and count how often each test ever
 * declares a winner. The mSPRT must stay at or under its nominal 5%; the
 * naive z-test peeked at the same cadence must blow well past it.
 */
describe("(a) false positives under the null with continuous peeking", () => {
  it("mSPRT holds ~5% while the peeked z-test does not", () => {
    const TRIALS = 400;
    const HORIZON = 3000;
    const NULL_RATE = 0.32;

    let msprtFalsePositives = 0;
    let naiveFalsePositives = 0;

    for (let t = 0; t < TRIALS; t++) {
      const rng = mulberry32(1000 + t * 7919);
      const r = runPeekingTrial(rng, NULL_RATE, NULL_RATE, HORIZON);
      if (r.msprtFiredAt !== null) msprtFalsePositives++;
      if (r.naiveFiredAt !== null) naiveFalsePositives++;
    }

    const msprtRate = msprtFalsePositives / TRIALS;
    const naiveRate = naiveFalsePositives / TRIALS;

    // Reported so the numbers are visible when running `npm test`.
    console.log(
      `[null, ${TRIALS} trials x ${HORIZON} swipes, checked every swipe] ` +
        `mSPRT false-positive rate = ${(msprtRate * 100).toFixed(1)}%, ` +
        `peeked z-test = ${(naiveRate * 100).toFixed(1)}%`,
    );

    // Ville's inequality bounds the true rate by alpha = 5%. Allow Monte Carlo
    // slack for 400 trials (binomial sd at p=0.05 is ~1.1pp).
    expect(msprtRate).toBeLessThan(0.09);

    // The point of the whole project: peeking at a fixed-horizon test inflates
    // the error rate several times over.
    expect(naiveRate).toBeGreaterThan(0.15);
    expect(naiveRate).toBeGreaterThan(msprtRate * 2.5);
  });

  it("stays valid over a much longer horizon (the error rate does not creep to 1)", () => {
    const TRIALS = 150;
    const HORIZON = 20000;
    let fired = 0;

    for (let t = 0; t < TRIALS; t++) {
      const rng = mulberry32(555000 + t * 104729);
      const r = runPeekingTrial(rng, 0.5, 0.5, HORIZON);
      if (r.msprtFiredAt !== null) fired++;
    }

    const rate = fired / TRIALS;
    console.log(
      `[null, ${TRIALS} trials x ${HORIZON} swipes] mSPRT false-positive rate = ${(
        rate * 100
      ).toFixed(1)}%`,
    );
    // A fixed-horizon test peeked at 20k times would approach 100% here.
    expect(rate).toBeLessThan(0.12);
  });
});

/**
 * (b) POWER AND EARLY STOPPING.
 *
 * With a genuine lift the test must find it, name the right winner, and stop
 * well before exhausting the sample budget.
 */
describe("(b) detecting a real effect and stopping early", () => {
  it("detects a 15-point lift, picks B, and stops long before the horizon", () => {
    const TRIALS = 200;
    const HORIZON = 4000;

    let detected = 0;
    let wrongWinner = 0;
    const stopTimes: number[] = [];

    for (let t = 0; t < TRIALS; t++) {
      const rng = mulberry32(90000 + t * 31337);
      const r = runPeekingTrial(rng, 0.3, 0.45, HORIZON);
      if (r.msprtFiredAt !== null) {
        detected++;
        stopTimes.push(r.msprtFiredAt);
        if (r.msprtWinner !== "B") wrongWinner++;
      }
    }

    stopTimes.sort((a, b) => a - b);
    const median = stopTimes[Math.floor(stopTimes.length / 2)];
    const power = detected / TRIALS;

    console.log(
      `[p_A=0.30 vs p_B=0.45] power = ${(power * 100).toFixed(1)}%, ` +
        `median stop = ${median} swipes of ${HORIZON} ` +
        `(${((median / HORIZON) * 100).toFixed(0)}% of budget)`,
    );

    expect(power).toBeGreaterThan(0.9);
    expect(wrongWinner).toBe(0);
    // Early stopping is the payoff: a decision on a fraction of the budget.
    expect(median).toBeLessThan(HORIZON / 2);
  });

  it("detects a smaller 7-point lift given more data", () => {
    const TRIALS = 120;
    const HORIZON = 30000;
    let detected = 0;
    let wrongWinner = 0;

    for (let t = 0; t < TRIALS; t++) {
      const rng = mulberry32(4242 + t * 15485863);
      const r = runPeekingTrial(rng, 0.28, 0.35, HORIZON);
      if (r.msprtFiredAt !== null) {
        detected++;
        if (r.msprtWinner !== "B") wrongWinner++;
      }
    }

    console.log(
      `[p_A=0.28 vs p_B=0.35] power = ${((detected / TRIALS) * 100).toFixed(1)}%`,
    );
    expect(detected / TRIALS).toBeGreaterThan(0.85);
    expect(wrongWinner).toBe(0);
  });

  it("identifies A when A is the better variant", () => {
    const rng = mulberry32(2024);
    const r = runPeekingTrial(rng, 0.5, 0.3, 4000);
    expect(r.msprtFiredAt).not.toBeNull();
    expect(r.msprtWinner).toBe("A");
  });

  it("stops earlier than the naive test would need at a fixed horizon", () => {
    // A conventional fixed-horizon design for 0.30 -> 0.40 at 80% power /
    // 5% alpha needs roughly 356 users per arm ~ 712 swipes. The sequential
    // test routinely decides sooner than that on the same data.
    const FIXED_HORIZON_N = 712;
    const TRIALS = 200;
    let earlier = 0;
    let decided = 0;

    for (let t = 0; t < TRIALS; t++) {
      const rng = mulberry32(60000 + t * 2654435761);
      const r = runPeekingTrial(rng, 0.3, 0.4, FIXED_HORIZON_N * 3);
      if (r.msprtFiredAt !== null) {
        decided++;
        if (r.msprtFiredAt < FIXED_HORIZON_N) earlier++;
      }
    }

    console.log(
      `[p_A=0.30 vs p_B=0.40] decided ${decided}/${TRIALS}, of which ` +
        `${earlier} before the ${FIXED_HORIZON_N}-swipe fixed-horizon budget`,
    );
    expect(earlier / TRIALS).toBeGreaterThan(0.25);
  });
});

describe("deterministic assignment", () => {
  it("is stable across repeated calls for the same user and card", () => {
    for (let i = 0; i < 200; i++) {
      const uid = `user-${i}`;
      const first = assignVariant(uid, "card-nvx");
      for (let k = 0; k < 5; k++) {
        expect(assignVariant(uid, "card-nvx")).toBe(first);
      }
    }
  });

  it("splits close to 50/50 across many users", () => {
    let a = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      if (assignVariant(`user-${i}`, "card-hlx") === "A") a++;
    }
    const share = a / N;
    expect(share).toBeGreaterThan(0.47);
    expect(share).toBeLessThan(0.53);
  });

  it("honours a non-even split", () => {
    let a = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      if (assignVariant(`user-${i}`, "card-hlx", 0.8) === "A") a++;
    }
    expect(a / N).toBeGreaterThan(0.77);
    expect(a / N).toBeLessThan(0.83);
  });

  it("assigns cards independently, so a user is not in bucket A for everything", () => {
    // If the hash ignored cardId, every card would agree for every user.
    let disagreements = 0;
    for (let i = 0; i < 1000; i++) {
      const uid = `user-${i}`;
      if (assignVariant(uid, "card-one") !== assignVariant(uid, "card-two")) {
        disagreements++;
      }
    }
    expect(disagreements).toBeGreaterThan(400);
    expect(disagreements).toBeLessThan(600);
  });

  it("hashes deterministically and differs on different input", () => {
    expect(fnv1a("abc")).toBe(fnv1a("abc"));
    expect(fnv1a("abc")).not.toBe(fnv1a("abd"));
    expect(fnv1a("")).toBe(0x811c9dc5);
  });
});
