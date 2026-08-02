"use client";

import { TIERS } from "@/lib/elo";

/**
 * Session rating, card by card. One series, so no legend — the title names it.
 * Tier floors sit behind it as hairlines: the point of the chart is where you
 * crossed one, not the exact values.
 */
export function RatingCurve({ curve }: { curve: number[] }) {
  if (curve.length < 2) return null;

  const W = 300;
  const H = 84;
  const pad = 6;

  const lo = Math.min(...curve) - 30;
  const hi = Math.max(...curve) + 30;
  const span = Math.max(1, hi - lo);

  const x = (i: number) => (i / (curve.length - 1)) * (W - pad * 2) + pad;
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2);

  const points = curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const last = curve[curve.length - 1];
  const gained = last >= curve[0];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Rating this session</span>
        <span className="num text-[11px] text-ink-2">
          {curve[0]} → <span className={gained ? "text-up" : "text-down"}>{last}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[84px] w-full"
        role="img"
        aria-label={`Rating moved from ${curve[0]} to ${last} across ${curve.length - 1} cards`}
      >
        {TIERS.map((t) =>
          t.floor > lo && t.floor < hi ? (
            <g key={t.key}>
              <line
                x1={pad}
                x2={W - pad}
                y1={y(t.floor)}
                y2={y(t.floor)}
                stroke="var(--color-line-2)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text
                x={pad}
                y={y(t.floor) - 4}
                className="num"
                fill="var(--color-ink-3)"
                fontSize="8"
              >
                {t.name}
              </text>
            </g>
          ) : null,
        )}

        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--color-brain)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End marker gets a surface ring so it reads on top of the line. */}
        <circle
          cx={x(curve.length - 1)}
          cy={y(last)}
          r="4"
          fill="var(--color-brain)"
          stroke="var(--color-panel)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
