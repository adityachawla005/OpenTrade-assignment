"use client";

import { motion } from "framer-motion";
import { TIERS, tierIndexFor, tierProgress } from "@/lib/elo";

/** Card finishes, one per tier. Cosmetic — but they have to look worth having. */
export const FINISH: Record<string, { name: string; style: React.CSSProperties }> = {
  rookie: { name: "Matte", style: { background: "#191d25" } },
  analyst: {
    name: "Slate",
    style: { background: "linear-gradient(140deg,#2b313d,#161a21)" },
  },
  trader: {
    name: "Graphite",
    style: { background: "linear-gradient(140deg,#4a5361,#20242d 55%,#12151a)" },
  },
  pm: {
    name: "Gold",
    style: { background: "linear-gradient(140deg,#f2b544,#9a6d1c 45%,#3a2a0c)" },
  },
  wallst: {
    name: "Prism",
    style: {
      background:
        "linear-gradient(140deg,#7c8cff,#2ee6a8 38%,#f2b544 72%,#ff5f56)",
    },
  },
};

/**
 * The reward track — one horizontal run through every tier, nodes on a rail.
 *
 * Laid out as a track rather than a list because that's what it is: a route you
 * move along, where the filled part behind you is what you've taken and the
 * empty part ahead is what's still on offer.
 */
export function TierTrack({ rating, peak }: { rating: number; peak: number }) {
  const here = tierIndexFor(peak);
  const within = tierProgress(rating);

  return (
    <div className="-mx-5">
      <div className="no-bar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
        {TIERS.map((t, i) => {
          const unlocked = i <= here;
          const isCurrent = i === here;
          const finish = FINISH[t.key];

          // How much of this segment of rail is behind you.
          const fill = i < here ? 1 : i === here ? Math.max(0.12, within) : 0;

          return (
            <div key={t.key} className="w-[236px] shrink-0 snap-start">
              {/* Rail segment + node. */}
              <div className="relative mb-3 flex h-6 items-center">
                <div className="absolute inset-x-0 h-[2px] rounded-full bg-line" />
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: fill }}
                  transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 90, damping: 20 }}
                  style={{ transformOrigin: "left" }}
                  className="absolute inset-x-0 h-[2px] rounded-full bg-gold"
                />
                <span
                  className={[
                    "relative z-10 flex size-[18px] items-center justify-center rounded-full",
                    unlocked
                      ? "bg-gold text-canvas"
                      : "bg-panel-2 ring-1 ring-line-2",
                  ].join(" ")}
                >
                  {unlocked && (
                    <span className="text-[9px] font-bold leading-none" aria-hidden>
                      ✓
                    </span>
                  )}
                </span>
                {isCurrent && (
                  <motion.span
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 2.1 }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
                    className="absolute left-0 size-[18px] rounded-full ring-1 ring-gold"
                  />
                )}
              </div>

              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={[
                  "overflow-hidden rounded-[20px] bg-panel",
                  isCurrent
                    ? "shadow-[inset_0_0_0_1.5px_rgba(242,181,68,0.65)]"
                    : "ring-hair",
                  unlocked ? "" : "opacity-65",
                ].join(" ")}
              >
                <div className="relative h-[74px] overflow-hidden" style={finish.style}>
                  {t.key === "wallst" && (
                    <motion.div
                      animate={{ x: ["-70%", "180%"] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-y-0 w-1/3 bg-white/25 blur-md"
                    />
                  )}
                  <div className="absolute inset-0 bg-canvas/35" />
                  <div className="relative flex h-full items-center justify-between px-3.5">
                    <div>
                      <div className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-white">
                        {t.name}
                      </div>
                      <div className="num mt-1 text-[10px] text-white/70">
                        {t.floor}+ · {finish.name}
                      </div>
                    </div>
                    <span className="num flex size-9 items-center justify-center rounded-xl bg-black/35 text-[11px] font-semibold text-white ring-1 ring-white/25">
                      {t.mark}
                    </span>
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="label !text-brain">Brain</span>
                    <span className="num text-[11.5px] text-brain">
                      {t.neurons} neurons
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-[3px]">
                    {Array.from({ length: t.neurons }, (_, s) => (
                      <span
                        key={s}
                        className={`h-3.5 w-[6px] rounded-[2px] ${
                          unlocked ? "bg-brain" : "bg-line-2"
                        }`}
                      />
                    ))}
                  </div>

                  <ul className="mt-3.5 space-y-1.5 border-t border-line pt-3">
                    {t.unlocks.slice(1).map((u) => (
                      <li
                        key={u}
                        className="flex items-start gap-2 text-[12px] leading-snug text-ink-2"
                      >
                        <span
                          className={`mt-[2px] ${unlocked ? "text-gold" : "text-ink-3"}`}
                          aria-hidden
                        >
                          {unlocked ? "✦" : "·"}
                        </span>
                        {u}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 border-t border-line pt-2.5">
                    {unlocked ? (
                      <span className="label !text-gold">
                        {isCurrent ? "You are here" : "Unlocked"}
                      </span>
                    ) : (
                      <span className="num text-[11px] text-ink-3">
                        {t.floor - rating} rating away
                      </span>
                    )}
                  </div>
                </div>
              </motion.section>
            </div>
          );
        })}
      </div>

      <div className="mt-1 px-5">
        <span className="label">Swipe the track →</span>
      </div>
    </div>
  );
}
