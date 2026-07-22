import { Fish, Sparkles, X, HelpCircle } from "lucide-react";
import { useState } from "react";
import { FISH_KINDS } from "../game/fish-data";
import { loadSave } from "../game/storage";
import "./fishing-dock-screen.css";

interface Props {
  onClose: () => void;
}

export function AquariumPanel({ onClose }: Props) {
  const [save] = useState(() => loadSave());

  const discoveredSet = new Set(save.discoveredFish);
  const totalCount = FISH_KINDS.length;
  const discoveredCount = discoveredSet.size;
  const progressPercent = Math.round((discoveredCount / totalCount) * 100);

  // Passive income bonus per minute: 2đ per discovered species
  const aquariumIncomePerMinute = discoveredCount * 2;

  const getRarityBadge = (rarity: number, isBad: boolean) => {
    if (isBad) return { label: "Rác / Dật", color: "bg-stone-700 text-stone-300" };
    if (rarity < 2) return { label: "Huyền Thoại", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    if (rarity < 15) return { label: "Hiếm", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
    return { label: "Thường", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" };
  };

  return (
    <div className="fishing-dock-screen__backdrop" onClick={onClose}>
      <section
        className="fishing-dock-screen__panel aquarium-panel-content max-w-3xl w-full p-6 bg-slate-950/95 text-white rounded-3xl border border-cyan-500/30 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aquarium-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Fish size={24} />
            </div>
            <div>
              <h2 id="aquarium-panel-title" className="text-xl font-bold text-cyan-300">
                Thủy Cung Ao Làng
              </h2>
              <p className="text-xs text-slate-400">
                Thu nhập thụ động: <strong className="text-amber-400">+{aquariumIncomePerMinute}đ/phút</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> Bộ sưu tập cá đã phát hiện
            </span>
            <span className="text-cyan-400 font-extrabold">{discoveredCount} / {totalCount} ({progressPercent}%)</span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Fish Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {FISH_KINDS.map((fish) => {
            const isDiscovered = discoveredSet.has(fish.type);
            const badge = getRarityBadge(fish.rarity, fish.isBad);

            return (
              <div
                key={fish.type}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDiscovered
                    ? "bg-slate-900/90 border-slate-800 hover:border-cyan-500/50"
                    : "bg-slate-950/70 border-slate-900 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow"
                      style={{
                        backgroundColor: isDiscovered ? fish.color : "#334155",
                        color: isDiscovered ? fish.belly : "#64748b",
                      }}
                    >
                      {isDiscovered ? <Fish size={22} /> : <HelpCircle size={22} />}
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-200 truncate">
                    {isDiscovered ? fish.name : "??? (Chưa phát hiện)"}
                  </h3>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isDiscovered ? (
                      fish.isBad ? "Vật thể / Rác" : `Giá: ${fish.value}đ`
                    ) : (
                      `Tầng sâu: ${fish.depthMin}m - ${fish.depthMax}m`
                    )}
                  </p>
                </div>

                {isDiscovered && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Độ sâu: {fish.depthMin}m+</span>
                    <span className="text-amber-300 font-bold">+2đ/phút</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
