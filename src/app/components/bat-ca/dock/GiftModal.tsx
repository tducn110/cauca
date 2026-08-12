import { useState, useEffect, useRef } from "react";
import { Coins, X, Sparkles, Gift, Gem, Trophy, Crown, Zap, Award, Star } from "lucide-react";
import { gameAudio } from "../../../audio/audioManager";
import "./fishing-dock-screen.css";

export interface GiftItem {
  id: string;
  name: string;
  value: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  rarityLabel: string;
  icon: typeof Gift;
  color: string;
  bgGradient: string;
  borderColor: string;
  badgeBg: string;
}

export const GIFT_BOARD_ITEMS: GiftItem[] = [
  {
    id: "gift-1",
    name: "Túi Xu Vàng",
    value: 500,
    rarity: "common",
    rarityLabel: "Phổ thông",
    icon: Coins,
    color: "#f59e0b",
    bgGradient: "from-amber-50 to-amber-100",
    borderColor: "border-amber-400",
    badgeBg: "bg-amber-500",
  },
  {
    id: "gift-2",
    name: "Túi May Mắn",
    value: 1200,
    rarity: "common",
    rarityLabel: "Phổ thông",
    icon: Sparkles,
    color: "#10b981",
    bgGradient: "from-emerald-50 to-emerald-100",
    borderColor: "border-emerald-400",
    badgeBg: "bg-emerald-500",
  },
  {
    id: "gift-3",
    name: "Hộp Bí Mật",
    value: 2500,
    rarity: "uncommon",
    rarityLabel: "Khá",
    icon: Gift,
    color: "#ec4899",
    bgGradient: "from-pink-50 to-pink-100",
    borderColor: "border-pink-400",
    badgeBg: "bg-pink-500",
  },
  {
    id: "gift-4",
    name: "Rương Kim Cương",
    value: 5000,
    rarity: "rare",
    rarityLabel: "Hiếm",
    icon: Gem,
    color: "#06b6d4",
    bgGradient: "from-cyan-50 to-cyan-100",
    borderColor: "border-cyan-400",
    badgeBg: "bg-cyan-500",
  },
  {
    id: "gift-5",
    name: "Hũ Tiền Siêu Cấp",
    value: 10000,
    rarity: "rare",
    rarityLabel: "Hiếm",
    icon: Trophy,
    color: "#eab308",
    bgGradient: "from-yellow-50 to-yellow-100",
    borderColor: "border-yellow-400",
    badgeBg: "bg-yellow-500",
  },
  {
    id: "gift-6",
    name: "Vé Tăng Tốc",
    value: 20000,
    rarity: "epic",
    rarityLabel: "Cực hiếm",
    icon: Zap,
    color: "#3b82f6",
    bgGradient: "from-blue-50 to-blue-100",
    borderColor: "border-blue-400",
    badgeBg: "bg-blue-500",
  },
  {
    id: "gift-7",
    name: "Báu Vật Biển",
    value: 35000,
    rarity: "epic",
    rarityLabel: "Cực hiếm",
    icon: Award,
    color: "#8b5cf6",
    bgGradient: "from-purple-50 to-purple-100",
    borderColor: "border-purple-400",
    badgeBg: "bg-purple-500",
  },
  {
    id: "gift-8",
    name: "Kho Báu Hoàng Gia",
    value: 60000,
    rarity: "legendary",
    rarityLabel: "Huyền thoại",
    icon: Crown,
    color: "#f97316",
    bgGradient: "from-orange-50 to-orange-100",
    borderColor: "border-orange-400",
    badgeBg: "bg-orange-500",
  },
  {
    id: "gift-9",
    name: "SIÊU JACKPOT",
    value: 100000,
    rarity: "legendary",
    rarityLabel: "Thần thoại",
    icon: Star,
    color: "#ef4444",
    bgGradient: "from-red-50 to-red-100",
    borderColor: "border-red-500",
    badgeBg: "bg-red-600",
  },
];

