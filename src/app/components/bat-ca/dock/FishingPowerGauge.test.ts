import { describe, expect, it } from "vitest";
import { powerResultAtAngle, targetDepthForPower } from "./FishingPowerGauge";

describe("cast power depth", () => {
  it("maps a minimum timing result to a shallower cast than MAX", () => {
    const maxDepth = 550;
    const minResult = powerResultAtAngle(0);
    const maxResult = powerResultAtAngle(Math.PI / 2);

    expect(targetDepthForPower(maxDepth, minResult.power)).toBeLessThan(targetDepthForPower(maxDepth, maxResult.power));
    expect(targetDepthForPower(maxDepth, maxResult.power)).toBe(maxDepth);
  });

  it("keeps the chosen depth within the upgraded maximum", () => {
    expect(targetDepthForPower(1_150, 0.6)).toBe(690);
    expect(targetDepthForPower(1_150, 99)).toBe(1_150);
  });
});
