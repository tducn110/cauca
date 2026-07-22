import { DEPTH_UPGRADE_DELTA, MAX_DEPTH_LIMIT } from "./constants";
import { UPGRADE_META } from "./fish-data";
import type { PlayerStats, UpgradeType } from "./types";

export type UpgradeDef = {
  type: UpgradeType;
  name: string;
  desc: string;
  effectLabel: string;
  maxLevel: number;
  costs: number[];
  apply: (stats: PlayerStats) => void;
};

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    type: "depth",
    name: UPGRADE_META.depth.name,
    desc: "Lưới xuống sâu hơn, gặp loài cá mới.",
    effectLabel: "+400m độ sâu",
    maxLevel: UPGRADE_META.depth.maxLevel,
    costs: [...UPGRADE_META.depth.costs],
    apply: (s) => { s.maxDepth = Math.min(MAX_DEPTH_LIMIT, s.maxDepth + DEPTH_UPGRADE_DELTA); },
  },
  {
    type: "netSize",
    name: UPGRADE_META.netSize.name,
    desc: UPGRADE_META.netSize.desc,
    effectLabel: "+8 bán kính lưới",
    maxLevel: UPGRADE_META.netSize.maxLevel,
    costs: [...UPGRADE_META.netSize.costs],
    apply: (s) => { s.netSize += 8; },
  },
  {
    type: "pullSpeed",
    name: UPGRADE_META.pullSpeed.name,
    desc: UPGRADE_META.pullSpeed.desc,
    effectLabel: "+50 tốc độ kéo",
    maxLevel: UPGRADE_META.pullSpeed.maxLevel,
    costs: [...UPGRADE_META.pullSpeed.costs],
    apply: (s) => { s.pullSpeed += 50; },
  },
  {
    type: "capacity",
    name: UPGRADE_META.capacity.name,
    desc: UPGRADE_META.capacity.desc,
    effectLabel: "+2 chỗ trong giỏ",
    maxLevel: UPGRADE_META.capacity.maxLevel,
    costs: [...UPGRADE_META.capacity.costs],
    apply: (s) => { s.capacity += 2; },
  },
];

export function upgradeCost(def: UpgradeDef, currentLevel: number): number | null {
  if (currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel];
}
