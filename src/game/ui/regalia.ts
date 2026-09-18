import { type GameObjects, Math as PhaserMath } from "phaser";
import { at } from "../lookup";
import { COLORS } from "./theme";

const V = PhaserMath.Vector2;
const GOLD = COLORS.accentHover;
const GOLD_DK = COLORS.accent;
const PEARL = COLORS.surface;
const ERMINE = 0xf4f0e6;
/** Half width and height of the band the headgear sits on. */
const HALF = 50;
const BAND = 14;

interface Regalia {
  /** Gold points on the band; none = a row of pearls (or an ermine brim). */
  spikes: number;
  /** Height of the red velvet cap. */
  cap: number;
  arches: number;
  finial: "orb" | "cross" | null;
  ermine: boolean;
}

/** Headgear per title, Baron (rank 1) .. König (rank 7). */
const REGALIA: Regalia[] = [
  { spikes: 0, cap: 0, arches: 0, finial: null, ermine: false },
  { spikes: 3, cap: 0, arches: 0, finial: null, ermine: false },
  { spikes: 5, cap: 0, arches: 0, finial: null, ermine: false },
  { spikes: 5, cap: 34, arches: 0, finial: null, ermine: false },
  { spikes: 0, cap: 52, arches: 1, finial: "orb", ermine: true },
  { spikes: 0, cap: 52, arches: 1, finial: "cross", ermine: true },
  { spikes: 5, cap: 52, arches: 2, finial: "cross", ermine: false },
];

/** Upper half of an ellipse over the band, left to right. */
function arc(w: number, h: number): PhaserMath.Vector2[] {
  return Array.from({ length: 17 }, (_, i) => {
    const a = (Math.PI * i) / 16;
    return new V(-Math.cos(a) * w, -BAND - Math.sin(a) * h);
  });
}

function drawBand(g: GameObjects.Graphics, ermine: boolean): void {
  g.fillStyle(ermine ? ERMINE : GOLD, 1);
  g.fillRect(-HALF, -BAND, 2 * HALF, BAND);
  g.fillStyle(GOLD_DK, 1);
  g.fillRect(-HALF, -3, 2 * HALF, 3);
  if (ermine) {
    g.fillStyle(COLORS.woodDark, 1);
    for (let x = -HALF + 8; x < HALF; x += 14)
      g.fillRect(x - 1.5, -BAND + 2, 3, 7);
    return;
  }
  for (const [i, x] of [-30, -10, 10, 30].entries()) {
    g.fillStyle(i % 2 ? COLORS.info : COLORS.danger, 1);
    g.fillRect(x - 3, -BAND + 4, 6, 6);
  }
}

function drawSpikes(g: GameObjects.Graphics, n: number, pearls: boolean): void {
  const step = (2 * (HALF - 8)) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * step;
    const h = 24 - (Math.abs(x) / HALF) * 8;
    g.fillStyle(GOLD, 1);
    g.fillTriangle(x - 7, -BAND, x + 7, -BAND, x, -BAND - h);
    if (pearls) {
      g.fillStyle(GOLD_DK, 1);
      g.fillCircle(x, -BAND - h - 2, 5);
      g.fillStyle(PEARL, 1);
      g.fillCircle(x, -BAND - h - 2, 3.5);
    }
  }
}

/**
 * Draw the headgear of title `rank` (1..7) around x = 0, the band resting on
 * y = 0 and everything else above it; the caller scales and positions `g`.
 */
export function drawRegalia(g: GameObjects.Graphics, rank: number): void {
  const r = at(REGALIA, Math.min(Math.max(rank, 1), REGALIA.length) - 1);
  if (r.cap > 0) {
    g.fillStyle(COLORS.danger, 1);
    g.fillPoints(arc(HALF - 3, r.cap), true);
  }
  const top = -BAND - r.cap - 6;
  for (let i = 0; i < r.arches; i++) {
    g.lineStyle(5, GOLD, 1);
    g.strokePoints(arc(HALF - 4 - i * 18, r.cap + 6), false);
  }
  drawBand(g, r.ermine);
  if (r.spikes > 0) drawSpikes(g, r.spikes, rank >= 3);
  else if (!r.ermine) {
    for (let i = 0; i < 7; i++) {
      const x = -HALF + 6 + i * 14.67;
      g.fillStyle(GOLD_DK, 1);
      g.fillCircle(x, -BAND - 4, 6);
      g.fillStyle(PEARL, 1);
      g.fillCircle(x, -BAND - 4, 4);
    }
  }
  g.fillStyle(GOLD, 1);
  if (r.finial === "orb") g.fillCircle(0, top - 5, 6);
  if (r.finial === "cross") {
    g.fillRect(-2, top - 20, 4, 20);
    g.fillRect(-7, top - 15, 14, 4);
  }
}
