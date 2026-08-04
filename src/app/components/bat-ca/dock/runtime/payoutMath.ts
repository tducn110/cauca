import type { FishKind } from "../../game/types";

export function calculateFishPayout(
  kind: Pick<FishKind, "isBad" | "value">,
  valueMultiplier: number,
): number {
  if (kind.isBad) return 0;
  const safeMultiplier = Number.isFinite(valueMultiplier)
    ? Math.max(0, valueMultiplier)
    : 1;
  return Math.round(kind.value * safeMultiplier);
}
