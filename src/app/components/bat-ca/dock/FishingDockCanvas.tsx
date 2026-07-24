import { useEffect, useLayoutEffect, useRef } from "react";
import type { PowerLockResult } from "./FishingPowerGauge";
import { FISHING_DOCK_ASSETS } from "./fishingAnimation";
import { reportRuntimeError } from "../../../observability/runtimeErrors";
import type { DockViewportLayout } from "./dockLayout";
import { createDockRuntime, type DockSceneRuntimeInstance } from "./runtime/createDockRuntime";
import { DOCK_DEBUG } from "./runtime/runtimeDebug";
import "./fishing-dock-scene.css";

export type FishingState = "idle" | "casting" | "descending" | "ascending" | "surfaceBurst" | "payout";

export type CatchSummary = {
  earned: number;
  caughtCount: number;
  caughtFishTypes: string[];
};

type Props = {
  layout: DockViewportLayout;
  capacityLevel: number;
  depthLevel: number;
  onPowerLock?: (result: PowerLockResult) => void;
  onCatchComplete: (summary: CatchSummary) => void;
  onStateChange?: (state: FishingState, depthMeters: number, maxDepthMeters: number, capacity: number, caughtCount: number, runEarnings: number) => void;
  onSceneError?: (message: string) => void;
  disabled?: boolean;
};

export function FishingDockCanvas({
  layout,
  capacityLevel,
  depthLevel,
  onPowerLock,
  onCatchComplete,
  onStateChange,
  onSceneError,
  disabled = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<DockSceneRuntimeInstance | null>(null);
  const layoutRef = useRef(layout);
  const callbackRef = useRef(onPowerLock);
  const catchCompleteRef = useRef(onCatchComplete);
  const stateChangeRef = useRef(onStateChange);
  const sceneErrorRef = useRef(onSceneError);
  const disabledRef = useRef(disabled);
  const capacityLevelRef = useRef(capacityLevel);
  const depthLevelRef = useRef(depthLevel);

  layoutRef.current = layout;
  callbackRef.current = onPowerLock;
  catchCompleteRef.current = onCatchComplete;
  stateChangeRef.current = onStateChange;
  sceneErrorRef.current = onSceneError;
  disabledRef.current = disabled;
  capacityLevelRef.current = capacityLevel;
  depthLevelRef.current = depthLevel;

  useLayoutEffect(() => {
    runtimeRef.current?.applyLayout(layout);
  }, [layout]);

  useEffect(() => {
    runtimeRef.current?.setDisabled(disabled);
  }, [disabled]);

  useEffect(() => {
    runtimeRef.current?.updateProgression(capacityLevel, depthLevel);
  }, [capacityLevel, depthLevel]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let sceneFailed = false;
    const notifySceneError = (message: string) => {
      try {
        sceneErrorRef.current?.(message);
      } catch (error) {
        reportRuntimeError(error, { area: "FishingDockCanvas", operation: "onSceneError", fatal: false });
      }
    };

    const failScene = (reason: unknown, operation: string) => {
      if (sceneFailed) return;
      sceneFailed = true;
      reportRuntimeError(reason, { area: "FishingDockCanvas", operation, fatal: true });
      host.classList.remove("is-scene-ready");
      host.classList.add("has-scene-error");
      const canvasElement = host.querySelector("canvas");
      if (canvasElement) canvasElement.style.display = "none";
      notifySceneError("Không thể tải màn câu cá. Kiểm tra asset rồi tải lại trang.");
    };

    const signal = { canceled: false };
    const callbacks = {
      disabledRef,
      callbackRef,
      catchCompleteRef,
      stateChangeRef,
      capacityLevelRef,
      depthLevelRef,
    };

    let localRuntime: DockSceneRuntimeInstance | null = null;

    createDockRuntime(host, layoutRef.current, callbacks, failScene, signal)
      .then(runtime => {
        if (!signal.canceled && runtime) {
          localRuntime = runtime;
          runtimeRef.current = runtime;

          runtime.applyLayout(layoutRef.current);
          runtime.setDisabled(disabledRef.current);
          runtime.updateProgression(
            capacityLevelRef.current,
            depthLevelRef.current,
          );
        }
      })
      .catch(err => {
        if (!signal.canceled) failScene(err, "createDockRuntime");
      });

    return () => {
      signal.canceled = true;
      if (localRuntime) {
        localRuntime.destroy();
      }
      if (runtimeRef.current === localRuntime) {
        runtimeRef.current = null;
      }
      if (!host.querySelector("canvas[data-scene-ready='true']")) {
        host.classList.remove("is-scene-ready", "is-gauge-disabled");
      }
    };
  }, []);

  return (
    <div className="fishing-dock-canvas" ref={hostRef}>
      <div className="fishing-dock-canvas__fallback" aria-hidden="true">
        <img className="fishing-dock-canvas__background" src={FISHING_DOCK_ASSETS.background} alt="" />
        <div className="fishing-dock-canvas__water">
          <span className="fishing-dock-canvas__channel" />
        </div>
        <div className="fishing-dock-canvas__rear-wave" />
        <div className="fishing-dock-canvas__sparkles">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
        <img className="fishing-dock-canvas__character" src={FISHING_DOCK_ASSETS.frames[0]} alt="" />
        <div className="fishing-dock-canvas__front-wave" />
        {DOCK_DEBUG && <div className="fishing-dock-canvas__fallback-guide" />}
        <div className="fishing-dock-canvas__fallback-gauge">
          <img src={FISHING_DOCK_ASSETS.dial} alt="" />
          <img className="fishing-dock-canvas__fallback-pointer" src={FISHING_DOCK_ASSETS.pointer} alt="" />
        </div>
      </div>
      <button
        type="button"
        className="fishing-dock-canvas__gauge-button"
        onClick={() => {
          if (disabledRef.current) return;
          runtimeRef.current?.lockGauge();
        }}
        disabled={disabled}
        aria-label="Khóa lực câu và bắt đầu chơi"
      />
    </div>
  );
}

export type { PowerLockResult } from "./FishingPowerGauge";