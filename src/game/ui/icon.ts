import { type GameObjects, Math as PhaserMath } from "phaser";
import { MAX_PORTRAIT, playerColor } from "../model/constants";
import { COLORS } from "./theme";

const V = PhaserMath.Vector2;

export const ICON_COUNT = MAX_PORTRAIT;

interface Geometry {
  points: PhaserMath.Vector2[];
  l: number;
  r: number;
  t: number;
  w: number;
  h: number;
}

/** Heater-shield outline centred on (cx, cy); `size` is the width. */
function shieldOutline(cx: number, cy: number, size: number): Geometry {
  const w = size;
  const h = size * 1.18;
  const l = cx - w / 2;
  const r = cx + w / 2;
  const t = cy - h / 2;
  return {
    points: [
      new V(l, t),
      new V(r, t),
      new V(r, t + h * 0.52),
      new V(cx, t + h),
      new V(l, t + h * 0.52),
    ],
    l,
    r,
    t,
    w,
    h,
  };
}

function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5,
): PhaserMath.Vector2[] {
  const pts: PhaserMath.Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    pts.push(new V(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

/** Distinct heraldic charge for icon `index` (8 designs, wraps). */
function drawEmblem(
  g: GameObjects.Graphics,
  index: number,
  { l, r, t, w, h }: Geometry,
  ink: number,
): void {
  const cx = (l + r) / 2;
  const midY = t + h * 0.42;
  g.fillStyle(ink, 1);
  switch (index % ICON_COUNT) {
    case 0: // cross
      g.fillRect(cx - w * 0.09, t + h * 0.12, w * 0.18, h * 0.6);
      g.fillRect(l + w * 0.18, t + h * 0.3, w * 0.64, w * 0.18);
      break;
    case 1: // two horizontal bars
      g.fillRect(l + w * 0.16, t + h * 0.22, w * 0.68, w * 0.14);
      g.fillRect(l + w * 0.16, t + h * 0.44, w * 0.68, w * 0.14);
      break;
    case 2: // two vertical bars
      g.fillRect(l + w * 0.3, t + h * 0.12, w * 0.14, h * 0.6);
      g.fillRect(l + w * 0.56, t + h * 0.12, w * 0.14, h * 0.6);
      break;
    case 3: // diagonal bend
      g.fillPoints(
        [
          new V(l + w * 0.14, t + h * 0.16),
          new V(l + w * 0.34, t + h * 0.16),
          new V(r - w * 0.14, t + h * 0.62),
          new V(r - w * 0.34, t + h * 0.62),
        ],
        true,
      );
      break;
    case 4: // chevron
      g.fillPoints(
        [
          new V(cx, t + h * 0.28),
          new V(r - w * 0.16, t + h * 0.48),
          new V(r - w * 0.16, t + h * 0.6),
          new V(cx, t + h * 0.4),
          new V(l + w * 0.16, t + h * 0.6),
          new V(l + w * 0.16, t + h * 0.48),
        ],
        true,
      );
      break;
    case 5: // roundel
      g.fillCircle(cx, midY, w * 0.22);
      break;
    case 6: // star
      g.fillPoints(starPoints(cx, midY, w * 0.3, w * 0.13), true);
      break;
    case 7: // quarterly
      g.fillRect(l + w * 0.18, t + h * 0.12, w * 0.28, h * 0.26);
      g.fillRect(r - w * 0.46, t + h * 0.4, w * 0.28, h * 0.26);
      break;
  }
}

/**
 * Draw ruler icon `index` into `g`: a colored shield with a unique charge.
 * Taken icons are dimmed (used while choosing).
 */
export function drawShield(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  index: number,
  dim = false,
): void {
  const geo = shieldOutline(cx, cy, size);
  g.fillStyle(playerColor(index), dim ? 0.22 : 1);
  g.fillPoints(geo.points, true);
  g.lineStyle(Math.max(1.5, size * 0.045), COLORS.accent, dim ? 0.3 : 1);
  g.strokePoints(geo.points, true);
  if (!dim) drawEmblem(g, index, geo, COLORS.woodDark);
}

/** Gold coin with a plus/minus sign, marking a trade slider's buy/sell end. */
export function drawTradeIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  sign: 1 | -1,
): void {
  const r = size / 2;
  g.fillStyle(COLORS.accent, 1);
  g.fillCircle(cx, cy, r);
  g.lineStyle(2, COLORS.woodDark, 1);
  g.strokeCircle(cx, cy, r);
  const arm = r * 0.5;
  const bar = Math.max(3, size * 0.16);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillRect(cx - arm, cy - bar / 2, arm * 2, bar);
  if (sign > 0) g.fillRect(cx - bar / 2, cy - arm, bar, arm * 2);
}

/** Three stylized figures, used as the population section icon. */
export function drawCrowdIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  // Parchment outline separates the overlapping figures so they read as people.
  const figure = (x: number, y: number, s: number) => {
    const r = size * 0.15 * s;
    const headY = y - size * 0.2 * s;
    const bodyW = r * 3.2;
    const bodyH = size * 0.34 * s;
    g.fillStyle(COLORS.wood, 1);
    g.lineStyle(2, COLORS.surface, 1);
    g.fillCircle(x, headY, r);
    g.strokeCircle(x, headY, r);
    g.fillRoundedRect(x - bodyW / 2, y, bodyW, bodyH, r);
    g.strokeRoundedRect(x - bodyW / 2, y, bodyW, bodyH, r);
  };
  figure(cx - size * 0.32, cy + size * 0.08, 0.85);
  figure(cx + size * 0.32, cy + size * 0.08, 0.85);
  figure(cx, cy - size * 0.16, 1.12);
}

/** Stack of coins, used as the money section icon. */
export function drawCoinsIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const w = size * 0.62;
  const h = size * 0.26;
  for (let i = 0; i < 3; i++) {
    const y = cy + size * 0.22 - i * size * 0.17;
    g.fillStyle(i === 2 ? COLORS.accentHover : COLORS.accent, 1);
    g.fillEllipse(cx, y, w, h);
    g.lineStyle(1.5, COLORS.woodDark, 1);
    g.strokeEllipse(cx, y, w, h);
  }
}

