"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CARDS } from "@/lib/cards";
import type { State } from "@/lib/game";
import { tierFor } from "@/lib/elo";
import { Lives } from "@/components/ui";

/** XP rolls up; it never goes down, so it gets the upward motion. */
function XpNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-block overflow-hidden align-baseline">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0, position: "absolute" }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="num block text-[28px] font-semibold leading-none tracking-[-0.035em]"
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function HUD({
  state,
  maxLives,
  careerXp,
}: {
  state: State;
  maxLives: number;
  careerXp: number;
}) {
  const tier = tierFor(state.rating);
  const answered = state.curve.length - 1;

  return (
    <div className="px-5 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <XpNumber value={careerXp} />
            <span className="label !text-brain">XP</span>
            {state.xp > 0 && (
              <motion.span
                key={state.xp}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="num text-[11px] text-up"
              >
                +{state.xp}
              </motion.span>
            )}
          </div>
          {/* Rating is downstream of XP, so it sits under it. */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="label">Rating</span>
            <span className="num text-[12px] text-ink-2">{state.rating}</span>
            <span className="text-ink-3">·</span>
            <span className="text-[11.5px] text-gold">{tier.name}</span>
          </div>
        </div>

        <div className="text-right">
          <Lives lives={state.lives} max={maxLives} />
          <div className="label mt-2">
            Card {Math.min(state.index + 1, CARDS.length)} / {CARDS.length}
          </div>
        </div>
      </div>

      {/* One segment per card: how the session has gone, at a glance. */}
      <div className="mt-3 flex gap-[3px]">
        {CARDS.map((c, i) => {
          const done = i < answered;
          const isNow = i === state.index && state.phase !== "summary";
          const gained = done && state.curve[i + 1] > state.curve[i];
          return (
            <div
              key={c.id}
              className={[
                "h-[3px] flex-1 rounded-full transition-colors",
                done ? (gained ? "bg-up" : "bg-down") : isNow ? "bg-ink-2" : "bg-line",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
