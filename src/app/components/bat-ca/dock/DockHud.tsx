import {
  Anchor,
  ArrowDownToLine,
  ArrowUp,
  CircleDollarSign,
  Gift,
  PackageOpen,
  Settings,
  Trophy,
} from "lucide-react";

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
  bestScore: number;
  giftRemainingMs: number;
  hooksLevel: number;
  upgrades: DockUpgradeMap;
  onOpenSettings: () => void;
  onOpenHooks: () => void;
  onClaimGift: () => void;
  onBuyUpgrade: (upgrade: DockUpgradeId) => void;
  interactionLocked?: boolean;
  className?: string;
  currencySuffix?: string;
}

const UPGRADE_ORDER: readonly DockUpgradeId[] = ["capacity", "depth", "offlineRate"];

const UPGRADE_META = {
  capacity: {
    label: "Sức chứa",
    icon: PackageOpen,
  },
  depth: {
    label: "Độ sâu",
    icon: ArrowDownToLine,
  },
  offlineRate: {
    label: "Thu nhập rảnh",
    icon: CircleDollarSign,
  },
} as const;

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function compactNumber(value: number): string {
  const safeValue = finiteNonNegative(value);
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
  const safeSeconds = Math.ceil(finiteNonNegative(remainingMs) / 1_000);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

function joinClassNames(...classNames: Array<string | undefined | false>): string {
  return classNames.filter(Boolean).join(" ");
}

export function DockHud({
  earnings,
  bestScore,
  giftRemainingMs,
  hooksLevel,
  upgrades,
  onOpenSettings,
  onOpenHooks,
  onClaimGift,
  onBuyUpgrade,
  interactionLocked = false,
  className,
  currencySuffix = "đ",
}: DockHudProps) {
  const giftReady = finiteNonNegative(giftRemainingMs) <= 0;
  const safeHooksLevel = Math.round(finiteNonNegative(hooksLevel));

  return (
    <section
      className={joinClassNames("fishing-dock-hud", interactionLocked && "is-locked", className)}
      aria-label="Bến câu cá"
      aria-busy={interactionLocked}
    >
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

      <div className="fishing-dock-hud__earnings" aria-live="polite">
        <span className="fishing-dock-hud__eyebrow">Thu nhập</span>
        <strong className="fishing-dock-hud__earnings-value">
          {formatCurrency(earnings, currencySuffix)}
        </strong>
      </div>

      <div
        className="fishing-dock-hud__best"
        aria-label={`Kỷ lục ${formatCurrency(bestScore, currencySuffix)}`}
      >
        <span className="fishing-dock-hud__best-badge">Kỷ lục</span>
        <Trophy aria-hidden="true" strokeWidth={2.8} />
        <strong>{formatCurrency(bestScore, currencySuffix)}</strong>
      </div>

      <nav className="fishing-dock-hud__rail" aria-label="Đồ nghề và quà">
        <button
          className="fishing-dock-hud__rail-button fishing-dock-hud__pressable"
          type="button"
          onClick={onOpenHooks}
          disabled={interactionLocked}
          aria-label={`Mở lưỡi câu, cấp ${safeHooksLevel}`}
          title="Lưỡi câu"
        >
          <Anchor aria-hidden="true" strokeWidth={2.8} />
          <span>Lưỡi câu</span>
          <small>Cấp {safeHooksLevel}</small>
        </button>

        <button
          className={joinClassNames(
            "fishing-dock-hud__rail-button",
            "fishing-dock-hud__gift",
            "fishing-dock-hud__pressable",
            giftReady && !interactionLocked && "is-ready",
          )}
          type="button"
          onClick={onClaimGift}
          disabled={!giftReady || interactionLocked}
          aria-label={giftReady ? "Nhận quà miễn phí" : `Quà mở sau ${formatCooldown(giftRemainingMs)}`}
          title={giftReady ? "Nhận quà" : "Quà đang hồi"}
        >
          <Gift aria-hidden="true" strokeWidth={2.8} />
          <span>{giftReady ? "Nhận quà" : "Quà tặng"}</span>
          <small>{giftReady ? "Sẵn sàng" : formatCooldown(giftRemainingMs)}</small>
        </button>
      </nav>

      <div
        className="fishing-dock-hud__upgrades"
        aria-label="Nâng cấp nhanh"
        data-dock-anchor="upgrades"
      >
        {UPGRADE_ORDER.map((upgradeId) => {
          const upgrade = upgrades[upgradeId];
          const meta = UPGRADE_META[upgradeId];
          const UpgradeIcon = meta.icon;
          const safeLevel = Math.round(finiteNonNegative(upgrade.level));
          const safeMaxLevel = Math.max(1, Math.round(finiteNonNegative(upgrade.maxLevel)));
          const maxed = upgrade.cost === null || safeLevel >= safeMaxLevel;
          const unavailable = interactionLocked || Boolean(upgrade.disabled) || maxed || !upgrade.affordable;
          const progress = Math.min(100, (safeLevel / safeMaxLevel) * 100);
          const priceLabel = maxed
            ? "MAX"
            : formatCurrency(upgrade.cost ?? 0, currencySuffix);
          const statusLabel = maxed
            ? "đã nâng tối đa"
            : !upgrade.affordable
              ? "chưa đủ tiền"
              : upgrade.disabled
                ? "chưa thể nâng cấp"
                : `giá ${priceLabel}`;

          return (
            <button
              key={upgradeId}
              className={joinClassNames(
                "fishing-dock-hud__upgrade",
                "fishing-dock-hud__pressable",
                maxed && "is-maxed",
                !maxed && !upgrade.affordable && "is-unaffordable",
              )}
              type="button"
              onClick={() => onBuyUpgrade(upgradeId)}
              disabled={unavailable}
              aria-label={`${meta.label}, cấp ${safeLevel}, ${upgrade.value}, ${statusLabel}`}
              title={`${meta.label}: ${statusLabel}`}
            >
              {!maxed && (
                <span className="fishing-dock-hud__upgrade-arrow" aria-hidden="true">
                  <ArrowUp strokeWidth={3.4} />
                </span>
              )}
              <span className="fishing-dock-hud__upgrade-heading">
                <UpgradeIcon aria-hidden="true" strokeWidth={2.8} />
                <span>{meta.label}</span>
              </span>
              <strong className="fishing-dock-hud__upgrade-value">{upgrade.value}</strong>
              <span className="fishing-dock-hud__upgrade-level">Cấp {safeLevel}</span>
              <span className="fishing-dock-hud__upgrade-track" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </span>
              <span className="fishing-dock-hud__upgrade-price">{priceLabel}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
