import { useBatCaGame, type EndGameData } from "./hooks/useBatCaGame";
import { GameCanvas } from "./GameCanvas";
import { TutorialOverlay, GameplayHud, UpgradePanel, ShopPanel, RoundFeedback, LevelSummary } from "./ui";
import { CatchResultScreen } from "./ui/CatchResultScreen";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { showInterstitial } from "../../../integrations/ads/googleH5Ads";
import "./batca.css";

interface Props {
  onEndGame?: (data: EndGameData) => void;
  initialCastPower?: number;
}

export function BatCaAoLang({ onEndGame, initialCastPower }: Props) {
  const [adTransitionPending, setAdTransitionPending] = useState(false);
  const {
    game,
    mode,
    hud,
    levelDef,
    currentLevel,
    totalScore,
    levelScore,
    levelFishCaught,
    castsLeft,
    lastFeedback,
    hasAffordableUpgrade,
    canOpenUpgrade,
    newlyDiscovered,
    refresh,
    onHud,
    play,
    startNextLevel,
    endGame,
    openUpgrade,
    closeUpgrade,
    openShop,
    closeShop,
    useDynamite,
    dismissFeedback,
  } = useBatCaGame(onEndGame, initialCastPower);

  const active = mode === "playing";
  const canUseDynamite = game.carrying.some((f) => f.kind.isBad) && (hud.activeBuffs.dynamite ?? 0) > 0;
  const runTransitionAd = async (name: string, action: () => void) => {
    if (adTransitionPending) return;
    setAdTransitionPending(true);
    await showInterstitial({ type: "next", name });
    action();
    setAdTransitionPending(false);
  };

  return (
    <div className="batca-root">
      <div className="batca-frame">
        <GameCanvas game={game} active={active} onHud={onHud} />

        <div className="batca-overlay">
          {mode === "playing" && (
            <button
              onClick={endGame}
              className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-[7] w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[rgba(255,255,255,0.9)] border border-[rgba(138,125,101,0.2)] text-ink-dark font-extrabold text-[13px] cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(42,36,24,0.06)]"
              aria-label="Kết thúc chuyến câu"
            >
              <ArrowLeft size={18} className="sm:hidden" />
              <span className="hidden sm:inline">↩ Kết thúc</span>
            </button>
          )}

          {(mode === "playing" || mode === "levelSummary") && (
            <GameplayHud
              hud={hud}
              castsLeft={castsLeft}
              castsPerRound={levelDef.casts}
              currentLevel={currentLevel}
              levelTime={levelDef.time}
              levelScore={levelScore}
              levelTarget={levelDef.target}
              canUseDynamite={canUseDynamite}
              canOpenUpgrade={canOpenUpgrade}
              onOpenUpgrade={openUpgrade}
              onUseDynamite={useDynamite}
            />
          )}

          {mode === "start" && (
            <TutorialOverlay onReady={play} />
          )}

          {mode === "result" && lastFeedback && (
            <CatchResultScreen
              disabled={adTransitionPending}
              earned={lastFeedback.earned}
              totalFishCaught={lastFeedback.items.filter((i) => !i.isBad).length}
              caughtItems={lastFeedback.items}
              newlyDiscovered={newlyDiscovered}
              onContinue={() => runTransitionAd("return_to_dock", endGame)}
            />
          )}

          {mode === "playing" && lastFeedback && (
            <RoundFeedback feedback={lastFeedback} onDone={dismissFeedback} />
          )}

          {mode === "levelSummary" && (
            <LevelSummary
              transitionPending={adTransitionPending}
              levelDef={levelDef}
              levelScore={levelScore}
              levelFishCaught={levelFishCaught}
              totalScore={totalScore}
              hasAffordableUpgrade={hasAffordableUpgrade}
              nextLevelBuffs={game.nextLevelBuffs}
              onNextLevel={() => runTransitionAd("next_fishing_level", startNextLevel)}
              onUpgrade={openUpgrade}
              onShop={openShop}
              onEndGame={endGame}
            />
          )}

          {mode === "upgrade" && (
            <UpgradePanel
              game={game}
              money={hud.money}
              onBuy={refresh}
              onClose={closeUpgrade}
            />
          )}

          {mode === "shop" && (
            <ShopPanel
              game={game}
              money={hud.money}
              onBuy={refresh}
              onClose={closeShop}
            />
          )}
        </div>
      </div>
    </div>
  );
}
