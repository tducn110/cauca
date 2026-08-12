import { Application, Container, Graphics, Sprite, AnimatedSprite, FillGradient } from 'pixi.js';
import type { DockViewportLayout } from '../dockLayout';
import type { AmbientNode } from './runtimeTypes';
import { FishingPowerGauge } from '../FishingPowerGauge';

export const GAUGE_BASE_SIZE = 112;
export const BACKGROUND_SOURCE = { width: 1448, height: 1086, waterlineY: 477 } as const;

export type LayoutNodes = {
  background: Sprite;
  waterBody: Graphics;
  rearWave: Graphics;
  frontWave: Graphics;
  frontWaveMask: Graphics;
  channel: Graphics;
  leftBank: Graphics;
  rightBank: Graphics;
  boatShadow: Graphics;
  /** boatRoot: world-space container. ONLY layout writes x/y here. */
  boatRoot: Container;
  /** sprite: the AnimatedSprite inside boatRoot → boatBob. Layout writes scale here once. */
  sprite: AnimatedSprite;
  targetDepthMeters: () => number;
};

/** Animated water-surface specs. The front wave is the one the boat floats on.
 * rear moves LEFT→RIGHT (positive speed), front moves RIGHT→LEFT (negative speed)
 * so they visually cross each other for a natural ocean feel. */
export const WATER_SURFACE_MOTION = {
  rear: {
    amplitude: 8,
    wavelength: 250,
    speed: 0.45,
    amplitude2: 4,
    wavelength2: 140,
    speed2: -0.3,
    color: 0x4dd0e1,
    alpha: 0.25,
    strokeColor: 0x88f5f5,
    strokeAlpha: 0.6,
  },
  front: {
    amplitude: 14,
    wavelength: 310,
    speed: -0.65,
    amplitude2: 6,
    wavelength2: 175,
    speed2: 0.35,
    color: 0x0c4b94,
    alpha: 0.45,
    strokeColor: 0x90e0ef,
    strokeAlpha: 0.9,
  },
} as const;

type WaveMotionSpec = {
  amplitude: number;
  wavelength: number;
  basePhase?: number;
  speed: number;
  amplitude2?: number;
  wavelength2?: number;
  phase2?: number;
  speed2?: number;
};

export function wavePhaseAt(spec: WaveMotionSpec, time: number): number {
  return (spec.basePhase ?? 0) + time * spec.speed;
}

/** Multi-sine wave height for organic natural look. */
export function sampleWaveHeight(x: number, spec: WaveMotionSpec, time: number): number {
  const primary = Math.sin(x / spec.wavelength + wavePhaseAt(spec, time)) * spec.amplitude;
  if (!spec.amplitude2 || !spec.wavelength2) return primary;
  const secondary = Math.sin(x / spec.wavelength2 + (spec.phase2 ?? 0) + time * (spec.speed2 ?? spec.speed * 0.7)) * spec.amplitude2;
  return primary + secondary;
}

export function sampleWaveSlope(x: number, spec: WaveMotionSpec, time: number): number {
  const primarySlope = Math.cos(x / spec.wavelength + wavePhaseAt(spec, time))
    * spec.amplitude * (Math.PI * 2 / spec.wavelength);
  if (!spec.amplitude2 || !spec.wavelength2) return primarySlope;
  const secondarySlope = Math.cos(x / spec.wavelength2 + (spec.phase2 ?? 0) + time * (spec.speed2 ?? spec.speed * 0.7))
    * spec.amplitude2 * (Math.PI * 2 / spec.wavelength2);
  return primarySlope + secondarySlope;
}

const BOAT_BOB_FACTOR = 0.5;

/**
 * Vertical offset + tilt the boat must apply so it visibly rides the front wave.
 */
export function sampleBoatWaveMotion(x: number, time: number): { bobY: number; tilt: number } {
  const spec = WATER_SURFACE_MOTION.front;
  const bobY = sampleWaveHeight(x, spec, time) * BOAT_BOB_FACTOR;
  const tilt = sampleWaveSlope(x, spec, time) * 0.15;
  return { bobY, tilt };
}

