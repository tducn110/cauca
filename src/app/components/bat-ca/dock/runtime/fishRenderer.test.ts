import { describe, it, expect, vi } from 'vitest';
import { Container, Graphics } from 'pixi.js';
import { updateFishPositions } from './fishRenderer';
import { ActiveFish } from './runtimeTypes';

describe('fishRenderer updates', () => {
  it('updates effectController exactly once per fish even if in both active and caught lists', () => {
    const mockController = {
      update: vi.fn(),
      onCaught: vi.fn(),
      destroy: vi.fn(),
    };
    
    const node = new Container();
    const fish: ActiveFish = {
      id: 0, x: 0,
      depthY: 100,
      vx: 1,
      size: 10,
      node,
      bodyGraphic: new Graphics(),
      isCaught: true, // it is caught
      effectController: mockController,
      kind: { type: 'hoangkim', name: 'Golden', value: 100, weight: 1, depthMin: 0, depthMax: 100, speed: 1, size: 10, rarity: 1, isBad: false, behavior: 'golden', color: '#000', belly: '#fff' }
    };
    
    // Simulate the bug where the fish is in both lists
    const activeFishList = [fish];
    const caughtFishList = [fish];
    
    const layout = {
      gameplayAxisX: 0,
      waterlineY: 0,
      channelWidth: 800,
      __fishingState: "fishing"
    } as any;
    
    updateFishPositions(activeFishList, caughtFishList, 0, 0, layout, 0.16);
    
    expect(mockController.update).toHaveBeenCalledTimes(1);
    expect(mockController.update).toHaveBeenCalledWith(0.16, fish);
  });
});
