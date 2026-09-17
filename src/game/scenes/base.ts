import { Scene } from "phaser";
import { attachSceneMusic } from "../audio/music";
import { CANVAS_H, CANVAS_W, RENDER_SCALE } from "../ui/layout";

/**
 * Base scene for every screen. The game canvas renders at `RENDER_SCALE` times
 * the design units (see `layout.ts`); zooming the main camera by the same factor
 * and centering it on the design rect keeps all scene code in 960x576
 * coordinates while text and vector graphics stay sharp.
 *
 * `init` runs before `create`, and no scene overrides it, so this is the one
 * central place that applies the render scale and picks the music track.
 */
export class GameScene extends Scene {
  init(): void {
    const camera = this.cameras.main;
    camera.setZoom(RENDER_SCALE);
    camera.centerOn(CANVAS_W / 2, CANVAS_H / 2);
    attachSceneMusic(this);
  }
}
