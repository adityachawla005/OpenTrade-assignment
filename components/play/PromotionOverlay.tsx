"use client";

import { motion } from "framer-motion";
import type { Tier } from "@/lib/elo";

/**
 * The flywheel, made literal: the rating you just earned turns straight into
 * neurons, and the next Fact drops into the room that just appeared.
 */
export function PromotionOverlay({
  from,
  to,
  onContinue,
}: {
  from: Tier;
  to: Tier;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-canvas/95 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="num flex size-20 items-center justify-center rounded-3xl bg-gold/15 text-[24px] font-semibold text-gold shadow-[inset_0_0_0_1.5px_rgba(242,181,68,0.6),0_0_60px_-10px_rgba(242,181,68,0.7)]"
      >
        {to.mark}
      </motion.div>

      <motion.div
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="mt-6 text-center"
      >
        <div className="label !text-gold">Promoted</div>
        <h2 className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.035em]">
          {to.name}
        </h2>
        <p className="mt-3 max-w-[19rem] text-[13.5px] leading-snug text-ink-2">
          {to.blurb}
        </p>
      </motion.div>

      {/* Capacity is the reward that changes how the game plays. */}
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.24, type: "spring", stiffness: 240, damping: 26 }}
        className="mt-7 w-full max-w-[20rem] rounded-2xl bg-panel p-4 ring-hair"
      >
        <div className="mb-3 flex items-baseline justify-between">
          <span className="label !text-brain">Neurons</span>
          <span className="num text-[15px] font-medium text-brain">
            {from.neurons} → {to.neurons}
          </span>
        </div>
        <div className="flex flex-wrap gap-[3px]">
          {Array.from({ length: to.neurons }, (_, i) => (
            <motion.span
              key={i}
              initial={{
                scaleY: i >= from.neurons ? 0 : 1,
                opacity: i >= from.neurons ? 0 : 1,
              }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                delay: 0.45 + Math.max(0, i - from.neurons) * 0.07,
                type: "spring",
                stiffness: 400,
                damping: 22,
              }}
              className={`h-6 w-[9px] rounded-[3px] ${
                i >= from.neurons ? "bg-brain" : "bg-line-2"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-ink-2">
          +{to.neurons - from.neurons} neurons — room for another Fact, or a
          better one.
        </p>

        <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5">
          {to.unlocks.map((u) => (
            <li key={u} className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className="text-gold" aria-hidden>
                +
              </span>
              {u}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="mt-7 w-full max-w-[20rem] rounded-2xl bg-ink py-4 text-[15px] font-semibold text-canvas"
      >
        Keep playing
      </motion.button>
    </motion.div>
  );
}
