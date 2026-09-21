import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PowerLockResult } from "./FishingPowerGauge";
import { reportRuntimeError } from "../../../observability/runtimeErrors";
import type { DockViewportLayout } from "./dockLayout";
import { createDockRuntime, type DockSceneRuntimeInstance } from "./runtime/createDockRuntime";
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
  selectedHookId: string;
  paused?: boolean;
  onPowerLock?: (result: PowerLockResult) => void;
  onCatchComplete: (summary: CatchSummary) => void;
  onStateChange?: (state: FishingState, depthMeters: number, maxDepthMeters: number, capacity: number, caughtCount: number, runEarnings: number) => void;
  onSceneReady?: () => void;
  onSceneError?: (message: string) => void;
  disabled?: boolean;
};

export function FishingDockCanvas({
  layout,
  capacityLevel,
  depthLevel,
  selectedHookId,
  paused = false,
  onPowerLock,
  onCatchComplete,
  onStateChange,
  onSceneReady,
  onSceneError,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<DockSceneRuntimeInstance | null>(null);
  const layoutRef = useRef(layout);
  const callbackRef = useRef(onPowerLock);
  const catchCompleteRef = useRef(onCatchComplete);
  const stateChangeRef = useRef(onStateChange);
  const sceneReadyRef = useRef(onSceneReady);
  const sceneErrorRef = useRef(onSceneError);
  const disabledRef = useRef(disabled);
  const pausedRef = useRef(paused);
  const capacityLevelRef = useRef(capacityLevel);
  const depthLevelRef = useRef(depthLevel);
  const selectedHookIdRef = useRef(selectedHookId);

  layoutRef.current = layout;
  callbackRef.current = onPowerLock;
  catchCompleteRef.current = onCatchComplete;
  stateChangeRef.current = onStateChange;
  sceneReadyRef.current = onSceneReady;
  sceneErrorRef.current = onSceneError;
  disabledRef.current = disabled;
  pausedRef.current = paused;
  capacityLevelRef.current = capacityLevel;
  depthLevelRef.current = depthLevel;
  selectedHookIdRef.current = selectedHookId;

  useLayoutEffect(() => {
    runtimeRef.current?.applyLayout(layout);
  }, [layout]);

  useEffect(() => {
    runtimeRef.current?.setDisabled(disabled);
  }, [disabled]);

  useEffect(() => {
    runtimeRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    runtimeRef.current?.updateProgression(capacityLevel, depthLevel, selectedHookId);
  }, [capacityLevel, depthLevel, selectedHookId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let sceneFailed = false;
    let readyFrame = 0;
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
      selectedHookIdRef,
    };

    let localRuntime: DockSceneRuntimeInstance | null = null;

    createDockRuntime(host, layoutRef.current, callbacks, failScene, signal)
      .then(runtime => {
        if (!signal.canceled && runtime) {
          localRuntime = runtime;
          runtimeRef.current = runtime;

          runtime.applyLayout(layoutRef.current);
          runtime.setDisabled(disabledRef.current);
          runtime.setPaused(pausedRef.current);
          runtime.updateProgression(
            capacityLevelRef.current,
            depthLevelRef.current,
            selectedHookIdRef.current,
          );
          // The document loader may reveal this surface only after Pixi has had
          // a complete frame to paint; React never renders a visual preview.
          readyFrame = window.requestAnimationFrame(() => {
            readyFrame = window.requestAnimationFrame(() => {
              if (!signal.canceled && !sceneFailed) sceneReadyRef.current?.();
            });
          });
        }
      })
      .catch(err => {
        if (!signal.canceled) failScene(err, "createDockRuntime");
      });

    return () => {
      signal.canceled = true;
      window.cancelAnimationFrame(readyFrame);
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
      {/* Input/accessibility proxy only; the gauge visual belongs to Pixi. */}
      <button
        type="button"
        className="fishing-dock-canvas__gauge-button"
        onClick={() => {
          if (disabledRef.current) return;
          runtimeRef.current?.lockGauge();
        }}
        disabled={disabled}
        aria-label={t("dock.lockPower", "Khóa lực câu và bắt đầu chơi")}
      />
    </div>
  );
}

export type { PowerLockResult } from "./FishingPowerGauge";
