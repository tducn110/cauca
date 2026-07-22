import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Application,
  Assets,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  type Texture,
} from "pixi.js";
import { FishingPowerGauge, powerResultAtAngle, type PowerLockResult } from "./FishingPowerGauge";
import type { DockViewportLayout } from "./dockLayout";
import "./fishing-dock-scene.css";

const GAUGE_BASE_SIZE = 112;
const BACKGROUND_SOURCE = { width: 1448, height: 1086, waterlineY: 477 } as const;

const ASSETS = {
  background: "/assets/fishing/background.png",
  character: "/assets/fishing/character.png",
  dial: "/assets/fishing/gauge/dial_base.png",
  pointer: "/assets/fishing/gauge/pointer.png",
  glow: "/assets/fishing/gauge/max_glow.png",
} as const;

type Props = {
  layout: DockViewportLayout;
  onPowerLock: (result: PowerLockResult) => void;
  disabled?: boolean;
};

type AmbientNode = {
  node: Graphics;
  xRatio: number;
  yRatio: number;
  speed: number;
  phase: number;
};

type DockSceneRuntime = {
  applyLayout: (layout: DockViewportLayout) => void;
  setDisabled: (disabled: boolean) => void;
};

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
  graphics
    .lineTo(endX + step, layout.height + 8)
    .lineTo(startX, layout.height + 8)
    .closePath()
    .fill({ color: options.color, alpha: options.alpha })
    .stroke({ color: options.strokeColor, width: 2, alpha: options.strokeAlpha });
}

function drawChannel(graphics: Graphics, layout: DockViewportLayout): void {
  const { gameplayAxisX: axisX, waterlineY, channelWidth, height } = layout;
  const half = channelWidth / 2;
  const top = waterlineY - 5;
  const bottom = height + 12;
  const depth = bottom - top;

  graphics.clear();
  graphics
    .moveTo(axisX - half * 0.42, top)
    .bezierCurveTo(
      axisX - half * 0.56,
      top + depth * 0.23,
      axisX - half * 0.44,
      top + depth * 0.48,
      axisX - half * 0.66,
      bottom,
    )
    .lineTo(axisX + half * 0.68, bottom)
    .bezierCurveTo(
      axisX + half * 0.45,
      top + depth * 0.7,
      axisX + half * 0.57,
      top + depth * 0.27,
      axisX + half * 0.42,
      top,
    )
    .closePath()
    .fill({ color: 0x27a7ff, alpha: 0.26 });

  graphics
    .moveTo(axisX - half * 0.23, top + 7)
    .bezierCurveTo(
      axisX - half * 0.34,
      top + depth * 0.33,
      axisX - half * 0.25,
      top + depth * 0.66,
      axisX - half * 0.38,
      bottom,
    )
    .lineTo(axisX + half * 0.4, bottom)
    .bezierCurveTo(
      axisX + half * 0.25,
      top + depth * 0.65,
      axisX + half * 0.34,
      top + depth * 0.3,
      axisX + half * 0.23,
      top + 7,
    )
    .closePath()
    .fill({ color: 0x58c7ff, alpha: 0.12 });
}

