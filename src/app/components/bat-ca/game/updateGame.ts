import { LOGICAL_WIDTH, LOGICAL_HEIGHT, SURFACE_Y } from "./constants";
import { netSizeBonus, tickBuffs } from "./buffs";
import { clamp } from "./math";
import { sellCatch } from "./economySystem";
import { spawnFish, updateFish } from "./fishSystem";
import { startDrop, startPull, updateNet } from "./fishingSystem";
import type { CaughtSummary, GameState, Input } from "./types";

export function updateGame(state: GameState & { onSell?: (summary: CaughtSummary) => void }, input: Input, dt: number) {
  const elapsedDt = clamp(dt, 0, 0.2);
  const physicsDt = clamp(dt, 0, 0.05);
  const addFeedback = (x: number, y: number, text: string, color: string) => {
    state.feedback.push({ id: state.feedback.length + state.ripples.length + 1, x, y, text, color, age: 0, life: 1.1 });
  };
  const addRipple = (x: number, y: number, r = 6, life = 0.8) => {
    state.ripples.push({ id: state.feedback.length + state.ripples.length + 1, x, y, r, age: 0, life });
  };
  const triggerShake = (amount: number) => {
    state.shake = Math.max(state.shake, amount);
  };

  let netResult: ReturnType<typeof updateNet> = null;
  if (state.mode === "playing") {
    tickBuffs(state, elapsedDt);
    state.levelTimeLeft = Math.max(0, state.levelTimeLeft - elapsedDt);

    if (state.levelTimeLeft <= 0 && !state.timeUp) {
      state.timeUp = true;
      state.net.stun = 0;
      if (state.net.state !== "pulling") {
        state.net.state = "pulling";
        state.net.tension = 1;
      }
    }

    if (input.hasPointer && state.net.state !== "pulling") {
      const netRadius = state.stats.netSize + netSizeBonus(state);
      const targetX = clamp(input.pointerX, 28 + netRadius, LOGICAL_WIDTH - 28 - netRadius);
      state.net.x += (targetX - state.net.x) * Math.min(1, physicsDt * (state.net.state === "idle" ? 16 : 8));
    }
    if (!state.timeUp && input.justPressed) {
      startDrop(state.net, () => addRipple(state.net.x, SURFACE_Y, 9, 0.6), state.mode);
    }
    if (!state.timeUp && (input.justReleased || (input.pointerDown && input.gestureDeltaY <= -10))) {
      startPull(state.net, () => addRipple(state.net.x, state.net.y, 5, 0.45));
    }

    netResult = updateNet(state, input, state.timeUp ? elapsedDt : physicsDt, addFeedback, addRipple);
  }

  if (netResult === "sell") {
    const summary = sellCatch(state.carrying, state.stats, state.net.x, state.combo, addFeedback, addRipple, triggerShake);
    state.lastSummary = summary;
    state.lastCatchValue = summary.earned;
    state.net.state = "idle";
    state.mode = "result";
    state.onSell?.(summary);
  }

  if (state.mode === "playing") {
    updateFish(state.fish, state.net, physicsDt, state.cameraY, state.levelBottomY, state.level);

    const aliveFree = state.fish.filter((f) => !f.caught).length;
    if (aliveFree < 14 && state.fish.length < 22) {
      if (Math.random() < physicsDt * 4) {
        state.fish.push(spawnFish(state.levelBottomY, state.cameraY, state.level));
      }
    }
  }
  if (state.net.state === "idle") state.fish = state.fish.filter((f) => !f.caught);

  for (const t of state.feedback) { t.age += physicsDt; t.y -= physicsDt * 24; }
  state.feedback = state.feedback.filter((t) => t.age < t.life);
  for (const rp of state.ripples) { rp.age += physicsDt; rp.r += physicsDt * 60; }
  state.ripples = state.ripples.filter((rp) => rp.age < rp.life);
  state.shake = Math.max(0, state.shake - physicsDt * 6);

  const targetCameraY = clamp(state.net.y - LOGICAL_HEIGHT * 0.4, 0, Math.max(0, state.levelBottomY - LOGICAL_HEIGHT + 200));
  state.cameraY += (targetCameraY - state.cameraY) * Math.min(1, physicsDt * 5);
}
