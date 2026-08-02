"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { CARDS, FACT_BY_ID } from "./cards";
import {
  MAX_LIVES,
  START_LIVES,
  Tier,
  callOutcome,
  neuronCost,
  neuronsFor,
  neuronsUsed,
  tierFor,
  tierIndexFor,
} from "./elo";
import {
  Career,
  blankCareer,
  clearCareer,
  factsFor,
  loadCareer,
  saveCareer,
} from "./profile";
import type { Card, Direction, Fact } from "./types";

export type Phase =
  | "intro"
  | "loadout"
  | "predict"
  | "reveal"
  | "promotion"
  | "keep"
  | "swap"
  | "summary"
  | "over";

export type View = "play" | "ladder" | "rewards";

export interface Result {
  card: Card;
  pick: Direction;
  correct: boolean;
  xp: number;
  xpCall: number;
  xpSkill: number;
  xpStreak: number;
  delta: number;
  opponentRating: number;
  expected: number;
  /** The read the player chose to apply. */
  read: Fact | null;
  /** The armed hedge, if it actually fired — absorbed a miss or paid a life. */
  hedge: Fact | null;
  hedgeGaveLife: boolean;
  /** Armed but not needed: right call at max lives. Stays in the Brain. */
  hedgeKept: Fact | null;
  /** Held and playable, but the player didn't use it. Taught, never punished. */
  missedRead: Fact | null;
  unusedHedge: Fact | null;
  ratingBefore: number;
  ratingAfter: number;
  xpBefore: number;
  livesBefore: number;
  livesAfter: number;
}

export interface State {
  /** false until the stored career has been read — nothing career-specific
      renders before then, so server and first client paint agree. */
  hydrated: boolean;
  career: Career;

  phase: Phase;
  view: View;

  index: number;
  lives: number;
  /** XP earned this session. Career XP is career.xp + this. */
  xp: number;
  rating: number;
  /** Highest rating ever reached. The Brain never shrinks once earned. */
  peak: number;
  brain: Fact[];
  /** Reads the player has applied to the current card. Cleared each card. */
  appliedReads: string[];
  /** The hedge armed for the current card, if any. Cleared each card. */
  armedHedge: string | null;
  pending: Fact | null;
  result: Result | null;
  promotion: { from: Tier; to: Tier } | null;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
  curve: number[];
  /** Facts earned this session — discovery is permanent even if you drop them. */
  earned: Fact[];
  /** Facts dropped this session. Shown in the summary as the cost of a small Brain. */
  released: Fact[];
  saves: number;
}

/** A fresh deck run, seeded from the career you walk in with. */
function sessionFields(career: Career) {
  return {
    index: 0,
    lives: START_LIVES,
    xp: 0,
    rating: career.rating,
    peak: career.peak,
    brain: factsFor(career.equipped),
    appliedReads: [] as string[],
    armedHedge: null as string | null,
    pending: null,
    result: null,
    promotion: null,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answered: 0,
    curve: [career.rating],
    earned: [] as Fact[],
    released: [] as Fact[],
    saves: 0,
  };
}

function initialState(): State {
  const career = blankCareer();
  return {
    hydrated: false,
    career,
    phase: "intro",
    view: "play",
    ...sessionFields(career),
  };
}

export type Action =
  | { type: "hydrate"; career: Career }
  | { type: "begin" }
  | { type: "fresh" }
  | { type: "equip"; id: string }
  | { type: "unequip"; id: string }
  | { type: "deal" }
  | { type: "apply"; id: string }
  | { type: "view"; view: View }
  | { type: "pick"; dir: Direction }
  | { type: "advance" }
  | { type: "keep" }
  | { type: "skip" }
  | { type: "swap"; ids: string[] }
  | { type: "release" }
  | { type: "newSession" }
  | { type: "resetCareer" };

/**
 * What's *playable* on this card — not what fires automatically.
 *
 * The game surfaces every held Fact whose sector matches; applying one is
 * always the player's call. Missing a match costs nothing but the edge itself,
 * so the decision stays interesting without becoming a punishment for not
 * noticing.
 */
export function playableOn(brain: Fact[], card: Card): Fact[] {
  return brain.filter((f) => f.sector === card.sector);
}

export function availableRead(brain: Fact[], card: Card): Fact | null {
  return brain.find((f) => f.sector === card.sector && f.edge === "read") ?? null;
}

export function availableHedge(brain: Fact[], card: Card): Fact | null {
  return brain.find((f) => f.sector === card.sector && f.edge === "hedge") ?? null;
}

/** Neurons available. Keyed to peak rating — the Brain never shrinks. */
export function brainNeurons(state: State): number {
  return neuronsFor(state.peak);
}

/** Whether a Fact fits in what's left, given the Facts already carried. */
export function fits(brain: Fact[], fact: Fact, neurons: number): boolean {
  return neuronsUsed(brain) + neuronCost(fact) <= neurons;
}