/** Chronicle event icon kinds. */
export type EventIcon =
  | "born"
  | "died"
  | "immigrant"
  | "emigrant"
  | "market"
  | "mill"
  | "spy";

/** Small medieval pictogram for a chronicle row. */
export function drawEventIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  kind: EventIcon,
): void {
  const s = size;
  const ink = COLORS.woodDark;
  switch (kind) {
    case "born":
      g.fillStyle(COLORS.success, 1);
      g.fillCircle(cx, cy - s * 0.18, s * 0.2);
      g.fillRoundedRect(cx - s * 0.24, cy, s * 0.48, s * 0.36, s * 0.12);
      break;
    case "died":
      g.fillStyle(COLORS.danger, 1);
      g.fillRect(cx - s * 0.08, cy - s * 0.4, s * 0.16, s * 0.8);
      g.fillRect(cx - s * 0.3, cy - s * 0.16, s * 0.6, s * 0.16);
      break;
    case "immigrant":
      g.fillStyle(COLORS.success, 1);
      g.fillRect(cx - s * 0.4, cy - s * 0.08, s * 0.6, s * 0.16);
      g.fillTriangle(
        cx + s * 0.2,
        cy - s * 0.28,
        cx + s * 0.2,
        cy + s * 0.28,
        cx + s * 0.48,
        cy,
      );
      break;
    case "emigrant":
      g.fillStyle(COLORS.danger, 1);
      g.fillRect(cx - s * 0.2, cy - s * 0.08, s * 0.6, s * 0.16);
      g.fillTriangle(
        cx - s * 0.2,
        cy - s * 0.28,
        cx - s * 0.2,
        cy + s * 0.28,
        cx - s * 0.48,
        cy,
      );
      break;
    case "market":
      g.fillStyle(COLORS.accent, 1);
      g.fillTriangle(
        cx - s * 0.45,
        cy - s * 0.05,
        cx + s * 0.45,
        cy - s * 0.05,
        cx,
        cy - s * 0.42,
      );
      g.fillStyle(ink, 1);
      g.fillRect(cx - s * 0.32, cy, s * 0.64, s * 0.08);
      g.fillRect(cx - s * 0.3, cy + s * 0.08, s * 0.08, s * 0.3);
      g.fillRect(cx + s * 0.22, cy + s * 0.08, s * 0.08, s * 0.3);
      break;
    case "mill":
      g.fillStyle(ink, 1);
      g.fillRect(cx - s * 0.08, cy - s * 0.05, s * 0.16, s * 0.45);
      g.lineStyle(s * 0.12, COLORS.wood, 1);
      g.lineBetween(cx - s * 0.4, cy - s * 0.35, cx + s * 0.4, cy + s * 0.15);
      g.lineBetween(cx + s * 0.4, cy - s * 0.35, cx - s * 0.4, cy + s * 0.15);
      break;
    case "spy":
      g.fillStyle(COLORS.info, 1);
      g.fillCircle(cx, cy, s * 0.38);
      g.fillStyle(ink, 1);
      g.fillCircle(cx - s * 0.12, cy - s * 0.02, s * 0.06);
      g.fillCircle(cx + s * 0.12, cy - s * 0.02, s * 0.06);
      break;
  }
}
