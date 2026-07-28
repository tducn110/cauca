import { describe, expect, it, vi } from "vitest";
import { Graphics, Application, Container } from "pixi.js";
import { drawFishShape, updateFishPositions } from "./fishRenderer";
import { createCaptureController, tickCaptureState, distanceToSegment } from "./captureController";
import { buildAmbient } from "./ambientRenderer";
import { FISH_KINDS } from "../../game/fish-data";
import { createDockLayout } from "../dockLayout";
import { DUCK_ANIMATION_SOURCE, BOAT_PIVOT_X_PX, BOAT_PIVOT_Y_PX } from "../fishingAnimation";

vi.mock('pixi.js', () => {
  class MockGraphics {
    clear() { return this; }
    ellipse() { return this; }
    circle() { return this; }
    arc() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    bezierCurveTo() { return this; }
    closePath() { return this; }
    fill() { return this; }
    stroke() { return this; }
    rect() { return this; }
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    rotation = 0;
    x = 0; y = 0; alpha = 1;
    destroyed = false;
    destroy() { this.destroyed = true; }
    addChild() {}
  }
  class MockContainer {
    addChild() {}
    destroy() {}
    position = { set: vi.fn() };
    x = 0; y = 0; rotation = 0; alpha = 1;
  }
  class MockText {
    style: any = {};
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    alpha = 1;
    destroy() {}
  }
  class MockAnimatedSprite {
    animationSpeed = 0;
    stop() {}
    anchor = { set: vi.fn(), x: 0, y: 0 };
    scale = { set: vi.fn(), x: 1, y: 1 };
    position = { set: vi.fn(), x: 0, y: 0 };
    currentFrame = 0;
    destroy() {}
  }
  class MockSprite {
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
    position = { set: vi.fn() };
    destroy() {}
  }
  return {
    Graphics: MockGraphics,
    Container: MockContainer,
    Text: MockText,
    AnimatedSprite: MockAnimatedSprite,
    Application: vi.fn(),
    Assets: { load: vi.fn().mockResolvedValue({}) },
    Sprite: MockSprite,
    FillGradient: vi.fn(),
    Texture: {},
    Circle: class {},
  };
});

vi.mock("./fishingAssets", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    validateDuckFrameTextures: vi.fn(),
  };
});

vi.mock("../FishingPowerGauge", () => {
  return {
    FishingPowerGauge: class {
      position = { set: vi.fn() };
      scale = { set: vi.fn() };
      addChild = vi.fn();
      destroy = vi.fn();
      on = vi.fn();
      emit = vi.fn();
      reset = vi.fn();
      setDisabled = vi.fn();
    }
  };
});

import type { DockViewportLayout } from "../dockLayout";
import { buildCharacterNodes, updateCharacterAnimation } from "./characterRenderer";

const mockLayout = {
  width: 1000,
  height: 800,
  waterlineY: 300,
  gameplayAxisX: 500,
  channelWidth: 200,
  wide: false,
  worldLeft: 0,
  worldWidth: 1000,
  boatAnchor: { x: 630, y: 304 },
  characterAnchor: { x: 630, y: 304 },
  characterWidth: 100,
  playGaugeCenter: { x: 500, y: 700 },
  playGaugeSize: 100,
  upgradePanelCenter: { x: 100, y: 700 },
  hook: { x: 500, y: 300 },
} as DockViewportLayout;

// ─────────────────────────────────────────────────────────
// PIVOT CONSTANTS
// ─────────────────────────────────────────────────────────
describe("pivot normalization", () => {
  it("anchorX equals BOAT_PIVOT_X_PX / frame width", () => {
    expect(DUCK_ANIMATION_SOURCE.anchorX).toBeCloseTo(BOAT_PIVOT_X_PX / DUCK_ANIMATION_SOURCE.width, 5);
  });

  it("anchorY equals BOAT_PIVOT_Y_PX / frame height", () => {
    expect(DUCK_ANIMATION_SOURCE.anchorY).toBeCloseTo(BOAT_PIVOT_Y_PX / DUCK_ANIMATION_SOURCE.height, 5);
  });

  it("anchor values match exact expectations", () => {
    expect(DUCK_ANIMATION_SOURCE.anchorX).toBeCloseTo(0.5, 5);
    expect(DUCK_ANIMATION_SOURCE.anchorY).toBeCloseTo(510 / 541, 4);
  });
});

