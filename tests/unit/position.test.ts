import { describe, expect, it } from "vitest";
import { needsRebalance, positionBetween, POSITION_STEP } from "@/lib/position";

describe("positionBetween", () => {
  it("handles empty columns and ends", () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
    expect(positionBetween(null, 100)).toBe(100 - POSITION_STEP);
    expect(positionBetween(100, null)).toBe(100 + POSITION_STEP);
  });

  it("puts a card halfway between neighbours", () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it("rejects inverted neighbours", () => {
    expect(() => positionBetween(5, 5)).toThrow();
    expect(() => positionBetween(6, 5)).toThrow();
  });

  it("keeps order across many inserts at the same spot until a rebalance is needed", () => {
    let lo = 0;
    const hi = 1024;
    let inserts = 0;
    while (!needsRebalance(lo, hi)) {
      const p = positionBetween(lo, hi);
      expect(p).toBeGreaterThan(lo);
      expect(p).toBeLessThan(hi);
      lo = p;
      inserts++;
    }
    expect(inserts).toBeGreaterThan(25); // dozens of same-slot drops before renumbering
  });
});
