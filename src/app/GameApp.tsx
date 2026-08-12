import type { GameScreen } from "./hooks/useAppShell";
import { LoadingScreen } from "./components/bat-ca/LoadingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";

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
    const mockLeaderboard = [
      { rank: 1, name: "Nguyễn Văn A", score: 2500 },
      { rank: 2, name: "Trần Thị B", score: 1800 },
      { rank: 3, name: "Lê Văn C", score: 1200 },
      { rank: 4, name: "Phạm Minh D", score: 890 },
      { rank: 5, name: "Bạn", score: lastScore, isPlayer: true },
    ].sort((a, b) => b.score - a.score).map((entry, i) => ({ ...entry, rank: i + 1 }));

    return (
      <LeaderboardScreen
        playerScore={lastScore}
        playerRank={mockLeaderboard.findIndex((e) => e.isPlayer) + 1}
        leaderboard={mockLeaderboard}
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