function drawFishingGuide(graphics: Graphics, layout: DockViewportLayout): void {
  const gaugeTop = layout.playGaugeCenter.y - layout.playGaugeSize * 0.46;
  const surfaceY = layout.waterlineY;
  graphics.clear();
  graphics
    .moveTo(layout.hook.x, layout.hook.y + 4)
    .bezierCurveTo(
      layout.hook.x - 2,
      surfaceY - 4,
      layout.gameplayAxisX + 2,
      surfaceY + 10,
      layout.gameplayAxisX,
      gaugeTop,
    )
    .stroke({ color: 0xe7fbff, width: 2, alpha: 0.76, cap: "round" });
  graphics
    .ellipse(layout.gameplayAxisX, surfaceY + 1, 12, 3.5)
    .stroke({ color: 0xc9f7ff, width: 2, alpha: 0.64 });
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

  for (let index = 0; index < 12; index++) {
    const radius = 2 + index % 3;
    const node = new Graphics()
      .circle(0, 0, radius)
      .stroke({ color: 0xcdf6ff, width: 1.4, alpha: 0.5 });
    const item = {
      node,
      xRatio: 0.08 + index * 0.078,
      yRatio: 0.62 + (index % 4) * 0.07,
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

export function FishingDockCanvas({ layout, onPowerLock, disabled = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<FishingPowerGauge | null>(null);
  const runtimeRef = useRef<DockSceneRuntime | null>(null);
  const layoutRef = useRef(layout);
  const callbackRef = useRef(onPowerLock);
  const disabledRef = useRef(disabled);
  const fallbackStartedAtRef = useRef(performance.now());
  const fallbackLockedRef = useRef(false);
  layoutRef.current = layout;
  callbackRef.current = onPowerLock;
  disabledRef.current = disabled;

  useLayoutEffect(() => {
    runtimeRef.current?.applyLayout(layout);
  }, [layout]);

  useEffect(() => {
    runtimeRef.current?.setDisabled(disabled);
  }, [disabled]);

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
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    motionPreference.addEventListener("change", onMotionPreferenceChange);

    const destroyApplication = (target: Application) => {
      if (destroyed) return;
      destroyed = true;
      try {
        target.destroy({ removeView: true }, { children: true });
      } catch {
        try {
          target.stage.destroy({ children: true });
        } catch {
          // Pixi may fail before either renderer or stage ownership exists.
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

        const [backgroundTexture, characterTexture, dialTexture, pointerTexture, glowTexture] = await Promise.all([
          Assets.load<Texture>(ASSETS.background),
          Assets.load<Texture>(ASSETS.character),
          Assets.load<Texture>(ASSETS.dial),
          Assets.load<Texture>(ASSETS.pointer),
          Assets.load<Texture>(ASSETS.glow),
        ]);
        if (canceled || !app) return;

        const background = new Sprite(backgroundTexture);
        const ambient = buildAmbient();
        const waterBody = new Graphics();
        const rearWave = new Graphics();
        const channel = new Graphics();
        const boatShadow = new Graphics();
        const character = new Sprite(characterTexture);
        character.anchor.set(0.5, 1);
        const frontWave = new Graphics();
        const fishingGuide = new Graphics();
        const gauge = new FishingPowerGauge({
          dial: dialTexture,
          pointer: pointerTexture,
          glow: glowTexture,
        }, GAUGE_BASE_SIZE, (result) => {
          if (!disabledRef.current) callbackRef.current(result);
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
            { offset: 0.4, color: 0x176fca },
            { offset: 0.72, color: 0x17519a },
            { offset: 1, color: 0x102e68 },
          ],
        });

        // Sibling order is the rendering contract: the front wave sits after
        // the boat to submerge its hull, while the guide and gauge stay clear.
        currentApp.stage.addChild(
          background,
          ambient.sky,
          waterBody,
          rearWave,
          channel,
          ambient.underwater,
          boatShadow,
          character,
          frontWave,
          fishingGuide,
          ambient.highlights,
          gauge,
        );

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

          waterBody.clear();
          waterBody
            .rect(
              0,
              nextLayout.waterlineY - 2,
              nextLayout.width,
              nextLayout.height - nextLayout.waterlineY + 2,
            )
            .fill(waterGradient);
          waterBody.alpha = 0.48;

          drawWave(rearWave, nextLayout, {
            amplitude: 3.5,
            wavelength: 138,
            phase: 0.8,
            color: 0x79dfff,
            alpha: 0.07,
            strokeColor: 0xc8f8ff,
            strokeAlpha: 0.18,
          });
          drawChannel(channel, nextLayout);

          boatShadow.clear();
          boatShadow
            .ellipse(
              nextLayout.boatAnchor.x,
              nextLayout.waterlineY + 10,
              nextLayout.characterWidth * 0.29,
              Math.max(5, nextLayout.characterWidth * 0.026),
            )
            .fill({ color: 0x123b71, alpha: 0.22 });

          character.position.set(nextLayout.characterAnchor.x, nextLayout.characterAnchor.y);
          character.width = nextLayout.characterWidth;
          character.height = nextLayout.characterHeight;
          character.scale.x = -Math.abs(character.scale.x);

          drawWave(frontWave, nextLayout, {
            amplitude: 5.5,
            wavelength: 104,
            phase: 0,
            color: 0x188ee0,
            alpha: 0.28,
            strokeColor: 0xd6fbff,
            strokeAlpha: 0.72,
          });
          drawFishingGuide(fishingGuide, nextLayout);

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
          gauge.setDisabled(nextDisabled);
          host.classList.toggle("is-gauge-disabled", nextDisabled);
        };

        ownedRuntime = { applyLayout, setDisabled };
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
          gauge.update(dt);
          if (reducedMotion) {
            character.position.set(activeLayout.characterAnchor.x, activeLayout.characterAnchor.y);
            character.rotation = 0;
            rearWave.x = 0;
            frontWave.x = 0;
            return;
          }

          elapsed += dt;
          const boatCycle = elapsed * (Math.PI * 2 / 3.2);
          character.y = activeLayout.characterAnchor.y + Math.sin(boatCycle) * 3.2;
          character.rotation = Math.sin(boatCycle) * 0.009;
          boatShadow.alpha = 0.18 + Math.sin(boatCycle) * 0.025;
          rearWave.x = Math.sin(elapsed * 1.35) * 5;
          frontWave.x = Math.sin(elapsed * 1.75 + 0.8) * 7;

          for (const item of ambient.leaves) {
            item.node.x = activeLayout.width * item.xRatio + Math.sin(elapsed * item.speed + item.phase) * 32;
            item.node.y = activeLayout.height * item.yRatio + Math.sin(elapsed * item.speed * 1.4 + item.phase) * 12;
            item.node.rotation += dt * item.speed;
          }
          for (const item of ambient.bubbles) {
            const underwaterHeight = Math.max(1, activeLayout.height - activeLayout.waterlineY);
            item.node.x = activeLayout.width * item.xRatio + Math.sin(elapsed + item.phase) * 7;
            item.node.y = activeLayout.waterlineY
              + underwaterHeight
              - ((elapsed * 28 * item.speed + item.phase * 38) % underwaterHeight);
            item.node.alpha = 0.28 + Math.sin(elapsed * 2 + item.phase) * 0.12;
          }
          for (const item of ambient.sparkles) {
            const pulse = 0.58 + Math.sin(elapsed * 3.2 + item.phase) * 0.26;
            item.node.position.set(activeLayout.width * item.xRatio, activeLayout.height * item.yRatio);
            item.node.scale.set(pulse);
            item.node.alpha = pulse;
          }
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
      motionPreference.removeEventListener("change", onMotionPreferenceChange);
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
        <img className="fishing-dock-canvas__character" src={ASSETS.character} alt="" />
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
          if (fallbackLockedRef.current) return;
          fallbackLockedRef.current = true;
          const elapsedSeconds = (performance.now() - fallbackStartedAtRef.current) / 1_000;
          const sweep = (elapsedSeconds * 2.15) % (Math.PI * 2);
          const angle = sweep <= Math.PI ? sweep : Math.PI * 2 - sweep;
          callbackRef.current(powerResultAtAngle(angle));
        }}
        disabled={disabled}
        aria-label="Khóa lực câu và bắt đầu chơi"
      />
    </div>
  );
}

export type { PowerLockResult } from "./FishingPowerGauge";
