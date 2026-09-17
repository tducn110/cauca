import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { winkGame, getWinkInitPromise, resetWinkInit } from '../client';
import { gameAudio } from '../../../app/audio/audioManager';

describe('Wink SDK v1 Adapter (07_cauca)', () => {
  let originalWink: unknown;

  beforeEach(() => {
    originalWink = (globalThis as any).Wink;
    resetWinkInit();
  });

  afterEach(() => {
    (globalThis as any).Wink = originalWink;
  });

  it('runs safely in standalone mode when window.Wink is absent', async () => {
    delete (globalThis as any).Wink;
    delete (globalThis as any).WinkBridge;
    await getWinkInitPromise();
    const round = winkGame.startRound();
    expect(round.roundId).toBeDefined();
    expect(winkGame.completeRound(round)).toBe(true);
  });

  it('connects to window.Wink SDK v1 and binds lifecycle', async () => {
    const listeners: Record<string, Function> = {};
    const mockSdk = {
      init: vi.fn(async () => mockSdk),
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      track: vi.fn(async () => {}),
      can: vi.fn((cap: string) => cap === 'submitScore' || cap === 'track'),
      on: vi.fn((event: string, cb: Function) => {
        listeners[event] = cb;
        return () => delete listeners[event];
      }),
      player: { isGuest: false, displayName: 'Cau Ca Player' },
    };

    (globalThis as any).window = globalThis;
    (globalThis as any).Wink = mockSdk;

    await getWinkInitPromise();

    const round = winkGame.startRound();
    expect(mockSdk.gameplayStart).toHaveBeenCalled();

    winkGame.completeRound(round);
    expect(mockSdk.gameplayStop).toHaveBeenCalled();

    winkGame.track('catch_fish', { kind: 'goldfish' });
    expect(mockSdk.track).toHaveBeenCalledWith('catch_fish', { kind: 'goldfish' });
  });

  it('enforces audio contract: effectiveMuted = hostMuted || playerMuted', () => {
    // Player unmutes, host unmutes -> effective false
    gameAudio.setMuted(false);
    gameAudio.setHostMuted(false);
    expect(gameAudio.getEffectiveMuted()).toBe(false);

    // Host mutes -> effective true
    gameAudio.setHostMuted(true);
    expect(gameAudio.getEffectiveMuted()).toBe(true);

    // Host unmutes -> effective false
    gameAudio.setHostMuted(false);
    expect(gameAudio.getEffectiveMuted()).toBe(false);

    // Player mutes -> effective true
    gameAudio.setMuted(true);
    expect(gameAudio.getEffectiveMuted()).toBe(true);

    // Host unmuting MUST NOT unmute if player is muted
    gameAudio.setHostMuted(false);
    expect(gameAudio.getEffectiveMuted()).toBe(true);

    // Player unmutes -> returns to unmuted
    gameAudio.setMuted(false);
    expect(gameAudio.getEffectiveMuted()).toBe(false);
  });
});
