import { CSSProperties } from "react";
import { Fish } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DockViewportLayout } from "./dockLayout";

interface UnderwaterHudProps {
  caughtCount: number;
  depthMeters?: number;
  maxDepthMeters?: number;
  style?: CSSProperties;
  layout?: DockViewportLayout;
}

export function UnderwaterHud({
  caughtCount,
  style,
  layout,
}: UnderwaterHudProps) {
  const { t } = useTranslation();
  // Align to the right edge of the water channel
  const rightOffset = layout && layout.worldWidth ? `${layout.width - (layout.worldLeft + layout.worldWidth) + 16}px` : "16px";

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
      style={style}
      aria-label={t("dock.underwaterAria", "Giao diện lặn biển")}
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

    </div>
  );
}
