const STORE_KEY = "batca-ao-lang-save";

export type SaveData = {
  bestMoney: number;
  maxDepth: number;
  netSize: number;
  pullSpeed: number;
  capacity: number;
  currentLevel: number;
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bestMoney: Math.max(0, Number(parsed.bestMoney) || 0),
        maxDepth: Math.max(180, Number(parsed.maxDepth) || 180),
        netSize: Math.max(22, Number(parsed.netSize) || 22),
        pullSpeed: Math.max(150, Number(parsed.pullSpeed) || 220),
        capacity: Math.max(3, Number(parsed.capacity) || 3),
        currentLevel: Math.max(1, Number(parsed.currentLevel) || 1),
      };
    }
  } catch {
    // ignore
  }
  return {
    bestMoney: 0,
    maxDepth: 180,
    netSize: 22,
    pullSpeed: 220,
    capacity: 3,
    currentLevel: 1,
  };
}

export function saveProgress(data: Partial<SaveData>) {
  try {
    const current = loadSave();
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...current, ...data }));
  } catch {
    // ignore
  }
}

export function saveBest(bestMoney: number) {
  saveProgress({ bestMoney });
}

