import { useEffect, useLayoutEffect, useRef } from "react";
import {
  AnimatedSprite,
  Application,
  Assets,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Text,
  type Texture,
} from "pixi.js";
import { FishingPowerGauge, powerResultAtAngle, type PowerLockResult } from "./FishingPowerGauge";
import type { DockViewportLayout } from "./dockLayout";
import { FISH_KINDS } from "../game/fish-data";
import type { FishKind } from "../game/types";
import { DEPTH_UPGRADE_DELTA, INITIAL_CAPACITY, INITIAL_MAX_DEPTH } from "../game/constants";
import { gameAudio } from "../../../audio/audioManager";
import { recordDiscoveredFish } from "../game/storage";
import "./fishing-dock-scene.css";

const GAUGE_BASE_SIZE = 112;
const BACKGROUND_SOURCE = { width: 1448, height: 1086, waterlineY: 477 } as const;

const DUCK_FRAME_ORDER = [4, 6, 3, 1, 2, 5, 2, 1, 3, 6] as const;
const DUCK_SOURCE = { width: 480, height: 541 } as const;

const ASSETS = {
  background: "/assets/fishing/background.png",
  frames: Array.from({ length: 6 }, (_, i) =>
    `/assets/fishing/character/frame_0${i + 1}.png`
  ) as string[],
  dial: "/assets/fishing/gauge/dial_base.png",
  pointer: "/assets/fishing/gauge/pointer.png",
  glow: "/assets/fishing/gauge/max_glow.png",
} as const;

export type FishingState = "idle" | "casting" | "descending" | "ascending" | "surfacing";

export type CatchSummary = {
  earned: number;
  caughtCount: number;
  caughtFishTypes: string[];
};

type Props = {
  layout: DockViewportLayout;
  capacityLevel: number;
  depthLevel: number;
  onPowerLock?: (result: PowerLockResult) => void;
  onCatchComplete: (summary: CatchSummary) => void;
  onStateChange?: (state: FishingState, depthMeters: number, maxDepthMeters: number, capacity: number, caughtCount: number, runEarnings: number) => void;
  disabled?: boolean;
};

type AmbientNode = {
  node: Graphics;
  xRatio: number;
  yRatio: number;
  speed: number;
  phase: number;
};

type ActiveFish = {
  id: number;
  kind: FishKind;
  x: number;
  depthY: number;
  vx: number;
  size: number;
  node: Graphics;
  isCaught: boolean;
};

type FloatingText = {
  root: Container;
  label: Text;
  y: number;
  alpha: number;
  age: number;
  life: number;
};

type DockSceneRuntime = {
  applyLayout: (layout: DockViewportLayout) => void;
  setDisabled: (disabled: boolean) => void;
  updateProgression: (capacityLevel: number, depthLevel: number) => void;
};

