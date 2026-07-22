import { Application, Container, Graphics, Text } from "pixi.js";
import { Game, type Fish, LOGICAL_HEIGHT, LOGICAL_WIDTH, SURFACE_Y } from "./engine";
import { MAX_DEPTH_LIMIT } from "./game/constants";
import { netSizeBonus } from "./game/buffs";

const C = {
  paper: "#f5ecd7",
  ink: "#2a2418",
  earth: "#8e4e22",
};

interface FishView {
  node: Graphics;
  kindType: string | null;
  size: number;
}

interface FeedbackView {
  root: Container;
  shadow: Text;
  label: Text;
  lastText: string;
  lastColor: string;
}

interface SceneRefs {
  screenBackground: Graphics;
  world: Container;
  surfaceStatic: Graphics;
  sunRays: Graphics;
  floor: Graphics;
  lotusStatic: Graphics;
  waterLine: Graphics;
  fishLayer: Container;
  net: Graphics;
  ripples: Graphics;
  feedbackLayer: Container;
  fishById: Map<number, FishView>;
  freeFishViews: FishView[];
  activeFishIds: Set<number>;
  feedbackPool: FeedbackView[];
  lastBottomY: number;
  lastBackgroundTint: number;
}

const sceneRefsMap = new WeakMap<Application, SceneRefs>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerpColorNumber(from: number, to: number, amount: number): number {
  const t = clamp(amount, 0, 1);
  const fromR = (from >> 16) & 0xff;
  const fromG = (from >> 8) & 0xff;
  const fromB = from & 0xff;
  const toR = (to >> 16) & 0xff;
  const toG = (to >> 8) & 0xff;
  const toB = to & 0xff;
  const r = Math.round(fromR + (toR - fromR) * t);
  const g = Math.round(fromG + (toG - fromG) * t);
  const b = Math.round(fromB + (toB - fromB) * t);
  return (r << 16) | (g << 8) | b;
}

function drawLotus(target: Graphics, x: number, y: number, radius: number): void {
  target.ellipse(x, y, radius, radius * 0.5).fill("#5e9e4a").stroke({ color: "rgba(42,36,24,0.25)", width: 1 });
  for (let i = 0; i < 5; i++) {
    const angle = -0.9 + i * 0.45;
    target.moveTo(x, y).lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.5);
  }
  target.stroke({ color: "rgba(42,36,24,0.18)", width: 1 });
}

function drawSurfaceStatic(target: Graphics): void {
  target.rect(0, 0, LOGICAL_WIDTH, SURFACE_Y).fill(C.paper);
  target
    .moveTo(0, SURFACE_Y)
    .quadraticCurveTo(LOGICAL_WIDTH * 0.25, SURFACE_Y - 70, LOGICAL_WIDTH * 0.5, SURFACE_Y - 30)
    .quadraticCurveTo(LOGICAL_WIDTH * 0.78, SURFACE_Y + 8, LOGICAL_WIDTH, SURFACE_Y - 40)
    .lineTo(LOGICAL_WIDTH, SURFACE_Y)
    .closePath()
    .fill("rgba(230,216,178,0.6)");

  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 60;
    const y = 50 + (i % 2) * 16;
    target.moveTo(x - 6, y).lineTo(x, y - 5).lineTo(x + 6, y);
  }
  target.stroke({ color: "rgba(138,125,101,0.6)", width: 1.4 });

  for (let i = 0; i < 6; i++) {
    const leftX = 6 + i * 5;
    const rightX = LOGICAL_WIDTH - 6 - i * 5;
    target.moveTo(leftX, SURFACE_Y).lineTo(leftX - 4, 40);
    target.moveTo(rightX, SURFACE_Y).lineTo(rightX + 4, 50);
  }
  target.stroke({ color: "rgba(107,142,61,0.5)", width: 1.4 });
}

function drawLotusStatic(target: Graphics): void {
  drawLotus(target, 70, SURFACE_Y, 34);
  drawLotus(target, LOGICAL_WIDTH - 64, SURFACE_Y, 28);
  drawLotus(target, LOGICAL_WIDTH * 0.5, SURFACE_Y, 22);
}

function rebuildDepthGeometry(refs: SceneRefs, bottomY: number): void {
  refs.sunRays.clear();
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 75;
    refs.sunRays
      .moveTo(x, SURFACE_Y)
      .lineTo(x + 26, SURFACE_Y)
      .lineTo(x + 60, bottomY + 100)
      .lineTo(x + 20, bottomY + 100)
      .closePath()
      .fill("rgba(255,255,255,0.05)");
  }

  const floorY = bottomY + 36;
  refs.floor.clear();
  refs.floor
    .moveTo(0, floorY)
    .quadraticCurveTo(LOGICAL_WIDTH * 0.5, floorY - 18, LOGICAL_WIDTH, floorY)
    .lineTo(LOGICAL_WIDTH, floorY + 220)
    .lineTo(0, floorY + 220)
    .closePath()
    .fill("#163b48");
}

