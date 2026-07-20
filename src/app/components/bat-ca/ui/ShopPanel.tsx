import { useState } from "react";
import { Game, BUFF_DEFS } from "../engine";
import type { BuffType } from "../engine";
import { Bomb, Gauge, Clock, Maximize2 } from "lucide-react";
import type { ReactNode } from "react";

const BUFF_ICONS: Record<BuffType, ReactNode> = {
  dynamite: <Bomb size={20} />,
  strength: <Gauge size={20} />,
  time: <Clock size={20} />,
  bigNet: <Maximize2 size={20} />,
};

interface Props {
  game: Game;
  money: number;
  onBuy: () => void;
  onClose: () => void;
}

export function ShopPanel({ game, money, onBuy, onClose }: Props) {
  const [cart, setCart] = useState<Record<BuffType, number>>({ ...game.nextLevelBuffs } as Record<BuffType, number>);

  const cartCost = BUFF_DEFS.reduce((sum, def) => {
    const qty = (cart[def.type] ?? 0) / def.value;
    return sum + qty * def.cost;
  }, 0);

  const committedCost = BUFF_DEFS.reduce((sum, def) => {
    const qty = (game.nextLevelBuffs[def.type] ?? 0) / def.value;
    return sum + qty * def.cost;
  }, 0);

  const addToCart = (type: BuffType) => {
    const def = BUFF_DEFS.find((d) => d.type === type)!;
    const next = { ...cart, [type]: (cart[type] ?? 0) + def.value };
    const cost = BUFF_DEFS.reduce((s, d) => s + ((next[d.type] ?? 0) / d.value) * d.cost, 0);
    if (cost <= money + committedCost) {
      setCart(next);
    }
  };

  const removeFromCart = (type: BuffType) => {
    const def = BUFF_DEFS.find((d) => d.type === type)!;
    const next = { ...cart };
    next[type] = Math.max(0, (next[type] ?? 0) - def.value);
    if (next[type] === 0) delete next[type];
    setCart(next);
  };

  const checkout = () => {
    // So sánh cart với nextLevelBuffs đã mua: chỉ mua phần tăng thêm
    BUFF_DEFS.forEach((def) => {
      const target = cart[def.type] ?? 0;
      const current = game.nextLevelBuffs[def.type] ?? 0;
      const extra = target - current;
      for (let i = 0; i < extra / def.value; i++) {
        game.buyBuff(def.type);
      }
    });
    setCart({ ...game.nextLevelBuffs } as Record<BuffType, number>);
    onBuy();
  };

  return (
    <div className="batca-backdrop">
      <div className="batca-card batca-shop-card">
        <h2>Cửa hàng vật phẩm</h2>
        <div className="batca-money-chip">💰 {money}đ</div>

        <div className="batca-shop-list">
          {BUFF_DEFS.map((def) => {
            const inCart = cart[def.type] ?? 0;
            const qty = inCart / def.value;
            const canAfford = money >= def.cost || qty > 0;
            return (
              <div key={def.type} className={`batca-upg ${!canAfford ? "opacity-60" : ""}`}>
                <div className="batca-upg-icon">{BUFF_ICONS[def.type]}</div>
                <div className="batca-upg-body">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">{def.name}</span>
                    {qty > 0 && <span className="text-xs text-orange-cta font-bold">x{qty}</span>}
                  </div>
                  <div className="text-[11px] text-pencil-gray font-medium mt-0.5">{def.desc}</div>
                  <div className="text-[11px] text-bamboo-green font-bold mt-0.5">+{def.value} {def.unit}</div>
                </div>
                <div className="flex items-center gap-2">
                  {qty > 0 && (
                    <button
                      className="batca-shop-qty-btn"
                      onClick={() => removeFromCart(def.type)}
                      aria-label="Bớt"
                    >
                      −
                    </button>
                  )}
                  <button
                    className="batca-upg-buy"
                    disabled={money < def.cost && qty === 0}
                    onClick={() => addToCart(def.type)}
                  >
                    {def.cost}đ
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {cartCost > 0 && (
          <div className="batca-shop-total">
            Tổng: <span>{cartCost}đ</span>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <button
            className="batca-btn batca-btn-primary w-full"
            onClick={checkout}
            disabled={cartCost === 0}
          >
            {cartCost > 0 ? `Mua (${cartCost}đ)` : "Chọn vật phẩm"}
          </button>
          <button className="batca-btn batca-btn-ghost w-full" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
