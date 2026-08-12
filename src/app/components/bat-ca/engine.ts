// Engine cho game "Bắt Cá Ao Làng"
// Render bằng PixiJS, không backend, logic thuần để dễ test và ổn định.

import { LOGICAL_WIDTH, SURFACE_Y } from "./game/constants";
import { createInitialState } from "./game/createInitialState";
import { updateGame } from "./game/updateGame";
import { UPGRADE_DEFS, upgradeCost } from "./game/upgrades";
import { applyLevelStartBuffs, buyBuff, useDynamite } from "./game/buffs";
import { loadSave, saveProgress } from "./game/storage";
import { createStartingFish } from "./game/fishSystem";
import { getLevelBottomY, getLevelDef, type LevelDef } from "./game/levels";
import type {
  BuffState,
  BuffType,
  CaughtSummary,
  ComboState,
  FeedbackText,
  Fish,
  GameMode,
  HudSnapshot,
  Input,
  NetState,
  PlayerStats,
  Ripple,
  GameState,
  UpgradeType,
  Upgrades,
} from "./game/types";

export { LOGICAL_HEIGHT, LOGICAL_WIDTH, SURFACE_Y } from "./game/constants";
export { UPGRADE_DEFS, upgradeCost } from "./game/upgrades";
export { BUFF_DEFS } from "./game/buffs";
export type {
  BuffState,
  BuffType,
  CaughtSummary,
  ComboState,
  FeedbackText,
  Fish,
  GameMode,
  HudSnapshot,
  Input,
  NetState,
  PlayerStats,
  Ripple,
  UpgradeType,
  Upgrades,
} from "./game/types";

// ---------- Game ----------

export const EMPTY_INPUT: Input = {
  pointerDown: false,
  pointerX: LOGICAL_WIDTH / 2,
  pointerY: SURFACE_Y,
  deltaY: 0,
  gestureStartY: SURFACE_Y,
  gestureDeltaY: 0,
  justPressed: false,
  justReleased: false,
  hasPointer: false,
};

export class Game implements GameState {
  mode: GameMode = "start";
  level = 1;
  levelBottomY = SURFACE_Y;
  stats: PlayerStats;
  upgrades: Upgrades = { depth: 0, netSize: 0, pullSpeed: 0, capacity: 0 };
  fish: Fish[] = [];
  feedback: FeedbackText[] = [];
  ripples: Ripple[] = [];

  net = { x: LOGICAL_WIDTH / 2, y: SURFACE_Y, state: "idle" as NetState, tension: 0, pulse: 0, stun: 0 };
  carrying: Fish[] = [];
  lastCatchValue = 0;
  lastSummary: CaughtSummary | null = null;
  shake = 0;
  levelTimeLeft = 60;
  timeUp = false;
  combo: ComboState = { count: 0, species: null };
  activeBuffs: BuffState = {};
  nextLevelBuffs: BuffState = {};
  cameraY = 0;

  onSell?: (summary: CaughtSummary) => void;

  constructor() {
    const initial = createInitialState();
    this.mode = initial.mode;
    this.level = initial.level;
    this.levelBottomY = initial.levelBottomY;
    this.stats = initial.stats;
    this.upgrades = initial.upgrades;
    this.net = initial.net;
    this.fish = initial.fish;
    this.carrying = initial.carrying;
    this.feedback = initial.feedback;
    this.ripples = initial.ripples;
    this.lastCatchValue = initial.lastCatchValue;
    this.lastSummary = initial.lastSummary;
    this.shake = initial.shake;
    this.levelTimeLeft = initial.levelTimeLeft;
    this.timeUp = initial.timeUp;
    this.combo = initial.combo;
    this.activeBuffs = initial.activeBuffs;
    this.nextLevelBuffs = initial.nextLevelBuffs;
    this.cameraY = initial.cameraY;
  }

