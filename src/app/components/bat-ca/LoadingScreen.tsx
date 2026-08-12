import { useEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  progress: number;
  onDone: () => void;
  completeDelayMs?: number;
  exiting?: boolean;
}

const leafColors = ["#74884f", "#9aac64", "#aebc72", "#d7dfa4", "#f0b840"];

const ambientLeaves = Array.from({ length: 24 }, (_, index) => ({
  left: (index * 37) % 100,
  size: 14 + ((index * 11) % 24),
  fall: 5.1 + ((index * 7) % 50) / 10,
  sway: 1.4 + ((index * 5) % 18) / 10,
  delay: ((index * 13) % 60) / 10,
  drift: (index % 2 === 0 ? 1 : -1) * (22 + ((index * 17) % 92)),
  rot: (index % 2 === 0 ? 1 : -1) * (170 + ((index * 19) % 260)),
  swayX: 10 + ((index * 23) % 36),
  color: leafColors[index % leafColors.length],
}));

const burstLeaves = Array.from({ length: 42 }, (_, index) => {
  const angle = (-172 + (344 / 41) * index) * (Math.PI / 180);
  const distance = 150 + ((index * 29) % 320);
  return {
    tx: Math.cos(angle) * distance,
    ty: Math.sin(angle) * distance - 88 - ((index * 31) % 130),
    size: 13 + ((index * 17) % 28),
    rotate: (index % 2 === 0 ? 1 : -1) * (260 + ((index * 37) % 600)),
    scale: 0.72 + ((index * 7) % 90) / 100,
    delay: ((index * 3) % 18) / 100,
    color: leafColors[index % leafColors.length],
  };
});

export function LoadingScreen({ progress, onDone, completeDelayMs = 1150, exiting = false }: Props) {
  const [complete, setComplete] = useState(false);
  const completedRef = useRef(false);
  const safeProgress = Math.max(0, Math.min(100, progress));

  useEffect(() => {
    if (safeProgress < 100 || completedRef.current) return;
    completedRef.current = true;
    setComplete(true);
    const timer = window.setTimeout(onDone, completeDelayMs);
    return () => window.clearTimeout(timer);
  }, [completeDelayMs, safeProgress, onDone]);

  const classNames = [
    "screen-loading",
    complete ? "is-complete" : "",
    exiting ? "is-exiting" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={classNames} aria-busy={!complete} aria-label="Đang tải mini-game">
      {/* Countryside Background SVG instead of external image */}
      <svg
        className="screen-loading-bg absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="sky-loading" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5ecd7" />
            <stop offset="100%" stopColor="#efe3c4" />
          </linearGradient>
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f8c860" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#efe3c4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sky-loading)" />
        <circle cx="800" cy="450" r="600" fill="url(#sun-glow)" />

        {/* Dynamic hills */}
        <path d="M0,600 Q400,520 800,580 T1600,600 L1600,900 L0,900 Z" fill="#efe3c4" opacity="0.5" />
        <path d="M0,650 Q400,720 900,660 T1600,700 L1600,900 L0,900 Z" fill="#c8d68a" opacity="0.3" />
        
        {/* Draw a beautiful fishing net / ripples theme in center */}
        <circle cx="800" cy="450" r="120" fill="none" stroke="#2a2418" strokeWidth="1.5" strokeDasharray="6,6" opacity="0.25" />
        <circle cx="800" cy="450" r="80" fill="none" stroke="#2a2418" strokeWidth="1" opacity="0.15" />
      </svg>

      <div className="leaf-layer" aria-hidden="true">
        {ambientLeaves.map((leaf, index) => (
          <span key={index} className="ambient-leaf" style={{
            left: `${leaf.left}%`,
            width: `${leaf.size}px`,
            height: `${leaf.size * 0.46}px`,
            animationName: "leaf-fall, leaf-sway",
            animationDuration: `${leaf.fall}s, ${leaf.sway}s`,
            animationTimingFunction: "linear, ease-in-out",
            animationIterationCount: "infinite, infinite",
            animationDelay: `${leaf.delay}s, ${leaf.delay * 0.35}s`,
            "--drift": `${leaf.drift}px`,
            "--rot": `${leaf.rot}deg`,
            "--sway-x": `${leaf.swayX}px`,
            "--leaf-color": leaf.color,
          } as CSSProperties} />
        ))}
      </div>

      <div className="burst-layer" aria-hidden="true">
        {burstLeaves.map((leaf, index) => (
          <span key={index} className="burst-leaf" style={{
            position: "absolute",
            left: "50%",
            top: "58%",
            width: `${leaf.size}px`,
            height: `${leaf.size * 0.46}px`,
            "--tx": `${leaf.tx}px`,
            "--ty": `${leaf.ty}px`,
            "--scale": leaf.scale,
            "--r": `${leaf.rotate}deg`,
            "--burst-delay": `${leaf.delay}s`,
            "--leaf-color": leaf.color,
            animationName: complete ? "leaf-burst" : "none",
            animationDuration: complete ? "1160ms" : "0s",
            animationTimingFunction: complete ? "cubic-bezier(.18,.72,.22,1)" : "ease",
            animationFillMode: complete ? "forwards" : "none",
            animationDelay: `${leaf.delay}s`,
          } as CSSProperties} />
        ))}
      </div>

      <div className="screen-loading-content">
        <div className="loading-progress-area">
          <div className="loading-progress-meta">
            <span className="loading-status">{complete ? "Sẵn sàng!" : "Đang chuẩn bị ao cá..."}</span>
            <span className="loading-percent">{Math.round(safeProgress)}%</span>
          </div>
          <div className="loading-progress-shell" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safeProgress)}>
            <div className="loading-progress-fill" style={{ width: `${safeProgress}%` }} />
            <div className="loading-progress-tip" style={{ left: `${safeProgress}%` }} aria-hidden="true">
              <i /><i /><i /><i />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
