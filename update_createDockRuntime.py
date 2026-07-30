import re

with open('src/app/components/bat-ca/dock/runtime/createDockRuntime.ts', 'r') as f:
    code = f.read()

# 1. Update imports
code = code.replace(
    "import { loadTexture, FISHING_DOCK_ASSETS, DUCK_ANIMATION_SOURCE, validateDuckFrameTextures, ROD_TIP_BY_FRAME } from './fishingAssets';",
    "import { loadTexture, FISHING_DOCK_ASSETS, DUCK_ANIMATION_SOURCE, validateDuckFrameTextures, ROD_TIP_BY_FRAME, HOOK_ASSET_METADATA } from './fishingAssets';"
)

# 2. Update textures
code = code.replace(
    "const [backgroundTexture, dialTexture, pointerTexture, glowTexture, hookTexture, ...frameTextures] = await Promise.all([",
    "const [backgroundTexture, dialTexture, pointerTexture, glowTexture, hookTexture, coinTexture, ...frameTextures] = await Promise.all(["
)
code = code.replace(
    "loadTexture(FISHING_DOCK_ASSETS.hook),\n      ...FISHING_DOCK_ASSETS.frames",
    "loadTexture(FISHING_DOCK_ASSETS.hook),\n      loadTexture(FISHING_DOCK_ASSETS.coin),\n      ...FISHING_DOCK_ASSETS.frames"
)

# 3. Z-order
code = code.replace(
    """    worldContainer.addChild(
      background,
      ambient.sky,
      waterBody,
      channel,
      rearWave,
      leftBank,
      rightBank,
      ambient.underwater,
      fishingLine,
      hookSprite,
      fishContainer,
      boatShadow,
      boatRoot,
      frontWave,
      frontWaveMask,
      textContainer,
    );""",
    """    worldContainer.addChild(
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
    );"""
)

# 4. Phase 4: Hook placement and separate capture point
code = code.replace(
    """    const hookSprite = new Sprite(hookTexture);
    hookSprite.anchor.set(0.6103, 0.1201);
    hookSprite.scale.set(0.13);""",
    """    const hookSprite = new Sprite(hookTexture);
    hookSprite.anchor.set(HOOK_ASSET_METADATA.anchorX, HOOK_ASSET_METADATA.anchorY);
    hookSprite.scale.set(HOOK_ASSET_METADATA.scale);"""
)

hook_logic_old = """          // Hook eyelet offset relative to the curve (assuming capturePoint is the physical curve)
          const HOOK_EYELET_OFFSET_X = 22;
          const HOOK_EYELET_OFFSET_Y = -95;
          const targetEyeletX = state.capturePointX + HOOK_EYELET_OFFSET_X;
          const targetEyeletY = state.capturePointY + HOOK_EYELET_OFFSET_Y;

          let hookWorldX, hookWorldY;
          if (state.fishingState === "idle") {
            hookWorldX = targetEyeletX;
            hookWorldY = targetEyeletY;
          } else if (state.fishingState === "casting") {
            const progress = state.castAnimTimer / DUCK_ANIMATION_SOURCE.castDurationSeconds;
            if (progress < 0.65) {
               hookWorldX = rodTipWorldX;
               hookWorldY = rodTipWorldY;
            } else {
               const t = (progress - 0.65) / 0.35;
               // Use a smoothed, non-oscillating source X for the cast drop to prevent rapid left-right jitter
               const smoothRodTipX = charNodes.boatRoot.x + localX * cosT - localY * sinT; 
               hookWorldX = smoothRodTipX + (targetEyeletX - smoothRodTipX) * t;
               hookWorldY = rodTipWorldY + (targetEyeletY - rodTipWorldY) * t;
            }
          } else if (state.fishingState === "surfaceBurst" || state.fishingState === "payout") {
            hookWorldX = targetEyeletX;
            hookWorldY = targetEyeletY;
          } else {
            hookWorldX = targetEyeletX;
            hookWorldY = targetEyeletY;
          }

          // Hook visibility: fade out during surfaceBurst and payout
          if (state.fishingState === "surfaceBurst" || state.fishingState === "payout") {
            hookSprite.alpha = Math.max(0, hookSprite.alpha - 5 * dt);
          } else {
            hookSprite.alpha = 1;
          }
          hookSprite.rotation = 0;
          hookSprite.position.set(hookWorldX, hookWorldY);

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
          }"""

