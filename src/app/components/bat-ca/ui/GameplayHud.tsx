import type { HudSnapshot } from "../engine";

interface Props {
  hud: HudSnapshot;
  castsLeft: number;
  castsPerRound: number;
  currentLevel: number;
  levelTime: number;
  canUseDynamite: boolean;
  onOpenUpgrade: () => void;
  onUseDynamite?: () => void;
}

export function GameplayHud({ hud, castsLeft, castsPerRound, currentLevel, levelTime, canUseDynamite, onOpenUpgrade, onUseDynamite }: Props) {
  const depthPct = hud.maxDepth > 0 ? Math.min(100, (hud.depth / hud.maxDepth) * 100) : 0;
  const timePct = levelTime > 0 ? Math.min(100, (hud.timeLeft / levelTime) * 100) : 0;
  const timeLow = timePct <= 20;

  const dynamiteCount = hud.activeBuffs.dynamite ?? 0;
  const strengthLeft = hud.activeBuffs.strength ?? 0;
  const bigNetLeft = hud.activeBuffs.bigNet ?? 0;

  return (
    <>
      {/* Level indicator */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-[rgba(253,246,234,0.92)] backdrop-blur-sm border border-[rgba(138,125,101,0.3)] rounded-full px-4 py-1.5 shadow-md">
          <span className="text-xs font-extrabold text-orange-cta">LEVEL {currentLevel}</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="batca-timer-bar">
        <div
          className={`batca-timer-fill ${timeLow ? "batca-timer-fill-low" : ""}`}
          style={{ width: `${timePct}%` }}
        />
        <span className={`batca-timer-text ${timeLow ? "batca-timer-text-low" : ""}`}>{hud.timeLeft}s</span>
      </div>

      <div className="batca-hud">
        <div className="batca-hud-pill">
          <div className="batca-hud-label">Tiền</div>
          <div className="batca-hud-value money">{hud.money}đ</div>
          <div className="batca-weight-pill">⚖️ {hud.totalWeight}kg</div>
        </div>
        <div className="batca-hud-pill text-right">
          <div className="batca-hud-label">Giỏ cá</div>
          <div className="batca-hud-value">{hud.carrying}/{hud.capacity}</div>
          <button
            className="batca-btn batca-btn-ghost mt-1.5 px-3.5 py-2 text-[13px] min-h-10"
            onClick={onOpenUpgrade}
          >
            Nâng cấp
          </button>
        </div>
      </div>

      <div className="batca-casts-bar">
        {Array.from({ length: castsPerRound }).map((_, i) => (
          <div
            key={i}
            className={`batca-cast-dot ${i < castsLeft ? "active" : "used"}`}
          />
        ))}
      </div>

      {hud.comboCount > 1 && (
        <div className="batca-combo-pill">
          🔥 Combo x{hud.comboCount} (+{Math.round((hud.comboMultiplier - 1) * 100)}%)
        </div>
      )}

      {/* Active buffs + dynamite */}
      <div className="batca-buffs-bar">
        {strengthLeft > 0 && (
          <span className="batca-buff-pill strength">💪 {Math.ceil(strengthLeft)}s</span>
        )}
        {bigNetLeft > 0 && (
          <span className="batca-buff-pill bignet">🕸️ {Math.ceil(bigNetLeft)}s</span>
        )}
        {dynamiteCount > 0 && (
          <button
            className="batca-buff-pill dynamite"
            onClick={onUseDynamite}
            disabled={!canUseDynamite}
            title={canUseDynamite ? "Phá rác trong lưới" : "Chưa có rác để phá"}
          >
            🧨 {dynamiteCount}
          </button>
        )}
      </div>

      <div className="batca-depthbar">
        <div className="batca-depthbar-fill" style={{ height: `${depthPct}%` }} />
      </div>
    </>
  );
}
