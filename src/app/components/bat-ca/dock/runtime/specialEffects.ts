import { Graphics, Container, Text } from "pixi.js";
import type { ActiveFish } from "./runtimeTypes";
import type { FishKind, SpecialVisual } from "../../game/types";
import { drawFishShape } from "./fishRenderer";

export interface SpecialEffectController {
  update: (dt: number, fish: ActiveFish) => void;
  onCaught: (_fish: ActiveFish) => void;
  destroy: () => void;
}

export function createSpecialEffect(visual: SpecialVisual, parent: Container, bodyGraphic: Graphics, kind: FishKind): SpecialEffectController {
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
      return { update: () => {}, onCaught: () => {}, destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;} };
  }
}

// ----------------------------------------------------------------------------
// Helper for floating label
// ----------------------------------------------------------------------------
function createFloatingLabel(parent: Container, text: string, color: number): { label: Text; updateLabel: (_dt: number, fish: ActiveFish, age: number) => void } {
  const label = new Text({
    text,
    style: {
      fontFamily: "Arial, sans-serif",
      fontSize: 16,
      fill: color,
      stroke: { color: 0x000000, width: 3 },
      fontWeight: "900",
      letterSpacing: 1,
    }
  });
  label.anchor.set(0.5, 1);
  label.position.set(0, 0);
  label.alpha = 0;
  label.visible = false;
  parent.addChild(label);

  return {
    label,
    updateLabel: (_dt: number, fish: ActiveFish, age: number) => {
      if (age < 0) return;
      label.visible = true;
      const life = 1.0; // 1 second duration
      
      // Ensure text remains world-facing
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
    }
  };
}

// ----------------------------------------------------------------------------
// Cá Hoàng Kim
// ----------------------------------------------------------------------------
function createGoldenEffect(parent: Container, bodyGraphic: Graphics, kind: FishKind): SpecialEffectController {
  let isDestroyed = false;
  // Phase A
  const halo = new Graphics().circle(0, 0, kind.size * 1.5).fill({ color: 0xffe066, alpha: 0 });
  parent.addChildAt(halo, 0);

  const sparkles: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const s = new Graphics().circle(0, 0, kind.size * 0.25).fill(0xffffff);
    parent.addChild(s);
    sparkles.push(s);
  }

  // Phase B
  const burstRing = new Graphics();
  burstRing.alpha = 0;
  parent.addChild(burstRing);

  const sparkParticles: Graphics[] = [];
  for (let i = 0; i < 8; i++) {
    const p = new Graphics().circle(0, 0, kind.size * 0.15).fill(0xffd700);
    p.visible = false;
    parent.addChild(p);
    sparkParticles.push(p);
  }

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ HOÀNG KIM!", 0xffd700);

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;

  return {
    update: (dt: number, fish: ActiveFish) => {
      if (isDestroyed) return;
      time += dt;
      
      // Phase A logic
      halo.alpha = 0.25 + 0.15 * Math.sin(time * 3);
      
      for (let i = 0; i < sparkles.length; i++) {
        const angle = time * 2 + (i * Math.PI * 2) / sparkles.length;
        const radius = kind.size * 1.2;
        sparkles[i].x = Math.cos(angle) * radius;
        sparkles[i].y = Math.sin(angle) * radius;
        sparkles[i].alpha = 0.6 + 0.4 * Math.sin(time * 5 + i);
      }

      // Instead of changing tint to white (which loses yellow blob), just keep bodyGraphic clean
      // and rely on the halo and sparkles.

      // Phase B logic
      if (caughtTime >= 0) {
        caughtTime += dt;
        
        // Ring
        if (caughtTime < 0.4) {
          const progress = caughtTime / 0.4;
          burstRing.clear();
          burstRing.circle(0, 0, kind.size * (1 + progress * 2.5)).stroke({ color: 0xffd700, width: 4 * (1 - progress) });
          burstRing.alpha = 1;
        } else {
          burstRing.clear();
        }

        // Sparks
        if (caughtTime < 0.5) {
          const progress = caughtTime / 0.5;
          for (let i = 0; i < sparkParticles.length; i++) {
            const p = sparkParticles[i];
            p.visible = true;
            const angle = (i * Math.PI * 2) / sparkParticles.length + caughtTime * 2;
            const r = kind.size + progress * kind.size * 4;
            p.x = Math.cos(angle) * r;
            p.y = Math.sin(angle) * r;
            p.alpha = 1 - progress;
          }
        } else {
          sparkParticles.forEach(p => p.visible = false);
        }

        // Body pop
        if (caughtTime < 0.2) {
          bodyGraphic.scale.set(1 + Math.sin(caughtTime / 0.2 * Math.PI) * 0.4);
        } else {
          bodyGraphic.scale.set(1);
        }
      }

      // Label
      updateLabel(dt, fish, caughtTime);
    },
    onCaught: (_fish: ActiveFish) => {
      if (isDestroyed) return;
      if (isDestroyed) return;
      if (!hasTriggeredCaught) {
        hasTriggeredCaught = true;
        caughtTime = 0;
      }
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (isDestroyed) return;
      isDestroyed = true;
      halo.destroy();
      sparkles.forEach(s => s.destroy());
      burstRing.destroy();
      sparkParticles.forEach(p => p.destroy());
      label.destroy();
    }
  };
}

