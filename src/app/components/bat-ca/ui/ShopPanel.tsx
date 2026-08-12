import { useEffect, useState } from "react";
import { Game, BUFF_DEFS } from "../engine";
import type { BuffType } from "../engine";
import { Bomb, Gauge, Clock, Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import { gameAudio } from "../../../audio/audioManager";

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
  const [cart, setCart] = useState<Partial<Record<BuffType, number>>>({});

  const pendingCost = BUFF_DEFS.reduce((sum, def) => {
    const qty = (cart[def.type] ?? 0) / def.value;
    return sum + qty * def.cost;
  }, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const addToCart = (type: BuffType) => {
    const def = BUFF_DEFS.find((d) => d.type === type)!;
    if (pendingCost + def.cost > money) return;
    setCart((current) => ({ ...current, [type]: (current[type] ?? 0) + def.value }));
  };

  const removeFromCart = (type: BuffType) => {
    const def = BUFF_DEFS.find((d) => d.type === type)!;
    const next = { ...cart };
    next[type] = Math.max(0, (next[type] ?? 0) - def.value);
    if (next[type] === 0) delete next[type];
    setCart(next);
  };

  const checkout = () => {
    let boughtAny = false;
    BUFF_DEFS.forEach((def) => {
      const quantity = Math.floor((cart[def.type] ?? 0) / def.value);
      for (let i = 0; i < quantity; i++) {
        if (!game.buyBuff(def.type)) break;
        boughtAny = true;
      }
    });
    setCart({});
    if (boughtAny) gameAudio.play("buy");
    onBuy();
  };

  return (
    <div className="batca-backdrop" onClick={onClose}>
      <div
        className="batca-card batca-shop-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batca-shop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="batca-shop-title">Cửa hàng vật phẩm</h2>
        <div className="batca-money-chip">💰 {money}đ</div>

        <div className="batca-shop-list">
          {BUFF_DEFS.map((def) => {
            const pendingQty = (cart[def.type] ?? 0) / def.value;
            const committedQty = (game.nextLevelBuffs[def.type] ?? 0) / def.value;
            const totalQty = committedQty + pendingQty;
            const canAfford = pendingCost + def.cost <= money;
            return (
              <div key={def.type} className={`batca-upg ${!canAfford && pendingQty === 0 ? "opacity-60" : ""}`}>
                <div className="batca-upg-icon">{BUFF_ICONS[def.type]}</div>
                <div className="batca-upg-body">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">{def.name}</span>
                    {totalQty > 0 && <span className="text-xs text-orange-cta font-bold">x{totalQty}</span>}
                  </div>
                  <div className="text-[11px] text-pencil-gray font-medium mt-0.5">{def.desc}</div>
                  <div className="text-[11px] text-bamboo-green font-bold mt-0.5">+{def.value} {def.unit}</div>
                  {committedQty > 0 && (
                    <div className="text-[10px] text-pencil-gray font-bold mt-0.5">Đã mua: x{committedQty}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pendingQty > 0 && (
                    <button
                      className="batca-shop-qty-btn"
                      onClick={() => removeFromCart(def.type)}
                      aria-label={`Bớt ${def.name}`}
                    >
                      −
                    </button>
                  )}
                  <button
                    className="batca-upg-buy"
                    disabled={!canAfford}
                    onClick={() => addToCart(def.type)}
                  >
                    {def.cost}đ
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {pendingCost > 0 && (
          <div className="batca-shop-total">
            Đang chọn: <span>{pendingCost}đ</span>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <button
            className="batca-btn batca-btn-primary w-full"
            onClick={checkout}
            disabled={pendingCost === 0}
          >
            {pendingCost > 0 ? `Mua (${pendingCost}đ)` : "Chọn vật phẩm"}
          </button>
          <button className="batca-btn batca-btn-ghost w-full" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
