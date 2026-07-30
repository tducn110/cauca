# Fishing PixiJS Root Patch — Cách cài

## Mục tiêu

Gói này thay trực tiếp animation vịt câu cá, giữ nguyên đường dẫn runtime hiện tại và bổ sung lớp xử lý lỗi cho React, PixiJS, asset loading và audio.

## Cài đặt

1. Sao lưu hoặc commit project hiện tại.
2. Đặt file ZIP vào **root project** — cùng cấp với `package.json`.
3. Giải nén và cho phép ghi đè file.
4. Không cần cài dependency mới.
5. Chạy:

```bash
npm run verify:fishing-patch
npm run typecheck
npm run test
npm run build
```

Hoặc:

```bash
npm run check
```

## File bị ghi đè

```text
package.json
src/main.tsx
src/app/audio/audioManager.ts
src/app/components/bat-ca/dock/DockHud.tsx
src/app/components/bat-ca/dock/FishingDockCanvas.tsx
src/app/components/bat-ca/dock/FishingDockScreen.tsx
src/app/components/bat-ca/dock/FishingPowerGauge.ts
src/app/components/bat-ca/dock/fishing-dock-screen.css
public/assets/fishing/character/frame_01.png ... frame_06.png
```

## File mới

```text
src/app/components/AppErrorBoundary.tsx
src/app/observability/runtimeErrors.ts
src/app/components/bat-ca/dock/fishingAnimation.ts
src/app/components/bat-ca/dock/fishingAnimation.test.ts
public/assets/fishing/character/animation.json
public/assets/fishing/character/sprite_sheet_6_frames.png
public/assets/fishing/character/preview.gif
scripts/verify-fishing-patch.mjs
scripts/cleanup-legacy-fishing-assets.mjs
FISHING_PATCH_ANALYSIS.md
AGENT_ORCHESTRATION_PROMPT.md
IMPORT_AND_DELETE_MAP.md
```

## Import cần thêm

Không cần sửa thủ công nếu đã cho phép ZIP ghi đè. Patch đã thêm:

```ts
// src/main.tsx
import { AppErrorBoundary } from "./app/components/AppErrorBoundary";
import { installGlobalRuntimeErrorHandlers } from "./app/observability/runtimeErrors";
```

```ts
// FishingDockCanvas.tsx
import {
  DUCK_ANIMATION_SOURCE,
  FISHING_DOCK_ASSETS,
  duckFrameAtProgress,
  validateDuckFrameTextures,
} from "./fishingAnimation";
import { reportRuntimeError } from "../../../observability/runtimeErrors";
```

```ts
// FishingDockScreen.tsx, FishingPowerGauge.ts, audioManager.ts
import { reportRuntimeError } from ".../observability/runtimeErrors";
```

## Hành vi animation

- Sáu frame đều là PNG RGBA `480×541`.
- Đáy thuyền được căn tại `y = 510`.
- PixiJS không còn xoay toàn bộ vịt + thuyền trong lúc cast.
- Cast chạy sáu frame trong khoảng `510 ms`.
- Boat bob idle vẫn chạy độc lập.
- React HUD chỉ nhận snapshot tối đa khoảng 10 lần/giây, thay vì bị `setState` 60 lần/giây.

## Rollback

Khôi phục commit trước khi giải nén hoặc chép lại các file bị ghi đè từ backup. Asset cũ có thể khôi phục bằng cách trả lại `public/assets/fishing/character/frame_01.png ... frame_06.png`.
