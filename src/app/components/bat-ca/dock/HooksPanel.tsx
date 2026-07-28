import { Anchor, Sparkles, X, Coins } from "lucide-react";
import { useState } from "react";
import { HOOK_DEFINITIONS, getHookDefinition, RANDOM_HOOK_UNLOCK_PRICE, type HookDefinition } from "../game/hooks-data";
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
          {HOOK_DEFINITIONS.slice(0, 9).map((hook: HookDefinition) => {
            const isUnlocked = save.unlockedHooks.includes(hook.id);
            const isSelected = save.selectedHook === hook.id;

            return (
              <button
                key={hook.id}
                type="button"
                onClick={() => isUnlocked && handleSelect(hook.id)}
                disabled={!isUnlocked}
                className={`relative aspect-square rounded-[20px] flex items-center justify-center p-3 transition-all border border-slate-300 ${
                  isSelected
                    ? "bg-yellow-100 border-b-[3px] -translate-y-1"
                    : isUnlocked
                    ? "bg-white border-b-[2px] hover:bg-gray-100 active:border-b active:translate-y-[2px] cursor-pointer"
                    : "bg-gray-200 border-b-[2px] opacity-60 cursor-not-allowed"
                }`}
                title={isUnlocked ? hook.name : "Chưa mở khóa"}
              >
                {/* Hook Icon */}
                <div
                  className="w-12 h-12 flex items-center justify-center transition-colors"
                  style={{ color: isUnlocked ? hook.accentColor || "#1e293b" : "#9ca3af" }}
                >
                  <Anchor size={36} strokeWidth={isUnlocked ? 3 : 2.5} />
                </div>

                {/* Orange Selected Badge Marker */}
                {isSelected && (
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-orange-500 border border-orange-600 text-white flex items-center justify-center shadow-sm">
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
            disabled={allUnlocked || save.money < RANDOM_HOOK_UNLOCK_PRICE}
            onClick={handleUnlockRandom}
            className="px-6 py-3 rounded-full bg-orange-400 text-black font-black text-sm uppercase tracking-wide flex items-center gap-2 border border-orange-600 border-b-[3px] hover:bg-orange-500 active:border-b active:translate-y-[2px] disabled:opacity-50 disabled:active:border-b-[3px] disabled:active:translate-y-0 disabled:cursor-not-allowed transition-all"
          >
            <Coins size={20} strokeWidth={2.5} />
            <span>Mở khóa ngẫu nhiên ({RANDOM_HOOK_UNLOCK_PRICE}đ)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
