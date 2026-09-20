import { type GameObjects, Math as PhaserMath } from "phaser"
import { at } from "../lookup"
import { drawShield } from "./icon"
import { drawRegalia } from "./regalia"
import { COLORS } from "./theme"

const V = PhaserMath.Vector2
const SKIN = 0xe2b48c
const SKIN_DK = 0xb98b63
const INK = COLORS.woodDark
const ERMINE = 0xf4f0e6
const RAYS = 24
/** Band of the headgear sits on the forehead; the bust is drawn around (0, 0) = chin. */
const BAND_Y = -80

interface Age {
  hair: number
  robe: number
  /** Beard length below the chin; 0 = clean shaven. */
  beard: number
  moustache: boolean
  /** 0 = smooth skin .. 5 = deep lines. */
  wrinkles: number
  ermine: boolean
}

/** The ruler at each title, Baron (about 25) .. König (about 72): greying, lined, bearded. */
const AGES: Age[] = [
  {
    hair: 0x3a2410,
    robe: 0x5a4632,
    beard: 0,
    moustache: false,
    wrinkles: 0,
    ermine: false,
  },
  {
    hair: 0x3f2a14,
    robe: 0x3d5a3a,
    beard: 0,
    moustache: true,
    wrinkles: 0,
    ermine: false,
  },
  {
    hair: 0x4a3520,
    robe: 0x2e4a70,
    beard: 8,
    moustache: true,
    wrinkles: 1,
    ermine: false,
  },
  {
    hair: 0x6b5a4a,
    robe: 0x5b3a6b,
    beard: 16,
    moustache: true,
    wrinkles: 2,
    ermine: false,
  },
  {
    hair: 0x8a8478,
    robe: 0x7a2a2a,
    beard: 22,
    moustache: true,
    wrinkles: 3,
    ermine: true,
  },
  {
    hair: 0xb8b4ac,
    robe: 0x7a2a2a,
    beard: 28,
    moustache: true,
    wrinkles: 4,
    ermine: true,
  },
  {
    hair: 0xece8e0,
    robe: 0x8a1f1f,
    beard: 34,
    moustache: true,
    wrinkles: 5,
    ermine: true,
  },
]

function poly(g: GameObjects.Graphics, points: number[][], fill: number, alpha = 1): void {
  g.fillStyle(fill, alpha)
  g.fillPoints(
    points.map(([x, y]) => new V(x, y)),
    true,
  )
}

function drawRobe(g: GameObjects.Graphics, age: Age): void {
  poly(
    g,
    [
      [-18, 0],
      [-60, 12],
      [-104, 40],
      [-112, 116],
      [112, 116],
      [104, 40],
      [60, 12],
      [18, 0],
    ],
    age.robe,
  )
  g.fillStyle(COLORS.accent, 1)
  g.fillRect(-112, 112, 224, 4)
  if (!age.ermine) return
  poly(
    g,
    [
      [-30, -4],
      [-70, 14],
      [-88, 36],
      [-50, 30],
      [0, 22],
      [50, 30],
      [88, 36],
      [70, 14],
      [30, -4],
    ],
    ERMINE,
  )
  g.fillStyle(INK, 1)
  for (const [x, y] of [
    [-66, 18],
    [-52, 12],
    [-40, 20],
    [40, 20],
    [52, 12],
    [66, 18],
    [-78, 25],
    [78, 25],
  ] as const)
    g.fillRect(x - 1.5, y, 3, 6)
}

/** Face, hair and beard; `w` is 1 for the mirrored halves drawn in a loop. */
function drawFace(g: GameObjects.Graphics, age: Age): void {
  g.fillStyle(SKIN_DK, 1)
  g.fillRect(-16, -6, 32, 16)
  for (const m of [-1, 1]) g.fillEllipse(m * 42, -52, 10, 20)
  g.fillStyle(SKIN, 1)
  g.fillEllipse(0, -50, 82, 104)
  if (age.wrinkles < 2) {
    g.fillStyle(0xe59a86, 0.45)
    for (const m of [-1, 1]) g.fillEllipse(m * 22, -38, 14, 8)
  }
  g.fillStyle(age.hair, 1)
  g.fillEllipse(0, -92, 82, 34)
  for (const m of [-1, 1]) g.fillEllipse(m * 39, -72, 16, 40)
  if (age.beard > 0) {
    const l = age.beard
    poly(
      g,
      [
        [-39, -52],
        [-37, -20],
        [-24, -2 + l * 0.5],
        [-10, 2 + l * 0.9],
        [0, 2 + l],
        [10, 2 + l * 0.9],
        [24, -2 + l * 0.5],
        [37, -20],
        [39, -52],
        [24, -34],
        [10, -28],
        [0, -30],
        [-10, -28],
        [-24, -34],
      ],
      age.hair,
    )
  }
  if (age.moustache)
    poly(
      g,
      [
        [-20, -36],
        [-3, -34],
        [0, -31],
        [3, -34],
        [20, -36],
        [14, -28],
        [0, -30],
        [-14, -28],
      ],
      age.hair,
    )
  g.fillStyle(0x7a3a30, 1)
  g.fillRect(-7, -27, 14, 2.5)
}

