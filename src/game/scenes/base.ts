import { Scene } from "phaser";
import { attachSceneMusic } from "../audio/music";
import {
  CANVAS_H,
  CANVAS_W,
  fitCanvas,
  GAME_H,
  GAME_W,
  landscapeAspect,
  RENDER_SCALE,
} from "../ui/layout";

/**
 * Base scene for every screen. The game canvas renders at `RENDER_SCALE` times
 * the design units (see `layout.ts`); zooming the main camera by the same factor
 * and centering it on the design rect keeps all scene code in 960x576
 * coordinates while text and vector graphics stay sharp.
 *
 * `init` runs before `create`, and no scene overrides it, so this is the one
 * central place that fits the canvas width to the window, applies the render
 * scale and picks the music track. Every screen switch re-reads the window, so
 * a rotated or resized device lays out afresh at the next screen.
 */
export class GameScene extends Scene {
  init(): void {
    const { width, height } = this.scale.parentSize;
    if (width > 0 && fitCanvas(landscapeAspect(width, height))) {
      this.scale.setGameSize(GAME_W, GAME_H);
    }
    const camera = this.cameras.main;
    camera.setZoom(RENDER_SCALE);
    camera.centerOn(CANVAS_W / 2, CANVAS_H / 2);
    attachSceneMusic(this);
  }

  /**
   * Destroy every object on screen before a rebuild. `children.removeAll()` only
   * detaches them (its argument is `skipCallback`, not `destroyChild`), which
   * leaves each label's `scale` resize listener registered forever. The loop
   * destroys the head each pass: `destroy()` splices the object out of the list,
   * so stepping by index (or a snapshot) is not needed.
   */
  protected clearScreen(): void {
    while (this.children.list.length > 0) this.children.list[0]?.destroy();
  }
}
