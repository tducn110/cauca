import {
  INITIAL_CAPACITY,
  INITIAL_MAX_DEPTH,
  INITIAL_NET_SIZE,
  INITIAL_PULL_SPEED,
  LOGICAL_WIDTH,
  SURFACE_Y,
} from "./constants";
import { createStartingFish } from "./fishSystem";
import { loadSave } from "./storage";
import type { Fish, GameState, GameMode, NetState, PlayerStats, Upgrades } from "./types";
import { UPGRADE_DEFS } from "./upgrades";
import { getLevelBottomY, getLevelDef, type LevelDef } from "./levels";

export function createInitialState(saved?: ReturnType<typeof loadSave>, levelDef: LevelDef = getLevelDef(1)): GameState {
  const save = saved ?? loadSave();
  const upgrades: Upgrades = { ...save.upgrades };
  const stats: PlayerStats = {
    money: save.money,
    bestMoney: save.bestMoney,
    maxDepth: SURFACE_Y + INITIAL_MAX_DEPTH,
    netSize: INITIAL_NET_SIZE,
    pullSpeed: INITIAL_PULL_SPEED,
    dropSpeed: 240,
    capacity: INITIAL_CAPACITY,
  };
  for (const def of UPGRADE_DEFS) {
    for (let level = 0; level < upgrades[def.type]; level++) def.apply(stats);
  }
  const levelBottomY = getLevelBottomY(levelDef, stats.maxDepth);
  const fish = createStartingFish(levelBottomY, 0, levelDef.level);
  return {
    mode: "start" as GameMode,
    level: levelDef.level,
    levelBottomY,
    net: { x: LOGICAL_WIDTH / 2, y: SURFACE_Y, state: "idle" as NetState, tension: 0, pulse: 0, stun: 0 },
    stats,
    upgrades,
    fish,
    carrying: [] as Fish[],
    feedback: [],
    ripples: [],
    lastCatchValue: 0,
    lastSummary: null,
    shake: 0,
    levelTimeLeft: levelDef.time,
    timeUp: false,
    combo: { count: 0, species: null },
    activeBuffs: {},
    nextLevelBuffs: { ...save.pendingBuffs },
    cameraY: 0,
  } satisfies GameState;
}
