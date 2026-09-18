import { type GameObjects, Math as PhaserMath } from "phaser";
import { MAX_PORTRAIT, playerColor } from "../model/constants";
import { COLORS } from "./theme";

const V = PhaserMath.Vector2;

export const ICON_COUNT = MAX_PORTRAIT;

/** Shape shared by every icon draw function: centered on (cx, cy), `size` wide. */
export type IconDraw = (
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
) => void;

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

/** Ink set for the silhouette icons; `bg` is the surface they are drawn on. */
export interface IconInk {
  /** Color the silhouettes are separated against. Default: parchment. */
  bg?: number;
  /** Front silhouette. */
  ink?: number;
  /** Silhouettes standing behind. */
  inkBack?: number;
}

/**
 * Population icon: three burgher busts on one baseline, the front one dark and
 * the two behind it faded, each haloed in `bg` so the silhouettes stay
 * separate down to ~12 px. Pass `bg` when drawing on anything but parchment.
 */
export function drawCrowdIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  opts: IconInk = {},
): void {
  const bg = opts.bg ?? COLORS.surface;
  const ink = opts.ink ?? COLORS.wood;
  const inkBack = opts.inkBack ?? COLORS.muted;
  const halo = Math.max(1.2, size * 0.06);
  const base = cy + size * 0.33;

  /** One bust standing on `y0`; `s` scales it, `color` fills it. */
  const bust = (x: number, y0: number, s: number, color: number) => {
    const halfW = size * 0.31 * s;
    const bodyH = size * 0.4 * s;
    const headR = size * 0.155 * s;
    const headY = y0 - size * 0.5 * s;
    const top = y0 - bodyH;
    // Round top corners, square bottom: shoulders cut off on the baseline.
    const shoulders = (pad: number) => {
      const r = Math.min(halfW + pad, bodyH + pad);
      g.fillRoundedRect(
        x - halfW - pad,
        top - pad,
        (halfW + pad) * 2,
        bodyH + pad,
        {
          tl: r,
          tr: r,
          bl: 0,
          br: 0,
        },
      );
    };
    // Halo first (it also erases whatever stands behind), then the silhouette.
    g.fillStyle(bg, 1);
    g.fillCircle(x, headY, headR + halo);
    shoulders(halo);
    g.fillStyle(color, 1);
    g.fillCircle(x, headY, headR);
    shoulders(0);
  };

  // Back pair first so the front bust's halo cuts into them.
  bust(cx - size * 0.27, base - size * 0.02, 0.78, inkBack);
  bust(cx + size * 0.27, base - size * 0.02, 0.78, inkBack);
  bust(cx, base, 1, ink);
}

/** Wheat ear from (x0, y0) to the tip (x1, y1): stalk plus herringbone kernels. */
function wheatEar(
  g: GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  grain: number,
  stalk: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // Kernels lean out from the stalk (n = sideways) and up (u = along).
  const out = len * 0.16;
  const up = len * 0.14;
  g.lineStyle(Math.max(1, len * 0.05), stalk, 1);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(Math.max(1.2, len * 0.1), grain, 1);
  for (const t of [0.42, 0.58, 0.74]) {
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    for (const side of [-1, 1]) {
      g.lineBetween(
        px,
        py,
        px - uy * out * side + ux * up,
        py + ux * out * side + uy * up,
      );
    }
  }
  g.lineBetween(x0 + dx * 0.78, y0 + dy * 0.78, x1, y1);
}

/** Single ear of wheat: the grain unit. */
export function drawGrainIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  wheatEar(
    g,
    cx - size * 0.1,
    cy + size * 0.5,
    cx + size * 0.08,
    cy - size * 0.34,
    COLORS.accent,
    COLORS.wood,
  );
}

/** Wheat sheaf bound by a band: farmland (acre color matches the Land map). */
export function drawAcreIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const base = cy + size * 0.46;
  // Tip offsets (x, y) as fractions of `size`; stalks converge at the base.
  const tips: [number, number][] = [
    [-0.38, -0.08],
    [0, -0.36],
    [0.38, -0.08],
  ];
  for (const [dx, dy] of tips) {
    wheatEar(
      g,
      cx + dx * size * 0.25,
      base,
      cx + dx * size,
      cy + dy * size,
      COLORS.acre,
      COLORS.border,
    );
  }
  g.fillStyle(COLORS.wood, 1);
  g.fillRect(cx - size * 0.17, cy + size * 0.18, size * 0.34, size * 0.1);
}

