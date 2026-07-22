import { DashboardPanel } from "../components/bat-ca/DashboardPanel";
import { FishingDockScreen } from "../components/bat-ca/dock/FishingDockScreen";

interface Props {
  bestScore: number;
  lastScore: number;
  muted: boolean;
  showDashboard: boolean;
  onToggleMute: () => void;
  onOpenDashboard: () => void;
  onCloseDashboard: () => void;
}

export function HomeScreen({
  bestScore,
  lastScore,
  muted,
  showDashboard,
  onToggleMute,
  onCloseDashboard,
}: Props) {
  return (
    <div className="min-h-screen min-h-[100dvh] overflow-hidden bg-[#176ff3]">
      <FishingDockScreen
        muted={muted}
        onToggleMute={onToggleMute}
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
