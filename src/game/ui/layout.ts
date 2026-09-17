// Layout helpers for the freeform UI.
//
// The canvas is a fixed 960x576 (the original 320x192 at SCALE 3) and is fitted
// to the window with Scale.FIT, so scenes position everything in canvas pixels.
// All art is drawn procedurally; text is rasterised at the on-screen scale for
// sharpness (see `ui/text.ts`).
export const SCALE = 3;

export const CANVAS_W = 320 * SCALE; // 960
export const CANVAS_H = 192 * SCALE; // 576

/**
 * Backing-store multiplier. Layout stays in the 960x576 design units, but the
 * canvas (and every scene camera) is rendered at `RENDER_SCALE` times that, so
 * text and vector art are rasterised at close to device resolution instead of
 * being upscaled by the browser. `GameScene` applies the matching camera zoom.
 */
export const RENDER_SCALE = 2;

export const GAME_W = CANVAS_W * RENDER_SCALE; // 1920
export const GAME_H = CANVAS_H * RENDER_SCALE; // 1152

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MARGIN = 24;
export const HEADER_H = 56;
export const ACTION_H = 64;

/**
 * Standard screen regions: a top status/header bar, a flexible content area and
 * a bottom action bar. Scenes lay widgets out inside these.
 */
export function frame(): { header: Rect; content: Rect; action: Rect } {
  const w = CANVAS_W - MARGIN * 2;
  const header: Rect = { x: MARGIN, y: MARGIN, w, h: HEADER_H };
  const action: Rect = {
    x: MARGIN,
    y: CANVAS_H - MARGIN - ACTION_H,
    w,
    h: ACTION_H,
  };
  const content: Rect = {
    x: MARGIN,
    y: header.y + header.h + 16,
    w,
    h: action.y - (header.y + header.h + 16) - 16,
  };
  return { header, content, action };
}

/** Split a rect into `n` equal columns with `gap` between them. */
export function columns(rect: Rect, n: number, gap = 16): Rect[] {
  const w = (rect.w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: rect.x + i * (w + gap),
    y: rect.y,
    w,
    h: rect.h,
  }));
}