hook_logic_new = """          const HOOK_EYELET_OFFSET_X = HOOK_ASSET_METADATA.eyeletOffsetX * HOOK_ASSET_METADATA.scale;
          const HOOK_EYELET_OFFSET_Y = HOOK_ASSET_METADATA.eyeletOffsetY * HOOK_ASSET_METADATA.scale;

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

          // Hook visibility: fade out during surfaceBurst and payout
          if (state.fishingState === "surfaceBurst" || state.fishingState === "payout") {
            hookSprite.alpha = Math.max(0, hookSprite.alpha - 5 * dt);
          } else {
            hookSprite.alpha = 1;
          }
          hookSprite.rotation = 0;
          hookSprite.position.set(currentCapturePointX, currentCapturePointY);

          // Fishing line: only draw during idle/casting/descending/ascending
          fishingLine.clear();
          if (state.fishingState !== "surfaceBurst" && state.fishingState !== "payout") {
            fishingLine.moveTo(rodTipWorldX, rodTipWorldY);
            if (state.fishingState === "idle") {
              fishingLine.quadraticCurveTo(rodTipWorldX, currentEyeletY, currentEyeletX, currentEyeletY);
            } else {
              fishingLine.lineTo(currentEyeletX, currentEyeletY);
            }
            fishingLine.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
          }"""
code = code.replace(hook_logic_old, hook_logic_new)

# 5. Phase 7: Payout
payout_old = """                // Jump arc
                fish.x += fish.vx * dt;
                // Cubic ease-out for jump (fast up, slows down at peak)
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const jumpHeight = activeLayout.height * 0.45; // Jump to roughly half screen
                fish.depthY = (activeLayout.waterlineY - 10) - jumpHeight * easeOut;
                
                fish.node.position.set(fish.x, fish.depthY);
                
                // Fade out at the very peak
                if (progress > 0.8) {
                   fish.node.alpha = Math.max(0, 1 - (progress - 0.8) / 0.2);
                } else {
                   fish.node.alpha = 1;
                }
                
                // Spawn text exactly when fading starts (at the peak)
                if (progress >= 0.8 && !(fish as any).textSpawned) {
                   (fish as any).textSpawned = true;
                   spawnFloatingText(`+${fish.kind.value}đ`, "#3ae874", fish.x, fish.depthY - 15);
                }

                const s = 0.6 + progress * 0.2; // Scale slightly as it flies up
                fish.node.scale.set(fish.vx >= 0 ? s : -s, s);
                // Tumble while flying
                fish.node.rotation += (fish.vx > 0 ? 8 : -8) * dt;"""

payout_new = """                // Jump arc
                fish.x += fish.vx * dt;
                // Cubic ease-out for jump (fast up, slows down at peak)
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const jumpHeight = Math.min(activeLayout.height * 0.5, activeLayout.waterlineY - 30); // Approx half viewport, keep some margin
                fish.depthY = (activeLayout.waterlineY - 10) - jumpHeight * easeOut;
                
                fish.node.position.set(fish.x, fish.depthY);
                
                // Transition to Coin near apex
                if (progress > 0.8) {
                    if (!(fish as any).coinSprite) {
                       fish.node.clear();
                       const cSprite = new Sprite(coinTexture);
                       cSprite.anchor.set(0.5);
                       cSprite.scale.set(0.5); 
                       (fish as any).coinSprite = cSprite;
                       fish.node.addChild(cSprite);
                       fish.node.rotation = 0; // reset tumbling so coin is upright
                    }
                    const cSprite = (fish as any).coinSprite;
                    const coinProg = (progress - 0.8) / 0.2; // 0 to 1
                    cSprite.y = -coinProg * 20;
                    fish.node.alpha = 1 - coinProg;

                    // Spawn text exactly when coin starts (at the peak)
                    if (!(fish as any).textSpawned) {
                       (fish as any).textSpawned = true;
                       spawnFloatingText(`+${fish.kind.value}đ`, "#3ae874", fish.x, fish.depthY - 15);
                    }
                } else {
                    fish.node.alpha = 1;
                    const s = 0.6 + progress * 0.2; // Scale slightly as it flies up
                    fish.node.scale.set(fish.vx >= 0 ? s : -s, s);
                    // Tumble while flying
                    fish.node.rotation += (fish.vx > 0 ? 8 : -8) * dt;
                }"""

code = code.replace(payout_old, payout_new)

with open('src/app/components/bat-ca/dock/runtime/createDockRuntime.ts', 'w') as f:
    f.write(code)

print("update_createDockRuntime.py done!")
