export type LevelDef = {
  level: number;
  casts: number;
  target: number;
  time: number;
  fishSpeedMultiplier: number;
  fishDeepValueChance: number;
  trashChance: number;
};

export const LEVELS: LevelDef[] = [
  { level: 1, casts: 5, target: 150, time: 60, fishSpeedMultiplier: 0.8, fishDeepValueChance: 0.2, trashChance: 0.05 },
  { level: 2, casts: 5, target: 350, time: 70, fishSpeedMultiplier: 1.0, fishDeepValueChance: 0.3, trashChance: 0.1 },
  { level: 3, casts: 6, target: 650, time: 80, fishSpeedMultiplier: 1.2, fishDeepValueChance: 0.4, trashChance: 0.15 },
  { level: 4, casts: 6, target: 1000, time: 90, fishSpeedMultiplier: 1.4, fishDeepValueChance: 0.5, trashChance: 0.2 },
  { level: 5, casts: 7, target: 1500, time: 100, fishSpeedMultiplier: 1.6, fishDeepValueChance: 0.6, trashChance: 0.25 },
];

export function getLevelDef(level: number): LevelDef {
  if (level <= LEVELS.length) {
    return LEVELS[level - 1];
  }
  // Endless mode: scale up after level 5
  const base = LEVELS[LEVELS.length - 1];
  const extra = level - LEVELS.length;
  return {
    ...base,
    level,
    casts: Math.min(base.casts + extra, 10),
    target: base.target + extra * 500,
    time: base.time + extra * 10,
    fishSpeedMultiplier: Math.min(base.fishSpeedMultiplier + extra * 0.2, 3.0),
    fishDeepValueChance: Math.min(base.fishDeepValueChance + extra * 0.1, 0.9),
    trashChance: Math.min(base.trashChance + extra * 0.05, 0.4),
  };
}

export function getTotalCasts(level: number): number {
  return getLevelDef(level).casts;
}

export function getLevelTarget(level: number): number {
  return getLevelDef(level).target;
}