/** Fold the finished run into the career. Discovery is permanent. */
function finish(s: State, phase: "summary" | "over"): State {
  const discovered = new Set(s.career.discovered);
  for (const f of s.earned) discovered.add(f.id);

  return {
    ...s,
    phase,
    career: {
      ...s.career,
      xp: s.career.xp + s.xp,
      rating: s.rating,
      peak: Math.max(s.career.peak, s.peak),
      equipped: s.brain.map((f) => f.id),
      discovered: [...discovered],
      sessions: s.career.sessions + 1,
      cardsPlayed: s.career.cardsPlayed + s.answered,
      cardsRight: s.career.cardsRight + s.correct,
      bestStreak: Math.max(s.career.bestStreak, s.bestStreak),
      hedgeSaves: s.career.hedgeSaves + s.saves,
    },
  };
}

function toNextCard(s: State): State {
  if (s.lives <= 0) return finish(s, "over");
  const index = s.index + 1;
  if (index >= CARDS.length) return finish({ ...s, index: CARDS.length }, "summary");
  return {
    ...s,
    index,
    phase: "predict",
    result: null,
    appliedReads: [],
    armedHedge: null,
  };
}

/**
 * Every earned Fact is a decision, not a deposit.
 *
 * Auto-filling the Brain and only asking when it's full makes the choice
 * arrive once, late. Asking every time means you're constantly judging whether
 * a piece of knowledge is worth its neurons — which is the skill the game is
 * actually about, and it means hoarding costs you.
 */
