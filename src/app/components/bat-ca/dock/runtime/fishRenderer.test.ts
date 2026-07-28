import { describe, expect, it } from "vitest";
import { FISH_KINDS } from "../../game/fish-data";
import {
  eligibleFishKindsAtDepth,
  selectWeightedFishKind,
} from "./fishRenderer";

describe("dock fish selection", () => {
  it("respects minLevel before adding deep fish to the pool", () => {
    const locked = eligibleFishKindsAtDepth(FISH_KINDS, 2_600, 5);
    const unlocked = eligibleFishKindsAtDepth(FISH_KINDS, 2_600, 6);

    expect(locked.some((kind) => kind.type === "kraken")).toBe(false);
    expect(unlocked.some((kind) => kind.type === "kraken")).toBe(true);
  });

  it("uses rarity as a spawn weight instead of choosing species uniformly", () => {
    const shallowKinds = eligibleFishKindsAtDepth(FISH_KINDS, 250, 1);
    const totalWeight = shallowKinds.reduce((sum, kind) => sum + kind.rarity, 0);
    const firstKindShare = shallowKinds[0].rarity / totalWeight;

    expect(selectWeightedFishKind(shallowKinds, () => firstKindShare / 2))
      .toBe(shallowKinds[0]);
    expect(selectWeightedFishKind(shallowKinds, () => 0.999999))
      .toBe(shallowKinds[shallowKinds.length - 1]);
  });
});
