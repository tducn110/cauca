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
    // In portrait-first mode, waterline is fixed at 0.235 ratio
    expect(Math.abs(layout.waterlineY / height - 0.235)).toBeLessThanOrEqual(0.01);
    
    // Always false for portrait design
    expect(layout.wide).toBe(false);
    
    const boatRatioInWorld = (layout.boatAnchor.x - layout.worldLeft) / layout.worldWidth;
    expect(boatRatioInWorld).toBeGreaterThanOrEqual(0.6);
    expect(boatRatioInWorld).toBeLessThanOrEqual(0.93);
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

      expect(layout.upgradePanelTop - gaugeBottom).toBeGreaterThanOrEqual(11.5);
      expect(cardsBottom).toBeLessThanOrEqual(height - layout.sceneSafeAreas.bottom + 0.01);
      expect(layout.upgradePanelWidth).toBeLessThanOrEqual(width - layout.sceneSafeAreas.left * 2 + 0.01);
    },
  );

  it("reserves device safe-area insets inside the shared vertical layout", () => {
    const layout = createDockLayout(844, 303, { bottom: 21, left: 8, right: 8 });
    const gaugeBottom = layout.playGaugeCenter.y + layout.playGaugeSize / 2;
    const cardsBottom = layout.upgradePanelTop + layout.upgradeCardHeight;

    expect(layout.upgradePanelTop - gaugeBottom).toBeGreaterThanOrEqual(11.5);
    expect(cardsBottom).toBeLessThanOrEqual(303 - layout.sceneSafeAreas.bottom + 0.01);
    expect(layout.upgradePanelWidth).toBeLessThanOrEqual(
      844 - layout.sceneSafeAreas.left - layout.sceneSafeAreas.right + 0.01,
    );
  });

  it("always keeps wide as false since it is a portrait-first game", () => {
    const layout = createDockLayout(1920, 1080);

    expect(layout.wide).toBe(false);
    expect(layout.worldWidth).toBe(layout.width);
    expect(layout.worldLeft).toBe(0);
    
    // Gameplay anchors live inside the column.
    expect(layout.gameplayAxisX).toBeGreaterThan(layout.worldLeft);
    expect(layout.gameplayAxisX).toBeLessThan(layout.worldLeft + layout.worldWidth);
    expect(layout.boatAnchor.x).toBeGreaterThan(layout.worldLeft);
    expect(layout.boatAnchor.x).toBeLessThan(layout.worldLeft + layout.worldWidth);
  });

  it.each([
    [390, 844],
    [320, 568],
    [719, 844],
  ] as const)("keeps the world column full-width on compact %ix%i", (width, height) => {
    const layout = createDockLayout(width, height);

    expect(layout.wide).toBe(false);
    expect(layout.worldLeft).toBe(0);
    expect(layout.worldWidth).toBe(width);
    expect(layout.boatAnchor.x / width).toBeGreaterThanOrEqual(0.6);
    expect(layout.boatAnchor.x / width).toBeLessThanOrEqual(0.93);
  });
});
