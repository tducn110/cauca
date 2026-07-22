import os

content = """
import { Application, Graphics, Text, Container, Texture } from "pixi.js";
import { Game, Fish, LOGICAL_WIDTH, LOGICAL_HEIGHT, SURFACE_Y } from "./engine";

const C = {
  paper: "#f5ecd7",
  paperWarm: "#efe3c4",
  ink: "#2a2418",
  bamboo: "#6b8e3d",
  bambooSoft: "#c8d68a",
  leafDeep: "#4c6630",
  earth: "#8e4e22",
  orange: "#e87432",
  yellow: "#f0b840",
};

function lerpColor(a: string, b: string, amount: number): string {
  const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);
  return '#' + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).padStart(6, '0');
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function drawLotus(ctx: Graphics, x: number, y: number, r: number) {
  ctx.ellipse(x, y, r, r * 0.5).fill("#5e9e4a").stroke({ color: "rgba(42,36,24,0.25)", width: 1 });
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    ctx.moveTo(x, y).lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
  }
  ctx.stroke({ color: "rgba(42,36,24,0.18)", width: 1 });
}

function updateFish(g: Graphics, f: Fish) {
  g.position.set(f.x, f.y);
  g.scale.set(f.vx >= 0 ? 1 : -1, 1);
  g.clear();
  const s = f.size;

  if (f.kind.isBad) {
    g.ellipse(0, 0, s, s * 0.6).fill(f.kind.color).stroke({ color: C.ink, width: 1.2 });
    g.moveTo(-s * 0.4, -s * 0.2).lineTo(s * 0.4, -s * 0.5).stroke({ color: C.ink, width: 1.2 });
    return;
  }

  if (f.kind.type === "tom") {
    g.arc(0, 0, s, 0.2, Math.PI * 1.8).stroke({ color: C.ink, width: 1.2 });
    g.ellipse(0, 0, s * 0.9, s * 0.55).fill(f.kind.color).stroke({ color: C.ink, width: 1.2 });
    g.moveTo(s, -2).lineTo(s + 6, -6).moveTo(s, 2).lineTo(s + 6, 6).stroke({ color: C.ink, width: 1.2 });
    return;
  }

  if (f.kind.type === "cua") {
    g.ellipse(0, 0, s, s * 0.7).fill(f.kind.color).stroke({ color: C.ink, width: 1.2 });
    g.moveTo(-s, 0).lineTo(-s - 6, -4).moveTo(s, 0).lineTo(s + 6, -4);
    g.moveTo(-s * 0.6, s * 0.5).lineTo(-s * 0.6, s + 4);
    g.moveTo(s * 0.6, s * 0.5).lineTo(s * 0.6, s + 4);
    g.stroke({ color: C.ink, width: 1.2 });
    return;
  }

  g.moveTo(-s * 0.9, 0).lineTo(-s * 1.7, -s * 0.7).lineTo(-s * 1.7, s * 0.7).closePath()
   .fill(f.kind.color).stroke({ color: C.ink, width: 1.2 });
  
  g.ellipse(0, 0, s * 1.3, s * 0.75).fill(f.kind.color).stroke({ color: C.ink, width: 1.2 });
  
  g.moveTo(-s * 0.2, -s * 0.7).lineTo(s * 0.3, -s * 1.1).lineTo(s * 0.5, -s * 0.6).closePath()
   .fill(f.kind.color).stroke({ color: C.ink, width: 1.2 });
   
  g.circle(s * 0.7, -s * 0.1, s * 0.22).fill("#fff");
  g.circle(s * 0.75, -s * 0.1, s * 0.1).fill(C.ink);
}

function drawNet(ctx: Graphics, g: Game) {
  const n = g.net;
  const r = g.stats.netSize;
  
  ctx.moveTo(n.x, 110).lineTo(n.x, n.y - r).stroke({ color: "rgba(42,36,24,0.55)", width: 2 });
  ctx.moveTo(n.x - 22, 108).lineTo(n.x + 14, 100).stroke({ color: C.earth, width: 4 });
  
  ctx.circle(n.x, n.y, r).stroke({ color: "#d8c9a0", width: 3 });
  
  ctx.moveTo(n.x - r, n.y).quadraticCurveTo(n.x, n.y + r * 1.8, n.x + r, n.y).closePath()
     .fill("rgba(245,236,215,0.18)");
     
  for (let i = -2; i <= 2; i++) {
    const sx = n.x + (i / 2) * r;
    ctx.moveTo(sx, n.y).quadraticCurveTo(n.x, n.y + r * 1.8, n.x + (i / 4) * r, n.y + r * 1.4);
  }
  ctx.stroke({ color: "rgba(245,236,215,0.5)", width: 1 });
}

export function getDepthZoneName(meters: number): string {
  if (meters < 1000) return "Mặt nước";
  if (meters < 2000) return "Biển khơi";
  if (meters < 3000) return "Vực sâu";
  if (meters < 4000) return "Vực Mariana";
  return "Đáy đại dương";
}

let sceneInitialized = false;
let sceneRefs: any = {};

function initScene(app: Application) {
  const world = new Container();
  app.stage.addChild(world);

  const bg = new Graphics();
  const sunrays = new Graphics();
  const floor = new Graphics();
  const lotus = new Graphics();
  const fishLayer = new Container();
  const net = new Graphics();
  const ripples = new Graphics();
  const feedbackLayer = new Container();

  world.addChild(bg, sunrays, floor, lotus, fishLayer, net, ripples, feedbackLayer);

  const ui = new Container();
  app.stage.addChild(ui);

  const depthText1 = new Text({ text: "", style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, fontWeight: "700", fill: "rgba(255,255,255,0.6)", align: "right" } });
  depthText1.position.set(LOGICAL_WIDTH - 12, 18);
  depthText1.anchor.set(1, 0);

  const depthText2 = new Text({ text: "", style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 10, fontWeight: "600", fill: "rgba(255,255,255,0.35)", align: "right" } });
  depthText2.position.set(LOGICAL_WIDTH - 12, 32);
  depthText2.anchor.set(1, 0);

  ui.addChild(depthText1, depthText2);
  
  return { world, bg, sunrays, floor, lotus, fishLayer, net, ripples, feedbackLayer, depthText1, depthText2 };
}

export function renderScene(app: Application, g: Game) {
  if (!sceneInitialized) {
    sceneRefs = initScene(app);
    sceneInitialized = true;
  }
  const { world, bg, sunrays, floor, lotus, fishLayer, net, ripples, feedbackLayer, depthText1, depthText2 } = sceneRefs;
  const w = LOGICAL_WIDTH, h = LOGICAL_HEIGHT;

  const maxCameraY = Math.max(1, g.stats.maxDepth - h + 200);
  const depthRatio = clamp(g.cameraY / maxCameraY, 0, 1);

  // Background
  const topColor = lerpColor("#7fb4c4", "#021015", depthRatio);
  bg.clear();
  bg.rect(0, 0, w, h).fill(topColor);

  world.position.y = -g.cameraY;

  // Sky and Mountains
  if (g.cameraY < SURFACE_Y) {
    bg.rect(0, -g.cameraY, w, SURFACE_Y).fill(C.paper);
    bg.moveTo(0, SURFACE_Y).quadraticCurveTo(w * 0.25, SURFACE_Y - 70, w * 0.5, SURFACE_Y - 30)
      .quadraticCurveTo(w * 0.78, SURFACE_Y + 8, w, SURFACE_Y - 40).lineTo(w, SURFACE_Y).closePath()
      .fill("rgba(230,216,178,0.6)");

    for (let i = 0; i < 4; i++) {
      const bx = 60 + i * 60, by = 50 + (i % 2) * 16;
      bg.moveTo(bx - 6, by).lineTo(bx, by - 5).lineTo(bx + 6, by);
    }
    bg.stroke({ color: "rgba(138,125,101,0.6)", width: 1.4 });

    for (let i = 0; i < 6; i++) {
      const x = 6 + i * 5;
      bg.moveTo(x, SURFACE_Y).lineTo(x - 4, 40);
      const x2 = w - 6 - i * 5;
      bg.moveTo(x2, SURFACE_Y).lineTo(x2 + 4, 50);
    }
    bg.stroke({ color: "rgba(107,142,61,0.5)", width: 1.4 });
  }

  // Sunrays
  sunrays.clear();
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 75;
    sunrays.moveTo(x, SURFACE_Y).lineTo(x + 26, SURFACE_Y)
           .lineTo(x + 60, g.stats.maxDepth + 500).lineTo(x + 20, g.stats.maxDepth + 500)
           .closePath().fill("rgba(255,255,255,0.05)");
  }

  // Floor
  floor.clear();
  const bottomY = g.stats.maxDepth + 50; 
  floor.moveTo(0, bottomY).quadraticCurveTo(w * 0.5, bottomY - 18, w, bottomY)
       .lineTo(w, bottomY + 200).lineTo(0, bottomY + 200).closePath().fill("#163b48");

  // Lotus
  lotus.clear();
  if (g.cameraY < SURFACE_Y + 50) {
    drawLotus(lotus, 70, SURFACE_Y, 34);
    drawLotus(lotus, w - 64, SURFACE_Y, 28);
    drawLotus(lotus, w * 0.5, SURFACE_Y, 22);
    
    // Gợn nước mặt
    for (let x = 0; x <= w; x += 12) {
      const yy = SURFACE_Y + Math.sin(x * 0.08 + performance.now() * 0.002) * 2;
      if (x === 0) lotus.moveTo(x, yy); else lotus.lineTo(x, yy);
    }
    lotus.stroke({ color: "rgba(255,255,255,0.4)", width: 1.5 });
  }

  // Fish
  while (fishLayer.children.length > g.fish.length) {
    fishLayer.removeChildAt(fishLayer.children.length - 1);
  }
  for (let i = 0; i < g.fish.length; i++) {
    let fishG = fishLayer.children[i] as Graphics;
    if (!fishG) {
      fishG = new Graphics();
      fishLayer.addChild(fishG);
    }
    updateFish(fishG, g.fish[i]);
  }

  // Net
  net.clear();
  drawNet(net, g);

  // Ripples
  ripples.clear();
  for (const rp of g.ripples) {
    const alpha = Math.max(0, 1 - rp.age / 0.8);
    ripples.circle(rp.x, rp.y, rp.r).stroke({ color: `rgba(255,255,255,${alpha})`, width: 2 });
  }

  // Feedback Text
  while (feedbackLayer.children.length > g.feedback.length * 2) {
    feedbackLayer.removeChildAt(feedbackLayer.children.length - 1);
  }
  for (let i = 0; i < g.feedback.length; i++) {
    const t = g.feedback[i];
    const alpha = Math.max(0, 1 - t.age / t.life);
    
    let textObjShadow = feedbackLayer.children[i * 2] as Text;
    if (!textObjShadow) {
      textObjShadow = new Text({ text: "", style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 16, fontWeight: "700" } });
      textObjShadow.anchor.set(0.5);
      feedbackLayer.addChild(textObjShadow);
    }
    let textObj = feedbackLayer.children[i * 2 + 1] as Text;
    if (!textObj) {
      textObj = new Text({ text: "", style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 16, fontWeight: "700" } });
      textObj.anchor.set(0.5);
      feedbackLayer.addChild(textObj);
    }
    
    textObjShadow.text = t.text;
    textObjShadow.position.set(t.x + 1, t.y + 1);
    textObjShadow.style.fill = `rgba(255,255,255,${alpha * 0.85})`;
    
    textObj.text = t.text;
    textObj.position.set(t.x, t.y);
    
    // t.color may be hex or rgba, we can just pass it directly 
    // but wait, Text style fill supports string colors. Let's convert alpha manually if it's hex?
    // t.color is usually string. We will apply alpha to container or just ignore alpha for color.
    textObj.style.fill = t.color;
    textObj.alpha = alpha;
    textObjShadow.alpha = alpha;
  }

  // HUD
  const depthMeters = Math.max(0, Math.round(g.net.y - SURFACE_Y));
  depthText1.text = getDepthZoneName(depthMeters);
  depthText2.text = depthMeters + "m";
}
"""

with open("src/app/components/bat-ca/render.ts", "w") as f:
    f.write(content)
