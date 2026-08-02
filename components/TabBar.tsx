"use client";

import { motion } from "framer-motion";
import type { View } from "@/lib/game";

const TABS: { key: View; label: string; glyph: string }[] = [
  { key: "play", label: "Play", glyph: "◆" },
  { key: "ladder", label: "Ladder", glyph: "▤" },
  { key: "rewards", label: "Rewards", glyph: "✦" },
];

export function TabBar({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <nav className="relative z-30 flex shrink-0 border-t border-line bg-canvas/90 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {TABS.map((t) => {
        const active = view === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-panel"
              />
            )}
            <span
              className={`relative text-[13px] leading-none ${
                active ? "text-brain" : "text-ink-3"
              }`}
              aria-hidden
            >
              {t.glyph}
            </span>
            <span
              className={`label relative ${active ? "!text-ink" : ""}`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
