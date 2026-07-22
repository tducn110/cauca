export type GameMode = "start" | "playing" | "upgrade" | "shop" | "result" | "roundSummary" | "levelSummary" | "paused";
export type NetState = "idle" | "dropping" | "pulling" | "returning" | "stunned";

export type FishBehavior = "normal" | "fast" | "electric" | "mystery" | "golden";

export type BuffType = "dynamite" | "strength" | "time" | "bigNet";
export type BuffState = Partial<Record<BuffType, number>>;

export type FishKind = {
  type: string;
  name: string;
  value: number;
  weight: number;
  depthMin: number;
  depthMax: number;
  minLevel?: number;
  speed: number;
  size: number;
  rarity: number;
  isBad: boolean;
  behavior: FishBehavior;
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
  flash: number;
  overrideValue?: number;
  catchOrder?: number;
  life?: number;
};

export type ComboState = { count: number; species: string | null };

export type UpgradeType = "depth" | "netSize" | "pullSpeed" | "capacity";

export type PlayerStats = {
  money: number;
  bestMoney: number;
  maxDepth: number;
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

export type Ripple = { id: number; x: number; y: number; r: number; age: number; life: number };

export type CaughtSummary = {
  count: number;
  earned: number;
  badCount: number;
  comboCount: number;
  comboMultiplier: number;
  items: { name: string; value: number; isBad: boolean }[];
};

export type Input = {
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
  deltaY: number;
  gestureStartY: number;
  gestureDeltaY: number;
  justPressed: boolean;
  justReleased: boolean;
  hasPointer: boolean;
};

export type HudSnapshot = {
  money: number;
  bestMoney: number;
  depth: number;
  maxDepth: number;
  carrying: number;
  capacity: number;
  lastCatchValue: number;
  timeLeft: number;
  comboCount: number;
  comboMultiplier: number;
  totalWeight: number;
  activeBuffs: BuffState;
};

export type GameState = {
  mode: GameMode;
  level: number;
  levelBottomY: number;
  stats: PlayerStats;
  upgrades: Upgrades;
  fish: Fish[];
  feedback: FeedbackText[];
  ripples: Ripple[];
  net: { x: number; y: number; state: NetState; tension: number; pulse: number; stun: number };
  carrying: Fish[];
  lastCatchValue: number;
  lastSummary: CaughtSummary | null;
  shake: number;
  levelTimeLeft: number;
  timeUp: boolean;
  combo: ComboState;
  activeBuffs: BuffState;
  nextLevelBuffs: BuffState;
  cameraY: number;
};
