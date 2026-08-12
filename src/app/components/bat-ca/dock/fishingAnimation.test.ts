import { describe, expect, it } from "vitest";
import {
  DUCK_ANIMATION_SOURCE,
  FISHING_DOCK_ASSETS,
  duckFrameAtProgress,
  validateDuckFrameTextures,
} from "./fishingAnimation";
import type { Texture } from "pixi.js";

describe("duck fishing animation contract", () => {
  it("keeps six normalized RGBA frame paths", () => {
    expect(FISHING_DOCK_ASSETS.frames).toHaveLength(6);
    expect(new Set(FISHING_DOCK_ASSETS.frames).size).toBe(6);
    expect(DUCK_ANIMATION_SOURCE).toMatchObject({
      width: 480,
      height: 541,
      frameCount: 6,
    });
  });

  it.each([
    [-1, 0],
    [0, 0],
    [0.17, 1],
    [0.5, 3],
    [0.99, 5],
    [1, 5],
    [Number.NaN, 0],
  ])("maps progress %s to frame %s", (progress, expectedFrame) => {
    expect(duckFrameAtProgress(progress)).toBe(expectedFrame);
  });
});

describe("validateDuckFrameTextures", () => {
  it("throws if 5 frames given", () => {
    const fakeTextures = Array(5).fill({} as Texture);
    expect(() => validateDuckFrameTextures(fakeTextures)).toThrow(/6 frames/);
  });
});

