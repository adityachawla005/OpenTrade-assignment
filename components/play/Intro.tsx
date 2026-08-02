"use client";

import { motion } from "framer-motion";
import { BrainIcon } from "@/components/BrainIcon";
import { HedgeIcon, ReadIcon } from "@/components/ui";
import { TIERS, tierFor } from "@/lib/elo";
import type { Game } from "@/lib/game";
import { TOTAL_FACTS } from "@/lib/profile";

const BEATS = [
  { k: "01", t: "Call it", d: "Up or down. Drag the card or tap." },
  { k: "02", t: "Earn XP + a Fact", d: "XP raises your rating. The Fact is yours to keep — or skip." },
  {
    k: "03",
    t: "Spend your neurons",
    d: `${TIERS[0].neurons} slots, one Fact each. Keeping junk costs you the good stuff.`,
  },
];

export function Intro({ g }: { g: Game }) {
  const { career } = g.state;
  const returning = g.state.hydrated && career.sessions > 0;

  return (
    <div className="flex min-h-full flex-col justify-between px-6 pb-8 pt-16">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <div className="label !text-brain">Prediction game</div>
          <h1 className="mt-3 text-[44px] font-semibold leading-[0.95] tracking-[-0.045em]">
            EDGE
          </h1>
          <p className="mt-4 text-[17px] leading-[1.35] tracking-[-0.015em]">
            Anyone can guess a stock. The game is remembering{" "}
            <span className="text-brain">why you were right</span>.
          </p>
        </motion.div>

        {/* Returning player: the career is the point, so it leads. */}
        {returning && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-7 flex items-end gap-5 rounded-2xl bg-brain/8 p-4 shadow-[inset_0_0_0_1px_rgba(124,140,255,0.4)]"
          >
            <div>
              <div className="num text-[26px] font-semibold leading-none tracking-[-0.035em]">
                {career.xp.toLocaleString()}
              </div>
              <div className="label mt-1.5 !text-brain">XP</div>
            </div>
            <div>
              <div className="num text-[17px] font-medium leading-none">
                {career.rating}
              </div>
              <div className="label mt-1.5">{tierFor(career.rating).name}</div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-brain">
              <BrainIcon className="size-5" />
              <span className="num text-[13px]">
                {career.discovered.length}/{TOTAL_FACTS}
              </span>
            </div>
          </motion.div>
        )}

        <div className="mt-9 space-y-4">
          {BEATS.map((b, i) => (
            <motion.div
              key={b.k}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 260, damping: 30 }}
              className="flex gap-3.5"
            >
              <span className="num mt-[3px] text-[11px] text-ink-3">{b.k}</span>
              <div>
                <div className="text-[15px] font-medium tracking-[-0.01em]">{b.t}</div>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{b.d}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* The two Fact types, at a glance rather than in prose. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-7 grid grid-cols-2 gap-2.5"
        >
          <div className="rounded-2xl bg-panel p-3.5 ring-hair">
            <span className="flex items-center gap-1.5 text-brain">
              <ReadIcon />
              <span className="label !text-brain">Read</span>
            </span>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
              Unlocks the angle before you call. Reusable.
            </p>
          </div>
          <div className="rounded-2xl bg-panel p-3.5 ring-hair">
            <span className="flex items-center gap-1.5 text-brain">
              <HedgeIcon />
              <span className="label !text-brain">Hedge</span>
            </span>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
              Absorbs one miss, or pays a life. Spent only when it does.
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-9"
      >
        <button
          onClick={g.begin}
          className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-canvas active:scale-[0.985]"
        >
          {returning ? "Continue career" : "Deal the first card"}
        </button>
        {returning && (
          <button
            onClick={g.fresh}
            className="mt-2.5 w-full rounded-2xl border border-line-2 py-3.5 text-[14px] text-ink-2"
          >
            New career
          </button>
        )}
        <p className="mt-3.5 text-center text-[11px] text-ink-3">
          Fictional data throughout. Not investment advice.
        </p>
      </motion.div>
    </div>
  );
}
