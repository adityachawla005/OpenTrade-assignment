"use client";

import { motion } from "framer-motion";
import type { Fact } from "@/lib/types";

/* --------------------------------------------------------------------------
   Fact edge icons.

   Read and hedge are both drawn in the Brain colour on purpose — they are the
   same currency. What separates them is form and word: an outlined lens for a
   read, a filled shield for a hedge, and the label spelled out beside it. Hue
   never carries the distinction alone.
   -------------------------------------------------------------------------- */

export function ReadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-3.5 ${className}`} aria-hidden>
      <path
        d="M8 2.5 13.5 8 8 13.5 2.5 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HedgeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-3.5 ${className}`} aria-hidden>
      <path
        d="M8 1.8 13.4 4v4.1c0 3-2.2 5.1-5.4 6.1-3.2-1-5.4-3.1-5.4-6.1V4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function EdgeBadge({ fact }: { fact: Fact }) {
  const read = fact.edge === "read";
  return (
    <span className="inline-flex items-center gap-1.5 text-brain">
      {read ? <ReadIcon /> : <HedgeIcon />}
      <span className="label !text-brain">{read ? "Read" : "Hedge"}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`lit ring-hair relative rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

/** A Fact, as it appears in the Brain, in a swap, or as a reward. */
export function FactTile({
  fact,
  tone = "held",
  footnote,
  onClick,
  disabled,
}: {
  fact: Fact;
  tone?: "held" | "incoming" | "dim";
  footnote?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const hedge = fact.edge === "hedge";
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      onClick={onClick}
      disabled={disabled}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={[
        "relative w-full overflow-hidden rounded-2xl px-4 py-3.5 text-left",
        "ring-hair",
        hedge ? "bg-panel-2" : "bg-panel",
        tone === "incoming"
          ? "shadow-[0_0_0_1px_rgba(124,140,255,0.55),0_10px_40px_-12px_rgba(124,140,255,0.5)]"
          : "",
        tone === "dim" ? "opacity-45" : "",
        onClick ? "cursor-pointer transition-colors hover:bg-panel-2" : "",
      ].join(" ")}
    >
      {/* The hedge rail — a second, non-colour cue that this one is spendable. */}
      {hedge && (
        <span className="absolute inset-y-3 left-0 w-[2px] rounded-r bg-brain/70" />
      )}

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EdgeBadge fact={fact} />
          <span className="label">{fact.sector}</span>
        </div>
        <span className="label">{fact.rarity}</span>
      </div>

      <div className="text-[15px] font-medium leading-tight tracking-[-0.01em]">
        {fact.title}
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{fact.detail}</p>

      {footnote && <div className="mt-2.5">{footnote}</div>}
    </Tag>
  );
}

/**
 * The neuron budget, as neurons.
 *
 * A number alone ("6/8") doesn't communicate a budget the way a filled row of
 * neurons does — how much is left reads instantly, and an incoming Fact can be
 * previewed into the next one before it's committed.
 */
export function NeuronMeter({
  used,
  total,
  incoming = 0,
  className = "",
}: {
  used: number;
  total: number;
  incoming?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-[3px] ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        const filled = i < used;
        const preview = !filled && i < used + incoming;
        return (
          <motion.span
            key={i}
            initial={false}
            animate={{ opacity: filled ? 1 : preview ? 0.75 : 0.28 }}
            className={[
              "h-3.5 w-[7px] rounded-[3px]",
              filled ? "bg-brain" : preview ? "bg-brain/60" : "bg-line-2",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

/** Neurons free right now, as a phrase. */
export function neuronsLeftLabel(used: number, total: number) {
  const left = Math.max(0, total - used);
  return `${left} neuron${left === 1 ? "" : "s"} free`;
}

/* -------------------------------------------------------------------------- */

/**
 * The field's call, as a diverging split. Down and up are opposite poles with a
 * neutral gap between them; the glyphs and the percentages do the real work, so
 * this reads correctly with no colour at all.
 */
export function ConsensusBar({ consensus }: { consensus: number }) {
  const up = Math.round(consensus * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">The field</span>
        <span className="num text-[11px] text-ink-2">
          <span className="text-down">▼ {100 - up}%</span>
          <span className="mx-1.5 text-ink-3">·</span>
          <span className="text-up">▲ {up}%</span>
        </span>
      </div>
      <div className="flex h-1.5 w-full gap-[2px]">
        <div
          className="rounded-l-full rounded-r-[2px] bg-down/85"
          style={{ width: `${100 - up}%` }}
        />
        <div
          className="rounded-l-[2px] rounded-r-full bg-up/85"
          style={{ width: `${up}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Lives({ lives, max }: { lives: number; max: number }) {
  const critical = lives === 1;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => (
          <motion.span
            key={i}
            animate={
              i < lives
                ? { scale: 1, opacity: 1 }
                : { scale: 0.75, opacity: 0.28 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className={[
              "block h-3.5 w-[7px] rounded-full",
              i < lives
                ? critical
                  ? "bg-down"
                  : "bg-ink"
                : "bg-line-2",
            ].join(" ")}
          />
        ))}
      </div>
      {critical && <span className="label !text-down">Last life</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Meter({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <motion.div
        className="h-full rounded-full bg-brain"
        initial={false}
        animate={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }}
        transition={{ type: "spring", stiffness: 160, damping: 26 }}
      />
    </div>
  );
}

export function DirGlyph({ dir }: { dir: "UP" | "DOWN" }) {
  return <span aria-hidden>{dir === "UP" ? "▲" : "▼"}</span>;
}
