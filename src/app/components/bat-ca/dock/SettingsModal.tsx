import { Volume2, VolumeX, X } from "lucide-react";
import { useState } from "react";
import { loadSave, saveProgress } from "../game/storage";
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

  return (
    <div className="fishing-dock-screen__backdrop" onClick={onClose}>
      <section
        className="w-[min(380px,100%)] rounded-[32px] bg-white border-4 border-black border-b-[8px] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-5 text-center relative border-b-4 border-black">
          <h2 id="settings-modal-title" className="text-2xl font-black text-black m-0 uppercase tracking-wide">
            Cài Đặt
          </h2>
          <button
            type="button"
            className="absolute top-1/2 -translate-y-1/2 right-4 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all border-2 border-black border-b-[4px] active:border-b-2 active:translate-y-[2px]"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} strokeWidth={3.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-white">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-4 rounded-[20px] bg-white border-4 border-black border-b-[6px]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-[14px] bg-white text-black flex items-center justify-center border-2 border-black">
                {muted ? <VolumeX size={24} strokeWidth={3} /> : <Volume2 size={24} strokeWidth={3} />}
              </div>
              <div>
                <h3 className="font-black text-[16px] text-black leading-tight uppercase tracking-wide">Âm thanh</h3>
                <p className="text-[11.5px] font-bold text-gray-500 mt-1 leading-tight">Hiệu ứng game</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`w-[80px] py-2.5 rounded-xl font-black uppercase text-sm transition-all flex items-center justify-center border-2 border-black border-b-[4px] active:border-b-2 active:translate-y-[2px] ${
                !muted
                  ? "bg-orange-500 text-white"
                  : "bg-white text-black"
              }`}
            >
              {!muted ? "Bật" : "Tắt"}
            </button>
          </div>

          {/* Music Toggle */}
          <div className="flex items-center justify-between p-4 rounded-[20px] bg-white border-4 border-black border-b-[6px]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-[14px] bg-white text-black flex items-center justify-center border-2 border-black">
                <Volume2 size={24} strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-black text-[16px] text-black leading-tight uppercase tracking-wide">Nhạc nền</h3>
                <p className="text-[11.5px] font-bold text-gray-500 mt-1 leading-tight">Giai điệu thư giãn</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMusic}
              className={`w-[80px] py-2.5 rounded-xl font-black uppercase text-sm transition-all flex items-center justify-center border-2 border-black border-b-[4px] active:border-b-2 active:translate-y-[2px] ${
                save.audioSettings.music
                  ? "bg-orange-500 text-white"
                  : "bg-white text-black"
              }`}
            >
              {save.audioSettings.music ? "Bật" : "Tắt"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 bg-yellow-400 text-black border-4 border-black border-b-[6px] font-black text-xl py-3.5 rounded-[20px] uppercase tracking-wider transition-all active:border-b-[4px] active:translate-y-[2px]"
          >
            Quay về
          </button>
        </div>
      </section>
    </div>
  );
}

