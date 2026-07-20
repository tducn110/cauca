import { X, Trophy, BarChart3 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  bestScore: number;
  lastScore: number;
}

export function DashboardPanel({ open, onClose, bestScore, lastScore }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-[rgba(42,36,24,0.55)] grid place-items-center p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dashboard-container w-full max-w-[400px] bg-cream-card rounded-3xl border border-[rgba(138,125,101,0.4)] p-7 shadow-[0_20px_60px_rgba(42,36,24,0.3)] relative text-center"
      >
        <button
          type="button"
          onClick={onClose}
          className="game-btn-close absolute top-3.5 right-3.5"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="m-0 text-ink-dark font-extrabold text-2xl">
            Bảng Thành Tích
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white border border-[rgba(138,125,101,0.25)] rounded-2xl p-3.5 flex flex-col items-start shadow-[0_4px_12px_rgba(42,36,24,0.04)]">
            <div className="flex justify-between items-center w-full mb-1.5">
              <span className="text-[11px] font-extrabold uppercase text-pencil-gray tracking-[0.8px]">Kỷ lục cao nhất</span>
              <Trophy size={16} color="#f0b840" />
            </div>
            <div className="text-2xl font-extrabold text-ink-dark">{bestScore}đ</div>
          </div>

          <div className="bg-white border border-[rgba(138,125,101,0.25)] rounded-2xl p-3.5 flex flex-col items-start shadow-[0_4px_12px_rgba(42,36,24,0.04)]">
            <div className="flex justify-between items-center w-full mb-1.5">
              <span className="text-[11px] font-extrabold uppercase text-pencil-gray tracking-[0.8px]">Lượt chơi cuối</span>
              <BarChart3 size={16} color="#e87432" />
            </div>
            <div className="text-2xl font-extrabold text-ink-dark">{lastScore}đ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
