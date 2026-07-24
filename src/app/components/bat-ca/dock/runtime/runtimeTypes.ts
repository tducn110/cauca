import { Graphics, Container, Text } from "pixi.js";
import type { FishKind } from "../../game/types";
import type { DockViewportLayout } from "../dockLayout";

export type AmbientNode = {
  node: Graphics;
  xRatio: number;
  yRatio: number;
  speed: number;
  phase: number;
};

export type ActiveFish = {
  id: number;
  kind: FishKind;
  x: number;
  depthY: number;
  vx: number;
  size: number;
  node: Graphics;
  isCaught: boolean;
  payoutStarted?: boolean;
};

export type FloatingText = {
  root: Container;
  label: Text;
  y: number;
  alpha: number;
  age: number;
  life: number;
};

export type DockSceneRuntime = {
  applyLayout: (layout: DockViewportLayout) => void;
  setDisabled: (disabled: boolean) => void;
  updateProgression: (capacityLevel: number, depthLevel: number) => void;
  lockGauge: () => void;
};
