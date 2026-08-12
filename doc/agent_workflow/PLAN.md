# Refactor Plan — FishingDockCanvas Line/Hook Removal & Cleanup

Generated: 2026-07-23

---

## PHASE 1 — INVENTORY

### Active Routes
- App.tsx → GameApp.tsx → FishingDockScreen.tsx → FishingDockCanvas.tsx
- engine.ts / render.ts = legacy v1 game engine (separate route, not touched)

### Asset Reference Map

| File | Referenced In | Classification |
|------|---------------|----------------|
| /assets/fishing/background.png | fishingAnimation.ts, canvas fallback | KEEP |
| /assets/fishing/character/frame_01-06.png | fishingAnimation.ts | KEEP |
| /assets/fishing/gauge/dial_base.png | fishingAnimation.ts | KEEP |
| /assets/fishing/gauge/pointer.png | fishingAnimation.ts | KEEP |
| /assets/fishing/gauge/max_glow.png | fishingAnimation.ts | KEEP |
| /assets/fishing/ui/upgrades/icon_addfish.png | DockHud.tsx | KEEP |
| /assets/fishing/ui/upgrades/icon_depth.png | DockHud.tsx | KEEP |
| /assets/fishing/ui/upgrades/iconMoney.png | DockHud.tsx | KEEP |
| /assets/fishing/ui/upgrades/icon_upgrade.png | no code reference | UNUSED (confirm before delete) |
| /assets/fishing/character.png | no code reference | UNUSED |
| /assets/fishing/character/sprite_sheet_6_frames.png | no code reference | DOC_ONLY |
| /assets/fishing/character/preview.gif | no code reference | DOC_ONLY |
| /assets/fishing/character/animation.json | no code reference | DOC_ONLY |

## PHASE 2 — VISUAL REMOVALS

### Remove (visual only):
- lineGraphics declaration + addChild + clear + bezierCurveTo + stroke
- hookGraphics declaration + addChild + clear + circle + moveTo + arc + stroke
- rodTipX / rodTipY (only used in line drawing)

### Rename (gameplay logic preserved):
- currentHookX → capturePointX
- currentHookY → capturePointY
- targetHookX → targetCaptureX

### Dead code cleanup:
- buildAmbient(): remove leaves[], sparkles[] arrays and comment blocks
- Remove empty for-loops iterating ambient.leaves, ambient.sparkles
- Remove ambient.highlights if sparkles is the only child

## PHASE 3 — DEFERRED
Module split (createDockRuntime etc.) deferred to maintain stable API.

## Files Changed
- src/app/components/bat-ca/dock/FishingDockCanvas.tsx (Phase 2 changes)
