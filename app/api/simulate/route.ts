/**
 * POST /api/simulate
 *
 * Seeds synthetic swipes and STREAMS the experiment as it runs, so you can
 * watch the always-valid p-value fall, cross 0.05, and the test stop early.
 *
 * body (all optional):
 *   {
 *     swipesPerCard: number,          // sample budget per card (default 4000)
 *     seed: number,                   // reproducible RNG seed
 *     stopEarly: boolean,             // honour the sequential stop (default true)
 *     cardIds: string[],              // subset of cards to run
 *     rates: { [cardId]: { A: number, B: number } },  // true back-rates
 *     paceMs: number                  // per-tick delay so the run is watchable
 *   }
 *
 * Response: newline-delimited JSON events (start / progress / decided /
 * card-done / done).
 *
 * Two details worth noting:
 *
 *  - Synthetic users are bucketed through the SAME deterministic hash the real
 *    UI uses, not by alternating arms. Arm sizes therefore come out roughly
 *    but not exactly even, exactly as they would in production.
 *  - Several cards are configured with A and B set to the SAME true rate.
 *    Those are true nulls. The mSPRT should mostly refuse to call them while
 *    the continuously-peeked z-test frequently will — which is the whole
 *    demonstration, visible live in the stream.
 */

import { assignVariant } from "@/lib/assign";
import { CARDS, getCard, cardHashes } from "@/lib/cards";
import { getSwipesForCard, insertSwipeBatch } from "@/lib/db";
import { mulberry32 } from "@/lib/stats/rng";
import { ratesFor, retentionFor } from "@/lib/groundTruth";
import {
  DEFAULT_CONFIG,
  initMsprt,
  summarize,
  updateMsprt,
  type MsprtState,
} from "@/lib/stats/msprt";
import { twoProportionZTest } from "@/lib/stats/ztest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const MAX_SWIPES_PER_CARD = 20_000;
const PROGRESS_EVERY = 20;
const DB_FLUSH_EVERY = 250;

interface SimCard {
  id: string;
  ticker: string;
  rateA: number;
  rateB: number;
  budget: number;
  retainA: number;
  retainB: number;
  hashes: { A: string; B: string };
  state: MsprtState;
  active: boolean;
  userOffset: number;
  naiveFirstCrossedAt: number | null;
  decidedAt: number | null;
  verdict: string;
}

