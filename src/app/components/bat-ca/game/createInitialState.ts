import { LOGICAL_WIDTH, SURFACE_Y, MAX_DEPTH_LIMIT } from "./constants";
import { FISH_KINDS } from "./fish-data";
import { createStartingFish } from "./fishSystem";
import { loadSave } from "./storage";
import { rand } from "./math";
import type { Fish, GameState, GameMode, NetState, PlayerStats, Upgrades } from "./types";

let idCounter = 1;
const nextId = () => idCounter++;

function makeFish(maxDepth: number, netSize: number): Fish {
  const spawnY = Math.min(SURFACE_Y + maxDepth + netSize, MAX_DEPTH_LIMIT);
  const kinds = FISH_KINDS.filter((k) => k.depthMin <= spawnY);
  const chosen = kinds.length > 0 ? kinds : FISH_KINDS.slice(0, 1);
  const total = chosen.reduce((a, k) => a + k.rarity, 0);
  let r = Math.random() * total;
  let kind = chosen[0];
  for (const k of chosen) {
    r -= k.rarity;
    if (r <= 0) {
      kind = k;
      break;
    }
  }
  const dir = Math.random() < 0.5 ? -1 : 1;
  const fish: Fish = {
    id: nextId(),
    kind,
    x: dir < 0 ? LOGICAL_WIDTH + rand(10, 80) : -rand(10, 80),
    y: Math.min(kind.depthMax, Math.max(kind.depthMin, rand(kind.depthMin, Math.min(kind.depthMax, spawnY)))),
    vx: dir * kind.speed * rand(0.8, 1.2),
    size: kind.size,
    caught: false,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
  };
  if (kind.behavior === "mystery") {
    fish.overrideValue = Math.floor(rand(40, 180));
  }
  if (kind.behavior === "golden") {
    fish.life = rand(3, 5);
  }
  return fish;
}

export function createInitialState(saved?: ReturnType<typeof loadSave>): GameState {
  const save = saved ?? loadSave();
  const stats: PlayerStats = {
    money: 0,
    bestMoney: save.bestMoney,
    maxDepth: SURFACE_Y + save.maxDepth,
    netSize: save.netSize,
    pullSpeed: save.pullSpeed,
    dropSpeed: 240,
    capacity: save.capacity,
  };
  const fish = createStartingFish(stats.maxDepth);
  return {
    mode: "start" as GameMode,
    net: { x: LOGICAL_WIDTH / 2, y: SURFACE_Y, state: "idle" as NetState, tension: 0, pulse: 0, stun: 0 },
    stats,
    upgrades: { depth: 0, netSize: 0, pullSpeed: 0, capacity: 0 } as Upgrades,
    fish,
    carrying: [] as Fish[],
    feedback: [],
    ripples: [],
    lastCatchValue: 0,
    lastSummary: null,
    shake: 0,
    levelTimeLeft: 60,
    timeUp: false,
    combo: { count: 0, species: null },
    activeBuffs: {},
    nextLevelBuffs: {},
  } satisfies GameState;
}

export { makeFish };
