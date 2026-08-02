"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { remainingBySector, upcomingSectors } from "@/lib/deck";
import { neuronCost, neuronsUsed } from "@/lib/elo";
import type { Fact } from "@/lib/types";
import { FactTile, NeuronMeter } from "@/components/ui";

/**
 * Making room.
 *
 * The player marks what to drop and the budget updates live, so the trade is
 * legible before it's committed. Multi-select rather than a single tap because
 * the cost model lives in one function — if a Fact ever costs more than one
 * neuron, this screen already handles it.
 */
export function SwapSheet({
  pending,
  brain,
  neurons,
  fromIndex,
  onSwap,
  onRelease,
}: {
  pending: Fact;
  brain: Fact[];
  neurons: number;
  fromIndex: number;
  onSwap: (ids: string[]) => void;
  onRelease: () => void;
}) {
  const [drop, setDrop] = useState<string[]>([]);
  const left = remainingBySector(fromIndex);

  const kept = useMemo(
    () => brain.filter((f) => !drop.includes(f.id)),
    [brain, drop],
  );
  const used = neuronsUsed(kept);
  const cost = neuronCost(pending);
  const fits = used + cost <= neurons;
  const short = Math.max(0, used + cost - neurons);

  const upcoming = upcomingSectors(fromIndex);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      className="absolute inset-0 z-50 overflow-y-auto bg-canvas no-bar"
    >
      <div className="px-5 pb-8 pt-6">
        <h2 className="text-[22px] font-semibold tracking-[-0.03em]">
          Make room for it
        </h2>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          Every neuron is spoken for. Drop what you won&apos;t use.
        </p>

        {/* The budget, live. */}
        <div className="mt-5 rounded-2xl bg-panel p-4 ring-hair">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="label !text-brain">Neurons</span>
            <span className="num text-[11.5px]">
              <span className={fits ? "text-up" : "text-down"}>{used + cost}</span>
              <span className="text-ink-3"> / {neurons}</span>
            </span>
          </div>
          <NeuronMeter used={used} total={neurons} incoming={cost} />
          <p className="mt-2.5 text-[12px] text-ink-2">
            {fits ? (
              <span className="text-up">Room for it.</span>
            ) : (
              <span className="text-down">
                {short} over. Drop {short === 1 ? "one" : `${short}`} to make
                room.
              </span>
            )}
          </p>
        </div>

        {/* What's left to play — the only information that makes this decidable. */}
        <div className="mt-4 rounded-2xl bg-panel p-4 ring-hair">
          <div className="label mb-2.5">Still in the deck</div>
          <div className="flex flex-wrap gap-1.5">
            {upcoming.map(([sector, n]) => (
              <span
                key={sector}
                className="num rounded-full bg-panel-2 px-2.5 py-1.5 text-[11px] text-ink-2 ring-hair"
              >
                {sector} <span className="text-ink">×{n}</span>
              </span>
            ))}
            {upcoming.length === 0 && (
              <span className="text-[12px] text-ink-3">
                Last card of the session.
              </span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="label mb-2.5 !text-brain">Incoming</div>
          <FactTile
            fact={pending}
            tone="incoming"
            footnote={
              <span className="num text-[11px] text-ink-3">
                {(left[pending.sector] ?? 0) > 0
                  ? `${left[pending.sector]} more ${pending.sector} card${left[pending.sector] === 1 ? "" : "s"} this run`
                  : `Next ${pending.sector} card is next run`}
              </span>
            }
          />
        </div>

        <div className="mt-6">
          <div className="label mb-2.5">Tap to drop</div>
          <div className="space-y-2.5">
            {brain.map((f) => {
              const n = left[f.sector] ?? 0;
              const marked = drop.includes(f.id);
              return (
                <div key={f.id} className={marked ? "opacity-45" : ""}>
                  <FactTile
                    fact={f}
                    tone={marked ? "dim" : n === 0 ? "dim" : "held"}
                    onClick={() =>
                      setDrop((d) =>
                        d.includes(f.id)
                          ? d.filter((x) => x !== f.id)
                          : [...d, f.id],
                      )
                    }
                    footnote={
                      <span
                        className={`num text-[11px] ${
                          marked
                            ? "text-down"
                            : n === 0
                              ? "text-down"
                              : "text-ink-3"
                        }`}
                      >
                        {marked
                          ? "Dropping"
                          : n === 0
                            ? `No more ${f.sector} this run`
                            : `${n} more ${f.sector} card${n === 1 ? "" : "s"} this run`}
                      </span>
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!fits}
          onClick={() => onSwap(drop)}
          className="mt-6 w-full rounded-2xl bg-brain py-4 text-[15px] font-semibold text-canvas disabled:bg-line-2 disabled:text-ink-3"
        >
          {fits
            ? drop.length === 0
              ? "Save it"
              : `Save — drop ${drop.length}`
            : "Not enough neurons"}
        </motion.button>
        <button
          onClick={onRelease}
          className="mt-2.5 w-full rounded-2xl border border-line-2 py-3.5 text-[14px] text-ink-2 transition-colors hover:bg-panel"
        >
          Skip it instead
        </button>
      </div>
    </motion.div>
  );
}
