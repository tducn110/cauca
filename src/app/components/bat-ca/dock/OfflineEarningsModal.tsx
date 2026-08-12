import { Gift, Coins, Clock } from "lucide-react";
import { gameAudio } from "../../../audio/audioManager";
import "./fishing-dock-screen.css";

interface Props {
  amount: number;
  eligibleMinutes: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

export function OfflineEarningsModal({ amount, eligibleMinutes, onClose, onConfirm }: Props) {
  const handleConfirm = () => {
    gameAudio.play("sell");
    onConfirm(amount);
    onClose();
  };

  const hours = Math.floor(eligibleMinutes / 60);
  const mins = eligibleMinutes % 60;
  const timeStr = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

  return (
    <div className="fishing-dock-screen__backdrop" onClick={handleConfirm}>
      <section
        className="w-[min(380px,100%)] rounded-[32px] bg-white border-2 border-slate-300 border-b-[4px] overflow-hidden flex flex-col text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-5 text-center relative border-b-2 border-slate-300">
          <h2 id="offline-modal-title" className="text-2xl font-black text-black m-0 uppercase tracking-wide">
            Quà Vắng Mặt
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-white flex flex-col items-center">
          <div className="w-20 h-20 rounded-[20px] bg-orange-100 border-2 border-orange-300 border-b-[3px] text-orange-500 flex items-center justify-center -mt-2">
            <Gift size={44} strokeWidth={2.5} />
          </div>

          <div className="w-full">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center justify-center gap-1.5 mb-3">
              <Clock size={16} strokeWidth={3} className="text-black" />
              Nghỉ ngơi <strong>{timeStr}</strong>
            </p>

            <div className="w-full p-4 rounded-[20px] bg-yellow-400 border-2 border-yellow-600 border-b-[3px] flex items-center justify-center gap-2">
              <Coins size={28} strokeWidth={2.5} className="text-black" />
              <span className="text-3xl font-black text-black tracking-tighter">
                +{amount.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full mt-2 bg-orange-500 text-white border-2 border-orange-600 border-b-[3px] font-black text-xl py-3.5 rounded-[20px] uppercase tracking-wider transition-all active:border-b-[2px] active:translate-y-[2px]"
          >
            Nhận Quà
          </button>
        </div>
      </section>
    </div>
  );
}
