import { Gift, Coins, Clock, X } from "lucide-react";
import { claimOfflineEarnings } from "../game/storage";
import { gameAudio } from "../../../audio/audioManager";
import "./fishing-dock-screen.css";

interface Props {
  amount: number;
  eligibleMinutes: number;
  onClose: () => void;
  onClaimed: (amount: number) => void;
}

export function OfflineEarningsModal({ amount, eligibleMinutes, onClose, onClaimed }: Props) {
  const handleClaim = () => {
    const res = claimOfflineEarnings();
    if (res.claimed) {
      gameAudio.play("sell");
      onClaimed(res.amount);
    }
    onClose();
  };

  const hours = Math.floor(eligibleMinutes / 60);
  const mins = eligibleMinutes % 60;
  const timeStr = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

  return (
    <div className="fishing-dock-screen__backdrop" onClick={handleClaim}>
      <section
        className="fishing-dock-screen__panel offline-modal-content max-w-sm w-full p-6 bg-slate-900/95 text-white rounded-3xl border border-amber-500/40 shadow-2xl backdrop-blur-xl text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
          <Gift size={32} />
        </div>

        <h2 id="offline-modal-title" className="text-xl font-bold text-amber-300">
          Thu Nhập Vắng Mặt!
        </h2>

        <p className="text-xs text-slate-300 mt-1 mb-4 flex items-center justify-center gap-1.5">
          <Clock size={14} className="text-amber-400" />
          Bạn đã nghỉ ngơi trong <strong>{timeStr}</strong>
        </p>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 my-4 flex items-center justify-center gap-3">
          <Coins size={28} className="text-amber-400" />
          <span className="text-2xl font-extrabold text-amber-300">
            +{amount.toLocaleString("vi-VN")}đ
          </span>
        </div>

        <button
          type="button"
          onClick={handleClaim}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all transform active:scale-98"
        >
          Nhận Tiền Vắng Mặt
        </button>
      </section>
    </div>
  );
}
