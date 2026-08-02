"use client";

import { tierFor, tierIndexFor } from "@/lib/elo";
import type { Game } from "@/lib/game";
import { TOTAL_FACTS } from "@/lib/profile";
import { BrainIcon } from "@/components/BrainIcon";
import { FINISH, TierTrack } from "./TierTrack";

export function RewardsView({ g }: { g: Game }) {
  const { state } = g;
  const peak = Math.max(state.peak, state.career.peak);
  const here = tierIndexFor(peak);
  const tier = tierFor(state.rating);

  return (
    <div className="pb-8 pt-6">
      <div className="px-5">
        <div className="label !text-gold">Rewards</div>
        <h2 className="mt-2.5 text-[26px] font-semibold leading-none tracking-[-0.035em]">
          Every tier pays twice
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-snug text-ink-2">
          Once in status, once in headroom. The badge is the part you show
          people; the extra neurons are the part that changes how the game
          plays.
        </p>

        {/* Current standing. */}
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-panel p-4 ring-hair">
          <div
            className="num flex size-14 shrink-0 items-center justify-center rounded-2xl text-[15px] font-semibold"
            style={FINISH[tier.key].style}
          >
            <span
              className={
                tier.key === "rookie" || tier.key === "analyst"
                  ? "text-ink"
                  : "text-white"
              }
            >
              {tier.mark}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="label">Currently</div>
            <div className="mt-1 text-[17px] font-medium tracking-[-0.02em]">
              {tier.name}
            </div>
            <div className="num mt-0.5 text-[12px] text-ink-2">
              {state.rating} rating · {FINISH[tier.key].name} finish
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-brain">
            <BrainIcon className="size-5" />
            <span className="num text-[12px]">{g.neurons} neurons</span>
          </div>
        </div>
      </div>

      {/* The track. */}
      <div className="mt-7 px-5">
        <div className="label mb-3">The reward track</div>
      </div>
      <div className="px-5">
        <TierTrack rating={state.rating} peak={peak} />
      </div>

      <div className="px-5">
        {/* The library — the reward that carries between games. */}
        <div className="mt-7 rounded-2xl bg-panel p-4 ring-hair">
          <div className="flex items-baseline justify-between">
            <span className="label !text-brain">Your library</span>
            <span className="num text-[11px] text-ink-2">
              {state.career.discovered.length}/{TOTAL_FACTS}
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: TOTAL_FACTS }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < state.career.discovered.length ? "bg-brain" : "bg-line"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-ink-2">
            Facts are discovered once and kept for good, across every session,
            and take one neuron each to carry. Rank doesn&apos;t decide what you
            know — it decides how much of it fits in your head at once.
          </p>
        </div>

        {/* Arena — the reward that is a whole other mode. */}
        <div
          className={`mt-4 rounded-[22px] p-5 ${
            here >= 3
              ? "bg-gold/10 shadow-[inset_0_0_0_1.5px_rgba(242,181,68,0.5)]"
              : "bg-panel ring-hair"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`label ${here >= 3 ? "!text-gold" : ""}`}>Arena</span>
            <span className="num text-[11px] text-ink-3">
              {here >= 3 ? "Open" : "Portfolio Manager"}
            </span>
          </div>
          <h3 className="mt-2.5 text-[19px] font-semibold tracking-[-0.025em]">
            Same deck. One opponent. No hints.
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-ink-2">
            Five cards, both players see identical scenarios, and the Brain you
            walked in with is the only edge you get. Ranked, seasonal, and the
            only place the leaderboard is public.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["5 cards", "Head-to-head", "Ranked", "Seasonal"].map((c) => (
              <span
                key={c}
                className="rounded-full bg-canvas/50 px-2.5 py-1.5 text-[11px] text-ink-2 ring-hair"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] leading-snug text-ink-3">
          Rewards shown are illustrative. Fictional data throughout — nothing
          here is investment advice.
        </p>
      </div>
    </div>
  );
}