// ----------------------------------------------------------------------------
// Cá Điện
// ----------------------------------------------------------------------------
function createElectricEffect(parent: Container, bodyGraphic: Graphics, kind: FishKind): SpecialEffectController {
  let isDestroyed = false;
  // Phase A
  const halo = new Graphics().circle(0, 0, kind.size * 1.5).fill({ color: 0x0ea5e9, alpha: 0.2 });
  parent.addChildAt(halo, 0);

  const arcs: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const arc = new Graphics();
    parent.addChild(arc);
    arcs.push(arc);
  }

  // Phase B
  const burstRing = new Graphics();
  burstRing.alpha = 0;
  parent.addChild(burstRing);

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ ĐIỆN!", 0x0ea5e9);

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;

  let lightningTimer = 0;
  const lightningRefreshInterval = 0.15; // Controlled interval

  return {
    update: (dt: number, fish: ActiveFish) => {
      if (isDestroyed) return;
      time += dt;
      lightningTimer += dt;
      
      // Phase A: Pulse
      halo.alpha = 0.2 + 0.2 * Math.max(0, Math.sin(time * Math.PI * 2)); // visible energy pulse every 1s
      
      // Controlled lightning refresh
      if (lightningTimer > lightningRefreshInterval) {
        lightningTimer = 0;
        arcs.forEach((arc) => {
          arc.clear();
          if (Math.random() > 0.4) {
            const angle = Math.random() * Math.PI * 2;
            const r1 = kind.size * 0.5;
            const r2 = kind.size * 1.8;
            arc.moveTo(Math.cos(angle)*r1, Math.sin(angle)*r1);
            
            let curX = Math.cos(angle)*r1;
            let curY = Math.sin(angle)*r1;
            for(let step=1; step<=3; step++){
              const r = r1 + (r2-r1)*(step/3);
              const a = angle + (Math.random() - 0.5)*0.8;
              curX = Math.cos(a)*r;
              curY = Math.sin(a)*r;
              arc.lineTo(curX, curY);
            }
            arc.stroke({ color: 0xe0f2fe, width: 2, alpha: 0.9 });
          }
        });
      }

      // Phase B
      if (caughtTime >= 0) {
        caughtTime += dt;
        
        // Ring
        if (caughtTime < 0.3) {
          const progress = caughtTime / 0.3;
          burstRing.clear();
          burstRing.circle(0, 0, kind.size * (1 + progress * 3)).stroke({ color: 0x0ea5e9, width: 5 * (1 - progress) });
          burstRing.alpha = 1;
        } else {
          burstRing.clear();
        }

        // Body pop
        if (caughtTime < 0.15) {
          const shift = (Math.random() - 0.5) * 6; // electrical shake
          bodyGraphic.x = shift;
          bodyGraphic.scale.set(1.2);
        } else {
          bodyGraphic.x = 0;
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(dt, fish, caughtTime);
    },
    onCaught: (_fish: ActiveFish) => {
      if (isDestroyed) return;
      if (isDestroyed) return;
      if (!hasTriggeredCaught) {
        hasTriggeredCaught = true;
        caughtTime = 0;
        
        // Force an immediate big lightning burst
        arcs.forEach((arc) => {
          arc.clear();
          const angle = Math.random() * Math.PI * 2;
          arc.moveTo(0, 0);
          arc.lineTo(Math.cos(angle)*kind.size*4, Math.sin(angle)*kind.size*4);
          arc.stroke({ color: 0xffffff, width: 4 });
        });
        lightningTimer = -0.2; // Delay next normal lightning
      }
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (isDestroyed) return;
      isDestroyed = true;
      halo.destroy();
      arcs.forEach(a => a.destroy());
      burstRing.destroy();
      label.destroy();
    }
  };
}

// ----------------------------------------------------------------------------
// Cá Ma Biển
// ----------------------------------------------------------------------------
function createGhostEffect(parent: Container, bodyGraphic: Graphics, kind: FishKind): SpecialEffectController {
  let isDestroyed = false;
  // Phase A
  const halo = new Graphics().circle(0, 0, kind.size * 1.5).fill({ color: 0xc084fc, alpha: 0.25 });
  parent.addChildAt(halo, 0);

  const afterimages: Graphics[] = [];
  for (let i = 0; i < 2; i++) {
    const g = new Graphics();
    drawFishShape(g, kind, kind.size);
    g.tint = 0xc084fc;
    parent.addChildAt(g, 0);
    afterimages.push(g);
  }

  // Phase B
  const ripple = new Graphics();
  parent.addChild(ripple);

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ MA BIỂN!", 0xc084fc);

  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;

  return {
    update: (dt: number, fish: ActiveFish) => {
      if (isDestroyed) return;
      time += dt;
      
      // Phase A
      const floatOffset = Math.sin(time * 2) * 5;
      bodyGraphic.y = floatOffset;
      halo.y = floatOffset;
      bodyGraphic.alpha = caughtTime >= 0 ? 1 : (0.5 + 0.2 * Math.sin(time * 3)); // fade-in pop when caught

      const vxSign = fish.vx >= 0 ? 1 : -1;
      
      if (caughtTime < 0) {
        afterimages[0].x = -vxSign * 12 * Math.abs(Math.sin(time * 4));
        afterimages[0].y = floatOffset;
        afterimages[0].alpha = 0.4;
        
        afterimages[1].x = -vxSign * 24 * Math.abs(Math.sin(time * 4 - 0.2));
        afterimages[1].y = floatOffset;
        afterimages[1].alpha = 0.2;
      }

      // Phase B
      if (caughtTime >= 0) {
        caughtTime += dt;
        if (caughtTime < 0.6) {
          const progress = caughtTime / 0.6;
          ripple.clear();
          ripple.circle(0, 0, kind.size * (1 + progress * 4)).stroke({ color: 0xc084fc, width: 3 * (1 - progress) });
          
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
          bodyGraphic.scale.set(1 + Math.sin(caughtTime / 0.3 * Math.PI) * 0.3);
        } else {
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(dt, fish, caughtTime);
    },
    onCaught: (_fish: ActiveFish) => {
      if (isDestroyed) return;
      if (isDestroyed) return;
      if (!hasTriggeredCaught) {
        hasTriggeredCaught = true;
        caughtTime = 0;
        bodyGraphic.alpha = 1;
      }
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (isDestroyed) return;
      isDestroyed = true;
      halo.destroy();
      afterimages.forEach(a => a.destroy());
      ripple.destroy();
      label.destroy();
    }
  };
}

// ----------------------------------------------------------------------------
// Cá Cầu Vồng
// ----------------------------------------------------------------------------
function createRainbowEffect(parent: Container, bodyGraphic: Graphics, kind: FishKind): SpecialEffectController {
  let isDestroyed = false;
  // Phase A
  const halo = new Graphics().circle(0, 0, kind.size * 1.6).fill({ color: 0xffffff, alpha: 1 });
  halo.blendMode = "add";
  parent.addChildAt(halo, 0);

  const sparkles: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    // Star shape
    const s = new Graphics();
    const starR1 = kind.size * 0.4;
    const starR2 = kind.size * 0.15;
    s.moveTo(0, -starR1);
    for(let j=0; j<5; j++) {
       const a1 = -Math.PI/2 + (j * Math.PI * 2) / 5;
       const a2 = -Math.PI/2 + ((j + 0.5) * Math.PI * 2) / 5;
       s.lineTo(Math.cos(a1)*starR1, Math.sin(a1)*starR1);
       s.lineTo(Math.cos(a2)*starR2, Math.sin(a2)*starR2);
    }
    s.closePath();
    s.fill(0xffffff);
    parent.addChild(s);
    sparkles.push(s);
  }

  // Phase B
  const burst = new Graphics();
  parent.addChild(burst);

  const { label, updateLabel } = createFloatingLabel(parent, "CÁ CẦU VỒNG!", 0xffffff);
  // Add a drop shadow or dark stroke to make legendary text pop
  // (Handled by stroke in createFloatingLabel, but we can animate tint)

  const colors = [0xff0000, 0xffa500, 0xffff00, 0x008000, 0x0000ff, 0x4b0082, 0xee82ee];
  let time = 0;
  let caughtTime = -1;
  let hasTriggeredCaught = false;

  return {
    update: (dt: number, fish: ActiveFish) => {
      if (isDestroyed) return;
      time += dt;
      
      const cycleSpeed = 1.5;
      const colorIndex1 = Math.floor(time * cycleSpeed) % colors.length;
      const colorIndex2 = (colorIndex1 + 1) % colors.length;
      // We can just snap colors or use one, Pixi Graphics tint doesn't smoothly interpolate out of the box unless we do math.
      // We'll just cycle tint.
      halo.tint = colors[colorIndex1];
      halo.alpha = 0.25 + 0.1 * Math.sin(time * 5);
      
      // Make text cycle rainbow too!
      label.style.fill = colors[colorIndex2];

      // Phase A
      for (let i = 0; i < sparkles.length; i++) {
        const angle = time * (1.5 + i*0.2) + (i * Math.PI * 2) / sparkles.length;
        const radius = kind.size * (1.2 + 0.3 * Math.sin(time * 3 + i));
        sparkles[i].x = Math.cos(angle) * radius;
        sparkles[i].y = Math.sin(angle) * radius;
        sparkles[i].rotation = time * 2;
        sparkles[i].alpha = 0.7 + 0.3 * Math.sin(time * 8 + i);
        sparkles[i].tint = colors[(colorIndex1 + i) % colors.length];
      }

      // Phase B
      if (caughtTime >= 0) {
        caughtTime += dt;
        if (caughtTime < 0.6) {
          const progress = caughtTime / 0.6;
          
          burst.clear();
          
          // Ring
          burst.circle(0, 0, kind.size * (1 + progress * 4)).stroke({ color: colors[colorIndex1], width: 6 * (1 - progress) });
          
          // Starburst
          for(let i=0; i<8; i++) {
             const a = (i/8)*Math.PI*2 + time;
             const r1 = kind.size * (1 + progress);
             const r2 = kind.size * (1 + progress * 5);
             burst.moveTo(Math.cos(a)*r1, Math.sin(a)*r1);
             burst.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
          }
          burst.stroke({ color: colors[colorIndex2], width: 5 * (1-progress) });

        } else {
          burst.clear();
        }

        if (caughtTime < 0.3) {
          bodyGraphic.scale.set(1 + Math.sin(caughtTime / 0.3 * Math.PI) * 0.5);
        } else {
          bodyGraphic.scale.set(1);
        }
      }

      updateLabel(dt, fish, caughtTime);
    },
    onCaught: (_fish: ActiveFish) => {
      if (isDestroyed) return;
      if (isDestroyed) return;
      if (!hasTriggeredCaught) {
        hasTriggeredCaught = true;
        caughtTime = 0;
      }
    },
    destroy: () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (isDestroyed) return;
      isDestroyed = true;
      halo.destroy();
      sparkles.forEach(s => s.destroy());
      burst.destroy();
      label.destroy();
    }
  };
}
