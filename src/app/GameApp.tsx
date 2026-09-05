import type { GameScreen } from "./hooks/useAppShell";
import { LoadingScreen } from "./components/bat-ca/LoadingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import type { LeaderboardEntry as WinkLeaderboardEntry } from "../integrations/wink/wink-bridge";

interface Props {
  screen: GameScreen;
  loadingProgress: number;
  resourcesReady: boolean;
  loadingExiting: boolean;
  showDashboard: boolean;
  muted: boolean;
  bestScore: number;
  lastScore: number;
  isNewBest: boolean;
  leaderboard: WinkLeaderboardEntry[];
  currentEntryId: string | null;
  setMuted: (updater: (value: boolean) => boolean) => void;
  setShowDashboard: (value: boolean) => void;
  handleLoadingDone: () => void;
  handlePlay: () => void;
  handlePlayAgain: () => void;
  handleGoHome: () => void;
  handleShowLeaderboard: () => void;
  handleBackFromLeaderboard: () => void;
}

export function GameApp({
  screen,
  loadingProgress,
  resourcesReady,
  loadingExiting,
  showDashboard,
  muted,
  bestScore,
  lastScore,
  leaderboard,
  currentEntryId,
  setMuted,
  setShowDashboard,
  handleLoadingDone,
  handleBackFromLeaderboard,
}: Props) {
  if (screen === "loading") {
    return (
      <LoadingScreen
        progress={resourcesReady ? 100 : loadingProgress}
        onDone={handleLoadingDone}
        completeDelayMs={1150}
        exiting={loadingExiting}
      />
    );
  }

  if (screen === "leaderboard") {
    const winkLeaderboard = leaderboard.map((entry) => ({
      rank: entry.rank,
      name: entry.displayName || "Anonymous",
      score: entry.score,
      isPlayer: entry.id === currentEntryId,
    }));
    const playerEntry = currentEntryId
      ? leaderboard.find((entry) => entry.id === currentEntryId)
      : null;

    return (
      <LeaderboardScreen
        playerScore={playerEntry?.score ?? lastScore}
        playerRank={playerEntry?.rank ?? 0}
        leaderboard={winkLeaderboard}
        onBack={handleBackFromLeaderboard}
      />
    );
  }

  return (
    <HomeScreen
      bestScore={bestScore}
      muted={muted}
      onToggleMute={() => setMuted((m) => !m)}
      onOpenDashboard={() => setShowDashboard(true)}
      showDashboard={showDashboard}
      onCloseDashboard={() => setShowDashboard(false)}
      lastScore={lastScore}
    />
  );
}