/** Redraw both wave layers with the phase advanced to `time` (called per frame). */
export function updateWaterSurface(
  nodes: Pick<LayoutNodes, "rearWave" | "frontWave">,
  layout: DockViewportLayout,
  time: number,
): void {
  drawWave(nodes.rearWave, layout, {
    ...WATER_SURFACE_MOTION.rear,
    time,
  });
  drawWave(nodes.frontWave, layout, {
    ...WATER_SURFACE_MOTION.front,
    isFront: true,
    time,
  });
}

export function drawWave(
  graphics: Graphics,
  layout: DockViewportLayout,
  options: {
    amplitude: number;
    wavelength: number;
    speed: number;
    color: number;
    alpha: number;
    strokeColor: number;
    strokeAlpha: number;
    isFront?: boolean;
    time?: number;
    amplitude2?: number;
    wavelength2?: number;
    speed2?: number;
  },
): void {
  const overdraw = 200;
  const startX = -overdraw;
  const endX = layout.width + overdraw;
  // Finer step for smoother curves
  const step = Math.max(8, options.wavelength / 10);
  const time = options.time ?? 0;
  const baseY = layout.waterlineY;
  
  graphics.clear();
  graphics.moveTo(startX, baseY);
  for (let x = startX; x <= endX + step; x += step) {
    // Primary sine wave
    let y = baseY
      + Math.sin(x / options.wavelength + time * options.speed) * options.amplitude;
    // Secondary sine wave for organic, natural appearance
    if (options.amplitude2 && options.wavelength2) {
      y += Math.sin(x / options.wavelength2 + time * (options.speed2 ?? 0)) * options.amplitude2;
    }
    graphics.lineTo(x, y);
  }
  
  const bottomY = baseY + layout.height * 4;
  graphics
    .lineTo(endX + step, bottomY)
    .lineTo(startX, bottomY)
    .closePath()
    .fill({ color: options.color, alpha: options.alpha })
    .stroke({ color: options.strokeColor, width: 2, alpha: options.strokeAlpha });
}

export function drawWaterColumnMask(graphics: Graphics, layout: DockViewportLayout, totalDepthPx: number): void {
  graphics.clear();
  if (!layout.wide) {
    graphics.rect(-100, -100, layout.width + 200, layout.height + 200).fill(0xffffff);
    return;
  }
  const top = layout.waterlineY - 200;
  const bottom = layout.waterlineY + totalDepthPx + 340;
  const innerLeftXBase = layout.worldLeft;
  const innerRightXBase = layout.worldLeft + layout.worldWidth;
  const seedLeft = 1.7;
  const seedRight = 4.3;
  const innerLeftXAt = (y: number) => innerLeftXBase + Math.sin(y * 0.011 + seedLeft) * 15 + Math.sin(y * 0.029 + seedLeft * 2.3) * 6;
  const innerRightXAt = (y: number) => innerRightXBase + Math.sin(y * 0.011 + seedRight) * 15 + Math.sin(y * 0.029 + seedRight * 2.3) * 6;
  const step = 46;
  graphics.moveTo(innerLeftXAt(top), top);
  for (let y = top + step; y < bottom; y += step) {
    graphics.lineTo(innerLeftXAt(y), y);
  }
  graphics.lineTo(innerLeftXAt(bottom), bottom);
  graphics.lineTo(innerRightXAt(bottom), bottom);
  for (let y = bottom - step; y >= top; y -= step) {
    graphics.lineTo(innerRightXAt(y), y);
  }
  graphics.closePath().fill(0xffffff);
}