function drawFishShape(target: Graphics, kind: FishKind, size: number): void {
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

function drawWave(
  graphics: Graphics,
  layout: DockViewportLayout,
  options: {
    amplitude: number;
    wavelength: number;
    phase: number;
    color: number;
    alpha: number;
    strokeColor: number;
    strokeAlpha: number;
    isFront?: boolean;
  },
): void {
  const overdraw = 36;
  const startX = -overdraw;
  const endX = layout.width + overdraw;
  const step = Math.max(18, options.wavelength / 5);
  graphics.clear();
  graphics.moveTo(startX, layout.waterlineY);
  for (let x = startX; x <= endX + step; x += step) {
    const y = layout.waterlineY
      + Math.sin((x / options.wavelength) * Math.PI * 2 + options.phase) * options.amplitude;
    graphics.lineTo(x, y);
  }
  const bottomY = options.isFront ? layout.waterlineY + 6 : layout.height * 4;
  graphics
    .lineTo(endX + step, bottomY)
    .lineTo(startX, bottomY)
    .closePath()
    .fill({ color: options.color, alpha: options.alpha })
    .stroke({ color: options.strokeColor, width: 2, alpha: options.strokeAlpha });
}

function drawChannel(graphics: Graphics, layout: DockViewportLayout, totalDepthPx: number): void {
  const { gameplayAxisX: axisX, waterlineY, channelWidth } = layout;
  const half = channelWidth / 2;
  const top = waterlineY - 5;
  const bottom = top + totalDepthPx + 300;

  graphics.clear();
  // Main soft water channel gradient shape
  graphics
    .moveTo(axisX - half * 0.7, top)
    .bezierCurveTo(axisX - half * 0.85, top + 400, axisX - half * 0.95, bottom - 400, axisX - half * 0.9, bottom)
    .lineTo(axisX + half * 0.9, bottom)
    .bezierCurveTo(axisX + half * 0.95, bottom - 400, axisX + half * 0.85, top + 400, axisX + half * 0.7, top)
    .closePath()
    .fill({ color: 0x38bdf8, alpha: 0.18 });

  // Inner soft light ray core
  graphics
    .moveTo(axisX - half * 0.4, top)
    .lineTo(axisX - half * 0.5, bottom)
    .lineTo(axisX + half * 0.5, bottom)
    .lineTo(axisX + half * 0.4, top)
    .closePath()
    .fill({ color: 0xe0f2fe, alpha: 0.08 });
}

function buildAmbient(): {
  leaves: AmbientNode[];
  bubbles: AmbientNode[];
  sparkles: AmbientNode[];
  sky: Container;
  underwater: Container;
  highlights: Container;
} {
  const leaves: AmbientNode[] = [];
  const bubbles: AmbientNode[] = [];
  const sparkles: AmbientNode[] = [];
  const sky = new Container();
  const underwater = new Container();
  const highlights = new Container();

  for (let index = 0; index < 6; index++) {
    const node = new Graphics().ellipse(0, 0, 8, 3).fill({
      color: index % 2 ? 0xff8a2b : 0xffcf32,
      alpha: 0.8,
    });
    const item = {
      node,
      xRatio: 0.12 + index * 0.15,
      yRatio: 0.1 + (index % 3) * 0.1,
      speed: 0.28 + index * 0.025,
      phase: index * 0.9,
    };
    node.rotation = -0.45 + index * 0.12;
    leaves.push(item);
    sky.addChild(node);
  }

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

  for (let index = 0; index < 7; index++) {
    const node = new Graphics()
      .moveTo(-7, 0).lineTo(7, 0)
      .moveTo(0, -7).lineTo(0, 7)
      .stroke({ color: 0xffe42e, width: 2.6, cap: "round" });
    const item = {
      node,
      xRatio: 0.4 + (index % 4) * 0.13,
      yRatio: 0.12 + Math.floor(index / 4) * 0.1,
      speed: 0.55,
      phase: index * 0.8,
    };
    sparkles.push(item);
    highlights.addChild(node);
  }

  return { leaves, bubbles, sparkles, sky, underwater, highlights };
}

export function FishingDockCanvas({
  layout,
  capacityLevel,
  depthLevel,
  onPowerLock,
  onCatchComplete,
  onStateChange,
  disabled = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<FishingPowerGauge | null>(null);
  const runtimeRef = useRef<DockSceneRuntime | null>(null);
  const layoutRef = useRef(layout);
  const callbackRef = useRef(onPowerLock);
  const catchCompleteRef = useRef(onCatchComplete);
  const stateChangeRef = useRef(onStateChange);
  const disabledRef = useRef(disabled);
  const capacityLevelRef = useRef(capacityLevel);
  const depthLevelRef = useRef(depthLevel);

  layoutRef.current = layout;
  callbackRef.current = onPowerLock;
  catchCompleteRef.current = onCatchComplete;
  stateChangeRef.current = onStateChange;
  disabledRef.current = disabled;
  capacityLevelRef.current = capacityLevel;
  depthLevelRef.current = depthLevel;

  useLayoutEffect(() => {
    runtimeRef.current?.applyLayout(layout);
  }, [layout]);

  useEffect(() => {
    runtimeRef.current?.setDisabled(disabled);
  }, [disabled]);

  useEffect(() => {
    runtimeRef.current?.updateProgression(capacityLevel, depthLevel);
  }, [capacityLevel, depthLevel]);

  useEffect(() => {
    const currentHost = hostRef.current;
    if (!currentHost) return;
    const host: HTMLDivElement = currentHost;

    let app: Application | null = new Application();
    let canceled = false;
    let initialized = false;
    let destroyed = false;
    let ownedGauge: FishingPowerGauge | null = null;
    let ownedRuntime: DockSceneRuntime | null = null;
    let activeLayout = layoutRef.current;
    let handlePointerMoveListener: ((e: PointerEvent) => void) | null = null;

    const destroyApplication = (target: Application) => {
      if (destroyed) return;
      destroyed = true;
      try {
        target.destroy({ removeView: true }, { children: true });
      } catch {
        try {
          target.stage.destroy({ children: true });
        } catch {
          // Ignore
        }
      }
    };

    const clearOwnedScene = () => {
      if (runtimeRef.current === ownedRuntime) runtimeRef.current = null;
      if (gaugeRef.current === ownedGauge) gaugeRef.current = null;
      if (!host.querySelector("canvas[data-scene-ready='true']")) {
        host.classList.remove("is-scene-ready", "is-gauge-disabled");
      }
    };

    async function init() {
      const currentApp = app;
      if (!currentApp) return;
      try {
        await currentApp.init({
          width: activeLayout.width,
          height: activeLayout.height,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          antialias: true,
          backgroundAlpha: 0,
          preference: ["webgl", "canvas"],
        });
        initialized = true;
        if (canceled || !app) {
          destroyApplication(currentApp);
          if (app === currentApp) app = null;
          return;
        }

        currentApp.canvas.className = "fishing-dock-canvas__element";
        currentApp.canvas.setAttribute("aria-hidden", "true");
        host.prepend(currentApp.canvas);

        const [backgroundTexture, dialTexture, pointerTexture, glowTexture, ...frameTextures] = await Promise.all([
          Assets.load<Texture>(ASSETS.background),
          Assets.load<Texture>(ASSETS.dial),
          Assets.load<Texture>(ASSETS.pointer),
          Assets.load<Texture>(ASSETS.glow),
          ...ASSETS.frames.map((src) => Assets.load<Texture>(src)),
        ]);
        if (canceled || !app) return;

        const orderedFrameTextures = DUCK_FRAME_ORDER.map((n) => frameTextures[n - 1]);

        // Container hierarchy for camera scrolling
        const worldContainer = new Container();
        const background = new Sprite(backgroundTexture);
        const ambient = buildAmbient();
        const waterBody = new Graphics();
        const rearWave = new Graphics();
        const channel = new Graphics();
        const boatShadow = new Graphics();

        // Duck character sprite with 6 animation frames
        const characterContainer = new Container();
        const character = new AnimatedSprite(orderedFrameTextures);
        character.animationSpeed = 0;
        character.stop();
        character.anchor.set(0.5, 489 / 541);
        characterContainer.addChild(character);

        const frontWave = new Graphics();

        // Underwater gameplay elements
        const fishContainer = new Container();
        const hookGraphics = new Graphics();
        const lineGraphics = new Graphics();
        const textContainer = new Container();

        const gauge = new FishingPowerGauge({
          dial: dialTexture,
          pointer: pointerTexture,
          glow: glowTexture,
        }, GAUGE_BASE_SIZE, (result) => {
          if (!disabledRef.current) {
            callbackRef.current?.(result);
            startFishingLoop(result);
          }
        });
        ownedGauge = gauge;
        gaugeRef.current = gauge;

        const waterGradient = new FillGradient({
          type: "linear",
          start: { x: 0, y: 0 },
          end: { x: 0, y: 1 },
          textureSpace: "local",
          colorStops: [
            { offset: 0, color: 0x249ce7 },
            { offset: 0.2, color: 0x176fca },
            { offset: 0.5, color: 0x114686 },
            { offset: 0.8, color: 0x092650 },
            { offset: 1, color: 0x040e24 },
          ],
        });

        // Add to stage
        worldContainer.addChild(
          background,
          ambient.sky,
          waterBody,
          rearWave,
          channel,
          ambient.underwater,
          fishContainer,
          lineGraphics,
          hookGraphics,
          boatShadow,
          characterContainer,
          frontWave,
          textContainer,
          ambient.highlights,
        );

        currentApp.stage.addChild(worldContainer, gauge);

        // Gameplay state variables
        let fishingState: FishingState = "idle";
        let targetDepthMeters = INITIAL_MAX_DEPTH + depthLevelRef.current * DEPTH_UPGRADE_DELTA;
        let maxCapacityCount = INITIAL_CAPACITY + capacityLevelRef.current * 2;
        let currentHookX = activeLayout.gameplayAxisX;
        let currentHookY = activeLayout.waterlineY + 25;
        let targetHookX = activeLayout.gameplayAxisX;
        let cameraY = 0;
        let castPowerFactor = 1.0;
        let activeFishList: ActiveFish[] = [];
        let caughtFishList: ActiveFish[] = [];
        let floatingTextList: FloatingText[] = [];
        let nextFishId = 1;

        // Pointer tracking for steering during ascent
        handlePointerMoveListener = (e: PointerEvent) => {
          if (fishingState !== "ascending") return;
          const rect = currentApp.canvas.getBoundingClientRect();
          const scaleX = activeLayout.width / rect.width;
          const pointerX = (e.clientX - rect.left) * scaleX;
          const halfChannel = activeLayout.channelWidth * 0.48;
          targetHookX = Math.max(
            activeLayout.gameplayAxisX - halfChannel,
            Math.min(activeLayout.gameplayAxisX + halfChannel, pointerX)
          );
        };
        window.addEventListener("pointermove", handlePointerMoveListener);

        // Spawn initial fish pool
        const spawnFishPool = () => {
          // Clear old fish
          for (const f of activeFishList) {
            f.node.destroy();
          }
          activeFishList = [];

          const totalDepthPx = targetDepthMeters * 2.8;
          const numFish = Math.min(60, 20 + Math.floor(targetDepthMeters / 30));

          for (let i = 0; i < numFish; i++) {
            const depthRatio = Math.random();
            const depthMeters = depthRatio * targetDepthMeters;

            // Find matching fish kinds
            const matching = FISH_KINDS.filter(
              (k) => depthMeters >= k.depthMin && depthMeters <= k.depthMax
            );
            const kind = matching.length > 0
              ? matching[Math.floor(Math.random() * matching.length)]
              : FISH_KINDS[0];

            const node = new Graphics();
            drawFishShape(node, kind, kind.size);

            const startX = activeLayout.gameplayAxisX + (Math.random() - 0.5) * activeLayout.channelWidth * 0.9;
            const startY = activeLayout.waterlineY + 80 + depthRatio * totalDepthPx;
            const vx = (Math.random() > 0.5 ? 1 : -1) * (kind.speed * (0.8 + Math.random() * 0.4));

            node.position.set(startX, startY);
            node.scale.set(vx >= 0 ? 1 : -1, 1);
            fishContainer.addChild(node);

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
        };

        let castAnimTimer = 0;

        const startFishingLoop = (powerResult: PowerLockResult) => {
          if (fishingState !== "idle") return;
          targetDepthMeters = INITIAL_MAX_DEPTH + depthLevelRef.current * DEPTH_UPGRADE_DELTA;
          maxCapacityCount = INITIAL_CAPACITY + capacityLevelRef.current * 2;
          castPowerFactor = powerResult.power;
          fishingState = "casting";
          castAnimTimer = 0;
          gauge.setDisabled(true);

          for (const f of caughtFishList) { f.node.destroy(); }
          caughtFishList = [];
          for (const f of activeFishList) { f.node.destroy(); }
          activeFishList = [];
          for (const t of floatingTextList) { t.root.destroy(); }
          floatingTextList = [];

          spawnFishPool();
          gameAudio.play("click");
        };

        const spawnFloatingText = (text: string, color: string, x: number, y: number) => {
          const root = new Container();
          const label = new Text({
            text,
            style: {
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: 18,
              fontWeight: "800",
              fill: color,
              stroke: { color: "#ffffff", width: 3 },
            },
          });
          label.anchor.set(0.5);
          root.addChild(label);
          root.position.set(x, y);
          textContainer.addChild(root);

          floatingTextList.push({
            root,
            label,
            y,
            alpha: 1,
            age: 0,
            life: 1.2,
          });
        };

        const applyLayout = (nextLayout: DockViewportLayout) => {
          if (!app) return;
          activeLayout = nextLayout;
          app.renderer.resize(nextLayout.width, nextLayout.height);

          const backgroundScale = Math.max(
            nextLayout.width / BACKGROUND_SOURCE.width,
            nextLayout.waterlineY / BACKGROUND_SOURCE.waterlineY,
            (nextLayout.height - nextLayout.waterlineY)
              / (BACKGROUND_SOURCE.height - BACKGROUND_SOURCE.waterlineY),
          );
          background.scale.set(backgroundScale);
          background.position.set(
            (nextLayout.width - BACKGROUND_SOURCE.width * backgroundScale) / 2,
            nextLayout.waterlineY - BACKGROUND_SOURCE.waterlineY * backgroundScale,
          );

          const totalDepthPx = targetDepthMeters * 2.8 + nextLayout.height;
          waterBody.clear();
          waterBody
            .rect(
              0,
              nextLayout.waterlineY - 2,
              nextLayout.width,
              totalDepthPx,
            )
            .fill(waterGradient);
          waterBody.alpha = 0.85;

          drawWave(rearWave, nextLayout, {
            amplitude: 3.5,
            wavelength: 138,
            phase: 0.8,
            color: 0x79dfff,
            alpha: 0.07,
            strokeColor: 0xc8f8ff,
            strokeAlpha: 0.18,
          });
          drawChannel(channel, nextLayout, totalDepthPx);

          boatShadow.clear();
          boatShadow
            .ellipse(
              nextLayout.boatAnchor.x,
              nextLayout.waterlineY + 10,
              nextLayout.characterWidth * 0.29,
              Math.max(5, nextLayout.characterWidth * 0.026),
            )
            .fill({ color: 0x123b71, alpha: 0.22 });

          characterContainer.position.set(nextLayout.characterAnchor.x, 0); // y driven by bob in ticker
          const scaleFactor = nextLayout.characterWidth / DUCK_SOURCE.width;
          character.scale.set(-scaleFactor, scaleFactor);

          drawWave(frontWave, nextLayout, {
            amplitude: 5.5,
            wavelength: 104,
            phase: 0,
            color: 0x188ee0,
            alpha: 0.28,
            strokeColor: 0xd6fbff,
            strokeAlpha: 0.72,
            isFront: true,
          });

          gauge.position.set(nextLayout.playGaugeCenter.x, nextLayout.playGaugeCenter.y);
          gauge.scale.set(nextLayout.playGaugeSize / GAUGE_BASE_SIZE);

          for (const item of ambient.leaves) {
            item.node.position.set(nextLayout.width * item.xRatio, nextLayout.height * item.yRatio);
          }
          for (const item of ambient.bubbles) {
            item.node.position.set(nextLayout.width * item.xRatio, nextLayout.height * item.yRatio);
          }
          for (const item of ambient.sparkles) {
            item.node.position.set(nextLayout.width * item.xRatio, nextLayout.height * item.yRatio);
          }

          host.dataset.hookX = nextLayout.hook.x.toFixed(2);
          host.dataset.channelCenterX = nextLayout.gameplayAxisX.toFixed(2);
          host.dataset.gaugeCenterX = nextLayout.playGaugeCenter.x.toFixed(2);
          host.dataset.upgradeCenterX = nextLayout.upgradePanelCenter.x.toFixed(2);
        };

        const setDisabled = (nextDisabled: boolean) => {
          gauge.setDisabled(nextDisabled || fishingState !== "idle");
          host.classList.toggle("is-gauge-disabled", nextDisabled || fishingState !== "idle");
        };

        const updateProgression = (capLvl: number, depLvl: number) => {
          targetDepthMeters = INITIAL_MAX_DEPTH + depLvl * DEPTH_UPGRADE_DELTA;
          maxCapacityCount = INITIAL_CAPACITY + capLvl * 2;
        };

        ownedRuntime = { applyLayout, setDisabled, updateProgression };
        runtimeRef.current = ownedRuntime;
        applyLayout(layoutRef.current);
        setDisabled(disabledRef.current);
        currentApp.canvas.dataset.sceneReady = "true";
        host.classList.add("is-scene-ready");

        let elapsed = 0;
        currentApp.ticker.maxFPS = 60;
        currentApp.ticker.minFPS = 10;

        currentApp.ticker.add((ticker) => {
          const dt = Math.min(0.05, ticker.deltaMS / 1000);
          elapsed += dt;

          gauge.update(dt);
          gauge.visible = fishingState === "idle";

          // Boat idle sway — organic multi-harmonic wave bobbing
          const boatCycle = elapsed * (Math.PI * 2 / 1.8);
          const boatBob = Math.sin(boatCycle) * 3 + Math.sin(boatCycle * 2.2) * 0.8;
          const boatTilt = (Math.sin(boatCycle * 1.1) * 1.2 + Math.cos(boatCycle * 2.1) * 0.4) * (Math.PI / 180);
          characterContainer.y = activeLayout.characterAnchor.y + boatBob;
          characterContainer.rotation = boatTilt;
          boatShadow.alpha = 0.2 + Math.sin(boatCycle) * 0.04;

          if (fishingState === "casting") {
            castAnimTimer += dt;
            const CAST_DURATION = 0.55;
            const progress = Math.min(1, castAnimTimer / CAST_DURATION);
            const frameIdx = Math.min(
              orderedFrameTextures.length - 1,
              Math.floor(progress * orderedFrameTextures.length)
            );
            character.currentFrame = frameIdx;
            character.rotation = Math.sin(progress * Math.PI) * (-0.2);

            if (castAnimTimer >= CAST_DURATION) {
              fishingState = "descending";
              character.currentFrame = 0;
              character.rotation = 0;
            }
          } else {
            character.currentFrame = 0;
            character.rotation = 0;
          }

          rearWave.x = Math.sin(elapsed * 1.35) * 5;
          frontWave.x = Math.sin(elapsed * 1.75 + 0.8) * 7;

          // Ambient animations
          for (const item of ambient.leaves) {
            item.node.x = activeLayout.width * item.xRatio + Math.sin(elapsed * item.speed + item.phase) * 32;
            item.node.y = activeLayout.height * item.yRatio + Math.sin(elapsed * item.speed * 1.4 + item.phase) * 12;
            item.node.rotation += dt * item.speed;
          }
          for (const item of ambient.bubbles) {
            const underwaterHeight = activeLayout.height * 2;
            item.node.x = activeLayout.width * item.xRatio + Math.sin(elapsed + item.phase) * 7;
            item.node.y = activeLayout.waterlineY
              + underwaterHeight
              - ((elapsed * 35 * item.speed + item.phase * 38) % underwaterHeight);
            item.node.alpha = 0.28 + Math.sin(elapsed * 2 + item.phase) * 0.12;
          }

          // ---------- GAMEPLAY LOOP STATE MACHINE ----------
          const totalDepthPx = targetDepthMeters * 2.8;
          const scaleX = activeLayout.characterWidth / DUCK_SOURCE.width;
          const scaleY = activeLayout.characterHeight / DUCK_SOURCE.height;
          const rodTipX = activeLayout.characterAnchor.x - 76 * scaleX;
          const rodTipY = activeLayout.characterAnchor.y + boatBob - 360 * scaleY;

          if (fishingState === "idle") {
            currentHookX = activeLayout.gameplayAxisX;
            currentHookY = activeLayout.waterlineY + 25;
            targetHookX = activeLayout.gameplayAxisX;
            cameraY = 0;
          } else if (fishingState === "descending") {
            const plungeSpeed = (450 + targetDepthMeters * 0.8) * (0.85 + castPowerFactor * 0.3);
            currentHookY += plungeSpeed * dt;
            currentHookX += (activeLayout.gameplayAxisX - currentHookX) * 5 * dt;

            // Camera follows hook
            const targetCamY = Math.max(0, currentHookY - activeLayout.height * 0.45);
            cameraY += (targetCamY - cameraY) * 6 * dt;

            if (currentHookY >= activeLayout.waterlineY + totalDepthPx) {
              currentHookY = activeLayout.waterlineY + totalDepthPx;
              fishingState = "ascending";
            }
          } else if (fishingState === "ascending") {
            const reelSpeed = 220 + (caughtFishList.length >= maxCapacityCount ? 100 : 0);
            currentHookY -= reelSpeed * dt;
            currentHookX += (targetHookX - currentHookX) * 12 * dt;

            // Camera follows hook
            const targetCamY = Math.max(0, currentHookY - activeLayout.height * 0.45);
            cameraY += (targetCamY - cameraY) * 8 * dt;

            // Check collision with swimming fish
            if (caughtFishList.length < maxCapacityCount) {
              const hookRadius = 18;
              for (const fish of activeFishList) {
                if (fish.isCaught) continue;
                const dx = fish.x - currentHookX;
                const dy = fish.depthY - currentHookY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < hookRadius + fish.size * 0.8) {
                  fish.isCaught = true;
                  caughtFishList.push(fish);

                  if (fish.kind.isBad) {
                    gameAudio.play("fail");
                    spawnFloatingText(`${fish.kind.name}`, "#e84a4a", fish.x, fish.depthY);
                  } else {
                    gameAudio.play("buy");
                    recordDiscoveredFish([fish.kind.type]);
                    spawnFloatingText(`+${fish.kind.value}đ`, "#3ae874", fish.x, fish.depthY);
                  }

                  if (caughtFishList.length >= maxCapacityCount) {
                    spawnFloatingText("ĐẦY LƯỠI!", "#ffcf32", currentHookX, currentHookY - 30);
                  }
                  break;
                }
              }
            }

            if (currentHookY <= activeLayout.waterlineY + 25) {
              currentHookY = activeLayout.waterlineY + 25;
              fishingState = "surfacing";
            }
          } else if (fishingState === "surfacing") {
            currentHookX += (activeLayout.gameplayAxisX - currentHookX) * 10 * dt;
            cameraY += (0 - cameraY) * 10 * dt;

            if (Math.abs(cameraY) < 2) {
              cameraY = 0;
              worldContainer.position.y = 0;

              // Calculate payout & notify parent
              const totalEarned = caughtFishList.reduce((sum, f) => sum + (f.kind.isBad ? 0 : f.kind.value), 0);
              const caughtTypes = caughtFishList.filter((f) => !f.kind.isBad).map((f) => f.kind.type);

              gameAudio.play("sell");

              if (totalEarned > 0) {
                spawnFloatingText(`+${totalEarned.toLocaleString("vi-VN")}đ`, "#ffe32a", activeLayout.gameplayAxisX, activeLayout.waterlineY - 40);
              }

              catchCompleteRef.current?.({
                earned: totalEarned,
                caughtCount: caughtTypes.length,
                caughtFishTypes: caughtTypes,
              });

              // Clean up caught & active fish completely
              for (const f of caughtFishList) { f.node.destroy(); }
              caughtFishList = [];
              for (const f of activeFishList) { f.node.destroy(); }
              activeFishList = [];
              for (const t of floatingTextList) { t.root.destroy(); }
              floatingTextList = [];

              // Reset gauge so player can cast again
              gauge.reset();
              fishingState = "idle";
              gauge.setDisabled(disabledRef.current);
            }
          }

          // Update active fish swimming & caught positions
          const channelHalf = activeLayout.channelWidth * 0.45;
          const minX = activeLayout.gameplayAxisX - channelHalf;
          const maxX = activeLayout.gameplayAxisX + channelHalf;

          const CAUGHT_SLOTS = [
            { x: 0, y: 20 },
            { x: -16, y: 34 },
            { x: 16, y: 34 },
            { x: -24, y: 50 },
            { x: 24, y: 50 },
            { x: 0, y: 66 },
            { x: -18, y: 82 },
            { x: 18, y: 82 },
            { x: 0, y: 98 },
            { x: -20, y: 114 },
            { x: 20, y: 114 },
          ];

          for (const fish of activeFishList) {
            if (fish.isCaught) {
              // Attach to hook at structured slot position
              const index = caughtFishList.indexOf(fish);
              const slot = CAUGHT_SLOTS[Math.min(index, CAUGHT_SLOTS.length - 1)];
              const extraY = Math.floor(index / CAUGHT_SLOTS.length) * 45;
              fish.x = currentHookX + slot.x;
              fish.depthY = currentHookY + slot.y + extraY;
              fish.node.position.set(fish.x, fish.depthY);
              fish.node.scale.set((fish.vx >= 0 ? 0.55 : -0.55), 0.55);
              fish.node.rotation = (index % 2 === 0 ? 0.2 : -0.2);
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

          // Update floating text
          for (let i = floatingTextList.length - 1; i >= 0; i--) {
            const item = floatingTextList[i];
            item.age += dt;
            item.y -= 30 * dt;
            item.root.position.y = item.y;
            item.root.alpha = Math.max(0, 1 - item.age / item.life);
            if (item.age >= item.life) {
              item.root.destroy();
              floatingTextList.splice(i, 1);
            }
          }

          // Render fishing line & hook graphics
          lineGraphics.clear();
          hookGraphics.clear();

          // Apply camera Y translation to world container
          worldContainer.position.y = -cameraY;

          // Draw fishing line
          lineGraphics
            .moveTo(rodTipX, rodTipY)
            .bezierCurveTo(
              rodTipX,
              activeLayout.waterlineY - 10,
              currentHookX,
              activeLayout.waterlineY,
              currentHookX,
              currentHookY
            )
            .stroke({ color: 0xffffff, width: 2, alpha: 0.85 });

          // Draw hook metal J shape
          hookGraphics.position.set(currentHookX, currentHookY);
          hookGraphics
            .circle(0, 0, 6)
            .fill(0xd0e8ff)
            .moveTo(0, 0)
            .lineTo(0, 14)
            .arc( -5, 14, 5, 0, Math.PI )
            .lineTo(-10, 8)
            .stroke({ color: 0xd0e8ff, width: 3, cap: "round" });

          // Report state change to UI overlays
          const depthMeters = Math.max(0, Math.round((currentHookY - (activeLayout.waterlineY + 25)) / 2.8));
          const currentRunEarnings = caughtFishList.reduce((sum, f) => sum + (f.kind.isBad ? 0 : f.kind.value), 0);
          stateChangeRef.current?.(fishingState, depthMeters, Math.round(targetDepthMeters), maxCapacityCount, caughtFishList.length, currentRunEarnings);
        });
      } catch (reason) {
        if (!canceled) console.warn("Bến câu cá đang dùng lớp hiển thị tương thích", reason);
        destroyApplication(currentApp);
        if (app === currentApp) app = null;
        clearOwnedScene();
      }
    }

    void init();
    return () => {
      canceled = true;
      if (handlePointerMoveListener) {
        window.removeEventListener("pointermove", handlePointerMoveListener);
      }
      if (app && initialized) {
        destroyApplication(app);
        app = null;
      }
      clearOwnedScene();
    };
  }, []);

  return (
    <div className="fishing-dock-canvas" ref={hostRef}>
      <div className="fishing-dock-canvas__fallback" aria-hidden="true">
        <img className="fishing-dock-canvas__background" src={ASSETS.background} alt="" />
        <div className="fishing-dock-canvas__water">
          <span className="fishing-dock-canvas__channel" />
        </div>
        <div className="fishing-dock-canvas__rear-wave" />
        <div className="fishing-dock-canvas__sparkles">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
        <img className="fishing-dock-canvas__character" src={ASSETS.frames[0]} alt="" />
        <div className="fishing-dock-canvas__front-wave" />
        <div className="fishing-dock-canvas__fallback-guide" />
        <div className="fishing-dock-canvas__fallback-gauge">
          <img src={ASSETS.dial} alt="" />
          <img className="fishing-dock-canvas__fallback-pointer" src={ASSETS.pointer} alt="" />
        </div>
      </div>
      <button
        type="button"
        className="fishing-dock-canvas__gauge-button"
        onClick={() => {
          if (disabledRef.current) return;
          if (gaugeRef.current) {
            gaugeRef.current.lock();
            return;
          }
          const sweep = (performance.now() * 0.002) % (Math.PI * 2);
          const angle = sweep <= Math.PI ? sweep : Math.PI * 2 - sweep;
          callbackRef.current?.(powerResultAtAngle(angle));
        }}
        disabled={disabled}
        aria-label="Khóa lực câu và bắt đầu chơi"
      />
    </div>
  );
}

export type { PowerLockResult } from "./FishingPowerGauge";