function drawEyes(g: GameObjects.Graphics, age: Age): void {
  for (const m of [-1, 1]) {
    g.fillStyle(0xffffff, 1)
    g.fillEllipse(m * 16, -56, 14, 7)
    g.fillStyle(INK, 1)
    g.fillCircle(m * 16, -56, 2.6)
    g.lineStyle(age.wrinkles >= 4 ? 5 : 3, age.hair, 1)
    g.lineBetween(m * 8, -64, m * 24, -66)
  }
  g.lineStyle(2, SKIN_DK, 1)
  g.lineBetween(0, -52, -4, -38)
  g.lineBetween(-4, -38, 3, -37)
}

function drawWrinkles(g: GameObjects.Graphics, level: number): void {
  g.lineStyle(1.5, SKIN_DK, 0.8)
  for (const m of [-1, 1]) {
    if (level >= 1) g.lineBetween(m * 8, -70, m * 24, -70)
    if (level >= 2) {
      g.lineBetween(m * 26, -57, m * 32, -60)
      g.lineBetween(m * 26, -55, m * 32, -53)
    }
    if (level >= 3) g.lineBetween(m * 22, -49, m * 10, -48)
    if (level >= 4) g.lineBetween(m * 11, -42, m * 16, -30)
    if (level >= 5) g.lineBetween(m * 8, -73, m * 24, -73)
  }
}

/**
 * Bust of a ruler wearing the headgear of title `rank` (1..7), with the shield
 * of player icon `portrait` on the chest. Drawn around (0, 0) = the chin; the
 * crown reaches up to about y = -165 and the robe down to y = 116.
 */
export function drawRuler(g: GameObjects.Graphics, rank: number, portrait: number): void {
  const age = at(AGES, Math.min(Math.max(rank, 1), AGES.length) - 1)
  drawRobe(g, age)
  drawFace(g, age)
  drawEyes(g, age)
  drawWrinkles(g, age.wrinkles)
  g.save()
  g.translateCanvas(0, BAND_Y)
  g.scaleCanvas(0.9, 0.9)
  drawRegalia(g, rank)
  g.restore()
  drawShield(g, 0, 76, 62, portrait)
}

/** The bust spans y = -165 (crown) .. 116 (robe hem) around the chin. */
const BUST_TOP = -165
const BUST_BOTTOM = 116

/**
 * Promotion picture: gold ray halo of radius `halo` around (`cx`, `cy`) and the
 * ruler's bust in front of it, scaled down to fit the halo's diameter and
 * centered on (`cx`, `cy`).
 */
export function drawPromotionArt(
  g: GameObjects.Graphics,
  cx: number,
  cy: number,
  halo: number,
  rank: number,
  portrait: number,
): void {
  g.fillStyle(COLORS.accent, 0.16)
  for (let i = 0; i < RAYS; i += 2) {
    const a = (i / RAYS) * Math.PI * 2
    const b = ((i + 1) / RAYS) * Math.PI * 2
    g.fillTriangle(
      cx,
      cy,
      cx + halo * Math.cos(a),
      cy + halo * Math.sin(a),
      cx + halo * Math.cos(b),
      cy + halo * Math.sin(b),
    )
  }
  const scale = Math.min(1, (halo * 2) / (BUST_BOTTOM - BUST_TOP))
  g.save()
  g.translateCanvas(cx, cy - ((BUST_TOP + BUST_BOTTOM) / 2) * scale)
  g.scaleCanvas(scale, scale)
  drawRuler(g, rank, portrait)
  g.restore()
}