// ─────────────────────────────────────────────────────────
// CHARACTER HIERARCHY
// ─────────────────────────────────────────────────────────
describe("characterRenderer hierarchy", () => {
  it("buildCharacterNodes sets anchor to hull-bottom pivot", () => {
    const fakeTextures = [{}] as any;
    const nodes = buildCharacterNodes(fakeTextures);
    expect(nodes.sprite.anchor.set).toHaveBeenCalledWith(
      DUCK_ANIMATION_SOURCE.anchorX,
      DUCK_ANIMATION_SOURCE.anchorY,
    );
    // sprite local position must be (0,0) after setup
    expect(nodes.sprite.position.set).toHaveBeenCalledWith(0, 0);
  });

  it("updateCharacterAnimation: boatBob.y and rotation follow waveMotion", () => {
    const nodes = buildCharacterNodes([] as any);
    const shadow = new Graphics();
    nodes.boatShadow = shadow;
    
    nodes.boatBob.y = 0;
    nodes.boatBob.rotation = 0;

    for (let t = 0; t <= 100; t += 25) {
      updateCharacterAnimation(nodes, "idle", 0, t, { bobY: 3.2, tilt: 0.04 });
      // HULL_SINK_PX is 2
      expect(nodes.boatBob.y).toBe(2 + 3.2);
      expect(nodes.boatBob.rotation).toBe(0.04);
    }
  });

  it("updateCharacterAnimation: boatRoot is never touched", () => {
    const nodes = buildCharacterNodes([] as any);
    const shadow = new Graphics();
    nodes.boatShadow = shadow;

    nodes.boatRoot.x = 999;
    nodes.boatRoot.y = 999;

    updateCharacterAnimation(nodes, "idle", 0, 1.5, { bobY: 3.2, tilt: 0.04 });

    // boatRoot must be untouched.
    expect(nodes.boatRoot.x).toBe(999);
    expect(nodes.boatRoot.y).toBe(999);
  });

  it("updateCharacterAnimation: does NOT write boatRoot.x or boatRoot.y", () => {
    const nodes = buildCharacterNodes([] as any);
    const shadow = new Graphics();
    nodes.boatShadow = shadow;

    nodes.boatRoot.x = 999;
    nodes.boatRoot.y = 999;

    updateCharacterAnimation(nodes, "idle", 0, 1.5);

    // Root position must be untouched
    expect(nodes.boatRoot.x).toBe(999);
    expect(nodes.boatRoot.y).toBe(999);
  });

  it("updateCharacterAnimation: does NOT mutate sprite.scale between frames", () => {
    const nodes = buildCharacterNodes([] as any);
    const shadow = new Graphics();
    nodes.boatShadow = shadow;

    const initialScaleX = nodes.sprite.scale.x;
    const initialScaleY = nodes.sprite.scale.y;

    for (let frame = 0; frame < 6; frame++) {
      updateCharacterAnimation(nodes, "casting", frame * 0.085, 1.0);
    }

    expect(nodes.sprite.scale.set).not.toHaveBeenCalled();
    expect(nodes.sprite.scale.x).toBe(initialScaleX);
    expect(nodes.sprite.scale.y).toBe(initialScaleY);
  });

  it("frame animation does not move sprite.position (anchor pivot stays fixed)", () => {
    const nodes = buildCharacterNodes([] as any);
    const shadow = new Graphics();
    nodes.boatShadow = shadow;

    // Record calls after initial setup
    vi.clearAllMocks();

    for (let frame = 0; frame < 6; frame++) {
      updateCharacterAnimation(nodes, "casting", frame * 0.085, 1.0);
    }

    // position.set must NOT have been called by characterRenderer
    expect(nodes.sprite.position.set).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────
// RESPONSIVE LAYOUT: boatAnchor matches waterlineY
// ─────────────────────────────────────────────────────────
describe("responsive layout – boatAnchor sits on waterline", () => {
  const viewports = [
    { w: 1920, h: 1080, label: "1920x1080 desktop" },
    { w: 1366, h: 768, label: "1366x768 laptop" },
    { w: 844, h: 390, label: "844x390 landscape phone" },
    { w: 390, h: 844, label: "390x844 portrait phone" },
  ];

  for (const { w, h, label } of viewports) {
    it(`${label}: boatAnchor.y is within 10px of waterlineY`, () => {
      const layout = createDockLayout(w, h);
      // boatAnchor.y = waterlineY + 4 in dockLayout.ts
      expect(Math.abs(layout.boatAnchor.y - layout.waterlineY)).toBeLessThanOrEqual(10);
    });

    it(`${label}: boatAnchor.x is right-of-centre (boat on shore side)`, () => {
      const layout = createDockLayout(w, h);
      expect(layout.boatAnchor.x).toBeGreaterThan(layout.width * 0.5);
    });
  }
});

// ─────────────────────────────────────────────────────────
// NO FISHING LINE OR HOOK OBJECTS
// ─────────────────────────────────────────────────────────
describe("no visual hook artifacts", () => {
  it("fishRenderer module exports do not include lineGraphics or hookGraphics", async () => {
    const mod = await import("./fishRenderer");
    expect(Object.keys(mod)).not.toContain("lineGraphics");
    expect(Object.keys(mod)).not.toContain("hookGraphics");
  });

  it("characterRenderer module exports do not include lineGraphics or hookGraphics", async () => {
    const mod = await import("./characterRenderer");
    expect(Object.keys(mod)).not.toContain("lineGraphics");
    expect(Object.keys(mod)).not.toContain("hookGraphics");
  });
});

// ─────────────────────────────────────────────────────────
// FISH RENDERER
// ─────────────────────────────────────────────────────────
describe("fishRenderer", () => {
  it("drawFishShape does not throw for any FISH_KINDS entry", () => {
    const g = new Graphics();
    for (const kind of FISH_KINDS) {
      expect(() => drawFishShape(g, kind, 20)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────
// CAPTURE CONTROLLER
// ─────────────────────────────────────────────────────────
describe("captureController", () => {
  it("descending mode advances capturePointY", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "descending";
    state.targetDepthMeters = 100;
    state.capturePointY = mockLayout.waterlineY;
    const initialY = state.capturePointY;
    tickCaptureState(state, 0.016, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.capturePointY).toBeGreaterThan(initialY);
  });

  it("ascending mode detects collision and catches fish", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    state.capturePointY = 300;
    state.maxCapacityCount = 5;
    const activeFishList = [{ id: 1, kind: FISH_KINDS[0], x: 500, depthY: 305, vx: 10, size: 10, node: new Graphics(), isCaught: false }];
    const onFishCaught = vi.fn();
    tickCaptureState(state, 0.016, mockLayout, activeFishList, [], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).toHaveBeenCalledWith(activeFishList[0]);
    expect(activeFishList[0].isCaught).toBe(true);
  });

  it("ascending to surfaceBurst transition when capturePointY reaches waterline", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointY = mockLayout.waterlineY + 20;
    state.maxCapacityCount = 5;
    tickCaptureState(state, 0.5, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.fishingState).toBe("surfaceBurst");
    expect(state.capturePointY).toBe(mockLayout.waterlineY + 25);
  });

  it("caught fish positions cluster around capturePoint", () => {
    const activeFishList = [
      { id: 1, kind: FISH_KINDS[0], x: 0, depthY: 0, vx: 10, size: 10, node: new Graphics(), isCaught: true },
      { id: 2, kind: FISH_KINDS[0], x: 0, depthY: 0, vx: 10, size: 10, node: new Graphics(), isCaught: true },
      { id: 3, kind: FISH_KINDS[0], x: 0, depthY: 0, vx: 10, size: 10, node: new Graphics(), isCaught: true },
    ];
    updateFishPositions(activeFishList, activeFishList, 500, 300, mockLayout, 0.016);
    for (const fish of activeFishList) {
      expect(Math.abs(fish.x - 500)).toBeLessThanOrEqual(50);
      expect(Math.abs(fish.depthY - 300)).toBeLessThanOrEqual(150);
    }
  });

  // ── MANDATORY GAMEPLAY FLOW TESTS ──
  it("1. descending through fish does not catch", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "descending";
    state.targetDepthMeters = 200;
    state.maxCapacityCount = 5;
    state.capturePointY = mockLayout.waterlineY + 100;
    const fish = { id: 1, kind: FISH_KINDS[0], x: mockLayout.gameplayAxisX, depthY: mockLayout.waterlineY + 110, vx: 10, size: 12, node: new Graphics(), isCaught: false };
    const onFishCaught = vi.fn();
    tickCaptureState(state, 0.016, mockLayout, [fish], [], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).not.toHaveBeenCalled();
    expect(fish.isCaught).toBe(false);
  });

  it("2. fish counter remains zero during descending", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "descending";
    state.targetDepthMeters = 500;
    state.maxCapacityCount = 5;
    state.capturePointY = mockLayout.waterlineY + 50;
    const caughtFishList: any[] = [];
    const fish = [
      { id: 1, kind: FISH_KINDS[0], x: mockLayout.gameplayAxisX, depthY: mockLayout.waterlineY + 100, vx: 10, size: 12, node: new Graphics(), isCaught: false },
      { id: 2, kind: FISH_KINDS[1], x: mockLayout.gameplayAxisX, depthY: mockLayout.waterlineY + 200, vx: -10, size: 14, node: new Graphics(), isCaught: false },
    ];
    for (let i = 0; i < 30; i++) {
      tickCaptureState(state, 0.016, mockLayout, fish, caughtFishList, { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    }
    expect(caughtFishList.length).toBe(0);
  });

  it("3. fishing line cannot catch fish in descending", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "descending";
    state.targetDepthMeters = 200;
    state.maxCapacityCount = 5;
    state.capturePointY = mockLayout.waterlineY + 50;
    const fish = { id: 1, kind: FISH_KINDS[0], x: mockLayout.gameplayAxisX, depthY: mockLayout.waterlineY + 60, vx: 0, size: 15, node: new Graphics(), isCaught: false };
    const onFishCaught = vi.fn();
    tickCaptureState(state, 0.016, mockLayout, [fish], [], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).not.toHaveBeenCalled();
    expect(fish.isCaught).toBe(false);
  });

  it("4. ascending swept path catches fish when hook moves farther than fish diameter", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    state.capturePointY = 500;
    state.targetCaptureX = 500;
    state.maxCapacityCount = 5;
    const fish = { id: 1, kind: FISH_KINDS[0], x: 500, depthY: 400, vx: 10, size: 10, node: new Graphics(), isCaught: false };
    const onFishCaught = vi.fn();
    tickCaptureState(state, 0.5, mockLayout, [fish], [], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).toHaveBeenCalledWith(fish);
    expect(fish.isCaught).toBe(true);
  });

  it("5. the same fish cannot be caught twice", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    state.capturePointY = 310;
    state.targetCaptureX = 500;
    state.maxCapacityCount = 5;
    const fish = { id: 1, kind: FISH_KINDS[0], x: 500, depthY: 305, vx: 10, size: 10, node: new Graphics(), isCaught: false };
    const onFishCaught = vi.fn();
    tickCaptureState(state, 0.016, mockLayout, [fish], [], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).toHaveBeenCalledTimes(1);
    state.capturePointY = 305;
    tickCaptureState(state, 0.016, mockLayout, [fish], [fish], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).toHaveBeenCalledTimes(1);
  });

  it("6. capacity prevents additional catches", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    state.capturePointY = 310;
    state.targetCaptureX = 500;
    state.maxCapacityCount = 1;
    const fish1 = { id: 1, kind: FISH_KINDS[0], x: 500, depthY: 305, vx: 10, size: 10, node: new Graphics(), isCaught: true };
    const fish3 = { id: 3, kind: FISH_KINDS[2], x: 500, depthY: 300, vx: 10, size: 8, node: new Graphics(), isCaught: false };
    const onFishCaught = vi.fn();
    tickCaptureState(state, 0.016, mockLayout, [fish1, fish3], [fish1], { onFishCaught, onCapacityFull: vi.fn() });
    expect(onFishCaught).not.toHaveBeenCalled();
    expect(fish3.isCaught).toBe(false);
  });

  it("7. bottom transition enters ascending immediately", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "descending";
    state.targetDepthMeters = 100;
    state.maxCapacityCount = 5;
    state.capturePointY = mockLayout.waterlineY + 100 * 2.8 - 1;
    tickCaptureState(state, 0.016, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.fishingState).toBe("ascending");
  });

  it("8. fish attaches immediately after an ascending collision", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    state.capturePointY = 310;
    state.targetCaptureX = 500;
    state.maxCapacityCount = 5;
    const fish = { id: 1, kind: FISH_KINDS[0], x: 500, depthY: 305, vx: 10, size: 10, node: new Graphics(), isCaught: false };
    const caughtList: any[] = [];
    tickCaptureState(state, 0.016, mockLayout, [fish], caughtList, { onFishCaught: (f) => { caughtList.push(f); }, onCapacityFull: vi.fn() });
    updateFishPositions([fish], caughtList, state.capturePointX, state.capturePointY, mockLayout, 0.016);
    expect(Math.abs(fish.x - state.capturePointX)).toBeLessThanOrEqual(50);
    expect(Math.abs(fish.depthY - state.capturePointY)).toBeLessThanOrEqual(60);
  });

  it("9. depth milestone never appears during ascending", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    state.capturePointY = 400;
    state.targetCaptureX = 500;
    state.maxCapacityCount = 5;
    state.targetDepthMeters = 500;
    tickCaptureState(state, 0.016, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.fishingState).toBe("ascending");
  });

  it("10. surfaceBurst transitions to payout exactly once", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "surfaceBurst";
    state.surfaceBurstTimer = 0.01;
    state.maxCapacityCount = 5;
    tickCaptureState(state, 0.02, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.fishingState).toBe("payout");
    expect(state.resultFired).toBe(false);
  });

  it("11. captureController has no visible circle output (no debug circle)", async () => {
    const mod = await import("./captureController");
    expect(Object.keys(mod)).not.toContain("drawControlCircle");
    expect(Object.keys(mod)).not.toContain("createDebugCircle");
  });

  it("distanceToSegment returns 0 when point is on the segment", () => {
    expect(distanceToSegment(5, 5, 0, 0, 10, 10)).toBeCloseTo(0, 5);
  });

  it("distanceToSegment clamps to segment endpoints", () => {
    expect(distanceToSegment(15, 0, 0, 0, 10, 0)).toBeCloseTo(5, 5);
    expect(distanceToSegment(-3, 0, 0, 0, 10, 0)).toBeCloseTo(3, 5);
  });
});

