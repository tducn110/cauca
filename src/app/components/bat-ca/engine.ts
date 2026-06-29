// Engine cho game "Bắt Cá Ao Làng"
// Render bằng HTML5 Canvas, không backend, logic thuần để dễ test & ổn định.

export const LOGICAL_WIDTH = 390;
export const LOGICAL_HEIGHT = 844;
export const SURFACE_Y = 150;
export const BOTTOM_Y = 820;

export type GameMode = "start" | "playing" | "upgrade" | "result";
export type NetState = "idle" | "dropping" | "pulling";

export type FishKind = {
  type: string;
  name: string;
  value: number;
  depthMin: number; // y tối thiểu (gần mặt nước)
  depthMax: number; // y tối đa (sâu)
  speed: number; // px/s ngang
  size: number; // bán kính thân
  rarity: number; // trọng số spawn (cao = hay gặp)
  isBad: boolean;
  color: string;
  belly: string;
};

export type Fish = {
  id: number;
  kind: FishKind;
  x: number;
  y: number;
  vx: number;
  size: number;
  caught: boolean;
  wobble: number;
};

export type UpgradeType = "depth" | "netSize" | "pullSpeed" | "capacity";

export type UpgradeDef = {
  type: UpgradeType;
  name: string;
  desc: string;
  maxLevel: number;
  costs: number[]; // chi phí cho từng level (index 0 = mua lên level 1)
  apply: (stats: PlayerStats) => void; // áp dụng hiệu ứng 1 cấp
};

export type PlayerStats = {
  money: number;
  bestMoney: number;
  maxDepth: number; // y mà lưới có thể xuống tới
  netSize: number;
  pullSpeed: number;
  dropSpeed: number;
  capacity: number;
};

export type Upgrades = Record<UpgradeType, number>;

export type FeedbackText = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  life: number;
};

export type Ripple = { id: number; x: number; y: number; r: number; age: number };

export type CaughtSummary = {
  count: number;
  earned: number;
  badCount: number;
  items: { name: string; value: number; isBad: boolean }[];
};

// ---------- Cấu hình cá ----------

export const FISH_KINDS: FishKind[] = [
  { type: "longtong", name: "Cá lòng tong", value: 10, depthMin: 180, depthMax: 360, speed: 55, size: 9, rarity: 30, isBad: false, color: "#9fb6c8", belly: "#e8eef3" },
  { type: "ro", name: "Cá rô", value: 18, depthMin: 200, depthMax: 440, speed: 60, size: 12, rarity: 26, isBad: false, color: "#7d8a55", belly: "#cdd79a" },
  { type: "tom", name: "Tôm", value: 22, depthMin: 220, depthMax: 470, speed: 48, size: 10, rarity: 22, isBad: false, color: "#e88a5a", belly: "#f6c6a3" },
  { type: "cua", name: "Cua đồng", value: 30, depthMin: 480, depthMax: 700, speed: 38, size: 14, rarity: 18, isBad: false, color: "#b85a22", belly: "#e0a06a" },
  { type: "tre", name: "Cá trê", value: 45, depthMin: 460, depthMax: 720, speed: 70, size: 15, rarity: 15, isBad: false, color: "#4c5240", belly: "#8a906f" },
  { type: "chep", name: "Cá chép", value: 70, depthMin: 560, depthMax: 800, speed: 80, size: 18, rarity: 10, isBad: false, color: "#c07a3a", belly: "#f0c177" },
  { type: "loc", name: "Cá lóc", value: 95, depthMin: 600, depthMax: 810, speed: 110, size: 17, rarity: 7, isBad: false, color: "#3d4733", belly: "#7c8560" },
  { type: "chepvang", name: "Cá chép vàng", value: 160, depthMin: 650, depthMax: 815, speed: 100, size: 19, rarity: 3, isBad: false, color: "#f0b840", belly: "#ffe39a" },
  { type: "rac", name: "Rác / dép cũ", value: -5, depthMin: 240, depthMax: 620, speed: 18, size: 13, rarity: 16, isBad: true, color: "#6b6354", belly: "#8a8170" },
];

// ---------- Cấu hình nâng cấp ----------

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    type: "depth",
    name: "Độ sâu",
    desc: "Lưới xuống sâu hơn để gặp cá to.",
    maxLevel: 5,
    costs: [80, 180, 360, 640, 1000],
    apply: (s) => { s.maxDepth = Math.min(BOTTOM_Y - 10, s.maxDepth + 120); },
  },
  {
    type: "netSize",
    name: "Cỡ lưới",
    desc: "Bán kính bắt cá lớn hơn.",
    maxLevel: 5,
    costs: [100, 220, 420, 700, 1100],
    apply: (s) => { s.netSize += 6; },
  },
  {
    type: "pullSpeed",
    name: "Tốc độ kéo",
    desc: "Kéo lưới lên nhanh hơn.",
    maxLevel: 5,
    costs: [90, 200, 380, 660, 1050],
    apply: (s) => { s.pullSpeed += 45; },
  },
  {
    type: "capacity",
    name: "Sức chứa",
    desc: "Bắt được nhiều cá hơn mỗi lượt.",
    maxLevel: 5,
    costs: [120, 260, 500, 820, 1300],
    apply: (s) => { s.capacity += 1; },
  },
];

