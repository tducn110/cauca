import { Volume2, VolumeX } from "lucide-react";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  onOpenDashboard: () => void;
}

export function TopNav({ muted, onToggleMute, onOpenDashboard }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-7 py-3.5 bg-[rgba(245,236,215,0.85)] backdrop-blur-[10px] border-b border-[rgba(138,125,101,0.18)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-[38px] h-[38px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#f8c860,#d99820)] border-2 border-ink-dark grid place-items-center text-white font-extrabold text-xl">
          L
        </div>
        <span className="hidden sm:inline font-extrabold text-ink-dark tracking-[0.3px]">
          Bộ Lạc Đậu Phộng
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenDashboard}
          className="px-3 sm:px-3.5 py-2 rounded-full bg-transparent border border-pencil text-ink-dark font-bold text-[13px] cursor-pointer"
          aria-label="Mở bảng vinh danh"
        >
          🏆 <span className="hidden sm:inline">Bảng vinh danh</span>
        </button>

        <button
          onClick={onToggleMute}
          aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
          className="w-9 h-9 rounded-full bg-transparent border border-pencil text-ink-dark cursor-pointer grid place-items-center"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <div className="hidden sm:block px-3 py-1.5 rounded-full border border-pencil text-ink-dark text-xs font-bold">
          VIE
        </div>
      </div>
    </nav>
  );
}
