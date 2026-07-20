import { useCallback, useRef, useState } from "react";
import { Game, type GameMode, type HudSnapshot, type CaughtSummary } from "../engine";
import { getLevelDef } from "../game/levels";
import { UPGRADE_DEFS, upgradeCost } from "../engine";

export type EndReason = "target-not-reached" | "time-out" | "quit" | "completed";

export interface EndGameData {
  totalScore: number;
  totalFishCaught: number;
  levelReached: number;
  reason: EndReason;
}

interface RunState {
  currentLevel: number;
  totalScore: number;
  totalFishCaught: number;
  levelScore: number;
  levelFishCaught: number;
  castsLeft: number;
}

export function useBatCaGame(onEndGame?: (data: EndGameData) => void) {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game();
  const game = gameRef.current;

  const [mode, setMode] = useState<GameMode>("start");
  const [hud, setHud] = useState<HudSnapshot>(() => game.hud());
  const [, force] = useState(0);

  const [runState, setRunState] = useState<RunState>({
    currentLevel: 1,
    totalScore: 0,
    totalFishCaught: 0,
    levelScore: 0,
    levelFishCaught: 0,
    castsLeft: 5,
  });

  const [lastFeedback, setLastFeedback] = useState<CaughtSummary | null>(null);

  const levelDef = getLevelDef(runState.currentLevel);

  const refresh = useCallback(() => {
    setHud(game.hud());
    force((n) => n + 1);
  }, [game]);

  const onSell = useCallback((s: CaughtSummary) => {
    setLastFeedback(s);
    setHud(game.hud());

    try {
      localStorage.setItem("batca-last-score", String(s.earned));
    } catch {
      // ignore
    }

    // Hết giờ -> kết thúc ngay, bất kể còn lượt nào
    if (gameRef.current?.timeUp) {
      setRunState((prev) => {
        const fishCaught = s.items.filter((it) => !it.isBad).length;
        const finalData: EndGameData = {
          totalScore: prev.totalScore + prev.levelScore + s.earned,
          totalFishCaught: prev.totalFishCaught + prev.levelFishCaught + fishCaught,
          levelReached: prev.currentLevel,
          reason: "time-out",
        };
        onEndGame?.(finalData);
        return prev;
      });
      return;
    }

    // Tính toán đồng bộ bằng biến local
    const fishCaught = s.items.filter((it) => !it.isBad).length;
    const prev = runState;
    const nextLevelScore = prev.levelScore + s.earned;
    const nextLevelFishCaught = prev.levelFishCaught + fishCaught;
    const nextCastsLeft = prev.castsLeft - 1;

    if (nextCastsLeft <= 0) {
      const def = getLevelDef(prev.currentLevel);
      const passed = nextLevelScore >= def.target;

      setTimeout(() => {
        if (passed) {
          // Pass: mở LevelSummary
          setMode("levelSummary");
        } else {
          // Fail: gọi onEndGame ngay
          const finalData: EndGameData = {
            totalScore: prev.totalScore + nextLevelScore,
            totalFishCaught: prev.totalFishCaught + nextLevelFishCaught,
            levelReached: prev.currentLevel,
            reason: "target-not-reached",
          };
          onEndGame?.(finalData);
        }
      }, 300);

      setRunState({
        ...prev,
        levelScore: nextLevelScore,
        levelFishCaught: nextLevelFishCaught,
        castsLeft: 0,
      });
      return;
    }

    // Còn lượt: cho phép thả lưới tiếp ngay
    game.mode = "playing";
    setMode("playing");
    setRunState({
      ...prev,
      levelScore: nextLevelScore,
      levelFishCaught: nextLevelFishCaught,
      castsLeft: nextCastsLeft,
    });
  }, [game, onEndGame, runState]);

  game.onSell = onSell;

  const onHud = useCallback((h: HudSnapshot) => setHud(h), []);

  const play = useCallback(() => {
    game.reset();
    const def = getLevelDef(1);
    game.levelTimeLeft = def.time;
    setRunState({
      currentLevel: 1,
      totalScore: 0,
      totalFishCaught: 0,
      levelScore: 0,
      levelFishCaught: 0,
      castsLeft: def.casts,
    });
    setLastFeedback(null);
    game.mode = "playing";
    setMode("playing");
  }, [game]);

  const startNextLevel = useCallback(() => {
    setRunState((prev) => {
      const nextLevel = prev.currentLevel + 1;
      const def = getLevelDef(nextLevel);
      game.startLevel(def.time);
      return {
        currentLevel: nextLevel,
        totalScore: prev.totalScore + prev.levelScore,
        totalFishCaught: prev.totalFishCaught + prev.levelFishCaught,
        levelScore: 0,
        levelFishCaught: 0,
        castsLeft: def.casts,
      };
    });
    setLastFeedback(null);
    game.mode = "playing";
    setMode("playing");
  }, [game]);

  const endGame = useCallback(() => {
    setRunState((prev) => {
      const finalData: EndGameData = {
        totalScore: prev.totalScore + prev.levelScore,
        totalFishCaught: prev.totalFishCaught + prev.levelFishCaught,
        levelReached: prev.currentLevel,
        reason: "quit",
      };
      onEndGame?.(finalData);
      return prev;
    });
  }, [onEndGame]);

  const openUpgrade = useCallback(() => {
    game.mode = "upgrade";
    setMode("upgrade");
    setHud(game.hud());
  }, [game]);

  const closeUpgrade = useCallback(() => {
    game.mode = "levelSummary";
    setMode("levelSummary");
  }, [game]);

  const openShop = useCallback(() => {
    game.mode = "shop";
    setMode("shop");
    setHud(game.hud());
  }, [game]);

  const closeShop = useCallback(() => {
    game.mode = "levelSummary";
    setMode("levelSummary");
    setHud(game.hud());
  }, [game]);

  const useDynamite = useCallback(() => {
    if (game.useDynamite()) {
      refresh();
    }
  }, [game, refresh]);

  const hasAffordableUpgrade = UPGRADE_DEFS.some((def) => {
    const lvl = game.upgrades[def.type];
    const cost = upgradeCost(def, lvl);
    return cost !== null && hud.money >= cost;
  });

  return {
    game,
    mode,
    hud,
    levelDef,
    currentLevel: runState.currentLevel,
    totalScore: runState.totalScore + runState.levelScore,
    totalFishCaught: runState.totalFishCaught + runState.levelFishCaught,
    levelScore: runState.levelScore,
    levelFishCaught: runState.levelFishCaught,
    castsLeft: runState.castsLeft,
    lastFeedback,
    hasAffordableUpgrade,
    refresh,
    onHud,
    play,
    startNextLevel,
    endGame,
    openUpgrade,
    closeUpgrade,
    openShop,
    closeShop,
    useDynamite,
  };
}
