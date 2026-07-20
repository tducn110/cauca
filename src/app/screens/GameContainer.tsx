import { BatCaAoLang } from "../components/bat-ca/BatCaAoLang";
import type { EndGameData } from "../components/bat-ca/hooks/useBatCaGame";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  onEndGame: (data: EndGameData) => void;
}

export function GameContainer({ onEndGame }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
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
          onClick={() => onEndGame({ totalScore: 0, totalFishCaught: 0, levelReached: 1, reason: "quit" })}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-50 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[rgba(255,255,255,0.9)] border border-pencil text-ink-dark font-extrabold text-[13px] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
          aria-label="Về trang chủ"
        >
          <ArrowLeft size={18} className="sm:hidden" />
          <span className="hidden sm:inline">↩ Về trang chủ</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.9)] border border-pencil text-ink-dark font-extrabold cursor-pointer flex items-center justify-center shadow-md"
          aria-label={isFullscreen ? "Thoát fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Thoát fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <BatCaAoLang onEndGame={onEndGame} />
      </div>
    </div>
  );
}
