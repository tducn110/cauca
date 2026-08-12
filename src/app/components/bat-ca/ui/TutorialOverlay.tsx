import { useEffect, useState } from "react";

interface Props {
  onReady: () => void;
}

export function TutorialOverlay({ onReady }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onReady();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onReady]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(42,36,24,0.6)] backdrop-blur-[2px] pointer-events-none">
      <div className="text-center px-8 animate-tutorial-pulse">
        <div className="text-5xl mb-6 animate-bounce">🎣</div>
        <div className="text-white text-xl font-extrabold mb-3 drop-shadow-lg">
          Giữ để thả lưới
        </div>
        <div className="text-white/80 text-lg font-bold drop-shadow-md">
          Thả tay để kéo lên
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <span className="text-2xl">👇</span>
          </div>
        </div>
      </div>
    </div>
  );
}

