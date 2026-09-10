import { useCallback, useEffect, useRef, useState } from "react";
import type { EndGameData } from "../components/bat-ca/hooks/useBatCaGame";
import { loadSave } from "../components/bat-ca/game/storage";
import { recordDockActivity } from "../components/bat-ca/dock/progression";
import { gameAudio, installAudioLifecycle } from "../audio/audioManager";
import { winkGame, type WinkRound } from "../../integrations/wink/client";
import type { LeaderboardEntry } from "../../integrations/wink/wink-bridge";

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
  const [bestScore, setBestScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const activeRoundRef = useRef<WinkRound | null>(null);

  const [endGameData, setEndGameData] = useState<EndGameData | null>(null);

  useEffect(() => {
    const save = loadSave();
    gameAudio.syncPreferences({
      muted: !save.audioSettings.sound,
      musicEnabled: save.audioSettings.music,
    });
    const cleanupAudio = installAudioLifecycle();
    const cleanupWink = winkGame.bindLifecycle({
      onMute: () => setMutedState(true),
      onUnmute: () => setMutedState(false),
      onPause: () => { gameAudio.setPageHidden(true); },
      onResume: () => { gameAudio.setPageHidden(false); }
    });
    const stopObserve = winkGame.observe((state) => {
      if (state.phase === "ready_anonymous" || state.phase === "ready_authenticated") {
        void winkGame.refreshLeaderboard({ limit: 100 }).then((response) => {
          setLeaderboard(response.entries);
        }).catch(console.error);
      }
    });
    
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
      cleanupWink();
      stopObserve();
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
    activeRoundRef.current = winkGame.startRound();
    setScreen("gameplay");
  }, []);

  const handleEndGame = useCallback(async (data: EndGameData) => {
    if (data.reason === "target-not-reached" || data.reason === "time-out") {
      gameAudio.play("fail");
    }
    const finalScore = Math.max(0, Math.round(data.totalScore));
    const round = activeRoundRef.current;
    setLastScore(finalScore);
    setIsNewBest(false);
    if (round) {
      try {
        if (winkGame.canSubmitScore) {
          const submission = await winkGame.submitFinalScore({ score: finalScore });
          if (submission.entry) {
            setBestScore(Math.max(submission.entry.score, submission.previousBest ?? 0));
            setCurrentEntryId(submission.entry.id);
          } else if (submission.previousBest !== null && submission.previousBest !== undefined) {
            setBestScore(submission.previousBest);
          }
          setIsNewBest(submission.isNewBest);
          const response = await winkGame.refreshLeaderboard({ limit: 100 });
          setLeaderboard(response.entries);
        }
      } catch (error) {
        console.error("[Wink] score submission failed", error);
      } finally {
        winkGame.completeRound(round);
        activeRoundRef.current = null;
      }
    }
    setEndGameData(data);
    setScreen("end-game");
  }, []);

  const handlePlayAgain = useCallback(() => {
    gameAudio.play("click");
    setEndGameData(null);
    setIsNewBest(false);
    activeRoundRef.current = winkGame.startRound();
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
    void winkGame.refreshLeaderboard({ limit: 100 }).then((response) => {
      setLeaderboard(response.entries);
      const current = currentEntryId
        ? response.entries.find((entry) => entry.id === currentEntryId)
        : null;
      if (current) setBestScore(current.score);
    }).catch(console.error);
    setScreen("leaderboard");
  }, [currentEntryId]);

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
    leaderboard,
    currentEntryId,
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
