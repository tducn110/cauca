import { Sparkles, ArrowRight, Fish } from "lucide-react";
import { CatchSummary } from "./FishingDockCanvas";
import { useTranslation, Trans } from "react-i18next";

interface CatchResultOverlayProps {
  summary: CatchSummary;
  onCollect: () => void;
}

export function CatchResultOverlay({ summary, onCollect }: CatchResultOverlayProps) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language).startsWith("en") ? "en-US" : "vi-VN";
  return (
    <div className="fishing-dock-screen__backdrop">
      <section
        className="w-[min(400px,100%)] rounded-[32px] bg-white border-2 border-slate-300 border-b-[4px] overflow-hidden flex flex-col text-center"
      >
        {/* Header */}
        <div className="bg-white p-5 text-center relative border-b-2 border-slate-300">
          <div className="flex justify-center items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" strokeWidth={3} />
            <h2 className="text-2xl font-black text-black m-0 uppercase tracking-wide">
              {t("results.title")}
            </h2>
            <Sparkles className="w-5 h-5 text-orange-500" strokeWidth={3} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-white flex flex-col items-center">
          {/* Total Money Earned Display */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-sm font-black uppercase tracking-widest text-gray-500">{t("results.earnings")}</span>
            <div className="mt-1 w-full p-4 rounded-[20px] bg-yellow-400 border-2 border-yellow-600 border-b-[3px] flex items-center justify-center gap-2">
              <span className="text-4xl font-black text-black tracking-tighter">
                +{summary.earned.toLocaleString(locale)}{locale === "vi-VN" ? "đ" : ""}
              </span>
            </div>
          </div>

          {/* Caught Fish Count Pill */}
          <div className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-[20px] bg-gray-100 border-2 border-slate-200 border-b-2 text-black text-sm font-black uppercase">
            <Fish className="w-5 h-5 text-orange-500" strokeWidth={3} />
            <span><Trans i18nKey="results.caught" values={{ count: summary.caughtCount }} components={{ strong: <strong className="text-orange-500 text-lg" /> }} /></span>
          </div>

          {/* Action Collect Button */}
          <button
            type="button"
            onClick={onCollect}
            className="w-full mt-2 py-4 rounded-[20px] bg-orange-500 text-white font-black text-xl uppercase tracking-wider border-2 border-orange-600 border-b-[3px] transition-all hover:bg-orange-600 active:border-b-2 active:translate-y-[2px] flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>{t("results.collect")}</span>
            <ArrowRight className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>
      </section>
    </div>
  );
}
