import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Anchor, ArrowUp, Fish, Gift, Settings, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  bestScore?: number;
  giftRemainingMs: number;
  hooksLevel: number;
  upgrades: DockUpgradeMap;
  onOpenSettings: () => void;
  onOpenHooks: () => void;
  onOpenAquarium: () => void;
  onOpenLeaderboard?: () => void;
  onClaimGift: () => void;
  onBuyUpgrade: (upgrade: DockUpgradeId) => void;
  interactionLocked?: boolean;
  className?: string;
  currencySuffix?: string;
}

const UPGRADE_ORDER: readonly DockUpgradeId[] = ["capacity", "depth", "offlineRate"];

const UPGRADE_META = {
  capacity: {
    iconKey: "capacity",
    renderIcon: () => <img src="/ui/upgrades/icon_addfish.webp" width={64} height={64} alt="" className="fishing-dock-hud__upgrade-main-img" />,
  },
  depth: {
    iconKey: "depth",
    renderIcon: () => <img src="/ui/upgrades/icon_depth.webp" width={64} height={64} alt="" className="fishing-dock-hud__upgrade-main-img" />,
  },
  offlineRate: {
    iconKey: "offlineRate",
    renderIcon: () => <img src="/ui/upgrades/iconMoney.webp" width={64} height={64} alt="" className="fishing-dock-hud__upgrade-main-img" />,
  },
} as const;

function compactNumber(value: number, isEn: boolean): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const units = isEn
    ? ([
        { threshold: 1_000_000_000, suffix: "B" },
        { threshold: 1_000_000, suffix: "M" },
        { threshold: 1_000, suffix: "K" },
      ] as const)
    : ([
        { threshold: 1_000_000_000, suffix: "Tỷ" },
        { threshold: 1_000_000, suffix: "Tr" },
        { threshold: 1_000, suffix: "K" },
      ] as const);
  const unit = units.find(({ threshold }) => safeValue >= threshold);
  const locale = isEn ? "en-US" : "vi-VN";

  if (!unit) return Math.round(safeValue).toLocaleString(locale);

  const scaled = safeValue / unit.threshold;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toLocaleString(locale, { maximumFractionDigits: digits })}${unit.suffix}`;
}

function formatCurrency(value: number, suffix: string, isEn: boolean): string {
  return `${compactNumber(value, isEn)}${suffix}`;
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
  bestScore = 0,
  giftRemainingMs,
  hooksLevel,
  upgrades,
  onOpenSettings,
  onOpenHooks,
  onOpenAquarium,
  onOpenLeaderboard,
  onClaimGift,
  onBuyUpgrade,
  interactionLocked = false,
  className,
  currencySuffix = "đ",
}: DockHudProps) {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.resolvedLanguage || i18n.language || "en").startsWith("en");
  const giftReady = Math.max(0, giftRemainingMs) <= 0;
  const safeHooksLevel = Math.round(Math.max(0, hooksLevel));

  const upgradeLabels: Record<DockUpgradeId, string> = {
    capacity: t("dock.capacity"),
    depth: t("dock.depth"),
    offlineRate: t("dock.offlineRate"),
  };

  return (
    <section
      className={`fishing-dock-hud ${interactionLocked ? "is-locked" : ""} ${className || ""}`}
      aria-label={t("dock.dockAria")}
      aria-busy={interactionLocked}
    >
      {/* Top Left Settings Button — Square with rounded corners (rounded-2xl) */}
      <button
        className="fishing-dock-hud__settings fishing-dock-hud__pressable"
        type="button"
        onClick={onOpenSettings}
        disabled={interactionLocked}
        aria-label={t("dock.openSettings")}
        title={t("settings.title")}
      >
        <Settings aria-hidden="true" strokeWidth={3} />
      </button>

      {/* Top Center Earnings Display */}
      <div className="fishing-dock-hud__earnings" aria-live="polite">
        <span className="fishing-dock-hud__eyebrow">{t("dock.earnings")}</span>
        <strong className="fishing-dock-hud__earnings-value">
          {formatCurrency(earnings, currencySuffix, isEn)}
        </strong>
      </div>

      {/* Top Right Best Score / Leaderboard Button */}
      {onOpenLeaderboard && (
        <button
          className="fishing-dock-hud__best fishing-dock-hud__pressable"
          type="button"
          onClick={onOpenLeaderboard}
          disabled={interactionLocked}
          aria-label={t("dock.openLeaderboard", { score: compactNumber(bestScore, isEn) })}
          title={t("dock.leaderboardTitle")}
        >
          <Trophy aria-hidden="true" strokeWidth={2.8} />
          <strong>{compactNumber(bestScore, isEn)}</strong>
          <span className="fishing-dock-hud__best-badge">{t("dock.bestScore")}</span>
        </button>
      )}

      {/* Left Rail Menu Buttons — Pill/Rectangular Buttons with overlay animations */}
      <nav className="fishing-dock-hud__rail fishing-dock-hud__rail--left" aria-label={t("dock.gearAndGifts")}>
        <button
          className="fishing-dock-hud__rail-button fishing-dock-hud__pressable"
          type="button"
          onClick={onOpenHooks}
          disabled={interactionLocked}
          aria-label={t("dock.openHooks", { level: safeHooksLevel })}
          title={t("dock.hooks")}
        >
          <Anchor aria-hidden="true" strokeWidth={2.8} />
          <span>{t("dock.hooks")}</span>
          <small>{t("dock.level", { val: safeHooksLevel })}</small>
        </button>

        <button
          className={`fishing-dock-hud__rail-button fishing-dock-hud__gift fishing-dock-hud__pressable ${
            giftReady && !interactionLocked ? "is-ready" : ""
          }`}
          type="button"
          onClick={onClaimGift}
          disabled={interactionLocked}
          aria-label={giftReady ? t("dock.giftModalOpen") : t("dock.giftModalCountdown", { cooldown: formatCooldown(giftRemainingMs) })}
          title={t("dock.gift")}
        >
          <Gift aria-hidden="true" strokeWidth={2.8} />
          <span>{giftReady ? t("dock.claimGift") : t("dock.gift")}</span>
          <small>{giftReady ? t("dock.ready") : formatCooldown(giftRemainingMs)}</small>
        </button>
      </nav>

      {/* Right Rail Menu Buttons */}
      <nav className="fishing-dock-hud__rail fishing-dock-hud__rail--right" aria-label={t("dock.aquarium")}>
        <button
          className="fishing-dock-hud__rail-button fishing-dock-hud__pressable"
          type="button"
          onClick={onOpenAquarium}
          disabled={interactionLocked}
          aria-label={t("dock.openAquarium")}
          title={t("dock.aquarium")}
        >
          <Fish aria-hidden="true" strokeWidth={2.8} />
          <span>{t("dock.aquarium")}</span>
          <small>{t("dock.collection")}</small>
        </button>
      </nav>

      {/* Bottom Upgrade Panel — 3 Dual-style Cards with GSAP floating arrows */}
      <div
        className="fishing-dock-hud__upgrades"
        aria-label={t("dock.quickUpgrades")}
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
            ? t("dock.max")
            : formatCurrency(upgrade.cost ?? 0, currencySuffix, isEn);

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
                <span>{upgradeLabels[upgradeId]}</span>
              </span>

              <div className="fishing-dock-hud__upgrade-body">
                {meta.renderIcon()}
                <strong className="fishing-dock-hud__upgrade-value">{t("dock.level", { val: upgrade.value })}</strong>
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