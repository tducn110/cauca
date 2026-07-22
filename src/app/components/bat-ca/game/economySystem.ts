import { SURFACE_Y } from "./constants";
import { saveWallet } from "./storage";
import type { CaughtSummary, ComboState, Fish, PlayerStats, UpgradeType, Upgrades } from "./types";
import type { UpgradeDef } from "./upgrades";
import { upgradeCost } from "./upgrades";

export function buyUpgrade(
  type: UpgradeType,
  stats: PlayerStats,
  upgrades: Upgrades,
  defs: UpgradeDef[],
) {
  const def = defs.find((d) => d.type === type)!;
  const lvl = upgrades[type];
  const cost = upgradeCost(def, lvl);
  if (cost === null) return false;
  if (stats.money < cost) return false;
  stats.money -= cost;
  upgrades[type] = lvl + 1;
  def.apply(stats);
  return true;
}

export function sellCatch(
  carrying: Fish[],
  stats: PlayerStats,
  netX: number,
  combo: ComboState,
  addFeedback: (x: number, y: number, text: string, color: string) => void,
  addRipple: (x: number, y: number, r?: number, life?: number) => void,
  triggerShake: (amount: number) => void,
) {
  let total = 0;
  let badCount = 0;
  const goodCount = carrying.filter((f) => !f.kind.isBad).length;
  const comboMult = 1 + Math.min(Math.max(0, goodCount - 1), 5) * 0.1;

  const items = carrying.map((f) => {
    const baseValue = f.overrideValue ?? f.kind.value;
    let value = baseValue;
    if (!f.kind.isBad && goodCount > 1) {
      value = Math.round(baseValue * comboMult);
    }
    total += value;
    if (f.kind.isBad) badCount++;
    return { name: f.kind.name, value, isBad: f.kind.isBad };
  });

  total = Math.max(0, total);
  stats.money += total;
  if (total > 0) addFeedback(netX, SURFACE_Y - 6, `+${total}đ`, "#e87432");
  if (goodCount > 1) {
    addFeedback(netX, SURFACE_Y - 26, `Combo x${goodCount} (+${Math.round((comboMult - 1) * 100)}%)`, "#f0b840");
  }
  if (stats.money > stats.bestMoney) {
    stats.bestMoney = stats.money;
  }
  saveWallet(stats.money, stats.bestMoney);

  const summary: CaughtSummary = {
    count: items.length,
    earned: total,
    badCount,
    comboCount: goodCount,
    comboMultiplier: comboMult,
    items,
  };

  addRipple(netX, SURFACE_Y, 12, 0.9);
  if (total >= 100) triggerShake(0.65);

  // reset combo for next cast
  combo.count = 0;
  combo.species = null;

  carrying.length = 0;
  return summary;
}
