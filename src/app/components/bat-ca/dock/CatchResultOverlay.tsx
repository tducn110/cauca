import { Trophy, Sparkles, ArrowRight, Fish } from "lucide-react";
import { CatchSummary } from "./FishingDockCanvas";

interface CatchResultOverlayProps {
  summary: CatchSummary;
  isNewBest: boolean;
  onCollect: () => void;
}

export function CatchResultOverlay({ summary, isNewBest, onCollect }: CatchResultOverlayProps) {
  return (
    <div className="fishing-dock-screen__backdrop">
      <section
        className="w-[min(400px,100%)] rounded-[32px] bg-white border-4 border-black border-b-[8px] overflow-hidden flex flex-col text-center"
      >
        {/* Header */}
        <div className="bg-white p-5 text-center relative border-b-4 border-black">
          <div className="flex justify-center items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" strokeWidth={3} />
            <h2 className="text-2xl font-black text-black m-0 uppercase tracking-wide">
              Kết Quả
            </h2>
            <Sparkles className="w-5 h-5 text-orange-500" strokeWidth={3} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-white flex flex-col items-center">
          
          {/* New Best Record Banner */}
          {isNewBest && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 border-4 border-black border-b-[4px] text-black text-xs font-black uppercase tracking-wider animate-bounce -mt-2">
              <Trophy className="w-4 h-4" strokeWidth={3} />
              <span>Kỷ Lục Mới Khác Biệt!</span>
            </div>
          )}

          {/* Total Money Earned Display */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-sm font-black uppercase tracking-widest text-gray-500">Tiền thu hoạch</span>
            <div className="mt-1 w-full p-4 rounded-[20px] bg-yellow-400 border-4 border-black border-b-[6px] flex items-center justify-center gap-2">
              <span className="text-4xl font-black text-black tracking-tighter">
                +{summary.earned.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          {/* Caught Fish Count Pill */}
          <div className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-[20px] bg-gray-100 border-4 border-black border-b-[4px] text-black text-sm font-black uppercase">
            <Fish className="w-5 h-5 text-orange-500" strokeWidth={3} />
            <span>Bắt được <strong className="text-orange-500 text-lg">{summary.caughtCount}</strong> con cá</span>
          </div>

          {/* Action Collect Button */}
          <button
            type="button"
            onClick={onCollect}
            className="w-full mt-2 py-4 rounded-[20px] bg-orange-500 text-white font-black text-xl uppercase tracking-wider border-4 border-black border-b-[6px] transition-all hover:bg-orange-600 active:border-b-[4px] active:translate-y-[2px] flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>Thu Tiền & Về Bến</span>
            <ArrowRight className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>
      </section>
    </div>
  );
}
