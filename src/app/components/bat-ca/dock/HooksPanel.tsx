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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="relative w-full max-w-lg p-6 bg-gradient-to-b from-[#1b65d3] to-[#124ba3] text-white rounded-3xl border-2 border-white/20 shadow-2xl flex flex-col items-center gap-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hooks-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Left Coin Counter Badge */}
        <div className="absolute top-5 left-5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/20 text-white font-extrabold text-sm shadow-md">
          <span className="text-amber-400">🟡</span>
          <span>{save.money.toLocaleString("vi-VN")}</span>
        </div>

        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95 shadow-md cursor-pointer"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {/* Center Title with Wavy Underline */}
        <div className="flex flex-col items-center mt-1">
          <h2 id="hooks-panel-title" className="text-3xl font-black tracking-wider uppercase text-white drop-shadow-md">
            LƯỠI CÂU
          </h2>
          {/* Wavy Underline */}
          <div className="w-24 h-2 mt-1 text-sky-300 flex justify-center">
            <svg viewBox="0 0 100 20" className="w-full h-full fill-none stroke-current stroke-[4]">
              <path d="M0,10 Q25,0 50,10 T100,10" />
            </svg>
          </div>
        </div>

        {/* 3x3 Grid of 9 Hook Slots (white rounded cards) */}
        <div className="grid grid-cols-3 gap-3.5 w-full my-2">
          {HOOK_DEFINITIONS.slice(0, 9).map((hook: HookDefinition) => {
            const isUnlocked = save.unlockedHooks.includes(hook.id);
            const isSelected = save.selectedHook === hook.id;

            return (
              <button
                key={hook.id}
                type="button"
                onClick={() => isUnlocked && handleSelect(hook.id)}
                disabled={!isUnlocked}
                className={`relative aspect-square rounded-2xl flex items-center justify-center p-3 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-4 border-[#ff6b00] shadow-[0_0_18px_rgba(255,107,0,0.6)] scale-[1.03]"
                    : isUnlocked
                    ? "bg-white/95 border-2 border-white hover:bg-white hover:scale-[1.02] shadow-md"
                    : "bg-white/40 border-2 border-white/30 opacity-60 cursor-not-allowed"
                }`}
                title={isUnlocked ? hook.name : "Chưa mở khóa"}
              >
                {/* Hook Icon */}
                <div
                  className="w-12 h-12 flex items-center justify-center text-slate-800"
                  style={{ color: isUnlocked ? hook.accentColor || "#1e293b" : "#94a3b8" }}
                >
                  <Anchor size={36} strokeWidth={2.8} />
                </div>

                {/* Orange Selected Badge Marker */}
                {isSelected && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shadow-md">
                    <Sparkles size={13} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom UNLOCK RANDOM Pill Button */}
        <button
          type="button"
          disabled={allUnlocked || save.money < RANDOM_HOOK_UNLOCK_PRICE}
          onClick={handleUnlockRandom}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white font-black text-sm tracking-wide flex items-center gap-2 shadow-xl hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-amber-300/40 cursor-pointer"
        >
          <Coins size={18} className="text-yellow-300" />
          <span>MỞ KHÓA NGẪU NHIÊN ({RANDOM_HOOK_UNLOCK_PRICE}đ)</span>
        </button>
      </div>
    </div>
  );
}
