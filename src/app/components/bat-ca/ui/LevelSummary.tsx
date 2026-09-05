import { Trophy, ArrowRight, ShoppingCart, Zap, Bomb } from "lucide-react";
import type { LevelDef } from "../game/levels";
import type { BuffState } from "../engine";

interface Props {
  levelDef: LevelDef;
  levelScore: number;
  levelFishCaught: number;
  totalScore: number;
  hasAffordableUpgrade: boolean;
  nextLevelBuffs: BuffState;
  onNextLevel: () => void;
  onUpgrade: () => void;
  onShop: () => void;
  onEndGame: () => void;
  transitionPending?: boolean;
}

export function LevelSummary({
  levelDef,
  levelScore,
  levelFishCaught,
  totalScore,
  hasAffordableUpgrade,
  nextLevelBuffs,
  onNextLevel,
  onUpgrade,
  onShop,
  onEndGame,
  transitionPending = false,
}: Props) {
  const hasBuffs = Object.keys(nextLevelBuffs).length > 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(42,36,24,0.7)] backdrop-blur-sm p-3">
      <div className="bg-cream-card rounded-3xl p-6 max-w-[360px] w-[90%] max-h-full overflow-y-auto shadow-2xl text-center" role="dialog" aria-modal="true" aria-labelledby="batca-level-summary-title">
        {/* Header */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 bg-bamboo-green text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
            <Trophy size={14} />
            Hoàn thành!
          </div>
          <h2 id="batca-level-summary-title" className="text-2xl font-extrabold text-ink-dark">
            Level {levelDef.level} ✓
          </h2>
        </div>

        {/* Score */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-pencil-gray">Mục tiêu</span>
            <span className="text-sm font-bold text-ink-dark">{levelDef.target}đ</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-bamboo-green transition-all"
              style={{ width: `${Math.min(100, (levelScore / levelDef.target) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-extrabold text-orange-cta">{levelScore}đ</span>
            <span className="text-xs text-bamboo-green font-bold">
              +{levelScore - levelDef.target}đ dư
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-mascot-yellow" />
            <span className="text-ink-dark">{levelFishCaught} cá</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-pencil-gray">Tổng:</span>
            <span className="font-bold text-ink-dark">{totalScore}đ</span>
          </div>
        </div>

        {hasBuffs && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-orange-cta mb-4">
            <Bomb size={14} />
            Đã chuẩn bị vật phẩm cho level sau
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onNextLevel}
            disabled={transitionPending}
            className="flex items-center justify-center gap-2 bg-gradient-to-b from-[#f08a48] to-orange-cta text-white font-extrabold py-3 rounded-full shadow-[0_4px_12px_rgba(232,116,50,0.4)] hover:shadow-[0_6px_16px_rgba(232,116,50,0.5)] transition-shadow"
          >
            Level {levelDef.level + 1}
            <ArrowRight size={16} />
          </button>

          {hasAffordableUpgrade && (
            <button
              onClick={onUpgrade}
              className="flex items-center justify-center gap-2 bg-white text-ink-dark font-bold py-2.5 rounded-full hover:bg-gray-50 transition-colors text-sm"
            >
              <ShoppingCart size={14} />
              Nâng cấp
            </button>
          )}

          <button
            onClick={onShop}
            className="flex items-center justify-center gap-2 bg-white text-orange-cta font-bold py-2.5 rounded-full hover:bg-orange-50 transition-colors text-sm"
          >
            <Bomb size={14} />
            Mua vật phẩm
          </button>

          <button
            onClick={onEndGame}
            className="text-pencil-gray text-xs font-bold py-1 hover:text-ink-dark transition-colors"
          >
            Kết thúc chuyến câu
          </button>
        </div>
      </div>
    </div>
  );
}