export function drawChannel(graphics: Graphics, layout: DockViewportLayout, totalDepthPx: number): void {
  const { gameplayAxisX: axisX, waterlineY, channelWidth } = layout;
  const half = channelWidth / 2;
  const top = waterlineY - 5;
  const bottom = top + totalDepthPx + 300;

  graphics.clear();
  // Main soft water channel gradient shape — very subtle to avoid visible light column
  graphics
    .moveTo(axisX - half * 0.7, top)
    .bezierCurveTo(axisX - half * 0.85, top + 400, axisX - half * 0.95, bottom - 400, axisX - half * 0.9, bottom)
    .lineTo(axisX + half * 0.9, bottom)
    .bezierCurveTo(axisX + half * 0.95, bottom - 400, axisX + half * 0.85, top + 400, axisX + half * 0.7, top)
    .closePath()
    .fill({ color: 0x38bdf8, alpha: 0.05 });
}

const BANK_DEPTH_MARGIN = 340;

/**
 * Draws one ground bank (Tiny Fishing style earthen wall) on the given side of
 * the playable water column. Only rendered in wide mode; cleared otherwise.
 * The bank hangs from the waterline down past the maximum camera depth so the
 * water column stays flanked by earth during the whole descent.
 */
export function drawBank(
  graphics: Graphics,
  layout: DockViewportLayout,
  side: "left" | "right",
  totalDepthPx: number,
): void {
  graphics.clear();
  if (!layout.wide) return;

  const top = layout.waterlineY - 4;
  const bottom = layout.waterlineY + totalDepthPx + BANK_DEPTH_MARGIN;
  const overdraw = 120;
  const outerX = side === "left" ? -overdraw : layout.width + overdraw;
  const innerBaseX = side === "left" ? layout.worldLeft : layout.worldLeft + layout.worldWidth;
  // Slight organic wobble so the earthen wall is not a sterile straight edge.
  const seed = side === "left" ? 1.7 : 4.3;
  const innerXAt = (y: number) =>
    innerBaseX
    + Math.sin(y * 0.011 + seed) * 15
    + Math.sin(y * 0.029 + seed * 2.3) * 6;

  const gradient = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: 0x7c4a54 },   // warm silt just below the surface
      { offset: 0.16, color: 0x5e3649 },
      { offset: 0.45, color: 0x3d2341 },
      { offset: 1, color: 0x1e1030 },   // deep earth fading into the abyss
    ],
  });

  const step = 46;
  graphics.moveTo(outerX, top);
  graphics.lineTo(innerXAt(top), top);
  for (let y = top + step; y < bottom; y += step) {
    graphics.lineTo(innerXAt(y), y);
  }
  graphics
    .lineTo(innerXAt(bottom), bottom)
    .lineTo(outerX, bottom)
    .closePath()
    .fill(gradient);

  // Sun-lit rim along the inner edge so the wall reads as carved earth.
  graphics.moveTo(innerXAt(top), top);
  for (let y = top + step; y < bottom; y += step) {
    graphics.lineTo(innerXAt(y), y);
  }
  graphics.lineTo(innerXAt(bottom), bottom)
    .stroke({ color: 0xa97368, width: 3, alpha: 0.5 });

  // Bright soil lip right under the waterline.
  graphics
    .moveTo(outerX, top)
    .lineTo(innerXAt(top), top)
    .stroke({ color: 0xc99878, width: 4, alpha: 0.85 });
}

