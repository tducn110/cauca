import { useCallback, useEffect, useRef, useState } from "react";
import { Game, type GameMode, type HudSnapshot, type CaughtSummary } from "../engine";
import { getLevelDef } from "../game/levels";
import { UPGRADE_DEFS, upgradeCost } from "../engine";
import { ROUND_FEEDBACK_DURATION_MS } from "../game/constants";
import { gameAudio } from "../../../audio/audioManager";
import { recordDiscoveredFish } from "../game/storage";

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

function createRunState(): RunState {
  const firstLevel = getLevelDef(1);
  return {
    currentLevel: 1,
    totalScore: 0,
    totalFishCaught: 0,
    levelScore: 0,
    levelFishCaught: 0,
    castsLeft: firstLevel.casts,
  };
}

function endGameData(run: RunState, reason: EndReason): EndGameData {
  return {
    totalScore: run.totalScore + run.levelScore,
    totalFishCaught: run.totalFishCaught + run.levelFishCaught,
    levelReached: run.currentLevel,
    reason,
  };
}

export function useBatCaGame(onEndGame?: (data: EndGameData) => void, initialCastPower = 0.6) {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game();
  const game = gameRef.current;
  const castPowerRef = useRef(Math.min(1, Math.max(0.2, Number.isFinite(initialCastPower) ? initialCastPower : 0.6)));

  const [mode, setMode] = useState<GameMode>(() => game.mode);
  const [hud, setHud] = useState<HudSnapshot>(() => game.hud());
  const [, force] = useState(0);
  const initialRunRef = useRef<RunState | null>(null);
  if (!initialRunRef.current) initialRunRef.current = createRunState();
  const [runState, setRunState] = useState<RunState>(initialRunRef.current);
  const [lastFeedback, setLastFeedback] = useState<CaughtSummary | null>(null);

  const runStateRef = useRef(runState);
  const modeRef = useRef<GameMode>(game.mode);
  const previousModeRef = useRef<GameMode>("playing");
  const endedRef = useRef(false);
  const resultTimerRef = useRef<number | null>(null);
  const onEndGameRef = useRef(onEndGame);

  useEffect(() => {
    onEndGameRef.current = onEndGame;
  }, [onEndGame]);

  const levelDef = getLevelDef(runState.currentLevel);

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  const commitRunState = useCallback((next: RunState) => {
    runStateRef.current = next;
    setRunState(next);
  }, []);

  const setGameMode = useCallback((next: GameMode) => {
    modeRef.current = next;
    game.mode = next;
    setMode(next);
  }, [game]);

  const finishRun = useCallback((reason: EndReason, snapshot = runStateRef.current) => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearResultTimer();
    onEndGameRef.current?.(endGameData(snapshot, reason));
  }, [clearResultTimer]);

  const scheduleResult = useCallback((callback: () => void) => {
    clearResultTimer();
    resultTimerRef.current = window.setTimeout(() => {
      resultTimerRef.current = null;
      callback();
    }, ROUND_FEEDBACK_DURATION_MS);
  }, [clearResultTimer]);

  const refresh = useCallback(() => {
    setHud(game.hud());
    force((n) => n + 1);
  }, [game]);

  const [newlyDiscovered, setNewlyDiscovered] = useState<string[]>([]);

  const onSell = useCallback((summary: CaughtSummary) => {
    gameAudio.play(summary.earned > 0 ? "sell" : "click");
    setLastFeedback(summary);
    setHud(game.hud());

    // Record newly discovered fish for Aquarium
    const caughtFishTypes = summary.items.map((item) => {
      // Find matching type from FISH_KINDS by name
      const kind = game.carrying.find((f) => f.kind.name === item.name)?.kind;
      return kind ? kind.type : "";
    }).filter(Boolean);

    const newTypes = recordDiscoveredFish(caughtFishTypes);
    setNewlyDiscovered(newTypes);

    const previous = runStateRef.current;
    const fishCaught = summary.items.filter((item) => !item.isBad).length;
    const next: RunState = {
      ...previous,
      levelScore: previous.levelScore + summary.earned,
      levelFishCaught: previous.levelFishCaught + fishCaught,
      castsLeft: Math.max(0, previous.castsLeft - 1),
    };
    commitRunState(next);

    if (game.timeUp || next.castsLeft <= 0) {
      const passed = next.levelScore >= getLevelDef(next.currentLevel).target;
      setGameMode("result");
      scheduleResult(() => {
        if (endedRef.current) return;
        if (passed) {
          gameAudio.play("level");
          setGameMode("levelSummary");
        } else {
          finishRun(game.timeUp ? "time-out" : "target-not-reached", next);
        }
      });
      return;
    }

    setGameMode("playing");
  }, [commitRunState, finishRun, game, scheduleResult, setGameMode]);


  useEffect(() => {
    game.onSell = onSell;
    return () => {
      clearResultTimer();
      if (game.onSell === onSell) game.onSell = undefined;
    };
  }, [clearResultTimer, game, onSell]);

  const onHud = useCallback((nextHud: HudSnapshot) => setHud(nextHud), []);

  const play = useCallback(() => {
    clearResultTimer();
    endedRef.current = false;
    const firstLevel = getLevelDef(1);
    game.reset(firstLevel);
    game.stats.dropSpeed = 200 + castPowerRef.current * 100;
    const next = createRunState();
    commitRunState(next);
    setLastFeedback(null);
    setGameMode("playing");
    gameAudio.play("click");
  }, [clearResultTimer, commitRunState, game, setGameMode]);

  const startNextLevel = useCallback(() => {
    if (modeRef.current !== "levelSummary" || endedRef.current) return;
    const previous = runStateRef.current;
    const nextLevel = previous.currentLevel + 1;
    const nextLevelDef = getLevelDef(nextLevel);
    const next: RunState = {
      currentLevel: nextLevel,
      totalScore: previous.totalScore + previous.levelScore,
      totalFishCaught: previous.totalFishCaught + previous.levelFishCaught,
      levelScore: 0,
      levelFishCaught: 0,
      castsLeft: nextLevelDef.casts,
    };

    game.startLevel(nextLevelDef);
    commitRunState(next);
    setLastFeedback(null);
    setGameMode("playing");
    gameAudio.play("click");
  }, [commitRunState, game, setGameMode]);

  const endGame = useCallback(() => {
    gameAudio.play("click");
    finishRun("quit");
  }, [finishRun]);

  const openUpgrade = useCallback(() => {
    if (modeRef.current === "upgrade" || modeRef.current === "shop") return;
    if (modeRef.current !== "playing" && modeRef.current !== "levelSummary") return;
    if (modeRef.current === "playing" && game.net.state !== "idle") return;
    previousModeRef.current = modeRef.current;
    setGameMode("upgrade");
    setHud(game.hud());
    gameAudio.play("click");
  }, [game, setGameMode]);

  const closeUpgrade = useCallback(() => {
    setGameMode(previousModeRef.current);
    setHud(game.hud());
    gameAudio.play("click");
  }, [game, setGameMode]);

  const openShop = useCallback(() => {
    if (modeRef.current === "upgrade" || modeRef.current === "shop") return;
    previousModeRef.current = modeRef.current;
    setGameMode("shop");
    setHud(game.hud());
    gameAudio.play("click");
  }, [game, setGameMode]);

  const closeShop = useCallback(() => {
    setGameMode(previousModeRef.current);
    setHud(game.hud());
    gameAudio.play("click");
  }, [game, setGameMode]);

  const useDynamite = useCallback(() => {
    if (game.useDynamite()) {
      gameAudio.play("boom");
      refresh();
    }
  }, [game, refresh]);

  const dismissFeedback = useCallback(() => {
    setLastFeedback(null);
  }, []);

  const hasAffordableUpgrade = UPGRADE_DEFS.some((def) => {
    const level = game.upgrades[def.type];
    const cost = upgradeCost(def, level);
    return cost !== null && hud.money >= cost;
  });
  const canOpenUpgrade = mode === "levelSummary" || (mode === "playing" && game.net.state === "idle");

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
    canOpenUpgrade,
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
    dismissFeedback,
    newlyDiscovered,
  };
}

