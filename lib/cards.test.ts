import { describe, it, expect } from "vitest";
import {
  CARDS,
  canonicalizeVariant,
  contentHash,
  variantHash,
  type CardVariantContent,
} from "./cards";

const base: CardVariantContent = {
  thesis: "Runs 60% of decentralised-trial assays.",
  catalyst: "Phase II topline lands 14 March.",
  risk: "One programme is 70% of the story.",
  sizing: "1.5% now.",
};

describe("variant content hashing", () => {
  it("is stable for identical copy", () => {
    expect(contentHash(base)).toBe(contentHash({ ...base }));
  });

  it("ignores cosmetic whitespace so a re-wrap does not reset an experiment", () => {
    const rewrapped: CardVariantContent = {
      thesis: "  Runs 60%   of decentralised-trial\n  assays.  ",
      catalyst: "Phase II topline lands 14 March.",
      risk: "One programme is 70%\tof the story.",
      sizing: "1.5% now.",
    };
    expect(contentHash(rewrapped)).toBe(contentHash(base));
  });

  it("changes on a real character change, in every field", () => {
    const fields: Array<keyof CardVariantContent> = [
      "thesis",
      "catalyst",
      "risk",
      "sizing",
    ];
    for (const field of fields) {
      const edited = { ...base, [field]: `${base[field]}!` };
      expect(contentHash(edited)).not.toBe(contentHash(base));
    }
  });

  it("detects a single-character edit", () => {
    expect(contentHash({ ...base, sizing: "2.5% now." })).not.toBe(
      contentHash(base),
    );
  });

  it("distinguishes text moved between fields", () => {
    // Without a field separator both of these would canonicalise to "abcde".
    const a: CardVariantContent = {
      thesis: "ab",
      catalyst: "c",
      risk: "d",
      sizing: "e",
    };
    const b: CardVariantContent = {
      thesis: "a",
      catalyst: "bc",
      risk: "d",
      sizing: "e",
    };
    expect(contentHash(a)).not.toBe(contentHash(b));
  });

  it("produces a 16-char hex digest", () => {
    expect(contentHash(base)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("gives every variant in the shipped deck a distinct hash", () => {
    const seen = new Set<string>();
    for (const card of CARDS) {
      for (const v of ["A", "B"] as const) seen.add(variantHash(card, v));
    }
    expect(seen.size).toBe(CARDS.length * 2);
  });

  it("hashes only the copy — the axis and pole tags are not part of it", () => {
    const card = CARDS[0];
    const { thesis, catalyst, risk, sizing } = card.variants.A;
    expect(contentHash({ thesis, catalyst, risk, sizing })).toBe(
      variantHash(card, "A"),
    );
  });

  it("joins fields with a separator that cannot occur in copy", () => {
    const parts = canonicalizeVariant(base).split("\u001f");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe(base.thesis);
  });

  it("A and B of the same card hash differently", () => {
    for (const card of CARDS) {
      expect(variantHash(card, "A")).not.toBe(variantHash(card, "B"));
    }
  });
});
