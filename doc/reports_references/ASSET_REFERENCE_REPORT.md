# Asset Reference Report

Generated: 2026-07-23

## Methodology
Scanned: src/**/*.{ts,tsx,css,html}, *.md, *.json, scripts/**/*.mjs
Tools used: find, grep

## Results

| Asset Path | Referenced In | Classification | Action |
|------------|---------------|----------------|--------|
| public/assets/fishing/background.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character.png | NONE | UNUSED | DELETE |
| public/assets/fishing/character/animation.json | NONE (metadata) | DOC_ONLY | DELETE |
| public/assets/fishing/character/frame_01.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character/frame_02.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character/frame_03.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character/frame_04.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character/frame_05.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character/frame_06.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/character/sprite_sheet_6_frames.png | NONE (sprite sheet artifact) | DOC_ONLY | DELETE |
| public/assets/fishing/character/preview.gif | NONE (preview) | DOC_ONLY | DELETE |
| public/assets/fishing/ui/upgrades/icon_depth.png | src/app/components/bat-ca/dock/DockHud.tsx | KEEP | - |
| public/assets/fishing/ui/upgrades/iconMoney.png | src/app/components/bat-ca/dock/DockHud.tsx | KEEP | - |
| public/assets/fishing/ui/upgrades/icon_upgrade.png | NONE | UNUSED | DELETE |
| public/assets/fishing/ui/upgrades/icon_addfish.png | src/app/components/bat-ca/dock/DockHud.tsx | KEEP | - |
| public/assets/fishing/gauge/dial_base.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/gauge/pointer.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |
| public/assets/fishing/gauge/max_glow.png | src/app/components/bat-ca/dock/fishingAnimation.ts | KEEP | - |

## Assets Confirmed UNUSED (safe to delete)
- public/assets/fishing/character.png
- public/assets/fishing/ui/upgrades/icon_upgrade.png

## Assets DOC_ONLY (generated/preview files, safe to delete if repo is clean)
- public/assets/fishing/character/animation.json
- public/assets/fishing/character/sprite_sheet_6_frames.png
- public/assets/fishing/character/preview.gif

## Risks Remaining
- `icon_upgrade.png` may be referenced in a dynamic string or external backend that returns image URLs, although it's unlikely for local static assets.
- If the animation pipeline changes, we might need the original `animation.json` or `sprite_sheet_6_frames.png` to regenerate frames, so keeping them in `docs/` or source control history might be better than permanent deletion.
