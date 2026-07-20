import type { GameScreen } from "./hooks/useAppShell";
import type { EndGameData } from "./components/bat-ca/hooks/useBatCaGame";
import { LoadingScreen } from "./components/bat-ca/LoadingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GameContainer } from "./screens/GameContainer";
import { EndGameScreen } from "./screens/EndGameScreen";
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
  endGameData: EndGameData | null;
  setMuted: (updater: (value: boolean) => boolean) => void;
  setShowDashboard: (value: boolean) => void;
  handleLoadingDone: () => void;
  handlePlay: () => void;
  handleEndGame: (data: EndGameData) => void;
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

  if (screen === "home") {
    return (
      <HomeScreen
        bestScore={bestScore}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onPlay={handlePlay}
        onOpenDashboard={() => setShowDashboard(true)}
        showDashboard={showDashboard}
        onCloseDashboard={() => setShowDashboard(false)}
        lastScore={lastScore}
      />
    );
  }

  if (screen === "gameplay") {
    return (
      <GameContainer
        onEndGame={handleEndGame}
      />
    );
  }

  if (screen === "end-game" && endGameData) {
    return (
      <div className="relative w-full h-screen bg-rice-paper">
        <div className="absolute inset-0 bg-gradient-to-b from-rice-paper to-paper-warm" />
        <EndGameScreen
          score={endGameData.totalScore}
          bestScore={bestScore}
          fishCaught={endGameData.totalFishCaught}
          levelReached={endGameData.levelReached}
          reason={endGameData.reason}
          isNewBest={endGameData.totalScore >= bestScore}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
          onShowLeaderboard={handleShowLeaderboard}
        />
      </div>
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

  return null;
}
