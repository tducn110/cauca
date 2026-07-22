export type MainPhase =
  | "boot"
  | "dock-idle"
  | "power-selecting"
  | "underwater-descending"
  | "underwater-ascending"
  | "catch-result";

export type PanelOverlay = "none" | "hooks" | "aquarium";

export type ModalOverlay = "none" | "settings" | "offline-earnings" | "reward";

export interface GameStateArchitecture {
  phase: MainPhase;
  panel: PanelOverlay;
  modal: ModalOverlay;
}

const LEGAL_TRANSITIONS: Record<MainPhase, MainPhase[]> = {
  boot: ["dock-idle"],
  "dock-idle": ["power-selecting", "dock-idle"],
  "power-selecting": ["underwater-descending", "dock-idle"],
  "underwater-descending": ["underwater-ascending"],
  "underwater-ascending": ["catch-result"],
  "catch-result": ["dock-idle"],
};

export function isValidPhaseTransition(from: MainPhase, to: MainPhase): boolean {
  if (from === to) return true;
  const allowed = LEGAL_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function transitionPhase(
  current: GameStateArchitecture,
  nextPhase: MainPhase,
): GameStateArchitecture {
  if (!isValidPhaseTransition(current.phase, nextPhase)) {
    throw new Error(`Invalid state machine transition from '${current.phase}' to '${nextPhase}'`);
  }
  return {
    ...current,
    phase: nextPhase,
    // Close modal & panels when entering gameplay
    panel: nextPhase.startsWith("underwater") || nextPhase === "power-selecting" ? "none" : current.panel,
    modal: nextPhase.startsWith("underwater") || nextPhase === "power-selecting" ? "none" : current.modal,
  };
}
