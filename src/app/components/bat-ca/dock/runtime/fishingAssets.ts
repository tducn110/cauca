import { Assets, type Texture } from 'pixi.js';
import {
  DUCK_ANIMATION_SOURCE,
  FISHING_DOCK_ASSETS,
  BOAT_PIVOT_X_PX,
  BOAT_PIVOT_Y_PX,
  duckFrameAtProgress,
  validateDuckFrameTextures,
  ROD_TIP_BY_FRAME,
} from '../fishingAnimation';

export {
  DUCK_ANIMATION_SOURCE,
  FISHING_DOCK_ASSETS,
  BOAT_PIVOT_X_PX,
  BOAT_PIVOT_Y_PX,
  duckFrameAtProgress,
  validateDuckFrameTextures,
  ROD_TIP_BY_FRAME,
};

export const ASSET_PATHS = FISHING_DOCK_ASSETS;

export async function loadTexture(path: string): Promise<Texture> {
  try {
    return await Assets.load<Texture>(path);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Không tải được asset ${path}: ${detail}`);
  }
}
