import { describe, it, expect, vi } from 'vitest';
import { Container, Graphics } from 'pixi.js';
import { createSpecialEffect } from './specialEffects';
import { FishKind, SpecialVisual } from '../../game/types';
import { ActiveFish } from './runtimeTypes';

// Mock audio to prevent error during testing
vi.mock('../../../../audio/audioManager', () => ({
  gameAudio: {
    play: vi.fn(),
  }
}));

describe('specialEffects', () => {
  const createMockFish = (kind: FishKind): ActiveFish => {
    const node = new Container();
    const bodyGraphic = new Graphics();
    node.addChild(bodyGraphic);
    return {
      id: 0, x: 0,
      depthY: 100,
      vx: 1,
      size: 10,
      node,
      bodyGraphic,
      isCaught: false,
      kind
    };
  };

  const goldenKind: FishKind = { type: 'hoangkim', name: 'Golden', value: 100, weight: 1, depthMin: 0, depthMax: 100, speed: 1, size: 10, rarity: 1, isBad: false, behavior: 'golden', color: '#000', belly: '#fff', specialVisual: 'golden' };
  const normalKind: FishKind = { type: 'normal', name: 'Normal', value: 10, weight: 1, depthMin: 0, depthMax: 100, speed: 1, size: 10, rarity: 1, isBad: false, behavior: 'normal', color: '#000', belly: '#fff' };

  it('creates controller for special fish', () => {
    const parent = new Container();
    const bodyGraphic = new Graphics();
    const controller = createSpecialEffect('golden', parent, bodyGraphic, goldenKind);
    expect(controller).toBeDefined();
    expect(parent.children.length).toBeGreaterThan(0);
  });

  it('creates empty controller for normal fish (default fallback)', () => {
    const parent = new Container();
    const bodyGraphic = new Graphics();
    const controller = createSpecialEffect('unknown' as SpecialVisual, parent, bodyGraphic, normalKind);
    expect(controller).toBeDefined();
    expect(parent.children.length).toBe(0);
  });

  it('bounds child count on repeated updates', () => {
    const parent = new Container();
    const bodyGraphic = new Graphics();
    const controller = createSpecialEffect('electric', parent, bodyGraphic, goldenKind);
    const initialChildren = parent.children.length;
    
    const fish = createMockFish(goldenKind);
    for (let i = 0; i < 10; i++) {
      controller.update(0.16, fish);
    }
    
    expect(parent.children.length).toBe(initialChildren);
  });

  it('triggers onCaught exactly once and bounds child count', () => {
    const parent = new Container();
    const bodyGraphic = new Graphics();
    const controller = createSpecialEffect('ghost', parent, bodyGraphic, goldenKind);
    const initialChildren = parent.children.length;
    
    const fish = createMockFish(goldenKind);
    
    controller.onCaught(fish);
    expect(parent.children.length).toBe(initialChildren);
    const afterCaughtChildren = parent.children.length;
    
    // Call again, shouldn't increase child count further
    controller.onCaught(fish);
    expect(parent.children.length).toBe(afterCaughtChildren);
  });

  it('cleans up idempotently without throwing', () => {
    const parent = new Container();
    const bodyGraphic = new Graphics();
    const controller = createSpecialEffect('rainbow', parent, bodyGraphic, goldenKind);
    
    // Should not throw
    controller.destroy();
    controller.destroy();
    
    // update and onCaught after destroy should not throw
    controller.update(0.16, createMockFish(goldenKind));
    controller.onCaught(createMockFish(goldenKind));
  });
});
