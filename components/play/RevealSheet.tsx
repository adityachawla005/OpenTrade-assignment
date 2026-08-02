"use client";

import { motion } from "framer-motion";
import { EdgeBadge, HedgeIcon } from "@/components/ui";
import { difficultyOf } from "@/lib/elo";
import type { Result } from "@/lib/game";
import { opponentFor } from "@/lib/opponents";

function XpChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-canvas/60 px-2.5 py-1.5 text-[11px] text-ink-2 ring-hair">
      {label} <span className="num text-up">+{value}</span>
    </span>
  );
}

export function RevealSheet({
  result,
  onContinue,
}: {
  result: Result;
  onContinue: () => void;
}) {
  const { card, correct, xp, delta, hedge, hedgeGaveLife } = result;
  const diff = difficultyOf(card);
  const opp = opponentFor(card, result.ratingBefore);
  const oppRight = opp.pick === card.truth;
  const unplayed = result.missedRead ?? (correct ? null : result.unusedHedge);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      className="absolute inset-x-0 bottom-0 z-40 max-h-[88%] overflow-y-auto rounded-t-[28px] bg-panel shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-line no-bar"
    >
      <div className="sticky top-0 z-10 flex justify-center bg-panel pb-2 pt-3">
        <span className="h-1 w-9 rounded-full bg-line-2" />
      </div>

      <div className="px-5 pb-6">
        {/* The moment a Fact saves you. Its own beat, above everything. */}
        {hedge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 24, delay: 0.15 }}
            className="mb-4 flex items-center gap-2.5 rounded-2xl bg-brain/12 p-3.5 shadow-[inset_0_0_0_1px_rgba(124,140,255,0.55)]"
          >
            <span className="shrink-0 text-brain">
              <HedgeIcon />
            </span>
            <p className="text-[13.5px] leading-snug">
              <span className="font-medium">{hedge.title}</span>{" "}
              {hedgeGaveLife ? (
                <>
                  paid out. <span className="text-up">+1 life.</span>
                </>
              ) : (
                <>
                  took the hit.{" "}
                  <span className="text-up">You keep the life.</span>
                </>
              )}
            </p>
          </motion.div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`text-[26px] font-semibold leading-none tracking-[-0.03em] ${
                correct ? "text-up" : "text-down"
              }`}
            >
              {correct ? "Called it" : "Missed it"}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-[15px] text-ink-2">{card.ticker}</span>
              <span
                className={`num text-[15px] font-medium ${
                  card.truth === "UP" ? "text-up" : "text-down"
                }`}
              >
                {card.truth === "UP" ? "▲" : "▼"} {card.move}
              </span>
            </div>
          </div>

          {/* XP is the payout. Rating is what the payout does. */}
          <div className="text-right">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="num text-[30px] font-semibold leading-none tracking-[-0.035em] text-brain"
            >
              +{xp}
            </motion.div>
            <div className="label mt-1.5 !text-brain">XP</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-panel-2 p-4 ring-hair">
          <div className="flex flex-wrap gap-1.5">
            <XpChip label="Call" value={result.xpCall} />
            {result.xpSkill > 0 && (
              <XpChip label={diff.label} value={result.xpSkill} />
            )}
            {result.xpStreak > 0 && (
              <XpChip label="Streak" value={result.xpStreak} />
            )}
          </div>

          {/* The causal line: XP in, rating out. */}
          <div className="mt-3.5 flex items-center gap-2.5 border-t border-line pt-3.5">
            <span className="num text-[13px] text-brain">+{xp} XP</span>
            <span className="text-ink-3" aria-hidden>
              →
            </span>
            <span
              className={`num text-[15px] font-semibold ${
                delta >= 0 ? "text-up" : "text-down"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta} rating
            </span>
            <span className="num ml-auto text-[12px] text-ink-2">
              {result.ratingAfter}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[11.5px]">
            <span className="num text-ink-2">{opp.name}</span>
            <span className="num text-ink-3">{opp.rating}</span>
            <span className="ml-auto">
              <span className={opp.pick === "UP" ? "text-up" : "text-down"}>
                {opp.pick === "UP" ? "▲ UP" : "▼ DOWN"}
              </span>
              <span className="text-ink-3"> · {oppRight ? "right" : "wrong"}</span>
            </span>
          </div>
        </div>

        <p className="mt-4 text-[14.5px] leading-[1.5]">{card.because}</p>

        {/* Armed, not needed. Say so, or its survival looks like a bug. */}
        {result.hedgeKept && (
          <p className="mt-3.5 rounded-xl bg-brain/8 px-3.5 py-2.5 text-[12px] leading-snug text-brain">
            <span className="font-medium">{result.hedgeKept.title}</span> wasn&apos;t
            needed — you&apos;re already at full lives, so it stays in your Brain.
          </p>
        )}

        {/* Held but not played. Pointed out once, never charged for. */}
        {unplayed && (
          <p className="mt-3.5 rounded-xl border border-dashed border-line-2 px-3.5 py-2.5 text-[12px] leading-snug text-ink-3">
            <span className="text-ink-2">{unplayed.title}</span> was playable
            here — still yours.
          </p>
        )}

        {correct && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 28 }}
            className="mt-4 flex items-center gap-3 rounded-2xl bg-brain/8 p-3.5 shadow-[inset_0_0_0_1px_rgba(124,140,255,0.4)]"
          >
            <EdgeBadge fact={card.reward} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
              {card.reward.title}
            </span>
          </motion.div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="mt-5 w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-canvas"
        >
          {correct ? "Keep or skip" : "Next card"}
        </motion.button>
      </div>
    </motion.div>
  );
}
