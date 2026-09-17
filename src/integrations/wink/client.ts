export interface WinkRound {
  readonly roundId: string;
  readonly startedAtMs: number;
}

export interface WinkLifecycleHandlers {
  onPause?: () => void;
  onResume?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
}

export interface LeaderboardEntry {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  score: number;
  playTime: number | null;
  rank: number;
  createdAt: string | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total?: number;
  me?: LeaderboardEntry | null;
}

export interface SubmitScoreResponse {
  entry: LeaderboardEntry | null;
  isNewBest: boolean;
  previousBest: number | null;
}

export interface WinkBridgeCapabilities {
  getLeaderboard: boolean;
  submitScore: boolean;
  complete: boolean;
  track?: boolean;
}

export interface WinkBridgeState {
  phase: 'booting' | 'ready_anonymous' | 'ready_authenticated' | 'error';
  displayName: string | null;
}

interface WinkApi {
  init?(): Promise<WinkApi | void>;
  gameplayStart?(): void;
  gameplayStop?(): void;
  complete?(input: any): void;
  submitScore?(input: any): Promise<any>;
  getLeaderboard?(options?: any): Promise<any>;
  getPersonalBest?(): Promise<any>;
  on?(event: string, listener: () => void): () => void;
  can?(capability: string): boolean;
  track?(eventName: string, properties?: any): Promise<void>;
  player?: {
    isGuest: boolean;
    displayName: string | null;
  };
}

declare global {
  interface Window {
    Wink?: WinkApi;
  }
}

let globalInitPromise: Promise<WinkApi> | null = null;
let boundWinkInstance: unknown = null;
let cachedSdk: WinkApi | null = null;

export function resetWinkInit() {
  globalInitPromise = null;
  boundWinkInstance = null;
  cachedSdk = null;
}

export function getWinkInitPromise(): Promise<WinkApi> {
  const currentWink = typeof window !== "undefined" ? window.Wink : undefined;
  if (!globalInitPromise || boundWinkInstance !== currentWink) {
    boundWinkInstance = currentWink;
    if (typeof window !== "undefined" && window.Wink?.init) {
      globalInitPromise = window.Wink.init().then((res) => {
        cachedSdk = (res || window.Wink) as WinkApi;
        return cachedSdk;
      }).catch(() => {
        cachedSdk = window.Wink as WinkApi;
        return cachedSdk;
      });
    } else {
      cachedSdk = (typeof window !== "undefined" ? window.Wink : undefined) as WinkApi;
      globalInitPromise = Promise.resolve(cachedSdk);
    }
  }
  return globalInitPromise;
}

function newRoundId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `round-${Date.now().toString(16)}-${random}`;
}

const DENIED: WinkBridgeCapabilities = Object.freeze({
  getLeaderboard: false,
  submitScore: false,
  complete: false,
});

export class WinkGameIntegration {
  #completedRounds = new Set<string>();
  #disposers: Array<() => void> = [];
  #stateListeners: Array<(state: WinkBridgeState) => void> = [];

  constructor() {
    getWinkInitPromise().then(() => this.#notifyState());
  }

  get #sdk(): WinkApi | null {
    return cachedSdk || (typeof window !== "undefined" ? window.Wink : null) as WinkApi | null;
  }

