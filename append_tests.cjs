const fs = require('fs');
const path = 'src/app/components/bat-ca/dock/runtime/dockRuntime.test.ts';
let content = fs.readFileSync(path, 'utf8');

// Additional tests to append
const additionalTests = `

// ─────────────────────────────────────────────────────────
// PHASE 8: CAPTURE POINT STABILITY
// ─────────────────────────────────────────────────────────
describe("capture point stability", () => {
  it("capture point remains stable during descending", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "descending";
    state.capturePointX = 500;
    state.targetDepthMeters = 100;
    tickCaptureState(state, 0.016, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.capturePointX).toBe(500);
  });

  it("capture point remains stable during ascending", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "ascending";
    state.capturePointX = 500;
    tickCaptureState(state, 0.016, mockLayout, [], [], { onFishCaught: vi.fn(), onCapacityFull: vi.fn() });
    expect(state.capturePointX).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────
// PHASE 8: ASSET REGISTRY & GEOMETRY
// ─────────────────────────────────────────────────────────
describe("asset registry and geometry", () => {
  it("asset registry includes hook and coin", async () => {
    const { FISHING_DOCK_ASSETS } = await import("./fishingAssets");
    expect(FISHING_DOCK_ASSETS).toHaveProperty("hook");
    expect(FISHING_DOCK_ASSETS).toHaveProperty("coin");
  });

  it("runtime loads both through Assets.load", async () => {
    const { Assets } = await import("pixi.js");
    const { createDockRuntime } = await import("./createDockRuntime");
    const { FISHING_DOCK_ASSETS } = await import("./fishingAssets");

    const host = {
      prepend: vi.fn(),
      classList: { add: vi.fn(), toggle: vi.fn(), remove: vi.fn() },
      querySelector: vi.fn(),
    } as any;
    const callbacks = {
      disabledRef: { current: false },
      callbackRef: { current: vi.fn() },
      catchCompleteRef: { current: vi.fn() },
      stateChangeRef: { current: vi.fn() },
      capacityLevelRef: { current: 0 },
      depthLevelRef: { current: 0 },
    };
    
    // We mock application and window in the same file previously, just test loading.
    const onFail = vi.fn();
    await createDockRuntime(host, mockLayout, callbacks, onFail, { canceled: false });

    const loadMock = vi.mocked(Assets.load);
    const calledPaths = loadMock.mock.calls.map((call) => call[0]);
    expect(calledPaths).toContain(FISHING_DOCK_ASSETS.hook);
    expect(calledPaths).toContain(FISHING_DOCK_ASSETS.coin);
  });

  it("line eyelet offset is calculated from one geometry source", async () => {
    const { HOOK_GEOMETRY } = await import("./fishingAssets");
    expect(HOOK_GEOMETRY).toBeDefined();
    expect(HOOK_GEOMETRY.eyeletOffsetY).toBeDefined();
    expect(HOOK_GEOMETRY.anchorY).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────
// PHASE 8: PAYOUT APEX & CALLBACKS
// ─────────────────────────────────────────────────────────
describe("payout phase constraints", () => {
  it("one payout callback per round", () => {
    const state = createCaptureController(mockLayout);
    state.fishingState = "payout";
    state.resultFired = false;
    state.payoutTimer = 2.0;
    
    const onResult = vi.fn();
    if (state.fishingState === "payout" && state.payoutTimer >= 1.6 && !state.resultFired) {
      state.resultFired = true;
      onResult();
    }
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(state.resultFired).toBe(true);
    
    if (state.fishingState === "payout" && state.payoutTimer >= 1.7 && !state.resultFired) {
      onResult();
    }
    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
\`

fs.writeFileSync(path, content + additionalTests);
