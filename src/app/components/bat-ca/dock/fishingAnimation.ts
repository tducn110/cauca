import type { Texture } from "pixi.js";

export const FISHING_DOCK_ASSETS = {
  background: "/background.png",
  frames: Array.from(
    { length: 6 },
    (_, index) => `/character/frame_${String(index + 1).padStart(2, "0")}.png`,
  ),
  dial: "/gauge/dial_base.png",
  pointer: "/gauge/pointer.png",
  glow: "/gauge/max_glow.png",
} as const;

// Pivot at the bottom of the boat hull (pixel 510 from top in a 541-tall frame).
// anchorX = 240/480 = 0.5 (horizontal centre of sprite)
// anchorY = 510/541 ≈ 0.9427 (bottom of hull, sits on waterline)
export const BOAT_PIVOT_X_PX = 240;
export const BOAT_PIVOT_Y_PX = 510;

export const DUCK_ANIMATION_SOURCE = {
  width: 480,
  height: 541,
  anchorX: BOAT_PIVOT_X_PX / 480,          // 0.5
  anchorY: BOAT_PIVOT_Y_PX / 541,          // ≈ 0.9427
  frameCount: 6,
  castDurationSeconds: 0.51,
} as const;

export const ROD_TIP_BY_FRAME = [
  { x: 442, y: 334 }, // frame 01 (idle/forward)
  { x: 457, y: 188 }, // frame 02 (swing back)
  { x: 440, y: 169 }, // frame 03 (further back)
  { x: 433, y: 146 }, // frame 04 (top back)
  { x: 452, y: 310 }, // frame 05 (throw forward)
  { x: 439, y: 331 }, // frame 06 (follow through)
];


export function validateDuckFrameTextures(textures: readonly Texture[]): void {
  if (textures.length !== DUCK_ANIMATION_SOURCE.frameCount) {
    throw new Error(
      `Duck animation requires ${DUCK_ANIMATION_SOURCE.frameCount} frames, received ${textures.length}.`,
    );
  }

  textures.forEach((texture, index) => {
    const width = Math.round(texture.width);
    const height = Math.round(texture.height);
    if (width !== DUCK_ANIMATION_SOURCE.width || height !== DUCK_ANIMATION_SOURCE.height) {
      throw new Error(
        `Invalid duck frame ${index + 1}: expected ${DUCK_ANIMATION_SOURCE.width}x${DUCK_ANIMATION_SOURCE.height}, received ${width}x${height}.`,
      );
    }
  });
}

export function duckFrameAtProgress(progress: number): number {
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  return Math.min(
    DUCK_ANIMATION_SOURCE.frameCount - 1,
    Math.floor(safeProgress * DUCK_ANIMATION_SOURCE.frameCount),
  );
}