/** Two courses of staggered stone blocks: building land (Land map color). */
export function drawBuildingIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const w = size * 0.9;
  const h = size * 0.6;
  const l = cx - w / 2;
  const top = cy - h / 2;
  g.fillStyle(COLORS.building, 1);
  g.fillRect(l, top, w, h);
  g.lineStyle(Math.max(1, size * 0.06), COLORS.woodDark, 1);
  g.lineBetween(l, cy, l + w, cy);
  // Joints: one in the top course, two in the bottom one, so they stagger.
  g.lineBetween(cx, top, cx, cy);
  g.lineBetween(l + w / 3, cy, l + w / 3, top + h);
  g.lineBetween(l + (w * 2) / 3, cy, l + (w * 2) / 3, top + h);
  g.strokeRect(l, top, w, h);
}

/** Three notched towers of different heights on a wall with a gate arch. */
export function drawCityIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const bottom = cy + size * 0.4;
  const notch = size * 0.09;
  // Tower left/right edge and top, as fractions of `size` from the center.
  const towers: [number, number, number][] = [
    [-0.46, -0.18, -0.12],
    [-0.14, 0.14, -0.42],
    [0.18, 0.46, -0.24],
  ];
  g.fillStyle(COLORS.wood, 1);
  g.fillRect(cx - size * 0.46, cy + size * 0.08, size * 0.92, bottom - cy);
  for (const [x0, x1, top] of towers) {
    const left = cx + x0 * size;
    const right = cx + x1 * size;
    const y = cy + top * size;
    g.fillRect(left, y + notch, right - left, bottom - y - notch);
    g.fillRect(left, y, notch, notch);
    g.fillRect(right - notch, y, notch, notch);
  }
  g.fillStyle(COLORS.woodDark, 1);
  const gateY = cy + size * 0.24;
  g.fillRect(cx - size * 0.08, gateY, size * 0.16, bottom - gateY);
  g.fillCircle(cx, gateY, size * 0.08);
}

/** Keep with a notched top, a gate arch and an arrow slit: the palace. */
export function drawPalaceIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const left = cx - size * 0.36;
  const right = cx + size * 0.36;
  const top = cy - size * 0.28;
  const bottom = cy + size * 0.4;
  const notch = size * 0.12;
  g.fillStyle(COLORS.wood, 1);
  g.fillRect(left, top + notch, right - left, bottom - top - notch);
  // Merlons: the two ends and the middle, with gaps between.
  g.fillRect(left, top, notch, notch);
  g.fillRect(cx - notch / 2, top, notch, notch);
  g.fillRect(right - notch, top, notch, notch);
  g.fillStyle(COLORS.woodDark, 1);
  const gateY = cy + size * 0.16;
  g.fillRect(cx - size * 0.1, gateY, size * 0.2, bottom - gateY);
  g.fillCircle(cx, gateY, size * 0.1);
  g.fillRect(cx - size * 0.03, cy - size * 0.1, size * 0.06, size * 0.16);
}

/** Nave and tower with a spire and a round window: the cathedral. */
export function drawCathedralIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const bottom = cy + size * 0.4;
  const towerTop = cy - size * 0.2;
  g.fillStyle(COLORS.wood, 1);
  g.fillRect(cx - size * 0.4, cy + size * 0.08, size * 0.8, bottom - cy);
  g.fillRect(cx - size * 0.16, towerTop, size * 0.32, bottom - towerTop);
  g.fillTriangle(
    cx - size * 0.2,
    towerTop,
    cx + size * 0.2,
    towerTop,
    cx,
    cy - size * 0.48,
  );
  g.fillStyle(COLORS.woodDark, 1);
  g.fillCircle(cx, cy - size * 0.04, size * 0.07);
  const doorY = cy + size * 0.22;
  g.fillRect(cx - size * 0.07, doorY, size * 0.14, bottom - doorY);
  g.fillCircle(cx, doorY, size * 0.07);
}

