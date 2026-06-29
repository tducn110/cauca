import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Game, LOGICAL_WIDTH, LOGICAL_HEIGHT, HudSnapshot, Input } from "./engine";
import { renderScene } from "./render";

type Props = {
  game: Game;
  active: boolean; // có cho phép input thả lưới không (mode playing)
  onHud: (hud: HudSnapshot) => void;
};

export function GameCanvas({ game, active, onHud }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<Input>({ holding: false });
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
      game.update(dt, activeRef.current ? inputRef.current : { holding: false });
      renderScene(ctx, game);
      hudAcc += dt;
      if (hudAcc > 0.1) { hudAcc = 0; onHud(game.hud()); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [game, onHud]);

  const press = (e: ReactPointerEvent) => {
    e.preventDefault();
    inputRef.current.holding = true;
  };
  const release = () => { inputRef.current.holding = false; };

  return (
    <div className="batca-stage">
      <canvas
        ref={canvasRef}
        className="batca-canvas"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
      />
    </div>
  );
}
