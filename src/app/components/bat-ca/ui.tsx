import type { ReactNode } from "react";
import { HudSnapshot, Game, UPGRADE_DEFS, upgradeCost, CaughtSummary } from "./engine";
import { ArrowDownToLine, Maximize2, Gauge, Package } from "lucide-react";

const UPG_ICONS: Record<string, ReactNode> = {
  depth: <ArrowDownToLine size={20} />,
  netSize: <Maximize2 size={20} />,
  pullSpeed: <Gauge size={20} />,
  capacity: <Package size={20} />,
};

export function StartScreen({ best, onPlay }: { best: number; onPlay: () => void }) {
  return (
    <div className="batca-backdrop">
      <div className="batca-card">
        <div className="batca-logo">L</div>
        <h2>Bắt Cá Ao Làng</h2>
        <p>Thả lưới xuống ao làng, kéo lên gom cá, bán lấy tiền và nâng cấp đồ nghề!</p>
        <div className="batca-instr">
          🪝 <b>Giữ</b> để thả lưới xuống ao.<br />
          ✋ <b>Thả tay</b> để kéo lưới lên — lưới chỉ bắt cá khi đang kéo lên.<br />
          🐟 Lên tới mặt nước thì cá tự bán thành tiền.<br />
          ⭐ Kỷ lục: <b>{best}đ</b>
        </div>
        <button className="batca-btn batca-btn-primary" style={{ width: "100%" }} onClick={onPlay}>
          Bắt đầu câu
        </button>
      </div>
    </div>
  );
}

export function GameplayHud({ hud, onOpenUpgrade }: { hud: HudSnapshot; onOpenUpgrade: () => void }) {
  const depthPct = hud.maxDepth > 0 ? Math.min(100, (hud.depth / hud.maxDepth) * 100) : 0;
  return (
    <>
      <div className="batca-hud">
        <div className="batca-hud-pill">
          <div className="batca-hud-label">Tiền</div>
          <div className="batca-hud-value money">{hud.money}đ</div>
          <div className="batca-hud-label" style={{ marginTop: 2 }}>Kỷ lục {hud.bestMoney}đ</div>
        </div>
        <div className="batca-hud-pill" style={{ textAlign: "right" }}>
          <div className="batca-hud-label">Giỏ cá</div>
          <div className="batca-hud-value">{hud.carrying}/{hud.capacity}</div>
          <button
            className="batca-btn batca-btn-ghost"
            style={{ marginTop: 6, padding: "8px 14px", fontSize: 13, minHeight: 40 }}
            onClick={onOpenUpgrade}
          >
            Nâng cấp
          </button>
        </div>
      </div>

      <div className="batca-depthbar">
        <div className="batca-depthbar-fill" style={{ height: `${depthPct}%` }} />
      </div>

      <div className="batca-hint">Giữ để thả lưới · Thả tay để kéo lên</div>
    </>
  );
}

export function UpgradePanel({ game, money, onBuy, onClose }: {
  game: Game; money: number; onBuy: () => void; onClose: () => void;
}) {
  return (
    <div className="batca-backdrop">
      <div className="batca-card">
        <h2>Nâng cấp đồ nghề</h2>
        <div className="batca-money-chip">💰 {money}đ</div>
        <div className="batca-upg-list">
          {UPGRADE_DEFS.map((def) => {
            const lvl = game.upgrades[def.type];
            const cost = upgradeCost(def, lvl);
            const maxed = cost === null;
            const afford = cost !== null && money >= cost;
            return (
              <div className="batca-upg" key={def.type}>
                <div className="batca-upg-icon">{UPG_ICONS[def.type]}</div>
                <div className="batca-upg-body">
                  <div className="batca-upg-name">{def.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7d65" }}>{def.desc}</div>
                  <div className="batca-upg-dots">
                    {Array.from({ length: def.maxLevel }).map((_, i) => (
                      <span key={i} className={`batca-dot ${i < lvl ? "on" : ""}`} />
                    ))}
                  </div>
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
        <button className="batca-btn batca-btn-primary" style={{ width: "100%" }} onClick={onClose}>
          Tiếp tục câu
        </button>
      </div>
    </div>
  );
}

export function CatchResultPanel({ summary, money, onUpgrade, onContinue }: {
  summary: CaughtSummary; money: number; onUpgrade: () => void; onContinue: () => void;
}) {
  return (
    <div className="batca-backdrop">
      <div className="batca-card">
        <h2>Mẻ lưới</h2>
        <p>{summary.count > 0 ? `Bắt được ${summary.count} con` : "Lưới trống trơn!"}{summary.badCount > 0 ? ` · ${summary.badCount} rác` : ""}</p>
        <div className="batca-earned">+{summary.earned}đ</div>
        {summary.items.length > 0 && (
          <div className="batca-result-list">
            {summary.items.map((it, i) => (
              <div key={i} className={`batca-result-row ${it.isBad ? "bad" : ""}`}>
                <span>{it.name}</span>
                <span>{it.value >= 0 ? `+${it.value}` : it.value}đ</span>
              </div>
            ))}
          </div>
        )}
        <div className="batca-money-chip">💰 Tổng: {money}đ</div>
        <div className="batca-row-btns">
          <button className="batca-btn batca-btn-ghost" onClick={onUpgrade}>Nâng cấp</button>
          <button className="batca-btn batca-btn-primary" onClick={onContinue}>Câu tiếp</button>
        </div>
      </div>
    </div>
  );
}
