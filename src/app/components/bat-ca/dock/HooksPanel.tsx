import { Anchor, Sparkles, Check, Lock, X } from "lucide-react";
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
      <section
        className="fishing-dock-screen__panel hooks-panel-content max-w-2xl w-full p-6 bg-slate-900/95 text-white rounded-3xl border border-amber-500/30 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hooks-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Anchor size={22} />
            </div>
            <div>
              <h2 id="hooks-panel-title" className="text-xl font-bold text-amber-300">
                Bộ Sưu Tập Lưỡi Câu
              </h2>
              <p className="text-xs text-slate-400">
                Ví xu: <span className="font-extrabold text-amber-400">{save.money.toLocaleString("vi-VN")}đ</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {HOOK_DEFINITIONS.map((hook: HookDefinition) => {
            const isUnlocked = save.unlockedHooks.includes(hook.id);
            const isSelected = save.selectedHook === hook.id;

            return (
              <div
                key={hook.id}
                className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10"
                    : isUnlocked
                    ? "bg-slate-800/80 border-slate-700 hover:border-slate-500"
                    : "bg-slate-900/60 border-slate-800/80 opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow"
                        style={{ backgroundColor: hook.color }}
                      >
                        <Anchor size={18} style={{ color: hook.accentColor }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">{hook.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase font-semibold">
                          {hook.rarity}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-extrabold bg-amber-400/10 px-2 py-1 rounded-full border border-amber-400/30">
                        <Check size={12} /> Đang dùng
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 mb-3">{hook.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="text-[11px] text-amber-300/90 font-medium">
                    {hook.valueMultiplier > 1 && `+${Math.round((hook.valueMultiplier - 1) * 100)}% Giá cá `}
                    {hook.speedMultiplier > 1 && `+${Math.round((hook.speedMultiplier - 1) * 100)}% Tốc độ `}
                  </div>

                  {isUnlocked ? (
                    !isSelected && (
                      <button
                        type="button"
                        onClick={() => handleSelect(hook.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-colors"
                      >
                        Trang bị
                      </button>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                      <Lock size={14} /> Khóa
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Đã mở khóa: <strong className="text-amber-400">{save.unlockedHooks.length} / {HOOK_DEFINITIONS.length}</strong> lưỡi câu
          </div>

          <button
            type="button"
            disabled={allUnlocked || save.money < RANDOM_HOOK_UNLOCK_PRICE}
            onClick={handleUnlockRandom}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Sparkles size={18} />
            Mở Khóa Ngẫu Nhiên ({RANDOM_HOOK_UNLOCK_PRICE}đ)
          </button>
        </div>
      </section>
    </div>
  );
}
