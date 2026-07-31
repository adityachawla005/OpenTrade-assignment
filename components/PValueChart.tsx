"use client";

/**
 * Always-valid p-value over time, with the naive peeked z-test p-value plotted
 * against it on the same axis.
 *
 * Both series are p-values, so they share one y-axis — no dual scale. The axis
 * is log-scaled because a p-value that matters spans several orders of
 * magnitude; a linear axis would flatten everything interesting into the
 * bottom pixel row.
 *
 * The two lines here are *tests*, not variants, so they use categorical slots
 * 7 and 8 (violet / red) rather than the variant blue/orange used elsewhere on
 * the page — one hue must not mean two different things on one screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Minimal shape the chart needs. Both the per-card curve and the pooled
 * framing-matchup curve satisfy it; the extra per-arm fields are optional and
 * only enrich the tooltip when present.
 */
export interface CurvePoint {
  n: number;
  msprtP: number;
  naiveP: number;
  nA?: number;
  nB?: number;
}

interface Props {
  curve: CurvePoint[];
  alpha: number;
  stoppedAtN: number | null;
  naiveFirstCrossedAt: number | null;
}

const PLOT_H = 176;
const AXIS_H = 26;
const PAD_L = 42;
const PAD_R = 12;
const PAD_T = 10;
const FLOOR = 1e-8;

