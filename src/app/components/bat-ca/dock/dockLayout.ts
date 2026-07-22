export const DOCK_DESIGN_WIDTH = 1280;
export const DOCK_DESIGN_HEIGHT = 720;

const CHARACTER_SOURCE = {
  width: 1478,
  height: 1064,
  // The supplied character texture includes the boat, rod, line and hook.
  // After mirroring it, this source-space hook offset lets the boat stay on
  // the right while the baked hook lands exactly on the gameplay axis.
  hookX: 1334,
  hookY: 760,
} as const;

export const DOCK_LAYOUT_RATIOS = {
  gameplayAxisX: 0.5,
  waterlineY: 0.455,
  compactWaterlineY: 0.43,
  shortWaterlineY: 0.445,
  playGaugeCenterY: 0.585,
  compactPlayGaugeCenterY: 0.565,
  shortPlayGaugeCenterY: 0.55,
  microLandscapeWaterlineY: 0.405,
  microLandscapeGaugeCenterY: 0.53,
  channelWidth: 0.29,
  compactChannelWidth: 0.56,
  characterWidth: 0.285,
  characterHeightLimit: 0.48,
} as const;

type DockPoint = Readonly<{ x: number; y: number }>;

export type DockSafeAreas = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export type DockSafeAreaInsets = Partial<DockSafeAreas>;

