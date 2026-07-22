export type AudioCue = "click" | "buy" | "sell" | "level" | "fail" | "boom";

const STORE_KEY = "batca-audio-muted";
const MASTER_VOLUME = 0.32;

type WebkitAudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

function readMutedSetting(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutedSetting(muted: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, muted ? "1" : "0");
  } catch {
    // Audio preferences are non-critical.
  }
}

class ProceduralAudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = readMutedSetting();

  getMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMutedSetting(muted);
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.context.currentTime, 0.02);
    }
    if (!muted) void this.unlock();
  }

  async unlock(): Promise<void> {
    if (typeof window === "undefined") return;
    const audioWindow = window as WebkitAudioWindow;
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextCtor) return;

    if (!this.context) {
      this.context = new AudioContextCtor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch {
        // Browser may still block resume until a stronger user gesture.
      }
    }
  }

  setPageHidden(hidden: boolean): void {
    if (!this.context) return;
    if (hidden) {
      void this.context.suspend();
    } else if (!this.muted) {
      void this.context.resume();
    }
  }

  play(cue: AudioCue): void {
    if (this.muted) return;
    void this.unlock().then(() => this.playUnlocked(cue));
  }

  private playUnlocked(cue: AudioCue): void {
    if (!this.context || !this.master || this.context.state !== "running") return;

    switch (cue) {
      case "click":
        this.tone(420, 0.045, "triangle", 0.07);
        break;
      case "buy":
        this.tone(520, 0.07, "triangle", 0.08);
        this.tone(780, 0.08, "triangle", 0.06, 0.055);
        break;
      case "sell":
        this.tone(620, 0.08, "sine", 0.08);
        this.tone(920, 0.1, "sine", 0.06, 0.06);
        break;
      case "level":
        this.tone(520, 0.08, "triangle", 0.08);
        this.tone(680, 0.08, "triangle", 0.07, 0.07);
        this.tone(880, 0.12, "triangle", 0.06, 0.14);
        break;
      case "fail":
        this.tone(220, 0.14, "sawtooth", 0.06);
        this.tone(160, 0.18, "sawtooth", 0.04, 0.11);
        break;
      case "boom":
        this.tone(90, 0.18, "square", 0.09);
        this.tone(55, 0.24, "sawtooth", 0.06, 0.04);
        break;
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    delay = 0,
  ): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.82), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

export const gameAudio = new ProceduralAudioManager();

export function installAudioLifecycle(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  const unlock = () => void gameAudio.unlock();
  const onVisibilityChange = () => gameAudio.setPageHidden(document.hidden);

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
