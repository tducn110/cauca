import { Graphics } from "pixi.js";
import type { FishKind } from "../../game/types";

export function drawFishShape(target: Graphics, kind: FishKind, size: number): void {
  target.clear();
  if (kind.isBad) {
    target.ellipse(0, 0, size, size * 0.6).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
    target.moveTo(-size * 0.4, -size * 0.2).lineTo(size * 0.4, -size * 0.5).stroke({ color: "#2a2418", width: 1.2 });
    return;
  }

  if (kind.type === "tom") {
    target.arc(0, 0, size, 0.2, Math.PI * 1.8).stroke({ color: "#2a2418", width: 1.2 });
    target.ellipse(0, 0, size * 0.9, size * 0.55).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
    target.moveTo(size, -2).lineTo(size + 6, -6).moveTo(size, 2).lineTo(size + 6, 6).stroke({ color: "#2a2418", width: 1.2 });
    return;
  }

  if (kind.type === "cua") {
    target.ellipse(0, 0, size, size * 0.7).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
    target.moveTo(-size, 0).lineTo(-size - 6, -4).moveTo(size, 0).lineTo(size + 6, -4);
    target.moveTo(-size * 0.6, size * 0.5).lineTo(-size * 0.6, size + 4);
    target.moveTo(size * 0.6, size * 0.5).lineTo(size * 0.6, size + 4);
    target.stroke({ color: "#2a2418", width: 1.2 });
    return;
  }

  target
    .moveTo(-size * 0.9, 0)
    .lineTo(-size * 1.7, -size * 0.7)
    .lineTo(-size * 1.7, size * 0.7)
    .closePath()
    .fill(kind.color)
    .stroke({ color: "#2a2418", width: 1.2 });
  target.ellipse(0, 0, size * 1.3, size * 0.75).fill(kind.color).stroke({ color: "#2a2418", width: 1.2 });
  target
    .moveTo(-size * 0.2, -size * 0.7)
    .lineTo(size * 0.3, -size * 1.1)
    .lineTo(size * 0.5, -size * 0.6)
    .closePath()
    .fill(kind.color)
    .stroke({ color: "#2a2418", width: 1.2 });
  target.circle(size * 0.7, -size * 0.1, size * 0.22).fill("#ffffff");
  target.circle(size * 0.75, -size * 0.1, size * 0.1).fill("#2a2418");
}
