"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import StockCard, { type DeckCard } from "./StockCard";

const USER_KEY = "swipe-ab:userId";
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 520;

function newUserId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `u_${rand}`;
}

function loadUserId(): string {
  try {
    const existing = window.localStorage.getItem(USER_KEY);
    if (existing) return existing;
  } catch {
    /* storage unavailable — fall through to a fresh id */
  }
  const id = newUserId();
  try {
    window.localStorage.setItem(USER_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

export default function SwipeDeck() {
  const [userId, setUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DeckCard[] | null>(null);
  const [tally, setTally] = useState({ backed: 0, passed: 0 });
  const [showVariant, setShowVariant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const busy = useRef(false);

  // Drag state lives on a motion value so the card follows the finger at
  // 60fps without a React render per pointer event.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-13, 0, 13]);
  const backOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const nextScale = useTransform(x, [-260, 0, 260], [1, 0.955, 1]);
  const nextOpacity = useTransform(x, [-260, 0, 260], [1, 0.72, 1]);

  useEffect(() => setUserId(loadUserId()), []);

  const loadDeck = useCallback(async (uid: string) => {
    setDeck(null);
    setError(null);
    try {
      const res = await fetch(`/api/deck?userId=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`deck request failed (${res.status})`);
      const json = (await res.json()) as { deck: DeckCard[] };
      setDeck(json.deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not load the deck");
      setDeck([]);
    }
  }, []);

  useEffect(() => {
    if (userId) void loadDeck(userId);
  }, [userId, loadDeck]);

  const commit = useCallback(
    async (card: DeckCard, direction: "left" | "right") => {
      if (busy.current) return;
      busy.current = true;

      setExitDir(direction === "right" ? 1 : -1);
      setTally((t) => ({
        backed: t.backed + (direction === "right" ? 1 : 0),
        passed: t.passed + (direction === "left" ? 1 : 0),
      }));
      setDeck((d) => (d ? d.slice(1) : d));
      x.set(0);

      try {
        await fetch("/api/swipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, cardId: card.id, direction }),
        });
      } catch {
        setError("swipe not recorded — is the dev server still running?");
      }
      busy.current = false;
    },
    [userId, x],
  );

  const onDragEnd = (card: DeckCard) => (_: unknown, info: PanInfo) => {
    const past =
      Math.abs(info.offset.x) > SWIPE_DISTANCE ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    if (past) void commit(card, info.offset.x > 0 ? "right" : "left");
  };

  const resetUser = () => {
    const id = newUserId();
    try {
      window.localStorage.setItem(USER_KEY, id);
    } catch {
      /* ignore */
    }
    setTally({ backed: 0, passed: 0 });
    setUserId(id);
  };

  const top = deck && deck.length > 0 ? deck[0] : null;
  const next = deck && deck.length > 1 ? deck[1] : null;
  const third = deck && deck.length > 2 ? deck[2] : null;
  const total = 12;
  const done = deck ? total - deck.length : 0;

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-8 pt-6 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="display text-[26px]">
              Back it or pass
            </h1>
            <p className="mt-1.5 text-[13px] t2">
              Swipe right to back, left to pass.
            </p>
          </div>
          <button
            onClick={() => setShowVariant((v) => !v)}
            className="btn btn-quiet shrink-0 px-3 py-1.5 text-[11.5px]"
            aria-pressed={showVariant}
          >
            {showVariant ? "Hide variant" : "Reveal variant"}
          </button>
        </div>

        {/* Progress rail. */}
        <div
          className="mt-4 h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: "var(--sunken)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent)" }}
            initial={{ width: 0 }}
            animate={{ width: `${(done / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="status"
            className="mb-3 overflow-hidden rounded-[4px] border px-3 py-2 text-[12px]"
            style={{ borderColor: "var(--alert)", color: "var(--alert)" }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative h-[460px]">
        {deck === null && (
          <div className="panel absolute inset-0 grid place-items-center rounded-[4px] text-[13px] t3">
            <motion.span
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading deck…
            </motion.span>
          </div>
        )}

        {deck !== null && deck.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="panel absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-[4px] px-7 text-center"
          >
            <div>
              <div className="display text-[19px]">
                Deck finished
              </div>
              <p className="mt-2.5 text-[13.5px] leading-relaxed t2">
                You backed {tally.backed} and passed on {tally.passed}. A dozen
                swipes is far too few to tell the versions apart — run{" "}
                <span className="font-medium t1">Simulate</span> on the
                dashboard to generate enough traffic to see a real winner
                emerge.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/dashboard"
                className="btn btn-accent px-4 py-2.5"
              >
                Open dashboard
              </Link>
              <button
                onClick={resetUser}
                className="btn btn-quiet px-4 py-2.5"
              >
                Swipe as a new user
              </button>
            </div>
          </motion.div>
        )}

        {/* Third card — static depth only. */}
        {third && (
          <div
            className="absolute inset-0"
            style={{ transform: "translateY(18px) scale(0.91)", opacity: 0.4 }}
          >
            <StockCard card={third} showVariant={false} />
          </div>
        )}

        {/* Next card rises toward the front as the top card is dragged away. */}
        {next && (
          <motion.div
            className="absolute inset-0"
            style={{ y: 9, scale: nextScale, opacity: nextOpacity }}
          >
            <StockCard card={next} showVariant={showVariant} />
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {top && (
            <motion.div
              key={top.id}
              className="swipe-card absolute inset-0"
              style={{ x, rotate }}
              drag="x"
              dragElastic={0.55}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={onDragEnd(top)}
              whileTap={{ cursor: "grabbing" }}
              initial={{ scale: 0.955, y: 9, opacity: 0.7 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{
                x: exitDir * 460,
                y: 24,
                rotate: exitDir * 22,
                opacity: 0,
                transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] },
              }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
            >
              <StockCard card={top} showVariant={showVariant} />

              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-5 top-5 rounded-[4px] border-2 px-2.5 py-1 text-[16px] font-bold tracking-[0.04em]"
                style={{
                  color: "var(--accent)",
                  borderColor: "var(--accent)",
                  opacity: backOpacity,
                  rotate: -10,
                }}
              >
                BACK
              </motion.div>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute right-5 top-5 rounded-[4px] border-2 px-2.5 py-1 text-[16px] font-bold tracking-[0.04em]"
                style={{
                  color: "var(--alert)",
                  borderColor: "var(--alert)",
                  opacity: passOpacity,
                  rotate: 10,
                }}
              >
                PASS
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The deck is fully usable without any drag gesture. */}
      <div className="mt-6 flex items-center justify-center gap-5">
        <motion.button
          disabled={!top}
          onClick={() => top && commit(top, "left")}
          whileTap={{ scale: 0.88 }}
          whileHover={top ? { scale: 1.06 } : undefined}
          transition={{ type: "spring", stiffness: 420, damping: 17 }}
          className="grid h-[58px] w-[58px] place-items-center rounded-full border-2 text-[21px] disabled:opacity-25"
          style={{
            borderColor: "var(--alert)",
            color: "var(--alert)",
            background: "var(--raised)",
            boxShadow: "var(--shadow-2)",
          }}
          aria-label="Pass on this card"
        >
          ✕
        </motion.button>

        <div className="w-[72px] text-center">
          <div className="num text-[15px] font-semibold">
            {deck ? deck.length : "—"}
          </div>
          <div className="text-[10.5px] t3">left</div>
        </div>

        <motion.button
          disabled={!top}
          onClick={() => top && commit(top, "right")}
          whileTap={{ scale: 0.88 }}
          whileHover={top ? { scale: 1.06 } : undefined}
          transition={{ type: "spring", stiffness: 420, damping: 17 }}
          className="grid h-[58px] w-[58px] place-items-center rounded-full border-2 text-[21px] disabled:opacity-25"
          style={{
            borderColor: "var(--accent)",
            color: "var(--accent)",
            background: "var(--raised)",
            boxShadow: "var(--shadow-2)",
          }}
          aria-label="Back this card"
        >
          ♥
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="panel mt-8 px-4 py-4 text-[11.5px] leading-relaxed t3"
      >
        <div className="eyebrow mb-1.5">
          You always see the same version
        </div>
        You are{" "}
        <code
          className="num rounded px-1 py-0.5"
          style={{ background: "var(--sunken)", color: "var(--text-1)" }}
        >
          {userId ?? "…"}
        </code>
        . Which version of each card you get is fixed to you — reload, or come
        back tomorrow, and it stays the same. Tap{" "}
        <span className="font-medium">Swipe as a new user</span> for a fresh
        draw.
      </motion.div>
    </main>
  );
}
