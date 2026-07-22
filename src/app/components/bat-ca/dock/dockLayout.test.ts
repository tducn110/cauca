import { describe, expect, it } from "vitest";
import { createDockLayout } from "./dockLayout";

const DESKTOP_VIEWPORTS = [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 720],
] as const;

describe("fishing dock shared layout", () => {
  it.each(DESKTOP_VIEWPORTS)("keeps the gameplay anchors aligned at %ix%i", (width, height) => {
    const layout = createDockLayout(width, height);
    const centers = [
      layout.hook.x,
      layout.playGaugeCenter.x,
      layout.upgradePanelCenter.x,
    ];

    for (const center of centers) {
      expect(Math.abs(center - layout.gameplayAxisX)).toBeLessThanOrEqual(0.01);
    }
    expect(layout.waterlineY / height).toBeGreaterThanOrEqual(0.43);
    expect(layout.waterlineY / height).toBeLessThanOrEqual(0.48);
    expect(layout.boatAnchor.x / width).toBeGreaterThanOrEqual(0.6);
    expect(layout.boatAnchor.x / width).toBeLessThanOrEqual(0.66);
  });

  it.each([
    ...DESKTOP_VIEWPORTS,
    [390, 844],
    [844, 390],
    [844, 303],
    [844, 270],
    [540, 360],
    [719, 359],
    [720, 360],
    [320, 568],
    [719, 844],
    [720, 844],
  ] as const)(
    "keeps the gauge and upgrade cards separated and inside %ix%i",
    (width, height) => {
      const layout = createDockLayout(width, height);
      const gaugeBottom = layout.playGaugeCenter.y + layout.playGaugeSize / 2;
      const cardsBottom = layout.upgradePanelTop + layout.upgradeCardHeight;

      expect(layout.upgradePanelTop - gaugeBottom).toBeGreaterThanOrEqual(
        layout.microLandscape ? 6.5 : 11.5,
      );
      expect(cardsBottom).toBeLessThanOrEqual(height - layout.sceneSafeAreas.bottom + 0.01);
      expect(layout.upgradePanelWidth).toBeLessThanOrEqual(width - layout.sceneSafeAreas.left * 2 + 0.01);
    },
  );

  it("reserves device safe-area insets inside the shared vertical layout", () => {
    const layout = createDockLayout(844, 303, { bottom: 21, left: 8, right: 8 });
    const gaugeBottom = layout.playGaugeCenter.y + layout.playGaugeSize / 2;
    const cardsBottom = layout.upgradePanelTop + layout.upgradeCardHeight;

    expect(layout.upgradePanelTop - gaugeBottom).toBeGreaterThanOrEqual(6.5);
    expect(cardsBottom).toBeLessThanOrEqual(303 - layout.sceneSafeAreas.bottom + 0.01);
    expect(layout.upgradePanelWidth).toBeLessThanOrEqual(
      844 - layout.sceneSafeAreas.left - layout.sceneSafeAreas.right + 0.01,
    );
  });
});