export function createLayoutApplicator(
  app: Application,
  nodes: LayoutNodes,
  gauge: FishingPowerGauge,
  ambient: { bubbles: AmbientNode[] },
  host: HTMLDivElement,
): (nextLayout: DockViewportLayout) => void {
  const waterGradient = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: 0x249ce7 },
      { offset: 0.04, color: 0x1a7ad8 },
      { offset: 0.1, color: 0x176fca },
      { offset: 0.22, color: 0x0f5cb8 },
      { offset: 0.4, color: 0x0a4a9a },
      { offset: 0.65, color: 0x073a7c },
      { offset: 1, color: 0x052c62 },
    ],
  });

  return (nextLayout: DockViewportLayout) => {
    if (!app || !app.renderer) return; // in case it's destroyed

    const width = Math.max(1, Math.round(nextLayout.width));
    const height = Math.max(1, Math.round(nextLayout.height));

    app.renderer.resize(width, height);

    if (app.canvas) {
      app.canvas.style.width = `${width}px`;
      app.canvas.style.height = `${height}px`;
    }

    const backgroundScale = Math.max(
      nextLayout.width / BACKGROUND_SOURCE.width,
      nextLayout.waterlineY / BACKGROUND_SOURCE.waterlineY,
      (nextLayout.height - nextLayout.waterlineY)
        / (BACKGROUND_SOURCE.height - BACKGROUND_SOURCE.waterlineY),
    );
    nodes.background.scale.set(backgroundScale);
    nodes.background.position.set(
      (nextLayout.width - BACKGROUND_SOURCE.width * backgroundScale) / 2,
      nextLayout.waterlineY - BACKGROUND_SOURCE.waterlineY * backgroundScale,
    );

    const targetDepthMeters = nodes.targetDepthMeters();
    const totalDepthPx = targetDepthMeters * 2.8 + nextLayout.height;
    nodes.waterBody.clear();
    // Full-width water body covers entire viewport width (banks included).
    // Starts just above waterlineY so the water surface appears continuous.
    const waterOverdraw = 400; // extended to fully cover banks on both sides
    nodes.waterBody
      .rect(
        -waterOverdraw,
        nextLayout.waterlineY - 2,
        nextLayout.width + waterOverdraw * 2,
        totalDepthPx,
      )
      .fill(waterGradient);
    nodes.waterBody.alpha = 1;

    // Waves are animated per frame by updateWaterSurface; draw the t=0 frame
    // here so the scene is complete immediately after a layout change.
    updateWaterSurface(nodes, nextLayout, 0);
    drawWaterColumnMask(nodes.frontWaveMask, nextLayout, totalDepthPx);
    drawChannel(nodes.channel, nextLayout, totalDepthPx);
    drawBank(nodes.leftBank, nextLayout, "left", totalDepthPx);
    drawBank(nodes.rightBank, nextLayout, "right", totalDepthPx);

    nodes.boatShadow.clear();
    nodes.boatShadow
      .ellipse(
        nextLayout.boatAnchor.x,
        nextLayout.waterlineY + 10,
        nextLayout.characterWidth * 0.29,
        Math.max(5, nextLayout.characterWidth * 0.026),
      )
      .fill({ color: 0x123b71, alpha: 0.22 });

    // boatRoot: stable world position — layout is the ONLY writer of x/y.
    // boatBob child is responsible for local Y offset (bob). Do not touch it here.
    nodes.boatRoot.position.set(nextLayout.boatAnchor.x, nextLayout.boatAnchor.y);

    const CHARACTER_CONTENT_WIDTH_PX = 394;
    const scaleFactor = nextLayout.characterWidth / CHARACTER_CONTENT_WIDTH_PX;
    nodes.sprite.scale.set(-scaleFactor, scaleFactor);

    gauge.position.set(nextLayout.playGaugeCenter.x, nextLayout.playGaugeCenter.y);
    gauge.scale.set(nextLayout.playGaugeSize / GAUGE_BASE_SIZE);

    // Bubbles stay inside the playable water column (full width when not wide).
    const bubbleLeft = nextLayout.worldLeft ?? 0;
    const bubbleWidth = nextLayout.worldWidth ?? nextLayout.width;
    for (const item of ambient.bubbles) {
      item.node.position.set(bubbleLeft + bubbleWidth * item.xRatio, nextLayout.height * item.yRatio);
    }

    host.dataset.hookX = nextLayout.hook.x.toFixed(2);
    host.dataset.channelCenterX = nextLayout.gameplayAxisX.toFixed(2);
    host.dataset.gaugeCenterX = nextLayout.playGaugeCenter.x.toFixed(2);
    host.dataset.upgradeCenterX = nextLayout.upgradePanelCenter.x.toFixed(2);

    if (app.canvas) {
      const rect = app.canvas.getBoundingClientRect();
      console.assert(
        Math.abs(rect.width / rect.height - nextLayout.width / nextLayout.height) < 0.01,
        "Pixi canvas aspect ratio mismatch"
      );
    }
  };
}

