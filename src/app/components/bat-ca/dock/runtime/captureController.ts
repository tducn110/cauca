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
  /** Seconds to hold the hook still at the bottom before reversing to ascending. */
  bottomHoldTimer: number;
  hookSpeedMultiplier: number;
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
    bottomHoldTimer: 0,
    hookSpeedMultiplier: 1.0,
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

/**
 * Frame-rate independent exponential approach.
 * Equivalent to `value += (target - value) * (1 - e^(-rate * dt))`, so the
 * per-frame step is identical regardless of how unevenly `dt` is delivered.
 * This removes the "jumping between coordinates" seen on a stuttering device
 * where the old `value += (target - value) * rate * dt` form moved differently
 * on every frame.
 */
function expoStep(value: number, target: number, rate: number, dt: number): number {
  return value + (target - value) * (1 - Math.exp(-rate * dt));
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
    const plankBottomY = layout.waterlineY + totalDepthPx;
    const baseSpeed = (450 + state.targetDepthMeters * 0.8) * state.hookSpeedMultiplier;

    // Decelerate smoothly as the hook nears the bottom (avoid a hard slam).
    const remaining = Math.max(0, plankBottomY - state.capturePointY);
    const slow = Math.min(1, remaining / 100); // 1 far away, → ~0 at the bottom
    const plungeSpeed = baseSpeed * (0.85 + state.castPowerFactor * 0.3) * (0.2 + 0.8 * slow);
    state.capturePointY = Math.min(plankBottomY, state.capturePointY + plungeSpeed * dt);
    state.capturePointX = expoStep(state.capturePointX, state.targetCaptureX, 5, dt);

    if (state.capturePointY >= plankBottomY) {
      // Reached the bottom: settle X/camera and hold briefly before reversing,
      // so the hook doesn't violently snap from full speed down to full speed up.
      if (state.bottomHoldTimer <= 0) state.bottomHoldTimer = 0.22;

      state.bottomHoldTimer -= dt;
      if (state.bottomHoldTimer <= 0) {
        state.fishingState = "ascending";
        state.previousCapturePointX = state.capturePointX;
        state.previousCapturePointY = state.capturePointY;
      }
    } else if (state.capturePointY > layout.waterlineY + 50) {
      // Camera follows only after hook is clearly below the surface
      const targetCamY = Math.max(0, state.capturePointY - layout.height * 0.45);
      state.cameraY = expoStep(state.cameraY, targetCamY, 6, dt);
    }
  } else if (state.fishingState === "ascending") {
    // ASCENDING: only state where catching is allowed.
    // Uses swept collision so fast reel speeds cannot tunnel past fish.
    state.previousCapturePointX = state.capturePointX;
    state.previousCapturePointY = state.capturePointY;

    const atCapacity = caughtFishList.length >= state.maxCapacityCount;
    const reelSpeed = (220 + (atCapacity ? 100 : 0)) * state.hookSpeedMultiplier;
    state.capturePointY -= reelSpeed * dt;
    state.capturePointX = expoStep(state.capturePointX, state.targetCaptureX, 5, dt);

    const targetCamY = Math.max(0, state.capturePointY - layout.height * 0.45);
    state.cameraY = expoStep(state.cameraY, targetCamY, 8, dt);

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
    state.capturePointX = expoStep(state.capturePointX, layout.gameplayAxisX, 10, dt);
    state.cameraY = expoStep(state.cameraY, 0, 10, dt);

    if (state.surfaceBurstTimer <= 0) {
      state.fishingState = "payout";
    }
  }
  // payout → idle transition is handled by the caller after staggered payout.
}