function formatCooldown(remainingMs: number): string {
  const safeSeconds = Math.ceil(Math.max(0, remainingMs) / 1_000);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

interface Props {
  onClose: () => void;
  onNotice: (msg: string) => void;
  onClaimReward: (amount: number) => { claimed: boolean; amount: number; reason?: string };
  giftRemainingMs: number;
  wallet: number;
}

export function GiftModal({ onClose, onNotice, onClaimReward, giftRemainingMs, wallet }: Props) {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonGift, setWonGift] = useState<GiftItem | null>(null);
  const timerRef = useRef<number | null>(null);

  const ready = giftRemainingMs <= 0;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleStartSpin = () => {
    if (isSpinning || !ready) return;

    setIsSpinning(true);
    setWinningIndex(null);
    setWonGift(null);
    gameAudio.play("click");

    // Pick weighted winner index (lower value gifts have higher chance, high jackpot lower chance)
    const probabilities = [25, 20, 18, 14, 10, 6, 4, 2, 1];
    const totalProb = probabilities.reduce((a, b) => a + b, 0);
    let rnd = Math.random() * totalProb;
    let selectedWinner = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (rnd < probabilities[i]) {
        selectedWinner = i;
        break;
      }
      rnd -= probabilities[i];
    }

    // Animation configuration: 3 full turns (27 steps) + selectedWinner index
    const totalSteps = 27 + selectedWinner;
    let currentStep = 0;
    let currentDelay = 50; // ms

    const runStep = () => {
      const idx = currentStep % 9;
      setHighlightedIndex(idx);
      gameAudio.play("click");

      if (currentStep >= totalSteps) {
        // Spin finished!
        setWinningIndex(selectedWinner);
        setIsSpinning(false);
        const winnerItem = GIFT_BOARD_ITEMS[selectedWinner];
        setWonGift(winnerItem);
        gameAudio.play("level");

        // Claim reward in progression
        const result = onClaimReward(winnerItem.value);
        if (result.claimed) {
          onNotice(`🎉 Chúc mừng! Bạn nhận được ${winnerItem.name} (+${winnerItem.value.toLocaleString("vi-VN")}đ)!`);
        } else if (result.reason === "wallet-full") {
          onNotice("Ví đã đầy!");
        }
        return;
      }

      currentStep++;
      // Progressively slow down in the final steps
      if (currentStep > totalSteps - 10) {
        currentDelay += 28;
      } else if (currentStep > totalSteps - 18) {
        currentDelay += 12;
      }

      timerRef.current = window.setTimeout(runStep, currentDelay);
    };

    runStep();
  };

  return (
    <div className="fishing-dock-screen__backdrop" onClick={!isSpinning ? onClose : undefined}>
      <div
        className="w-[min(480px,96vw)] rounded-[32px] bg-white border-2 border-slate-300 border-b-[4px] overflow-hidden flex flex-col max-h-[calc(100dvh-30px)] shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-4 sm:p-5 text-center relative border-b-2 border-slate-300 flex-shrink-0">
          {/* Coin Wallet Badge */}
          <div className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-4 px-3 py-1.5 rounded-full bg-yellow-100 border border-yellow-400 border-b-[2px] text-black font-black flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="text-amber-500">
              <Coins size={16} strokeWidth={3} />
            </span>
            <span>{wallet.toLocaleString("vi-VN")}</span>
          </div>

          <h2 id="gift-modal-title" className="text-lg sm:text-2xl font-black text-black m-0 uppercase tracking-wide">
            Quà Tặng Ngẫu Nhiên
          </h2>

          <button
            type="button"
            disabled={isSpinning}
            className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center transition-all border border-slate-300 border-b-2 active:border-b active:translate-y-[2px] disabled:opacity-50"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} strokeWidth={3.5} />
          </button>
        </div>

        {/* 3x3 Gift Board Grid */}
        <div className="p-3.5 sm:p-5 grid grid-cols-3 gap-2.5 sm:gap-3.5 overflow-y-auto bg-slate-100 flex-1">
          {GIFT_BOARD_ITEMS.map((item, idx) => {
            const IconComp = item.icon;
            const isHighlighted = highlightedIndex === idx;
            const isWinner = winningIndex === idx;

            return (
              <div
                key={item.id}
                className={`relative aspect-square rounded-[22px] flex flex-col items-center justify-between p-2 sm:p-3 transition-all duration-150 border-2 sm:border-2 border-slate-300 select-none ${
                  isWinner
                    ? "bg-gradient-to-b from-yellow-200 to-amber-300 border-b-[4px] border-amber-600 scale-105 z-10 shadow-lg ring-4 ring-yellow-400 animate-pulse"
                    : isHighlighted
                    ? "bg-yellow-100 border-b-[3px] border-orange-500 scale-105 z-10 ring-4 ring-yellow-300 shadow-md"
                    : "bg-white border-b-[2px] hover:border-b-[3px] hover:-translate-y-0.5"
                }`}
              >
                {/* Upper Rarity Badge */}
                <div className="w-full flex items-center justify-between">
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${item.badgeBg} border border-slate-200 border-b`}>
                    {item.rarityLabel}
                  </span>
                  {isWinner && (
                    <span className="animate-bounce text-amber-600">
                      <Sparkles size={16} strokeWidth={3} />
                    </span>
                  )}
                </div>

                {/* Main Gift Icon */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform ${
                    isHighlighted || isWinner ? "scale-110" : ""
                  }`}
                  style={{ color: item.color }}
                >
                  <IconComp size={36} strokeWidth={3} />
                </div>

                {/* Gift Name */}
                <span className="text-[10px] sm:text-[11.5px] font-black text-slate-800 text-center leading-tight uppercase tracking-tight line-clamp-1">
                  {item.name}
                </span>

                {/* Bottom Reward Pill - Matching current HUD buttons style */}
                <div className="w-full mt-1 py-1 rounded-xl bg-orange-500 text-white font-black text-center text-xs sm:text-sm border border-orange-600 border-b-[2px] shadow-sm">
                  +{item.value.toLocaleString("vi-VN")}đ
                </div>
              </div>
            );
          })}
        </div>

        {/* Won Banner Modal Overlay */}
        {wonGift && (
          <div className="bg-yellow-300 border-t-2 border-b-2 border-yellow-600 p-3.5 text-center flex flex-col items-center gap-1 animate-fadeIn">
            <div className="flex items-center gap-2 text-black font-black text-sm sm:text-base uppercase">
              <Sparkles className="text-orange-600" size={20} strokeWidth={3} />
              <span>BẠN ĐÃ TRÚNG: {wonGift.name}!</span>
              <Sparkles className="text-orange-600" size={20} strokeWidth={3} />
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 m-0">
              Nhận ngay <strong className="text-orange-600 font-black">+{wonGift.value.toLocaleString("vi-VN")}đ</strong> vào tài khoản!
            </p>
          </div>
        )}

        {/* Footer Action Button */}
        <div className="p-4 sm:p-5 border-t-2 border-slate-300 bg-white flex flex-col items-center gap-2 flex-shrink-0">
          <button
            type="button"
            disabled={isSpinning || !ready}
            onClick={handleStartSpin}
            className={`w-full py-3.5 sm:py-4 rounded-[22px] font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all border-2 border-orange-600 ${
              ready
                ? "bg-orange-500 text-white border-b-[4px] hover:bg-orange-600 active:border-b-2 active:translate-y-[2px] cursor-pointer shadow-lg"
                : "bg-gray-200 text-gray-500 border-b-[3px] cursor-not-allowed opacity-90"
            }`}
          >
            <Gift size={24} strokeWidth={3} />
            <span>
              {isSpinning
                ? "ĐANG QUAY..."
                : ready
                ? "QUAY NGẪU NHIÊN (MIỄN PHÍ)"
                : `QUÀ MỞ SAU ${formatCooldown(giftRemainingMs)}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
