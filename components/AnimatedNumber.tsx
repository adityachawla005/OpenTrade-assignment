"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Counts from the previous value to the next one.
 *
 * Purely presentational: the value is always in the DOM as text, so nothing —
 * screen readers, copy/paste, tests — depends on the motion. Under
 * `prefers-reduced-motion` it snaps straight to the final value.
 */
export default function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString(),
  duration = 0.9,
  delay = 0,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        from.current = value;
      },
    });
    return () => controls.stop();
  }, [value, reduced, duration, delay]);

  return <>{format(display)}</>;
}
