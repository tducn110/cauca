import { Trophy, Fish, Sparkles, ArrowRight, Coins } from "lucide-react";
import { FISH_KINDS } from "../game/fish-data";

interface Props {
  earned: number;
  totalFishCaught: number;
  caughtItems: { name: string; value: number; isBad: boolean }[];
  newlyDiscovered: string[];
  isNewBest: boolean;
  bestScore: number;
  onContinue: () => void;
}

export function CatchResultScreen({
  earned,
  totalFishCaught,
  caughtItems,
  newlyDiscovered,
  isNewBest,
  bestScore,
  onContinue,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl text-center flex flex-col items-center">
        {isNewBest ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-extrabold text-xs mb-2 animate-bounce">
            <Trophy size={16} /> KỶ LỤC MỚI!
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
            <Fish size={28} />
          </div>
        )}

        <h2 className="text-2xl font-black text-slate-100 mb-1">
          KẾT QUẢ CHUYẾN CÂU
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Thu hoạch sau khi kéo lưỡi lên mặt nước
        </p>

        {/* Money Earned Card */}
        <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 mb-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs text-amber-300 font-bold block">Tổng tiền kiếm được</span>
            <span className="text-3xl font-black text-amber-300">+{earned.toLocaleString("vi-VN")}đ</span>
          </div>
          <Coins size={36} className="text-amber-400 opacity-90" />
        </div>

        {/* Newly Discovered Fish Alert */}
        {newlyDiscovered.length > 0 && (
          <div className="w-full p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 mb-4 text-left">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold mb-1">
              <Sparkles size={14} /> Phát Hiện Loài Cá Mới Cho Thủy Cung!
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {newlyDiscovered.map((type) => {
                const fish = FISH_KINDS.find((f) => f.type === type);
                return (
                  <span
                    key={type}
                    className="px-2.5 py-1 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-1"
                  >
                    <Fish size={12} /> {fish ? fish.name : type}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Caught Items List */}
        <div className="w-full mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
            <span>Danh sách cá cắn câu ({totalFishCaught})</span>
            <span>Kỷ lục: {bestScore.toLocaleString("vi-VN")}đ</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {caughtItems.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-800/40 text-slate-500 text-xs italic">
                Chưa bắt được con cá nào trong lượt này
              </div>
            ) : (
              caughtItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    item.isBad
                      ? "bg-stone-900/60 border-stone-800 text-stone-400"
                      : "bg-slate-800/60 border-slate-700/80 text-slate-200"
                  }`}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className={item.isBad ? "text-red-400" : "text-amber-400 font-bold"}>
                    {item.isBad ? `${item.value}đ` : `+${item.value}đ`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
        >
          Tiếp tục quay về Dock <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
