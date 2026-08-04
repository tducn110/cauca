import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gameAudio } from "../../../audio/audioManager";
import {
  CAPACITY_UPGRADE_DELTA,
  DEPTH_UPGRADE_DELTA,
  INITIAL_CAPACITY,
  INITIAL_MAX_DEPTH,
} from "../game/constants";
import { OFFLINE_UPGRADE_COSTS } from "../game/economyConfig";
import { UPGRADE_META } from "../game/fish-data";
import { DockHud, type DockUpgradeMap } from "./DockHud";
import { UnderwaterHud } from "./UnderwaterHud";
import { CatchResultOverlay } from "./CatchResultOverlay";
import { FishingDockCanvas, type FishingState, type PowerLockResult, type CatchSummary } from "./FishingDockCanvas";
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
import { GiftModal } from "./GiftModal";
import { OfflineEarningsModal } from "./OfflineEarningsModal";
import { reportRuntimeError } from "../../../observability/runtimeErrors";
import "./fishing-dock-screen.css";

type DockPanel = "settings" | "hooks" | "aquarium" | "gift" | null;
type FishingPhase = "dock" | "casting" | "descending" | "ascending" | "result";

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  onPlay?: () => void;
  onShowStats?: () => void;
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

export function FishingDockScreen({ muted, onToggleMute }: Props) {
  const progression = useDockProgression({ autoClaimOffline: false });
  const { claimOffline } = progression;
  const screenRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState(() => createDockLayout());
  const [panel, setPanel] = useState<DockPanel>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineEarningsData, setOfflineEarningsData] = useState<{ amount: number; eligibleMinutes: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<PowerLockResult | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);

  // Explicit Fishing Phase state
  const [phase, setPhase] = useState<FishingPhase>("dock");
  const [activeFishingInfo, setActiveFishingInfo] = useState<{
    depthMeters: number;
    maxDepthMeters: number;
    capacity: number;
    caughtCount: number;
    runEarnings: number;
  }>({
    depthMeters: 0,
    maxDepthMeters: INITIAL_MAX_DEPTH,
    capacity: INITIAL_CAPACITY,
    caughtCount: 0,
    runEarnings: 0,
  });
  const [lastCatchSummary, setLastCatchSummary] = useState<CatchSummary | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const launchTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  // Persist the reward before showing it so activity heartbeats cannot invalidate it.
  useEffect(() => {
    try {
      const offline = claimOffline();
      const eligibleMinutes = Math.floor(offline.elapsedMs / 60_000);
      if (offline.claimed && offline.amount > 0 && eligibleMinutes >= 1) {
        setOfflineEarningsData({ amount: offline.amount, eligibleMinutes });
        setShowOfflineModal(true);
      }
    } catch (error) {
      reportRuntimeError(error, {
        area: "FishingDockScreen",
        operation: "claimOfflineEarnings",
        fatal: false,
      });
    }
  }, [claimOffline]);

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

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleLayout);

    resizeObserver?.observe(screen);
    window.addEventListener("resize", scheduleLayout);
    window.visualViewport?.addEventListener("resize", scheduleLayout);
    commitLayout();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleLayout);
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
      value: `${INITIAL_CAPACITY + progression.capacityLevel * CAPACITY_UPGRADE_DELTA} cá`,
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
      maxLevel: OFFLINE_UPGRADE_COSTS.length,
      value: `${progression.offlineRatePerMinute}đ/phút`,
      cost: progression.offlineRateCost,
      affordable: progression.offlineRateCost !== null && progression.wallet >= progression.offlineRateCost,
    },
  }), [progression]);

  const buyUpgrade = (type: DockUpgradeType) => {
    try {
      const result = progression.purchaseUpgrade(type);
      if (result.purchased) {
        gameAudio.play("buy");
        showNotice("Nâng cấp thành công");
        return;
      }
      gameAudio.play("click");
      showNotice(result.reason === "max-level" ? "Đã nâng tối đa" : "Chưa đủ tiền");
    } catch (error) {
      reportRuntimeError(error, {
        area: "FishingDockScreen",
        operation: `purchaseUpgrade:${type}`,
        fatal: false,
      });
      showNotice("Không thể nâng cấp lúc này");
    }
  };

  const claimGift = () => {
    gameAudio.play("click");
    setPanel("gift");
  };

  const lockPower = (result: PowerLockResult) => {
    if (phase !== "dock" || panel !== null || showOfflineModal) return;
    setLaunchResult(result);
    gameAudio.play(result.label === "MAX" ? "level" : "click");
    if (launchTimerRef.current !== null) window.clearTimeout(launchTimerRef.current);
    launchTimerRef.current = window.setTimeout(() => {
      launchTimerRef.current = null;
      setLaunchResult(null);
    }, 300);
  };

  const handleCatchComplete = (summary: CatchSummary) => {
    const prevBest = progression.bestRunScore;

    try {
      progression.recordCatch(summary.earned, summary.caughtFishTypes);
    } catch (error) {
      reportRuntimeError(error, {
        area: "FishingDockScreen",
        operation: "recordCatch",
        fatal: false,
        metadata: { earned: summary.earned, caughtCount: summary.caughtCount },
      });
    }

    const newBest = summary.earned > 0 && summary.earned > prevBest;
    setIsNewBest(newBest);
    setLastCatchSummary(summary);
    setPhase("result");
  };

  const handleStateChange = (
    state: FishingState,
    depthMeters: number,
    maxDepthMeters: number,
    capacity: number,
    caughtCount: number,
    runEarnings: number,
  ) => {
    const nextPhase: FishingPhase | null =
      state === "idle"
        ? "dock"
        : state === "casting"
          ? "casting"
          : state === "descending"
            ? "descending"
            : state === "ascending"
              ? "ascending"
              : state === "surfaceBurst" || state === "payout"
                ? "result"
                : null;

    if (nextPhase) {
      setPhase((current) => (
        current === "result" && nextPhase === "dock"
          ? current
          : nextPhase
      ));
    }

    setActiveFishingInfo({
      depthMeters,
      maxDepthMeters,
      capacity,
      caughtCount,
      runEarnings,
    });
  };

  const handleCollectResult = () => {
    gameAudio.play("buy");
    setPhase("dock");
    setLastCatchSummary(null);
  };

  const isInteractionLocked = phase !== "dock" || launchResult !== null || panel !== null || showOfflineModal || sceneError !== null;
  const isUnderwater = phase === "descending" || phase === "ascending";

  return (
    <main
      ref={screenRef}
      className={`fishing-dock-screen${isUnderwater ? " is-fishing" : ""}`}
      style={layoutStyle}
      data-gameplay-axis-x={layout.gameplayAxisX.toFixed(2)}
      data-waterline-y={layout.waterlineY.toFixed(2)}
    >
      {/* Pixi Canvas Background Scene */}
      <FishingDockCanvas
        layout={layout}
        capacityLevel={progression.capacityLevel}
        depthLevel={progression.depthLevel}
        selectedHookId={progression.selectedHook}
        onPowerLock={lockPower}
        onCatchComplete={handleCatchComplete}
        onStateChange={handleStateChange}
        onSceneError={(message) => setSceneError(message)}
        disabled={isInteractionLocked}
      />

      {/* DOCK HUD: Rendered ONLY when in dock or casting phase! Unmounted when underwater or in result */}
      {(phase === "dock" || phase === "casting") && (
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
      )}

      {/* UNDERWATER HUD: Rendered ONLY during descending / ascending phases */}
      {isUnderwater && (
        <UnderwaterHud
          state={phase === "descending" ? "descending" : "ascending"}
          caughtCount={activeFishingInfo.caughtCount}
          layout={layout}
        />
      )}

      {/* RESULT OVERLAY: Rendered ONLY during result phase */}
      {phase === "result" && lastCatchSummary && (
        <CatchResultOverlay
          summary={lastCatchSummary}
          isNewBest={isNewBest}
          onCollect={handleCollectResult}
        />
      )}

      {notice && <div className="fishing-dock-screen__notice" role="status">{notice}</div>}
      {sceneError && (
        <div className="fishing-dock-screen__scene-error" role="alert">
          {sceneError}
          <button type="button" onClick={() => window.location.reload()}>
            Tải lại
          </button>
        </div>
      )}
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

      {panel === "gift" && (
        <GiftModal
          onClose={() => setPanel(null)}
          onNotice={showNotice}
          onClaimReward={(amount) => progression.claimGift(amount)}
          giftRemainingMs={progression.giftRemainingMs}
          wallet={progression.earnings}
        />
      )}

      {/* Offline Earnings Modal */}
      {showOfflineModal && offlineEarningsData && (
        <OfflineEarningsModal
          amount={offlineEarningsData.amount}
          eligibleMinutes={offlineEarningsData.eligibleMinutes}
          onClose={() => setShowOfflineModal(false)}
          onConfirm={(claimedAmount) => showNotice(`Đã nhận +${claimedAmount.toLocaleString("vi-VN")}đ`)}
        />
      )}
    </main>
  );
}