export function upgradeCost(def: UpgradeDef, currentLevel: number): number | null {
  if (currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel];
}

// ---------- localStorage ----------

const STORE_KEY = "batca-ao-lang-save";

export type SaveData = { bestMoney: number };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { bestMoney: Math.max(0, Number(JSON.parse(raw).bestMoney) || 0) };
  } catch { /* ignore */ }
  return { bestMoney: 0 };
}

export function saveBest(bestMoney: number) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ bestMoney })); } catch { /* ignore */ }
}

// ---------- Math helpers ----------

export function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }

// ---------- Game ----------

let idCounter = 1;
const nextId = () => idCounter++;

export type Input = { holding: boolean };

export type HudSnapshot = {
  money: number;
  bestMoney: number;
  depth: number;
  maxDepth: number;
  carrying: number;
  capacity: number;
  lastCatchValue: number;
};

export class Game {
  mode: GameMode = "start";
  stats: PlayerStats;
  upgrades: Upgrades = { depth: 0, netSize: 0, pullSpeed: 0, capacity: 0 };
  fish: Fish[] = [];
  feedback: FeedbackText[] = [];
  ripples: Ripple[] = [];

  net = { x: LOGICAL_WIDTH / 2, y: SURFACE_Y, state: "idle" as NetState };
  carrying: Fish[] = [];
  lastCatchValue = 0;
  lastSummary: CaughtSummary | null = null;

  onSell?: (summary: CaughtSummary) => void;

  constructor() {
    const save = loadSave();
    this.stats = {
      money: 0,
      bestMoney: save.bestMoney,
      maxDepth: 320,
      netSize: 22,
      pullSpeed: 220,
      dropSpeed: 240,
      capacity: 3,
    };
    this.spawnInitial();
  }

  reset() {
    this.stats.money = 0;
    this.upgrades = { depth: 0, netSize: 0, pullSpeed: 0, capacity: 0 };
    this.stats.maxDepth = 320;
    this.stats.netSize = 22;
    this.stats.pullSpeed = 220;
    this.stats.dropSpeed = 240;
    this.stats.capacity = 3;
    this.net = { x: LOGICAL_WIDTH / 2, y: SURFACE_Y, state: "idle" };
    this.carrying = [];
    this.lastCatchValue = 0;
    this.fish = [];
    this.spawnInitial();
    this.mode = "playing";
  }

  private depthForKind(k: FishKind) {
    // chỉ spawn ở vùng nước hợp lệ và không quá sâu hơn maxDepth + chút đệm
    const lo = k.depthMin;
    const hi = Math.min(k.depthMax, BOTTOM_Y - 8);
    return rand(lo, hi);
  }

