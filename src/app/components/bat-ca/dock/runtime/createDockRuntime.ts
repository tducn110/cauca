import { Application, Container, Sprite, Graphics, Text } from 'pixi.js';
import type { DockViewportLayout } from '../dockLayout';
import type { PowerLockResult } from '../FishingPowerGauge';
import type { CatchSummary, FishingState } from '../FishingDockCanvas';
import type { DockSceneRuntime, ActiveFish, FloatingText } from './runtimeTypes';
import { loadTexture, FISHING_DOCK_ASSETS, DUCK_ANIMATION_SOURCE, validateDuckFrameTextures, ROD_TIP_BY_FRAME } from './fishingAssets';
import { createLayoutApplicator, updateWaterSurface, sampleBoatWaveMotion } from './sceneLayout';
import { buildAmbient, updateAmbient } from './ambientRenderer';
import { buildCharacterNodes, updateCharacterAnimation } from './characterRenderer';
import type { CharacterNodes } from './characterRenderer';
import { createFishPool, updateFishPositions, destroyFishNodes } from './fishRenderer';
import { createCaptureController, tickCaptureState } from './captureController';
import { FishingPowerGauge } from '../FishingPowerGauge';
import { FISH_KINDS } from '../../game/fish-data';
import { DEPTH_UPGRADE_DELTA, INITIAL_CAPACITY, INITIAL_MAX_DEPTH } from '../../game/constants';
import { gameAudio } from '../../../../audio/audioManager';
import { recordDiscoveredFish } from '../../game/storage';
import { reportRuntimeError } from '../../../../observability/runtimeErrors';

export type RuntimeCallbacks = {
  disabledRef: { current: boolean };
  callbackRef: { current: ((r: PowerLockResult) => void) | undefined };
  catchCompleteRef: { current: (s: CatchSummary) => void };
  stateChangeRef: { current: ((state: FishingState, depthMeters: number, maxDepthMeters: number, capacity: number, caughtCount: number, runEarnings: number) => void) | undefined };
  capacityLevelRef: { current: number };
  depthLevelRef: { current: number };
};

export type DockSceneRuntimeInstance = DockSceneRuntime & { destroy: () => void };

