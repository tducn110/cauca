import { Trophy, Sparkles, ArrowRight, Fish } from "lucide-react";
import { CatchSummary } from "./FishingDockCanvas";

interface CatchResultOverlayProps {
  summary: CatchSummary;
  isNewBest: boolean;
  onCollect: () => void;
}

export function CatchResultOverlay({ summary, isNewBest, onCollect }: CatchResultOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-6 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-400/40 rounded-3xl shadow-2xl flex flex-col items-center text-center gap-5">
        
        {/* Glow backdrop behind header */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>KẾT QUẢ CHUYẾN CÂU</span>
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>

        {/* New Best Record Banner */}
        {isNewBest && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg animate-bounce">
            <Trophy className="w-4 h-4" />
            <span>KỶ LỤC MỚI KHÁC BIỆT!</span>
          </div>
        )}

        {/* Total Money Earned Display */}
        <div className="flex flex-col items-center gap-1 my-1">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Tiền thu hoạch</span>
          <span className="text-5xl font-black text-amber-300 tracking-tight drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]">
            +{summary.earned.toLocaleString("vi-VN")}đ
          </span>
        </div>

        {/* Caught Fish Count Pill */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200 text-sm font-extrabold">
          <Fish className="w-4 h-4 text-emerald-400" />
          <span>Bắt được tổng cộng <strong className="text-emerald-400">{summary.caughtCount}</strong> con cá</span>
        </div>

        {/* Action Collect Button */}
        <button
          type="button"
          onClick={onCollect}
          className="w-full py-4 px-6 mt-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-base font-black tracking-wide shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-amber-300/50 cursor-pointer"
        >
          <span>THU TIỀN & TRỞ VỀ BẾN</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