/** Fletched arrow with a broad head, pointing right: the advance button. */
export function drawArrowIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size;
  const ink = COLORS.accentText;
  g.fillStyle(ink, 1);
  g.fillRect(cx - s * 0.44, cy - s * 0.05, s * 0.6, s * 0.1);
  g.fillTriangle(
    cx + s * 0.1,
    cy - s * 0.27,
    cx + s * 0.1,
    cy + s * 0.27,
    cx + s * 0.5,
    cy,
  );
  // Fletching: two slanted feathers at the tail.
  for (const d of [-1, 1]) {
    g.fillPoints(
      [
        new V(cx - s * 0.5, cy + d * s * 0.26),
        new V(cx - s * 0.34, cy + d * s * 0.26),
        new V(cx - s * 0.16, cy),
        new V(cx - s * 0.32, cy),
      ],
      true,
    );
  }
}

/** Eight-toothed cog: the pause menu. */
export function drawGearIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const teeth = 8;
  const step = (Math.PI * 2) / teeth;
  const outer = size * 0.46;
  const root = size * 0.34;
  const pts: PhaserMath.Vector2[] = [];
  const at = (r: number, a: number) =>
    pts.push(new V(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    at(root, a - step * 0.3);
    at(outer, a - step * 0.17);
    at(outer, a + step * 0.17);
    at(root, a + step * 0.3);
  }
  g.fillStyle(COLORS.wood, 1);
  g.fillPoints(pts, true);
  g.lineStyle(Math.max(1, size * 0.06), COLORS.woodDark, 1);
  g.strokePoints(pts, true);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillCircle(cx, cy, size * 0.12);
}

/** Six-pointed heraldic star: the score unit. */
export function drawPointsIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
): void {
  const pts = starPoints(cx, cy, size * 0.46, size * 0.19, 6);
  g.fillStyle(COLORS.accent, 1);
  g.fillPoints(pts, true);
  g.lineStyle(Math.max(1.2, size * 0.06), COLORS.woodDark, 1);
  g.strokePoints(pts, true);
  g.fillStyle(COLORS.woodDark, 0.85);
  g.fillCircle(cx, cy, size * 0.1);
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
export const EVENT_ICONS = [
  "born",
  "died",
  "immigrant",
  "emigrant",
  "market",
  "mill",
  "spy",
] as const;

export type EventIcon = (typeof EVENT_ICONS)[number];

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
    case "spy": {
      // Trench coat, a face in shadow and a fedora with a red band.
      g.fillStyle(COLORS.info, 1);
      g.fillPoints(
        [
          new V(cx - s * 0.4, cy + s * 0.44),
          new V(cx - s * 0.26, cy + s * 0.14),
          new V(cx + s * 0.26, cy + s * 0.14),
          new V(cx + s * 0.4, cy + s * 0.44),
        ],
        true,
      );
      g.fillStyle(0xe0b98a, 1);
      g.fillEllipse(cx, cy + s * 0.1, s * 0.38, s * 0.42);
      g.fillStyle(ink, 1);
      g.fillCircle(cx - s * 0.08, cy + s * 0.06, s * 0.035);
      g.fillCircle(cx + s * 0.08, cy + s * 0.06, s * 0.035);
      g.fillRoundedRect(
        cx - s * 0.27,
        cy - s * 0.46,
        s * 0.54,
        s * 0.32,
        s * 0.09,
      );
      g.fillStyle(COLORS.danger, 1);
      g.fillRect(cx - s * 0.27, cy - s * 0.24, s * 0.54, s * 0.07);
      g.fillStyle(ink, 1);
      g.fillRoundedRect(
        cx - s * 0.48,
        cy - s * 0.17,
        s * 0.96,
        s * 0.09,
        s * 0.045,
      );
      break;
    }
  }
}

/**
 * Weather pictogram centred on (cx, cy), distinct per WETTER level: 1-3
 * storms/drought, 4-6 clouds/sun mix, 7-10 radiant suns. Offsets are in the
 * 26 px design and scaled by `size / 26`.
 */
