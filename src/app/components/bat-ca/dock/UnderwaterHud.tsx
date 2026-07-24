import { CSSProperties, useEffect, useState } from "react";
import { Fish } from "lucide-react";
import type { DockViewportLayout } from "./dockLayout";
import type { FishingState } from "./FishingDockCanvas";

interface UnderwaterHudProps {
  state: FishingState;
  caughtCount: number;
  style?: CSSProperties;
  layout?: DockViewportLayout;
}

export function UnderwaterHud({
  state,
  caughtCount,
  style,
  layout,
}: UnderwaterHudProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Show tutorial only on ascending and for a short time
    if (state === "ascending") {
      setShowTutorial(true);
      const timer = setTimeout(() => setShowTutorial(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTutorial(false);
    }
  }, [state]);

  // Align to the right edge of the water channel
  const rightOffset = layout && layout.worldWidth ? `${layout.width - (layout.worldLeft + layout.worldWidth) + 16}px` : "16px";

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
      style={style}
      aria-label="Giao diện lặn biển"
    >
      {/* Top Right: Fish Count */}
      <div 
        className="absolute flex items-center gap-1.5 drop-shadow-md"
        style={{ top: "24px", right: rightOffset }}
      >
        <Fish size={28} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" strokeWidth={3} />
        <span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">
          x{caughtCount}
        </span>
      </div>

      {/* Center Guidance Hint when ascending */}
      {showTutorial && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-sm font-black shadow-lg animate-bounce flex items-center gap-2">
          <span>👈</span>
          <span>Di chuyển để bắt cá</span>
          <span>👉</span>
        </div>
      )}
    </div>
  );
}