function updateWaterLine(target: Graphics, now: number): void {
  target.clear();
  for (let x = 0; x <= LOGICAL_WIDTH; x += 12) {
    const y = SURFACE_Y + Math.sin(x * 0.08 + now * 0.002) * 2;
    if (x === 0) target.moveTo(x, y);
    else target.lineTo(x, y);
  }
  target.stroke({ color: "rgba(255,255,255,0.4)", width: 1.5 });
}

function drawFishShape(target: Graphics, fish: Fish): void {
  const size = fish.size;

  if (fish.kind.isBad) {
    target.ellipse(0, 0, size, size * 0.6).fill(fish.kind.color).stroke({ color: C.ink, width: 1.2 });
    target.moveTo(-size * 0.4, -size * 0.2).lineTo(size * 0.4, -size * 0.5).stroke({ color: C.ink, width: 1.2 });
    return;
  }

  if (fish.kind.type === "tom") {
    target.arc(0, 0, size, 0.2, Math.PI * 1.8).stroke({ color: C.ink, width: 1.2 });
    target.ellipse(0, 0, size * 0.9, size * 0.55).fill(fish.kind.color).stroke({ color: C.ink, width: 1.2 });
    target.moveTo(size, -2).lineTo(size + 6, -6).moveTo(size, 2).lineTo(size + 6, 6).stroke({ color: C.ink, width: 1.2 });
    return;
  }

  if (fish.kind.type === "cua") {
    target.ellipse(0, 0, size, size * 0.7).fill(fish.kind.color).stroke({ color: C.ink, width: 1.2 });
    target.moveTo(-size, 0).lineTo(-size - 6, -4).moveTo(size, 0).lineTo(size + 6, -4);
    target.moveTo(-size * 0.6, size * 0.5).lineTo(-size * 0.6, size + 4);
    target.moveTo(size * 0.6, size * 0.5).lineTo(size * 0.6, size + 4);
    target.stroke({ color: C.ink, width: 1.2 });
    return;
  }

  target
    .moveTo(-size * 0.9, 0)
    .lineTo(-size * 1.7, -size * 0.7)
    .lineTo(-size * 1.7, size * 0.7)
    .closePath()
    .fill(fish.kind.color)
    .stroke({ color: C.ink, width: 1.2 });
  target.ellipse(0, 0, size * 1.3, size * 0.75).fill(fish.kind.color).stroke({ color: C.ink, width: 1.2 });
  target
    .moveTo(-size * 0.2, -size * 0.7)
    .lineTo(size * 0.3, -size * 1.1)
    .lineTo(size * 0.5, -size * 0.6)
    .closePath()
    .fill(fish.kind.color)
    .stroke({ color: C.ink, width: 1.2 });
  target.circle(size * 0.7, -size * 0.1, size * 0.22).fill("#fff");
  target.circle(size * 0.75, -size * 0.1, size * 0.1).fill(C.ink);
}

function drawNet(target: Graphics, game: Game): void {
  const net = game.net;
  const radius = game.stats.netSize + netSizeBonus(game);

  target.moveTo(net.x, 110).lineTo(net.x, net.y - radius).stroke({ color: "rgba(42,36,24,0.55)", width: 2 });
  target.moveTo(net.x - 22, 108).lineTo(net.x + 14, 100).stroke({ color: C.earth, width: 4 });
  target.circle(net.x, net.y, radius).stroke({ color: "#d8c9a0", width: 3 });
  target
    .moveTo(net.x - radius, net.y)
    .quadraticCurveTo(net.x, net.y + radius * 1.8, net.x + radius, net.y)
    .closePath()
    .fill("rgba(245,236,215,0.18)");

  for (let i = -2; i <= 2; i++) {
    const startX = net.x + (i / 2) * radius;
    target
      .moveTo(startX, net.y)
      .quadraticCurveTo(net.x, net.y + radius * 1.8, net.x + (i / 4) * radius, net.y + radius * 1.4);
  }
  target.stroke({ color: "rgba(245,236,215,0.5)", width: 1 });
}

function acquireFishView(refs: SceneRefs, id: number): FishView {
  const existing = refs.fishById.get(id);
  if (existing) return existing;

  const view = refs.freeFishViews.pop() ?? {
    node: new Graphics(),
    kindType: null,
    size: -1,
  };
  view.node.visible = true;
  refs.fishById.set(id, view);
  if (!view.node.parent) refs.fishLayer.addChild(view.node);
  return view;
}

