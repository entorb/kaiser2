import type Phaser from "phaser";
import { RENDER_SCALE } from "./layout";
import { COLORS, css, FONT_DISPLAY, FONT_MONO, FONT_UI, FS } from "./theme";

export interface LabelOptions {
  /** Font size in canvas pixels. */
  size?: number;
  color?: number;
  weight?: "normal" | "bold";
  mono?: boolean;
  /** Use the display/inscriptional font (titles, buttons). */
  display?: boolean;
  wrap?: number;
  origin?: number;
  align?: "left" | "center" | "right";
}

const MAX_RESOLUTION = 4;

/**
 * Wait for the self-hosted display fonts before any text is rasterised. Phaser
 * draws Text into a canvas texture once, so a late webfont would be baked in as
 * the fallback. Safe to call where the FontFaceSet API is missing.
 */
export async function loadFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const faces = [
    '400 16px "Cinzel"',
    '700 64px "Cinzel"',
    '400 16px "EB Garamond"',
  ];
  try {
    await Promise.all(faces.map((face) => document.fonts.load(face)));
    await document.fonts.ready;
  } catch {
    // Fall back to the serif stack rather than blocking the game.
  }
}

/**
 * Rasterise text at the on-screen upscale so glyphs stay crisp. A design-space
 * font size is drawn through the scene camera's `RENDER_SCALE` zoom, then the
 * canvas is scaled to CSS pixels and finally by the device pixel ratio, so the
 * texture needs roughly `displayScale * dpr * RENDER_SCALE` times the font size.
 */
function textResolution(scene: Phaser.Scene): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const fit = scene.scale?.displayScale?.x || 1;
  return Math.min(
    MAX_RESOLUTION,
    Math.max(1, Math.round(fit * dpr * RENDER_SCALE)),
  );
}

/** Add a text object. `mono` uses the numeric/table font. */
export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: LabelOptions = {},
): Phaser.GameObjects.Text {
  const obj = scene.add.text(x, y, text, {
    fontFamily: opts.mono ? FONT_MONO : opts.display ? FONT_DISPLAY : FONT_UI,
    fontSize: `${opts.size ?? FS.body}px`,
    color: css(opts.color ?? COLORS.text),
    fontStyle: opts.weight ?? "normal",
    align: opts.align,
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    resolution: textResolution(scene),
  });
  if (opts.origin !== undefined) obj.setOrigin(opts.origin);
  // Keep sharp when the window (and thus the fit scale) changes.
  const refresh = () => obj.setResolution(textResolution(scene));
  scene.scale?.on("resize", refresh);
  obj.once("destroy", () => scene.scale?.off("resize", refresh));
  return obj;
}
