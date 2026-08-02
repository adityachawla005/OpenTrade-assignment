"use client";

import { motion } from "framer-motion";
import { tierFor } from "@/lib/elo";
import type { Game } from "@/lib/game";
import { TOTAL_FACTS, lifetimeAccuracy } from "@/lib/profile";
import { BrainIcon } from "@/components/BrainIcon";
import { FactTile } from "@/components/ui";
import { RatingCurve } from "@/components/ladder/RatingCurve";

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-panel p-3.5 ring-hair">
      <div className="num text-[21px] font-semibold leading-none tracking-[-0.03em]">
        {value}
      </div>
      <div className="label mt-2">{label}</div>
    </div>
  );
}

export function Summary({ g }: { g: Game }) {
  const { state } = g;
  const { career } = state;
  const out = state.phase === "over";
  const tier = tierFor(state.rating);
  const startRating = state.curve[0];
  const delta = state.rating - startRating;
  const acc = lifetimeAccuracy(career);

  return (
    <div className="px-5 pb-8 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <div className={`label ${out ? "!text-down" : "!text-brain"}`}>
          {out ? "Out of lives" : "Session complete"}
        </div>
        <h2 className="mt-2.5 text-[30px] font-semibold leading-[1.02] tracking-[-0.035em]">
          {out
            ? "The deck got you."
            : state.correct >= 7
              ? "You read the field."
              : "You finished the deck."}
        </h2>
        <p className="mt-2.5 text-[14px] leading-snug text-ink-2">
          {state.correct} of {state.answered} calls right
          {state.saves > 0 && (
            <>
              {" "}
              · <span className="text-brain">{state.saves}</span> saved by a hedge
            </>
          )}
          .
        </p>
      </motion.div>

      {/* XP earned is the headline of a session. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 26 }}
        className="mt-5 rounded-2xl bg-brain/10 p-5 shadow-[inset_0_0_0_1px_rgba(124,140,255,0.45)]"
      >
        <div className="flex items-end justify-between">
          <div>
            <div className="num text-[38px] font-semibold leading-none tracking-[-0.04em] text-brain">
              +{state.xp.toLocaleString()}
            </div>
            <div className="label mt-2 !text-brain">XP this session</div>
          </div>
          <div className="text-right">
            <div className="num text-[17px] font-medium leading-none">
              {career.xp.toLocaleString()}
            </div>
            <div className="label mt-2">Career XP</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2.5 border-t border-brain/20 pt-3.5">
          <span className="num text-[12px] text-brain">+{state.xp} XP</span>
          <span className="text-ink-3" aria-hidden>
            →
          </span>
          <span
            className={`num text-[14px] font-semibold ${delta >= 0 ? "text-up" : "text-down"}`}
          >
            {delta >= 0 ? "+" : ""}
            {delta} rating
          </span>
          <span className="num ml-auto text-[12px] text-ink-2">
            {startRating} → {state.rating}
          </span>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat value={state.bestStreak} label="Best streak" />
        <Stat value={`${g.neurons}`} label="Neurons" />
        <Stat
          value={
            <span>
              {career.discovered.length}
              <span className="text-ink-3">/{TOTAL_FACTS}</span>
            </span>
          }
          label="Facts found"
        />
      </div>

      <div className="mt-4 rounded-2xl bg-panel p-4 ring-hair">
        <RatingCurve curve={state.curve} />
      </div>

      {/* The flywheel, stated in the numbers the player just produced. */}
      <div className="mt-5 rounded-2xl bg-panel p-4 ring-hair">
        <div className="label mb-2.5 !text-brain">What just happened</div>
        <p className="text-[14px] leading-[1.45]">
          {state.correct} right calls paid{" "}
          <span className="num text-brain">{state.xp}</span> XP, which took your
          rating <span className="num">{startRating}</span> →{" "}
          <span className="num">{state.rating}</span> and puts you in{" "}
          <span className="text-gold">{tier.name}</span> — worth{" "}
          <span className="num text-brain">{g.neurons}</span> neurons. The Facts
          you found are in your library for good; next session you choose which
          of them you carry.
        </p>
      </div>

      {/* Career. */}
      <div className="mt-4 rounded-2xl bg-panel p-4 ring-hair">
        <div className="mb-3 flex items-center justify-between">
          <span className="label">Career</span>
          <span className="num text-[11px] text-ink-3">
            {career.sessions} session{career.sessions === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="num text-[15px] font-medium">
              {career.xp.toLocaleString()}
            </div>
            <div className="label mt-1.5">Total XP</div>
          </div>
          <div>
            <div className="num text-[15px] font-medium">
              {acc === null ? "—" : `${Math.round(acc * 100)}%`}
            </div>
            <div className="label mt-1.5">Accuracy</div>
          </div>
          <div>
            <div className="num text-[15px] font-medium">{career.peak}</div>
            <div className="label mt-1.5">Peak rating</div>
          </div>
        </div>
      </div>

      {state.brain.length > 0 && (
        <div className="mt-6">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-brain">
              <BrainIcon className="size-4" />
            </span>
            <span className="label">Carried out</span>
          </div>
          <div className="space-y-2.5">
            {state.brain.map((f) => (
              <FactTile key={f.id} fact={f} />
            ))}
          </div>
        </div>
      )}

      {state.released.length > 0 && (
        <div className="mt-6">
          <div className="label mb-2.5">Dropped this run</div>
          <div className="flex flex-wrap gap-1.5">
            {state.released.map((f) => (
              <span
                key={f.id}
                className="rounded-full bg-panel px-2.5 py-1.5 text-[11px] text-ink-3 ring-hair"
              >
                {f.title}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] leading-snug text-ink-3">
            Still in your library — you just couldn&apos;t carry them. A bigger
            Brain is how you stop paying this tax.
          </p>
        </div>
      )}

      <div className="mt-7 space-y-2.5">
        <button
          onClick={g.newSession}
          className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-canvas active:scale-[0.985]"
        >
          Next session
        </button>
        <button
          onClick={() => g.setView("ladder")}
          className="w-full rounded-2xl border border-line-2 py-3.5 text-[14px] text-ink-2"
        >
          See where you rank
        </button>
        <button
          onClick={g.resetCareer}
          className="w-full py-2 text-[12px] text-ink-3 underline decoration-line-2 underline-offset-4"
        >
          Reset career
        </button>
      </div>
    </div>
  );
}
