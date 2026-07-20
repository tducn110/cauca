import type { Game } from "../engine";
import { UPGRADE_DEFS, upgradeCost } from "../engine";
import type { UpgradeDef } from "../game/upgrades";
import { ArrowDownToLine, Maximize2, Gauge, Package } from "lucide-react";
import type { ReactNode } from "react";

const UPG_ICONS: Record<string, ReactNode> = {
  depth: <ArrowDownToLine size={20} />,
  netSize: <Maximize2 size={20} />,
  pullSpeed: <Gauge size={20} />,
  capacity: <Package size={20} />,
};

const UPG_EFFECTS: Record<string, (lvl: number) => string> = {
  depth: (lvl) => `Phạm vi +${(lvl + 1) * 12}%`,
  netSize: (lvl) => `Bắt cá +${(lvl + 1) * 8}%`,
  pullSpeed: (lvl) => `Kéo nhanh +${(lvl + 1) * 10}%`,
  capacity: (lvl) => `Giỏ +${lvl + 1} chỗ`,
};

export function UpgradePanel({ game, money, onBuy, onClose }: {
  game: Game; money: number; onBuy: () => void; onClose: () => void;
}) {
  const hasAffordableUpgrade = UPGRADE_DEFS.some((def) => {
    const lvl = game.upgrades[def.type];
    const cost = upgradeCost(def, lvl);
    return cost !== null && money >= cost;
  });

  return (
    <div className="batca-backdrop">
      <div className="batca-card">
        <h2>Nâng cấp đồ nghề</h2>
        <div className="batca-money-chip">💰 {money}đ</div>
        <div className="batca-upg-list">
          {UPGRADE_DEFS.map((def: UpgradeDef) => {
            const lvl = game.upgrades[def.type];
            const cost = upgradeCost(def, lvl);
            const maxed = cost === null;
            const afford = cost !== null && money >= cost;
            const insufficient = cost !== null && !afford;
            return (
              <div
                key={def.type}
                className={`batca-upg ${insufficient ? "opacity-60" : ""}`}
              >
                <div className="batca-upg-icon">{UPG_ICONS[def.type]}</div>
                <div className="batca-upg-body">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">{def.name}</span>
                    <span className="text-xs text-pencil-gray">Lv.{lvl}</span>
                  </div>
                  <div className="text-[11px] text-bamboo-green font-bold mt-0.5">
                    {maxed ? "Đã max" : UPG_EFFECTS[def.type]?.(lvl) || ""}
                  </div>
                  <div className="batca-upg-dots">
                    {Array.from({ length: def.maxLevel }).map((_, i) => (
                      <span key={i} className={`batca-dot ${i < lvl ? "on" : ""}`} />
                    ))}
                  </div>
                  {insufficient && (
                    <div className="text-[10px] text-alert-red mt-1">
                      Thiếu {cost - money}đ
                    </div>
                  )}
                </div>
                <button
                  className={`batca-upg-buy ${maxed ? "maxed" : ""}`}
                  disabled={maxed || !afford}
                  onClick={() => { if (game.buyUpgrade(def.type)) onBuy(); }}
                >
                  {maxed ? "MAX" : `${cost}đ`}
                </button>
              </div>
            );
          })}
        </div>
        <button className="batca-btn batca-btn-primary w-full" onClick={onClose}>
          {hasAffordableUpgrade ? "Tiếp tục câu" : "Không đủ tiền • Tiếp tục"}
        </button>
      </div>
    </div>
  );
}

