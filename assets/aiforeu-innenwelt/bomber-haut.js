// Keep the carrier integration contract separate from the Blender skin package.
import { createBomberSkin as createSharpSkin } from '../aiforeu-bomber-sharp/skin.js';

export function createBomberSkin() {
  return createSharpSkin();
}
