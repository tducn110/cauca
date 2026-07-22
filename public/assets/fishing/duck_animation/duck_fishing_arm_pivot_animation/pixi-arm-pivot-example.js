// PixiJS v8 – animate only the arm + fishing rod layer.
const baseX = armsRod.x;
const baseY = armsRod.y;

// Pivot relative to the armsRod texture.
// Adjust after exporting the transparent arm/rod layer.
const pivotX = 294;
const pivotY = 337;

armsRod.pivot.set(pivotX, pivotY);
armsRod.position.set(baseX + pivotX, baseY + pivotY);

let elapsed = 0;

app.ticker.add((ticker) => {
  elapsed += ticker.deltaMS;

  const armPhase = (elapsed / 1100) * Math.PI * 2;
  armsRod.rotation = Math.sin(armPhase) * (5 * Math.PI / 180);
  armsRod.y = baseY + pivotY + Math.sin(armPhase) * 4;

  const boatPhase = (elapsed / 1800) * Math.PI * 2;
  boatGroup.y = Math.sin(boatPhase) * 2;
  boatGroup.rotation = Math.sin(boatPhase) * (0.7 * Math.PI / 180);
});
