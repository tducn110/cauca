import { describe, expect, it, vi } from "vitest";
import { Container, Graphics } from "pixi.js";
import type { FishKind } from "../../game/types";
import type { DockViewportLayout } from "../dockLayout";
import type { ActiveFish } from "./runtimeTypes";
import {
  destroyFishNodes,
  eligibleFishKindsAtDepth,
  selectWeightedFishKind,
  updateFishPositions,
} from "./fishRenderer";

const baseKind: FishKind = {
  type: "thuong",
  name: "Cá thường",
  value: 100,
  weight: 1,
  depthMin: 0,
  depthMax: 500,
  speed: 10,
  size: 10,
  rarity: 1,
  isBad: false,
  behavior: "normal",
  color: "#000000",
  belly: "#ffffff",
};

function createFish(overrides: Partial<ActiveFish> = {}): ActiveFish {
  const node = new Container();
  const bodyGraphic = new Graphics();
  node.addChild(bodyGraphic);
  return {
    id: 1,
    x: 0,
    depthY: 100,
    vx: 10,
    size: 10,
    node,
    bodyGraphic,
    isCaught: false,
    kind: baseKind,
    ...overrides,
  };
}

const layout = {
  gameplayAxisX: 0,
  waterlineY: 0,
  channelWidth: 800,
  __fishingState: "descending",
} as DockViewportLayout & { __fishingState: string };

describe("fish selection", () => {
  it("filters species by progression level and depth", () => {
    const starter = { ...baseKind, type: "starter", minLevel: 1 };
    const advanced = { ...baseKind, type: "advanced", minLevel: 3 };

    expect(eligibleFishKindsAtDepth([starter, advanced], 100, 1)).toEqual([starter]);
    expect(eligibleFishKindsAtDepth([starter, advanced], 100, 3)).toEqual([starter, advanced]);
    expect(eligibleFishKindsAtDepth([starter, advanced], 600, 3)).toEqual([]);
  });

  it("uses rarity as the weighted selection value", () => {
    const common = { ...baseKind, type: "common", rarity: 9 };
    const rare = { ...baseKind, type: "rare", rarity: 1 };

    expect(selectWeightedFishKind([common, rare], () => 0)).toBe(common);
    expect(selectWeightedFishKind([common, rare], () => 0.89)).toBe(common);
    expect(selectWeightedFishKind([common, rare], () => 0.95)).toBe(rare);
  });
});

describe("fishRenderer updates", () => {
  it("updates effectController exactly once when a fish is in both lists", () => {
    const mockController = {
      update: vi.fn(),
      onCaught: vi.fn(),
      destroy: vi.fn(),
    };
    const fish = createFish({ isCaught: true, effectController: mockController });

    updateFishPositions([fish], [fish], 0, 0, layout, 0.16);

    expect(mockController.update).toHaveBeenCalledTimes(1);
    expect(mockController.update).toHaveBeenCalledWith(0.16, fish);
  });

  it("isolates a throwing effect, disables it, and continues fish movement", () => {
    const updateError = new Error("effect update failed");
    const mockController = {
      update: vi.fn(() => {
        throw updateError;
      }),
      onCaught: vi.fn(),
      destroy: vi.fn(),
    };
    const fish = createFish({ effectController: mockController });
    const reportError = vi.fn();

    updateFishPositions([fish], [], 0, 0, layout, 0.5, reportError);

    expect(reportError).toHaveBeenCalledWith(updateError, "updateSpecialEffect:thuong#1");
    expect(mockController.destroy).toHaveBeenCalledTimes(1);
    expect(fish.effectController).toBeUndefined();
    expect(fish.x).toBe(5);
  });
});

describe("fishRenderer cleanup", () => {
  it("destroys the fish node even when special-effect cleanup throws", () => {
    const destroyError = new Error("effect destroy failed");
    const fish = createFish({
      effectController: {
        update: vi.fn(),
        onCaught: vi.fn(),
        destroy: vi.fn(() => {
          throw destroyError;
        }),
      },
    });
    const reportError = vi.fn();

    destroyFishNodes([fish], [fish], reportError);

    expect(reportError).toHaveBeenCalledWith(destroyError, "destroySpecialEffect:thuong#1");
    expect(fish.node.destroyed).toBe(true);
    expect(fish.effectController).toBeUndefined();
  });
});
