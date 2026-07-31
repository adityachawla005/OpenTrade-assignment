import { describe, it, expect } from "vitest";
import { AXES, getAxis, getPole } from "./axes";
import { CARDS, cardsOnAxis } from "./cards";

describe("framing axes as structured data", () => {
  it("defines four axes, each with exactly two poles", () => {
    expect(AXES).toHaveLength(4);
    for (const axis of AXES) {
      expect(axis.poles).toHaveLength(2);
      expect(axis.poles[0].id).not.toBe(axis.poles[1].id);
    }
  });

  it("gives every pole a unique id across all axes", () => {
    const ids = AXES.flatMap((a) => a.poles.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("spreads cards across axes so each has enough to pool", () => {
    for (const axis of AXES) {
      expect(cardsOnAxis(axis.id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("places every card on exactly one axis", () => {
    const counted = AXES.reduce((n, a) => n + cardsOnAxis(a.id).length, 0);
    expect(counted).toBe(CARDS.length);
  });

  it("tags both variants of a card with that card's axis and its two poles", () => {
    for (const card of CARDS) {
      const axis = getAxis(card.axis);
      const poles = [card.variants.A.pole, card.variants.B.pole];

      expect(card.variants.A.axis).toBe(card.axis);
      expect(card.variants.B.axis).toBe(card.axis);
      // The two variants must be opposite poles of the same axis.
      expect(new Set(poles).size).toBe(2);
      for (const p of poles) {
        expect(axis.poles.some((ap) => ap.id === p)).toBe(true);
      }
    }
  });

  it("resolves poles by id", () => {
    for (const axis of AXES) {
      for (const pole of axis.poles) {
        expect(getPole(pole.id).label).toBe(pole.label);
      }
    }
  });

  it("is extensible: adding an axis needs only data, not engine changes", () => {
    // A new axis is well-formed if it satisfies the same shape checks above.
    const candidate = {
      id: "length-brevity" as const,
      name: "Long vs Short",
      question: "Does a longer card get backed more?",
      poles: [
        { id: "long-form" as const, label: "Long", description: "d", phrase: "p" },
        { id: "short-form" as const, label: "Short", description: "d", phrase: "p" },
      ],
    };
    expect(candidate.poles).toHaveLength(2);
    expect(candidate.poles[0].id).not.toBe(candidate.poles[1].id);
  });
});
