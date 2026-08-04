import { reportRuntimeError } from "../observability/runtimeErrors";

export type AudioCue = "click" | "buy" | "sell" | "level" | "fail" | "boom" | "catch" | "cast";

const SOUND_STORE_KEY = "batca-audio-muted";
const MUSIC_STORE_KEY = "batca-music-enabled";
const BGM_VOLUME = 0.12;
const SFX_VOLUME = 0.72;

const AUDIO_FILES: Partial<Record<AudioCue, string>> = {
  click: "/audio/Button4.mp3",
  catch: "/audio/Bounce2.mp3",
  cast: "/audio/WaterFall.mp3",
};

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Audio preferences are non-critical.
  }
}

function reportAudioError(error: unknown, operation: string): void {
  reportRuntimeError(error, { area: "audio", operation, fatal: false });
}

class GameAudioManager {
  private muted = readBoolean(SOUND_STORE_KEY, false);
  private musicEnabled = readBoolean(MUSIC_STORE_KEY, true);
  private unlocked = false;
  private bgm: HTMLAudioElement | null = null;
  private readonly effects = new Map<AudioCue, HTMLAudioElement>();

  getMuted(): boolean {
    return this.muted;
  }

  getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  syncPreferences(preferences: { muted: boolean; musicEnabled: boolean }): void {
    this.muted = preferences.muted;
    this.musicEnabled = preferences.musicEnabled;
    writeBoolean(SOUND_STORE_KEY, this.muted);
    writeBoolean(MUSIC_STORE_KEY, this.musicEnabled);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeBoolean(SOUND_STORE_KEY, muted);
    if (muted) {
      this.stopEffects();
      return;
    }
    // This call is intentionally synchronous for Safari when invoked by a toggle.
    this.unlockFromGesture();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    writeBoolean(MUSIC_STORE_KEY, enabled);
    if (!enabled) {
      this.bgm?.pause();
      return;
    }
    if (this.unlocked) this.startBgm();
  }

  /**
   * Must be called directly from the first trusted user gesture.
   * Do not await play() here: awaiting anything before play() breaks iOS Safari's gesture chain.
   */
  unlockFromGesture(): void {
    if (typeof window === "undefined" || this.muted) return;
    this.ensureAudioElements();
    this.unlocked = true;
    if (this.musicEnabled) this.startBgm();
  }

  play(cue: AudioCue): void {
    if (this.muted || typeof window === "undefined") return;
    const source = AUDIO_FILES[cue];
    if (source) {
      const effect = this.getEffect(cue, source);
      effect.currentTime = 0;
      // Keep play() in this call stack so a first button/touch can produce SFX on iOS.
      const promise = effect.play();
      promise.catch((error) => {
        this.unlocked = false;
        reportAudioError(error, `play:${cue}`);
      });
      return;
    }

    // Existing procedural cues remain available, but use the shared Button asset for UI feedback.
    this.playFallbackTone(cue);
  }

  setPageHidden(hidden: boolean): void {
    if (hidden) {
      this.bgm?.pause();
      return;
    }
    if (this.unlocked && this.musicEnabled && !this.muted) this.startBgm();
  }

  private ensureAudioElements(): void {
    if (typeof Audio === "undefined") return;
    if (!this.bgm) {
      this.bgm = new Audio("/audio/BGMM_Lofi2.mp3");
      this.bgm.loop = true;
      this.bgm.preload = "auto";
      this.bgm.setAttribute("playsinline", "true");
      this.bgm.volume = BGM_VOLUME;
    }
  }

  private getEffect(cue: AudioCue, source: string): HTMLAudioElement {
    let effect = this.effects.get(cue);
    if (!effect) {
      effect = new Audio(source);
      effect.preload = "auto";
      effect.setAttribute("playsinline", "true");
      effect.volume = SFX_VOLUME;
      this.effects.set(cue, effect);
    }
    return effect;
  }

  private startBgm(): void {
    if (!this.bgm || this.bgm.ended) this.ensureAudioElements();
    if (!this.bgm || !this.musicEnabled || this.muted) return;
    const promise = this.bgm.play();
    promise.catch((error) => {
      // Keep unlocked false so the next real gesture retries on iOS Safari.
      this.unlocked = false;
      reportAudioError(error, "play:bgm");
    });
  }

  private stopEffects(): void {
    this.effects.forEach((effect) => {
      effect.pause();
      effect.currentTime = 0;
    });
  }

  private playFallbackTone(cue: AudioCue): void {
    // No extra asset is needed for these secondary feedback cues.
    if (typeof window === "undefined") return;
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequency = cue === "fail" ? 180 : cue === "boom" ? 90 : cue === "level" ? 680 : cue === "buy" ? 520 : 620;
    oscillator.type = cue === "boom" ? "square" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
    oscillator.addEventListener("ended", () => void context.close());
  }
}

export const gameAudio = new GameAudioManager();

export function installAudioLifecycle(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  const unlock = () => gameAudio.unlockFromGesture();
  const onVisibilityChange = () => gameAudio.setPageHidden(document.hidden);

  // Capture listeners run before React handlers and preserve the trusted gesture on iOS Safari.
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("touchstart", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true });
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("touchstart", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
