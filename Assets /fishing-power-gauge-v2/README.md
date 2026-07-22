# Fishing Power Gauge Animation Pack

Bộ này gồm asset PNG nền trong suốt, preview animation, demo HTML chạy độc lập và component PixiJS.

## Cấu trúc

```text
fishing-power-gauge/
├── assets/
│   ├── dial_base.png
│   ├── pointer.png
│   ├── max_glow.png
│   ├── spark.png
│   └── metadata.json
├── src/
│   ├── FishingPowerGauge.js
│   └── example-usage.js
├── demo/
│   └── index.html
├── docs/
│   └── pivot-guide.png
├── preview.gif
└── README.md
```

## Pivot và góc

Pivot của `pointerRotator` phải nằm chính xác ở tâm dial:

```text
dial_base anchor: (0.5, 0.5)
pointerRotator position: (0, 0) trong container của dial
pointer child position: (-radius, 0)
```

Góc dùng trong PixiJS:

```text
0            = MIN trái
Math.PI / 2  = MAX phía trên
Math.PI      = MIN phải
```

`pointer.png` mặc định hướng sang phải. Khi đặt nó ở bên trái tâm tại `x = -radius`, mũi pointer sẽ hướng vào dial. Xoay container từ `0` đến `Math.PI` sẽ làm pointer luôn hướng vào tâm.

## Chạy demo

Giải nén rồi mở:

```text
demo/index.html
```

Bấm vòng tròn hoặc nhấn Space/Enter để khóa thời điểm.

## Tích hợp PixiJS

Xem:

```text
src/example-usage.js
```

Trong callback `onCast`, gọi animation quăng cần của nhân vật:

```js
onCast: ({ label, power }) => {
  fisherman.cast({ power });

  if (label === "MAX") {
    // phát particle, âm thanh perfect, rung camera nhẹ
  }
}
```

## Chấm lực mặc định

```text
lệch MAX ≤ 8°   → MAX, power 1.00
lệch MAX ≤ 18°  → GREAT, power 0.85
lệch MAX ≤ 35°  → GOOD, power 0.60
còn lại         → MIN
```

Các ngưỡng và tốc độ đều chỉnh được trong constructor.
