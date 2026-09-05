import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Anchor, ArrowUp, Fish, Gift, Settings } from "lucide-react";

import type { DockUpgradeType } from "./progression";
import "./fishing-dock.css";

export type DockUpgradeId = DockUpgradeType;

export type DockUpgradeState = {
  level: number;
  maxLevel: number;
  value: string;
  cost: number | null;
  affordable: boolean;
  disabled?: boolean;
};

export type DockUpgradeMap = Readonly<Record<DockUpgradeId, DockUpgradeState>>;

export interface DockHudProps {
  earnings: number;
  giftRemainingMs: number;
  hooksLevel: number;
  upgrades: DockUpgradeMap;
  onOpenSettings: () => void;
  onOpenHooks: () => void;
  onOpenAquarium: () => void;
  onClaimGift: () => void;
  onBuyUpgrade: (upgrade: DockUpgradeId) => void;
  interactionLocked?: boolean;
  className?: string;
  currencySuffix?: string;
}

const UPGRADE_ORDER: readonly DockUpgradeId[] = ["capacity", "depth", "offlineRate"];

const UPGRADE_META = {
  capacity: {
    label: "SỨC CHỨA",
    renderIcon: () => <img src="/ui/upgrades/icon_addfish.png" width={64} height={64} alt="" className="fishing-dock-hud__upgrade-main-img" />,
  },
  depth: {
    label: "ĐỘ SÂU",
    renderIcon: () => <img src="/ui/upgrades/icon_depth.png" width={64} height={64} alt="" className="fishing-dock-hud__upgrade-main-img" />,
  },
  offlineRate: {
    label: "THU NHẬP RẢNH",
    renderIcon: () => <img src="/ui/upgrades/iconMoney.png" width={64} height={64} alt="" className="fishing-dock-hud__upgrade-main-img" />,
  },
} as const;

function compactNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const units = [
    { threshold: 1_000_000_000, suffix: "Tỷ" },
    { threshold: 1_000_000, suffix: "Tr" },
    { threshold: 1_000, suffix: "K" },
  ] as const;
  const unit = units.find(({ threshold }) => safeValue >= threshold);

  if (!unit) return Math.round(safeValue).toLocaleString("vi-VN");

  const scaled = safeValue / unit.threshold;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: digits })}${unit.suffix}`;
}

function formatCurrency(value: number, suffix: string): string {
  return `${compactNumber(value)}${suffix}`;
}

function formatCooldown(remainingMs: number): string {
  const safeSeconds = Math.ceil(Math.max(0, remainingMs) / 1_000);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

// Custom hook component for floating arrow animation via GSAP
function FloatingUpgradeArrow({ active }: { active: boolean }) {
  const arrowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!active || !arrowRef.current) return;
    const tween = gsap.to(arrowRef.current, {
      y: -7,
      repeat: -1,
      yoyo: true,
      duration: 0.55,
      ease: "sine.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [active]);

  if (!active) return null;

  return (
    <span ref={arrowRef} className="fishing-dock-hud__upgrade-arrow" aria-hidden="true">
      <ArrowUp className="fishing-dock-hud__upgrade-arrow-img" strokeWidth={3.2} />
    </span>
  );
}

export function DockHud({
  earnings,
  giftRemainingMs,
  hooksLevel,
  upgrades,
  onOpenSettings,
  onOpenHooks,
  onOpenAquarium,
  onClaimGift,
  onBuyUpgrade,
  interactionLocked = false,
  className,
  currencySuffix = "đ",
}: DockHudProps) {
  const giftReady = Math.max(0, giftRemainingMs) <= 0;
  const safeHooksLevel = Math.round(Math.max(0, hooksLevel));

  return (
    <section
      className={`fishing-dock-hud ${interactionLocked ? "is-locked" : ""} ${className || ""}`}
      aria-label="Bến câu cá"
      aria-busy={interactionLocked}
    >
      {/* Top Left Settings Button — Square with rounded corners (rounded-2xl) */}
      <button
        className="fishing-dock-hud__settings fishing-dock-hud__pressable"
        type="button"
        onClick={onOpenSettings}
        disabled={interactionLocked}
        aria-label="Mở cài đặt"
        title="Cài đặt"
      >
        <Settings aria-hidden="true" strokeWidth={3} />
      </button>

      {/* Top Center Earnings Display */}
      <div className="fishing-dock-hud__earnings" aria-live="polite">
        <span className="fishing-dock-hud__eyebrow">THU NHẬP</span>
        <strong className="fishing-dock-hud__earnings-value">
          {formatCurrency(earnings, currencySuffix)}
        </strong>
      </div>

      {/* Left Rail Menu Buttons — Pill/Rectangular Buttons with overlay animations */}
      <nav className="fishing-dock-hud__rail fishing-dock-hud__rail--left" aria-label="Đồ nghề và quà">
        <button
          className="fishing-dock-hud__rail-button fishing-dock-hud__pressable"
          type="button"
          onClick={onOpenHooks}
          disabled={interactionLocked}
          aria-label={`Mở lưỡi câu, cấp ${safeHooksLevel}`}
          title="Lưỡi câu"
        >
          <Anchor aria-hidden="true" strokeWidth={2.8} />
          <span>LƯỠI CÂU</span>
          <small>Cấp {safeHooksLevel}</small>
        </button>

        <button
          className={`fishing-dock-hud__rail-button fishing-dock-hud__gift fishing-dock-hud__pressable ${
            giftReady && !interactionLocked ? "is-ready" : ""
          }`}
          type="button"
          onClick={onClaimGift}
          disabled={interactionLocked}
          aria-label={giftReady ? "Mở bảng quà tặng ngẫu nhiên" : `Bảng quà tặng - mở quà sau ${formatCooldown(giftRemainingMs)}`}
          title="Quà tặng"
        >
          <Gift aria-hidden="true" strokeWidth={2.8} />
          <span>{giftReady ? "NHẬN QUÀ" : "QUÀ TẶNG"}</span>
          <small>{giftReady ? "Sẵn sàng" : formatCooldown(giftRemainingMs)}</small>
        </button>
      </nav>

      {/* Right Rail Menu Buttons */}
      <nav className="fishing-dock-hud__rail fishing-dock-hud__rail--right" aria-label="Thủy cung">
        <button
          className="fishing-dock-hud__rail-button fishing-dock-hud__pressable"
          type="button"
          onClick={onOpenAquarium}
          disabled={interactionLocked}
          aria-label="Mở Thủy cung"
          title="Thủy cung"
        >
          <Fish aria-hidden="true" strokeWidth={2.8} />
          <span>THỦY CUNG</span>
          <small>Bộ sưu tập</small>
        </button>
      </nav>

      {/* Bottom Upgrade Panel — 3 Dual-style Cards with GSAP floating arrows */}
      <div
        className="fishing-dock-hud__upgrades"
        aria-label="Nâng cấp nhanh"
        data-dock-anchor="upgrades"
      >
        {UPGRADE_ORDER.map((upgradeId) => {
          const upgrade = upgrades[upgradeId];
          const meta = UPGRADE_META[upgradeId];
          const safeLevel = Math.round(Math.max(0, upgrade.level));
          const safeMaxLevel = Math.max(1, Math.round(Math.max(0, upgrade.maxLevel)));
          const maxed = upgrade.cost === null || safeLevel >= safeMaxLevel;
          const showArrow = !maxed && upgrade.affordable && !interactionLocked && !upgrade.disabled;
          const unavailable = interactionLocked || Boolean(upgrade.disabled) || maxed || !upgrade.affordable;

          const priceLabel = maxed
            ? "MAX"
            : formatCurrency(upgrade.cost ?? 0, currencySuffix);

          return (
            <button
              key={upgradeId}
              className={`fishing-dock-hud__upgrade fishing-dock-hud__pressable ${
                maxed ? "is-maxed" : ""
              } ${!maxed && !upgrade.affordable ? "is-unaffordable" : ""}`}
              type="button"
              onClick={() => onBuyUpgrade(upgradeId)}
              disabled={unavailable}
            >
              {/* GSAP Floating Upgrade Arrow */}
              <FloatingUpgradeArrow active={showArrow} />

              {/* White Upper Card Section */}
              <span className="fishing-dock-hud__upgrade-heading">
                <span>{meta.label}</span>
              </span>

              <div className="fishing-dock-hud__upgrade-body">
                {meta.renderIcon()}
                <strong className="fishing-dock-hud__upgrade-value">Cấp {upgrade.value}</strong>
              </div>

              {/* Bottom Price Pill Section */}
              <span className="fishing-dock-hud__upgrade-price">{priceLabel}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}