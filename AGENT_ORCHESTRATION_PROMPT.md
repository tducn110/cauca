# Prompt điều phối multi-agent — Audit và harden toàn bộ project

Bạn là **Lead Orchestrator** của một nhóm agents sửa một dự án React 18 + TypeScript strict + Vite + PixiJS v8.7. Mục tiêu là đưa repository về trạng thái build ổn định, gameplay không race condition, asset không 404, lifecycle không leak, mọi exception có context và test hồi quy.

## Nguyên tắc bắt buộc

1. Trước khi sửa, đọc toàn bộ repository và tạo `PLAN.md`.
2. Không đoán. Mọi nhận định phải trỏ tới file + dòng hoặc output lệnh.
3. Không dùng blanket `catch {}` để nuốt lỗi. Mỗi catch phải:
   - phục hồi được trạng thái hoặc fail fast;
   - gọi reporter với `area`, `operation`, severity và metadata hữu ích;
   - không spam cùng một lỗi mỗi frame.
4. Không thay đổi economy, save schema hoặc gameplay balance nếu không có test chứng minh.
5. Giữ PixiJS v8, React 18, TypeScript strict. Không thêm dependency khi built-in API đủ dùng.
6. Mọi listener, timer, ticker, ResizeObserver, pointer capture, AudioContext và Pixi Application phải cleanup idempotent.
7. Asset runtime chỉ có một source of truth.
8. Không đánh dấu hoàn tất khi chưa chạy `typecheck`, `test`, `build` và kiểm tra Network 404.
9. Không sửa bằng optical-flow hoặc scale toàn character giữa animation frames.
10. Với animation vịt: boat/body/head/legs ổn định; runtime không xoay toàn bộ AnimatedSprite khi cast.

## Chia agents

### Agent A — Repository mapper / dead-code audit
- Lập import graph và route graph.
- Xác định stack đang chạy và stack legacy.
- Phân loại file: active, shared, test-only, dead, unknown.
- Kiểm tra `GameApp`, `useAppShell`, `HomeScreen`, `GameContainer`, `BatCaAoLang`.
- Đề xuất một trong hai phương án rõ ràng:
  1. dock là game chính và xóa legacy; hoặc
  2. phục hồi route gameplay/end-game.
- Không xóa file unknown khi chưa có bằng chứng.

### Agent B — PixiJS / animation / asset lifecycle
- Audit `FishingDockCanvas.tsx`, `FishingPowerGauge.ts`, layout và CSS fallback.
- Kiểm tra đủ 6 PNG RGBA 480×541.
- Verify không 404 và không texture kích thước sai.
- Kiểm tra asset cache, init cancel, destroy, ticker stop, listener cleanup.
- Fix double-destroy bằng ownership rõ ràng.
- Throttle bridge Pixi → React.
- Tạo test cho frame mapping, result race, cleanup idempotency.
- Profiling: không set React state 60 FPS; không tạo object nặng trong ticker nếu tránh được.

### Agent C — React state / UI flow
- Audit state machine `dock → casting → descending → ascending → surfacing → result`.
- Chứng minh overlay result không bị `idle` ghi đè.
- Audit modal lock, disabled state, focus, keyboard và reduced-motion.
- Fix props chết hoặc xóa khỏi interface.
- Audit dashboard open flow và screen routing.

### Agent D — Persistence / audio / exception handling
- Audit localStorage migration, offline earnings, gift cooldown và record catch.
- Tạo failure matrix: storage unavailable, JSON corrupt, quota exceeded, AudioContext denied, tab hidden.
- Đảm bảo Promise rejection được xử lý.
- Tách sound toggle và music toggle; không hiển thị music hoạt động nếu chưa có engine.
- Đánh giá reporter hiện tại; bổ sung production adapter nếu project có backend.

### Agent E — Tests / build / QA
- Chạy:
  ```bash
  npm run verify:fishing-patch
  npm run typecheck
  npm run test
  npm run build
  ```
- Thêm test hồi quy cho mọi bug đã sửa.
- Test viewport: 1920×1080, 1366×768, 1280×720, 844×390, 390×844, 320×568.
- Test DPR 1 và 2; resize liên tục; tab hide/show; asset 404 giả; WebGL unavailable.
- Kiểm tra Chrome DevTools:
  - Console không có uncaught error;
  - Network không 404;
  - không tăng canvas/listener sau 20 lần mount/unmount;
  - heap không tăng liên tục qua 20 lượt câu.

## Quy trình làm việc

### Phase 1 — Baseline
- Tạo branch/commit checkpoint.
- Chạy toàn bộ command và lưu output vào `artifacts/baseline/`.
- Chụp danh sách lỗi hiện tại, không sửa ngay.

### Phase 2 — Plan
Tạo `PLAN.md` gồm:
- vấn đề;
- mức P0/P1/P2;
- owner agent;
- file tác động;
- test dự kiến;
- rollback;
- dependency giữa task.

### Phase 3 — Implementation
- Mỗi agent làm commit nhỏ, một mục tiêu.
- Không cùng sửa một file mà không rebase/coordinate.
- Sau mỗi P0 fix chạy test liên quan.

### Phase 4 — Integration
- Orchestrator review diff.
- Loại catch im lặng, console spam, duplicate utility và dead import.
- Chạy full check.
- Chạy manual QA matrix.

### Phase 5 — Final report
Tạo:
- `FINAL_AUDIT.md`;
- `CHANGELOG.md`;
- `DELETE_CANDIDATES.md`;
- `RISK_REGISTER.md`;
- output command;
- danh sách file changed;
- vấn đề chưa sửa và lý do.

## Acceptance criteria

- Sáu frame tải thành công, đúng RGBA 480×541.
- Boat/duck không trôi khi cast; không xoay cả sprite.
- Result overlay luôn tồn tại cho tới khi bấm collect.
- Không double-destroy Pixi node.
- Không callback React 60 FPS.
- Không uncaught exception/unhandled rejection trong happy path và failure tests.
- Tất cả timer/listener/ticker/observer cleanup.
- Không 404 asset.
- `npm run check` pass.
- Không mất save cũ.
- Có rollback rõ ràng.

Bắt đầu bằng việc **chỉ tạo PLAN**, chưa sửa code cho tới khi PLAN chỉ ra dependencies và thứ tự merge.
