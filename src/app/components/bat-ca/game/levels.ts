import { INITIAL_MAX_DEPTH, MAX_DEPTH_LIMIT, SURFACE_Y } from "./constants";

export type LevelDef = {
  level: number;
  casts: number;
  target: number;
  time: number;
  bottomDepth: number;
  fishSpeedMultiplier: number;
  fishDeepValueChance: number;
  trashChance: number;
};

export const LEVELS: LevelDef[] = [
  { level: 1, casts: 5, target: 150, time: 60, bottomDepth: 550, fishSpeedMultiplier: 0.8, fishDeepValueChance: 0.2, trashChance: 0.05 },
  { level: 2, casts: 5, target: 350, time: 70, bottomDepth: 950, fishSpeedMultiplier: 1.0, fishDeepValueChance: 0.3, trashChance: 0.1 },
  { level: 3, casts: 6, target: 650, time: 80, bottomDepth: 1350, fishSpeedMultiplier: 1.2, fishDeepValueChance: 0.4, trashChance: 0.15 },
  { level: 4, casts: 6, target: 1000, time: 90, bottomDepth: 1750, fishSpeedMultiplier: 1.4, fishDeepValueChance: 0.5, trashChance: 0.2 },
  { level: 5, casts: 7, target: 1500, time: 100, bottomDepth: 2150, fishSpeedMultiplier: 1.6, fishDeepValueChance: 0.6, trashChance: 0.25 },
];

export function getLevelDef(level: number): LevelDef {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  if (safeLevel <= LEVELS.length) {
    return LEVELS[safeLevel - 1];
  }
  // Endless mode: scale up after level 5
  const base = LEVELS[LEVELS.length - 1];
  const extra = safeLevel - LEVELS.length;
  return {
    ...base,
    level: safeLevel,
    casts: Math.min(base.casts + extra, 10),
    target: base.target + extra * 500,
    time: base.time + extra * 10,
    bottomDepth: Math.min(MAX_DEPTH_LIMIT - SURFACE_Y, base.bottomDepth + extra * 400),
    fishSpeedMultiplier: Math.min(base.fishSpeedMultiplier + extra * 0.2, 3.0),
    fishDeepValueChance: Math.min(base.fishDeepValueChance + extra * 0.1, 0.9),
    trashChance: Math.min(base.trashChance + extra * 0.05, 0.4),
  };
}

export function getLevelBottomY(level: LevelDef, gearDepthY: number): number {
  const baseGearDepthY = SURFACE_Y + INITIAL_MAX_DEPTH;
  const upgradeBonus = Math.max(0, gearDepthY - baseGearDepthY);
  return Math.min(MAX_DEPTH_LIMIT, SURFACE_Y + level.bottomDepth + upgradeBonus);
}

export function getDepthZoneName(meters: number): string {
  if (meters < 500) return "Tầng mặt";
  if (meters < 1200) return "Tầng giữa";
  if (meters < 2200) return "Tầng sâu";
  if (meters < 3200) return "Vực tối";
  return "Đáy đại dương";
}

export function getTotalCasts(level: number): number {
  return getLevelDef(level).casts;
}

export function getLevelTarget(level: number): number {
  return getLevelDef(level).target;
}
