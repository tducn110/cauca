import { useEffect, useRef } from "react";
import type { CaughtSummary } from "../engine";
import { ROUND_FEEDBACK_DURATION_MS } from "../game/constants";

interface Props {
  feedback: CaughtSummary | null;
  onDone: () => void;
}

export function RoundFeedback({ feedback, onDone }: Props) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => onDoneRef.current(), ROUND_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!feedback) return null;

  const hasTrash = feedback.items.some((item) => item.isBad);

  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-fade-in-out">
      <div className="bg-[rgba(42,36,24,0.85)] backdrop-blur-sm rounded-2xl px-6 py-4 text-center shadow-lg">
        {feedback.earned > 0 ? (
          <div className="text-3xl font-extrabold text-mascot-yellow mb-1">
            +{feedback.earned}đ
          </div>
        ) : (
          <div className="text-xl font-bold text-pencil-gray mb-1">
            Lưới trống!
          </div>
        )}

        {feedback.comboCount > 1 && (
          <div className="text-sm font-extrabold text-orange-cta mb-1">
            🔥 Combo x{feedback.comboCount} (+{Math.round((feedback.comboMultiplier - 1) * 100)}%)
          </div>
        )}

        <div className="flex gap-2 justify-center flex-wrap mt-2">
          {feedback.items
            .filter((item) => !item.isBad)
            .slice(0, 5)
            .map((item, index) => (
              <span key={`${item.name}-${index}`} className="text-sm text-white bg-[rgba(255,255,255,0.15)] px-2 py-0.5 rounded-full">
                {item.name} ×1
              </span>
            ))}
          {hasTrash && (
            <span className="text-sm text-alert-red bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded-full">
              {feedback.badCount} rác
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
