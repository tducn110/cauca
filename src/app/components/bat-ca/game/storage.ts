import {
  DEPTH_UPGRADE_DELTA,
  INITIAL_CAPACITY,
  INITIAL_MAX_DEPTH,
  INITIAL_NET_SIZE,
  INITIAL_PULL_SPEED,
} from "./constants";
import type { BuffState, BuffType, UpgradeType, Upgrades } from "./types";

const STORE_KEY = "batca-ao-lang-save";
const SAVE_VERSION = 5 as const;
const MAX_SAFE_SCORE = 999_999_999;
const MAX_SAFE_BUFF_VALUE = 9_999;
const MAX_UPGRADE_LEVEL = 5;
const MAX_OFFLINE_RATE_LEVEL = 5;
const UPGRADE_TYPES: UpgradeType[] = ["depth", "netSize", "pullSpeed", "capacity"];
const BUFF_TYPES: BuffType[] = ["dynamite", "strength", "time", "bigNet"];
const SAVE_LISTENERS = new Set<(save: SaveData) => void>();

export type SaveData = {
  version: typeof SAVE_VERSION;
  money: number;
  bestMoney: number;
  bestRunScore: number;
  lastRunScore: number;
  upgrades: Upgrades;
  pendingBuffs: BuffState;
  offlineRateLevel: number;
  lastActiveAt: number;
  nextGiftAt: number;
};

const EMPTY_UPGRADES: Upgrades = { depth: 0, netSize: 0, pullSpeed: 0, capacity: 0 };

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeScore(value: unknown): number {
  return Math.round(Math.min(MAX_SAFE_SCORE, Math.max(0, finiteNumber(value, 0))));
}

function safeUpgradeLevel(value: unknown): number {
  return Math.round(Math.min(MAX_UPGRADE_LEVEL, Math.max(0, finiteNumber(value, 0))));
}

function safeOfflineRateLevel(value: unknown): number {
  return Math.round(Math.min(MAX_OFFLINE_RATE_LEVEL, Math.max(0, finiteNumber(value, 0))));
}

function safeTimestamp(value: unknown, fallback: number): number {
  return Math.round(Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, finiteNumber(value, fallback))));
}

function safeBuffValue(value: unknown): number {
  return Math.round(Math.min(MAX_SAFE_BUFF_VALUE, Math.max(0, finiteNumber(value, 0))));
}

function sanitizeUpgrades(value: unknown): Upgrades {
  const candidate = value && typeof value === "object" ? value as Partial<Record<UpgradeType, unknown>> : {};
  return UPGRADE_TYPES.reduce<Upgrades>((result, type) => {
    result[type] = safeUpgradeLevel(candidate[type]);
    return result;
  }, { ...EMPTY_UPGRADES });
}

function sanitizeBuffs(value: unknown): BuffState {
  const candidate = value && typeof value === "object" ? value as Partial<Record<BuffType, unknown>> : {};
  return BUFF_TYPES.reduce<BuffState>((result, type) => {
    const amount = safeBuffValue(candidate[type]);
    if (amount > 0) result[type] = amount;
    return result;
  }, {});
}

function inferLevel(value: unknown, bases: number[], delta: number): number {
  const stat = finiteNumber(value, bases[0]);
  let bestLevel = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const base of bases) {
    for (let level = 0; level <= MAX_UPGRADE_LEVEL; level++) {
      const distance = Math.abs(stat - (base + level * delta));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestLevel = level;
      }
    }
  }
  return bestLevel;
}

function migrateUpgrades(parsed: Record<string, unknown>): Upgrades {
  if (parsed.upgrades && typeof parsed.upgrades === "object") {
    return sanitizeUpgrades(parsed.upgrades);
  }
  return {
    // Hai bản export trước từng dùng mốc 180m và 550m.
    depth: inferLevel(parsed.maxDepth, [INITIAL_MAX_DEPTH, 180], DEPTH_UPGRADE_DELTA),
    netSize: inferLevel(parsed.netSize, [INITIAL_NET_SIZE], 8),
    pullSpeed: inferLevel(parsed.pullSpeed, [INITIAL_PULL_SPEED], 50),
    capacity: inferLevel(parsed.capacity, [INITIAL_CAPACITY], 2),
  };
}

function normalizeSave(value: unknown, now = Date.now()): SaveData {
  const parsed = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    version: SAVE_VERSION,
    money: safeScore(parsed.money),
    bestMoney: safeScore(parsed.bestMoney),
    bestRunScore: safeScore(parsed.bestRunScore),
    lastRunScore: safeScore(parsed.lastRunScore),
    upgrades: migrateUpgrades(parsed),
    pendingBuffs: sanitizeBuffs(parsed.pendingBuffs ?? parsed.nextLevelBuffs),
    offlineRateLevel: safeOfflineRateLevel(parsed.offlineRateLevel),
    lastActiveAt: safeTimestamp(parsed.lastActiveAt, now),
    nextGiftAt: safeTimestamp(parsed.nextGiftAt, 0),
  };
}

function writeSave(save: SaveData): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(save));
  SAVE_LISTENERS.forEach((listener) => listener(save));
}

export function subscribeToSave(listener: (save: SaveData) => void): () => void {
  SAVE_LISTENERS.add(listener);
  return () => SAVE_LISTENERS.delete(listener);
}

export function loadSave(): SaveData {
  const fallback = normalizeSave(null);
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    const save = normalizeSave(parsed);
    if ((parsed as { version?: unknown } | null)?.version !== SAVE_VERSION) {
      writeSave(save);
    }
    return save;
  } catch {
    return fallback;
  }
}

export function saveProgress(data: Partial<Omit<SaveData, "version">>): void {
  try {
    const current = loadSave();
    writeSave(normalizeSave({ ...current, ...data, version: SAVE_VERSION }));
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function saveWallet(money: number, bestMoney: number): void {
  saveProgress({
    money: safeScore(money),
    bestMoney: safeScore(bestMoney),
  });
}

/** @deprecated Use saveWallet when both wallet values are available. */
export function saveBest(bestMoney: number): void {
  saveProgress({ bestMoney: safeScore(bestMoney) });
}

export function saveRunResult(score: number): { bestRunScore: number; lastRunScore: number; isNewBest: boolean } {
  const current = loadSave();
  const lastRunScore = safeScore(score);
  const isNewBest = lastRunScore > current.bestRunScore;
  const bestRunScore = Math.max(current.bestRunScore, lastRunScore);
  saveProgress({ bestRunScore, lastRunScore });
  return { bestRunScore, lastRunScore, isNewBest };
}
