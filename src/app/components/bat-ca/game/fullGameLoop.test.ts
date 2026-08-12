import { describe, expect, it, beforeEach } from "vitest";
import {
  isValidPhaseTransition,
  transitionPhase,
  type GameStateArchitecture,
} from "./stateMachine";
import {
  loadSave,
  saveProgress,
  unlockRandomHook,
  selectHook,
  recordDiscoveredFish,
  calculateOfflineEarnings,
  normalizeSave,
} from "./storage";
import { claimOfflineEarnings } from "../dock/progression";
import { getHookUnlockPrice } from "./hooks-data";

// Setup memory storage for vitest node env
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = new MemoryStorage();
}

describe("State Machine Architecture", () => {
  it("allows legal phase transitions", () => {
    expect(isValidPhaseTransition("boot", "dock-idle")).toBe(true);
    expect(isValidPhaseTransition("dock-idle", "power-selecting")).toBe(true);
    expect(isValidPhaseTransition("power-selecting", "underwater-descending")).toBe(true);
    expect(isValidPhaseTransition("underwater-descending", "underwater-ascending")).toBe(true);
    expect(isValidPhaseTransition("underwater-ascending", "catch-result")).toBe(true);
    expect(isValidPhaseTransition("catch-result", "dock-idle")).toBe(true);
  });

  it("rejects illegal phase transitions", () => {
    expect(isValidPhaseTransition("boot", "underwater-ascending")).toBe(false);
    expect(isValidPhaseTransition("underwater-descending", "dock-idle")).toBe(false);
    expect(isValidPhaseTransition("catch-result", "power-selecting")).toBe(false);
  });

  it("updates state architecture cleanly", () => {
    const initial: GameStateArchitecture = { phase: "dock-idle", panel: "hooks", modal: "settings" };
    const next = transitionPhase(initial, "power-selecting");
    expect(next.phase).toBe("power-selecting");
    expect(next.panel).toBe("none");
    expect(next.modal).toBe("none");
  });
});

describe("Storage & Save Migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("handles missing save data with defaults", () => {
    const save = loadSave();
    expect(save.version).toBe(5);
    expect(save.money).toBe(0);
    expect(save.selectedHook).toBe("classic");
    expect(save.unlockedHooks).toEqual(["classic"]);
    expect(save.discoveredFish).toEqual([]);
  });

  it("recovers from malformed JSON save data", () => {
    localStorage.setItem("batca-ao-lang-save", "{ malformed json }");
    const save = loadSave();
    expect(save.money).toBe(0);
    expect(save.selectedHook).toBe("classic");
  });

  it("prevents negative money and NaN values", () => {
    const raw = {
      money: -500,
      bestMoney: Number.NaN,
      unlockedHooks: ["invalid-id", "fast"],
    };
    const save = normalizeSave(raw);
    expect(save.money).toBe(0);
    expect(save.bestMoney).toBe(0);
    expect(save.unlockedHooks).toEqual(["classic", "fast"]);
  });
});

describe("Hook Collection System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("fails to unlock random hook when funds are insufficient", () => {
    saveProgress({ money: 50, unlockedHooks: ["classic"] });
    const res = unlockRandomHook();
    expect(res.success).toBe(false);
    expect(res.reason).toBe("insufficient-funds");
  });

  it("unlocks a random locked hook without duplicates when funds are sufficient", () => {
    saveProgress({ money: 10000, unlockedHooks: ["classic"] });
    const res = unlockRandomHook();
    expect(res.success).toBe(true);
    expect(res.unlockedHookId).toBeDefined();
    expect(res.unlockedHookId).not.toBe("classic");

    const save = loadSave();
    expect(save.money).toBe(10000 - getHookUnlockPrice(1));
    expect(save.unlockedHooks).toContain(res.unlockedHookId);
    expect(save.selectedHook).toBe(res.unlockedHookId);
  });

  it("allows equipping unlocked hooks", () => {
    saveProgress({ unlockedHooks: ["classic", "lucky_gold"] });
    const ok = selectHook("lucky_gold");
    expect(ok).toBe(true);

    const save = loadSave();
    expect(save.selectedHook).toBe("lucky_gold");
  });

  it("prevents equipping locked hooks", () => {
    saveProgress({ unlockedHooks: ["classic"] });
    const ok = selectHook("cyber");
    expect(ok).toBe(false);

    const save = loadSave();
    expect(save.selectedHook).toBe("classic");
  });
});

describe("Aquarium & Fish Discovery System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("records new fish discoveries correctly", () => {
    const newTypes = recordDiscoveredFish(["ro", "tom"]);
    expect(newTypes).toEqual(["ro", "tom"]);

    const save = loadSave();
    expect(save.discoveredFish).toEqual(["ro", "tom"]);
  });

  it("ignores already discovered species without duplicate records", () => {
    recordDiscoveredFish(["ro", "tom"]);
    const secondPass = recordDiscoveredFish(["tom", "chep"]);
    expect(secondPass).toEqual(["chep"]);

    const save = loadSave();
    expect(save.discoveredFish).toEqual(["ro", "tom", "chep"]);
  });
});

describe("Offline Earnings System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates offline earnings for elapsed time", () => {
    const tenMinsAgo = Date.now() - 10 * 60 * 1000;
    saveProgress({ lastActiveAt: tenMinsAgo, offlineRateLevel: 0 }); // 8đ/min

    const calc = calculateOfflineEarnings(Date.now());
    expect(calc.eligibleMinutes).toBe(10);
    expect(calc.amount).toBe(80);
  });

  it("credits offline earnings exactly once without duplicate credit", () => {
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    saveProgress({ money: 100, lastActiveAt: thirtyMinsAgo, offlineRateLevel: 1 }); // 12đ/min

    const firstClaim = claimOfflineEarnings(Date.now());
    expect(firstClaim.claimed).toBe(true);
    expect(firstClaim.amount).toBe(360);

    const saveAfterFirst = loadSave();
    expect(saveAfterFirst.money).toBe(460);

    // Immediate second claim attempt (e.g. modal reopen or refresh)
    const secondClaim = claimOfflineEarnings(Date.now());
    expect(secondClaim.claimed).toBe(false);
    expect(secondClaim.amount).toBe(0);

    const saveAfterSecond = loadSave();
    expect(saveAfterSecond.money).toBe(460);
  });
});
