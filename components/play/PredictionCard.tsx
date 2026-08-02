"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import type { Card as CardT, Direction, Fact } from "@/lib/types";
import type { Opponent } from "@/lib/opponents";
import { ConsensusBar, HedgeIcon, ReadIcon } from "@/components/ui";

const THROW = 110;

/**
 * A Fact you're holding that matches this card.
 *
 * The game points at it — a glow and a label — but applying it is a tap the
 * player has to make. Reads open a line of analysis and stay yours; hedges get
 * armed for this call and are only spent if you arm them.
 */
function PlayableFact({
  fact,
  active,
  onApply,
  locked,
}: {
  fact: Fact;
  active: boolean;
  onApply: () => void;
  locked: boolean;
}) {
  const read = fact.edge === "read";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={[
        "overflow-hidden rounded-2xl",
        active
          ? "bg-brain/12 shadow-[inset_0_0_0_1px_rgba(124,140,255,0.55)]"
          : "bg-panel-2 ring-hair",
      ].join(" ")}
    >
      <button
        onClick={onApply}
        disabled={locked || (read && active)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left disabled:cursor-default"
      >
        {/* The nudge: a soft pulse while it's playable and unplayed. */}
        <span className="relative shrink-0 text-brain">
          {!active && !locked && (
            <motion.span
              animate={{ opacity: [0.15, 0.5, 0.15], scale: [1, 1.6, 1] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-brain blur-[6px]"
            />
          )}
          <span className="relative">{read ? <ReadIcon /> : <HedgeIcon />}</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight">
            {fact.title}
          </span>
          <span className="label mt-1 block">
            {read
              ? active
                ? "Applied"
                : "Read · tap to apply"
              : active
                ? "Armed · tap to disarm"
                : "Hedge · tap to arm"}
          </span>
        </span>

        <span
          className={[
            "num shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-medium",
            active ? "bg-brain text-canvas" : "bg-brain/15 text-brain",
          ].join(" ")}
        >
          {active ? (read ? "OPEN" : "ARMED") : read ? "APPLY" : "ARM"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <p className="border-t border-brain/20 px-3.5 py-3 text-[13.5px] leading-snug text-ink">
              {read
                ? fact.hint
                : "Absorbs a miss here, or becomes a life if you're right. Only spent when it does one of the two."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PredictionCard({
  card,
  playable,
  appliedReads,
  armedHedge,
  onApply,
  opponent,
  onPick,
  locked,
  pick,
}: {
  card: CardT;
  playable: Fact[];
  appliedReads: string[];
  armedHedge: string | null;
  onApply: (id: string) => void;
  opponent: Opponent;
  onPick: (d: Direction) => void;
  locked: boolean;
  pick: Direction | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const upGlow = useTransform(x, [20, THROW], [0, 1]);
  const downGlow = useTransform(x, [-THROW, -20], [1, 0]);

  return (
    <div className="relative px-5">
      <motion.article
        drag={locked ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        style={{ x, rotate }}
        onDragEnd={(_, info) => {
          if (locked) return;
          if (info.offset.x > THROW || info.velocity.x > 700) onPick("UP");
          else if (info.offset.x < -THROW || info.velocity.x < -700) onPick("DOWN");
        }}
        initial={{ y: 26, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="lit grain ring-hair relative touch-pan-y overflow-hidden rounded-[26px] p-5 shadow-[0_30px_70px_-40px_rgba(0,0,0,1)]"
      >
        {/* Drag affordance — the call you're about to make, before you commit. */}
        <motion.div
          style={{ opacity: upGlow }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-up/10"
        >
          <span className="num rounded-xl border-2 border-up px-4 py-2 text-[22px] font-semibold text-up">
            ▲ UP
          </span>
        </motion.div>
        <motion.div
          style={{ opacity: downGlow }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-down/10"
        >
          <span className="num rounded-xl border-2 border-down px-4 py-2 text-[22px] font-semibold text-down">
            ▼ DOWN
          </span>
        </motion.div>

        {locked && pick && (
          <motion.div
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="pointer-events-none absolute right-4 top-4 z-20"
          >
            <span
              className={[
                "num rounded-lg border-2 px-2.5 py-1 text-[13px] font-semibold",
                pick === "UP" ? "border-up text-up" : "border-down text-down",
              ].join(" ")}
            >
              {pick === "UP" ? "▲ UP" : "▼ DOWN"}
            </span>
          </motion.div>
        )}

        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="num text-[24px] font-semibold leading-none tracking-[-0.03em]">
              {card.ticker}
            </div>
            <div className="mt-1.5 text-[13px] text-ink-2">{card.company}</div>
          </div>
          <span className="label rounded-full bg-panel-2 px-2.5 py-1.5 ring-hair">
            {card.sector}
          </span>
        </header>

        <p className="mt-4 text-[16.5px] font-medium leading-[1.4] tracking-[-0.012em]">
          {card.setup}
        </p>

        <ul className="mt-3.5 space-y-1.5">
          {card.lines.map((l) => (
            <li key={l} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-3" />
              {l}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-line pt-4">
          <ConsensusBar consensus={card.consensus} />
        </div>

        {/* What's playable here. Shown, never auto-played. */}
        {playable.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="label !text-brain">
              From your Brain · {card.sector}
            </div>
            {playable.map((f) => (
              <PlayableFact
                key={f.id}
                fact={f}
                active={
                  f.edge === "read"
                    ? appliedReads.includes(f.id)
                    : armedHedge === f.id
                }
                onApply={() => onApply(f.id)}
                locked={locked}
              />
            ))}
          </div>
        )}
      </motion.article>

      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="label">Matched</span>
        <span className="num text-[11px] text-ink-2">
          {opponent.name} · {opponent.rating}
        </span>
      </div>
    </div>
  );
}

/**
 * The two calls. Returned as a fragment so the bottom row can sit them beside
 * the Brain in the corner without nesting another flex container.
 */
export function CallButtons({
  onPick,
  disabled,
}: {
  onPick: (d: Direction) => void;
  disabled: boolean;
}) {
  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={disabled}
        onClick={() => onPick("DOWN")}
        className="num flex flex-1 items-center justify-center gap-2 rounded-2xl bg-down/12 text-[15px] font-semibold text-down shadow-[inset_0_0_0_1px_rgba(255,95,86,0.5)] disabled:opacity-40"
      >
        <span aria-hidden>▼</span> DOWN
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={disabled}
        onClick={() => onPick("UP")}
        className="num flex flex-1 items-center justify-center gap-2 rounded-2xl bg-up/12 text-[15px] font-semibold text-up shadow-[inset_0_0_0_1px_rgba(46,230,168,0.5)] disabled:opacity-40"
      >
        <span aria-hidden>▲</span> UP
      </motion.button>
    </>
  );
}
