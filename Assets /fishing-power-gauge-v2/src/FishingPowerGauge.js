import {
  Circle,
  Container,
  Sprite,
} from "pixi.js";

/**
 * FishingPowerGauge
 *
 * Pivot:
 * - pointerRotator is positioned at the exact center of dialBase.
 * - pointer is a child of pointerRotator at x = -radius.
 *
 * Angles in PixiJS:
 * - 0             = left MIN
 * - Math.PI / 2   = top MAX
 * - Math.PI       = right MIN
 */
export class FishingPowerGauge extends Container {
  constructor({
    dialTexture,
    pointerTexture,
    glowTexture,
    size = 320,
    speed = 2.15,
    autoResetMs = 900,
    maxToleranceDeg = 8,
    greatToleranceDeg = 18,
    goodToleranceDeg = 35,
    onCast = () => {},
  }) {
    super();

    this.gaugeSize = size;
    this.speed = speed;
    this.autoResetMs = autoResetMs;
    this.maxTolerance = this.degToRad(maxToleranceDeg);
    this.greatTolerance = this.degToRad(greatToleranceDeg);
    this.goodTolerance = this.degToRad(goodToleranceDeg);
    this.onCast = onCast;

    this.angle = 0;
    this.direction = 1;
    this.locked = false;
    this.resetTimerMs = 0;
    this.feedbackTime = 0;
    this.result = null;

    this.glow = new Sprite(glowTexture);
    this.glow.anchor.set(0.5);
    this.glow.width = size * 1.08;
    this.glow.height = size * 1.08;
    this.glow.alpha = 0;
    this.addChild(this.glow);

    this.dialBase = new Sprite(dialTexture);
    this.dialBase.anchor.set(0.5);
    this.dialBase.width = size;
    this.dialBase.height = size;
    this.addChild(this.dialBase);

    this.pointerRotator = new Container();
    this.addChild(this.pointerRotator);

    this.pointer = new Sprite(pointerTexture);
    this.pointer.anchor.set(0.5);
    this.pointer.width = size * 0.115;
    this.pointer.height = size * 0.086;

    // Place the pointer just outside the dial rim.
    this.radius = size * 0.445;
    this.pointer.position.set(-this.radius, 0);
    this.pointerRotator.addChild(this.pointer);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Circle(0, 0, size * 0.5);
    this.on("pointertap", () => this.lock());

    this.syncVisuals();
  }

  degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  /**
   * Call from app.ticker:
   * app.ticker.add((ticker) => gauge.update(ticker.deltaMS / 1000));
   */
  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    if (!this.locked) {
      this.angle += this.direction * this.speed * deltaSeconds;

      if (this.angle >= Math.PI) {
        this.angle = Math.PI;
        this.direction = -1;
      } else if (this.angle <= 0) {
        this.angle = 0;
        this.direction = 1;
      }
    } else {
      this.feedbackTime += deltaSeconds;

      if (this.result?.label === "MAX") {
        this.glow.alpha = 0.42 + Math.sin(this.feedbackTime * 16) * 0.22;
        const pulse = 1 + Math.sin(this.feedbackTime * 18) * 0.035;
        this.dialBase.scale.set(pulse);
      } else {
        this.glow.alpha = Math.max(0, 0.28 - this.feedbackTime * 0.5);
        const kick = Math.max(0, 1 - this.feedbackTime * 5);
        this.dialBase.scale.set(1 + kick * 0.045);
      }

      if (this.autoResetMs > 0) {
        this.resetTimerMs -= deltaSeconds * 1000;
        if (this.resetTimerMs <= 0) this.reset();
      }
    }

    this.syncVisuals();
  }

  syncVisuals() {
    this.pointerRotator.rotation = this.angle;
  }

  evaluate() {
    const maxAngle = Math.PI / 2;
    const distance = Math.abs(this.angle - maxAngle);

    if (distance <= this.maxTolerance) {
      return { label: "MAX", power: 1, distance };
    }
    if (distance <= this.greatTolerance) {
      return { label: "GREAT", power: 0.85, distance };
    }
    if (distance <= this.goodTolerance) {
      return { label: "GOOD", power: 0.6, distance };
    }
    return {
      label: "MIN",
      power: Math.max(0.2, 1 - distance / (Math.PI / 2)),
      distance,
    };
  }

  lock() {
    if (this.locked) return this.result;

    this.locked = true;
    this.feedbackTime = 0;
    this.resetTimerMs = this.autoResetMs;
    this.result = this.evaluate();

    this.onCast({
      ...this.result,
      angle: this.angle,
      angleDeg: (this.angle * 180) / Math.PI,
    });

    return this.result;
  }

  reset() {
    this.locked = false;
    this.result = null;
    this.feedbackTime = 0;
    this.resetTimerMs = 0;
    this.glow.alpha = 0;
    this.dialBase.scale.set(1);
  }
}