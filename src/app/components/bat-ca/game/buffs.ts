import type { BuffType, GameState } from "./types";

export type BuffDef = {
  type: BuffType;
  name: string;
  desc: string;
  cost: number;
  unit: string;
  value: number;
};

export const BUFF_DEFS: BuffDef[] = [
  {
    type: "dynamite",
    name: "Thuốc nổ",
    desc: "Phá hủy toàn bộ rác/lươn đang trong lưới. Dùng trong màn chơi.",
    cost: 60,
    unit: "quả",
    value: 1,
  },
  {
    type: "strength",
    name: "Nước tăng lực",
    desc: "Kéo lưới nhanh hơn 50% trong 10 giây.",
    cost: 80,
    unit: "giây",
    value: 10,
  },
  {
    type: "time",
    name: "Đồng hồ cát",
    desc: "Thêm 15 giây cho màn chơi sau.",
    cost: 70,
    unit: "giây",
    value: 15,
  },
  {
    type: "bigNet",
    name: "Lưới khổng lồ",
    desc: "Bán kính lưới +50% trong 8 giây.",
    cost: 90,
    unit: "giây",
    value: 8,
  },
];

export function getBuffValue(type: BuffType, state: GameState): number {
  return state.activeBuffs[type] ?? 0;
}

export function hasActiveBuff(type: BuffType, state: GameState): boolean {
  return (state.activeBuffs[type] ?? 0) > 0;
}

export function tickBuffs(state: GameState, dt: number) {
  if (state.mode !== "playing") return;

  if (state.activeBuffs.strength) {
    state.activeBuffs.strength = Math.max(0, state.activeBuffs.strength - dt);
    if (state.activeBuffs.strength <= 0) delete state.activeBuffs.strength;
  }
  if (state.activeBuffs.bigNet) {
    state.activeBuffs.bigNet = Math.max(0, state.activeBuffs.bigNet - dt);
    if (state.activeBuffs.bigNet <= 0) delete state.activeBuffs.bigNet;
  }
}

export function netSizeBonus(state: GameState): number {
  if (state.activeBuffs.bigNet && state.activeBuffs.bigNet > 0) {
    return state.stats.netSize * 0.5;
  }
  return 0;
}

export function pullSpeedMult(state: GameState): number {
  if (state.activeBuffs.strength && state.activeBuffs.strength > 0) {
    return 1.5;
  }
  return 1;
}

export function applyLevelStartBuffs(state: GameState) {
  // Chuyển buff mua ở shop sang active
  state.activeBuffs = { ...state.nextLevelBuffs };
  state.nextLevelBuffs = {};

  // Thời gian được cộng ngay.
  if (state.activeBuffs.time) {
    state.levelTimeLeft += state.activeBuffs.time;
    delete state.activeBuffs.time;
  }
}

export function buyBuff(state: GameState, type: BuffType): boolean {
  const def = BUFF_DEFS.find((d) => d.type === type);
  if (!def) return false;
  if (state.stats.money < def.cost) return false;

  state.stats.money -= def.cost;
  const current = state.nextLevelBuffs[type] ?? 0;
  state.nextLevelBuffs[type] = current + def.value;
  return true;
}

export function useDynamite(state: GameState): boolean {
  const count = state.activeBuffs.dynamite ?? 0;
  if (count <= 0) return false;
  const destroyed = new Set(state.carrying.filter((fish) => fish.kind.isBad));
  if (destroyed.size === 0) return false;

  state.carrying = state.carrying.filter((fish) => !destroyed.has(fish));
  state.fish = state.fish.filter((fish) => !destroyed.has(fish));
  state.activeBuffs.dynamite = count - 1;
  if (state.activeBuffs.dynamite <= 0) delete state.activeBuffs.dynamite;
  return true;
}
