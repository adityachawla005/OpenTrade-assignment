"use client";

import { motion } from "framer-motion";
import { remainingBySector, upcomingSectors } from "@/lib/deck";
import { neuronCost, neuronsUsed } from "@/lib/elo";
import type { Game } from "@/lib/game";
import { TOTAL_FACTS, factsFor } from "@/lib/profile";
import { BrainIcon } from "@/components/BrainIcon";
import { FactTile, NeuronMeter } from "@/components/ui";

/**
 * Between sessions — the loadout.
 *
 * Everything you've ever discovered stays in the library forever. Neurons
 * decide how much of it you can carry into a run, so the tier reward stays
 * meaningful without the game ever taking knowledge away from you.
 */
export function Loadout({ g }: { g: Game }) {
  const { state } = g;
  const library = factsFor(state.career.discovered);
  const equipped = new Set(state.brain.map((f) => f.id));
  const deck = remainingBySector(0);
  const used = neuronsUsed(state.brain);

  return (
    <div className="px-5 pb-8 pt-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brain/12 text-brain shadow-[inset_0_0_0_1px_rgba(124,140,255,0.45)]">
          <BrainIcon className="size-6" />
        </span>
        <div>
          <h2 className="text-[22px] font-semibold leading-none tracking-[-0.03em]">
            Load your Brain
          </h2>
          <p className="num mt-1.5 text-[11.5px] text-ink-3">
            Session {state.career.sessions + 1} · {library.length}/{TOTAL_FACTS}{" "}
            Facts discovered
          </p>
        </div>
      </div>

      <p className="mt-3.5 text-[13.5px] leading-snug text-ink-2">
        Everything you&apos;ve found is yours. Your rank decides how much of it
        you can <span className="text-ink">carry</span> —{" "}
        <span className="num text-brain">{g.neurons}</span> neurons, one Fact
        each.
      </p>

      {/* The budget. */}
      <div className="mt-6 rounded-2xl bg-panel p-4 ring-hair">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="label !text-brain">Neurons</span>
          <span className="num text-[11.5px]">
            <span className="text-brain">{used}</span>
            <span className="text-ink-3"> / {g.neurons}</span>
          </span>
        </div>
        <NeuronMeter used={used} total={g.neurons} />
      </div>

      {/* Carrying. */}
      <div className="mt-6">
        <div className="label mb-2.5 !text-brain">Carrying</div>
        {state.brain.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-2 px-4 py-7 text-center">
            <span className="label">Empty</span>
            <p className="mt-2 text-[12.5px] text-ink-2">
              Load from the library below, or go in cold.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {state.brain.map((f) => {
              const n = deck[f.sector] ?? 0;
              return (
                <FactTile
                  key={f.id}
                  fact={f}
                  tone="incoming"
                  onClick={() => g.unequip(f.id)}
                  footnote={
                    <span className="num text-[11px] text-ink-3">
                      {n} {f.sector} card{n === 1 ? "" : "s"} in the deck · tap to
                      unload
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* What the deck is made of — the only way to judge a loadout. */}
      <div className="mt-6 rounded-2xl bg-panel p-4 ring-hair">
        <div className="label mb-2.5">Tonight&apos;s deck</div>
        <div className="flex flex-wrap gap-1.5">
          {upcomingSectors(0).map(([sector, n]) => (
            <span
              key={sector}
              className="num rounded-full bg-panel-2 px-2.5 py-1.5 text-[11px] text-ink-2 ring-hair"
            >
              {sector} <span className="text-ink">×{n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* The library. */}
      <div className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="label">Library</span>
          <span className="num text-[11px] text-ink-3">
            {library.length} discovered
          </span>
        </div>
        <div className="space-y-2.5">
          {library.map((f) => {
            const on = equipped.has(f.id);
            const n = deck[f.sector] ?? 0;
            const room = used + neuronCost(f) <= g.neurons;
            return (
              <FactTile
                key={f.id}
                fact={f}
                tone={on || !room ? "dim" : "held"}
                onClick={on || !room ? undefined : () => g.equip(f.id)}
                disabled={on || !room}
                footnote={
                  <span className="num text-[11px] text-ink-3">
                    {on
                      ? "Loaded"
                      : !room
                        ? "No neurons free — unload one first"
                        : `${n} ${f.sector} card${n === 1 ? "" : "s"} in the deck · tap to load`}
                  </span>
                }
              />
            );
          })}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.985 }}
        onClick={g.deal}
        className="mt-7 w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-canvas"
      >
        Deal the deck
      </motion.button>
    </div>
  );
}
