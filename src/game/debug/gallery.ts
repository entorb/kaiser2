import { AUTO, Game, Scale, type Scene } from "phaser";
import { RENDER_SCALE } from "../ui/layout";
import { loadFonts } from "../ui/text";
import { COLORS, css } from "../ui/theme";

/**
 * Boot a scrolling overview page: a canvas of `width` x `height` design pixels
 * inside `parent`. Waits for fonts so labels bake in the real ones. Phaser must
 * not swallow wheel and touch input, or the page cannot scroll over the canvas.
 */
export async function bootGallery(
  parent: string,
  width: number,
  height: number,
  scene: typeof Scene,
): Promise<Game> {
  await loadFonts();
  return new Game({
    type: AUTO,
    parent,
    width: width * RENDER_SCALE,
    height: height * RENDER_SCALE,
    backgroundColor: css(COLORS.bg),
    pixelArt: false,
    scale: { mode: Scale.NONE },
    input: { mouse: { preventDefaultWheel: false }, touch: { capture: false } },
    scene,
  });
}
