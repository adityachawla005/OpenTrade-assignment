"use client";

import { nextTier, tierFor, tierProgress } from "@/lib/elo";
import type { Game } from "@/lib/game";
import { lobbyFor } from "@/lib/opponents";
import { TOTAL_FACTS, lifetimeAccuracy } from "@/lib/profile";
import { BrainIcon } from "@/components/BrainIcon";
import { Meter } from "@/components/ui";
import { ClimbRail } from "./ClimbRail";
import { RatingCurve } from "./RatingCurve";

const FLYWHEEL = [
  { t: "Play cards", d: "Every call pays XP. Calls the field gets wrong pay about five times what easy ones do." },
  { t: "XP raises your rating", d: "The rating is downstream of XP, scaled by how surprising the win was at your level." },
  { t: "Rating unlocks a tier", d: "And every tier hands you more neurons to carry Facts in." },
  { t: "Play gets deeper", d: "More Facts carried at once means harder cards become readable." },
];

export function LadderView({ g }: { g: Game }) {
  const { state } = g;
  const { career } = state;
  const tier = tierFor(state.rating);
  const next = nextTier(state.rating);
  const lobby = lobbyFor(state.rating);
  const acc = lifetimeAccuracy(career);

  return (
    <div className="px-5 pb-8 pt-6">
      <div className="label !text-brain">Career</div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="num text-[46px] font-semibold leading-none tracking-[-0.045em]">
            {g.careerXp.toLocaleString()}
          </div>
          <div className="label mt-2.5 !text-brain">Total XP</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="num flex size-6 items-center justify-center rounded-md bg-gold/15 text-[10px] font-semibold text-gold">
              {tier.mark}
            </span>
            <span className="text-[14px] font-medium">{tier.name}</span>
          </div>
          <div className="num mt-1.5 text-[13px] text-ink-2">
            {state.rating} rating
          </div>
        </div>
      </div>

      {next && (
        <div className="mt-5">
          <Meter value={tierProgress(state.rating)} />
          <div className="mt-2 flex justify-between">
            <span className="label">{tier.name}</span>
            <span className="num text-[11px] text-brain">
              {next.floor - state.rating} rating to {next.name}
            </span>
          </div>
        </div>
      )}

      {/* The climb. */}
      <div className="mt-7 rounded-2xl bg-panel p-4 pr-3 ring-hair">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="label">The ladder</span>
          <span className="num text-[10.5px] text-ink-3">1000 — 1600</span>
        </div>
        <ClimbRail rating={state.rating} peak={Math.max(career.peak, state.peak)} />
        <p className="mt-1 border-t border-line pt-3 text-[12.5px] leading-snug text-ink-2">
          {tier.blurb}
        </p>
      </div>

      {/* Lifetime. */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-panel p-3.5 ring-hair">
          <div className="num text-[19px] font-semibold leading-none tracking-[-0.03em]">
            {career.sessions}
          </div>
          <div className="label mt-2">Sessions</div>
        </div>
        <div className="rounded-2xl bg-panel p-3.5 ring-hair">
          <div className="num text-[19px] font-semibold leading-none tracking-[-0.03em]">
            {acc === null ? "—" : `${Math.round(acc * 100)}%`}
          </div>
          <div className="label mt-2">Lifetime accuracy</div>
        </div>
        <div className="rounded-2xl bg-panel p-3.5 ring-hair">
          <div className="num text-[19px] font-semibold leading-none tracking-[-0.03em]">
            {career.peak}
          </div>
          <div className="label mt-2">Peak rating</div>
        </div>
        <div className="rounded-2xl bg-panel p-3.5 ring-hair">
          <div className="flex items-center gap-2">
            <span className="text-brain">
              <BrainIcon className="size-4" />
            </span>
            <span className="num text-[19px] font-semibold leading-none tracking-[-0.03em]">
              {career.discovered.length}
              <span className="text-ink-3">/{TOTAL_FACTS}</span>
            </span>
          </div>
          <div className="label mt-2">Facts discovered</div>
        </div>
      </div>

      {state.curve.length > 1 && (
        <div className="mt-5 rounded-2xl bg-panel p-4 ring-hair">
          <RatingCurve curve={state.curve} />
        </div>
      )}

      {/* Level-matched play. */}
      <div className="mt-5 rounded-2xl bg-panel p-4 ring-hair">
        <div className="flex items-baseline justify-between">
          <span className="label">Your bracket</span>
          <span className="num text-[11px] text-ink-3">
            {state.rating - 32}–{state.rating + 32}
          </span>
        </div>
        <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
          Every card is scored against players inside your band, so a right call
          is worth what it&apos;s worth against people who can actually beat you.
        </p>
        <div className="mt-3.5 space-y-2 border-t border-line pt-3.5">
          {lobby.map((o) => (
            <div key={o.name} className="flex items-center gap-3">
              <span className="num flex size-6 items-center justify-center rounded-md bg-line text-[9px] text-ink-2">
                {o.name.slice(0, 1)}
              </span>
              <span className="flex-1 text-[13px] text-ink-2">{o.name}</span>
              <span className="num text-[12px]">{o.rating}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-lg bg-brain/10 px-2 py-1.5">
            <span className="num flex size-6 items-center justify-center rounded-md bg-brain/25 text-[9px] text-brain">
              Y
            </span>
            <span className="flex-1 text-[13px] font-medium">You</span>
            <span className="num text-[12px] text-brain">{state.rating}</span>
          </div>
        </div>
      </div>

      {/* Why the three systems are one system. */}
      <div className="mt-7">
        <div className="label mb-3 !text-brain">The loop</div>
        <div className="relative rounded-2xl bg-panel p-4 ring-hair">
          <div className="absolute bottom-8 left-[27px] top-8 w-px bg-line-2" />
          <div className="space-y-4">
            {FLYWHEEL.map((s, i) => (
              <div key={s.t} className="relative flex gap-3.5">
                <span className="num relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-brain/15 text-[10px] text-brain">
                  {i + 1}
                </span>
                <div>
                  <div className="text-[14px] font-medium leading-tight tracking-[-0.01em]">
                    {s.t}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
            <span className="text-[13px] text-brain" aria-hidden>
              ↻
            </span>
            <span className="text-[12.5px] text-ink-2">
              …and deeper play is how you earn the next tier.
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          if (state.phase === "summary" || state.phase === "over") g.newSession();
          else g.setView("play");
        }}
        className="mt-7 w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-canvas active:scale-[0.985]"
      >
        {state.phase === "summary" || state.phase === "over"
          ? "Next session"
          : "Back to the deck"}
      </button>
    </div>
  );
}
