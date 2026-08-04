import { Container, Graphics, Text } from "pixi.js";
import type { FishKind, SpecialVisual } from "../../game/types";
import type { ActiveFish } from "./runtimeTypes";
import { drawFishShape } from "./fishShape";

export interface SpecialEffectController {
  update: (dt: number, fish: ActiveFish) => void;
  onCaught: (fish: ActiveFish) => void;
  destroy: () => void;
}

type OwnedNode = Graphics | Text;

function createNoopEffect(): SpecialEffectController {
  return {
    update: () => {},
    onCaught: () => {},
    destroy: () => {},
  };
}

function resetBodyGraphic(bodyGraphic: Graphics): void {
  if (bodyGraphic.destroyed) return;
  bodyGraphic.position.set(0, 0);
  bodyGraphic.scale.set(1);
  bodyGraphic.alpha = 1;
}

function destroyOwnedNodes(nodes: readonly OwnedNode[]): void {
  let firstError: unknown;
  let hasError = false;

  for (const node of nodes) {
    if (node.destroyed) continue;

    try {
      node.removeFromParent();
    } catch (error) {
      if (!hasError) {
        firstError = error;
        hasError = true;
      }
    }

    try {
      node.destroy();
    } catch (error) {
      if (!hasError) {
        firstError = error;
        hasError = true;
      }
    }
  }

  if (hasError) throw firstError;
}

export function createSpecialEffect(
  visual: SpecialVisual,
  parent: Container,
  bodyGraphic: Graphics,
  kind: FishKind,
): SpecialEffectController {
  switch (visual) {
    case "golden":
      return createGoldenEffect(parent, bodyGraphic, kind);
    case "electric":
      return createElectricEffect(parent, bodyGraphic, kind);
    case "ghost":
      return createGhostEffect(parent, bodyGraphic, kind);
    case "rainbow":
      return createRainbowEffect(parent, bodyGraphic, kind);
    default:
      return createNoopEffect();
  }
}

function createFloatingLabel(
  parent: Container,
  text: string,
  color: number,
): {
  label: Text;
  updateLabel: (fish: ActiveFish, age: number) => void;
} {
  const label = new Text({
    text,
    style: {
      fontFamily: "Arial, sans-serif",
      fontSize: 16,
      fill: color,
      stroke: { color: 0x000000, width: 3 },
      fontWeight: "900",
      letterSpacing: 1,
    },
  });
  label.anchor.set(0.5, 1);
  label.position.set(0, 0);
  label.alpha = 0;
  label.visible = false;
  parent.addChild(label);

  return {
    label,
    updateLabel: (fish: ActiveFish, age: number) => {
      if (age < 0) return;

      label.visible = true;
      const life = 1;
      const sx = Math.sign(fish.node.scale.x) || 1;
      label.scale.set(sx, 1);
      label.rotation = -fish.node.rotation;

      if (age < life) {
        const progress = age / life;
        label.y = -fish.size - 20 - progress * 40;

        if (progress < 0.2) {
          label.alpha = progress / 0.2;
        } else if (progress > 0.7) {
          label.alpha = 1 - (progress - 0.7) / 0.3;
        } else {
          label.alpha = 1;
        }
      } else {
        label.visible = false;
        label.alpha = 0;
      }
    },
  };
}