export type DockViewportLayout = Readonly<{
  width: number;
  height: number;
  compact: boolean;
  microLandscape: boolean;
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

export function createDockLayout(
  viewportWidth = DOCK_DESIGN_WIDTH,
  viewportHeight = DOCK_DESIGN_HEIGHT,
  safeAreaInsets: DockSafeAreaInsets = {},
): DockViewportLayout {
  const width = finiteDimension(viewportWidth, DOCK_DESIGN_WIDTH);
  const height = finiteDimension(viewportHeight, DOCK_DESIGN_HEIGHT);
  const compact = width < 720 || width <= height;
  const short = height < 640;
  const microLandscape = height < 360 && width / height > 1.5;
  const sideSafe = compact ? clamp(width * 0.022, 8, 14) : clamp(width * 0.016, 16, 24);
  const topSafeBase = microLandscape
    ? clamp(height * 0.035, 10, 14)
    : compact
      ? clamp(height * 0.018, 10, 18)
      : clamp(height * 0.035, 18, 38);
  const bottomSafeBase = microLandscape
    ? 8
    : compact
      ? clamp(height * 0.014, 8, 16)
      : clamp(height * 0.025, 14, 28);
  const topSafe = topSafeBase + finiteInset(safeAreaInsets.top);
  const rightSafe = sideSafe + finiteInset(safeAreaInsets.right);
  const bottomSafe = bottomSafeBase + finiteInset(safeAreaInsets.bottom);
  const leftSafe = sideSafe + finiteInset(safeAreaInsets.left);
  const gameplayAxisX = width * DOCK_LAYOUT_RATIOS.gameplayAxisX;
  const waterlineRatio = microLandscape
    ? DOCK_LAYOUT_RATIOS.microLandscapeWaterlineY
    : short
      ? DOCK_LAYOUT_RATIOS.shortWaterlineY
      : compact
        ? DOCK_LAYOUT_RATIOS.compactWaterlineY
        : DOCK_LAYOUT_RATIOS.waterlineY;
  const nominalWaterlineY = height * waterlineRatio;

  const playGaugeSize = microLandscape
    ? clamp(Math.min(width * 0.09, height * 0.25), 76, 82)
    : compact
      ? clamp(Math.min(width * 0.26, height * 0.145), 88, 126)
      : clamp(Math.min(width * 0.0875, height * 0.155), 88, 112);
  const upgradeCardGap = microLandscape
    ? 6
    : compact
      ? clamp(width * 0.016, 5, 8)
      : clamp(width * 0.008, 8, 12);
  const availableCardWidth = Math.max(0, (width - leftSafe - rightSafe - upgradeCardGap * 2) / 3);
  const upgradeCardWidth = Math.min(clamp(width * 0.102, 116, 140), availableCardWidth);
  const upgradeCardHeight = microLandscape
    ? clamp(height * 0.26, 80, 86)
    : short
      ? clamp(height * 0.17, 96, 112)
      : clamp(height * 0.175, 112, 136);
  const gaugeToCardsGap = microLandscape ? 7 : clamp(height * 0.018, 12, 18);
  const maxUpgradeTop = height - bottomSafe - upgradeCardHeight;
  const maxGaugeCenterY = maxUpgradeTop - gaugeToCardsGap - playGaugeSize / 2;
  const gaugeSurfaceClearance = playGaugeSize * (microLandscape ? 0.5 : short ? 0.55 : 0.66);

  // Preserve the vertical gameplay invariant even on unusually short screens:
  // waterline -> complete gauge -> intentional gap -> complete upgrade cards.
  // Moving the scene composition upward is preferable to silently overlapping
  // interactive controls at a breakpoint boundary.
  const waterlineY = Math.max(
    0,
    Math.min(nominalWaterlineY, maxGaugeCenterY - gaugeSurfaceClearance),
  );
  const requestedGaugeY = height * (
    microLandscape
      ? DOCK_LAYOUT_RATIOS.microLandscapeGaugeCenterY
      : short
        ? DOCK_LAYOUT_RATIOS.shortPlayGaugeCenterY
        : compact
          ? DOCK_LAYOUT_RATIOS.compactPlayGaugeCenterY
          : DOCK_LAYOUT_RATIOS.playGaugeCenterY
  );
  const playGaugeCenterY = Math.min(
    maxGaugeCenterY,
    Math.max(requestedGaugeY, waterlineY + gaugeSurfaceClearance),
  );
  const upgradePanelTop = playGaugeCenterY + playGaugeSize / 2 + gaugeToCardsGap;
  const upgradePanelCenterY = upgradePanelTop + upgradeCardHeight / 2;

  const hookSourceX = CHARACTER_SOURCE.hookX / CHARACTER_SOURCE.width;
  const hookOffsetFromCenter = hookSourceX - 0.5;
  const requestedCharacterWidth = compact
    ? Math.min(width * 0.58, height * 0.42)
    : Math.min(
      width * DOCK_LAYOUT_RATIOS.characterWidth,
      height * DOCK_LAYOUT_RATIOS.characterHeightLimit,
    );
  // With a centered sprite anchor, the mirrored texture's right edge must stay
  // inside the safe area while its baked hook remains on gameplayAxisX.
  const maxCharacterWidth = (width - rightSafe - gameplayAxisX) / hookSourceX;
  const characterWidth = Math.min(
    clamp(
      requestedCharacterWidth,
      compact || short ? 150 : 300,
      compact ? 280 : short ? 360 : 520,
    ),
    Math.max(1, maxCharacterWidth),
  );
  const characterHeight = characterWidth * (CHARACTER_SOURCE.height / CHARACTER_SOURCE.width);
  const boatAnchorX = gameplayAxisX + hookOffsetFromCenter * characterWidth;
  const boatAnchorY = waterlineY + clamp(height * 0.032, 16, 30);
  const hookY = boatAnchorY
    - characterHeight * (1 - CHARACTER_SOURCE.hookY / CHARACTER_SOURCE.height);
  const channelWidth = compact
    ? clamp(width * DOCK_LAYOUT_RATIOS.compactChannelWidth, 176, 320)
    : clamp(width * DOCK_LAYOUT_RATIOS.channelWidth, 300, 460);

  return {
    width,
    height,
    compact,
    microLandscape,
    gameplayAxisX,
    waterlineY,
    hookX: gameplayAxisX,
    hook: { x: gameplayAxisX, y: hookY },
    playGaugeCenter: { x: gameplayAxisX, y: playGaugeCenterY },
    playGaugeSize,
    upgradePanelCenter: { x: gameplayAxisX, y: upgradePanelCenterY },
    upgradePanelTop,
    upgradeCardWidth,
    upgradeCardHeight,
    upgradeCardGap,
    upgradePanelWidth: upgradeCardWidth * 3 + upgradeCardGap * 2,
    boatAnchor: { x: boatAnchorX, y: boatAnchorY },
    characterAnchor: { x: boatAnchorX, y: boatAnchorY },
    characterWidth,
    characterHeight,
    channelWidth,
    sceneSafeAreas: {
      top: topSafe,
      right: rightSafe,
      bottom: bottomSafe,
      left: leftSafe,
    },
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
  };
}