export default function PValueChart({
  curve,
  alpha,
  stoppedAtN,
  naiveFirstCrossedAt,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(260, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geom = useMemo(() => {
    const plotW = Math.max(40, width - PAD_L - PAD_R);
    const maxN = curve.length > 0 ? curve[curve.length - 1].n : 1;
    const minN = curve.length > 0 ? curve[0].n : 0;
    const spanN = Math.max(1, maxN - minN);

    let lo = alpha / 10;
    for (const p of curve) {
      lo = Math.min(lo, Math.max(FLOOR, p.msprtP), Math.max(FLOOR, p.naiveP));
    }
    lo = Math.max(FLOOR, lo);
    const logLo = Math.log10(lo);
    const logSpan = Math.max(1e-6, 0 - logLo); // top of the axis is p = 1

    const x = (n: number) => PAD_L + ((n - minN) / spanN) * plotW;
    const y = (p: number) => {
      const clamped = Math.min(1, Math.max(lo, p));
      return PAD_T + ((0 - Math.log10(clamped)) / logSpan) * PLOT_H;
    };

    const path = (key: "msprtP" | "naiveP") =>
      curve
        .map((pt, i) => `${i === 0 ? "M" : "L"}${x(pt.n).toFixed(1)},${y(pt[key]).toFixed(1)}`)
        .join(" ");

    // One decade per tick, thinned so labels never collide.
    const decades: number[] = [];
    for (let e = 0; e >= Math.floor(logLo); e--) decades.push(10 ** e);
    const stride = Math.ceil(decades.length / 5);
    const ticks = decades.filter((_, i) => i % stride === 0 || i === decades.length - 1);

    return { plotW, x, y, path, ticks, minN, maxN, lo };
  }, [curve, width, alpha]);

  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (curve.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      // Nearest data point by x — the reader aims at a sample size, not a line.
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < curve.length; i++) {
        const d = Math.abs(geom.x(curve[i].n) - px);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setHoverIdx(best);
    },
    [curve, geom],
  );

  if (curve.length < 2) {
    return (
      <div
        className="grid h-[140px] place-items-center rounded-[4px] border text-[12px] t3"
        style={{ background: "var(--sunken)" }}
      >
        Not enough swipes yet to plot a p-value.
      </div>
    );
  }

  const hovered = hoverIdx !== null ? curve[hoverIdx] : null;
  const totalH = PAD_T + PLOT_H + AXIS_H;
  const alphaY = geom.y(alpha);

  const fmtP = (p: number) =>
    p >= 0.001 ? p.toFixed(3) : p.toExponential(1).replace("e-", "e−");

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Legend — always present for two series, so identity is never colour alone. */}
      <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5 t2">
          <span
            aria-hidden
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: "var(--series-rigorous)" }}
          />
          mSPRT (always-valid)
        </span>
        <span className="flex items-center gap-1.5 t2">
          <span
            aria-hidden
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: "var(--series-naive)" }}
          />
          naive z-test (peeked)
        </span>
        <span className="ml-auto t3">log scale</span>
      </div>

      <svg
        width={width}
        height={totalH}
        role="img"
        aria-label={`Always-valid p-value against sample size. Final mSPRT p-value ${fmtP(
          curve[curve.length - 1].msprtP,
        )}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
        style={{ touchAction: "pan-y" }}
      >
        {/* Recessive solid hairline grid. */}
        {geom.ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={PAD_L + geom.plotW}
              y1={geom.y(t)}
              y2={geom.y(t)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={geom.y(t) + 3.5}
              textAnchor="end"
              fontSize={9.5}
              fill="var(--text-3)"
              style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono), monospace" }}
            >
              {t >= 0.001 ? String(t) : t.toExponential(0).replace("e-", "e−")}
            </text>
          </g>
        ))}

        {/* The alpha threshold. Dashed *because it is a threshold* — grid rules
            above stay solid so the two never read as the same thing. */}
        <line
          x1={PAD_L}
          x2={PAD_L + geom.plotW}
          y1={alphaY}
          y2={alphaY}
          stroke="var(--text-3)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={PAD_L + geom.plotW}
          y={alphaY - 4}
          textAnchor="end"
          fontSize={9.5}
          fill="var(--text-3)"
        >
          α = {alpha}
        </text>

        {/* Naive first — the mSPRT line reads on top of it. */}
        <motion.path
          d={geom.path("naiveP")}
          fill="none"
          stroke="var(--series-naive)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d={geom.path("msprtP")}
          fill="none"
          stroke="var(--series-rigorous)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Where a continuously-peeked z-test would first have fired. */}
        {naiveFirstCrossedAt !== null && (
          <line
            x1={geom.x(naiveFirstCrossedAt)}
            x2={geom.x(naiveFirstCrossedAt)}
            y1={PAD_T}
            y2={PAD_T + PLOT_H}
            stroke="var(--series-naive)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.6}
          />
        )}

        {/* The sequential stop: a marker with a 2px surface ring, direct-labelled. */}
        {stoppedAtN !== null &&
          (() => {
            const pt = curve.reduce((acc, p) =>
              Math.abs(p.n - stoppedAtN) < Math.abs(acc.n - stoppedAtN) ? p : acc,
            );
            const cx = geom.x(pt.n);
            const cy = geom.y(pt.msprtP);
            const labelRight = cx < PAD_L + geom.plotW * 0.6;
            return (
              <g>
                <line
                  x1={cx}
                  x2={cx}
                  y1={PAD_T}
                  y2={PAD_T + PLOT_H}
                  stroke="var(--series-rigorous)"
                  strokeWidth={1}
                  opacity={0.35}
                />
                <circle cx={cx} cy={cy} r={5.5} fill="var(--raised)" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill="var(--series-rigorous)"
                  stroke="var(--raised)"
                  strokeWidth={2}
                />
                <text
                  x={labelRight ? cx + 8 : cx - 8}
                  y={PAD_T + 10}
                  textAnchor={labelRight ? "start" : "end"}
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--series-rigorous)"
                  style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono), monospace" }}
                >
                  stopped at {stoppedAtN.toLocaleString()}
                </text>
              </g>
            );
          })()}

        {/* Crosshair. */}
        {hovered && (
          <g pointerEvents="none">
            <line
              x1={geom.x(hovered.n)}
              x2={geom.x(hovered.n)}
              y1={PAD_T}
              y2={PAD_T + PLOT_H}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
            <circle
              cx={geom.x(hovered.n)}
              cy={geom.y(hovered.naiveP)}
              r={4}
              fill="var(--series-naive)"
              stroke="var(--raised)"
              strokeWidth={2}
            />
            <circle
              cx={geom.x(hovered.n)}
              cy={geom.y(hovered.msprtP)}
              r={4}
              fill="var(--series-rigorous)"
              stroke="var(--raised)"
              strokeWidth={2}
            />
          </g>
        )}

        {/* X axis. */}
        <line
          x1={PAD_L}
          x2={PAD_L + geom.plotW}
          y1={PAD_T + PLOT_H}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {[0, 0.5, 1].map((f) => {
          const n = Math.round(geom.minN + f * (geom.maxN - geom.minN));
          return (
            <text
              key={f}
              x={PAD_L + f * geom.plotW}
              y={PAD_T + PLOT_H + 14}
              textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}
              fontSize={9.5}
              fill="var(--text-3)"
              style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono), monospace" }}
            >
              {n.toLocaleString()}
            </text>
          );
        })}
        <text
          x={PAD_L + geom.plotW / 2}
          y={PAD_T + PLOT_H + 24}
          textAnchor="middle"
          fontSize={9.5}
          fill="var(--text-3)"
        >
          swipes
        </text>
      </svg>

      {/* Tooltip: value leads, series name follows. */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-[4px] border px-2.5 py-1.5 text-[11px]"
          style={{
            background: "var(--raised)",
            boxShadow: "var(--shadow-2)",
            left: Math.min(
              Math.max(0, geom.x(hovered.n) + 10),
              Math.max(0, width - 168),
            ),
            top: PAD_T + 4,
            width: 158,
          }}
        >
          <div className="num mb-1 t3">
            n = {hovered.n.toLocaleString()}
            {hovered.nA !== undefined && hovered.nB !== undefined && (
              <> · A {hovered.nA} / B {hovered.nB}</>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-[2px] w-3 shrink-0 rounded-full"
              style={{ background: "var(--series-rigorous)" }}
            />
            <span className="num font-semibold t1">{fmtP(hovered.msprtP)}</span>
            <span className="t3">mSPRT</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-[2px] w-3 shrink-0 rounded-full"
              style={{ background: "var(--series-naive)" }}
            />
            <span className="num font-semibold t1">{fmtP(hovered.naiveP)}</span>
            <span className="t3">naive</span>
          </div>
        </div>
      )}
    </div>
  );
}