function createGoldenEffect(
  parent: Container,
  bodyGraphic: Graphics,
  kind: FishKind,
): SpecialEffectController {
  let isDestroyed = false;
  const halo = new Graphics().circle(0, 0, kind.size * 1.5).fill({ color: 0xffe066, alpha: 0 });
  parent.addChildAt(halo, 0);

  const sparkles: Graphics[] = [];
  for (let i = 0; i < 3; i += 1) {
    const sparkle = new Graphics().circle(0, 0, kind.size * 0.25).fill(0xffffff);
    parent.addChild(sparkle);
    sparkles.push(sparkle);
  }

  const burstRing = new Graphics();
  burstRing.alpha = 0;
  parent.addChild(burstRing);

  const sparkParticles: Graphics[] = [];
  for (let i = 0; i < 8; i += 1) {
    const particle = new Graphics().circle(0, 0, kind.size * 0.15).fill(0xffd700);
    particle.visible = false;
    parent.addChild(particle);
    sparkParticles.push(particle);
  }

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ HOÀNG KIM!", 0xffd700);
  const ownedNodes: OwnedNode[] = [halo, ...sparkles, burstRing, ...sparkParticles, label];

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;

  return {
    update: (dt, fish) => {
      if (isDestroyed) return;
      time += dt;
      halo.alpha = 0.25 + 0.15 * Math.sin(time * 3);

      for (let i = 0; i < sparkles.length; i += 1) {
        const angle = time * 2 + (i * Math.PI * 2) / sparkles.length;
        const radius = kind.size * 1.2;
        sparkles[i].x = Math.cos(angle) * radius;
        sparkles[i].y = Math.sin(angle) * radius;
        sparkles[i].alpha = 0.6 + 0.4 * Math.sin(time * 5 + i);
      }

      if (caughtTime >= 0) {
        caughtTime += dt;
        if (caughtTime < 0.4) {
          const progress = caughtTime / 0.4;
          burstRing.clear();
          burstRing
            .circle(0, 0, kind.size * (1 + progress * 2.5))
            .stroke({ color: 0xffd700, width: 4 * (1 - progress) });
          burstRing.alpha = 1;
        } else {
          burstRing.clear();
          burstRing.alpha = 0;
        }

        if (caughtTime < 0.5) {
          const progress = caughtTime / 0.5;
          for (let i = 0; i < sparkParticles.length; i += 1) {
            const particle = sparkParticles[i];
            particle.visible = true;
            const angle = (i * Math.PI * 2) / sparkParticles.length + caughtTime * 2;
            const radius = kind.size + progress * kind.size * 4;
            particle.x = Math.cos(angle) * radius;
            particle.y = Math.sin(angle) * radius;
            particle.alpha = 1 - progress;
          }
        } else {
          for (const particle of sparkParticles) particle.visible = false;
        }

        if (caughtTime < 0.2) {
          bodyGraphic.scale.set(1 + Math.sin((caughtTime / 0.2) * Math.PI) * 0.4);
        } else {
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(fish, caughtTime);
    },
    onCaught: () => {
      if (isDestroyed || hasTriggeredCaught) return;
      hasTriggeredCaught = true;
      caughtTime = 0;
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      resetBodyGraphic(bodyGraphic);
      destroyOwnedNodes(ownedNodes);
    },
  };
}

function createElectricEffect(
  parent: Container,
  bodyGraphic: Graphics,
  kind: FishKind,
): SpecialEffectController {
  let isDestroyed = false;
  const halo = new Graphics().circle(0, 0, kind.size * 1.5).fill({ color: 0x0ea5e9, alpha: 0.2 });
  parent.addChildAt(halo, 0);

  const arcs: Graphics[] = [];
  for (let i = 0; i < 3; i += 1) {
    const arc = new Graphics();
    parent.addChild(arc);
    arcs.push(arc);
  }

  const burstRing = new Graphics();
  burstRing.alpha = 0;
  parent.addChild(burstRing);

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ ĐIỆN!", 0x0ea5e9);
  const ownedNodes: OwnedNode[] = [halo, ...arcs, burstRing, label];

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;
  let lightningTimer = 0;
  const lightningRefreshInterval = 0.15;

  return {
    update: (dt, fish) => {
      if (isDestroyed) return;
      time += dt;
      lightningTimer += dt;
      halo.alpha = 0.2 + 0.2 * Math.max(0, Math.sin(time * Math.PI * 2));

      if (lightningTimer > lightningRefreshInterval) {
        lightningTimer = 0;
        for (const arc of arcs) {
          arc.clear();
          if (Math.random() <= 0.4) continue;

          const angle = Math.random() * Math.PI * 2;
          const startRadius = kind.size * 0.5;
          const endRadius = kind.size * 1.8;
          arc.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);

          for (let step = 1; step <= 3; step += 1) {
            const radius = startRadius + (endRadius - startRadius) * (step / 3);
            const segmentAngle = angle + (Math.random() - 0.5) * 0.8;
            arc.lineTo(Math.cos(segmentAngle) * radius, Math.sin(segmentAngle) * radius);
          }
          arc.stroke({ color: 0xe0f2fe, width: 2, alpha: 0.9 });
        }
      }

      if (caughtTime >= 0) {
        caughtTime += dt;
        if (caughtTime < 0.3) {
          const progress = caughtTime / 0.3;
          burstRing.clear();
          burstRing
            .circle(0, 0, kind.size * (1 + progress * 3))
            .stroke({ color: 0x0ea5e9, width: 5 * (1 - progress) });
          burstRing.alpha = 1;
        } else {
          burstRing.clear();
          burstRing.alpha = 0;
        }

        if (caughtTime < 0.15) {
          bodyGraphic.x = (Math.random() - 0.5) * 6;
          bodyGraphic.scale.set(1.2);
        } else {
          bodyGraphic.x = 0;
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(fish, caughtTime);
    },
    onCaught: () => {
      if (isDestroyed || hasTriggeredCaught) return;
      hasTriggeredCaught = true;
      caughtTime = 0;

      for (const arc of arcs) {
        arc.clear();
        const angle = Math.random() * Math.PI * 2;
        arc.moveTo(0, 0);
        arc.lineTo(Math.cos(angle) * kind.size * 4, Math.sin(angle) * kind.size * 4);
        arc.stroke({ color: 0xffffff, width: 4 });
      }
      lightningTimer = -0.2;
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      resetBodyGraphic(bodyGraphic);
      destroyOwnedNodes(ownedNodes);
    },
  };
}

function createGhostEffect(
  parent: Container,
  bodyGraphic: Graphics,
  kind: FishKind,
): SpecialEffectController {
  let isDestroyed = false;
  const halo = new Graphics().circle(0, 0, kind.size * 1.5).fill({ color: 0xc084fc, alpha: 0.25 });
  parent.addChildAt(halo, 0);

  const afterimages: Graphics[] = [];
  for (let i = 0; i < 2; i += 1) {
    const afterimage = new Graphics();
    drawFishShape(afterimage, kind, kind.size);
    afterimage.tint = 0xc084fc;
    parent.addChildAt(afterimage, 0);
    afterimages.push(afterimage);
  }

  const ripple = new Graphics();
  parent.addChild(ripple);

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ MA BIỂN!", 0xc084fc);
  const ownedNodes: OwnedNode[] = [halo, ...afterimages, ripple, label];

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;

  return {
    update: (dt, fish) => {
      if (isDestroyed) return;
      time += dt;

      const floatOffset = Math.sin(time * 2) * 5;
      bodyGraphic.y = floatOffset;
      halo.y = floatOffset;
      bodyGraphic.alpha = caughtTime >= 0 ? 1 : 0.5 + 0.2 * Math.sin(time * 3);
      const vxSign = fish.vx >= 0 ? 1 : -1;

      if (caughtTime < 0) {
        afterimages[0].x = -vxSign * 12 * Math.abs(Math.sin(time * 4));
        afterimages[0].y = floatOffset;
        afterimages[0].alpha = 0.4;
        afterimages[1].x = -vxSign * 24 * Math.abs(Math.sin(time * 4 - 0.2));
        afterimages[1].y = floatOffset;
        afterimages[1].alpha = 0.2;
      }

      if (caughtTime >= 0) {
        caughtTime += dt;
        if (caughtTime < 0.6) {
          const progress = caughtTime / 0.6;
          ripple.clear();
          ripple
            .circle(0, 0, kind.size * (1 + progress * 4))
            .stroke({ color: 0xc084fc, width: 3 * (1 - progress) });

          afterimages[0].x = -vxSign * 12 * (1 + progress * 2);
          afterimages[0].alpha = 0.4 * (1 - progress);
          afterimages[0].scale.set(1 + progress * 0.5);
          afterimages[1].x = -vxSign * 24 * (1 + progress * 2);
          afterimages[1].alpha = 0.2 * (1 - progress);
          afterimages[1].scale.set(1 + progress * 0.8);
        } else {
          ripple.clear();
          afterimages[0].alpha = 0;
          afterimages[1].alpha = 0;
        }

        if (caughtTime < 0.3) {
          bodyGraphic.scale.set(1 + Math.sin((caughtTime / 0.3) * Math.PI) * 0.3);
        } else {
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(fish, caughtTime);
    },
    onCaught: () => {
      if (isDestroyed || hasTriggeredCaught) return;
      hasTriggeredCaught = true;
      caughtTime = 0;
      bodyGraphic.alpha = 1;
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      resetBodyGraphic(bodyGraphic);
      destroyOwnedNodes(ownedNodes);
    },
  };
}

function createRainbowEffect(
  parent: Container,
  bodyGraphic: Graphics,
  kind: FishKind,
): SpecialEffectController {
  let isDestroyed = false;
  const halo = new Graphics().circle(0, 0, kind.size * 1.6).fill({ color: 0xffffff, alpha: 1 });
  halo.blendMode = "add";
  parent.addChildAt(halo, 0);

  const sparkles: Graphics[] = [];
  for (let i = 0; i < 3; i += 1) {
    const sparkle = new Graphics();
    const outerRadius = kind.size * 0.4;
    const innerRadius = kind.size * 0.15;
    sparkle.moveTo(0, -outerRadius);
    for (let point = 0; point < 5; point += 1) {
      const outerAngle = -Math.PI / 2 + (point * Math.PI * 2) / 5;
      const innerAngle = -Math.PI / 2 + ((point + 0.5) * Math.PI * 2) / 5;
      sparkle.lineTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
      sparkle.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
    }
    sparkle.closePath().fill(0xffffff);
    parent.addChild(sparkle);
    sparkles.push(sparkle);
  }

  const burst = new Graphics();
  parent.addChild(burst);

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ CẦU VỒNG!", 0xffffff);
  const ownedNodes: OwnedNode[] = [halo, ...sparkles, burst, label];
  const colors = [0xff0000, 0xffa500, 0xffff00, 0x008000, 0x0000ff, 0x4b0082, 0xee82ee];

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;
  let labelColorIndex = -1;

  return {
    update: (dt, fish) => {
      if (isDestroyed) return;
      time += dt;

      const colorIndex1 = Math.floor(time * 1.5) % colors.length;
      const colorIndex2 = (colorIndex1 + 1) % colors.length;
      halo.tint = colors[colorIndex1];
      halo.alpha = 0.25 + 0.1 * Math.sin(time * 5);

      if (labelColorIndex !== colorIndex2) {
        labelColorIndex = colorIndex2;
        label.style.fill = colors[colorIndex2];
      }

      for (let i = 0; i < sparkles.length; i += 1) {
        const angle = time * (1.5 + i * 0.2) + (i * Math.PI * 2) / sparkles.length;
        const radius = kind.size * (1.2 + 0.3 * Math.sin(time * 3 + i));
        sparkles[i].x = Math.cos(angle) * radius;
        sparkles[i].y = Math.sin(angle) * radius;
        sparkles[i].rotation = time * 2;
        sparkles[i].alpha = 0.7 + 0.3 * Math.sin(time * 8 + i);
        sparkles[i].tint = colors[(colorIndex1 + i) % colors.length];
      }

      if (caughtTime >= 0) {
        caughtTime += dt;
        if (caughtTime < 0.6) {
          const progress = caughtTime / 0.6;
          burst.clear();
          burst
            .circle(0, 0, kind.size * (1 + progress * 4))
            .stroke({ color: colors[colorIndex1], width: 6 * (1 - progress) });

          for (let i = 0; i < 8; i += 1) {
            const angle = (i / 8) * Math.PI * 2 + time;
            const startRadius = kind.size * (1 + progress);
            const endRadius = kind.size * (1 + progress * 5);
            burst.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
            burst.lineTo(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius);
          }
          burst.stroke({ color: colors[colorIndex2], width: 5 * (1 - progress) });
        } else {
          burst.clear();
        }

        if (caughtTime < 0.3) {
          bodyGraphic.scale.set(1 + Math.sin((caughtTime / 0.3) * Math.PI) * 0.5);
        } else {
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(fish, caughtTime);
    },
    onCaught: () => {
      if (isDestroyed || hasTriggeredCaught) return;
      hasTriggeredCaught = true;
      caughtTime = 0;
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      resetBodyGraphic(bodyGraphic);
      destroyOwnedNodes(ownedNodes);
    },
  };
}