export async function createDockRuntime(
  host: HTMLDivElement,
  initialLayout: DockViewportLayout,
  callbacks: RuntimeCallbacks,
  onFail: (reason: unknown, operation: string) => void,
  signal: { canceled: boolean }
): Promise<DockSceneRuntimeInstance | null> {
  const app = new Application();
  let destroyed = false;
  let tickerAdded = false;

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    try {
      if (app) app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
    } catch (error) {
      reportRuntimeError(error, {
        area: "createDockRuntime",
        operation: "destroyApplication",
        fatal: false,
      });
    }
  };

  try {
    await app.init({
      width: initialLayout.width,
      height: initialLayout.height,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      preference: ["webgl", "canvas"],
    });

    if (signal.canceled) {
      destroy();
      return null;
    }

    app.canvas.className = "fishing-dock-canvas__element";
    app.canvas.setAttribute("aria-hidden", "true");
    host.prepend(app.canvas);

    const [backgroundTexture, dialTexture, pointerTexture, glowTexture, ...frameTextures] = await Promise.all([
      loadTexture(FISHING_DOCK_ASSETS.background),
      loadTexture(FISHING_DOCK_ASSETS.dial),
      loadTexture(FISHING_DOCK_ASSETS.pointer),
      loadTexture(FISHING_DOCK_ASSETS.glow),
      ...FISHING_DOCK_ASSETS.frames.map((src) => loadTexture(src)),
    ]);

    if (signal.canceled) {
      destroy();
      return null;
    }

    validateDuckFrameTextures(frameTextures);

    const worldContainer = new Container();
    const background = new Sprite(backgroundTexture);
    const ambient = buildAmbient();
    const waterBody = new Graphics();
    const rearWave = new Graphics();
    const channel = new Graphics();
    const leftBank = new Graphics();
    const rightBank = new Graphics();
    const boatShadow = new Graphics();

    // Build boatRoot → boatBob → sprite hierarchy.
    // boatRoot: world position (set only by layout applicator)
    // boatBob:  local Y and rotation (set only by characterRenderer)
    // sprite:   AnimatedSprite with anchor at hull bottom, local pos always (0,0)
    const charNodes: CharacterNodes = buildCharacterNodes(frameTextures);
    charNodes.boatShadow = boatShadow; // attach shadow reference for alpha control
    const { boatRoot } = charNodes;


    const frontWave = new Graphics();
    const frontWaveMask = new Graphics();
    frontWave.mask = frontWaveMask;
    const fishingLine = new Graphics();
    const hookGraphic = new Graphics();
    hookGraphic.moveTo(0, 0).lineTo(0, 10).bezierCurveTo(0, 16, -6, 16, -6, 10).lineTo(-4, 12).stroke({ color: 0xcccccc, width: 2.5 });
    
    const fishContainer = new Container();
    const textContainer = new Container();

    let activeFishList: ActiveFish[] = [];
    let caughtFishList: ActiveFish[] = [];
    let floatingTextList: FloatingText[] = [];

    let lastShownMilestone = 0;
    let milestoneTimer = 0;
    let payoutTimer = 0;

    const destroyFloatingTexts = () => {
      const roots = new Set(floatingTextList.map((item) => item.root));
      for (const root of roots) {
        try {
          if (!root.destroyed) root.destroy();
        } catch (error) {
          reportRuntimeError(error, {
            area: "createDockRuntime",
            operation: "destroyFloatingText",
            fatal: false,
          });
        }
      }
      floatingTextList = [];
    };

    const state = createCaptureController(initialLayout);

    const gauge = new FishingPowerGauge({
      dial: dialTexture,
      pointer: pointerTexture,
      glow: glowTexture,
    }, 112, (result) => {
      if (!callbacks.disabledRef.current) {
        try {
          callbacks.callbackRef.current?.(result);
        } catch (error) {
          reportRuntimeError(error, { area: "createDockRuntime", operation: "onPowerLock", fatal: false });
        }
        if (state.fishingState === "idle") {
          state.targetDepthMeters = INITIAL_MAX_DEPTH + callbacks.depthLevelRef.current * DEPTH_UPGRADE_DELTA;
          state.maxCapacityCount = INITIAL_CAPACITY + callbacks.capacityLevelRef.current * 2;
          state.castPowerFactor = result.power;
          state.fishingState = "casting";
          state.castAnimTimer = 0;
          gauge.setDisabled(true);

          destroyFishNodes(activeFishList, caughtFishList, (e, op) => reportRuntimeError(e, { area: "createDockRuntime", operation: op, fatal: false }));
          activeFishList = [];
          caughtFishList = [];
          destroyFloatingTexts();

          lastShownMilestone = 0;
          milestoneTimer = 0;
          payoutTimer = 0;
          depthMilestoneLabel.alpha = 0;
          hookGraphic.alpha = 1;

          activeFishList = createFishPool({
            targetDepthMeters: state.targetDepthMeters,
            layout: initialLayout,
            fishKinds: FISH_KINDS,
            fishContainer
          });

          Promise.resolve(gameAudio.play("click")).catch(err => reportRuntimeError(err, { area: "createDockRuntime", operation: "playAudio", fatal: false }));
        }
      }
    });

    const uiContainer = new Container();
    const depthMilestoneLabel = new Text({
      text: "",
      style: {
        fontFamily: "'Be Vietnam Pro', sans-serif",
        fontSize: 32,
        fontWeight: "900",
        fill: 0xffffff,
        stroke: { color: 0x0a4a9a, width: 4 },
      }
    });
    depthMilestoneLabel.anchor.set(0, 0.5);
    depthMilestoneLabel.alpha = 0;
    uiContainer.addChild(depthMilestoneLabel);

    worldContainer.addChild(
      background,
      ambient.sky,
      waterBody,
      channel,
      rearWave,
      leftBank,
      rightBank,
      ambient.underwater,
      fishContainer,
      boatShadow,
      fishingLine,
      boatRoot,
      frontWave,
      frontWaveMask,
      hookGraphic,
      textContainer,
    );

    app.stage.addChild(worldContainer, uiContainer, gauge);

    const layoutApplicator = createLayoutApplicator(app, {
      background, waterBody, rearWave, frontWave, frontWaveMask, channel, leftBank, rightBank, boatShadow,
      boatRoot,
      sprite: charNodes.sprite,
      targetDepthMeters: () => INITIAL_MAX_DEPTH + callbacks.depthLevelRef.current * DEPTH_UPGRADE_DELTA
    }, gauge, ambient, host);

    let activeLayout = initialLayout;

    const applyLayout = (layout: DockViewportLayout) => {
      if (signal.canceled || destroyed) return;
      activeLayout = layout;
      layoutApplicator(layout);

      depthMilestoneLabel.style.fontSize = layout.compact ? 24 : 32;
      let milestoneX = layout.gameplayAxisX + layout.channelWidth / 2 + 25;
      depthMilestoneLabel.anchor.set(0, 0.5);
      if (milestoneX + 100 > layout.width) {
        depthMilestoneLabel.anchor.set(1, 0.5);
        milestoneX = layout.width - 20;
      }
      depthMilestoneLabel.position.set(milestoneX, layout.height * 0.35);
    };

    const setDisabled = (nextDisabled: boolean) => {
      if (signal.canceled || destroyed) return;
      gauge.setDisabled(nextDisabled || state.fishingState !== "idle");
      host.classList.toggle("is-gauge-disabled", nextDisabled || state.fishingState !== "idle");
    };

    const updateProgression = (capLvl: number, depLvl: number) => {
      if (signal.canceled || destroyed) return;
      state.targetDepthMeters = INITIAL_MAX_DEPTH + depLvl * DEPTH_UPGRADE_DELTA;
      state.maxCapacityCount = INITIAL_CAPACITY + capLvl * 2;
      // Water body, channel and ground banks are sized from the target depth —
      // re-run the layout applicator so a deeper upgrade never out-swims them.
      layoutApplicator(activeLayout);
    };

    const spawnFloatingText = (text: string, color: string, x: number, y: number) => {
      const root = new Container();
      const label = new Text({
        text,
        style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 18, fontWeight: "800", fill: color, stroke: { color: "#ffffff", width: 3 } },
      });
      label.anchor.set(0.5);
      root.addChild(label);
      root.position.set(x, y);
      textContainer.addChild(root);

      floatingTextList.push({ root, label, y, alpha: 1, age: 0, life: 1.2 });
    };

    const handlePointerMoveListener = (e: PointerEvent) => {
      if (state.fishingState !== "ascending") return;
      const rect = app.canvas.getBoundingClientRect();
      if (rect.width <= 0 || !Number.isFinite(rect.width)) return;
      const scaleX = activeLayout.width / rect.width;
      const pointerX = (e.clientX - rect.left) * scaleX;
      const halfChannel = activeLayout.channelWidth * 0.48;
      state.targetCaptureX = Math.max(
        activeLayout.gameplayAxisX - halfChannel,
        Math.min(activeLayout.gameplayAxisX + halfChannel, pointerX)
      );
    };
    window.addEventListener("pointermove", handlePointerMoveListener);

    const runtimeDestroy = () => {
      window.removeEventListener("pointermove", handlePointerMoveListener);
      // Kill GSAP boat-float tweens before destroying the PixiJS scene.
      charNodes.stopGsap?.();
      destroy();
    };

    let elapsed = 0;
    let stateReportElapsed = Number.POSITIVE_INFINITY;
    let lastReportedState: FishingState | null = null;
    let lastReportedCaughtCount = -1;
    let lastReportedRunEarnings = -1;

    app.ticker.maxFPS = 60;
    app.ticker.minFPS = 10;

    if (!tickerAdded) {
      tickerAdded = true;
      app.ticker.add((ticker) => {
        if (signal.canceled || destroyed) return;
        try {
          const dt = Math.min(0.05, ticker.deltaMS / 1000);
          elapsed += dt;
          stateReportElapsed += dt;

          gauge.update(dt);
          gauge.visible = state.fishingState === "idle";

          // Animate the water surface, then make the boat ride the same wave
          // that is drawn under its hull (bob follows height, tilt follows slope).
          updateWaterSurface({ rearWave, frontWave }, activeLayout, elapsed);
          const boatWaveMotion = sampleBoatWaveMotion(activeLayout.boatAnchor.x, elapsed);

          updateCharacterAnimation(
            charNodes, state.fishingState, state.castAnimTimer, elapsed, boatWaveMotion
          );

          const frame = charNodes.sprite.currentFrame;
          const marker = ROD_TIP_BY_FRAME[frame];

          const scaleX = charNodes.sprite.scale.x;
          const scaleY = charNodes.sprite.scale.y;
          const localX = (marker.x - DUCK_ANIMATION_SOURCE.width * DUCK_ANIMATION_SOURCE.anchorX) * scaleX;
          const localY = (marker.y - DUCK_ANIMATION_SOURCE.height * DUCK_ANIMATION_SOURCE.anchorY) * scaleY;
          
          const cosT = Math.cos(charNodes.boatBob.rotation);
          const sinT = Math.sin(charNodes.boatBob.rotation);
          
          const rodTipWorldX = charNodes.boatRoot.x + charNodes.boatBob.x + localX * cosT - localY * sinT;
          const rodTipWorldY = charNodes.boatRoot.y + charNodes.boatBob.y + localX * sinT + localY * cosT;

          let hookWorldX, hookWorldY;
          if (state.fishingState === "idle") {
            hookWorldX = state.capturePointX;
            hookWorldY = state.capturePointY;
          } else if (state.fishingState === "casting") {
            const progress = state.castAnimTimer / DUCK_ANIMATION_SOURCE.castDurationSeconds;
            if (progress < 0.65) {
               hookWorldX = rodTipWorldX;
               hookWorldY = rodTipWorldY;
            } else {
               const t = (progress - 0.65) / 0.35;
               hookWorldX = rodTipWorldX + (state.capturePointX - rodTipWorldX) * t;
               hookWorldY = rodTipWorldY + (state.capturePointY - rodTipWorldY) * t;
            }
          } else if (state.fishingState === "surfaceBurst" || state.fishingState === "payout") {
            hookWorldX = state.capturePointX;
            hookWorldY = state.capturePointY;
          } else {
            hookWorldX = state.capturePointX;
            hookWorldY = state.capturePointY;
          }

          // Hook visibility: fade out during surfaceBurst and payout
          if (state.fishingState === "surfaceBurst" || state.fishingState === "payout") {
            hookGraphic.alpha = Math.max(0, hookGraphic.alpha - 5 * dt);
          } else {
            hookGraphic.alpha = 1;
          }
          hookGraphic.position.set(hookWorldX, hookWorldY);

          // Fishing line: only draw during idle/casting/descending/ascending
          fishingLine.clear();
          if (state.fishingState !== "surfaceBurst" && state.fishingState !== "payout") {
            fishingLine.moveTo(rodTipWorldX, rodTipWorldY);
            if (state.fishingState === "idle") {
              fishingLine.quadraticCurveTo(rodTipWorldX, hookWorldY, hookWorldX, hookWorldY);
            } else {
              fishingLine.lineTo(hookWorldX, hookWorldY);
            }
            fishingLine.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
          }

          if (state.fishingState === "casting") {
            state.castAnimTimer += dt;
            if (state.castAnimTimer >= DUCK_ANIMATION_SOURCE.castDurationSeconds) {
              state.fishingState = "descending";
              charNodes.sprite.currentFrame = 0;
            }
          }

          updateAmbient(ambient, activeLayout, elapsed);

          tickCaptureState(state, dt, activeLayout, activeFishList, caughtFishList, {
            onFishCaught: (fish) => {
              caughtFishList.push(fish);
              if (fish.kind.isBad) {
                Promise.resolve(gameAudio.play("fail")).catch(err => reportRuntimeError(err, { area: "createDockRuntime", operation: "playAudio", fatal: false }));
                spawnFloatingText(`${fish.kind.name}`, "#e84a4a", fish.x, fish.depthY);
              } else {
                recordDiscoveredFish([fish.kind.type]);
              }
            },
            onCapacityFull: (x, y) => {
              spawnFloatingText("ĐẦY LƯỠI!", "#ffcf32", x, y);
            }
          });

          // ── DEPTH MILESTONE ── Only in descending, popup at 500m intervals
          if (state.fishingState === "descending") {
            const currentDepthM = Math.max(0, Math.round((state.capturePointY - (activeLayout.waterlineY + 25)) / 2.8));
            const currentMilestone = Math.floor(currentDepthM / 500) * 500;
            if (currentMilestone > lastShownMilestone && currentMilestone > 0) {
              lastShownMilestone = currentMilestone;
              milestoneTimer = 0;
              depthMilestoneLabel.text = `${currentMilestone}m`;
              depthMilestoneLabel.alpha = 1;
            }
          }
          // Milestone fade: hold 0.5s then fade 0.4s. Quick fade in ascending.
          if (depthMilestoneLabel.alpha > 0) {
            milestoneTimer += dt;
            if (state.fishingState !== "descending") {
              depthMilestoneLabel.alpha = Math.max(0, depthMilestoneLabel.alpha - 5 * dt);
            } else if (milestoneTimer > 0.5) {
              depthMilestoneLabel.alpha = Math.max(0, 1 - (milestoneTimer - 0.5) / 0.4);
            }
          }

          if (state.fishingState === "payout") {
            payoutTimer += dt;
            const staggerDelay = 0.05; // 50ms between each fish
            const fishAnimDuration = 0.4;

            const goodFish = caughtFishList.filter((f) => !f.kind.isBad);

            for (let i = 0; i < goodFish.length; i++) {
              const fish = goodFish[i];
              const fishDelay = i * staggerDelay;
              const fishAge = payoutTimer - fishDelay;

              if (fishAge > 0) {
                if (!fish.payoutStarted) {
                  fish.payoutStarted = true;
                  // Pop up gently near the waterline — NOT thrown sideways
                  fish.vx = (Math.random() - 0.5) * 25;
                  fish.depthY = activeLayout.waterlineY - 5 - Math.random() * 8;
                  fish.node.position.set(fish.x, fish.depthY);
                  spawnFloatingText(`+${fish.kind.value}đ`, "#3ae874", fish.x, fish.depthY - 12);
                  Promise.resolve(gameAudio.play("buy")).catch(() => {});
                }
                const progress = Math.min(1, fishAge / fishAnimDuration);
                fish.x += fish.vx * dt;
                fish.depthY -= 20 * dt; // gentle rise
                fish.node.position.set(fish.x, fish.depthY);
                fish.node.alpha = Math.max(0, 1 - progress);
                const s = 0.6 * (1 - progress * 0.5);
                fish.node.scale.set(fish.vx >= 0 ? s : -s, s);
                fish.node.rotation = Math.sin(fishAge * 6) * 0.08;
              }
            }

            // Bad fish just fade quickly
            for (const fish of caughtFishList) {
              if (!fish.kind.isBad) continue;
              if (!fish.payoutStarted) fish.payoutStarted = true;
              fish.node.alpha = Math.max(0, fish.node.alpha - 3 * dt);
            }

            // After all fish animated + 150ms gap, fire result ONCE
            const totalPayoutTime = goodFish.length * staggerDelay + fishAnimDuration + 0.15;
            if (payoutTimer >= totalPayoutTime && !state.resultFired) {
              state.resultFired = true;
              const totalEarned = caughtFishList.reduce((s, f) => s + (f.kind.isBad ? 0 : f.kind.value), 0);
              const caughtTypes = caughtFishList.filter((f) => !f.kind.isBad).map((f) => f.kind.type);

              Promise.resolve(gameAudio.play("sell")).catch(err => reportRuntimeError(err, { area: "createDockRuntime", operation: "playAudio", fatal: false }));

              if (totalEarned > 0) {
                spawnFloatingText(`+${totalEarned.toLocaleString("vi-VN")}đ`, "#ffe32a", activeLayout.gameplayAxisX, activeLayout.waterlineY - 40);
              }

              try {
                callbacks.catchCompleteRef.current?.({ earned: totalEarned, caughtCount: caughtTypes.length, caughtFishTypes: caughtTypes });
              } catch (error) {
                reportRuntimeError(error, { area: "createDockRuntime", operation: "onCatchComplete", fatal: false });
              }

              destroyFishNodes(activeFishList, caughtFishList, (e, op) => reportRuntimeError(e, { area: "createDockRuntime", operation: op, fatal: false }));
              activeFishList = [];
              caughtFishList = [];
              destroyFloatingTexts();

              gauge.reset();
              state.fishingState = "idle";
              gauge.setDisabled(callbacks.disabledRef.current);
              // Suppress stateChange for this transition so React keeps the result overlay
              lastReportedState = "idle";
            }
          }

          updateFishPositions(activeFishList, caughtFishList, state.capturePointX, state.capturePointY, { ...activeLayout, __fishingState: state.fishingState } as any, dt);

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

          worldContainer.position.y = -state.cameraY;

          const depthMeters = Math.max(0, Math.round((state.capturePointY - (activeLayout.waterlineY + 25)) / 2.8));

          if (state.fishingState === "descending") {
            const currentMilestone = Math.floor(depthMeters / 50) * 50;
            if (currentMilestone > 0 && currentMilestone > lastShownMilestone) {
              lastShownMilestone = currentMilestone;
              depthMilestoneLabel.text = `${currentMilestone}m`;
              milestoneTimer = 1.1; // 0.7s show + 0.4s fade
            }
          }

          if (milestoneTimer > 0) {
            milestoneTimer -= dt;
            if (milestoneTimer <= 0) {
              milestoneTimer = 0;
              depthMilestoneLabel.alpha = 0;
            } else {
              if (milestoneTimer > 0.4) {
                depthMilestoneLabel.alpha = 1;
                let scale = 1.0;
                if (milestoneTimer > 0.9) {
                  const sp = (1.1 - milestoneTimer) / 0.2;
                  scale = 0.85 + 0.15 * sp;
                }
                depthMilestoneLabel.scale.set(scale);
              } else {
                depthMilestoneLabel.alpha = milestoneTimer / 0.4;
                depthMilestoneLabel.scale.set(1.0);
              }
            }
          }

          const currentRunEarnings = caughtFishList.reduce((sum, f) => sum + (f.kind.isBad ? 0 : f.kind.value), 0);
          const stateChanged = state.fishingState !== lastReportedState;
          
          if (stateChanged && state.fishingState === "ascending") {
            Promise.resolve(gameAudio.play("level")).catch(() => {});
          }

          const catchChanged = caughtFishList.length !== lastReportedCaughtCount;
          const earningsChanged = currentRunEarnings !== lastReportedRunEarnings;

          if (stateChanged || catchChanged || earningsChanged || stateReportElapsed >= 0.1) {
            try {
              callbacks.stateChangeRef.current?.(
                state.fishingState, depthMeters, Math.round(state.targetDepthMeters), state.maxCapacityCount, caughtFishList.length, currentRunEarnings
              );
            } catch (error) {
              reportRuntimeError(error, { area: "createDockRuntime", operation: "onStateChange", fatal: false });
            }
            stateReportElapsed = 0;
            lastReportedState = state.fishingState;
            lastReportedCaughtCount = caughtFishList.length;
            lastReportedRunEarnings = currentRunEarnings;
          }
        } catch (error) {
          onFail(error, "ticker");
        }
      });
    }

    applyLayout(initialLayout);
    setDisabled(callbacks.disabledRef.current);
    app.canvas.dataset.sceneReady = "true";
    host.classList.add("is-scene-ready");

    const lockGauge = () => {
      if (!signal.canceled && !destroyed && !callbacks.disabledRef.current && gauge) {
        gauge.lock();
      }
    };

    return { applyLayout, setDisabled, updateProgression, lockGauge, destroy: runtimeDestroy };
  } catch (error) {
    onFail(error, "init");
    destroy();
    return null;
  }
}