function updateFishViews(refs: SceneRefs, fish: Fish[]): void {
  refs.activeFishIds.clear();
  for (const item of fish) {
    refs.activeFishIds.add(item.id);
    const view = acquireFishView(refs, item.id);
    if (view.kindType !== item.kind.type || view.size !== item.size) {
      view.node.clear();
      drawFishShape(view.node, item);
      view.kindType = item.kind.type;
      view.size = item.size;
    }
    view.node.position.set(item.x, item.y);
    view.node.scale.set(item.vx >= 0 ? 1 : -1, 1);
    view.node.alpha = item.flash > 0 ? 0.62 + Math.sin(item.flash * 40) * 0.18 : 1;
  }

  for (const [id, view] of refs.fishById) {
    if (refs.activeFishIds.has(id)) continue;
    refs.fishById.delete(id);
    view.node.visible = false;
    view.kindType = null;
    view.size = -1;
    refs.freeFishViews.push(view);
  }
}

function ensureFeedbackView(refs: SceneRefs, index: number): FeedbackView {
  const existing = refs.feedbackPool[index];
  if (existing) return existing;

  const root = new Container();
  const textStyle = { fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 16, fontWeight: "700" as const };
  const shadow = new Text({ text: "", style: { ...textStyle, fill: "#ffffff" } });
  const label = new Text({ text: "", style: { ...textStyle, fill: "#ffffff" } });
  shadow.anchor.set(0.5);
  label.anchor.set(0.5);
  shadow.position.set(1, 1);
  root.addChild(shadow, label);
  refs.feedbackLayer.addChild(root);

  const view = { root, shadow, label, lastText: "", lastColor: "" };
  refs.feedbackPool.push(view);
  return view;
}

function updateFeedbackViews(refs: SceneRefs, game: Game): void {
  for (let index = 0; index < game.feedback.length; index++) {
    const item = game.feedback[index];
    const view = ensureFeedbackView(refs, index);
    if (view.lastText !== item.text) {
      view.shadow.text = item.text;
      view.label.text = item.text;
      view.lastText = item.text;
    }
    if (view.lastColor !== item.color) {
      view.label.style.fill = item.color;
      view.lastColor = item.color;
    }
    const alpha = Math.max(0, 1 - item.age / item.life);
    view.root.visible = true;
    view.root.position.set(item.x, item.y);
    view.root.alpha = alpha;
    view.shadow.alpha = 0.85;
  }

  for (let index = game.feedback.length; index < refs.feedbackPool.length; index++) {
    refs.feedbackPool[index].root.visible = false;
  }
}

function initScene(app: Application): SceneRefs {
  const screenBackground = new Graphics();
  screenBackground.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT).fill(0xffffff);

  const world = new Container();
  const surfaceStatic = new Graphics();
  const sunRays = new Graphics();
  const floor = new Graphics();
  const lotusStatic = new Graphics();
  const waterLine = new Graphics();
  const fishLayer = new Container();
  const net = new Graphics();
  const ripples = new Graphics();
  const feedbackLayer = new Container();
  world.addChild(surfaceStatic, sunRays, floor, lotusStatic, waterLine, fishLayer, net, ripples, feedbackLayer);

  drawSurfaceStatic(surfaceStatic);
  drawLotusStatic(lotusStatic);

  app.stage.addChild(screenBackground, world);

  return {
    screenBackground,
    world,
    surfaceStatic,
    sunRays,
    floor,
    lotusStatic,
    waterLine,
    fishLayer,
    net,
    ripples,
    feedbackLayer,
    fishById: new Map(),
    freeFishViews: [],
    activeFishIds: new Set(),
    feedbackPool: [],
    lastBottomY: -1,
    lastBackgroundTint: -1,
  };
}

export function renderScene(app: Application, game: Game): void {
  let refs = sceneRefsMap.get(app);
  if (!refs) {
    refs = initScene(app);
    sceneRefsMap.set(app, refs);
  }

  if (refs.lastBottomY !== game.levelBottomY) {
    rebuildDepthGeometry(refs, game.levelBottomY);
    refs.lastBottomY = game.levelBottomY;
  }

  const absoluteDepthRatio = clamp(game.cameraY / Math.max(1, MAX_DEPTH_LIMIT - LOGICAL_HEIGHT), 0, 1);
  const backgroundTint = lerpColorNumber(0x7fb4c4, 0x021015, absoluteDepthRatio);
  if (refs.lastBackgroundTint !== backgroundTint) {
    refs.screenBackground.tint = backgroundTint;
    refs.lastBackgroundTint = backgroundTint;
  }

  const shake = game.shake * 4;
  refs.world.position.set(
    shake > 0 ? (Math.random() - 0.5) * shake : 0,
    -game.cameraY + (shake > 0 ? (Math.random() - 0.5) * shake : 0),
  );

  updateWaterLine(refs.waterLine, performance.now());
  updateFishViews(refs, game.fish);

  refs.net.clear();
  drawNet(refs.net, game);

  refs.ripples.clear();
  for (const ripple of game.ripples) {
    const alpha = clamp(1 - ripple.age / ripple.life, 0, 1);
    refs.ripples.circle(ripple.x, ripple.y, ripple.r).stroke({ color: 0xffffff, alpha, width: 2 });
  }

  updateFeedbackViews(refs, game);
}

export function disposeRenderScene(app: Application): void {
  sceneRefsMap.delete(app);
}