function toFactStep(s: State): State {
  if (!s.pending) return toNextCard(s);
  return { ...s, phase: "keep" };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        hydrated: true,
        career: action.career,
        ...sessionFields(action.career),
      };

    case "begin":
      // Returning players pick a loadout first; first-timers go straight in.
      return {
        ...state,
        phase: state.career.discovered.length > 0 ? "loadout" : "predict",
      };

    case "fresh": {
      const career = blankCareer();
      return { ...state, career, phase: "predict", ...sessionFields(career) };
    }

    case "equip": {
      const fact = FACT_BY_ID.get(action.id);
      if (!fact) return state;
      if (state.brain.some((f) => f.id === fact.id)) return state;
      if (!fits(state.brain, fact, brainNeurons(state))) return state;
      return { ...state, brain: [...state.brain, fact] };
    }

    case "unequip":
      return { ...state, brain: state.brain.filter((f) => f.id !== action.id) };

    case "deal":
      return {
        ...state,
        phase: "predict",
        career: { ...state.career, equipped: state.brain.map((f) => f.id) },
      };

    case "apply": {
      if (state.phase !== "predict") return state;
      const card = CARDS[state.index];
      const fact = state.brain.find((f) => f.id === action.id);
      if (!fact || fact.sector !== card.sector) return state;

      if (fact.edge === "read") {
        // A read, once opened, stays open for this card — nothing to take back.
        if (state.appliedReads.includes(fact.id)) return state;
        return { ...state, appliedReads: [...state.appliedReads, fact.id] };
      }
      // A hedge is armed, and can be disarmed right up until the call.
      return {
        ...state,
        armedHedge: state.armedHedge === fact.id ? null : fact.id,
      };
    }

    case "view":
      return { ...state, view: action.view };

    case "newSession":
      return {
        ...state,
        view: "play",
        phase: state.career.discovered.length > 0 ? "loadout" : "predict",
        ...sessionFields(state.career),
      };

    case "resetCareer": {
      const career = blankCareer();
      return {
        ...state,
        career,
        view: "play",
        phase: "intro",
        ...sessionFields(career),
      };
    }

    case "pick": {
      if (state.phase !== "predict") return state;
      const card = CARDS[state.index];
      const correct = action.dir === card.truth;

      // Only what the player chose to play actually plays.
      const heldRead = availableRead(state.brain, card);
      const read =
        heldRead && state.appliedReads.includes(heldRead.id) ? heldRead : null;
      const heldHedge = availableHedge(state.brain, card);
      const hedge =
        heldHedge && state.armedHedge === heldHedge.id ? heldHedge : null;

      let lives = state.lives;
      let brain = state.brain;
      let saves = state.saves;
      let hedgeGaveLife = false;
      let hedgeSpent = false;

      if (hedge) {
        // A hedge is spent only when it does one of its two real jobs: absorb a
        // miss, or grant a life. A right call while already at the life cap does
        // neither, so it stays armed for a later card rather than evaporating —
        // arming it purely as downside cover must never cost you the Fact.
        if (correct) {
          hedgeGaveLife = lives < MAX_LIVES;
          if (hedgeGaveLife) {
            lives += 1;
            hedgeSpent = true;
          }
        } else {
          saves += 1; // it ate the hit
          hedgeSpent = true;
        }
        if (hedgeSpent) brain = brain.filter((f) => f.id !== hedge.id);
      } else if (!correct) {
        lives -= 1;
      }

      const out = callOutcome(state.rating, card, correct, state.streak);
      const rating = Math.max(600, state.rating + out.delta);
      const peak = Math.max(state.peak, rating);

      const promotion =
        tierIndexFor(rating) > tierIndexFor(state.rating)
          ? { from: tierFor(state.rating), to: tierFor(rating) }
          : null;

      const streak = correct ? state.streak + 1 : 0;

      return {
        ...state,
        phase: "reveal",
        lives,
        brain,
        xp: state.xp + out.xp,
        rating,
        peak,
        saves,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        correct: state.correct + (correct ? 1 : 0),
        answered: state.answered + 1,
        curve: [...state.curve, rating],
        promotion,
        pending: correct ? card.reward : null,
        earned: correct ? [...state.earned, card.reward] : state.earned,
        result: {
          card,
          pick: action.dir,
          correct,
          xp: out.xp,
          xpCall: out.xpCall,
          xpSkill: out.xpSkill,
          xpStreak: out.xpStreak,
          delta: out.delta,
          opponentRating: out.opponent,
          expected: out.expected,
          read,
          hedge: hedgeSpent ? hedge : null,
          hedgeGaveLife,
          hedgeKept: hedge && !hedgeSpent ? hedge : null,
          missedRead: read ? null : heldRead,
          unusedHedge: hedge ? null : heldHedge,
          ratingBefore: state.rating,
          ratingAfter: rating,
          xpBefore: state.xp,
          livesBefore: state.lives,
          livesAfter: lives,
        },
      };
    }

    case "advance": {
      // Promotion resolves before the Fact lands, so the player watches the new
      // neurons open and the Fact drop into them. That's the flywheel, in order.
      if (state.phase === "reveal" && state.promotion) {
        return { ...state, phase: "promotion" };
      }
      if (state.phase === "promotion") {
        return toFactStep({ ...state, promotion: null });
      }
      if (state.phase === "reveal") return toFactStep(state);
      return state;
    }

    case "keep": {
      if (state.phase !== "keep" || !state.pending) return state;
      if (fits(state.brain, state.pending, brainNeurons(state))) {
        return toNextCard({
          ...state,
          brain: [...state.brain, state.pending],
          pending: null,
        });
      }
      // Wants it, no room — now the swap is a considered trade, not a chore.
      return { ...state, phase: "swap" };
    }

    case "skip": {
      if (state.phase !== "keep" || !state.pending) return state;
      return toNextCard({
        ...state,
        released: [...state.released, state.pending],
        pending: null,
      });
    }

    case "swap": {
      if (state.phase !== "swap" || !state.pending) return state;
      const drop = new Set(action.ids);
      const kept = state.brain.filter((f) => !drop.has(f.id));
      const dropped = state.brain.filter((f) => drop.has(f.id));
      // A Fact can cost more than one of the ones it replaces, so the trade is
      // validated rather than assumed to be one-for-one.
      if (!fits(kept, state.pending, brainNeurons(state))) return state;
      return toNextCard({
        ...state,
        brain: [...kept, state.pending],
        pending: null,
        released: [...state.released, ...dropped],
      });
    }

    case "release": {
      if (state.phase !== "swap" || !state.pending) return state;
      return toNextCard({
        ...state,
        released: [...state.released, state.pending],
        pending: null,
      });
    }

    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Read the stored career once, after mount.
  useEffect(() => {
    dispatch({ type: "hydrate", career: loadCareer() });
  }, []);

  // …and write it back whenever it changes. Only the career is persisted; an
  // interrupted run is not resumable by design — a session is one sitting.
  const first = useRef(true);
  useEffect(() => {
    if (!state.hydrated) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (state.career.sessions === 0 && state.career.discovered.length === 0) {
      clearCareer();
    } else {
      saveCareer(state.career);
    }
  }, [state.career, state.hydrated]);

  const card: Card | null = state.index < CARDS.length ? CARDS[state.index] : null;

  const derived = useMemo(
    () => ({
      neurons: brainNeurons(state),
      used: neuronsUsed(state.brain),
      tier: tierFor(state.rating),
      playable: card ? playableOn(state.brain, card) : [],
      careerXp: state.career.xp + state.xp,
    }),
    [state, card],
  );

  return {
    state,
    card,
    ...derived,
    total: CARDS.length,
    maxLives: MAX_LIVES,
    begin: useCallback(() => dispatch({ type: "begin" }), []),
    fresh: useCallback(() => dispatch({ type: "fresh" }), []),
    equip: useCallback((id: string) => dispatch({ type: "equip", id }), []),
    unequip: useCallback((id: string) => dispatch({ type: "unequip", id }), []),
    deal: useCallback(() => dispatch({ type: "deal" }), []),
    apply: useCallback((id: string) => dispatch({ type: "apply", id }), []),
    pick: useCallback((dir: Direction) => dispatch({ type: "pick", dir }), []),
    advance: useCallback(() => dispatch({ type: "advance" }), []),
    swap: useCallback((ids: string[]) => dispatch({ type: "swap", ids }), []),
    keep: useCallback(() => dispatch({ type: "keep" }), []),
    skip: useCallback(() => dispatch({ type: "skip" }), []),
    release: useCallback(() => dispatch({ type: "release" }), []),
    setView: useCallback((view: View) => dispatch({ type: "view", view }), []),
    newSession: useCallback(() => dispatch({ type: "newSession" }), []),
    resetCareer: useCallback(() => dispatch({ type: "resetCareer" }), []),
  };
}

export type Game = ReturnType<typeof useGame>;
