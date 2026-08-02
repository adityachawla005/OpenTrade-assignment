"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Game } from "@/lib/game";
import { opponentFor } from "@/lib/opponents";
import { HUD } from "./HUD";
import { BrainButton } from "./BrainButton";
import { BrainSheet } from "./BrainSheet";
import { CallButtons, PredictionCard } from "./PredictionCard";
import { KeepSheet } from "./KeepSheet";
import { PromotionOverlay } from "./PromotionOverlay";
import { RevealSheet } from "./RevealSheet";
import { SwapSheet } from "./SwapSheet";
import { Intro } from "./Intro";
import { Loadout } from "./Loadout";
import { Summary } from "./Summary";

export function PlayView({ g }: { g: Game }) {
  const [brainOpen, setBrainOpen] = useState(false);
  const { state, card } = g;

  if (state.phase === "intro") return <Intro g={g} />;
  if (state.phase === "loadout") return <Loadout g={g} />;
  if (state.phase === "summary" || state.phase === "over") return <Summary g={g} />;
  if (!card) return null;

  const locked = state.phase !== "predict";

  return (
    <>
      <div className="flex min-h-full flex-col">
        <HUD state={state} maxLives={g.maxLives} careerXp={g.careerXp} />

        <div className="flex flex-1 items-center py-4">
          <PredictionCard
            key={card.id}
            card={card}
            playable={g.playable}
            appliedReads={state.appliedReads}
            armedHedge={state.armedHedge}
            onApply={g.apply}
            opponent={opponentFor(card, state.rating)}
            onPick={g.pick}
            locked={locked}
            pick={state.result?.pick ?? null}
          />
        </div>

        {/* The two calls, with the Brain anchored in the bottom-right corner. */}
        <div className="flex h-[56px] items-stretch gap-3 px-5 pb-0 pt-1">
          <CallButtons onPick={g.pick} disabled={locked} />
          <BrainButton
            brain={state.brain}
            used={g.used}
            neurons={g.neurons}
            card={card}
            onOpen={() => setBrainOpen(true)}
          />
        </div>
        <div className="pb-4" />
      </div>

      <AnimatePresence>
        {brainOpen && (
          <BrainSheet
            key="brain"
            brain={state.brain}
            neurons={g.neurons}
            card={card}
            fromIndex={state.index}
            onClose={() => setBrainOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Overlays live at the frame level so they can cover the tab bar and sit
 * against the device edges rather than the scrolling content.
 */
export function PlayOverlays({ g }: { g: Game }) {
  const { state } = g;
  return (
    <AnimatePresence>
      {state.phase === "reveal" && state.result && (
        <RevealSheet key="reveal" result={state.result} onContinue={g.advance} />
      )}

      {state.phase === "promotion" && state.promotion && (
        <PromotionOverlay
          key="promo"
          from={state.promotion.from}
          to={state.promotion.to}
          onContinue={g.advance}
        />
      )}

      {state.phase === "keep" && state.pending && (
        <KeepSheet
          key="keep"
          pending={state.pending}
          brain={state.brain}
          neurons={g.neurons}
          fromIndex={state.index + 1}
          onKeep={g.keep}
          onSkip={g.skip}
        />
      )}

      {state.phase === "swap" && state.pending && (
        <SwapSheet
          key="swap"
          pending={state.pending}
          brain={state.brain}
          neurons={g.neurons}
          fromIndex={state.index + 1}
          onSwap={g.swap}
          onRelease={g.release}
        />
      )}
    </AnimatePresence>
  );
}
