import { useCallback, useRef, useState } from "react";
import { Game, GameMode, HudSnapshot, CaughtSummary } from "./engine";
import { GameCanvas } from "./GameCanvas";
import { StartScreen, GameplayHud, UpgradePanel, CatchResultPanel } from "./ui";
import "./batca.css";

export function BatCaAoLang() {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game();
  const game = gameRef.current;

  const [mode, setMode] = useState<GameMode>("start");
  const [hud, setHud] = useState<HudSnapshot>(() => game.hud());
  const [summary, setSummary] = useState<CaughtSummary | null>(null);
  const [, force] = useState(0);
  const refresh = () => { setHud(game.hud()); force((n) => n + 1); };

  // Khi bán cá xong (lưới về mặt nước) -> mở bảng kết quả
  game.onSell = useCallback((s: CaughtSummary) => {
    setSummary(s);
    setMode("result");
    setHud(game.hud());
  }, [game]);

  const onHud = useCallback((h: HudSnapshot) => setHud(h), []);

  const play = () => { game.mode = "playing"; setMode("playing"); };
  const continuePlay = () => { game.mode = "playing"; setMode("playing"); };
  const openUpgrade = () => { game.mode = "upgrade"; setMode("upgrade"); setHud(game.hud()); };
  const closeUpgrade = () => { game.mode = "playing"; setMode("playing"); };

  const active = mode === "playing";
  const showHud = mode === "playing";

  return (
    <div className="batca-root">
      <div className="batca-frame">
        <GameCanvas game={game} active={active} onHud={onHud} />

        <div className="batca-overlay">
          {showHud && <GameplayHud hud={hud} onOpenUpgrade={openUpgrade} />}

          {mode === "start" && (
            <StartScreen best={hud.bestMoney} onPlay={play} />
          )}

          {mode === "upgrade" && (
            <UpgradePanel
              game={game}
              money={hud.money}
              onBuy={refresh}
              onClose={closeUpgrade}
            />
          )}

          {mode === "result" && summary && (
            <CatchResultPanel
              summary={summary}
              money={hud.money}
              onUpgrade={openUpgrade}
              onContinue={continuePlay}
            />
          )}
        </div>
      </div>
    </div>
  );
}
