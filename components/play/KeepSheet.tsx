"use client";

import { motion } from "framer-motion";
import { FactTile, NeuronMeter } from "@/components/ui";
import { remainingBySector } from "@/lib/deck";
import { neuronCost, neuronsUsed } from "@/lib/elo";
import type { Fact } from "@/lib/types";

/**
 * Save or skip — one tap, every time.
 *
 * Asked on every Fact rather than only when the Brain is full, so the player is
 * always judging whether a piece of knowledge earns its neuron. Kept
 * deliberately small: the Fact, the budget, one button. Anything more turns a
 * snap judgement into homework.
 */
export function KeepSheet({
  pending,
  brain,
  neurons,
  fromIndex,
  onKeep,
  onSkip,
}: {
  pending: Fact;
  brain: Fact[];
  neurons: number;
  fromIndex: number;
  onKeep: () => void;
  onSkip: () => void;
}) {
  const left = remainingBySector(fromIndex)[pending.sector] ?? 0;
  const used = neuronsUsed(brain);
  const cost = neuronCost(pending);
  const fits = used + cost <= neurons;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-panel shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-line"
    >
      <div className="flex justify-center pb-2 pt-3">
        <span className="h-1 w-9 rounded-full bg-line-2" />
      </div>

      <div className="px-5 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="label !text-brain">Fact earned</span>
          <span className="num text-[11px] text-ink-3">
            {used}/{neurons} neurons
          </span>
        </div>

        <FactTile
          fact={pending}
          tone="incoming"
          footnote={
            <span className="num text-[11px] text-ink-3">
              {left > 0
                ? `${left} more ${pending.sector} card${left === 1 ? "" : "s"} this run`
                : `Next ${pending.sector} card is next run`}
            </span>
          }
        />

        <div className="mt-3.5">
          <NeuronMeter used={used} total={neurons} incoming={cost} />
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onKeep}
          className="mt-4 w-full rounded-2xl bg-brain py-4 text-[15px] font-semibold text-canvas"
        >
          {fits ? "Save to Brain" : "Save — make room"}
        </motion.button>
        <button
          onClick={onSkip}
          className="mt-1 w-full py-3 text-[13px] text-ink-3"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}
