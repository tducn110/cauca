import { describe, expect, it } from "vitest";
import {
  GEAR_MAX_LEVEL,
  GEAR_UPGRADE_COSTS,
  MAX_OFFLINE_ELAPSED_MS,
  OFFLINE_MAX_LEVEL,
  OFFLINE_RATE_PER_MINUTE,
  OFFLINE_UPGRADE_COSTS,
} from "./economyConfig";

function expectStrictlyIncreasing(values: readonly number[]): void {
  for (let index = 1; index < values.length; index += 1) {
    expect(values[index]).toBeGreaterThan(values[index - 1]);
  }
}

describe("economy configuration", () => {
  it("keeps every gear branch on the same 15-level progression", () => {
    for (const costs of Object.values(GEAR_UPGRADE_COSTS)) {
      expect(costs).toHaveLength(GEAR_MAX_LEVEL);
      expectStrictlyIncreasing(costs);
    }
  });

  it("keeps offline levels aligned and capped below the final gear bundle", () => {
    expect(OFFLINE_UPGRADE_COSTS).toHaveLength(OFFLINE_MAX_LEVEL);
    expect(OFFLINE_RATE_PER_MINUTE).toHaveLength(OFFLINE_MAX_LEVEL + 1);
    expectStrictlyIncreasing(OFFLINE_UPGRADE_COSTS);
    expectStrictlyIncreasing(OFFLINE_RATE_PER_MINUTE);

    const maxOfflineReward = Math.floor(MAX_OFFLINE_ELAPSED_MS / 60_000)
      * OFFLINE_RATE_PER_MINUTE[OFFLINE_MAX_LEVEL];
    const finalGearBundle = Object.values(GEAR_UPGRADE_COSTS)
      .reduce((sum, costs) => sum + costs[GEAR_MAX_LEVEL - 1], 0);

    expect(maxOfflineReward).toBe(600_000);
    expect(maxOfflineReward).toBeLessThan(finalGearBundle);
  });
});
