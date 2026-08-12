import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Application } from "pixi.js";
import { EMPTY_INPUT, Game, LOGICAL_WIDTH, LOGICAL_HEIGHT, HudSnapshot, Input } from "./engine";
import { disposeRenderScene, renderScene } from "./render";

type Props = {
  game: Game;
  active: boolean; // có cho phép input thả lưới không (mode playing)
  onHud: (hud: HudSnapshot) => void;
};

export function GameCanvas({ game, active, onHud }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRectRef = useRef<DOMRectReadOnly | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const inputRef = useRef<Input>({ ...EMPTY_INPUT });
  const activeRef = useRef(active);
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  activeRef.current = active;

  useEffect(() => {
    let app: Application | null = null;
    let initialized = false;
    let destroyed = false;
    let resizeObserver: ResizeObserver | null = null;
    let canceled = false;
    let hudAcc = 0;

    const destroyApp = () => {
      if (!app || !initialized || destroyed) return;
      destroyed = true;
      canvasRef.current = null;
      canvasRectRef.current = null;
      disposeRenderScene(app);
      app.destroy({ removeView: true }, { children: true });
      app = null;
    };

    const destroyFailedApp = () => {
      if (!app || destroyed) return;
      destroyed = true;
      canvasRef.current = null;
      canvasRectRef.current = null;
      try {
        app.destroy({ removeView: true }, { children: true });
      } catch {
        try {
          app.stage.destroy({ children: true });
        } catch {
          // Pixi may not have completed enough initialization to own resources.
        }
      }
      app = null;
    };

    const resize = () => {
      const currentApp = app;
      const container = containerRef.current;
      if (!currentApp || !initialized || !container) return;
      const parent = container.parentElement ?? container;
      const rect = parent.getBoundingClientRect();
      if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
        canvasRectRef.current = null;
        return;
      }

      const scale = Math.min(rect.width / LOGICAL_WIDTH, rect.height / LOGICAL_HEIGHT);
      const displayWidth = LOGICAL_WIDTH * scale;
      const displayHeight = LOGICAL_HEIGHT * scale;
      container.style.width = `${displayWidth}px`;
      container.style.height = `${displayHeight}px`;
      currentApp.canvas.style.width = `${displayWidth}px`;
      currentApp.canvas.style.height = `${displayHeight}px`;
      canvasRectRef.current = currentApp.canvas.getBoundingClientRect();
    };

    async function init() {
      const nextApp = new Application();
      app = nextApp;

      try {
        await nextApp.init({
          width: LOGICAL_WIDTH,
          height: LOGICAL_HEIGHT,
          backgroundAlpha: 0,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          // Keep gameplay on the same deterministic renderer path as the dock.
          // Pixi's default WebGPU probe is noisy in browsers without a GPU
          // adapter even though it subsequently falls back to WebGL.
          preference: ["webgl", "canvas"],
        });
        initialized = true;

        const container = containerRef.current;
        if (canceled || !container) {
          destroyApp();
          return;
        }

        setInitError(null);
        canvasRef.current = nextApp.canvas;
        container.appendChild(nextApp.canvas);
        resize();

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container.parentElement ?? container);
        window.visualViewport?.addEventListener("resize", resize);

        nextApp.ticker.minFPS = 5;
        nextApp.ticker.maxFPS = 60;
        nextApp.ticker.add((ticker) => {
          const dt = ticker.deltaMS / 1000;
          game.update(dt, activeRef.current ? inputRef.current : EMPTY_INPUT);
          renderScene(nextApp, game);

          if (activeRef.current) {
            const input = inputRef.current;
            input.justPressed = false;
            input.justReleased = false;
            input.deltaY = 0;
            if (!input.pointerDown) input.gestureDeltaY = 0;
          } else {
            inputRef.current = { ...EMPTY_INPUT };
          }

          hudAcc += dt;
          if (hudAcc > 0.1) {
            hudAcc = 0;
            onHud(game.hud());
          }
        });
      } catch (error) {
        if (!canceled) {
          console.error("Không thể khởi tạo PixiJS", error);
          setInitError("Không thể khởi tạo màn chơi. Hãy tải lại trang.");
        }
        destroyFailedApp();
      }
    }

    void init();

    return () => {
      canceled = true;
      resizeObserver?.disconnect();
      window.visualViewport?.removeEventListener("resize", resize);
      destroyApp();
    };
  }, [game, initAttempt, onHud]);

  useEffect(() => {
    const interruptGesture = () => {
      const input = inputRef.current;
      if (input.pointerDown) input.justReleased = true;
      input.pointerDown = false;
      const pointerId = activePointerIdRef.current;
      if (pointerId !== null && containerRef.current?.hasPointerCapture(pointerId)) {
        try {
          containerRef.current.releasePointerCapture(pointerId);
        } catch {
          // The browser may already have released capture during blur.
        }
      }
      activePointerIdRef.current = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") interruptGesture();
    };

    window.addEventListener("blur", interruptGesture);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", interruptGesture);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (active) return;
    const pointerId = activePointerIdRef.current;
    if (pointerId !== null && containerRef.current?.hasPointerCapture(pointerId)) {
      try {
        containerRef.current.releasePointerCapture(pointerId);
      } catch {
        // Capture can disappear between the check and release.
      }
    }
    activePointerIdRef.current = null;
    inputRef.current = { ...EMPTY_INPUT };
  }, [active]);

  const refreshCanvasRect = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      canvasRectRef.current = null;
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
      canvasRectRef.current = null;
      return null;
    }
    canvasRectRef.current = rect;
    return rect;
  };

  const pointerToLogical = (e: ReactPointerEvent<HTMLDivElement>, refreshRect = false) => {
    const rect = refreshRect ? refreshCanvasRect() : canvasRectRef.current;
    if (!rect) return null;
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      x: Math.max(0, Math.min(LOGICAL_WIDTH, x)),
      y: Math.max(0, Math.min(LOGICAL_HEIGHT, y)),
    };
  };

  const updatePointer = (e: ReactPointerEvent<HTMLDivElement>, accumulateDelta: boolean, refreshRect = false) => {
    const point = pointerToLogical(e, refreshRect);
    if (!point) return false;
    const input = inputRef.current;
    const prevY = input.hasPointer ? input.pointerY : point.y;
    input.pointerX = point.x;
    input.pointerY = point.y;
    input.hasPointer = true;
    if (accumulateDelta) {
      input.deltaY += point.y - prevY;
      input.gestureDeltaY = point.y - input.gestureStartY;
    }
    return true;
  };

  const press = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeRef.current || !e.isPrimary || activePointerIdRef.current !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!updatePointer(e, false, true)) return;

    e.preventDefault();
    const input = inputRef.current;
    activePointerIdRef.current = e.pointerId;
    input.pointerDown = true;
    input.justPressed = true;
    input.justReleased = false;
    input.deltaY = 0;
    input.gestureStartY = input.pointerY;
    input.gestureDeltaY = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return;
    if (activePointerIdRef.current === e.pointerId) {
      e.preventDefault();
      updatePointer(e, true);
    } else if (activePointerIdRef.current === null && e.isPrimary) {
      updatePointer(e, false);
    }
  };

  const finishGesture = (e: ReactPointerEvent<HTMLDivElement>, interrupted: boolean) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    if (!interrupted) updatePointer(e, false);

    const input = inputRef.current;
    if (input.pointerDown) input.justReleased = true;
    input.pointerDown = false;
    activePointerIdRef.current = null;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be gone after a platform interruption.
      }
    }
  };

  const release = (e: ReactPointerEvent<HTMLDivElement>) => finishGesture(e, false);
  const cancel = (e: ReactPointerEvent<HTMLDivElement>) => finishGesture(e, true);
  const lostCapture = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const input = inputRef.current;
    if (input.pointerDown) input.justReleased = true;
    input.pointerDown = false;
    activePointerIdRef.current = null;
  };

  return (
    <div className="batca-stage">
      <div
        ref={containerRef}
        className="batca-canvas"
        onPointerDown={press}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={cancel}
        onLostPointerCapture={lostCapture}
        style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      />
      {initError && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[rgba(42,36,24,0.75)] px-8 text-center text-sm font-bold text-white" role="alert">
          <div className="grid gap-3">
            <span>{initError}</span>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-ink-dark"
              onClick={() => {
                setInitError(null);
                setInitAttempt((attempt) => attempt + 1);
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