  reset(levelDef: LevelDef = getLevelDef(1)) {
    const save = loadSave();
    const initial = createInitialState(save, levelDef);
    this.mode = "playing";
    this.level = initial.level;
    this.levelBottomY = initial.levelBottomY;
    this.stats = initial.stats;
    this.upgrades = initial.upgrades;
    this.net = initial.net;
    this.fish = initial.fish;
    this.carrying = initial.carrying;
    this.feedback = initial.feedback;
    this.ripples = initial.ripples;
    this.lastCatchValue = initial.lastCatchValue;
    this.lastSummary = initial.lastSummary;
    this.shake = initial.shake;
    this.levelTimeLeft = initial.levelTimeLeft;
    this.timeUp = initial.timeUp;
    this.combo = initial.combo;
    this.activeBuffs = initial.activeBuffs;
    this.nextLevelBuffs = initial.nextLevelBuffs;
    this.cameraY = initial.cameraY;
  }

  startLevel(levelDef: LevelDef) {
    const save = loadSave();
    const fresh = createInitialState(save, levelDef);
    const pendingBuffs = { ...this.nextLevelBuffs };
    // Giữ tiền, chỉ số và nâng cấp đã mua; reset trạng thái màn chơi
    const { stats, upgrades } = this;
    this.level = levelDef.level;
    this.levelBottomY = getLevelBottomY(levelDef, stats.maxDepth);
    this.fish = createStartingFish(this.levelBottomY, 0, this.level);
    this.net = { ...fresh.net };
    this.carrying = fresh.carrying;
    this.feedback = fresh.feedback;
    this.ripples = fresh.ripples;
    this.lastCatchValue = fresh.lastCatchValue;
    this.lastSummary = fresh.lastSummary;
    this.shake = fresh.shake;
    this.levelTimeLeft = levelDef.time;
    this.timeUp = false;
    this.combo = { count: 0, species: null };
    this.activeBuffs = {};
    this.nextLevelBuffs = pendingBuffs;
    this.cameraY = 0;
    this.stats = stats;
    this.upgrades = upgrades;
    this.mode = "playing";
    applyLevelStartBuffs(this);
    this.saveStats();
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
    if (type === "depth") {
      this.levelBottomY = getLevelBottomY(getLevelDef(this.level), this.stats.maxDepth);
      if (this.net.state === "idle") {
        this.fish = createStartingFish(this.levelBottomY, this.cameraY, this.level);
      }
    }
    this.saveStats();
    return true;
  }

  saveStats() {
    saveProgress({
      money: this.stats.money,
      bestMoney: this.stats.bestMoney,
      upgrades: { ...this.upgrades },
      pendingBuffs: { ...this.nextLevelBuffs },
    });
  }

  buyBuff(type: BuffType): boolean {
    const purchased = buyBuff(this, type);
    if (purchased) this.saveStats();
    return purchased;
  }

  useDynamite(): boolean {
    const ok = useDynamite(this);
    if (ok) {
      this.feedback.push({
        id: this.feedback.length + this.ripples.length + 1,
        x: this.net.x,
        y: this.net.y,
        text: "BOOM!",
        color: "#e87432",
        age: 0,
        life: 1.0,
      });
      this.ripples.push({
        id: this.feedback.length + this.ripples.length + 1,
        x: this.net.x,
        y: this.net.y,
        r: 8,
        age: 0,
        life: 0.7,
      });
      this.shake = Math.max(this.shake, 0.5);
    }
    return ok;
  }

  update(dt: number, input: Input) {
    updateGame(this, input, dt);
  }

  hud(): HudSnapshot {
    const totalWeight = this.carrying.reduce((s, f) => s + f.kind.weight, 0);
    const goodCount = this.carrying.filter((f) => !f.kind.isBad).length;
    const comboMult = 1 + Math.min(Math.max(0, goodCount - 1), 5) * 0.1;
    return {
      money: Math.round(this.stats.money),
      bestMoney: Math.round(this.stats.bestMoney),
      depth: Math.round(this.net.y - SURFACE_Y),
      maxDepth: Math.round(this.levelBottomY - SURFACE_Y),
      carrying: this.carrying.length,
      capacity: this.stats.capacity,
      lastCatchValue: Math.round(this.lastCatchValue),
      timeLeft: Math.max(0, Math.ceil(this.levelTimeLeft)),
      comboCount: this.combo.count,
      comboMultiplier: comboMult,
      totalWeight: Math.round(totalWeight),
      activeBuffs: { ...this.activeBuffs },
    };
  }
}
