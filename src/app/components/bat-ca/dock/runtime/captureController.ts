import type { DockViewportLayout } from '../dockLayout';
import type { FishingState } from '../FishingDockCanvas';
import type { ActiveFish } from './runtimeTypes';

export type CaptureState = {
  capturePointX: number;
  capturePointY: number;
  targetCaptureX: number;
  previousCapturePointX: number;
  previousCapturePointY: number;
  cameraY: number;
  fishingState: FishingState;
  castPowerFactor: number;
  castAnimTimer: number;
  targetDepthMeters: number;
  maxCapacityCount: number;
  surfaceBurstTimer: number;
  resultFired: boolean;
};

export function createCaptureController(initialLayout: DockViewportLayout): CaptureState {
  return {
    capturePointX: initialLayout.gameplayAxisX,
    capturePointY: initialLayout.waterlineY + 25,
    targetCaptureX: initialLayout.gameplayAxisX,
    previousCapturePointX: initialLayout.gameplayAxisX,
    previousCapturePointY: initialLayout.waterlineY + 25,
    cameraY: 0,
    fishingState: "idle",
    castPowerFactor: 1.0,
    castAnimTimer: 0,
    targetDepthMeters: 0,
    maxCapacityCount: 0,
    surfaceBurstTimer: 0,
    resultFired: false,
  };
}

/**
 * Distance from point (px, py) to the line segment from (ax, ay) to (bx, by).
 * Used for swept collision so fast-moving hooks cannot tunnel past fish.
 */
export function distanceToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) {
    return Math.hypot(px - ax, py - ay);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

export function tickCaptureState(
  state: CaptureState,
  dt: number,
  layout: DockViewportLayout,
  activeFishList: ActiveFish[],
  caughtFishList: ActiveFish[],
  callbacks: {
    onFishCaught: (fish: ActiveFish) => void;
    onCapacityFull: (x: number, y: number) => void;
  },
): void {
  const totalDepthPx = state.targetDepthMeters * 2.8;
  const waterlineHookY = layout.waterlineY + 25;

  if (state.fishingState === "idle") {
    state.capturePointX = layout.gameplayAxisX;
    state.capturePointY = waterlineHookY;
    state.targetCaptureX = layout.gameplayAxisX;
    state.previousCapturePointX = layout.gameplayAxisX;
    state.previousCapturePointY = waterlineHookY;
    state.cameraY = 0;
    state.resultFired = false;
  } else if (state.fishingState === "descending") {
    // DESCENDING: plunge straight down. NO collision, NO catch.
    const plungeSpeed = (450 + state.targetDepthMeters * 0.8) * (0.85 + state.castPowerFactor * 0.3);
    state.capturePointY += plungeSpeed * dt;
    state.capturePointX += (state.targetCaptureX - state.capturePointX) * 5 * dt;

    // Camera follows only after hook is clearly below the surface
    if (state.capturePointY > layout.waterlineY + 50) {
      const targetCamY = Math.max(0, state.capturePointY - layout.height * 0.45);
      state.cameraY += (targetCamY - state.cameraY) * 6 * dt;
    }

    // Immediate transition to ascending at bottom — no pause, no hold
    if (state.capturePointY >= layout.waterlineY + totalDepthPx) {
      state.capturePointY = layout.waterlineY + totalDepthPx;
      state.fishingState = "ascending";
      state.previousCapturePointX = state.capturePointX;
      state.previousCapturePointY = state.capturePointY;
    }
  } else if (state.fishingState === "ascending") {
    // ASCENDING: only state where catching is allowed.
    // Uses swept collision so fast reel speeds cannot tunnel past fish.
    state.previousCapturePointX = state.capturePointX;
    state.previousCapturePointY = state.capturePointY;

    const atCapacity = caughtFishList.length >= state.maxCapacityCount;
    const reelSpeed = 220 + (atCapacity ? 100 : 0);
    state.capturePointY -= reelSpeed * dt;
    state.capturePointX += (state.targetCaptureX - state.capturePointX) * 5 * dt;

    const targetCamY = Math.max(0, state.capturePointY - layout.height * 0.45);
    state.cameraY += (targetCamY - state.cameraY) * 8 * dt;

    // Swept circle collision — ONLY in ascending and under capacity
    const canCatch = caughtFishList.length < state.maxCapacityCount;
    if (canCatch) {
      const captureRadius = 18;
      const hookCurveX = state.capturePointX;
      const hookCurveY = state.capturePointY;
      const prevHookCurveX = state.previousCapturePointX;
      const prevHookCurveY = state.previousCapturePointY;

      for (const fish of activeFishList) {
        if (fish.isCaught) continue;
        const fishRadius = fish.size * 0.8;
        const dist = distanceToSegment(
          fish.x, fish.depthY,
          prevHookCurveX, prevHookCurveY,
          hookCurveX, hookCurveY,
        );
        if (dist <= captureRadius + fishRadius) {
          fish.isCaught = true;
          callbacks.onFishCaught(fish);
          if (caughtFishList.length >= state.maxCapacityCount) {
            callbacks.onCapacityFull(state.capturePointX, state.capturePointY);
            break;
          }
        }
      }
    }

    if (state.capturePointY <= waterlineHookY) {
      state.capturePointY = waterlineHookY;
      state.fishingState = "surfaceBurst";
      state.surfaceBurstTimer = 0.3;
    }
  } else if (state.fishingState === "surfaceBurst") {
    // SURFACE BURST: brief 300ms, camera returns to dock, hook/line fade.
    state.surfaceBurstTimer -= dt;
    state.capturePointX += (layout.gameplayAxisX - state.capturePointX) * 10 * dt;
    state.cameraY += (0 - state.cameraY) * 10 * dt;

    if (state.surfaceBurstTimer <= 0) {
      state.fishingState = "payout";
    }
  }
  // payout → idle transition is handled by the caller after staggered payout.
}
