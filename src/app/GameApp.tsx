import type { GameScreen } from "./hooks/useAppShell";
import { HomeScreen } from "./screens/HomeScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import type { LeaderboardEntry as WinkLeaderboardEntry } from "../integrations/wink/client";
import type { WinkRound } from "../integrations/wink/client";
import type { CatchSummary } from "./components/bat-ca/dock/FishingDockCanvas";

interface Props {
  screen: GameScreen;
  loadingProgress: number;
  resourcesReady: boolean;
  loadingExiting: boolean;
  showDashboard: boolean;
  muted: boolean;
  paused?: boolean;
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
  handleStartRound?: () => WinkRound;
  handleCatchScore?: (summary: CatchSummary) => Promise<void>;
}

export function GameApp({
  screen,
  showDashboard,
  muted,
  paused = false,
  bestScore,
  lastScore,
  leaderboard,
  currentEntryId,
  setMuted,
  setShowDashboard,
  handleShowLeaderboard,
  handleBackFromLeaderboard,
  handleStartRound,
  handleCatchScore,
}: Props) {
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
      lastScore={lastScore}
      muted={muted}
      paused={paused}
      onToggleMute={() => setMuted((m) => !m)}
      onOpenDashboard={() => setShowDashboard(true)}
      showDashboard={showDashboard}
      onCloseDashboard={() => setShowDashboard(false)}
      onShowLeaderboard={handleShowLeaderboard}
      onStartRound={handleStartRound}
      onCatchCompleteScore={handleCatchScore}
    />
  );
}