function clampRate(v: unknown, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(1, Math.max(0, n));
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    // An empty body is fine — run with defaults.
  }

  const swipesPerCard = Math.min(
    MAX_SWIPES_PER_CARD,
    Math.max(
      1,
      typeof body.swipesPerCard === "number" ? Math.floor(body.swipesPerCard) : 4000,
    ),
  );
  // Raw throughput would finish 24k swipes in about a tenth of a second, which
  // defeats the purpose — you are meant to WATCH the p-value fall and cross.
  // Pace the emission instead of the arithmetic. Set 0 for a benchmark run.
  const paceMs = Math.min(
    200,
    Math.max(0, typeof body.paceMs === "number" ? body.paceMs : 22),
  );
  const seed =
    typeof body.seed === "number" && Number.isFinite(body.seed)
      ? Math.floor(body.seed)
      : Math.floor(Math.random() * 2 ** 31);
  const stopEarly = body.stopEarly !== false;

  const requestedIds = Array.isArray(body.cardIds)
    ? (body.cardIds as unknown[]).filter((x): x is string => typeof x === "string")
    : null;

  const overrides = (body.rates ?? {}) as Record<
    string,
    { A?: number; B?: number } | undefined
  >;

  const selected = (requestedIds ?? CARDS.map((c) => c.id))
    .map((id) => getCard(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (selected.length === 0) {
    return Response.json({ error: "no valid cardIds" }, { status: 400 });
  }

  const config = DEFAULT_CONFIG;
  const rng = mulberry32(seed);

  const sims: SimCard[] = selected.map((card) => {
    const base = ratesFor(card.id);
    const retain = retentionFor(card.id);
    const ov = overrides[card.id];
    // Replay whatever is already stored so a second run continues the
    // experiment rather than restarting the statistics from scratch.
    const existing = getSwipesForCard(card.id);
    let state = initMsprt();
    for (const row of existing) {
      state = updateMsprt(
        state,
        { variant: row.variant, backed: row.backed === 1 },
        config,
      );
    }
    return {
      id: card.id,
      ticker: card.ticker,
      rateA: clampRate(ov?.A, base.A),
      rateB: clampRate(ov?.B, base.B),
      budget: swipesPerCard,
      retainA: retain.A,
      retainB: retain.B,
      hashes: cardHashes(card),
      state,
      active: true,
      userOffset: existing.length,
      naiveFirstCrossedAt: null,
      decidedAt: null,
      verdict: "monitoring",
    };
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      send({
        type: "start",
        seed,
        swipesPerCard,
        stopEarly,
        paceMs,
        config,
        cards: sims.map((s) => ({
          cardId: s.id,
          ticker: s.ticker,
          trueRateA: s.rateA,
          trueRateB: s.rateB,
          isNull: s.rateA === s.rateB,
          startingSwipes: s.state.n,
        })),
      });

      let pending: Array<{
        cardId: string;
        variant: "A" | "B";
        userId: string;
        backed: boolean;
        contentHash: string;
        retained: boolean | null;
      }> = [];
      let written = 0;

      const flush = async () => {
        if (pending.length === 0) return;
        written += insertSwipeBatch(pending, "sim");
        pending = [];
        // Yield so the stream actually flushes to the client — the store is
        // synchronous, and a tight loop would otherwise starve the socket.
        await new Promise((r) => setImmediate(r));
      };

      // Round-robin across cards so the client sees them progress together.
      for (let step = 1; step <= swipesPerCard; step++) {
        let anyActive = false;

        for (const sim of sims) {
          if (!sim.active) continue;
          anyActive = true;

          const userId = `sim-${seed}-${sim.userOffset + step}`;
          const variant = assignVariant(userId, sim.id);
          const trueRate = variant === "A" ? sim.rateA : sim.rateB;
          const backed = rng() < trueRate;
          // Retention only exists for a user who backed. Drawn from the
          // framing's own retention rate, which can point the other way.
          const retained = backed
            ? rng() < (variant === "A" ? sim.retainA : sim.retainB)
            : null;

          pending.push({
            cardId: sim.id,
            variant,
            userId,
            backed,
            contentHash: sim.hashes[variant],
            retained,
          });
          sim.state = updateMsprt(sim.state, { variant, backed }, config);

          const s = summarize(sim.state, config);
          const eligible =
            sim.state.nA >= config.minSamplesPerArm &&
            sim.state.nB >= config.minSamplesPerArm;

          const z = twoProportionZTest(
            sim.state.nA,
            sim.state.backsA,
            sim.state.nB,
            sim.state.backsB,
            config.alpha,
          );
          if (eligible && z.significant && sim.naiveFirstCrossedAt === null) {
            sim.naiveFirstCrossedAt = sim.state.n;
            send({
              type: "naive-fired",
              cardId: sim.id,
              ticker: sim.ticker,
              n: sim.state.n,
              naiveP: z.pValue,
              winner: z.winner,
              isNull: sim.rateA === sim.rateB,
            });
          }

          const justDecided = s.decided && sim.decidedAt === null;
          if (justDecided) {
            sim.decidedAt = sim.state.n;
            sim.verdict = s.verdict;
          }

          if (justDecided || step % PROGRESS_EVERY === 0 || step === swipesPerCard) {
            send({
              type: justDecided ? "decided" : "progress",
              cardId: sim.id,
              ticker: sim.ticker,
              n: sim.state.n,
              nA: sim.state.nA,
              nB: sim.state.nB,
              rateA: s.rateA,
              rateB: s.rateB,
              msprtP: sim.state.pValue,
              naiveP: eligible ? z.pValue : 1,
              naiveSignificant: eligible && z.significant,
              verdict: s.verdict,
              decided: s.decided,
              decidedAt: sim.decidedAt,
            });
          }

          if (justDecided && stopEarly) {
            sim.active = false;
            send({
              type: "card-done",
              cardId: sim.id,
              ticker: sim.ticker,
              reason: "sequential stop",
              stoppedAtN: sim.decidedAt,
              budget: sim.budget,
              swipesSaved: sim.budget - (sim.decidedAt ?? sim.budget),
              verdict: sim.verdict,
              naiveFirstCrossedAt: sim.naiveFirstCrossedAt,
            });
          }
        }

        if (pending.length >= DB_FLUSH_EVERY) await flush();
        if (!anyActive) break;

        if (step % PROGRESS_EVERY === 0) {
          // Yields the event loop as well as pacing, so the client actually
          // receives each batch of events rather than one buffered blob.
          await new Promise((r) =>
            paceMs > 0 ? setTimeout(r, paceMs) : setImmediate(r),
          );
        }
      }

      await flush();

      for (const sim of sims) {
        if (sim.active) {
          sim.active = false;
          send({
            type: "card-done",
            cardId: sim.id,
            ticker: sim.ticker,
            reason: sim.decidedAt !== null ? "budget exhausted" : "no decision",
            stoppedAtN: sim.decidedAt,
            budget: sim.budget,
            swipesSaved: 0,
            verdict: sim.verdict,
            naiveFirstCrossedAt: sim.naiveFirstCrossedAt,
          });
        }
      }

      const nullsCalledByMsprt = sims.filter(
        (s) => s.rateA === s.rateB && s.decidedAt !== null,
      ).length;
      const nullsCalledByNaive = sims.filter(
        (s) => s.rateA === s.rateB && s.naiveFirstCrossedAt !== null,
      ).length;

      send({
        type: "done",
        seed,
        swipesWritten: written,
        totalBudget: swipesPerCard * sims.length,
        cards: sims.map((s) => ({
          cardId: s.id,
          ticker: s.ticker,
          n: s.state.n,
          decidedAt: s.decidedAt,
          verdict: s.verdict,
          naiveFirstCrossedAt: s.naiveFirstCrossedAt,
          isNull: s.rateA === s.rateB,
        })),
        nullCount: sims.filter((s) => s.rateA === s.rateB).length,
        nullsCalledByMsprt,
        nullsCalledByNaive,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
