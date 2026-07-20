import { TopNav } from "../components/bat-ca/TopNav";
import { HeroSection } from "../components/bat-ca/HeroSection";
import { DashboardPanel } from "../components/bat-ca/DashboardPanel";

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
    <div className="landing-enter min-h-screen bg-rice-paper">
      <TopNav
        muted={muted}
        onToggleMute={onToggleMute}
        onOpenDashboard={onOpenDashboard}
      />

      <HeroSection onPlay={onPlay} best={bestScore} />

      <DashboardPanel
        open={showDashboard}
        onClose={onCloseDashboard}
        bestScore={bestScore}
        lastScore={lastScore}
      />
    </div>
  );
}
