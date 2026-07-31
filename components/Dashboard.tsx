"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AxesPayload } from "@/lib/aggregate";
import AnimatedNumber from "./AnimatedNumber";
import AxisRow from "./AxisRow";

interface SimEvent {
  type: string;
  n?: number;
}

const BUDGET = 1500;

export default function Dashboard() {
  const reduced = useReducedMotion();
  const [data, setData] = useState<AxesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/results", { cache: "no-store" });
      if (!res.ok) throw new Error(`request failed (${res.status})`);
      setData((await res.json()) as AxesPayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not load results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // stopEarly is off: an axis pools every card, so one card hitting its own
      // stop must not starve the pooled experiment.
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipesPerCard: BUDGET, stopEarly: false }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let seen = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: SimEvent;
          try {
            ev = JSON.parse(line) as SimEvent;
          } catch {
            continue;
          }
          if (ev.type === "progress" || ev.type === "decided") {
            seen = Math.max(seen, ev.n ?? 0);
            setProgress(Math.min(100, (seen / BUDGET) * 100));
          }
        }
      }
      await load();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "could not generate data");
      }
    } finally {
      setBusy(false);
      setProgress(0);
      abortRef.current = null;
    }
  }, [busy, load]);

  const reset = useCallback(async () => {
    abortRef.current?.abort();
    setBusy(false);
    await fetch("/api/reset", { method: "POST" });
    await load();
  }, [load]);

  const axes = data?.axes ?? [];
  const resolved = axes.filter((a) => a.backs.winner !== null);
  // The hero is the strongest clean result — one whose swipe winner is also the
  // one users stay with. A conflicted winner is a warning, never a headline.
  const hero = resolved.find((a) => !a.retentionConflict) ?? null;
  const heroWinner = hero
    ? hero.backs.winner === hero.backs.left.id
      ? hero.backs.left
      : hero.backs.right
    : null;

  const conflicts = axes.filter((a) => a.retentionConflict).length;
  const empty = !!data && data.totalSwipes === 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
      {/* ------------------------------ Hero ------------------------------ */}
      <motion.header
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12 sm:mb-16"
      >
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="eyebrow">Framing performance</span>
          {data && data.totalSwipes > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[10.5px] font-medium"
              style={{
                background: data.sources.sim > 0 ? "var(--accent-wash)" : "var(--sunken)",
                color: data.sources.sim > 0 ? "var(--accent)" : "var(--text-3)",
                border:
                  data.sources.sim > 0
                    ? "1px solid color-mix(in srgb, var(--accent) 40%, transparent)"
                    : "1px solid var(--line)",
              }}
            >
              {data.sources.sim > 0 ? (
                <>
                  <span className="num">
                    {data.sources.sim.toLocaleString()}
                  </span>{" "}
                  simulated ·{" "}
                  <span className="num">{data.sources.ui.toLocaleString()}</span>{" "}
                  from real swiping
                </>
              ) : (
                <>
                  <span className="num">{data.sources.ui.toLocaleString()}</span>{" "}
                  real swipes · no simulated data
                </>
              )}
            </span>
          )}
        </div>

        {hero && heroWinner ? (
          <>
            <h1 className="display max-w-3xl text-[38px] sm:text-[58px]">
              {heroWinner.phrase} wins
            </h1>
            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="mt-5 max-w-2xl text-[15.5px] leading-relaxed t2"
            >
              Cards that {heroWinner.description.toLowerCase()} were backed{" "}
              <span className="num text-[17px] font-semibold t1">
                <AnimatedNumber
                  value={Math.round((hero.backs.relativeGain ?? 0) * 100)}
                  format={(n) => `${Math.round(n)}%`}
                  delay={0.35}
                />{" "}
                more
              </span>{" "}
              across{" "}
              <span className="num font-semibold t1">
                <AnimatedNumber value={data?.totalSwipes ?? 0} delay={0.35} />
              </span>{" "}
              swipes and every card in the deck.
            </motion.p>
          </>
        ) : (
          <>
            <h1 className="display max-w-3xl text-[38px] sm:text-[58px]">
              {loading
                ? "Reading the deck"
                : empty
                  ? "Nothing to compare yet"
                  : "No clear winner yet"}
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed t2">
              {empty
                ? "Generate some sample traffic, or go swipe a few cards yourself, and the winning way of writing will surface here."
                : "Collecting swipes — check back as data comes in."}
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <motion.button
            onClick={generate}
            disabled={busy}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            className="btn btn-accent relative overflow-hidden px-5 py-2.5"
          >
            {busy && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{ background: "rgba(255,255,255,0.22)" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.2 }}
              />
            )}
            <span className="relative">
              {busy ? "Generating…" : "Generate sample data"}
            </span>
          </motion.button>

          <motion.button
            onClick={reset}
            disabled={busy}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            className="btn btn-quiet px-5 py-2.5"
          >
            Clear
          </motion.button>

          {conflicts > 0 && (
            <motion.span
              initial={reduced ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="text-[12px] font-medium"
              style={{ color: "var(--alert)" }}
            >
              ⚠️ {conflicts} framing{conflicts === 1 ? "" : "s"} win the swipe
              but lose the user
            </motion.span>
          )}
        </div>
      </motion.header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="status"
            className="mb-6 overflow-hidden rounded-[4px] border px-4 py-3 text-[12.5px]"
            style={{ borderColor: "var(--alert)", color: "var(--alert)" }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="py-24 text-center text-[13px] t3">
          Collecting swipes — check back as data comes in.
        </div>
      )}

      <motion.div
        className="space-y-5"
        animate={{ opacity: busy ? 0.45 : 1 }}
        transition={{ duration: 0.25 }}
      >
        {data &&
          axes.map((a, i) => (
            <AxisRow key={a.id} axis={a} config={data.config} index={i} />
          ))}
      </motion.div>

      {empty && !busy && (
        <div className="panel px-6 py-16 text-center">
          <h2 className="display text-[20px]">Collecting swipes</h2>
          <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed t2">
            Check back as data comes in — or hit{" "}
            <span className="font-medium t1">Generate sample data</span> to see
            the whole deck resolve at once.
          </p>
        </div>
      )}
    </main>
  );
}
