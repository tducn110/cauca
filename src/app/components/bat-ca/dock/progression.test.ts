import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSave, saveProgress } from "../game/storage";
import {
  GIFT_COOLDOWN_MS,
  GIFT_REWARD,
  MAX_OFFLINE_ELAPSED_MS,
  OFFLINE_RATE_PER_MINUTE,
  claimGiftReward,
  claimOfflineEarnings,
  purchaseDockUpgrade,
} from "./progression";

const STORE_KEY = "batca-ao-lang-save";
const NOW = Date.UTC(2026, 6, 22, 8, 0, 0);

function installMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  });
  return store;
}

describe("dock progression", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    installMemoryStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("migrates v4 without losing wallet, scores, upgrades, or buffs", () => {
    const store = installMemoryStorage({
      [STORE_KEY]: JSON.stringify({
        version: 4,
        money: 2_400,
        bestMoney: 3_100,
        bestRunScore: 900,
        lastRunScore: 650,
        upgrades: { depth: 2, netSize: 1, pullSpeed: 3, capacity: 4 },
        pendingBuffs: { dynamite: 2, time: 15 },
      }),
    });

    const save = loadSave();
    const persisted = JSON.parse(store.get(STORE_KEY) ?? "{}") as Record<string, unknown>;

    expect(save).toMatchObject({
      version: 5,
      money: 2_400,
      bestMoney: 3_100,
      bestRunScore: 900,
      lastRunScore: 650,
      upgrades: { depth: 2, netSize: 1, pullSpeed: 3, capacity: 4 },
      pendingBuffs: { dynamite: 2, time: 15 },
      offlineRateLevel: 0,
      lastActiveAt: NOW,
      nextGiftAt: 0,
    });
    expect(persisted).toEqual(save);
  });

  it("claims capped offline earnings only once", () => {
    saveProgress({
      money: 100,
      bestMoney: 100,
      offlineRateLevel: 1,
      lastActiveAt: NOW - 10 * 60 * 60 * 1_000,
    });

    const first = claimOfflineEarnings(NOW);
    const second = claimOfflineEarnings(NOW);
    const expected = Math.floor((MAX_OFFLINE_ELAPSED_MS / 60_000) * OFFLINE_RATE_PER_MINUTE[1]);

    expect(first).toMatchObject({ claimed: true, amount: expected, capped: true });
    expect(first.elapsedMs).toBe(MAX_OFFLINE_ELAPSED_MS);
    expect(first.save.money).toBe(100 + expected);
    expect(first.save.bestMoney).toBe(100 + expected);
    expect(first.save.lastActiveAt).toBe(NOW);
    expect(second).toMatchObject({ claimed: false, amount: 0, elapsedMs: 0, capped: false });
    expect(second.save.money).toBe(100 + expected);
  });

  it("claims one gift and enforces the persisted cooldown", () => {
    saveProgress({ money: 500, bestMoney: 500, nextGiftAt: 0 });

    const first = claimGiftReward(NOW);
    const second = claimGiftReward(NOW + 1_000);

    expect(first).toMatchObject({
      claimed: true,
      amount: GIFT_REWARD,
      remainingMs: GIFT_COOLDOWN_MS,
    });
    expect(first.save.money).toBe(500 + GIFT_REWARD);
    expect(first.save.nextGiftAt).toBe(NOW + GIFT_COOLDOWN_MS);
    expect(second).toMatchObject({
      claimed: false,
      amount: 0,
      remainingMs: GIFT_COOLDOWN_MS - 1_000,
    });
    expect(second.save.money).toBe(500 + GIFT_REWARD);
  });

  it("does not consume the gift cooldown when the wallet is full", () => {
    saveProgress({ money: 999_999_999, bestMoney: 999_999_999, nextGiftAt: 0 });

    const result = claimGiftReward(NOW);

    expect(result).toMatchObject({
      claimed: false,
      amount: 0,
      remainingMs: 0,
      reason: "wallet-full",
    });
    expect(result.save.nextGiftAt).toBe(0);
  });

  it("purchases capacity, depth, and offline upgrades using their current levels", () => {
    saveProgress({
      money: 1000,
      upgrades: { depth: 0, netSize: 0, pullSpeed: 0, capacity: 0 },
      offlineRateLevel: 0,
    });

    const capacity = purchaseDockUpgrade("capacity", NOW);
    const depth = purchaseDockUpgrade("depth", NOW);
    const offline = purchaseDockUpgrade("offlineRate", NOW);

    const save = loadSave();

    expect(capacity).toMatchObject({ purchased: true, cost: 250 });
    expect(depth).toMatchObject({ purchased: true, cost: 350 });
    expect(offline).toMatchObject({ purchased: true, cost: 400 });

    expect(save).toMatchObject({
      money: 1000 - 250 - 350 - 400,
      upgrades: { depth: 1, netSize: 0, pullSpeed: 0, capacity: 1 },
      offlineRateLevel: 1,
    });
  });

  it("does not charge for unaffordable or maxed upgrades", () => {
    saveProgress({
      money: 249,
      upgrades: { depth: 15, netSize: 0, pullSpeed: 0, capacity: 0 }, // maxed depth at 15
      offlineRateLevel: 0,
    });

    const unaffordable = purchaseDockUpgrade("capacity", NOW); // requires 250
    const maxed = purchaseDockUpgrade("depth", NOW); // cost should be null

    expect(unaffordable).toMatchObject({
      purchased: false,
      cost: 250,
      reason: "insufficient-funds",
    });
    expect(maxed).toMatchObject({ purchased: false, cost: null, reason: "max-level" });
    expect(loadSave().money).toBe(249);
  });

  it("claims a custom random gift reward amount from the gift board", () => {
    saveProgress({ money: 1_000, bestMoney: 1_000, nextGiftAt: 0 });

    const result = claimGiftReward(25_000, NOW);

    expect(result).toMatchObject({
      claimed: true,
      amount: 25_000,
      remainingMs: GIFT_COOLDOWN_MS,
    });
    expect(result.save.money).toBe(26_000);
  });
});
