# Kế Hoạch Kỹ Thuật Chi Tiết (Technical Plan) cho `10_cauca`
*Dựa trên việc scan và phân tích kiến trúc PixiJS hiện tại của dự án.*

## 1. Phân Tích Kiến Trúc Hiện Tại (Dựa trên source code)

Dự án `10_cauca` đang sử dụng **PixiJS (v8)** với một cấu trúc rất rõ ràng trong thư mục `src/app/components/bat-ca/dock/`:
- **Vòng lặp Game (Game Loop):** Quản lý tại `createDockRuntime.ts` thông qua `app.ticker.add`. File này chịu trách nhiệm tính toán vị trí lưỡi câu, vẽ dây câu, và thực hiện payout animation.
- **Render Nhân Vật:** Quản lý tại `characterRenderer.ts` thông qua object `charNodes` (chứa `AnimatedSprite` của vịt). Animation vung cần đang được thay đổi frame bằng `duckFrameAtProgress`. GSAP đã được loại bỏ một phần, thuyền bồng bềnh bằng hàm tính toán sóng.
- **Tài sản (Assets):** Được khai báo trong `fishingAnimation.ts` (const `FISHING_DOCK_ASSETS`) và load ở `fishingAssets.ts` + `createDockRuntime.ts`.

## 2. Kế Hoạch Thay Đổi Thực Tế (Phase 1)

Như đã thống nhất, chúng ta sẽ tối ưu hiệu năng và logic bằng Hình ảnh (Sprite). Dưới đây là chi tiết thay đổi theo từng file:

### A. Thêm Asset Mới (Lưỡi câu & Tiền vàng)
**File:** `src/app/components/bat-ca/dock/fishingAnimation.ts`
- Bổ sung thêm 2 đường dẫn ảnh vào `FISHING_DOCK_ASSETS`:
  ```typescript
  export const FISHING_DOCK_ASSETS = {
    // ... các asset cũ
    hook: "/hook.png",
    coin: "/coin.png"
  } as const;
  ```
- **Lưu ý:** Sẽ cần đặt 2 file `hook.png` và `coin.png` vào thư mục `public/` của dự án.

### B. Tắt Animation Vung Cần (Nhân vật tĩnh)
**File:** `src/app/components/bat-ca/dock/runtime/characterRenderer.ts`
- Sửa hàm `updateCharacterAnimation` để luôn set frame về 0, giữ cần câu bất động:
  ```typescript
  export function updateCharacterAnimation(...) {
    // Giữ nguyên logic sóng (waveMotion)
    if (waveMotion) { ... }
    
    // Tắt animation vung cần, luôn giữ vị trí đứng yên
    nodes.sprite.currentFrame = 0; 
  }
  ```

### C. Dây Câu Thẳng & Lưỡi Câu Bằng Ảnh & Payout Tiền Vàng
**File:** `src/app/components/bat-ca/dock/runtime/createDockRuntime.ts`

**1. Khởi tạo Sprite thay vì Graphics cho Lưỡi câu:**
- Load `hookTexture` và `coinTexture`.
- Thay thế `const hookGraphic = new Graphics(); ...` bằng:
  ```typescript
  const hookSprite = new Sprite(hookTexture);
  hookSprite.anchor.set(0.5, 0); // Neo ở trên cùng để nối dây
  ```

**2. Vẽ Dây Câu Thẳng:**
- Trong `app.ticker`, ở đoạn vẽ `fishingLine`, thay `quadraticCurveTo` bằng `lineTo` để dây luôn thẳng đứng:
  ```typescript
  fishingLine.clear();
  if (state.fishingState !== "surfaceBurst" && state.fishingState !== "payout") {
    fishingLine.moveTo(rodTipWorldX, rodTipWorldY);
    fishingLine.lineTo(hookWorldX, hookWorldY); // Vẽ thẳng
    fishingLine.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
  }
  ```

**3. Hiệu Ứng Bắt Cá (Payout Animation) Nhẹ Nhàng Bằng Tween (Toán học):**
- Trong đoạn `state.fishingState === "payout"`, thay vì cá nhảy loạn lên, ta sẽ đổi hình ảnh con cá thành hình Đồng Xu (`coinTexture`), và cho nó bay lên thẳng đứng rồi mờ đi (hoặc rơi xuống).
- Logic bay (Gravity & Scale):
  ```typescript
  if (fishAge > 0) {
    if (!fish.payoutStarted) {
      fish.payoutStarted = true;
      
      // Chuyển hình ảnh cá thành đồng xu ngay lập tức
      fish.node.clear(); // Xóa ảnh Graphics cá cũ
      const coin = new Sprite(coinTexture);
      coin.anchor.set(0.5);
      fish.node.addChild(coin);

      // Setup lực nảy
      fish.vy = -350; 
      fish.depthY = activeLayout.waterlineY;
    }
    
    const progress = Math.min(1, fishAge / fishAnimDuration);
    // Tính toán vật lý rơi tự do
    fish.vy += 800 * dt; // Trọng lực (Gravity)
    fish.depthY += fish.vy * dt;
    fish.node.position.set(fish.x, fish.depthY);
    
    // Scale và Fade out
    const s = 1.0 - (progress * 0.3); // Hơi thu nhỏ
    fish.node.scale.set(s);
    fish.node.alpha = Math.max(0, 1 - progress);
  }
  ```

## 3. Lý Do Cách Làm Này Siêu Mượt (Khắc phục lỗi `09_blockblast`)
1. **Không tạo Object mới:** Tại phase payout, chúng ta dùng luôn container `fish.node` đã có từ trước (không `new Sprite` ở mỗi frame).
2. **Hình Ảnh (Assets):** Đồng xu và lưỡi câu được load sẵn (Preload) từ `FISHING_DOCK_ASSETS`, GPU chỉ việc dán lên, không tốn tính toán đồ họa Vector.
3. **Tween Bằng Toán Học Đơn Giản:** Chỉ dùng phép cộng/nhân `fish.vy`, `fish.depthY`, `dt`... cực kỳ nhẹ cho CPU.

---
*Tài liệu này được scan và viết riêng để phản ánh chính xác 100% vào source code của `10_cauca`.*
