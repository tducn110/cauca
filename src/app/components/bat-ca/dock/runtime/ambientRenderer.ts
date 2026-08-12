import { Container, Graphics } from 'pixi.js';
import type { AmbientNode } from './runtimeTypes';
import type { DockViewportLayout } from '../dockLayout';

export function buildAmbient(): { bubbles: AmbientNode[]; sky: Container; underwater: Container } {
  const bubbles: AmbientNode[] = [];
  const sky = new Container();
  const underwater = new Container();

  for (let index = 0; index < 16; index++) {
    const radius = 2 + index % 3;
    const node = new Graphics()
      .circle(0, 0, radius)
      .stroke({ color: 0xcdf6ff, width: 1.4, alpha: 0.5 });
    const item = {
      node,
      xRatio: 0.08 + index * 0.06,
      yRatio: 0.5 + (index % 6) * 0.08,
      speed: 0.23 + (index % 4) * 0.05,
      phase: index * 0.65,
    };
    bubbles.push(item);
    underwater.addChild(node);
  }

  return { bubbles, sky, underwater };
}

export function updateAmbient(
  ambient: { bubbles: AmbientNode[] },
  layout: DockViewportLayout,
  elapsed: number,
): void {
  // Bubbles live inside the playable water column (full width when not wide).
  const columnLeft = layout.worldLeft ?? 0;
  const columnWidth = layout.worldWidth ?? layout.width;
  for (const item of ambient.bubbles) {
    const underwaterHeight = layout.height * 2;
    item.node.x = columnLeft + columnWidth * item.xRatio + Math.sin(elapsed + item.phase) * 7;
    item.node.y = layout.waterlineY
      + underwaterHeight
      - ((elapsed * 35 * item.speed + item.phase * 38) % underwaterHeight);
    item.node.alpha = 0.28 + Math.sin(elapsed * 2 + item.phase) * 0.12;
  }
}
