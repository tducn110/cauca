export const GEAR_MAX_LEVEL = 15;

export const GEAR_UPGRADE_COSTS = {
  depth: [
    350, 900, 1_800, 4_000, 7_000,
    12_000, 20_000, 32_000, 50_000, 75_000,
    105_000, 145_000, 195_000, 260_000, 350_000,
  ],
  netSize: [
    180, 500, 1_000, 2_000, 3_500,
    6_000, 9_500, 14_500, 22_000, 32_000,
    45_000, 62_000, 85_000, 115_000, 155_000,
  ],
  pullSpeed: [
    160, 450, 900, 1_800, 3_200,
    5_500, 8_500, 13_000, 20_000, 29_000,
    41_000, 57_000, 78_000, 105_000, 140_000,
  ],
  capacity: [
    250, 700, 1_400, 2_800, 5_000,
    8_500, 14_000, 22_000, 34_000, 50_000,
    70_000, 100_000, 135_000, 185_000, 245_000,
  ],
} as const;

// Offline income is intentionally much lower than active play. At the maximum
// level, the four-hour cap awards 600,000đ: useful late-game progress, but not
// enough to buy every remaining gear upgrade in one return.
export const OFFLINE_RATE_PER_MINUTE = [
  8, 12, 18, 25, 40, 60, 90, 140,
  210, 300, 450, 650, 900, 1_300, 1_800, 2_500,
] as const;

// Costs target an increasing two-to-eight-hour payback on the incremental
// income gained by each offline upgrade.
export const OFFLINE_UPGRADE_COSTS = [
  400, 900, 1_300, 3_200, 4_800,
  8_100, 15_000, 23_000, 32_000, 58_000,
  84_000, 113_000, 192_000, 240_000, 336_000,
] as const;

export const OFFLINE_MAX_LEVEL = OFFLINE_UPGRADE_COSTS.length;
export const MAX_OFFLINE_ELAPSED_MS = 4 * 60 * 60 * 1_000;
export const MIN_OFFLINE_ELAPSED_MS = 60 * 1_000;
