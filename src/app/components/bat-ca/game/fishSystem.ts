import { LOGICAL_WIDTH, MAX_DEPTH_LIMIT } from "./constants";
import { FISH_KINDS } from "./fish-data";
import { clamp, rand } from "./math";
import type { Fish, FishKind, PlayerStats } from "./types";

let idCounter = 1;
const nextId = () => idCounter++;

function reachableSpawnDepth(maxDepth: number) {
  return Math.min(MAX_DEPTH_LIMIT, maxDepth + 90);
}

function depthForKind(kind: FishKind, maxDepth: number) {
  const lo = kind.depthMin;
  const hi = Math.min(kind.depthMax, reachableSpawnDepth(maxDepth), MAX_DEPTH_LIMIT);
  return hi <= lo ? lo : rand(lo, hi);
}

export function spawnFish(maxDepth: number): Fish {
  const kinds = FISH_KINDS.filter((k) => k.depthMin <= reachableSpawnDepth(maxDepth));
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
    y: depthForKind(kind, maxDepth),
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

export function createStartingFish(maxDepth: number) {
  const fish: Fish[] = [];
  for (let i = 0; i < 16; i++) {
    const f = spawnFish(maxDepth);
    f.x = rand(20, LOGICAL_WIDTH - 20);
    fish.push(f);
  }
  return fish;
}

export function updateFish(
  fish: Fish[],
  net: { x: number; y: number },
  stats: PlayerStats,
  dt: number,
) {
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
        Object.assign(f, spawnFish(stats.maxDepth), { id: f.id });
        continue;
      }
    }
    f.x += f.vx * dt;
    f.wobble += dt * 6;
    f.y += Math.sin(f.wobble) * 4 * dt * 6;
    f.y = clamp(f.y, f.kind.depthMin, Math.min(f.kind.depthMax, MAX_DEPTH_LIMIT));
    if (f.vx > 0 && f.x > LOGICAL_WIDTH + 90) Object.assign(f, spawnFish(stats.maxDepth), { id: f.id });
    else if (f.vx < 0 && f.x < -90) Object.assign(f, spawnFish(stats.maxDepth), { id: f.id });
  }
}

export function recycleFish(fish: Fish, maxDepth: number) {
  Object.assign(fish, spawnFish(maxDepth), { id: fish.id });
}
