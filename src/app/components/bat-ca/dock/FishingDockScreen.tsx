import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gameAudio } from "../../../audio/audioManager";
import { DEPTH_UPGRADE_DELTA, INITIAL_CAPACITY, INITIAL_MAX_DEPTH } from "../game/constants";
import { UPGRADE_META } from "../game/fish-data";
import { DockHud, type DockUpgradeMap } from "./DockHud";
import { FishingDockCanvas, type PowerLockResult } from "./FishingDockCanvas";
import {
  createDockLayout,
  dockLayoutCssVariables,
  type DockSafeAreaInsets,
} from "./dockLayout";
import { useDockProgression } from "./useDockProgression";
import type { DockUpgradeType } from "./progression";
import { HooksPanel } from "./HooksPanel";
import { SettingsModal } from "./SettingsModal";
import { AquariumPanel } from "./AquariumPanel";
import { OfflineEarningsModal } from "./OfflineEarningsModal";
import { calculateOfflineEarnings } from "../game/storage";
import "./fishing-dock-screen.css";

type DockPanel = "settings" | "hooks" | "aquarium" | null;

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  onPlay: () => void;
  onShowStats: () => void;
};

function readSafeAreaInsets(element: HTMLElement): DockSafeAreaInsets {
  const styles = window.getComputedStyle(element);
  const readInset = (property: string) => {
    const value = Number.parseFloat(styles.getPropertyValue(property));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  return {
    top: readInset("--dock-viewport-inset-top"),
    right: readInset("--dock-viewport-inset-right"),
    bottom: readInset("--dock-viewport-inset-bottom"),
    left: readInset("--dock-viewport-inset-left"),
  };
}

export function FishingDockScreen({ muted, onToggleMute, onPlay, onShowStats }: Props) {
  const progression = useDockProgression();
  const screenRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState(() => createDockLayout());
  const [panel, setPanel] = useState<DockPanel>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineEarningsData, setOfflineEarningsData] = useState<{ amount: number; eligibleMinutes: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<PowerLockResult | null>(null);
  const launchTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const launching = launchResult !== null;

  // Check offline earnings on mount
  useEffect(() => {
    const offline = calculateOfflineEarnings();
    if (offline.amount > 0 && offline.eligibleMinutes >= 1) {
      setOfflineEarningsData({ amount: offline.amount, eligibleMinutes: offline.eligibleMinutes });
      setShowOfflineModal(true);
    }
  }, []);

  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    let frame = 0;
    const commitLayout = () => {
      const { width, height } = screen.getBoundingClientRect();
      const next = createDockLayout(width, height, readSafeAreaInsets(screen));
      setLayout((current) => {
        const sameViewport = Math.abs(current.width - next.width) < 0.5
          && Math.abs(current.height - next.height) < 0.5;
        const sameSafeArea = (Object.keys(next.sceneSafeAreas) as Array<keyof typeof next.sceneSafeAreas>)
          .every((edge) => Math.abs(current.sceneSafeAreas[edge] - next.sceneSafeAreas[edge]) < 0.5);
        if (sameViewport && sameSafeArea) {
          return current;
        }
        return next;
      });
    };
    const scheduleLayout = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(commitLayout);
    };

    const resizeObserver = new ResizeObserver(scheduleLayout);
    resizeObserver.observe(screen);
    window.visualViewport?.addEventListener("resize", scheduleLayout);
    commitLayout();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.visualViewport?.removeEventListener("resize", scheduleLayout);
    };
  }, []);

  const layoutStyle = useMemo(
    () => dockLayoutCssVariables(layout) as CSSProperties,
    [layout],
  );

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 1_800);
  };

  useEffect(() => {
    return () => {
      if (launchTimerRef.current !== null) window.clearTimeout(launchTimerRef.current);
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const upgrades = useMemo<DockUpgradeMap>(() => ({
    capacity: {
      level: progression.capacityLevel,
      maxLevel: UPGRADE_META.capacity.maxLevel,
      value: `${INITIAL_CAPACITY + progression.capacityLevel * 2} cá`,
      cost: progression.capacityCost,
      affordable: progression.capacityCost !== null && progression.wallet >= progression.capacityCost,
    },
    depth: {
      level: progression.depthLevel,
      maxLevel: UPGRADE_META.depth.maxLevel,
      value: `${INITIAL_MAX_DEPTH + progression.depthLevel * DEPTH_UPGRADE_DELTA}m`,
      cost: progression.depthCost,
      affordable: progression.depthCost !== null && progression.wallet >= progression.depthCost,
    },
    offlineRate: {
      level: progression.offlineRateLevel,
      maxLevel: 5,
      value: `${progression.offlineRatePerMinute}đ/phút`,
      cost: progression.offlineRateCost,
      affordable: progression.offlineRateCost !== null && progression.wallet >= progression.offlineRateCost,
    },
  }), [progression]);

  const buyUpgrade = (type: DockUpgradeType) => {
    const result = progression.purchaseUpgrade(type);
    if (result.purchased) {
      gameAudio.play("buy");
      showNotice("Nâng cấp thành công");
      return;
    }
    gameAudio.play("click");
    showNotice(result.reason === "max-level" ? "Đã nâng tối đa" : "Chưa đủ tiền");
  };

  const claimGift = () => {
    const result = progression.claimGift();
    if (result.claimed) {
      gameAudio.play("sell");
      showNotice(`Nhận ${result.amount.toLocaleString("vi-VN")}đ`);
    } else if (result.reason === "wallet-full") {
      gameAudio.play("click");
      showNotice("Ví đã đầy");
    }
  };

  const lockPower = (result: PowerLockResult) => {
    if (launching || panel !== null || showOfflineModal) return;
    setLaunchResult(result);
    gameAudio.play(result.label === "MAX" ? "level" : "click");
    try {
      sessionStorage.setItem("batca-cast-power", String(result.power));
    } catch {
      // Session storage can be unavailable in embedded contexts.
    }
    launchTimerRef.current = window.setTimeout(() => {
      launchTimerRef.current = null;
      onPlay();
    }, 720);
  };

  const isInteractionLocked = launching || panel !== null || showOfflineModal;

  return (
    <main
      ref={screenRef}
      className={`fishing-dock-screen${launching ? " is-launching" : ""}`}
      style={layoutStyle}
      data-gameplay-axis-x={layout.gameplayAxisX.toFixed(2)}
      data-waterline-y={layout.waterlineY.toFixed(2)}
    >
      <FishingDockCanvas
        layout={layout}
        onPowerLock={lockPower}
        disabled={isInteractionLocked}
      />
      <DockHud
        earnings={progression.earnings}
        bestScore={progression.bestRunScore}
        giftRemainingMs={progression.giftRemainingMs}
        hooksLevel={progression.capacityLevel + 1}
        upgrades={upgrades}
        onOpenSettings={() => {
          gameAudio.play("click");
          setPanel("settings");
        }}
        onOpenHooks={() => {
          gameAudio.play("click");
          setPanel("hooks");
        }}
        onOpenAquarium={() => {
          gameAudio.play("click");
          setPanel("aquarium");
        }}
        onClaimGift={claimGift}
        onBuyUpgrade={buyUpgrade}
        interactionLocked={isInteractionLocked}
      />

      {notice && <div className="fishing-dock-screen__notice" role="status">{notice}</div>}
      {launchResult && (
        <div className={`fishing-dock-screen__power-result is-${launchResult.label.toLowerCase()}`} aria-live="assertive">
          {launchResult.label}
        </div>
      )}

      {/* Panels */}
      {panel === "hooks" && (
        <HooksPanel onClose={() => setPanel(null)} onNotice={showNotice} />
      )}

      {panel === "settings" && (
        <SettingsModal muted={muted} onToggleMute={onToggleMute} onClose={() => setPanel(null)} />
      )}

      {panel === "aquarium" && (
        <AquariumPanel onClose={() => setPanel(null)} />
      )}

      {/* Offline Earnings Modal */}
      {showOfflineModal && offlineEarningsData && (
        <OfflineEarningsModal
          amount={offlineEarningsData.amount}
          eligibleMinutes={offlineEarningsData.eligibleMinutes}
          onClose={() => setShowOfflineModal(false)}
          onClaimed={(claimedAmount) => showNotice(`Đã nhận +${claimedAmount.toLocaleString("vi-VN")}đ`)}
        />
      )}
    </main>
  );
}
