import { CSSProperties } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { FishingState } from "./FishingDockCanvas";

interface UnderwaterHudProps {
  state: FishingState;
  depthMeters: number;
  maxDepthMeters: number;
  capacity: number;
  caughtCount: number;
  runEarnings: number;
  muted: boolean;
  onToggleMute: () => void;
  style?: CSSProperties;
}

export function UnderwaterHud({
  state,
  depthMeters,
  maxDepthMeters,
  capacity,
  caughtCount,
  runEarnings,
  muted,
  onToggleMute,
  style,
}: UnderwaterHudProps) {
  const isFull = caughtCount >= capacity;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4"
      style={style}
      aria-label="Giao diện khi lặn biển"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full max-w-xl mx-auto pointer-events-auto">
        {/* Left: Current Run Earnings */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-xl">
          <span className="text-xl font-black text-amber-300">💰</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200/80">Lượt này</span>
            <span className="text-lg font-black text-amber-300 tracking-tight leading-none">
              +{runEarnings.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>

        {/* Center: Depth & Capacity */}
        <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/25 text-white shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🌊</span>
            <span className="text-base font-black text-cyan-300">{depthMeters}m</span>
            <span className="text-xs text-white/50">/ {maxDepthMeters}m</span>
          </div>
          <div className="w-[1px] h-5 bg-white/20" />
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🎣</span>
            <span className={`text-base font-black ${isFull ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
              {caughtCount}/{capacity}
            </span>
          </div>
        </div>

        {/* Right: Sound toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className="p-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 active:scale-95 transition-all shadow-xl"
          aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* Center Guidance Hint when ascending */}
      {state === "ascending" && (
        <div className="self-center mb-16 px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-300/40 text-amber-200 text-sm font-extrabold shadow-2xl animate-bounce flex items-center gap-2">
          <span>👈</span>
          <span>Di chuyển chuột / vuốt màn hình để điều khiển lưỡi câu</span>
          <span>👉</span>
        </div>
      )}
    </div>
  );
}
