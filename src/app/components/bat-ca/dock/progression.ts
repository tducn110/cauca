import { loadSave, saveProgress, type SaveData } from "../game/storage";
import { UPGRADE_DEFS, upgradeCost } from "../game/upgrades";
import type { UpgradeDef } from "../game/upgrades";

export type DockUpgradeType = "capacity" | "depth" | "offlineRate";

export const OFFLINE_RATE_PER_MINUTE = [5, 8, 12, 18, 27, 40] as const;
export const OFFLINE_UPGRADE_COSTS = [50, 150, 400, 1_000, 2_500] as const;
export const MAX_OFFLINE_ELAPSED_MS = 8 * 60 * 60 * 1_000;
export const MIN_OFFLINE_ELAPSED_MS = 60 * 1_000;
export const GIFT_COOLDOWN_MS = 4 * 60 * 60 * 1_000;
export const GIFT_REWARD = 100;

const MAX_WALLET = 999_999_999;

export type DockProgressionSnapshot = {
  wallet: number;
  earnings: number;
  bestRunScore: number;
  capacityLevel: number;
  capacityCost: number | null;
  depthLevel: number;
  depthCost: number | null;
  offlineRateLevel: number;
  offlineRateCost: number | null;
  offlineRatePerMinute: number;
  lastActiveAt: number;
  nextGiftAt: number;
  giftAvailable: boolean;
  giftRemainingMs: number;
};

export type OfflineClaimResult = {
  claimed: boolean;
  amount: number;
  elapsedMs: number;
  capped: boolean;
  save: SaveData;
};

export type GiftClaimResult = {
  claimed: boolean;
  amount: number;
  remainingMs: number;
  reason?: "cooldown" | "wallet-full";
  save: SaveData;
};

export type UpgradePurchaseResult = {
  purchased: boolean;
  type: DockUpgradeType;
  cost: number | null;
  reason?: "insufficient-funds" | "max-level";
  save: SaveData;
};

function currentTime(now: number): number {
  return Number.isFinite(now) ? Math.max(0, Math.round(now)) : Date.now();
}

function addToWallet(save: SaveData, amount: number): Pick<SaveData, "money" | "bestMoney"> {
  const money = Math.min(MAX_WALLET, save.money + Math.max(0, Math.round(amount)));
  return { money, bestMoney: Math.max(save.bestMoney, money) };
}

function gameUpgradeDef(type: "capacity" | "depth"): UpgradeDef {
  const def = UPGRADE_DEFS.find((candidate) => candidate.type === type);
  if (!def) throw new Error(`Missing upgrade definition for ${type}`);
  return def;
}

function offlineUpgradeCost(level: number): number | null {
  return level >= OFFLINE_UPGRADE_COSTS.length ? null : OFFLINE_UPGRADE_COSTS[level];
}

function persistedSave(): SaveData {
  return loadSave();
}

export function getDockProgression(now = Date.now(), save = loadSave()): DockProgressionSnapshot {
  const safeNow = currentTime(now);
  const capacityDef = gameUpgradeDef("capacity");
  const depthDef = gameUpgradeDef("depth");
  const capacityLevel = save.upgrades.capacity;
  const depthLevel = save.upgrades.depth;
  const giftRemainingMs = Math.max(0, save.nextGiftAt - safeNow);

  return {
    wallet: save.money,
    earnings: save.money,
    bestRunScore: save.bestRunScore,
    capacityLevel,
    capacityCost: upgradeCost(capacityDef, capacityLevel),
    depthLevel,
    depthCost: upgradeCost(depthDef, depthLevel),
    offlineRateLevel: save.offlineRateLevel,
    offlineRateCost: offlineUpgradeCost(save.offlineRateLevel),
    offlineRatePerMinute: OFFLINE_RATE_PER_MINUTE[save.offlineRateLevel],
    lastActiveAt: save.lastActiveAt,
    nextGiftAt: save.nextGiftAt,
    giftAvailable: giftRemainingMs === 0,
    giftRemainingMs,
  };
}

export function claimOfflineEarnings(now = Date.now()): OfflineClaimResult {
  const safeNow = currentTime(now);
  const save = loadSave();
  const rawElapsedMs = safeNow - save.lastActiveAt;

  if (rawElapsedMs < 0) {
    saveProgress({ lastActiveAt: safeNow });
    return { claimed: false, amount: 0, elapsedMs: 0, capped: false, save: persistedSave() };
  }

  if (rawElapsedMs < MIN_OFFLINE_ELAPSED_MS) {
    return { claimed: false, amount: 0, elapsedMs: rawElapsedMs, capped: false, save };
  }

  const elapsedMs = Math.min(rawElapsedMs, MAX_OFFLINE_ELAPSED_MS);
  const rate = OFFLINE_RATE_PER_MINUTE[save.offlineRateLevel];
  const calculatedAmount = Math.floor((elapsedMs / 60_000) * rate);
  const wallet = addToWallet(save, calculatedAmount);
  const amount = wallet.money - save.money;

  saveProgress({ ...wallet, lastActiveAt: safeNow });
  return {
    claimed: amount > 0,
    amount,
    elapsedMs,
    capped: rawElapsedMs > MAX_OFFLINE_ELAPSED_MS,
    save: persistedSave(),
  };
}

export function claimGiftReward(now = Date.now()): GiftClaimResult {
  const safeNow = currentTime(now);
  const save = loadSave();
  const remainingMs = Math.max(0, save.nextGiftAt - safeNow);

  if (remainingMs > 0) {
    return { claimed: false, amount: 0, remainingMs, reason: "cooldown", save };
  }

  const wallet = addToWallet(save, GIFT_REWARD);
  const amount = wallet.money - save.money;
  if (amount <= 0) {
    return { claimed: false, amount: 0, remainingMs: 0, reason: "wallet-full", save };
  }
  saveProgress({
    ...wallet,
    lastActiveAt: safeNow,
    nextGiftAt: safeNow + GIFT_COOLDOWN_MS,
  });

  return {
    claimed: true,
    amount,
    remainingMs: GIFT_COOLDOWN_MS,
    save: persistedSave(),
  };
}

export function purchaseDockUpgrade(type: DockUpgradeType, now = Date.now()): UpgradePurchaseResult {
  const safeNow = currentTime(now);
  const save = loadSave();
  const level = type === "offlineRate" ? save.offlineRateLevel : save.upgrades[type];
  const cost = type === "offlineRate"
    ? offlineUpgradeCost(level)
    : upgradeCost(gameUpgradeDef(type), level);

  if (cost === null) {
    return { purchased: false, type, cost, reason: "max-level", save };
  }
  if (save.money < cost) {
    return { purchased: false, type, cost, reason: "insufficient-funds", save };
  }

  if (type === "offlineRate") {
    saveProgress({
      money: save.money - cost,
      offlineRateLevel: level + 1,
      lastActiveAt: safeNow,
    });
  } else {
    saveProgress({
      money: save.money - cost,
      upgrades: { ...save.upgrades, [type]: level + 1 },
      lastActiveAt: safeNow,
    });
  }

  return { purchased: true, type, cost, save: persistedSave() };
}

export function recordDockActivity(now = Date.now()): SaveData {
  saveProgress({ lastActiveAt: currentTime(now) });
  return persistedSave();
}
