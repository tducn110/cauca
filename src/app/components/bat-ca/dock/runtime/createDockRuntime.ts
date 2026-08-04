import { Application, Container, Sprite, Graphics, Text } from 'pixi.js';
import type { DockViewportLayout } from '../dockLayout';
import type { PowerLockResult } from '../FishingPowerGauge';
import type { CatchSummary, FishingState } from '../FishingDockCanvas';
import type { DockSceneRuntime, ActiveFish, FloatingText } from './runtimeTypes';
import { loadTexture, FISHING_DOCK_ASSETS, DUCK_ANIMATION_SOURCE, validateDuckFrameTextures, ROD_TIP_BY_FRAME, HOOK_ASSET_METADATA } from './fishingAssets';
import { createLayoutApplicator, updateWaterSurface, sampleBoatWaveMotion } from './sceneLayout';
import { buildAmbient, updateAmbient } from './ambientRenderer';
import { buildCharacterNodes, updateCharacterAnimation } from './characterRenderer';
import type { CharacterNodes } from './characterRenderer';
import { createFishPool, updateFishPositions, destroyFishNodes } from './fishRenderer';
import { createCaptureController, tickCaptureState } from './captureController';
import { FishingPowerGauge } from '../FishingPowerGauge';
import { FISH_KINDS } from '../../game/fish-data';
import {
  CAPACITY_UPGRADE_DELTA,
  DEPTH_UPGRADE_DELTA,
  INITIAL_CAPACITY,
  INITIAL_MAX_DEPTH,
} from '../../game/constants';
import { gameAudio } from '../../../../audio/audioManager';
import { recordDiscoveredFish } from '../../game/storage';
import { reportRuntimeError } from '../../../../observability/runtimeErrors';
import { HOOK_DEFINITIONS, getHookDefinition } from '../../game/hooks-data';

export type RuntimeCallbacks = {
  disabledRef: { current: boolean };
  callbackRef: { current: ((r: PowerLockResult) => void) | undefined };
  catchCompleteRef: { current: (s: CatchSummary) => void };
  stateChangeRef: { current: ((state: FishingState, depthMeters: number, maxDepthMeters: number, capacity: number, caughtCount: number, runEarnings: number) => void) | undefined };
  capacityLevelRef: { current: number };
  depthLevelRef: { current: number };
  selectedHookIdRef: { current: string };
};

export type DockSceneRuntimeInstance = DockSceneRuntime & { destroy: () => void };

/**
 * Smooth rod-tip anchor for the cast swing.
 *
 * The duck casts through 6 discrete keyframes whose rod-tip markers can jump
 * vertically (e.g. y 334→188→169→146→310→331). Snapping the fishing line origin
 * and hook to those markers each frame makes the (otherwise static) hook texture
 * visibly "jerk up and down". Interpolating the two adjacent keyframes by the
 * exact cast progress keeps the line/hook moving continuously during the swing.
 */
