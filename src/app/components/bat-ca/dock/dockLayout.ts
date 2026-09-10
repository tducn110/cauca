/**
 * The dock is a portrait-first game. These dimensions are a design contract,
 * not a canvas resolution: Pixi renders at the measured CSS size of the one
 * visible game stage.
 */
export const DOCK_DESIGN_WIDTH = 390;
export const DOCK_DESIGN_HEIGHT = 844;

const CHARACTER_SOURCE = { width: 480, height: 541, hookY: 337 } as const;

export const DOCK_LAYOUT_RATIOS = {
  gameplayAxisX: 0.5,
  waterlineY: 0.235,
  playGaugeCenterY: 0.515,
  upgradePanelTop: 0.67,
  channelWidth: 0.62,
  boatAnchorX: 0.78,
  characterWidth: 0.34,
} as const;

type DockPoint = Readonly<{ x: number; y: number }>;

export type DockSafeAreas = Readonly<{ top: number; right: number; bottom: number; left: number }>;
export type DockSafeAreaInsets = Partial<DockSafeAreas>;

export type DockViewportLayout = Readonly<{
  width: number;
  height: number;
  /** Retained for small type treatment only; it never selects a landscape scene. */
  compact: boolean;
  microLandscape?: boolean;
  gameplayAxisX: number;
  waterlineY: number;
  hookX: number;
  hook: DockPoint;
  playGaugeCenter: DockPoint;
  playGaugeSize: number;
  upgradePanelCenter: DockPoint;
  upgradePanelTop: number;
  upgradeCardWidth: number;
  upgradeCardHeight: number;
  upgradeCardGap: number;
  upgradePanelWidth: number;
  boatAnchor: DockPoint;
  characterAnchor: DockPoint;
  characterWidth: number;
  characterHeight: number;
  channelWidth: number;
  /** The world is always the complete portrait stage. Kept for renderer compatibility. */
  wide: false;
  worldLeft: 0;
  worldWidth: number;
  sceneSafeAreas: DockSafeAreas;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteInset(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

/**
 * Build the only coordinate system shared by Pixi, DOM HUD, modals and input.
 * The parent letterboxes the stage on wide displays; this function deliberately
 * has no desktop/landscape composition branch.
 */
export function createDockLayout(
  viewportWidth = DOCK_DESIGN_WIDTH,
  viewportHeight = DOCK_DESIGN_HEIGHT,
  safeAreaInsets: DockSafeAreaInsets = {},
): DockViewportLayout {
  const width = finiteDimension(viewportWidth, DOCK_DESIGN_WIDTH);
  const height = finiteDimension(viewportHeight, DOCK_DESIGN_HEIGHT);
  const scale = Math.min(width / DOCK_DESIGN_WIDTH, height / DOCK_DESIGN_HEIGHT);
  const compact = width < 340 || height < 720;
  const sideSafe = clamp(10 * scale, 8, 16);
  const topSafe = clamp(12 * scale, 10, 20) + finiteInset(safeAreaInsets.top);
  const bottomSafe = clamp(12 * scale, 8, 18) + finiteInset(safeAreaInsets.bottom);
  const leftSafe = sideSafe + finiteInset(safeAreaInsets.left);
  const rightSafe = sideSafe + finiteInset(safeAreaInsets.right);

  const gameplayAxisX = width * DOCK_LAYOUT_RATIOS.gameplayAxisX;
  const waterlineY = height * DOCK_LAYOUT_RATIOS.waterlineY;
  const playGaugeSize = clamp(width * 0.32, 96 * scale, 132 * scale);
  const upgradeCardGap = clamp(width * 0.022, 6 * scale, 10 * scale);
  const availableCardWidth = (width - leftSafe - rightSafe - upgradeCardGap * 2) / 3;
  const upgradeCardWidth = clamp(Math.min(availableCardWidth, width * 0.29), 82 * scale, 118 * scale);
  const upgradeCardHeight = clamp(height * 0.19, 132 * scale, 178 * scale);
  const upgradePanelTop = clamp(
    height * DOCK_LAYOUT_RATIOS.upgradePanelTop,
    waterlineY + playGaugeSize + 22 * scale,
    height - bottomSafe - upgradeCardHeight,
  );
  const characterWidth = clamp(width * DOCK_LAYOUT_RATIOS.characterWidth, 124 * scale, 188 * scale);
  const characterHeight = characterWidth * (CHARACTER_SOURCE.height / CHARACTER_SOURCE.width);
  const boatAnchor = {
    x: width * DOCK_LAYOUT_RATIOS.boatAnchorX,
    y: waterlineY + 3 * scale,
  };
  const hookY = boatAnchor.y - characterHeight * (1 - CHARACTER_SOURCE.hookY / CHARACTER_SOURCE.height);

  return {
    width,
    height,
    compact,
    gameplayAxisX,
    waterlineY,
    hookX: gameplayAxisX,
    hook: { x: gameplayAxisX, y: hookY },
    playGaugeCenter: { x: gameplayAxisX, y: height * DOCK_LAYOUT_RATIOS.playGaugeCenterY },
    playGaugeSize,
    upgradePanelCenter: { x: gameplayAxisX, y: upgradePanelTop + upgradeCardHeight / 2 },
    upgradePanelTop,
    upgradeCardWidth,
    upgradeCardHeight,
    upgradeCardGap,
    upgradePanelWidth: upgradeCardWidth * 3 + upgradeCardGap * 2,
    boatAnchor,
    characterAnchor: boatAnchor,
    characterWidth,
    characterHeight,
    channelWidth: width * DOCK_LAYOUT_RATIOS.channelWidth,
    wide: false,
    microLandscape: false,
    worldLeft: 0,
    worldWidth: width,
    sceneSafeAreas: { top: topSafe, right: rightSafe, bottom: bottomSafe, left: leftSafe },
  };
}

export function dockLayoutCssVariables(layout: DockViewportLayout): Record<string, string> {
  return {
    "--dock-gameplay-axis-x": `${layout.gameplayAxisX}px`,
    "--dock-waterline-y": `${layout.waterlineY}px`,
    "--dock-hook-x": `${layout.hookX}px`,
    "--dock-hook-y": `${layout.hook.y}px`,
    "--dock-gauge-center-y": `${layout.playGaugeCenter.y}px`,
    "--dock-gauge-size": `${layout.playGaugeSize}px`,
    "--dock-upgrade-center-y": `${layout.upgradePanelCenter.y}px`,
    "--dock-upgrade-top": `${layout.upgradePanelTop}px`,
    "--dock-upgrade-card-width": `${layout.upgradeCardWidth}px`,
    "--dock-upgrade-card-height": `${layout.upgradeCardHeight}px`,
    "--dock-upgrade-gap": `${layout.upgradeCardGap}px`,
    "--dock-upgrade-width": `${layout.upgradePanelWidth}px`,
    "--dock-boat-anchor-x": `${layout.boatAnchor.x}px`,
    "--dock-boat-anchor-y": `${layout.boatAnchor.y}px`,
    "--dock-character-width": `${layout.characterWidth}px`,
    "--dock-channel-width": `${layout.channelWidth}px`,
    "--dock-safe-top": `${layout.sceneSafeAreas.top}px`,
    "--dock-safe-right": `${layout.sceneSafeAreas.right}px`,
    "--dock-safe-bottom": `${layout.sceneSafeAreas.bottom}px`,
    "--dock-safe-left": `${layout.sceneSafeAreas.left}px`,
    "--dock-world-left": "0px",
    "--dock-world-width": `${layout.worldWidth}px`,
  };
}
