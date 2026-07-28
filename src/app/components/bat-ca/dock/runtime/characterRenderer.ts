import { Container, AnimatedSprite, Graphics, type Texture } from 'pixi.js';

import type { FishingState } from '../FishingDockCanvas';
import { duckFrameAtProgress, DUCK_ANIMATION_SOURCE } from './fishingAssets';

/**
 * Nodes expected by updateCharacterAnimation.
 * boatRoot   – absolute world position, set ONLY by sceneLayout (x = boatAnchor.x, y = boatAnchor.y).
 * boatBob    – child of boatRoot; only local y and local rotation are written here.
 *              GSAP drives boatBob.y and boatBob.rotation for the idle floating animation.
 * sprite     – child of boatBob; anchor is at hull bottom, local position always (0,0).
 * boatShadow – managed only for alpha.
 */
export type CharacterNodes = {
  boatRoot: Container;
  boatBob: Container;
  sprite: AnimatedSprite;
  boatShadow: Graphics;
  /** Call this to stop the GSAP idle animation (e.g. on destroy). */
  stopGsap: () => void;
};

/**
 * How many pixels the hull sinks below the waterline anchor point so the boat
 * looks half-submerged between the rear wave and the front wave layer.
 * Positive = sinks deeper into water.
 */
const HULL_SINK_PX = 2;



/**
 * Build the boatRoot → boatBob → sprite hierarchy.
 *
 * Call once during scene setup, pass the result to updateCharacterAnimation.
 */
export function buildCharacterNodes(frameTextures: Texture[]): CharacterNodes {
  const boatRoot = new Container();
  const boatBob = new Container();
  const sprite = new AnimatedSprite(frameTextures);

  sprite.animationSpeed = 0;
  sprite.stop();
  // Anchor at hull bottom: (240/480, 510/541)
  sprite.anchor.set(DUCK_ANIMATION_SOURCE.anchorX, DUCK_ANIMATION_SOURCE.anchorY);
  // Local position is always (0, 0) — never changed after setup
  sprite.position.set(0, 0);

  boatBob.addChild(sprite);
  boatRoot.addChild(boatBob);

  const stopGsap = () => {
    // No-op since we no longer use GSAP
  };

  return { boatRoot, boatBob, sprite, boatShadow: null!, stopGsap };
}

export type BoatWaveMotion = {
  /** Local Y offset (px) sampled from the front wave at the boat position. */
  bobY: number;
  /** Local rotation (radians) matching the wave slope at the boat position. */
  tilt: number;
};

/**
 * Called each ticker frame.
 * Modifies:
 *   - sprite.currentFrame
 *   - boatShadow.alpha
 *   - boatBob.y and boatBob.rotation (from waveMotion)
 */
export function updateCharacterAnimation(
  nodes: CharacterNodes,
  fishingState: FishingState,
  castAnimTimer: number,
  _elapsed: number,
  waveMotion?: BoatWaveMotion,
): void {
  if (waveMotion) {
    nodes.boatBob.y = HULL_SINK_PX + waveMotion.bobY;
    nodes.boatBob.rotation = waveMotion.tilt;
  }
  // Shadow alpha: use the current GSAP-driven y offset for a subtle pulse.
  if (nodes.boatShadow) {
    const currentBobOffset = nodes.boatBob.y - HULL_SINK_PX; // negative when boat rises
    nodes.boatShadow.alpha = 0.24 + currentBobOffset * 0.008;
  }

  if (fishingState === 'casting') {
    const progress = Math.min(1, castAnimTimer / DUCK_ANIMATION_SOURCE.castDurationSeconds);
    nodes.sprite.currentFrame = duckFrameAtProgress(progress);
  } else {
    nodes.sprite.currentFrame = 0;
  }
}
