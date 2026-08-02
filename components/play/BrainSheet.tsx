"use client";

import { motion } from "framer-motion";
import { remainingBySector } from "@/lib/deck";
import { neuronsUsed } from "@/lib/elo";
import type { Card as CardT, Fact } from "@/lib/types";
import { FactTile, NeuronMeter } from "@/components/ui";

/** Read-only look inside the Brain, opened from the corner pop. */
export function BrainSheet({
  brain,
  neurons,
  card,
  fromIndex,
  onClose,
}: {
  brain: Fact[];
  neurons: number;
  card: CardT | null;
  fromIndex: number;
  onClose: () => void;
}) {
  const left = remainingBySector(fromIndex);
  const used = neuronsUsed(brain);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 z-40 bg-canvas/70 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="absolute inset-x-0 bottom-0 z-40 max-h-[80%] overflow-y-auto rounded-t-[28px] bg-panel ring-1 ring-line no-bar"
      >
        <div className="sticky top-0 z-10 flex justify-center bg-panel pb-2 pt-3">
          <span className="h-1 w-9 rounded-full bg-line-2" />
        </div>
        <div className="px-5 pb-7">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[19px] font-semibold tracking-[-0.025em]">
              Your Brain
            </h3>
            <span className="num text-[12px] text-brain">
              {used}/{neurons} neurons
            </span>
          </div>

          <div className="mt-3">
            <NeuronMeter used={used} total={neurons} />
          </div>

          <div className="mt-4 space-y-2.5">
            {brain.map((f) => {
              const n = left[f.sector] ?? 0;
              const playable = card && f.sector === card.sector;
              return (
                <FactTile
                  key={f.id}
                  fact={f}
                  tone={playable ? "incoming" : n === 0 ? "dim" : "held"}
                  footnote={
                    <span
                      className={`num text-[11px] ${n === 0 ? "text-down" : "text-ink-3"}`}
                    >
                      {playable
                        ? "Playable on this card"
                        : n === 0
                          ? `No more ${f.sector} this run`
                          : `${n} more ${f.sector} card${n === 1 ? "" : "s"} this run`}
                    </span>
                  }
                />
              );
            })}
            {brain.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line-2 px-4 py-8 text-center">
                <span className="label">Nothing carried yet</span>
                <p className="mt-2 text-[12.5px] text-ink-2">
                  Win a card to earn one.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-2xl border border-line-2 py-3.5 text-[14px] text-ink-2"
          >
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}