function interpolatedRodTip(progress: number): { x: number; y: number } {
  const safe = Math.min(1, Math.max(0, progress));
  const count = ROD_TIP_BY_FRAME.length;
  const seg = safe * (count - 1);
  const i = Math.floor(seg);
  const t = seg - i;
  const a = ROD_TIP_BY_FRAME[Math.min(i, count - 1)];
  const b = ROD_TIP_BY_FRAME[Math.min(i + 1, count - 1)];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

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

    const hookLoaders = HOOK_DEFINITIONS.map(h => loadTexture(h.image));

    const [backgroundTexture, dialTexture, pointerTexture, glowTexture, coinTexture, ...otherTextures] = await Promise.all([
      loadTexture(FISHING_DOCK_ASSETS.background),
      loadTexture(FISHING_DOCK_ASSETS.dial),
      loadTexture(FISHING_DOCK_ASSETS.pointer),
      loadTexture(FISHING_DOCK_ASSETS.glow),
      loadTexture(FISHING_DOCK_ASSETS.coin),
      ...FISHING_DOCK_ASSETS.frames.map((src) => loadTexture(src)),
      ...hookLoaders
    ]);

    const frameTextures = otherTextures.slice(0, FISHING_DOCK_ASSETS.frames.length);
    const hookTexturesArray = otherTextures.slice(FISHING_DOCK_ASSETS.frames.length);
    
    // Create a map for hook textures
    const hookTextureMap = new Map<string, any>();
    HOOK_DEFINITIONS.forEach((h, index) => {
      hookTextureMap.set(h.id, hookTexturesArray[index]);
    });

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
    const initialHookId = callbacks.selectedHookIdRef.current;
    const initialHookTexture = hookTextureMap.get(initialHookId) || hookTextureMap.get("classic");
    const hookSprite = new Sprite(initialHookTexture);
    
    let currentHookMeta = {
      eyeletOffsetX: HOOK_ASSET_METADATA.eyeletOffsetX,
      eyeletOffsetY: HOOK_ASSET_METADATA.eyeletOffsetY,
      scale: HOOK_ASSET_METADATA.scale,
    };

    const updateHookSprite = (texture: any, hookId: string) => {
      hookSprite.texture = texture;
      if (hookId === "fast") {
        hookSprite.anchor.set(389 / 1024, 824 / 1024);
        hookSprite.scale.set(0.08);
        currentHookMeta = {
          eyeletOffsetX: 652 - 389,
          eyeletOffsetY: 122 - 824,
          scale: 0.08,
        };
      } else if (hookId === "plus2") {
        hookSprite.anchor.set(349 / 1024, 832 / 1024);
        hookSprite.scale.set(0.08);
        currentHookMeta = {
          eyeletOffsetX: 664 - 349,
          eyeletOffsetY: 108 - 832,
          scale: 0.08,
        };
      } else if (hookId === "lucky_gold") {
        hookSprite.anchor.set(416 / 1024, 784 / 1024);
        hookSprite.scale.set(0.08);
        currentHookMeta = {
          eyeletOffsetX: 578 - 416,
          eyeletOffsetY: 125 - 784,
          scale: 0.08,
        };
      } else if (hookId === "coin") {
        hookSprite.anchor.set(532 / 1024, 903 / 1024);
        hookSprite.scale.set(0.08);
        currentHookMeta = {
          eyeletOffsetX: 694 - 532,
          eyeletOffsetY: 70 - 903,
          scale: 0.08,
        };
      } else if (hookId === "times") {
        hookSprite.anchor.set(457 / 1024, 887 / 1024);
        hookSprite.scale.set(0.08);
        currentHookMeta = {
          eyeletOffsetX: 663 - 457,
          eyeletOffsetY: 66 - 887,
          scale: 0.08,
        };
      } else {
        hookSprite.anchor.set(HOOK_ASSET_METADATA.anchorX, HOOK_ASSET_METADATA.anchorY);
        hookSprite.scale.set(HOOK_ASSET_METADATA.scale);
        currentHookMeta = {
          eyeletOffsetX: HOOK_ASSET_METADATA.eyeletOffsetX,
          eyeletOffsetY: HOOK_ASSET_METADATA.eyeletOffsetY,
          scale: HOOK_ASSET_METADATA.scale,
        };
      }
    };
    
    updateHookSprite(initialHookTexture, initialHookId);
    
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
          const currentHookDef = getHookDefinition(callbacks.selectedHookIdRef.current);
          state.targetDepthMeters = INITIAL_MAX_DEPTH + callbacks.depthLevelRef.current * DEPTH_UPGRADE_DELTA;
          state.maxCapacityCount = INITIAL_CAPACITY
            + callbacks.capacityLevelRef.current * CAPACITY_UPGRADE_DELTA
            + (currentHookDef.capacityBonus || 0);
          state.hookSpeedMultiplier = currentHookDef.speedMultiplier || 1.0;
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
          hookSprite.alpha = 1;

          activeFishList = createFishPool({
            targetDepthMeters: state.targetDepthMeters,
            progressionLevel: callbacks.depthLevelRef.current + 1,
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
      hookSprite,
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

    const updateProgression = (capLvl: number, depLvl: number, hookId: string) => {
      if (signal.canceled || destroyed) return;
      const currentHookDef = getHookDefinition(hookId);
      state.targetDepthMeters = INITIAL_MAX_DEPTH + depLvl * DEPTH_UPGRADE_DELTA;
      state.maxCapacityCount = INITIAL_CAPACITY + capLvl * CAPACITY_UPGRADE_DELTA + (currentHookDef.capacityBonus || 0);
      
      const newHookTexture = hookTextureMap.get(hookId);
      if (newHookTexture && hookSprite.texture !== newHookTexture) {
         updateHookSprite(newHookTexture, hookId);
      }
      
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
      if (signal.canceled || destroyed) return;
      if (state.fishingState !== "descending" && state.fishingState !== "ascending") return;
      
      const bounds = app.canvas.getBoundingClientRect();
      const pointerX = (e.clientX - bounds.left) * (app.canvas.width / bounds.width);
      const halfChannel = activeLayout.channelWidth / 2;
      
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

          // --- 1. SIMULATION PHASE ---
          // Advance state timers and state machine transitions
          if (state.fishingState === "casting") {
            state.castAnimTimer += dt;
            if (state.castAnimTimer >= DUCK_ANIMATION_SOURCE.castDurationSeconds) {
              state.fishingState = "descending";
              charNodes.sprite.currentFrame = 0;
            }
          }

          tickCaptureState(state, dt, activeLayout, activeFishList, caughtFishList, {
            onFishCaught: (fish) => {
              caughtFishList.push(fish);
              if (fish.kind.isBad) {
                Promise.resolve(gameAudio.play("fail")).catch(err => reportRuntimeError(err, { area: "createDockRuntime", operation: "playAudio", fatal: false }));
                spawnFloatingText(`${fish.kind.name}`, "#e84a4a", fish.x, fish.depthY);
              } else {
                recordDiscoveredFish([fish.kind.type]);
              }
              
              if (fish.effectController) {
                try {
                  fish.effectController.onCaught(fish);
                } catch (err) {
                  reportRuntimeError(err, { area: "specialEffects", operation: "onCaught", fatal: false });
                }
              }
            },
            onCapacityFull: (x, y) => {
              spawnFloatingText("ĐẦY LƯỠI!", "#ffcf32", x, y);
            }
          });

          // DEPTH MILESTONE
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

          if (depthMilestoneLabel.alpha > 0) {
            milestoneTimer += dt;
            if (state.fishingState !== "descending") {
              depthMilestoneLabel.alpha = Math.max(0, depthMilestoneLabel.alpha - 5 * dt);
            } else if (milestoneTimer > 0.5) {
              depthMilestoneLabel.alpha = Math.max(0, 1 - (milestoneTimer - 0.5) / 0.4);
            }
          }

          const depthMeters = Math.max(0, Math.round((state.capturePointY - (activeLayout.waterlineY + 25)) / 2.8));

          // Payout animation state advance
          if (state.fishingState === "payout") {
            payoutTimer += dt;
            const staggerDelay = 0.08;
            const fishAnimDuration = 0.7;

            const goodFish = caughtFishList.filter((f) => !f.kind.isBad);

            for (let i = 0; i < goodFish.length; i++) {
              const fish = goodFish[i];
              const fishDelay = i * staggerDelay;
              const fishAge = payoutTimer - fishDelay;

              if (fishAge > 0) {
                if (!fish.payoutStarted) {
                  fish.payoutStarted = true;
                  fish.vx = (Math.random() - 0.5) * 150;
                  fish.depthY = activeLayout.waterlineY - 10;
                  fish.node.position.set(fish.x, fish.depthY);
                  Promise.resolve(gameAudio.play("buy")).catch(() => {});
                }
                
                const progress = Math.min(1, fishAge / fishAnimDuration);
                fish.x += fish.vx * dt;
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const jumpHeight = Math.min(activeLayout.height * 0.3, activeLayout.waterlineY - 30);
                fish.depthY = (activeLayout.waterlineY - 10) - jumpHeight * easeOut;
                fish.node.position.set(fish.x, fish.depthY);
                
                if (progress > 0.8) {
                    if (!(fish as any).coinSprite) {
                       fish.bodyGraphic.clear();
                       const cSprite = new Sprite(coinTexture);
                       cSprite.anchor.set(0.5);
                       cSprite.scale.set(0.06); 
                       (fish as any).coinSprite = cSprite;
                       fish.node.addChild(cSprite);
                       fish.node.rotation = 0;
                    }
                    const cSprite = (fish as any).coinSprite;
                    const coinProg = (progress - 0.8) / 0.2;
                    cSprite.y = -coinProg * 20;
                    fish.node.alpha = 1 - coinProg;

                    if (!(fish as any).textSpawned) {
                       (fish as any).textSpawned = true;
                       spawnFloatingText(`+${fish.kind.value}đ`, "#3ae874", fish.x, fish.depthY - 15);
                    }
                } else {
                    fish.node.alpha = 1;
                    const s = 0.6 + progress * 0.2;
                    fish.node.scale.set(fish.vx >= 0 ? s : -s, s);
                    fish.node.rotation += (fish.vx > 0 ? 8 : -8) * dt;
                }
              }
            }

            for (const fish of caughtFishList) {
              if (!fish.kind.isBad) continue;
              if (!fish.payoutStarted) fish.payoutStarted = true;
              fish.node.alpha = Math.max(0, fish.node.alpha - 3 * dt);
            }

            const totalPayoutTime = goodFish.length * staggerDelay + fishAnimDuration + 0.15;
            if (payoutTimer >= totalPayoutTime && !state.resultFired) {
              state.resultFired = true;
              const currentHookDef = getHookDefinition(callbacks.selectedHookIdRef.current);
              
              const totalEarned = caughtFishList.reduce((s, f) => s + (f.kind.isBad ? 0 : f.kind.value * currentHookDef.valueMultiplier), 0);
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


          // --- 2. RENDER PHASE ---
          updateWaterSurface({ rearWave, frontWave }, activeLayout, elapsed);
          const boatWaveMotion = sampleBoatWaveMotion(activeLayout.boatAnchor.x, elapsed);

          updateCharacterAnimation(
            charNodes, state.fishingState, state.castAnimTimer, elapsed, boatWaveMotion
          );

          const frame = charNodes.sprite.currentFrame;
          const castProgress = state.fishingState === "casting"
            ? Math.min(1, state.castAnimTimer / DUCK_ANIMATION_SOURCE.castDurationSeconds)
            : -1;
          const marker = castProgress >= 0
            ? interpolatedRodTip(castProgress)
            : ROD_TIP_BY_FRAME[frame];

          const scaleX = charNodes.sprite.scale.x;
          const scaleY = charNodes.sprite.scale.y;
          const localX = (marker.x - DUCK_ANIMATION_SOURCE.width * DUCK_ANIMATION_SOURCE.anchorX) * scaleX;
          const localY = (marker.y - DUCK_ANIMATION_SOURCE.height * DUCK_ANIMATION_SOURCE.anchorY) * scaleY;
          
          const cosT = Math.cos(charNodes.boatBob.rotation);
          const sinT = Math.sin(charNodes.boatBob.rotation);
          
          const rodTipWorldX = charNodes.boatRoot.x + charNodes.boatBob.x + localX * cosT - localY * sinT;
          const rodTipWorldY = charNodes.boatRoot.y + charNodes.boatBob.y + localX * sinT + localY * cosT;

          const HOOK_EYELET_OFFSET_X = currentHookMeta.eyeletOffsetX * currentHookMeta.scale;
          const HOOK_EYELET_OFFSET_Y = currentHookMeta.eyeletOffsetY * currentHookMeta.scale;

          let currentCapturePointX = state.capturePointX;
          let currentCapturePointY = state.capturePointY;

          if (state.fishingState === "casting") {
            const progress = state.castAnimTimer / DUCK_ANIMATION_SOURCE.castDurationSeconds;
            if (progress < 0.65) {
               currentCapturePointX = rodTipWorldX - HOOK_EYELET_OFFSET_X;
               currentCapturePointY = rodTipWorldY - HOOK_EYELET_OFFSET_Y;
            } else {
               const t = (progress - 0.65) / 0.35;
               const smoothRodTipX = charNodes.boatRoot.x + localX * cosT - localY * sinT; 
               const earlyCaptureX = smoothRodTipX - HOOK_EYELET_OFFSET_X;
               const earlyCaptureY = rodTipWorldY - HOOK_EYELET_OFFSET_Y;
               
               currentCapturePointX = earlyCaptureX + (state.capturePointX - earlyCaptureX) * t;
               currentCapturePointY = earlyCaptureY + (state.capturePointY - earlyCaptureY) * t;
            }
          }

          const currentEyeletX = currentCapturePointX + HOOK_EYELET_OFFSET_X;
          const currentEyeletY = currentCapturePointY + HOOK_EYELET_OFFSET_Y;

          if (state.fishingState === "surfaceBurst" || state.fishingState === "payout") {
            hookSprite.alpha = Math.max(0, hookSprite.alpha - 5 * dt);
          } else {
            hookSprite.alpha = 1;
          }
          hookSprite.rotation = 0;
          hookSprite.position.set(currentCapturePointX, currentCapturePointY);

          fishingLine.clear();
          if (state.fishingState !== "surfaceBurst" && state.fishingState !== "payout") {
            fishingLine.moveTo(rodTipWorldX, rodTipWorldY);
            if (state.fishingState === "idle") {
              fishingLine.quadraticCurveTo(rodTipWorldX, currentEyeletY, currentEyeletX, currentEyeletY);
            } else {
              fishingLine.lineTo(currentEyeletX, currentEyeletY);
            }
            fishingLine.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
          }

          updateAmbient(ambient, activeLayout, elapsed);

          worldContainer.position.y = -state.cameraY;

          const currentHookDef = getHookDefinition(callbacks.selectedHookIdRef.current);
          const currentRunEarnings = caughtFishList.reduce((sum, f) => sum + (f.kind.isBad ? 0 : f.kind.value * currentHookDef.valueMultiplier), 0);
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
