import { useCallback, useEffect, useRef, useState } from "react";
import type { EndGameData } from "../components/bat-ca/hooks/useBatCaGame";
import { loadSave, saveRunResult } from "../components/bat-ca/game/storage";
import { recordDockActivity } from "../components/bat-ca/dock/progression";
import { gameAudio, installAudioLifecycle } from "../audio/audioManager";

const ACTIVITY_HEARTBEAT_MS = 30_000;

export type GameScreen = "loading" | "home" | "gameplay" | "end-game" | "leaderboard";

export function useAppShell() {
  const [screen, setScreen] = useState<GameScreen>("loading");
  const screenRef = useRef<GameScreen>(screen);
  screenRef.current = screen;
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [muted, setMutedState] = useState(() => gameAudio.getMuted());
  const [loadingExiting, setLoadingExiting] = useState(false);
  const loadingDoneTimerRef = useRef<number | null>(null);
  const [storedScores] = useState(() => {
    const save = loadSave();
    return { bestScore: save.bestRunScore, lastScore: save.lastRunScore };
  });
  const [bestScore, setBestScore] = useState(storedScores.bestScore);
  const [lastScore, setLastScore] = useState(storedScores.lastScore);
  const [isNewBest, setIsNewBest] = useState(false);

  const [endGameData, setEndGameData] = useState<EndGameData | null>(null);

  useEffect(() => {
    const cleanupAudio = installAudioLifecycle();
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setResourcesReady(true);
      }
      setLoadingProgress(current);
    }, 100);
    return () => {
      cleanupAudio();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const recordActivity = () => recordDockActivity();
    const recordIfVisible = () => {
      if (document.visibilityState === "visible") recordActivity();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" || screenRef.current !== "home") {
        recordActivity();
      }
    };

    const heartbeat = window.setInterval(recordIfVisible, ACTIVITY_HEARTBEAT_MS);
    window.addEventListener("pagehide", recordActivity);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", recordActivity);
      document.removeEventListener("visibilitychange", handleVisibility);
      recordActivity();
    };
  }, []);

  const setMuted = useCallback((updater: (value: boolean) => boolean) => {
    setMutedState((current) => {
      const next = updater(current);
      gameAudio.setMuted(next);
      if (!next) gameAudio.play("click");
      return next;
    });
  }, []);

  const handleLoadingDone = useCallback(() => {
    setLoadingExiting(true);
    if (loadingDoneTimerRef.current !== null) {
      window.clearTimeout(loadingDoneTimerRef.current);
    }
    loadingDoneTimerRef.current = window.setTimeout(() => {
      setScreen("home");
      setLoadingExiting(false);
      loadingDoneTimerRef.current = null;
    }, 850);
  }, []);

  useEffect(() => {
    return () => {
      if (loadingDoneTimerRef.current !== null) {
        window.clearTimeout(loadingDoneTimerRef.current);
      }
    };
  }, []);

  const handlePlay = useCallback(() => {
    gameAudio.play("click");
    setScreen("gameplay");
  }, []);

  const handleEndGame = useCallback((data: EndGameData) => {
    if (data.reason === "target-not-reached" || data.reason === "time-out") {
      gameAudio.play("fail");
    }
    const result = saveRunResult(data.totalScore);
    setBestScore(result.bestRunScore);
    setLastScore(result.lastRunScore);
    setIsNewBest(result.isNewBest);
    setEndGameData(data);
    setScreen("end-game");
  }, []);

  const handlePlayAgain = useCallback(() => {
    gameAudio.play("click");
    setEndGameData(null);
    setIsNewBest(false);
    setScreen("gameplay");
  }, []);

  const handleGoHome = useCallback(() => {
    gameAudio.play("click");
    setEndGameData(null);
    setIsNewBest(false);
    setScreen("home");
  }, []);

  const handleShowLeaderboard = useCallback(() => {
    gameAudio.play("click");
    setScreen("leaderboard");
  }, []);

  const handleBackFromLeaderboard = useCallback(() => {
    gameAudio.play("click");
    if (endGameData) {
      setScreen("end-game");
    } else {
      setScreen("home");
    }
  }, [endGameData]);

  return {
    screen,
    loadingProgress,
    resourcesReady,
    loadingExiting,
    showDashboard,
    muted,
    bestScore,
    lastScore,
    isNewBest,
    endGameData,
    setMuted,
    setShowDashboard,
    handleLoadingDone,
    handlePlay,
    handleEndGame,
    handlePlayAgain,
    handleGoHome,
    handleShowLeaderboard,
    handleBackFromLeaderboard,
  };
}
