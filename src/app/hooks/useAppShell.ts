import { useCallback, useEffect, useRef, useState } from "react";
import type { EndGameData } from "../components/bat-ca/hooks/useBatCaGame";

export type GameScreen = "loading" | "home" | "gameplay" | "end-game" | "leaderboard";

export function useAppShell() {
  const [screen, setScreen] = useState<GameScreen>("loading");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const loadingDoneTimerRef = useRef<number | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);

  const [endGameData, setEndGameData] = useState<EndGameData | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("batca-ao-lang-save");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bestMoney) setBestScore(Math.max(0, Number(parsed.bestMoney) || 0));
      }
      const last = localStorage.getItem("batca-last-score");
      if (last) setLastScore(Math.max(0, Number(last) || 0));
    } catch {
      // ignore
    }
  }, [screen]);

  useEffect(() => {
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
    return () => clearInterval(interval);
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
    setScreen("gameplay");
  }, []);

  const handleEndGame = useCallback((data: EndGameData) => {
    const isNewBest = data.totalScore > bestScore;
    if (isNewBest) {
      setBestScore(data.totalScore);
    }
    setLastScore(data.totalScore);
    setEndGameData(data);
    setScreen("end-game");
  }, [bestScore]);

  const handlePlayAgain = useCallback(() => {
    setEndGameData(null);
    setScreen("gameplay");
  }, []);

  const handleGoHome = useCallback(() => {
    setEndGameData(null);
    setScreen("home");
  }, []);

  const handleShowLeaderboard = useCallback(() => {
    setScreen("leaderboard");
  }, []);

  const handleBackFromLeaderboard = useCallback(() => {
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
