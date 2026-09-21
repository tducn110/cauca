import { DashboardPanel } from "../components/bat-ca/DashboardPanel";
import { FishingDockScreen } from "../components/bat-ca/dock/FishingDockScreen";
import type { WinkRound } from "../../integrations/wink/client";
import type { CatchSummary } from "../components/bat-ca/dock/FishingDockCanvas";

interface Props {
  bestScore: number;
  lastScore: number;
  muted: boolean;
  paused?: boolean;
  showDashboard: boolean;
  onToggleMute: () => void;
  onOpenDashboard: () => void;
  onCloseDashboard: () => void;
  onShowLeaderboard?: () => void;
  onStartRound?: () => WinkRound;
  onCatchCompleteScore?: (summary: CatchSummary) => void;
  onInitialSceneSettled?: () => void;
}

export function HomeScreen({
  bestScore,
  lastScore,
  muted,
  paused = false,
  showDashboard,
  onToggleMute,
  onCloseDashboard,
  onShowLeaderboard,
  onStartRound,
  onCatchCompleteScore,
  onInitialSceneSettled,
}: Props) {
  return (
    <div className="min-h-screen min-h-[100dvh] overflow-hidden bg-[#176ff3]">
      <FishingDockScreen
        muted={muted}
        bestScore={bestScore}
        paused={paused}
        onToggleMute={onToggleMute}
        onShowLeaderboard={onShowLeaderboard}
        onStartRound={onStartRound}
        onCatchCompleteScore={onCatchCompleteScore}
        onInitialSceneSettled={onInitialSceneSettled}
      />
      <DashboardPanel
        open={showDashboard}
        onClose={onCloseDashboard}
        bestScore={bestScore}
        lastScore={lastScore}
      />
    </div>
  );
}
