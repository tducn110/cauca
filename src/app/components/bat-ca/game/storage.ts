import {
  CAPACITY_UPGRADE_DELTA,
  DEPTH_UPGRADE_DELTA,
  INITIAL_CAPACITY,
  INITIAL_MAX_DEPTH,
  INITIAL_NET_SIZE,
  INITIAL_PULL_SPEED,
  NET_SIZE_UPGRADE_DELTA,
  PULL_SPEED_UPGRADE_DELTA,
} from "./constants";
import {
  GEAR_MAX_LEVEL,
  MAX_OFFLINE_ELAPSED_MS,
  MIN_OFFLINE_ELAPSED_MS,
  OFFLINE_MAX_LEVEL,
  OFFLINE_RATE_PER_MINUTE,
} from "./economyConfig";
import type { BuffState, BuffType, UpgradeType, Upgrades } from "./types";
import { HOOK_DEFINITIONS, RANDOM_HOOK_UNLOCK_PRICE } from "./hooks-data";
import { FISH_KINDS } from "./fish-data";

const STORE_KEY = "batca-ao-lang-save";
const SAVE_VERSION = 5 as const;

const MAX_SAFE_SCORE = 999_999_999;
const MAX_SAFE_BUFF_VALUE = 9_999;
const MAX_UPGRADE_LEVEL = GEAR_MAX_LEVEL;
const MAX_OFFLINE_RATE_LEVEL = OFFLINE_MAX_LEVEL;
const UPGRADE_TYPES: UpgradeType[] = ["depth", "netSize", "pullSpeed", "capacity"];
const BUFF_TYPES: BuffType[] = ["dynamite", "strength", "time", "bigNet"];
const SAVE_LISTENERS = new Set<(save: SaveData) => void>();

export type AudioSettings = {
  sound: boolean;
  music: boolean;
};

export type LanguageCode = "vi" | "en";

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
  selectedHook: string;
  unlockedHooks: string[];
  discoveredFish: string[];
  audioSettings: AudioSettings;
  language: LanguageCode;
  lastOfflineClaimedAt: number;
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
  const candidate = value && typeof value === "object" ? (value as Partial<Record<UpgradeType, unknown>>) : {};
  return UPGRADE_TYPES.reduce<Upgrades>((result, type) => {
    result[type] = safeUpgradeLevel(candidate[type]);
    return result;
  }, { ...EMPTY_UPGRADES });
}

function sanitizeBuffs(value: unknown): BuffState {
  const candidate = value && typeof value === "object" ? (value as Partial<Record<BuffType, unknown>>) : {};
  return BUFF_TYPES.reduce<BuffState>((result, type) => {
    const amount = safeBuffValue(candidate[type]);
    if (amount > 0) result[type] = amount;
    return result;
  }, {});
}

function sanitizeUnlockedHooks(value: unknown): string[] {
  const validIds = new Set(HOOK_DEFINITIONS.map((h) => h.id));
  const list = Array.isArray(value) ? value : ["classic"];
  const set = new Set<string>();
  set.add("classic");
  for (const item of list) {
    if (typeof item === "string" && validIds.has(item)) {
      set.add(item);
    }
  }
  return Array.from(set);
}

function sanitizeSelectedHook(value: unknown, unlocked: string[]): string {
  if (typeof value === "string" && unlocked.includes(value)) {
    return value;
  }
  return unlocked[0] || "classic";
}

function sanitizeDiscoveredFish(value: unknown): string[] {
  const validTypes = new Set(FISH_KINDS.map((f) => f.type));
  const list = Array.isArray(value) ? value : [];
  const set = new Set<string>();
  for (const item of list) {
    if (typeof item === "string" && validTypes.has(item)) {
      set.add(item);
    }
  }
  return Array.from(set);
}

function inferLevel(value: unknown, bases: number[], deltas: number[]): number {
  const stat = finiteNumber(value, bases[0]);
  let bestLevel = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const base of bases) {
    for (const delta of deltas) {
      for (let level = 0; level <= MAX_UPGRADE_LEVEL; level++) {
        const distance = Math.abs(stat - (base + level * delta));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLevel = level;
        }
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
    depth: inferLevel(parsed.maxDepth, [INITIAL_MAX_DEPTH, 180], [DEPTH_UPGRADE_DELTA, 400]),
    netSize: inferLevel(parsed.netSize, [INITIAL_NET_SIZE], [NET_SIZE_UPGRADE_DELTA, 8]),
    pullSpeed: inferLevel(parsed.pullSpeed, [INITIAL_PULL_SPEED], [PULL_SPEED_UPGRADE_DELTA, 50]),
    capacity: inferLevel(parsed.capacity, [INITIAL_CAPACITY], [CAPACITY_UPGRADE_DELTA, 2]),
  };
}

