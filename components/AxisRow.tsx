"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AxisResult, MetricResult } from "@/lib/aggregate";
import type { MsprtConfig } from "@/lib/stats/msprt";
import HeadToHead from "./HeadToHead";
import PValueChart from "./PValueChart";

const fmtP = (p: number) =>
  p >= 0.001 ? p.toFixed(4) : p.toExponential(2).replace("e-", "e−");

interface Verdict {
  icon: string;
  color: string;
  headline: string;
}

function verdictFor(axis: AxisResult): Verdict {
  const { backs } = axis;
  if (backs.outcome === "thin") {
    return {
      icon: "🚫",
      color: "var(--text-3)",
      headline: "Not enough data yet",
    };
  }
  if (backs.outcome === "too-close") {
    return {
      icon: "⏳",
      color: "var(--text-2)",
      headline: "Too close to call",
    };
  }
  const w = backs.winner === backs.left.id ? backs.left : backs.right;
  return {
    icon: "✅",
    color: "var(--accent)",
    headline: `${w.phrase} wins`,
  };
}

/** A collapsible drawer with a consistent header. */
function Drawer({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-[12px] font-medium transition-colors sm:px-7"
        style={{ color: open ? "var(--text-1)" : "var(--text-3)" }}
      >
        <span>{label}</span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="text-[10px]"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MetricProof({
  name,
  metric,
  unit,
  config,
}: {
  name: string;
  metric: MetricResult;
  unit: string;
  config: MsprtConfig;
}) {
  return (
    <div>
      <div className="eyebrow mb-2.5 pt-4">
        {name} · <span className="num">{metric.left.n.toLocaleString()}</span> vs{" "}
        <span className="num">{metric.right.n.toLocaleString()}</span> {unit}
      </div>

      {/* Raw counts live here, not on the default view. */}
      <div className="mb-3.5">
        <HeadToHead metric={metric} delay={0} showCounts />
      </div>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
        <div
          className="rounded-[4px] border p-3.5"
          style={{ background: "var(--raised)" }}
        >
          <div className="eyebrow mb-1.5">mSPRT · always-valid</div>
          <div className="text-[13.5px]">
            <span className="t3">p = </span>
            <span className="num font-semibold">{fmtP(metric.pValue)}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed t3">
            {metric.decidedAt !== null
              ? `Crossed α at observation ${metric.decidedAt.toLocaleString()}.`
              : "No verdict. Safe to keep watching — no peeking penalty."}
          </p>
        </div>

        <div
          className="rounded-[4px] border p-3.5"
          style={{ background: "var(--raised)" }}
        >
          <div className="eyebrow mb-1.5">Naive z-test · peeked</div>
          <div className="text-[13.5px]">
            <span className="t3">p = </span>
            <span className="num font-semibold">{fmtP(metric.naive.pValue)}</span>
            <span className="num ml-2 text-[11px] t3">
              z = {metric.naive.z.toFixed(2)}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed t3">
            {metric.naive.firstCrossedAt !== null ? (
              <>
                Would have fired at{" "}
                {metric.naive.firstCrossedAt.toLocaleString()}
                {metric.naive.flipFlops > 0 &&
                  `, then flipped ${metric.naive.flipFlops} more times`}
                .
              </>
            ) : (
              "Never crossed α."
            )}
          </p>
        </div>
      </div>

      <PValueChart
        curve={metric.curve}
        alpha={config.alpha}
        stoppedAtN={metric.decidedAt}
        naiveFirstCrossedAt={metric.naive.firstCrossedAt}
      />
    </div>
  );
}

export default function AxisRow({
  axis,
  config,
  index,
}: {
  axis: AxisResult;
  config: MsprtConfig;
  index: number;
}) {
  const reduced = useReducedMotion();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const { backs, retention } = axis;

  const verdict = verdictFor(axis);
  const backWinner =
    backs.winner === null
      ? null
      : backs.winner === backs.left.id
        ? backs.left
        : backs.right;
  const retentionWinner =
    retention.winner === null
      ? null
      : retention.winner === retention.left.id
        ? retention.left
        : retention.right;

  // One orchestrated sequence: the whole row enters, then its bars fill.
  const enter = 0.08 + index * 0.1;
  const bars = enter + 0.18;

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: enter, ease: [0.22, 1, 0.36, 1] }}
      className="panel overflow-hidden"
    >
      <div className="px-5 pt-6 sm:px-7 sm:pt-7">
        {/* Question + scale */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{axis.name}</div>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed t3">
              {axis.question}
            </p>
          </div>
          <div className="text-right">
            <div className="num text-[15px] font-semibold leading-none">
              {backs.total.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[10.5px] t3">
              swipes · {axis.cardCount} cards
            </div>
          </div>
        </div>

        {/* Verdict — display type, stated as a conclusion. */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: enter + 0.12 }}
          className="mb-1.5 flex items-start gap-2.5"
        >
          <span aria-hidden className="text-[19px] leading-[1.15]">
            {verdict.icon}
          </span>
          <h2
            className="display text-[24px] sm:text-[27px]"
            style={{ color: verdict.color }}
          >
            {verdict.headline}
          </h2>
        </motion.div>

        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: enter + 0.22 }}
          className="mb-6 max-w-xl text-[13.5px] leading-relaxed t2"
        >
          {backs.outcome === "leader" && backWinner ? (
            <>
              Across{" "}
              <span className="num font-semibold t1">
                {backs.total.toLocaleString()}
              </span>{" "}
              swipes on{" "}
              <span className="num font-semibold t1">{axis.cardCount}</span>{" "}
              cards, {backWinner.description.toLowerCase()} got backed{" "}
              <span className="num font-semibold t1">
                {Math.round((backs.relativeGain ?? 0) * 100)}% more
              </span>
              .
            </>
          ) : backs.outcome === "too-close" ? (
            <>
              Across{" "}
              <span className="num font-semibold t1">
                {backs.total.toLocaleString()}
              </span>{" "}
              swipes on {axis.cardCount} cards, neither way of writing is
              pulling ahead. Collecting swipes — check back as data comes in.
            </>
          ) : (
            <>
              Collecting swipes on {axis.cardCount} cards. Check back as data
              comes in.
            </>
          )}
        </motion.p>

        {/* ---- The signature: head-to-head ---- */}
        <HeadToHead metric={backs} delay={bars} />

        {/* ---- Retention ---- */}
        {axis.retentionConflict && backWinner && retentionWinner ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: bars + 0.3 }}
            className="mt-6 rounded-[4px] p-4 sm:p-5"
            style={{
              background: "var(--alert-wash)",
              border: "1px solid color-mix(in srgb, var(--alert) 34%, transparent)",
            }}
          >
            <div className="flex items-start gap-2.5">
              <span aria-hidden className="text-[15px] leading-tight">
                ⚠️
              </span>
              <div className="min-w-0 flex-1">
                <h3
                  className="display text-[16px] sm:text-[17px]"
                  style={{ color: "var(--alert)" }}
                >
                  This one wins the swipe but loses the user
                </h3>
                <p className="mt-2 text-[12.5px] leading-relaxed t2">
                  {backWinner.label} gets backed more, but only{" "}
                  <span className="num font-semibold t1">
                    {(
                      (backWinner.id === retention.left.id
                        ? retention.left.rate
                        : retention.right.rate) * 100
                    ).toFixed(0)}
                    %
                  </span>{" "}
                  of those users are still around a week later — against{" "}
                  <span className="num font-semibold t1">
                    {(retentionWinner.rate * 100).toFixed(0)}%
                  </span>{" "}
                  for {retentionWinner.label}. Worth a closer look before you
                  trust the swipe.
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed t3">
                  Read this as a flag, not a cause. Sticking around is only
                  measured among people who backed the card — and backing is
                  exactly what the framing changes — so the two groups
                  aren&apos;t strictly like for like.
                </p>
                <div className="mt-4">
                  <div className="eyebrow mb-2.5">
                    Still around a week later
                  </div>
                  <HeadToHead metric={retention} delay={bars + 0.4} />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          retention.total > 0 && (
            <div className="well mt-6 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="eyebrow">Still around a week later</span>
                {retentionWinner && (
                  <span className="text-[11.5px] t2">
                    {retentionWinner.label} keeps them too
                  </span>
                )}
              </div>
              <HeadToHead metric={retention} delay={bars + 0.25} />
            </div>
          )
        )}
      </div>

      {/* ---- Drawers ---- */}
      <div className="mt-6 border-t">
        <Drawer
          label={`Per-card breakdown (${axis.cardCount})`}
          open={cardsOpen}
          onToggle={() => setCardsOpen((o) => !o)}
        >
          <div
            className="px-5 pb-6 pt-1 sm:px-7"
            style={{ background: "var(--sunken)" }}
          >
            <p className="mb-4 max-w-lg text-[12px] leading-relaxed t3">
              The same question asked on {axis.cardCount} different stocks. No
              single card gathers enough swipes to decide on its own — pooling
              them is what produces the verdict above.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {axis.cards.map((c) => {
                const max = Math.max(0.06, c.leftRate, c.rightRate) * 1.08;
                const lw = Math.min(100, (c.leftRate / max) * 100);
                const rw = Math.min(100, (c.rightRate / max) * 100);
                const leftWins = c.leftRate > c.rightRate;
                return (
                  <div
                    key={c.cardId}
                    className="rounded-[4px] border p-3.5"
                    style={{ background: "var(--raised)" }}
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="num text-[13px] font-semibold">
                          {c.ticker}
                        </span>
                        <span className="truncate text-[11px] t3">
                          {c.company}
                        </span>
                      </div>
                      <span className="num text-[10.5px] t3">
                        {c.total.toLocaleString()}
                      </span>
                    </div>

                    <div className="relative flex h-[10px] items-stretch">
                      <div className="flex flex-1 justify-end">
                        <div
                          className="h-full rounded-l-[3px]"
                          style={{
                            width: `${lw}%`,
                            background: leftWins
                              ? "var(--accent)"
                              : "var(--calm)",
                            opacity: leftWins ? 0.95 : 0.45,
                          }}
                        />
                      </div>
                      <div className="flex flex-1 justify-start">
                        <div
                          className="h-full rounded-r-[2px]"
                          style={{
                            width: `${rw}%`,
                            background: !leftWins
                              ? "var(--accent)"
                              : "var(--calm)",
                            opacity: !leftWins ? 0.95 : 0.45,
                          }}
                        />
                      </div>
                      <div
                        aria-hidden
                        className="absolute inset-y-[-3px] left-1/2 w-px -translate-x-1/2"
                        style={{ background: "var(--line-strong)" }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between">
                      <span className="num text-[11px] t2">
                        {(c.leftRate * 100).toFixed(1)}%
                      </span>
                      <span className="num text-[11px] t2">
                        {(c.rightRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Drawer>

        <div className="border-t">
          <Drawer
            label="See the details"
            open={detailsOpen}
            onToggle={() => setDetailsOpen((o) => !o)}
          >
            <div
              className="space-y-6 px-5 pb-7 pt-1 sm:px-7"
              style={{ background: "var(--sunken)" }}
            >
              <MetricProof
                name="Backs"
                metric={backs}
                unit="swipes"
                config={config}
              />
              <MetricProof
                name="Retention"
                metric={retention}
                unit="backed users"
                config={config}
              />
              <p className="border-t pt-4 text-[11px] leading-relaxed t3">
                Both metrics run the same always-valid sequential test (mSPRT,
                τ² = {config.tau2}, α = {config.alpha}) over two different
                observation streams. Verdicts are gated at{" "}
                {config.minSamplesPerArm} observations per arm so the normal
                approximation holds. Swipes pool by pole across{" "}
                {axis.cardCount} cards; assignment is a 50/50 hash within each
                card, so card-level appeal cancels rather than confounds.
              </p>
            </div>
          </Drawer>
        </div>
      </div>
    </motion.section>
  );
}
