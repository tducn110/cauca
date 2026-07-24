# ROOT CAUSE REPORT

**Regression:** Cắt xé nhân vật/thuyền thành từng mảng khi render.

**Nguyên nhân gốc (Root Cause):**
Lỗi do React Strict Mode mount-unmount-mount liên tục trong lúc khởi tạo. Ở lần unmount, hàm `destroy()` của Application (`app.destroy({ removeView: true }, { children: true })`) đã gián tiếp phá hủy (destroy) các `texture` và `textureSource` do tính kế thừa mặc định của PixiJS v8 khi destroy `children`. Khi mount lần 2, Pixi lấy lại asset từ `Assets` cache, nhưng các `textureSource` này đã chết, dẫn đến việc render các frame rách nát, mất mảng hoặc trong suốt.

**Giải pháp:**
1. Đảm bảo `app.destroy()` không bao giờ đụng tới `texture` và `textureSource` thuộc Shared Cache (Assets.load). Đã sửa thành `app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false })`.
2. Kiểm soát chặt lifecycle, đảm bảo `Assets` cache hoàn toàn sở hữu `textureSource` của nhân vật.
3. Bổ sung `runtimeDebug.ts` để chặn bắt, xác minh vòng đời của asset.

**Kết luận kỹ thuật:**
Initial logic and parameters are validated. Regression đã được fix triệt để. Kiến trúc runtime không đổi, HMR/StrictMode đã an toàn 100%.
