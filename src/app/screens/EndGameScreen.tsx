import { Trophy, RotateCcw, Home, BarChart3, Layers, Target } from "lucide-react";
import type { EndReason } from "../components/bat-ca/hooks/useBatCaGame";

interface Props {
  score: number;
  bestScore: number;
  fishCaught: number;
  levelReached: number;
  reason: EndReason;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onShowLeaderboard: () => void;
}

export function EndGameScreen({
  score,
  bestScore,
  fishCaught,
  levelReached,
  reason,
  isNewBest,
  onPlayAgain,
  onGoHome,
  onShowLeaderboard,
}: Props) {
  const isFail = reason === "target-not-reached" || reason === "time-out";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(42,36,24,0.85)] backdrop-blur-sm p-3">
      <div className="bg-cream-card rounded-3xl p-8 max-w-[380px] w-[90%] max-h-full overflow-y-auto shadow-2xl text-center" role="dialog" aria-modal="true" aria-labelledby="batca-end-title">
        {isFail ? (
          <>
            <div className="inline-flex items-center gap-1.5 bg-alert-red text-white text-sm font-bold px-4 py-1.5 rounded-full mb-4">
              <Target size={18} />
              {reason === "time-out" ? "Hết giờ!" : "Không đạt mục tiêu"}
            </div>
            <h1 id="batca-end-title" className="text-3xl font-extrabold text-ink-dark mb-2">Level {levelReached}</h1>
          </>
        ) : (
          <>
            <h1 id="batca-end-title" className="text-3xl font-extrabold text-ink-dark mb-2">Kết thúc!</h1>
            {isNewBest && (
              <div className="inline-flex items-center gap-1.5 bg-mascot-yellow text-ink-dark text-sm font-bold px-4 py-1.5 rounded-full mb-4 animate-bounce">
                <Trophy size={18} />
                Kỷ lục mới!
              </div>
            )}
          </>
        )}

        <div className="text-5xl font-extrabold text-orange-cta mb-2">
          {score}đ
        </div>

        <div className="text-pencil-gray text-sm mb-1">
          Kỷ lục: {bestScore}đ
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-ink-dark mb-8">
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-orange-cta" />
            <span>Level {levelReached}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold">{fishCaught}</span> cá
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="flex items-center justify-center gap-2 bg-gradient-to-b from-[#f08a48] to-orange-cta text-white font-extrabold py-4 rounded-full shadow-[0_4px_12px_rgba(232,116,50,0.4)] hover:shadow-[0_6px_16px_rgba(232,116,50,0.5)] transition-shadow"
          >
            <RotateCcw size={18} />
            Chơi lại
          </button>

          <button
            onClick={onShowLeaderboard}
            className="flex items-center justify-center gap-2 bg-white border-2 border-pencil text-ink-dark font-bold py-3 rounded-full hover:bg-gray-50 transition-colors"
          >
            <BarChart3 size={16} />
            Bảng xếp hạng
          </button>

          <button
            onClick={onGoHome}
            className="flex items-center justify-center gap-2 text-pencil-gray font-bold py-2 hover:text-ink-dark transition-colors"
          >
            <Home size={16} />
            Về menu
          </button>
        </div>
      </div>
    </div>
  );
}
