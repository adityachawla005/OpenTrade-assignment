"use client";

/**
 * The signature element: a framing verdict as a head-to-head.
 *
 * Two poles push outward from a centre spine, length proportional to how often
 * each got backed. The winning side is ILLUMINATED in signal amber; the losing
 * side recedes to slate. That reads as a decision — a needle settling — rather
 * than as two bars on a chart.
 *
 * Colour never carries the verdict alone. The winning side is named in words
 * directly above this component, each side is labelled in place, the winner's
 * label is set considerably heavier, and its bar is longer. A reader who cannot
 * distinguish amber from slate loses nothing.
 *
 * Motion: both sides grow outward from the spine together, then the winner's
 * value counts up. Under `prefers-reduced-motion` everything renders at its
 * final state immediately.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { MetricResult } from "@/lib/aggregate";
import AnimatedNumber from "./AnimatedNumber";

export default function HeadToHead({
  metric,
  delay = 0,
  compact = false,
  showCounts = false,
}: {
  metric: MetricResult;
  delay?: number;
  compact?: boolean;
  /** Raw "x of y" counts. Off by default — the percentage is the thing a
   *  reader acts on, so the fractions live in the details drawer. */
  showCounts?: boolean;
}) {
  const reduced = useReducedMotion();
  const { left, right, winner } = metric;

  // Both halves share one scale so the two sides are directly comparable.
  const scaleMax = Math.max(0.06, left.rate, right.rate) * 1.08;
  const pct = (r: number) => Math.min(100, (r / scaleMax) * 100);

  const barH = compact ? 14 : 26;
  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 120, damping: 22, delay };

  const sides = [
    { arm: left, side: "left" as const },
    { arm: right, side: "right" as const },
  ];

  return (
    <div>
      {/* Labels sit above their own half, so each side is named in place. */}
      {!compact && (
        <div className="mb-2 flex items-end justify-between gap-4">
          {sides.map(({ arm, side }) => {
            const isWinner = winner === arm.id;
            return (
              <div
                key={arm.id}
                className={side === "right" ? "text-right" : "text-left"}
              >
                <div
                  className="text-[12.5px] leading-tight"
                  style={{
                    color: isWinner ? "var(--accent)" : "var(--text-3)",
                    fontWeight: isWinner ? 700 : 500,
                  }}
                >
                  {arm.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* The instrument itself. */}
      <div className="relative flex items-stretch" style={{ height: barH }}>
        {sides.map(({ arm, side }) => {
          const isWinner = winner === arm.id;
          const dim = winner !== null && !isWinner;
          const width = pct(arm.rate);
          return (
            <div
              key={arm.id}
              className="relative flex-1"
              style={{
                display: "flex",
                justifyContent: side === "left" ? "flex-end" : "flex-start",
              }}
            >
              <motion.div
                className={
                  side === "left"
                    ? "rounded-l-[2px] h-full"
                    : "rounded-r-[2px] h-full"
                }
                style={{
                  background: isWinner ? "var(--accent)" : "var(--line-strong)",
                  opacity: dim ? 0.55 : 1,
                  // Flat fill: in a near-monochrome system the accent alone
                  // is the emphasis. A glow would read as decoration.
                  boxShadow: "none",
                }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={spring}
              />
            </div>
          );
        })}

        {/* Centre spine — the thing both sides push against. */}
        <div
          aria-hidden
          className="absolute inset-y-[-4px] left-1/2 w-px -translate-x-1/2"
          style={{ background: "var(--line-strong)" }}
        />
      </div>

      {/* Values, in mono, hugging the spine. */}
      <div className="mt-2 flex items-start justify-between gap-4">
        {sides.map(({ arm, side }) => {
          const isWinner = winner === arm.id;
          return (
            <div
              key={arm.id}
              className={side === "right" ? "text-right" : "text-left"}
            >
              <div
                className="num text-[15px] leading-none"
                style={{
                  color: isWinner ? "var(--accent)" : "var(--text-3)",
                  fontWeight: isWinner ? 600 : 500,
                }}
              >
                <AnimatedNumber
                  value={arm.rate * 100}
                  format={(n) => `${n.toFixed(1)}%`}
                  delay={delay}
                />
              </div>
              {compact && (
                <div className="mt-1 text-[10.5px] t3">{arm.label}</div>
              )}
              {!compact && showCounts && (
                <div className="num mt-1.5 text-[10.5px] t3">
                  {arm.wins.toLocaleString()} of {arm.n.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
