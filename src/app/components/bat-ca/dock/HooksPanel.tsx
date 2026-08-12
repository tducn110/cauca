import { Sparkles, X, Coins } from "lucide-react";
import { useState } from "react";
import { HOOK_DEFINITIONS, getHookDefinition, getHookUnlockPrice } from "../game/hooks-data";
import { loadSave, selectHook, unlockRandomHook } from "../game/storage";
import { gameAudio } from "../../../audio/audioManager";
import "./fishing-dock-screen.css";

interface Props {
  onClose: () => void;
  onNotice: (msg: string) => void;
}

export function HooksPanel({ onClose, onNotice }: Props) {
  const [save, setSave] = useState(() => loadSave());

  const handleSelect = (hookId: string) => {
    if (selectHook(hookId)) {
      gameAudio.play("click");
      const updated = loadSave();
      setSave(updated);
      const hook = getHookDefinition(hookId);
      onNotice(`Đã trang bị: ${hook.name}`);
    }
  };

  const handleUnlockRandom = () => {
    const res = unlockRandomHook();
    if (res.success && res.unlockedHookId) {
      gameAudio.play("level");
      const updated = loadSave();
      setSave(updated);
      const hook = getHookDefinition(res.unlockedHookId);
      onNotice(`Mở khóa thành công: ${hook.name}!`);
    } else if (res.reason === "insufficient-funds") {
      gameAudio.play("click");
      onNotice("Không đủ xu để mở khóa!");
    } else if (res.reason === "all-unlocked") {
      gameAudio.play("click");
      onNotice("Bạn đã sở hữu tất cả lưỡi câu!");
    }
  };

  const allUnlocked = save.unlockedHooks.length >= HOOK_DEFINITIONS.length;
  const currentUnlockPrice = getHookUnlockPrice(save.unlockedHooks.length);

  return (
    <div className="fishing-dock-screen__backdrop" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[32px] bg-white border-2 border-slate-300 border-b-[4px] overflow-hidden flex flex-col max-h-[calc(100dvh-40px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hooks-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-5 text-center relative border-b-2 border-slate-300 flex-shrink-0">
          {/* Coin Badge */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 px-3 py-1.5 rounded-full bg-yellow-100 border border-yellow-400 border-b-[2px] text-black font-black flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="text-amber-500"><Coins size={16} strokeWidth={3} /></span>
            <span>{save.money.toLocaleString("vi-VN")}</span>
          </div>

          <h2 id="hooks-panel-title" className="text-xl sm:text-2xl font-black text-black m-0 uppercase tracking-wide">
            Lưỡi Câu
          </h2>

          <button
            type="button"
            className="absolute top-1/2 -translate-y-1/2 right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center transition-all border border-slate-300 border-b-2 active:border-b active:translate-y-[2px]"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} strokeWidth={3.5} />
          </button>
        </div>

        {/* 3x3 Grid of 9 Hook Slots */}
        <div className="p-5 grid grid-cols-3 gap-3 overflow-y-auto bg-gray-50">
          {Array.from({ length: 9 }).map((_, i) => {
            const hook = HOOK_DEFINITIONS[i];

            if (!hook) {
              return (
                <div
                  key={`empty-${i}`}
                  className="relative aspect-[4/5] rounded-[20px] flex items-center justify-center p-3 transition-all border border-orange-200 bg-orange-100/50 border-b-[2px] opacity-80"
                  title="Chưa ra mắt"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <span 
                      className="text-5xl font-black text-orange-400 italic drop-shadow-md scale-110"
                      style={{ 
                        fontFamily: 'system-ui, sans-serif',
                        textShadow: '0 2px 4px rgba(251, 146, 60, 0.3)' 
                      }}
                    >
                      ?
                    </span>
                  </div>
                </div>
              );
            }

            const isUnlocked = save.unlockedHooks.includes(hook.id);
            const isSelected = save.selectedHook === hook.id;

            const getShortBuff = (id: string) => {
              switch (id) {
                case "fast": return "+50% TỐC ĐỘ";
                case "plus2": return "+2 SỨC CHỨA";
                case "lucky_gold": return "+50% GIÁ TRỊ";
                case "coin": return "+50% TIỀN AFK";
                case "times": return "+4H TREO MÁY";
                default: return "CƠ BẢN";
              }
            };

            return (
              <button
                key={hook.id}
                type="button"
                onClick={() => isUnlocked && handleSelect(hook.id)}
                disabled={!isUnlocked}
                className={`relative aspect-[4/5] rounded-[20px] flex flex-col items-center justify-between p-2 transition-all border border-slate-300 ${
                  isSelected
                    ? "bg-yellow-100 border-b-[3px] -translate-y-1"
                    : isUnlocked
                    ? "bg-white border-b-[2px] hover:bg-gray-100 active:border-b active:translate-y-[2px] cursor-pointer"
                    : "bg-gray-200 border-b-[2px] opacity-60 cursor-not-allowed"
                }`}
                title={isUnlocked ? hook.name : "Chưa mở khóa"}
              >
                {/* Hook Name */}
                <div className="w-full text-center mt-1 z-10">
                  <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight text-slate-700 truncate px-1">
                    {hook.name}
                  </div>
                </div>

                {/* Hook Icon */}
                <div className="flex-1 flex items-center justify-center w-full">
                  <img 
                    src={hook.image} 
                    alt={hook.name} 
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl" 
                    style={{ 
                      filter: isUnlocked ? "none" : "grayscale(100%) opacity(50%)" 
                    }} 
                  />
                </div>

                {/* Function text */}
                <div className="w-full mb-1 z-10">
                   {isUnlocked ? (
                     <div 
                       className="mx-auto rounded-[8px] border border-b-[2px] px-1.5 py-0.5 text-center flex items-center justify-center bg-white shadow-sm"
                       style={{ borderColor: hook.color }}
                     >
                       <span className="text-[9px] sm:text-[10px] font-black whitespace-nowrap" style={{ color: hook.accentColor }}>
                         {getShortBuff(hook.id)}
                       </span>
                     </div>
                   ) : (
                     <div className="mx-auto rounded-[8px] border border-slate-300 border-b-[2px] px-1.5 py-0.5 text-center flex items-center justify-center bg-slate-100">
                       <span className="text-[9px] sm:text-[10px] font-black text-slate-400">
                         BÍ ẨN
                       </span>
                     </div>
                   )}
                </div>

                {/* Orange Selected Badge Marker */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-orange-500 border border-orange-600 text-white flex items-center justify-center shadow-sm z-20">
                    <Sparkles size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Panel */}
        <div className="p-5 border-t-2 border-slate-300 bg-white flex justify-center flex-shrink-0">
          <button
            type="button"
            disabled={allUnlocked || save.money < currentUnlockPrice}
            onClick={handleUnlockRandom}
            className="px-6 py-3 rounded-full bg-orange-400 text-black font-black text-sm uppercase tracking-wide flex items-center gap-2 border border-orange-600 border-b-[3px] hover:bg-orange-500 active:border-b active:translate-y-[2px] disabled:opacity-50 disabled:active:border-b-[3px] disabled:active:translate-y-0 disabled:cursor-not-allowed transition-all"
          >
            <Coins size={20} strokeWidth={2.5} />
            <span>
              {allUnlocked 
                ? "Đã mở khóa toàn bộ" 
                : `Mở khóa ngẫu nhiên (${currentUnlockPrice.toLocaleString("vi-VN")}đ)`
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
