import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Anchor, Fish, Gauge, Maximize2, Trophy, Volume2, VolumeX, X } from "lucide-react";
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
import "./fishing-dock-screen.css";

type DockPanel = "settings" | "hooks" | null;

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
  const panelRef = useRef<HTMLElement>(null);
  const panelOpenerRef = useRef<HTMLElement | null>(null);
  const restorePanelFocusRef = useRef(true);
  const [layout, setLayout] = useState(() => createDockLayout());
  const [panel, setPanel] = useState<DockPanel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<PowerLockResult | null>(null);
  const launchTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const launching = launchResult !== null;

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
    // useLayoutEffect runs before paint, so the initial DOM variables and the
    // Pixi scene start from the same measured viewport rather than 1280x720.
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
    const claim = progression.lastOfflineClaim;
    if (claim?.claimed) showNotice(`Đã nhận ${claim.amount.toLocaleString("vi-VN")}đ khi vắng mặt`);
    // Only react to a newly completed automatic claim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progression.lastOfflineClaim]);

  useEffect(() => {
    if (!panel) return;
    const previouslyFocused = panelOpenerRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
      )?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPanel(null);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusOutside = !panelRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusOutside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      if (restorePanelFocusRef.current && previouslyFocused?.isConnected) previouslyFocused.focus();
      panelOpenerRef.current = null;
      restorePanelFocusRef.current = true;
    };
  }, [panel]);

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
    if (launching || panel) return;
    setLaunchResult(result);
    gameAudio.play(result.label === "MAX" ? "level" : "click");
    try {
      sessionStorage.setItem("batca-cast-power", String(result.power));
    } catch {
      // Session storage can be unavailable in embedded/private contexts.
    }
    launchTimerRef.current = window.setTimeout(() => {
      launchTimerRef.current = null;
      onPlay();
    }, 720);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      showNotice("Trình duyệt không hỗ trợ toàn màn hình");
    }
  };

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
        disabled={launching || panel !== null}
      />
      <DockHud
        earnings={progression.earnings}
        bestScore={progression.bestRunScore}
        giftRemainingMs={progression.giftRemainingMs}
        hooksLevel={progression.capacityLevel + 1}
        upgrades={upgrades}
        onOpenSettings={() => {
          gameAudio.play("click");
          panelOpenerRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
          restorePanelFocusRef.current = true;
          setPanel("settings");
        }}
        onOpenHooks={() => {
          gameAudio.play("click");
          panelOpenerRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
          restorePanelFocusRef.current = true;
          setPanel("hooks");
        }}
        onClaimGift={claimGift}
        onBuyUpgrade={buyUpgrade}
        interactionLocked={launching || panel !== null}
      />

      {notice && <div className="fishing-dock-screen__notice" role="status">{notice}</div>}
      {launchResult && (
        <div className={`fishing-dock-screen__power-result is-${launchResult.label.toLowerCase()}`} aria-live="assertive">
          {launchResult.label}
        </div>
      )}

      {panel && (
        <div className="fishing-dock-screen__backdrop" onClick={() => setPanel(null)}>
          <section
            ref={panelRef}
            className="fishing-dock-screen__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dock-panel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="fishing-dock-screen__close"
              onClick={() => setPanel(null)}
              aria-label="Đóng"
            >
              <X aria-hidden="true" />
            </button>

            {panel === "settings" ? (
              <>
                <h2 id="dock-panel-title">Cài đặt</h2>
                <div className="fishing-dock-screen__actions">
                  <button type="button" onClick={onToggleMute}>
                    {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                    <span>{muted ? "Bật âm thanh" : "Tắt âm thanh"}</span>
                  </button>
                  <button type="button" onClick={() => void toggleFullscreen()}>
                    <Maximize2 aria-hidden="true" />
                    <span>Toàn màn hình</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      restorePanelFocusRef.current = false;
                      setPanel(null);
                      onShowStats();
                    }}
                  >
                    <Trophy aria-hidden="true" />
                    <span>Thành tích</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dock-panel-title">Đồ nghề</h2>
                <div className="fishing-dock-screen__gear">
                  <span className="fishing-dock-screen__gear-icon"><Anchor aria-hidden="true" /></span>
                  <div>
                    <strong>Lưỡi câu ao làng</strong>
                    <span>Cấp {progression.capacityLevel + 1}</span>
                  </div>
                </div>
                <div className="fishing-dock-screen__gear-stats">
                  <span><Fish aria-hidden="true" /> {INITIAL_CAPACITY + progression.capacityLevel * 2} cá</span>
                  <span><Gauge aria-hidden="true" /> {INITIAL_MAX_DEPTH + progression.depthLevel * DEPTH_UPGRADE_DELTA}m</span>
                </div>
                <button type="button" className="fishing-dock-screen__primary" onClick={() => setPanel(null)}>
                  Tiếp tục
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
