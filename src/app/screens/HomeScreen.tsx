import { DashboardPanel } from "../components/bat-ca/DashboardPanel";
import { FishingDockScreen } from "../components/bat-ca/dock/FishingDockScreen";

interface Props {
  bestScore: number;
  lastScore: number;
  muted: boolean;
  showDashboard: boolean;
  onToggleMute: () => void;
  onPlay: () => void;
  onOpenDashboard: () => void;
  onCloseDashboard: () => void;
}

export function HomeScreen({
  bestScore,
  lastScore,
  muted,
  showDashboard,
  onToggleMute,
  onPlay,
  onOpenDashboard,
  onCloseDashboard,
}: Props) {
  return (
    <div className="min-h-screen min-h-[100dvh] overflow-hidden bg-[#176ff3]">
      <FishingDockScreen
        muted={muted}
        onToggleMute={onToggleMute}
        onPlay={onPlay}
        onShowStats={onOpenDashboard}
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
