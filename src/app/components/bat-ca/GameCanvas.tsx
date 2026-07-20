import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { EMPTY_INPUT, Game, LOGICAL_WIDTH, LOGICAL_HEIGHT, HudSnapshot, Input } from "./engine";
import { renderScene } from "./render";

type Props = {
  game: Game;
  active: boolean; // có cho phép input thả lưới không (mode playing)
  onHud: (hud: HudSnapshot) => void;
};

export function GameCanvas({ game, active, onHud }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<Input>({ ...EMPTY_INPUT });
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const resize = () => {
      const parent = canvas.parentElement!;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // fit theo chiều dọc và ngang, giữ tỉ lệ 390:844
      const scale = Math.min(rect.width / LOGICAL_WIDTH, rect.height / LOGICAL_HEIGHT);
      const cssW = LOGICAL_WIDTH * scale;
      const cssH = LOGICAL_HEIGHT * scale;
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      canvas.width = Math.round(LOGICAL_WIDTH * scale * dpr);
      canvas.height = Math.round(LOGICAL_HEIGHT * scale * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      game.update(dt, activeRef.current ? inputRef.current : EMPTY_INPUT);
      renderScene(ctx, game);
      if (activeRef.current) {
        inputRef.current.justPressed = false;
        inputRef.current.justReleased = false;
        inputRef.current.deltaY = 0;
      } else {
        inputRef.current = { ...EMPTY_INPUT };
      }
      hudAcc += dt;
      if (hudAcc > 0.1) { hudAcc = 0; onHud(game.hud()); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [game, onHud]);

  const pointerToLogical = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    return {
      x: Math.max(0, Math.min(LOGICAL_WIDTH, x)),
      y: Math.max(0, Math.min(LOGICAL_HEIGHT, y)),
    };
  };

  const updatePointer = (e: ReactPointerEvent<HTMLCanvasElement>, accumulateDelta: boolean) => {
    const point = pointerToLogical(e);
    const input = inputRef.current;
    const prevY = input.hasPointer ? input.pointerY : point.y;
    input.pointerX = point.x;
    input.pointerY = point.y;
    input.hasPointer = true;
    if (accumulateDelta) input.deltaY += point.y - prevY;
  };

  const press = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!activeRef.current) return;
    updatePointer(e, false);
    inputRef.current.pointerDown = true;
    inputRef.current.justPressed = true;
    inputRef.current.justReleased = false;
    inputRef.current.deltaY = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    e.preventDefault();
    updatePointer(e, true);
  };
  const release = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (inputRef.current.pointerDown) inputRef.current.justReleased = true;
    inputRef.current.pointerDown = false;
    updatePointer(e, false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="batca-stage">
      <canvas
        ref={canvasRef}
        className="batca-canvas"
        onPointerDown={press}
        onPointerMove={move}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
      />
    </div>
  );
}
