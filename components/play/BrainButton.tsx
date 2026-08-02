"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BrainIcon } from "@/components/BrainIcon";
import type { Card as CardT, Fact } from "@/lib/types";

/**
 * The Brain, as a pop in the bottom-right corner.
 *
 * It stays out of the way until it matters: it lights up when a Fact you're
 * holding applies to the card in front of you, and pops with a name chip the
 * moment a new Fact lands. Everything else is one tap away.
 */
export function BrainButton({
  brain,
  used,
  neurons,
  card,
  onOpen,
}: {
  brain: Fact[];
  used: number;
  neurons: number;
  card: CardT | null;
  onOpen: () => void;
}) {
  const live = card ? brain.find((f) => f.sector === card.sector) ?? null : null;
  const [flash, setFlash] = useState<Fact | null>(null);
  const prev = useRef<string>("");

  // Pop the newest Fact's name when the Brain's contents change.
  useEffect(() => {
    const key = brain.map((f) => f.id).join(",");
    const added = brain.find((f) => !prev.current.split(",").includes(f.id));
    if (prev.current && added) {
      setFlash(added);
      const t = setTimeout(() => setFlash(null), 2200);
      prev.current = key;
      return () => clearTimeout(t);
    }
    prev.current = key;
  }, [brain]);

  return (
    <div className="relative shrink-0">
      {/* The name of what just landed, popped above the corner. */}
      <AnimatePresence>
        {flash && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 max-w-[210px] truncate rounded-full bg-brain/15 px-3 py-1.5 text-[11.5px] text-brain shadow-[inset_0_0_0_1px_rgba(124,140,255,0.45)] backdrop-blur"
          >
            + {flash.title}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onOpen}
        aria-label={`Your Brain — ${used} of ${neurons} neurons used`}
        whileTap={{ scale: 0.92 }}
        animate={
          flash
            ? { scale: [1, 1.18, 1] }
            : live
              ? { scale: [1, 1.05, 1] }
              : { scale: 1 }
        }
        transition={
          flash
            ? { duration: 0.45, times: [0, 0.4, 1] }
            : live
              ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
        }
        className={[
          "relative flex size-[56px] items-center justify-center rounded-2xl",
          live
            ? "bg-brain/15 text-brain shadow-[inset_0_0_0_1.5px_rgba(124,140,255,0.8),0_0_34px_-4px_rgba(124,140,255,0.85)]"
            : "lit ring-hair text-ink-2 shadow-[0_10px_30px_-12px_#000]",
        ].join(" ")}
      >
        <BrainIcon className="size-[26px]" />

        {/* Neuron counter. The number is the point — it's the resource. */}
        <span
          className={[
            "num absolute -bottom-0.5 -right-0.5 rounded-full px-1.5 py-[3px] text-[9.5px] font-medium leading-none ring-2 ring-canvas",
            used >= neurons ? "bg-brain text-canvas" : "bg-panel-2 text-ink-2",
          ].join(" ")}
        >
          {used}/{neurons}
        </span>

        {/* A live Fact gets a halo, so the payoff is visible before you call. */}
        {live && (
          <motion.span
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.45 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-2xl ring-1 ring-brain"
          />
        )}
      </motion.button>
    </div>
  );
}
