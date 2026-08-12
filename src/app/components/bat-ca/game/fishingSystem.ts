import { SURFACE_Y } from "./constants";
import { netSizeBonus, pullSpeedMult } from "./buffs";
import { clamp, rand } from "./math";
import type { GameState, Input, NetState } from "./types";

const FORCED_RETURN_SPEED = 1200;
const MAX_POINTER_STEP = 280;

export function startDrop(net: { state: NetState; pulse: number }, addRipple: () => void, mode: string) {
  if (mode !== "playing") return false;
  if (net.state === "idle") {
    net.state = "dropping";
    net.pulse = Math.max(net.pulse, 0.35);
    addRipple();
    return true;
  }
  return false;
}

export function startPull(net: { state: NetState; tension: number; pulse: number }, addRipple: () => void) {
  if (net.state === "dropping") {
    net.state = "pulling";
    net.tension = 1;
    net.pulse = Math.max(net.pulse, 0.45);
    addRipple();
    return true;
  }
  return false;
}

function effectivePullSpeed(base: number, state: GameState) {
  const totalWeight = state.carrying.reduce((sum, f) => sum + f.kind.weight, 0);
  const weightMult = Math.max(0.25, 1 - totalWeight * 0.04);
  return base * pullSpeedMult(state) * weightMult;
}

export function updateNet(
  state: GameState,
  input: Input,
  dt: number,
  addFeedback: (x: number, y: number, text: string, color: string) => void,
  addRipple: (x: number, y: number, r?: number, life?: number) => void,
) {
  const net = state.net;
  const stats = state.stats;
  const carrying = state.carrying;
  const fish = state.fish;
  const combo = state.combo;

  net.tension = Math.max(0, net.tension - dt * 5);
  net.pulse = Math.max(0, net.pulse - dt * 4);

  if (net.state === "dropping") {
    const dragStep = input.pointerDown ? clamp(input.deltaY * 2.5, 0, MAX_POINTER_STEP) : 0;
    net.y += stats.dropSpeed * dt + dragStep;
    if (net.y >= state.levelBottomY) {
      net.y = state.levelBottomY;
      net.state = "pulling";
      net.tension = 1;
    }
  } else if (net.state === "pulling") {
    if (state.timeUp) {
      net.stun = 0;
    } else if (net.stun > 0) {
      net.stun = Math.max(0, net.stun - dt);
      return null;
    }

    const pullStep = !state.timeUp && input.pointerDown
      ? clamp(-input.deltaY * 2.5, 0, MAX_POINTER_STEP)
      : 0;
    const pullSpeed = state.timeUp ? FORCED_RETURN_SPEED : effectivePullSpeed(stats.pullSpeed, state);
    net.y -= pullSpeed * dt + pullStep;

    if (!state.timeUp && carrying.length < stats.capacity) {
      for (const f of fish) {
        if (f.caught) continue;
        const dx = f.x - net.x;
        const dy = f.y - net.y;
        const rr = stats.netSize + netSizeBonus(state) + f.size;
        if (dx * dx + dy * dy <= rr * rr) {
          f.caught = true;
          carrying.push(f);
          f.flash = 0.35;

          if (!f.kind.isBad) {
            combo.count += 1;
            combo.species = f.kind.type;
          }
          f.catchOrder = combo.count;

          const value = f.overrideValue ?? f.kind.value;
          let label = f.kind.isBad ? `${f.kind.name}` : `${f.kind.name} +${value}đ`;
          let color: string = f.kind.isBad ? "#c23838" : value >= 70 ? "#f0b840" : "#6b8e3d";

          if (f.kind.behavior === "mystery") {
            if (f.overrideValue === undefined) f.overrideValue = Math.floor(rand(40, 180));
            label = `Túi bí ẩn +${f.overrideValue}đ`;
            color = "#8e4e22";
            addFeedback(f.x, f.y - 18, "Bí ẩn!", "#f0b840");
          } else if (f.kind.behavior === "golden") {
            label = `Cá vàng +${value}đ`;
            color = "#f0b840";
            addFeedback(f.x, f.y - 18, "Cá vàng!", "#f0b840");
          } else if (f.kind.behavior === "electric") {
            net.stun = 1.2;
            label = "Giật!";
            color = "#5aa8c7";
            addFeedback(f.x, f.y - 18, "Lươn điện!", "#5aa8c7");
          } else if (value >= 70) {
            addFeedback(f.x, f.y - 18, "Cá hiếm!", "#f0b840");
          }

          addFeedback(f.x, f.y, label, color);
          addRipple(f.x, f.y, 4, 0.42);
          net.pulse = Math.max(net.pulse, 0.25);

          if (!f.kind.isBad && combo.count > 1) {
            addFeedback(f.x, f.y - 30, `Combo x${combo.count}!`, "#e87432");
          }

          if (carrying.length >= stats.capacity) break;
        }
      }
    }

    if (net.y <= SURFACE_Y) {
      net.y = SURFACE_Y;
      return "sell";
    }
  }
  return null;
}
