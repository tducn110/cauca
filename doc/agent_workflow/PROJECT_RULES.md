# Project Rules

1. **Tech Stack**:
   - React 18
   - TypeScript (strict mode)
   - Vite
   - PixiJS v8.7

2. **Code Quality & Error Handling**:
   - Do not use blanket `catch {}` to swallow errors. Each catch must recover state or fail fast.
   - All exceptions must report area, operation, severity, and useful metadata without spamming every frame.
   - All Promises must handle rejections.

3. **Lifecycle & Cleanup**:
   - All listeners, timers, tickers, ResizeObservers, pointer captures, AudioContext, and Pixi Applications must have idempotent cleanups.
   - Prevent double-destroy by maintaining clear ownership.

4. **Design System & Assets**:
   - Font: `Be Vietnam Pro` (weights: 400, 600, 700, 800).
   - No pure black (`#000`), always use `--ink-dark` (`#2a2418`) for text to keep a warm tone.
   - All runtime assets must have a single source of truth.
   - Verify assets don't return 404 and have correct texture sizes.
   - Do not use raster images for characters, backdrops, or icons unless explicitly specified. Use Pixi Graphics or procedural SVG drawing.

5. **Performance**:
   - Do not set React state at 60 FPS. Throttle the bridge between Pixi and React.
   - Do not create heavy objects (e.g. `new Sprite()`) in the ticker if avoidable. Reuse and pool objects.
