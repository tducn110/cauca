import { describe, expect, it } from "vitest";
import { Container, Graphics } from "pixi.js";
import type { FishKind, SpecialVisual } from "../../game/types";
import type { ActiveFish } from "./runtimeTypes";
import { createSpecialEffect } from "./specialEffects";

const specialKind: FishKind = {
  type: "hoangkim",
  name: "Golden",
  value: 100,
  weight: 1,
  depthMin: 0,
  depthMax: 100,
  speed: 1,
  size: 10,
  rarity: 1,
  isBad: false,
  behavior: "golden",
  color: "#000000",
  belly: "#ffffff",
  specialVisual: "golden",
};

function createMockFish(kind: FishKind, bodyGraphic = new Graphics()): ActiveFish {
  const node = new Container();
  node.addChild(bodyGraphic);
  return {
    id: 1,
    x: 0,
    depthY: 100,
    vx: 1,
    size: 10,
    node,
    bodyGraphic,
    isCaught: false,
    kind,
  };
}

describe("specialEffects", () => {
  it("returns an idempotent no-op controller for an unknown visual", () => {
    const parent = new Container();
    const bodyGraphic = new Graphics();
    const controller = createSpecialEffect(
      "unknown" as SpecialVisual,
      parent,
      bodyGraphic,
      specialKind,
    );

    expect(parent.children).toHaveLength(0);
    expect(() => {
      controller.destroy();
      controller.destroy();
      controller.update(0.16, createMockFish(specialKind));
      controller.onCaught(createMockFish(specialKind));
    }).not.toThrow();
  });

  for (const visual of ["golden", "electric", "ghost", "rainbow"] as const) {
    it(`${visual} keeps its display-object count bounded`, () => {
      const parent = new Container();
      const bodyGraphic = new Graphics();
      const fish = createMockFish(specialKind, bodyGraphic);
      const controller = createSpecialEffect(visual, parent, bodyGraphic, specialKind);
      const initialChildren = [...parent.children];

      for (let i = 0; i < 1_000; i += 1) {
        controller.update(0.016, fish);
      }
      controller.onCaught(fish);
      controller.onCaught(fish);
      for (let i = 0; i < 100; i += 1) {
        controller.update(0.016, fish);
      }

      expect(parent.children).toHaveLength(initialChildren.length);
      expect(parent.children).toEqual(initialChildren);
    });

    it(`${visual} destroys owned nodes and ignores later calls`, () => {
      const parent = new Container();
      const bodyGraphic = new Graphics();
      const fish = createMockFish(specialKind, bodyGraphic);
      const controller = createSpecialEffect(visual, parent, bodyGraphic, specialKind);
      const ownedChildren = [...parent.children];

      controller.onCaught(fish);
      controller.update(0.1, fish);
      controller.destroy();
      controller.destroy();

      expect(ownedChildren.every((child) => child.destroyed)).toBe(true);
      expect(parent.children).toHaveLength(0);
      expect(bodyGraphic.position.x).toBe(0);
      expect(bodyGraphic.position.y).toBe(0);
      expect(bodyGraphic.scale.x).toBe(1);
      expect(bodyGraphic.scale.y).toBe(1);
      expect(bodyGraphic.alpha).toBe(1);

      expect(() => {
        controller.update(0.16, fish);
        controller.onCaught(fish);
      }).not.toThrow();
      expect(parent.children).toHaveLength(0);
    });
  }
});
