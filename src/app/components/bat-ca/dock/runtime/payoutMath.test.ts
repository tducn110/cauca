import { describe, expect, it } from "vitest";
import { calculateFishPayout } from "./payoutMath";

describe("calculateFishPayout", () => {
  it("applies the selected hook multiplier consistently", () => {
    expect(calculateFishPayout({ isBad: false, value: 400 }, 1.5)).toBe(600);
  });

  it("does not pay for bad fish", () => {
    expect(calculateFishPayout({ isBad: true, value: 400 }, 1.5)).toBe(0);
  });

  it("uses a safe multiplier for invalid values", () => {
    expect(calculateFishPayout({ isBad: false, value: 400 }, Number.NaN)).toBe(400);
    expect(calculateFishPayout({ isBad: false, value: 400 }, -2)).toBe(0);
  });
});