export function normalizeSave(value: unknown, now = Date.now()): SaveData {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const unlockedHooks = sanitizeUnlockedHooks(parsed.unlockedHooks);
  const selectedHook = sanitizeSelectedHook(parsed.selectedHook, unlockedHooks);
  const discoveredFish = sanitizeDiscoveredFish(parsed.discoveredFish);

  const audioObj = parsed.audioSettings && typeof parsed.audioSettings === "object" ? (parsed.audioSettings as Record<string, unknown>) : {};
  const sound = typeof audioObj.sound === "boolean" ? audioObj.sound : true;
  const music = typeof audioObj.music === "boolean" ? audioObj.music : true;

  const language: LanguageCode = parsed.language === "en" ? "en" : "vi";

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
    selectedHook,
    unlockedHooks,
    discoveredFish,
    audioSettings: { sound, music },
    language,
    lastOfflineClaimedAt: safeTimestamp(parsed.lastOfflineClaimedAt, 0),
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

export function saveRunResult(score: number): { bestRunScore: number; lastRunScore: number; isNewBest: boolean } {
  const current = loadSave();
  const lastRunScore = safeScore(score);
  const isNewBest = lastRunScore > current.bestRunScore;
  const bestRunScore = Math.max(current.bestRunScore, lastRunScore);
  saveProgress({ bestRunScore, lastRunScore });
  return { bestRunScore, lastRunScore, isNewBest };
}

// --- Hook Unlocks & Equipping ---
export function selectHook(hookId: string): boolean {
  const save = loadSave();
  if (save.unlockedHooks.includes(hookId)) {
    saveProgress({ selectedHook: hookId });
    return true;
  }
  return false;
}

export function unlockRandomHook(): { success: boolean; unlockedHookId?: string; reason?: "insufficient-funds" | "all-unlocked" } {
  const save = loadSave();
  const locked = HOOK_DEFINITIONS.filter((h) => !save.unlockedHooks.includes(h.id));
  if (locked.length === 0) {
    return { success: false, reason: "all-unlocked" };
  }
  if (save.money < RANDOM_HOOK_UNLOCK_PRICE) {
    return { success: false, reason: "insufficient-funds" };
  }

  const chosenIndex = Math.floor(Math.random() * locked.length);
  const chosen = locked[chosenIndex];
  const newUnlocked = [...save.unlockedHooks, chosen.id];
  const newMoney = save.money - RANDOM_HOOK_UNLOCK_PRICE;

  saveProgress({
    money: newMoney,
    unlockedHooks: newUnlocked,
    selectedHook: chosen.id,
  });

  return { success: true, unlockedHookId: chosen.id };
}

// --- Fish Discovery for Aquarium ---
export function recordDiscoveredFish(fishTypes: string[]): string[] {
  const save = loadSave();
  const newlyDiscovered: string[] = [];
  const currentSet = new Set(save.discoveredFish);

  for (const type of fishTypes) {
    if (!currentSet.has(type)) {
      currentSet.add(type);
      newlyDiscovered.push(type);
    }
  }

  if (newlyDiscovered.length > 0) {
    saveProgress({ discoveredFish: Array.from(currentSet) });
  }

  return newlyDiscovered;
}

// --- Offline Income Preview ---
export function calculateOfflineEarnings(now = Date.now()): { eligibleMinutes: number; amount: number; lastActive: number } {
  const save = loadSave();
  const lastActive = save.lastActiveAt;
  const elapsedMs = now - lastActive;

  if (elapsedMs < MIN_OFFLINE_ELAPSED_MS) {
    return { eligibleMinutes: 0, amount: 0, lastActive };
  }

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  const maxOfflineMinutes = Math.floor(MAX_OFFLINE_ELAPSED_MS / 60_000);
  const eligibleMinutes = Math.min(maxOfflineMinutes, elapsedMinutes);

  const ratePerMinute = OFFLINE_RATE_PER_MINUTE[save.offlineRateLevel] || OFFLINE_RATE_PER_MINUTE[0];
  const amount = eligibleMinutes * ratePerMinute;

  return { eligibleMinutes, amount, lastActive };
}