// ─────────────────────────────────────────────────────────
// WATER SURFACE MOTION
// ─────────────────────────────────────────────────────────
describe("water surface motion", () => {
  it("sampleBoatWaveMotion stays within the idle animation spec bounds", async () => {
    const { sampleBoatWaveMotion, WATER_SURFACE_MOTION } = await import("./sceneLayout");
    const maxBob = (WATER_SURFACE_MOTION.front.amplitude + (WATER_SURFACE_MOTION.front.amplitude2 || 0)) * 0.5 + 1e-6;

    for (let t = 0; t <= 40; t += 0.1) {
      const { bobY, tilt } = sampleBoatWaveMotion(630, t);
      // Ensure bob doesn't exceed the actual combined wave amplitude scaled by factor
      expect(Math.abs(bobY)).toBeLessThanOrEqual(maxBob);
      // animation.json spec: idleBoatTiltDeg 1.2 → clamped under ±2.6°
      expect(Math.abs(tilt)).toBeLessThanOrEqual(0.045 + 1e-6);
    }
  });

  it("sampleBoatWaveMotion bob matches the front wave height at the boat position", async () => {
    const { sampleBoatWaveMotion, sampleWaveHeight, WATER_SURFACE_MOTION } = await import("./sceneLayout");

    for (let t = 0; t <= 12; t += 0.37) {
      const { bobY } = sampleBoatWaveMotion(412, t);
      const waveHeight = sampleWaveHeight(412, WATER_SURFACE_MOTION.front, t);
      expect(bobY).toBeCloseTo(waveHeight * 0.5, 5);
    }
  });
});

