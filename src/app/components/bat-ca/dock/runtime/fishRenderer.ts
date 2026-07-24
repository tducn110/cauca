import { Graphics } from 'pixi.js';
import type { FishKind } from '../../game/types';
import type { ActiveFish } from './runtimeTypes';
import type { DockViewportLayout } from '../dockLayout';

export const CAUGHT_SLOTS = [
  { x: -22, y: -6 },
  { x: 22, y: -6 },
  { x: -26, y: 12 },
  { x: 26, y: 12 },
  { x: -20, y: 30 },
  { x: 20, y: 30 },
  { x: -30, y: 46 },
  { x: 30, y: 46 },
  { x: -16, y: 56 },
  { x: 16, y: 56 },
  { x: 0, y: 52 },
];

export function drawFishShape(target: Graphics, kind: FishKind, size: number): void {
  target.clear();
  if (kind.isBad) {
    target.ellipse(0, 0, size, size * 0.6).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
    target.moveTo(-size * 0.4, -size * 0.2).lineTo(size * 0.4, -size * 0.5).stroke({ color: "#2a2418", width: 1.2 });
    return;
  }

  if (kind.type === "tom") {
    target.arc(0, 0, size, 0.2, Math.PI * 1.8).stroke({ color: "#2a2418", width: 1.2 });
    target.ellipse(0, 0, size * 0.9, size * 0.55).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
    target.moveTo(size, -2).lineTo(size + 6, -6).moveTo(size, 2).lineTo(size + 6, 6).stroke({ color: "#2a2418", width: 1.2 });
    return;
  }

  if (kind.type === "cua") {
    target.ellipse(0, 0, size, size * 0.7).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
    target.moveTo(-size, 0).lineTo(-size - 6, -4).moveTo(size, 0).lineTo(size + 6, -4);
    target.moveTo(-size * 0.6, size * 0.5).lineTo(-size * 0.6, size + 4);
    target.moveTo(size * 0.6, size * 0.5).lineTo(size * 0.6, size + 4);
    target.stroke({ color: "#2a2418", width: 1.2 });
    return;
  }

  target
    .moveTo(-size * 0.9, 0)
    .lineTo(-size * 1.7, -size * 0.7)
    .lineTo(-size * 1.7, size * 0.7)
    .closePath()
    .fill(kind.color)
    .stroke({ color: "#2a2418", width: 1.2 });
  target.ellipse(0, 0, size * 1.3, size * 0.75).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
  target
    .moveTo(-size * 0.2, -size * 0.7)
    .lineTo(size * 0.3, -size * 1.1)
    .lineTo(size * 0.5, -size * 0.6)
    .closePath()
    .fill(kind.color)
    .stroke({ color: "#2a2418", width: 1.2 });
  target.circle(size * 0.7, -size * 0.1, size * 0.22).fill("#ffffff");
  target.circle(size * 0.75, -size * 0.1, size * 0.1).fill("#2a2418");
}

export function createFishPool(options: {
  targetDepthMeters: number;
  layout: DockViewportLayout;
  fishKinds: FishKind[];
  fishContainer: import('pixi.js').Container;
}): ActiveFish[] {
  const activeFishList: ActiveFish[] = [];
  const totalDepthPx = options.targetDepthMeters * 2.8;
  const numFish = Math.min(60, 20 + Math.floor(options.targetDepthMeters / 30));

  let nextFishId = 1;
  for (let i = 0; i < numFish; i++) {
    const depthRatio = Math.random();
    const depthMeters = depthRatio * options.targetDepthMeters;

    const matching = options.fishKinds.filter(
      (k) => depthMeters >= k.depthMin && depthMeters <= k.depthMax
    );
    const kind = matching.length > 0
      ? matching[Math.floor(Math.random() * matching.length)]
      : options.fishKinds[0];

    const node = new Graphics();
    drawFishShape(node, kind, kind.size);

    const startX = options.layout.gameplayAxisX + (Math.random() - 0.5) * options.layout.channelWidth * 0.9;
    const startY = options.layout.waterlineY + 80 + depthRatio * totalDepthPx;
    const vx = (Math.random() > 0.5 ? 1 : -1) * (kind.speed * (0.8 + Math.random() * 0.4));

    node.position.set(startX, startY);
    node.scale.set(vx >= 0 ? 1 : -1, 1);
    options.fishContainer.addChild(node);

    activeFishList.push({
      id: nextFishId++,
      kind,
      x: startX,
      depthY: startY,
      vx,
      size: kind.size,
      node,
      isCaught: false,
    });
  }
  return activeFishList;
}

export function updateFishPositions(
  activeFishList: ActiveFish[],
  caughtFishList: ActiveFish[],
  capturePointX: number,
  capturePointY: number,
  layout: DockViewportLayout,
  dt: number
): void {
  const channelHalf = layout.channelWidth * 0.45;
  const minX = layout.gameplayAxisX - channelHalf;
  const maxX = layout.gameplayAxisX + channelHalf;

  for (const fish of activeFishList) {
    if (fish.isCaught) {
      if ((layout as any).__fishingState !== "payout") {
        const index = caughtFishList.indexOf(fish);
        const slot = CAUGHT_SLOTS[Math.min(index, CAUGHT_SLOTS.length - 1)];
        const extraY = Math.floor(index / CAUGHT_SLOTS.length) * 45;
        fish.x = capturePointX + slot.x;
        fish.depthY = capturePointY + slot.y + extraY;
        fish.node.position.set(fish.x, fish.depthY);
        const caughtScale = 0.6;
        fish.node.scale.set((fish.vx >= 0 ? caughtScale : -caughtScale), caughtScale);
        fish.node.rotation = (index % 2 === 0 ? 0.15 : -0.15);
      }
    } else {
      fish.x += fish.vx * dt;
      if (fish.x < minX) {
        fish.x = minX;
        fish.vx = Math.abs(fish.vx);
      } else if (fish.x > maxX) {
        fish.x = maxX;
        fish.vx = -Math.abs(fish.vx);
      }
      fish.node.position.set(fish.x, fish.depthY);
      fish.node.scale.set(fish.vx >= 0 ? 1 : -1, 1);
    }
  }
}

export function destroyFishNodes(
  activeFishList: ActiveFish[],
  caughtFishList: ActiveFish[],
  reportError: (error: unknown, operation: string) => void
): void {
  const nodes = new Set<Graphics>();
  for (const fish of activeFishList) nodes.add(fish.node);
  for (const fish of caughtFishList) nodes.add(fish.node);
  for (const node of nodes) {
    try {
      if (!node.destroyed) {
        node.destroy();
      }
    } catch (error) {
      reportError(error, "destroyFishNode");
    }
  }
}
