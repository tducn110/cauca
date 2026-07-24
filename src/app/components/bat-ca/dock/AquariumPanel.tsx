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
    if (isBad) return { label: "Rác", color: "bg-gray-300 text-black" };
    if (rarity < 2) return { label: "H.Thoại", color: "bg-yellow-400 text-black" };
    if (rarity < 15) return { label: "Hiếm", color: "bg-purple-400 text-white" };
    return { label: "Thường", color: "bg-blue-400 text-white" };
  };

  return (
    <div className="fishing-dock-screen__backdrop" onClick={onClose}>
      <section
        className="w-full max-w-3xl rounded-[32px] bg-white border-4 border-black border-b-[8px] overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aquarium-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-5 text-center relative border-b-4 border-black flex-shrink-0">
          <div className="flex items-center gap-2 justify-center">
            <h2 id="aquarium-panel-title" className="text-2xl font-black text-black m-0 uppercase tracking-wide">
              Thủy Cung Ao Làng
            </h2>
          </div>
          <p className="text-xs font-bold text-gray-500 mt-1.5 uppercase">
            Thu nhập thụ động: <strong className="text-orange-500">+{aquariumIncomePerMinute}đ/phút</strong>
          </p>

          <button
            type="button"
            className="absolute top-1/2 -translate-y-1/2 right-4 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all border-2 border-black border-b-[4px] active:border-b-2 active:translate-y-[2px]"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} strokeWidth={3.5} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="m-5 mb-0 p-4 rounded-[20px] bg-white border-4 border-black border-b-[6px] flex-shrink-0">
          <div className="flex items-center justify-between text-xs font-black mb-2 uppercase">
            <span className="text-black flex items-center gap-1.5">
              <Sparkles size={16} className="text-orange-500" strokeWidth={3} /> Đã phát hiện
            </span>
            <span className="text-black">{discoveredCount} / {totalCount} ({progressPercent}%)</span>
          </div>

          <div className="w-full h-4 rounded-full bg-white border-2 border-black overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Fish Grid */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
          {FISH_KINDS.map((fish) => {
            const isDiscovered = discoveredSet.has(fish.type);
            const badge = getRarityBadge(fish.rarity, fish.isBad);

            return (
              <div
                key={fish.type}
                className={`p-3.5 rounded-2xl border-2 border-black border-b-[4px] transition-all flex flex-col justify-between ${
                  isDiscovered ? "bg-white" : "bg-gray-100 opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-10 h-10 rounded-[14px] flex items-center justify-center border-2 border-black"
                      style={{
                        backgroundColor: isDiscovered ? fish.color : "#e5e7eb",
                        color: isDiscovered ? fish.belly : "#9ca3af",
                      }}
                    >
                      {isDiscovered ? <Fish size={22} strokeWidth={2.5} /> : <HelpCircle size={22} strokeWidth={2.5} />}
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full border-2 border-black font-black uppercase ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="font-black text-sm text-black truncate">
                    {isDiscovered ? fish.name : "???"}
                  </h3>

                  <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                    {isDiscovered ? (
                      fish.isBad ? "Vật thể / Rác" : `Giá: ${fish.value}đ`
                    ) : (
                      `Sâu: ${fish.depthMin}m - ${fish.depthMax}m`
                    )}
                  </p>
                </div>

                {isDiscovered && (
                  <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-300 text-[10px] text-gray-500 font-bold flex items-center justify-between">
                    <span>Độ sâu: {fish.depthMin}m+</span>
                    <span className="text-orange-500 font-black">+2đ/phút</span>
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
