import { Circle, Container, Sprite, type Texture } from "pixi.js";

export type PowerLabel = "MAX" | "TỐT" | "ỔN" | "YẾU";

export type PowerLockResult = {
  label: PowerLabel;
  power: number;
  angle: number;
};

export function powerResultAtAngle(angle: number): PowerLockResult {
  const normalizedAngle = Math.min(Math.PI, Math.max(0, Number.isFinite(angle) ? angle : 0));
  const distance = Math.abs(normalizedAngle - Math.PI / 2);
  const degrees = distance * 180 / Math.PI;

  return degrees <= 8
    ? { label: "MAX", power: 1, angle: normalizedAngle }
    : degrees <= 18
      ? { label: "TỐT", power: 0.85, angle: normalizedAngle }
      : degrees <= 35
        ? { label: "ỔN", power: 0.6, angle: normalizedAngle }
        : { label: "YẾU", power: Math.max(0.2, 1 - distance / (Math.PI / 2)), angle: normalizedAngle };
}

type GaugeTextures = {
  dial: Texture;
  pointer: Texture;
  glow: Texture;
};

export class FishingPowerGauge extends Container {
  private readonly glow: Sprite;
  private readonly dial: Sprite;
  private readonly dialBaseScale: Readonly<{ x: number; y: number }>;
  private readonly pointerRotator: Container;
  private readonly onLock: (result: PowerLockResult) => void;
  private needleAngle = 0;
  private direction = 1;
  private locked = false;
  private disabled = false;
  private idleTime = 0;
  private feedbackTime = 0;
  private readonly speed = 2.15;

  constructor(textures: GaugeTextures, size: number, onLock: (result: PowerLockResult) => void) {
    super();
    this.onLock = onLock;

    this.glow = new Sprite(textures.glow);
    this.glow.anchor.set(0.5);
    this.glow.width = size * 1.13;
    this.glow.height = size * 1.13;
    this.glow.alpha = 0;

    this.dial = new Sprite(textures.dial);
    this.dial.anchor.set(0.5);
    this.dial.width = size;
    this.dial.height = size;
    this.dialBaseScale = { x: this.dial.scale.x, y: this.dial.scale.y };

    this.pointerRotator = new Container();
    const pointer = new Sprite(textures.pointer);
    pointer.anchor.set(0.5);
    pointer.width = size * 0.115;
    pointer.height = size * 0.086;
    pointer.position.set(-size * 0.445, 0);
    this.pointerRotator.addChild(pointer);

    this.addChild(this.glow, this.dial, this.pointerRotator);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Circle(0, 0, size * 0.5);
    this.on("pointertap", () => this.lock());
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    if (this.disabled) return;

    if (!this.locked) {
      this.idleTime += deltaSeconds;
      this.needleAngle += this.direction * this.speed * deltaSeconds;
      if (this.needleAngle >= Math.PI) {
        this.needleAngle = Math.PI;
        this.direction = -1;
      } else if (this.needleAngle <= 0) {
        this.needleAngle = 0;
        this.direction = 1;
      }
      const idlePulse = Math.sin(this.idleTime * 2.4);
      const pulse = 1 + idlePulse * 0.009;
      this.dial.scale.set(
        this.dialBaseScale.x * pulse,
        this.dialBaseScale.y * pulse,
      );
      this.glow.alpha = 0.08 + (idlePulse + 1) * 0.025;
    } else {
      this.feedbackTime += deltaSeconds;
      const pulse = 1 + Math.sin(this.feedbackTime * 18) * 0.035;
      this.dial.scale.set(
        this.dialBaseScale.x * pulse,
        this.dialBaseScale.y * pulse,
      );
      this.glow.alpha = 0.42 + Math.sin(this.feedbackTime * 16) * 0.2;
    }

    this.pointerRotator.rotation = this.needleAngle;
  }

  lock(): PowerLockResult | null {
    if (this.locked || this.disabled) return null;
    this.locked = true;
    this.feedbackTime = 0;

    const result = powerResultAtAngle(this.needleAngle);

    this.onLock(result);
    return result;
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.eventMode = disabled ? "none" : "static";
    this.cursor = disabled ? "default" : "pointer";
    this.alpha = disabled ? 0.66 : 1;
  }
}
