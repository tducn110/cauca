import { LOGICAL_WIDTH, SURFACE_Y } from "./constants";
import { tickBuffs } from "./buffs";
import { clamp } from "./math";
import { sellCatch } from "./economySystem";
import { spawnFish, updateFish } from "./fishSystem";
import { startDrop, startPull, updateNet } from "./fishingSystem";
import type { CaughtSummary, GameState, Input } from "./types";

export function updateGame(state: GameState & { onSell?: (summary: CaughtSummary) => void }, input: Input, dt: number) {
  dt = clamp(dt, 0, 0.05);
  const addFeedback = (x: number, y: number, text: string, color: string) => {
    state.feedback.push({ id: state.feedback.length + state.ripples.length + 1, x, y, text, color, age: 0, life: 1.1 });
  };
  const addRipple = (x: number, y: number, r = 6, life = 0.8) => {
    state.ripples.push({ id: state.feedback.length + state.ripples.length + 1, x, y, r, age: 0, life });
  };
  const triggerShake = (amount: number) => {
    state.shake = Math.max(state.shake, amount);
  };

  tickBuffs(state, dt);

  if (state.mode === "playing") {
    state.levelTimeLeft -= dt;

    if (state.levelTimeLeft <= 0 && !state.timeUp) {
      state.timeUp = true;
      state.net.state = "pulling";
      state.net.tension = 1;
      const summary = sellCatch(
        state.carrying,
        state.stats,
        state.net.x,
        state.combo,
        addFeedback,
        addRipple,
        triggerShake,
      );
      state.lastSummary = summary;
      state.lastCatchValue = summary.earned;
      state.net.y = SURFACE_Y;
      state.net.state = "idle";
      state.mode = "result";
      state.onSell?.(summary);
      return;
    }

    if (input.hasPointer && state.net.state !== "pulling") {
      const targetX = clamp(input.pointerX, 28 + state.stats.netSize, LOGICAL_WIDTH - 28 - state.stats.netSize);
      state.net.x += (targetX - state.net.x) * Math.min(1, dt * (state.net.state === "idle" ? 16 : 8));
    }
    if (input.justPressed || (input.pointerDown && state.net.state === "idle")) startDrop(state.net, () => addRipple(state.net.x, SURFACE_Y, 9, 0.6), state.mode);
    if (input.justReleased || input.deltaY < -8) startPull(state.net, () => addRipple(state.net.x, state.net.y, 5, 0.45));
  }

  const netResult = updateNet(state, input, dt, addFeedback, addRipple);
  if (netResult === "sell") {
    const summary = sellCatch(state.carrying, state.stats, state.net.x, state.combo, addFeedback, addRipple, triggerShake);
    state.lastSummary = summary;
    state.lastCatchValue = summary.earned;
    state.net.state = "idle";
    state.mode = "result";
    state.onSell?.(summary);
  }

  updateFish(state.fish, state.net, state.stats, dt);

  const aliveFree = state.fish.filter((f) => !f.caught).length;
  if (aliveFree < 14 && state.fish.length < 22) {
    if (Math.random() < dt * 4) state.fish.push(spawnFish(state.stats.maxDepth));
  }
  if (state.net.state === "idle") state.fish = state.fish.filter((f) => !f.caught);

  for (const t of state.feedback) { t.age += dt; t.y -= dt * 24; }
  state.feedback = state.feedback.filter((t) => t.age < t.life);
  for (const rp of state.ripples) { rp.age += dt; rp.r += dt * 60; }
  state.ripples = state.ripples.filter((rp) => rp.age < rp.life);
  state.shake = Math.max(0, state.shake - dt * 6);
}
