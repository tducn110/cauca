import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "./createInitialState";
import { FISH_KINDS } from "./fish-data";
import { spawnFish } from "./fishSystem";
import { updateNet } from "./fishingSystem";
import { getLevelDef } from "./levels";
import { loadSave, saveProgress } from "./storage";
import type { Input } from "./types";

const STORE_KEY = "batca-ao-lang-save";

function installMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  });
  return store;
}

const input: Input = {
  pointerDown: false,
  pointerX: 195,
  pointerY: 250,
  deltaY: 0,
  gestureStartY: 250,
  gestureDeltaY: 0,
  justPressed: false,
  justReleased: false,
  hasPointer: false,
};

describe("gameplay hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installMemoryStorage();
  });

  it("persists pending shop buffs across reload-safe save/load", () => {
    saveProgress({
      money: 810,
      pendingBuffs: { time: 15, dynamite: 1 },
    });

    const save = loadSave();

    expect(save.money).toBe(810);
    expect(save.pendingBuffs).toEqual({ dynamite: 1, time: 15 });
  });

  it("migrates older saves while preserving pending buffs when present", () => {
    const store = installMemoryStorage({
      [STORE_KEY]: JSON.stringify({
        version: 3,
        money: 500,
        bestMoney: 500,
        bestRunScore: 250,
        lastRunScore: 200,
        upgrades: { depth: 1, netSize: 0, pullSpeed: 0, capacity: 0 },
        pendingBuffs: { bigNet: 8, strength: 10, bogus: 100 },
      }),
    });

    const save = loadSave();
    const written = JSON.parse(store.get(STORE_KEY) ?? "{}") as { version?: number };

    expect(save.version).toBe(5);
    expect(written.version).toBe(5);
    expect(save.pendingBuffs).toEqual({ strength: 10, bigNet: 8 });
  });

  it("does not spawn fish above the current level gate", () => {
    for (let i = 0; i < 200; i++) {
      const fish = spawnFish(4000, 2400, 1);
      expect(fish.kind.minLevel ?? 1).toBeLessThanOrEqual(1);
    }
  });

  it("does not catch new fish during forced timeout return", () => {
    const state = createInitialState(undefined, getLevelDef(1));
    const kind = FISH_KINDS[0];
    state.mode = "playing";
    state.timeUp = true;
    state.net = { x: 195, y: 300, state: "pulling", tension: 1, pulse: 0, stun: 0 };
    state.fish = [{
      id: 99,
      kind,
      x: 195,
      y: 300,
      vx: 0,
      size: kind.size,
      caught: false,
      wobble: 0,
      flash: 0,
    }];

    updateNet(
      state,
      input,
      0.016,
      (_x: number, _y: number, _text: string, _color: string): void => {},
      (_x: number, _y: number, _r?: number, _life?: number): void => {},
    );

    expect(state.carrying).toHaveLength(0);
    expect(state.fish[0]?.caught).toBe(false);
  });
});