  startRound(): WinkRound {
    if (this.#sdk?.gameplayStart) {
      try { this.#sdk.gameplayStart(); } catch {}
    }
    return Object.freeze({
      roundId: newRoundId(),
      startedAtMs: Date.now(),
    });
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    if (this.#sdk?.can?.('track') && this.#sdk?.track) {
      this.#sdk.track(eventName, properties).catch(() => {});
    }
  }

  completeRound(
    round: WinkRound,
    extra: { playDurationMs?: number; [key: string]: unknown } = {},
  ): boolean {
    if (this.#completedRounds.has(round.roundId)) {
      return false;
    }
    this.#completedRounds.add(round.roundId);

    const { playDurationMs, ...rest } = extra;
    const duration = Math.max(0, Math.round(playDurationMs ?? Date.now() - round.startedAtMs));

    if (this.#sdk?.gameplayStop) {
      this.#sdk.gameplayStop();
    } else if (this.#sdk?.complete) {
      this.#sdk.complete({ roundId: round.roundId, playDurationMs: duration, ...rest });
    }
    return true;
  }

  lastSubmittedEntryId: string | null = null;

  async submitFinalScore(input: { score: number; playTime?: number; [key: string]: unknown }): Promise<SubmitScoreResponse> {
    const sdk = await getWinkInitPromise();
    if (!sdk?.can?.('submitScore') || !sdk?.submitScore) {
      return { entry: null, isNewBest: false, previousBest: null };
    }
    const res = await sdk.submitScore(input);
    if (res && res.entry) {
      this.lastSubmittedEntryId = res.entry.id;
    }
    return {
      entry: res?.entry || null,
      isNewBest: res?.isNewBest || false,
      previousBest: res?.previousBest || null,
    };
  }

  async getPersonalBest(): Promise<LeaderboardEntry | null> {
    const sdk = await getWinkInitPromise();
    if (sdk?.can?.('getLeaderboard') && sdk?.getPersonalBest) {
      const res = await sdk.getPersonalBest();
      return res?.me ?? null;
    }
    return null;
  }

  async refreshLeaderboard(options?: { limit?: number; offset?: number }): Promise<LeaderboardResponse> {
    const sdk = await getWinkInitPromise();
    if (sdk?.can?.('getLeaderboard') && sdk?.getLeaderboard) {
      const res = await sdk.getLeaderboard(options);
      return {
        entries: res?.entries || [],
        total: res?.total,
        me: res?.me,
      };
    }
    return { entries: [], total: 0, me: null };
  }

  get capabilities(): WinkBridgeCapabilities {
    if (!this.#sdk?.can) return DENIED;
    return {
      getLeaderboard: this.#sdk.can('getLeaderboard'),
      submitScore: this.#sdk.can('submitScore'),
      complete: this.#sdk.can('complete') || true,
      track: this.#sdk.can('track'),
    };
  }

  get state(): WinkBridgeState | null {
    if (!this.#sdk) return null;
    const isGuest = this.#sdk.player?.isGuest ?? true;
    return {
      phase: isGuest ? 'ready_anonymous' : 'ready_authenticated',
      displayName: this.#sdk.player?.displayName ?? null,
    };
  }

  get displayName(): string | null {
    return this.state?.displayName ?? null;
  }

  get canSubmitScore(): boolean {
    return this.capabilities.submitScore === true;
  }

  #notifyState() {
    const s = this.state;
    if (s) {
      this.#stateListeners.forEach(l => l(s));
    }
  }

  observe(listener: (state: WinkBridgeState) => void): () => void {
    this.#stateListeners.push(listener);
    const s = this.state;
    if (s) listener(s);

    getWinkInitPromise().then((sdk) => {
      if (sdk) {
        const s2 = this.state;
        if (s2) listener(s2);
      }
    });

    const stop = () => {
      this.#stateListeners = this.#stateListeners.filter(l => l !== listener);
    };
    this.#disposers.push(stop);
    return stop;
  }

  bindLifecycle(handlers: WinkLifecycleHandlers): () => void {
    const stops: Array<() => void> = [];

    getWinkInitPromise().then((sdk) => {
      if (!sdk || !sdk.on) return;
      if (handlers.onPause) stops.push(sdk.on('pause', handlers.onPause));
      if (handlers.onResume) stops.push(sdk.on('resume', handlers.onResume));
      if (handlers.onMute) stops.push(sdk.on('mute', handlers.onMute));
      if (handlers.onUnmute) stops.push(sdk.on('unmute', handlers.onUnmute));
    });

    const stopAll = () => stops.forEach((stop) => stop());
    this.#disposers.push(stopAll);
    return stopAll;
  }

  dispose(): void {
    this.#disposers.forEach((stop) => stop());
    this.#disposers = [];
    this.#stateListeners = [];
    this.#completedRounds.clear();
  }
}

export const winkGame = new WinkGameIntegration();

if (typeof window !== 'undefined') {
  (window as any).winkGame = winkGame;
}
