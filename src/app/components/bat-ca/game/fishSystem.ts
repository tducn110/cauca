import { LOGICAL_WIDTH, LOGICAL_HEIGHT, MAX_DEPTH_LIMIT, SURFACE_Y } from "./constants";
import { FISH_KINDS } from "./fish-data";
import { getLevelDef } from "./levels";
import { clamp, rand } from "./math";
import type { Fish, FishKind } from "./types";

let idCounter = 1;
const nextId = () => idCounter++;

function safeBottomY(bottomY: number): number {
  return clamp(Number.isFinite(bottomY) ? bottomY : SURFACE_Y + 1, SURFACE_Y + 1, MAX_DEPTH_LIMIT);
}

function spawnWindow(bottomY: number, cameraY: number): { min: number; max: number } {
  const bottom = safeBottomY(bottomY);
  const minCam = Math.max(SURFACE_Y, cameraY - 400);
  const maxCam = Math.min(bottom, cameraY + LOGICAL_HEIGHT + 400);
  return { min: Math.min(minCam, maxCam), max: Math.max(minCam, maxCam) };
}

function depthForKind(kind: FishKind, bottomY: number, cameraY: number): number {
  const window = spawnWindow(bottomY, cameraY);
  const lo = Math.max(kind.depthMin, window.min);
  const hi = Math.min(kind.depthMax, safeBottomY(bottomY), window.max);
  return hi <= lo ? lo : rand(lo, hi);
}

function weightedKind(kinds: FishKind[]): FishKind {
  const total = kinds.reduce((sum, kind) => sum + kind.rarity, 0);
  let roll = Math.random() * total;
  for (const kind of kinds) {
    roll -= kind.rarity;
    if (roll <= 0) return kind;
  }
  return kinds[kinds.length - 1];
}

export function spawnFish(bottomY: number, cameraY: number = 0, level: number = 1): Fish {
  const bottom = safeBottomY(bottomY);
  const window = spawnWindow(bottom, cameraY);
  const levelDef = getLevelDef(level);

  const levelKinds = FISH_KINDS.filter((kind) => (kind.minLevel ?? 1) <= level);
  const available = levelKinds.filter((kind) => (
    kind.depthMin <= bottom && kind.depthMin <= window.max && kind.depthMax >= window.min
  ));
  const fallback = levelKinds.filter((kind) => kind.depthMin <= bottom);
  const candidates = available.length > 0 ? available : fallback.length > 0 ? fallback : [FISH_KINDS[0]];
  const badKinds = candidates.filter((kind) => kind.isBad);
  const goodKinds = candidates.filter((kind) => !kind.isBad);
  const deepStart = SURFACE_Y + (bottom - SURFACE_Y) * 0.55;
  const deepKinds = goodKinds.filter((kind) => kind.depthMax >= deepStart);

  let pool = goodKinds.length > 0 ? goodKinds : candidates;
  if (badKinds.length > 0 && Math.random() < levelDef.trashChance) {
    pool = badKinds;
  } else if (deepKinds.length > 0 && Math.random() < levelDef.fishDeepValueChance) {
    pool = deepKinds;
  }

  const kind = weightedKind(pool);
  const dir = Math.random() < 0.5 ? -1 : 1;
  const fish: Fish = {
    id: nextId(),
    kind,
    x: dir < 0 ? LOGICAL_WIDTH + rand(10, 80) : -rand(10, 80),
    y: depthForKind(kind, bottom, cameraY),
    vx: dir * kind.speed * levelDef.fishSpeedMultiplier * rand(0.8, 1.2),
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

export function createStartingFish(bottomY: number, cameraY: number = 0, level: number = 1) {
  const fish: Fish[] = [];
  for (let i = 0; i < 16; i++) {
    const f = spawnFish(bottomY, cameraY, level);
    f.x = rand(20, LOGICAL_WIDTH - 20);
    fish.push(f);
  }
  return fish;
}

export function updateFish(
  fish: Fish[],
  net: { x: number; y: number },
  dt: number,
  cameraY: number,
  bottomY: number,
  level: number,
) {
  const bottom = safeBottomY(bottomY);
  const activeMin = Math.max(SURFACE_Y, cameraY - 500);
  const activeMax = Math.min(bottom, cameraY + LOGICAL_HEIGHT + 500);

  for (const f of fish) {
    f.flash = Math.max(0, f.flash - dt);
    if (f.caught) {
      f.x += (net.x - f.x) * Math.min(1, dt * 12);
      f.y += (net.y - f.y) * Math.min(1, dt * 12);
      continue;
    }
    if (f.life !== undefined) {
      f.life -= dt;
      if (f.life <= 0) {
        Object.assign(f, spawnFish(bottom, cameraY, level), { id: f.id });
        continue;
      }
    }
    if (f.y < activeMin || f.y > activeMax) {
      Object.assign(f, spawnFish(bottom, cameraY, level), { id: f.id });
      continue;
    }
    f.x += f.vx * dt;
    f.wobble += dt * 6;
    f.y += Math.sin(f.wobble) * 4 * dt * 6;
    f.y = clamp(f.y, f.kind.depthMin, Math.min(f.kind.depthMax, bottom));
    if (f.vx > 0 && f.x > LOGICAL_WIDTH + 90) Object.assign(f, spawnFish(bottom, cameraY, level), { id: f.id });
    else if (f.vx < 0 && f.x < -90) Object.assign(f, spawnFish(bottom, cameraY, level), { id: f.id });
  }
}

export function recycleFish(fish: Fish, bottomY: number, cameraY: number = 0, level: number = 1) {
  Object.assign(fish, spawnFish(bottomY, cameraY, level), { id: fish.id });
}
