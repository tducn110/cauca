# Duck Fishing – Arm Pivot Animation Preview

Nội dung:
- `preview_arm_pivot.gif`: preview animation tay/cần đi lên xuống.
- `frames/`: 6 frame PNG riêng.
- `sprite_sheet_6_frames.png`: spritesheet gốc.
- `animation.json`: thứ tự frame, thời lượng và tọa độ pivot tham khảo.
- `pixi-arm-pivot-example.js`: ví dụ chuyển động pivot trong PixiJS.

Pivot:
- Đặt tại bàn tay/cổ tay gần thân vịt, nơi đang giữ cán cần.
- Tọa độ tham khảo trên canvas 480×541: x=294, y=337.
- Thân vịt và thuyền giữ nguyên; layer `arms_rod` xoay nhẹ quanh pivot.

Thông số đề xuất:
- Xoay: -5° đến +5°.
- Lên/xuống: -4 px đến +4 px.
- Một vòng: khoảng 1.1 giây.
- Thuyền nhấp nhô riêng: 2 px, khoảng 1.8 giây.