export function drawWeatherIcon(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  wetter: number,
): void {
  const u = size / 26;
  const cloudColor = 0x8d95a3;
  const stormColor = 0x5f6b80;
  const sunAt = (
    x: number,
    y: number,
    r: number,
    count: number,
    len: number,
    color: number,
  ) => {
    g.fillStyle(color, 1);
    g.fillCircle(x, y, r * u);
    g.lineStyle(1.6 * u, color, 1);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 2 * Math.PI - Math.PI / 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * (r + 2) * u, y + Math.sin(a) * (r + 2) * u);
      g.lineTo(
        x + Math.cos(a) * (r + 2 + len) * u,
        y + Math.sin(a) * (r + 2 + len) * u,
      );
      g.strokePath();
    }
  };
  const cloudAt = (x: number, y: number, s: number, color: number) => {
    const k = s * u;
    g.fillStyle(color, 1);
    g.fillCircle(x - 4 * k, y, 3 * k);
    g.fillCircle(x, y - 2 * k, 4 * k);
    g.fillCircle(x + 4 * k, y, 3 * k);
    g.fillRect(x - 4 * k, y, 8 * k, 3 * k);
  };
  const line = (x0: number, y0: number, x1: number, y1: number) =>
    g.lineBetween(cx + x0 * u, cy + y0 * u, cx + x1 * u, cy + y1 * u);
  switch (wetter) {
    case 1: {
      // Hurricane: tight swirl with a lightning bolt.
      g.lineStyle(2.5 * u, stormColor, 1);
      for (let i = 0; i < 4; i++) {
        const a0 = -Math.PI / 2 + i * (Math.PI / 2.4);
        g.beginPath();
        g.arc(cx, cy, (2.5 + i * 3) * u, a0, a0 + Math.PI * 1.35);
        g.strokePath();
      }
      const s = 1.5 * u;
      g.fillStyle(COLORS.danger, 1);
      g.fillPoints(
        [
          new V(cx + 2 * s, cy - 6 * s),
          new V(cx + 5 * s, cy + 0.5 * s),
          new V(cx + 3.2 * s, cy + 0.5 * s),
          new V(cx + 1.6 * s, cy + 6 * s),
          new V(cx - 0.4 * s, cy + 1.5 * s),
          new V(cx + 1.2 * s, cy + 1.5 * s),
          new V(cx - 0.8 * s, cy - 0.5 * s),
        ],
        true,
      );
      break;
    }
    case 2: {
      // Drought: scorching sun over cracked ground.
      g.fillStyle(0xdf8c3f, 1);
      g.fillCircle(cx, cy - 5 * u, 7 * u);
      g.lineStyle(1.5 * u, 0xdf8c3f, 1);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
        line(
          Math.cos(a) * 10,
          -5 + Math.sin(a) * 10,
          Math.cos(a) * 12,
          -5 + Math.sin(a) * 12,
        );
      }
      g.lineStyle(2 * u, 0xa06a1f, 1);
      line(-12, 8, 12, 9);
      g.lineStyle(1.5 * u, 0xa06a1f, 1);
      line(-7, 8.5, -4, 13);
      line(0, 9, 3, 13);
      line(7, 9, 4, 13);
      break;
    }
    case 3: {
      // Storm and rain: storm cloud with slanted rain streaks.
      cloudAt(cx, cy, 1.4, stormColor);
      g.lineStyle(1.8 * u, COLORS.info, 1);
      line(-7, 6, -10, 12);
      line(0, 6, -3, 12);
      line(7, 6, 4, 12);
      break;
    }
    case 4:
      // Bad weather: heavy dark cloud.
      cloudAt(cx, cy, 1.7, stormColor);
      break;
    case 5:
      // Normal: sun half hidden behind a cloud.
      sunAt(cx + 5 * u, cy - 2 * u, 5, 0, 0, COLORS.accent);
      cloudAt(cx - 3 * u, cy - 2 * u, 1.0, cloudColor);
      break;
    case 6:
      // OK: sun peeking out from under a small cloud.
      sunAt(cx + 2 * u, cy + 2 * u, 7, 0, 0, COLORS.accentHover);
      cloudAt(cx - 4 * u, cy - 6 * u, 1.0, cloudColor);
      break;
    case 7:
      sunAt(cx, cy, 6, 4, 4, COLORS.accentHover);
      break;
    case 8:
      sunAt(cx, cy, 6, 6, 5, COLORS.accentHover);
      break;
    case 9:
      sunAt(cx, cy, 6, 8, 6, COLORS.accent);
      break;
    case 10:
      // Record summer: radiant sun with a halo and sparks.
      sunAt(cx, cy, 6, 10, 7, COLORS.accent);
      g.lineStyle(1.5 * u, COLORS.accent, 1);
      g.strokeCircle(cx, cy, 13 * u);
      g.fillStyle(COLORS.accent, 1);
      g.fillCircle(cx - 15 * u, cy - 8 * u, 1.5 * u);
      g.fillCircle(cx + 15 * u, cy - 8 * u, 1.5 * u);
      break;
  }
}
