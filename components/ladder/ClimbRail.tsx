"use client";

import { motion } from "framer-motion";
import { TIERS, tierIndexFor } from "@/lib/elo";

/**
 * The ladder as an actual climb.
 *
 * A flat list of tiers hides the thing that matters most — how far apart they
 * are. Here the rail is a real rating axis, so the gap between Rookie and
 * Analyst is visibly shorter than the gap to Wall Street, and your marker sits
 * at your exact rating rather than inside a bucket.
 */
const LO = 1000;
const HI = 1600;

function pct(v: number) {
  return Math.max(0, Math.min(100, ((v - LO) / (HI - LO)) * 100));
}

export function ClimbRail({ rating, peak }: { rating: number; peak: number }) {
  const here = tierIndexFor(rating);
  const you = pct(rating);
  const peakPct = pct(peak);

  return (
    <div className="relative h-[380px] w-full">
      {/* Rail */}
      <div className="absolute bottom-3 left-[22px] top-3 w-[2px] rounded-full bg-line" />
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `calc(${you}% - 0px)` }}
        transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.15 }}
        className="absolute bottom-3 left-[22px] w-[2px] rounded-full bg-brain"
      />

      {/* Peak marker, when you've been higher than you are now. */}
      {peak > rating + 4 && (
        <div
          className="absolute left-[14px] flex items-center gap-2"
          style={{ bottom: `calc(${peakPct}% + 12px - 5px)` }}
        >
          <span className="h-[10px] w-[10px] rounded-full border border-dashed border-ink-3" />
          <span className="label">Peak {peak}</span>
        </div>
      )}

      {TIERS.map((t, i) => {
        const p = pct(Math.max(t.floor, LO));
        const cleared = i < here;
        const current = i === here;
        return (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * (TIERS.length - i) }}
            className="absolute left-0 flex items-center gap-3"
            style={{ bottom: `calc(${p}% + 12px - 11px)` }}
          >
            <span
              className={[
                "relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[8px] font-semibold",
                current
                  ? "num bg-brain text-canvas shadow-[0_0_0_4px_rgba(124,140,255,0.18)]"
                  : cleared
                    ? "num bg-gold/25 text-gold ring-1 ring-gold/50"
                    : "num bg-panel-2 text-ink-3 ring-1 ring-line-2",
              ].join(" ")}
            >
              {t.mark}
            </span>

            <div className={current || cleared ? "" : "opacity-55"}>
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium leading-none tracking-[-0.015em]">
                  {t.name}
                </span>
                <span className="num text-[10.5px] text-ink-3">{t.floor}+</span>
              </div>
              <div className="num mt-1 text-[10.5px] text-ink-2">
                {t.neurons} neurons
                {t.arena && <span className="text-gold"> · Arena</span>}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* You. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 320, damping: 22 }}
        className="absolute right-0 flex items-center gap-2"
        style={{ bottom: `calc(${you}% + 12px - 12px)` }}
      >
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-brain/60" />
        <span className="num rounded-full bg-brain px-2.5 py-1 text-[11px] font-semibold leading-none text-canvas">
          {rating}
        </span>
      </motion.div>
    </div>
  );
}
