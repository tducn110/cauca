# Fishing Game Context

**Project**: `10_cauca` (Bộ Lạc Đậu Phộng - Fishing Mini-game)

## Design Language
- **Mood**: Nostalgic, Vietnamese countryside, warm, hand-drawn.
- **Style**: Pencil sketch + watercolor wash.

## Technical Architecture (PixiJS)
- **Game Loop**: Managed in `createDockRuntime.ts` via `app.ticker.add`. Calculates hook position, draws fishing line, handles payout animations.
- **Character Renderer**: Managed in `characterRenderer.ts`.

## Core Game Flow
- State machine: `dock` → `casting` → `descending` → `ascending` → `surfacing` → `result`.
- **Hook & Coin Assets**: Uses sprite assets (`hook.png`, `coin.png`) for rendering rather than vector graphics, for optimized performance.
- **Fishing Line**: Rendered as a straight line using `Graphics.lineTo` rather than complex curves.
- **Payout Animation**: When a fish is caught, it transforms into a coin and uses mathematical tweening (gravity and velocity logic via `dt`) for a smooth bounce effect without overloading the CPU with new object creations every frame.
