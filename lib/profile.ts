"use client";

import { ALL_FACTS, FACT_BY_ID } from "./cards";
import { START_RATING } from "./elo";
import type { Fact } from "./types";

/**
 * The career — everything that survives a session.
 *
 * A single run is one deck. The career is the account: your rating, the Facts
 * you've discovered across every run, and which of them you're currently
 * carrying. Discovery is permanent; *carrying* is what stays capacity-limited,
 * so the Brain keeps its teeth without punishing you for having played before.
 */
export interface Career {
  v: 1;
  /** Lifetime XP. The headline number — only ever goes up. */
  xp: number;
  rating: number;
  peak: number;
  /** Fact ids currently in the Brain. Bounded by the tier's neuron budget. */
  equipped: string[];
  /** Every Fact id ever earned, across all sessions. Never shrinks. */
  discovered: string[];
  sessions: number;
  cardsPlayed: number;
  cardsRight: number;
  bestStreak: number;
  hedgeSaves: number;
}

const KEY = "edge.career.v1";

export function blankCareer(): Career {
  return {
    v: 1,
    xp: 0,
    rating: START_RATING,
    peak: START_RATING,
    equipped: [],
    discovered: [],
    sessions: 0,
    cardsPlayed: 0,
    cardsRight: 0,
    bestStreak: 0,
    hedgeSaves: 0,
  };
}

/** Ids are the only thing stored, so Fact copy can change without migrations. */
export function factsFor(ids: string[]): Fact[] {
  return ids
    .map((id) => FACT_BY_ID.get(id))
    .filter((f): f is Fact => Boolean(f));
}

export function loadCareer(): Career {
  if (typeof window === "undefined") return blankCareer();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return blankCareer();
    const parsed = JSON.parse(raw) as Partial<Career>;
    if (parsed.v !== 1) return blankCareer();
    const base = blankCareer();
    return {
      ...base,
      ...parsed,
      // Drop ids that no longer exist in the deck.
      equipped: (parsed.equipped ?? []).filter((id) => FACT_BY_ID.has(id)),
      discovered: (parsed.discovered ?? []).filter((id) => FACT_BY_ID.has(id)),
    };
  } catch {
    return blankCareer();
  }
}

export function saveCareer(career: Career) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(career));
  } catch {
    /* private mode, quota — the demo just runs in-memory instead */
  }
}

export function clearCareer() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const TOTAL_FACTS = ALL_FACTS.length;

export function lifetimeAccuracy(c: Career): number | null {
  return c.cardsPlayed > 0 ? c.cardsRight / c.cardsPlayed : null;
}