  private makeFish(): Fish {
    const total = FISH_KINDS.reduce((a, k) => a + k.rarity, 0);
    let r = Math.random() * total;
    let kind = FISH_KINDS[0];
    for (const k of FISH_KINDS) { r -= k.rarity; if (r <= 0) { kind = k; break; } }
    const dir = Math.random() < 0.5 ? -1 : 1;
    return {
      id: nextId(),
      kind,
      x: dir < 0 ? LOGICAL_WIDTH + rand(10, 80) : -rand(10, 80),
      y: this.depthForKind(kind),
      vx: dir * kind.speed * rand(0.8, 1.2),
      size: kind.size,
      caught: false,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  private spawnInitial() {
    for (let i = 0; i < 14; i++) {
      const f = this.makeFish();
      f.x = rand(20, LOGICAL_WIDTH - 20);
      this.fish.push(f);
    }
  }

  // ---- input ----
  startDrop() {
    if (this.mode !== "playing") return;
    if (this.net.state === "idle") this.net.state = "dropping";
  }
  startPull() {
    if (this.net.state === "dropping") this.net.state = "pulling";
  }

  buyUpgrade(type: UpgradeType): boolean {
    const def = UPGRADE_DEFS.find((d) => d.type === type)!;
    const lvl = this.upgrades[type];
    const cost = upgradeCost(def, lvl);
    if (cost === null) return false;
    if (this.stats.money < cost) return false;
    this.stats.money -= cost;
    this.upgrades[type] = lvl + 1;
    def.apply(this.stats);
    return true;
  }

  private addFeedback(x: number, y: number, text: string, color: string) {
    this.feedback.push({ id: nextId(), x, y, text, color, age: 0, life: 1.1 });
  }

  private sellCatch() {
    let total = 0;
    let badCount = 0;
    const items = this.carrying.map((f) => {
      total += f.kind.value;
      if (f.kind.isBad) badCount++;
      return { name: f.kind.name, value: f.kind.value, isBad: f.kind.isBad };
    });
    total = Math.max(0, total);
    this.stats.money += total;
    this.lastCatchValue = total;
    if (total > 0) this.addFeedback(this.net.x, SURFACE_Y - 6, `+${total}đ`, "#e87432");
    if (this.stats.money > this.stats.bestMoney) {
      this.stats.bestMoney = this.stats.money;
      saveBest(this.stats.bestMoney);
    }
    const summary: CaughtSummary = { count: items.length, earned: total, badCount, items };
    this.lastSummary = summary;
    this.carrying = [];
    this.net.state = "idle";
    this.ripples.push({ id: nextId(), x: this.net.x, y: SURFACE_Y, r: 6, age: 0 });
    this.mode = "result";
    this.onSell?.(summary);
  }

  private updateNet(dt: number) {
    const n = this.net;
    if (n.state === "dropping") {
      n.y += this.stats.dropSpeed * dt;
      if (n.y >= this.stats.maxDepth) { n.y = this.stats.maxDepth; n.state = "pulling"; }
    } else if (n.state === "pulling") {
      n.y -= this.stats.pullSpeed * dt;
      // bắt cá khi đang kéo lên
      if (this.carrying.length < this.stats.capacity) {
        for (const f of this.fish) {
          if (f.caught) continue;
          const dx = f.x - n.x;
          const dy = f.y - n.y;
          const rr = this.stats.netSize + f.size;
          if (dx * dx + dy * dy <= rr * rr) {
            f.caught = true;
            this.carrying.push(f);
            const c = f.kind.isBad ? "#c23838" : "#6b8e3d";
            this.addFeedback(f.x, f.y, f.kind.isBad ? "Rác!" : f.kind.name, c);
            if (this.carrying.length >= this.stats.capacity) break;
          }
        }
      }
      if (n.y <= SURFACE_Y) { n.y = SURFACE_Y; this.sellCatch(); }
    }
  }

  update(dt: number, input: Input) {
    dt = clamp(dt, 0, 0.05); // clamp delta time
    if (this.mode === "playing") {
      if (input.holding) this.startDrop(); else this.startPull();
    }

    // cá di chuyển (luôn chạy để ao sống động)
    for (const f of this.fish) {
      if (f.caught) {
        // bám theo lưới
        f.x += (this.net.x - f.x) * Math.min(1, dt * 12);
        f.y += (this.net.y - f.y) * Math.min(1, dt * 12);
        continue;
      }
      f.x += f.vx * dt;
      f.wobble += dt * 6;
      f.y += Math.sin(f.wobble) * 4 * dt * 6;
      f.y = clamp(f.y, f.kind.depthMin, Math.min(f.kind.depthMax, BOTTOM_Y - 6));
      if (f.vx > 0 && f.x > LOGICAL_WIDTH + 90) this.recycle(f);
      else if (f.vx < 0 && f.x < -90) this.recycle(f);
    }

    if (this.mode === "playing" || this.mode === "result") this.updateNet(dt);

    // duy trì số lượng cá (object pooling đơn giản)
    const aliveFree = this.fish.filter((f) => !f.caught).length;
    if (aliveFree < 14 && this.fish.length < 22) {
      if (Math.random() < dt * 4) this.fish.push(this.makeFish());
    }
    // dọn cá đã caught & đã bán (không còn bám lưới ở idle)
    if (this.net.state === "idle") this.fish = this.fish.filter((f) => !f.caught);

    // feedback & ripple
    for (const t of this.feedback) { t.age += dt; t.y -= dt * 24; }
    this.feedback = this.feedback.filter((t) => t.age < t.life);
    for (const rp of this.ripples) { rp.age += dt; rp.r += dt * 60; }
    this.ripples = this.ripples.filter((rp) => rp.age < 0.8);
  }

  private recycle(f: Fish) {
    const fresh = this.makeFish();
    Object.assign(f, fresh, { id: f.id });
  }

  hud(): HudSnapshot {
    return {
      money: Math.round(this.stats.money),
      bestMoney: Math.round(this.stats.bestMoney),
      depth: Math.round(this.net.y - SURFACE_Y),
      maxDepth: Math.round(this.stats.maxDepth - SURFACE_Y),
      carrying: this.carrying.length,
      capacity: this.stats.capacity,
      lastCatchValue: Math.round(this.lastCatchValue),
    };
  }
}
