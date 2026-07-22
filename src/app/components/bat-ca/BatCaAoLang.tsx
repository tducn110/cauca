import { useBatCaGame, type EndGameData } from "./hooks/useBatCaGame";
import { GameCanvas } from "./GameCanvas";
import { TutorialOverlay, GameplayHud, UpgradePanel, ShopPanel, RoundFeedback, LevelSummary } from "./ui";
import { CatchResultScreen } from "./ui/CatchResultScreen";
import { ArrowLeft } from "lucide-react";
import "./batca.css";

interface Props {
  onEndGame?: (data: EndGameData) => void;
  initialCastPower?: number;
}

export function BatCaAoLang({ onEndGame, initialCastPower }: Props) {
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

  return (
    <div className="batca-root">
      <div className="batca-frame">
        <GameCanvas game={game} active={active} onHud={onHud} />

        <div className="batca-overlay">
          {mode === "playing" && (
            <button
              onClick={endGame}
              className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-[7] w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[rgba(255,255,255,0.9)] border border-pencil text-ink-dark font-extrabold text-[13px] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
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
              earned={lastFeedback.earned}
              totalFishCaught={lastFeedback.items.filter((i) => !i.isBad).length}
              caughtItems={lastFeedback.items}
              newlyDiscovered={newlyDiscovered}
              isNewBest={lastFeedback.earned > hud.bestMoney}
              bestScore={hud.bestMoney}
              onContinue={endGame}
            />
          )}

          {mode === "playing" && lastFeedback && (
            <RoundFeedback feedback={lastFeedback} onDone={dismissFeedback} />
          )}

          {mode === "levelSummary" && (
            <LevelSummary
              levelDef={levelDef}
              levelScore={levelScore}
              levelFishCaught={levelFishCaught}
              totalScore={totalScore}
              hasAffordableUpgrade={hasAffordableUpgrade}
              nextLevelBuffs={game.nextLevelBuffs}
              onNextLevel={startNextLevel}
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
