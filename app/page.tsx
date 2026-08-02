"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TIERS } from "@/lib/elo";
import { useGame } from "@/lib/game";
import { TabBar } from "@/components/TabBar";
import { LadderView } from "@/components/ladder/LadderView";
import { PlayOverlays, PlayView } from "@/components/play/PlayView";
import { RewardsView } from "@/components/rewards/RewardsView";

const SYSTEMS = [
  {
    n: "The Investor Brain",
    d: `Right calls pay in Facts, and every one is a save-or-skip call. You start with ${TIERS[0].neurons} neurons, one Fact each, so hoarding junk costs you the good stuff.`,
  },
  {
    n: "The Elo ladder",
    d: "Every card is an opponent whose rating is the share of the field that got it wrong. Beating consensus moves you; agreeing with it barely does.",
  },
  {
    n: "Tiered rewards",
    d: "Rank buys a badge, a finish, the Arena — and more neurons, which is the reward that changes the game itself.",
  },
];

export default function Page() {
  const g = useGame();
  const { view, phase } = g.state;
  const chromeless = phase === "intro";

  return (
    <div className="min-h-dvh w-full bg-canvas">
      <div className="mx-auto flex min-h-dvh max-w-[1180px] items-center justify-center gap-16 lg:px-10">
        {/* Desktop only: the frame around the demo, for whoever is being shown it. */}
        <aside className="hidden w-[320px] shrink-0 py-16 lg:block">
          <div className="label !text-brain">Interactive vision prototype</div>
          <h1 className="mt-3.5 text-[40px] font-semibold leading-[0.95] tracking-[-0.045em]">
            EDGE
          </h1>
          <p className="mt-4 text-[15px] leading-[1.45] text-ink-2">
            A stock-market prediction game where the scarce resource isn&apos;t
            money — it&apos;s{" "}
            <span className="text-ink">what you have room to remember</span>.
          </p>

          <div className="mt-9 space-y-5">
            {SYSTEMS.map((s, i) => (
              <div key={s.n} className="flex gap-3.5">
                <span className="num mt-[3px] text-[11px] text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[14px] font-medium tracking-[-0.012em]">
                    {s.n}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-3">
            Drag a card left or right to call it, or use the buttons. All state is
            in memory — there is no backend. Every company, ticker and price move
            is fictional and illustrative; nothing here is investment advice.
          </p>
        </aside>

        <div className="relative flex h-dvh w-full max-w-[440px] shrink-0 flex-col overflow-hidden bg-canvas lg:h-[860px] lg:rounded-[42px] lg:ring-1 lg:ring-line-2 lg:shadow-[0_60px_140px_-50px_#000]">
          <main className="no-bar relative flex-1 overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="min-h-full"
              >
                {view === "play" && <PlayView g={g} />}
                {view === "ladder" && <LadderView g={g} />}
                {view === "rewards" && <RewardsView g={g} />}
              </motion.div>
            </AnimatePresence>
          </main>

          {!chromeless && <TabBar view={view} onChange={g.setView} />}

          {view === "play" && <PlayOverlays g={g} />}
        </div>
      </div>
    </div>
  );
}