// ─────────────────────────────────────────────────────────
// AMBIENT RENDERER
// ─────────────────────────────────────────────────────────
describe("ambientRenderer", () => {
  it("buildAmbient creates 16 bubbles", () => {
    const ambient = buildAmbient();
    expect(ambient.bubbles).toHaveLength(16);
  });
});

// ─────────────────────────────────────────────────────────
// REGRESSION TESTS (Strict Mode Texture Lifecycle)
// ─────────────────────────────────────────────────────────
describe("regression: texture lifecycle in Strict Mode", () => {
  it("destroy runtime does not destroy shared texture sources", async () => {
    (globalThis as any).window = { devicePixelRatio: 1, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    
    let appDestroyOptions: any = null;
    vi.mocked(Application).mockImplementationOnce(function (this: any) {
      this.init = vi.fn().mockResolvedValue(undefined);
      this.destroy = vi.fn((_opt1, opt2) => {
        appDestroyOptions = opt2;
      });
      this.stage = new Container();
      this.ticker = { add: vi.fn(), maxFPS: 60, minFPS: 10 };
      this.canvas = { className: "", setAttribute: vi.fn(), dataset: {} };
    });
    
    // We only need to import the factory to test the destroy logic
    const { createDockRuntime } = await import("./createDockRuntime");
    
    const host = { prepend: vi.fn(), classList: { add: vi.fn(), toggle: vi.fn(), remove: vi.fn() }, querySelector: vi.fn() } as any;
    const callbacks = {
      disabledRef: { current: false },
      callbackRef: { current: vi.fn() },
      catchCompleteRef: { current: vi.fn() },
      stateChangeRef: { current: vi.fn() },
      capacityLevelRef: { current: 1 },
      depthLevelRef: { current: 1 }
    };
    
    const onFail = vi.fn((err, op) => console.error(op, err));
    const runtime = await createDockRuntime(host, mockLayout, callbacks, onFail, { canceled: false });
    expect(runtime).not.toBeNull();
    
    // Call destroy on the runtime
    runtime!.destroy();
    
    // Validate that the second option passed to app.destroy explicitly prevents texture destruction
    expect(appDestroyOptions).toBeDefined();
    expect(appDestroyOptions.texture).toBe(false);
    expect(appDestroyOptions.textureSource).toBe(false);
    expect(appDestroyOptions.children).toBe(true);
  });
});
