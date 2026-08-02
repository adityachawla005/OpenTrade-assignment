import type { Card, Direction } from "./types";

/**
 * Simulated opponents, matched to your rating.
 *
 * Real matchmaking would pair you with live players inside your band; this
 * stands in for that. Everything is derived from a hash of the card id, so a
 * given card always produces the same opponent — no re-rolling on re-render.
 */
const NAMES = [
  "R. Sato",
  "K. Adeyemi",
  "M. Okafor",
  "L. Berg",
  "D. Ruiz",
  "A. Novak",
  "J. Park",
  "T. Haddad",
  "S. Iyer",
  "E. Moreau",
  "C. Lindqvist",
  "N. Farouk",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface Opponent {
  name: string;
  rating: number;
  pick: Direction;
}

export function opponentFor(card: Card, rating: number): Opponent {
  const h = hash(card.id);
  return {
    name: NAMES[h % NAMES.length],
    // Matched inside a ±32 band — the whole point of a level-matched ladder.
    rating: rating + (((h >> 4) % 65) - 32),
    // The opponent calls it the way the field does.
    pick: ((h >> 9) % 1000) / 1000 < card.consensus ? "UP" : "DOWN",
  };
}

/** A small matched lobby to show on the ladder screen. */
export function lobbyFor(rating: number, seed = "lobby"): Opponent[] {
  return Array.from({ length: 4 }, (_, i) => {
    const h = hash(seed + i);
    return {
      name: NAMES[(h + i * 3) % NAMES.length],
      rating: rating + (((h >> 3) % 61) - 30),
      pick: "UP" as Direction,
    };
  }).sort((a, b) => b.rating - a.rating);
}
