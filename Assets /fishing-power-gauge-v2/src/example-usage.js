import { Application, Assets } from "pixi.js";
import { FishingPowerGauge } from "./FishingPowerGauge.js";

const app = new Application();
await app.init({
  resizeTo: window,
  background: "#176ff3",
  antialias: true,
});
document.body.appendChild(app.canvas);

const [dialTexture, pointerTexture, glowTexture] = await Promise.all([
  Assets.load("../assets/dial_base.png"),
  Assets.load("../assets/pointer.png"),
  Assets.load("../assets/max_glow.png"),
]);

const gauge = new FishingPowerGauge({
  dialTexture,
  pointerTexture,
  glowTexture,
  size: 320,
  speed: 2.15,
  onCast: ({ label, power, angleDeg }) => {
    console.log({ label, power, angleDeg });

    // Trigger the fisherman casting animation here.
    // fisherman.cast({ power });
  },
});

gauge.position.set(app.screen.width / 2, app.screen.height / 2);
app.stage.addChild(gauge);

app.ticker.add((ticker) => {
  gauge.update(ticker.deltaMS / 1000);
});