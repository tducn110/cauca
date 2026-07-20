import { useBatCaGame, type EndGameData } from "./hooks/useBatCaGame";
import { GameCanvas } from "./GameCanvas";
import { TutorialOverlay, GameplayHud, UpgradePanel, ShopPanel, RoundFeedback, LevelSummary } from "./ui";
import "./batca.css";

interface Props {
  onEndGame?: (data: EndGameData) => void;
}

export function BatCaAoLang({ onEndGame }: Props) {
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
  } = useBatCaGame(onEndGame);

  const active = mode === "playing";
  const canUseDynamite = game.carrying.some((f) => f.kind.isBad) && (hud.activeBuffs.dynamite ?? 0) > 0;

  return (
    <div className="batca-root">
      <div className="batca-frame">
        <GameCanvas game={game} active={active} onHud={onHud} />

        <div className="batca-overlay">
          {(mode === "playing" || mode === "levelSummary") && (
            <GameplayHud
              hud={hud}
              castsLeft={castsLeft}
              castsPerRound={levelDef.casts}
              currentLevel={currentLevel}
              levelTime={levelDef.time}
              canUseDynamite={canUseDynamite}
              onOpenUpgrade={openUpgrade}
              onUseDynamite={useDynamite}
            />
          )}

          {mode === "start" && (
            <TutorialOverlay onReady={play} />
          )}

          {mode === "playing" && lastFeedback && (
            <RoundFeedback feedback={lastFeedback} onDone={() => {}} />
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
