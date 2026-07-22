import { Volume2, VolumeX, Globe, X, Check } from "lucide-react";
import { useState } from "react";
import { loadSave, saveProgress, type LanguageCode } from "../game/storage";
import { gameAudio } from "../../../audio/audioManager";
import "./fishing-dock-screen.css";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
}

export function SettingsModal({ muted, onToggleMute, onClose }: Props) {
  const [save, setSave] = useState(() => loadSave());

  const handleToggleSound = () => {
    onToggleMute();
    const nextSound = muted; // if currently muted, turning sound on
    saveProgress({ audioSettings: { ...save.audioSettings, sound: nextSound } });
    setSave((s) => ({ ...s, audioSettings: { ...s.audioSettings, sound: nextSound } }));
  };

  const handleToggleMusic = () => {
    gameAudio.play("click");
    const nextMusic = !save.audioSettings.music;
    saveProgress({ audioSettings: { ...save.audioSettings, music: nextMusic } });
    setSave((s) => ({ ...s, audioSettings: { ...s.audioSettings, music: nextMusic } }));
  };

  const handleSelectLang = (lang: LanguageCode) => {
    gameAudio.play("click");
    saveProgress({ language: lang });
    setSave((s) => ({ ...s, language: lang }));
  };

  return (
    <div className="fishing-dock-screen__backdrop" onClick={onClose}>
      <section
        className="fishing-dock-screen__panel settings-modal-content max-w-md w-full p-6 bg-slate-900/95 text-white rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <h2 id="settings-modal-title" className="text-xl font-bold text-slate-100">
            Cài Đặt Game
          </h2>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-200">Âm thanh hiệu ứng</h3>
                <p className="text-xs text-slate-400">Tiếng cá cắn câu, nâng cấp, bấm nút</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !muted
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {!muted ? "Đang Bật" : "Tắt"}
            </button>
          </div>

          {/* Music Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Volume2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-200">Nhạc nền</h3>
                <p className="text-xs text-slate-400">Giai điệu thư giãn ao làng</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMusic}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                save.audioSettings.music
                  ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {save.audioSettings.music ? "Đang Bật" : "Tắt"}
            </button>
          </div>

          {/* Language Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-200">Ngôn ngữ / Language</h3>
                <p className="text-xs text-slate-400">Chọn ngôn ngữ hiển thị giao diện</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectLang("vi")}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  save.language === "vi"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                🇻🇳 Tiếng Việt {save.language === "vi" && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectLang("en")}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  save.language === "en"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                🇺🇸 English {save.language === "en" && <Check size={14} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-sm transition-colors border border-slate-700"
        >
          Hoàn tất
        </button>
      </section>
    </div>
  );
}
