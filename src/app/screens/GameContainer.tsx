import { BatCaAoLang } from "../components/bat-ca/BatCaAoLang";
import type { EndGameData } from "../components/bat-ca/hooks/useBatCaGame";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  onEndGame: (data: EndGameData) => void;
}

function consumeCastPower(): number {
  try {
    const rawValue = sessionStorage.getItem("batca-cast-power");
    sessionStorage.removeItem("batca-cast-power");
    if (rawValue === null) return 0.6;
    const value = Number(rawValue);
    return Number.isFinite(value) ? Math.min(1, Math.max(0.2, value)) : 0.6;
  } catch {
    return 0.6;
  }
}

export function GameContainer({ onEndGame }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [castPower] = useState(consumeCastPower);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (!document.documentElement.requestFullscreen) return;
      document.documentElement.requestFullscreen().catch(() => {
        // ignore
      });
    } else {
      document.exitFullscreen().catch(() => {
        // ignore
      });
    }
  };

  return (
    <div className="game-shell">
      <div className="game-shell-bg" />
      <div className="game-frame">
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[4] w-10 h-10 rounded-full bg-[rgba(255,255,255,0.9)] border border-[rgba(138,125,101,0.2)] text-ink-dark font-extrabold cursor-pointer flex items-center justify-center shadow-[0_2px_8px_rgba(42,36,24,0.06)]"
          aria-label={isFullscreen ? "Thoát fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Thoát fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <BatCaAoLang onEndGame={onEndGame} initialCastPower={castPower} />
      </div>
    </div>
  );
}
