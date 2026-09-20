import type { GameObjects } from "phaser"
import { playTrack } from "../audio/music"
import { toBusiness } from "../flow"
import { t } from "../i18n/i18n"
import type { BuildingKind } from "../model/constants"
import { FocusGroup } from "../ui/focus"
import { CANVAS_H, CANVAS_W, MARGIN } from "../ui/layout"
import { panelFrame } from "../ui/ornament"
import { label } from "../ui/text"
import { COLORS } from "../ui/theme"
import { GameScene } from "./base"
import { poly } from "./Coronation"
import { continueAction } from "./common"

interface MonumentData {
  kind: BuildingKind
}

// Drawn in a 718x470 picture like the coronation, scaled into a framed panel.
const W = 718
const H = 470
const PAD = 12
const GOLD = COLORS.accent
const GOLD_HI = COLORS.accentHover
const WOOD = COLORS.wood
const WOOD_DK = COLORS.woodDark
const RED = COLORS.danger
const GLASS = COLORS.info
const GLASS_HI = 0x6c9bc8
const SKY_TOP = 0x4f7fb5
const SKY_BOTTOM = 0xf3dca4
const HILL_FAR = 0x8d9c7a
const HILL = 0x5f7d43
const GRASS = 0x46653a
const PATH = 0xc9b07a
const WATER = 0x3f6f9a
const STONE = 0xcfc0a0
const STONE_LIT = 0xe2d6b8
const STONE_DK = 0x9a8862
const SLATE = 0x4e5a6b
const FLASH = 0xfff0b0
/** Where the walls meet the grass. */
const GROUND = 400
const BANNER_MID_Y = 35
const BURST = { x: W / 2, y: 100 }

/** Pointed (two-centred) arch: straight sides, apex at `top`. */
function archPoints(x: number, base: number, w: number, top: number) {
  const spring = top + w * Math.sin(Math.PI / 3)
  const pts: [number, number][] = [
    [x, base],
    [x, spring],
  ]
  for (let i = 1; i <= 6; i++) {
    const a = Math.PI - (i / 6) * (Math.PI / 3)
    pts.push([x + w + w * Math.cos(a), spring - w * Math.sin(a)])
  }
  for (let i = 5; i >= 0; i--) {
    const a = (i / 6) * (Math.PI / 3)
    pts.push([x + w * Math.cos(a), spring - w * Math.sin(a)])
  }
  pts.push([x + w, base])
  return pts
}

/** A pointed window or door: `rim` outline around the `fill`. */
function arch(
  g: GameObjects.Graphics,
  x: number,
  base: number,
  w: number,
  top: number,
  fill: number,
  rim = STONE_DK,
) {
  poly(g, archPoints(x - 3, base + 3, w + 6, top - 4), rim)
  poly(g, archPoints(x, base, w, top), fill)
}

/** Wall of dressed stone: shaded right edge and staggered courses. */
function masonry(
  g: GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = STONE,
) {
  g.fillStyle(fill, 1)
  g.fillRect(x, y, w, h)
  g.fillStyle(STONE_DK, 0.35)
  g.fillRect(x + w * 0.78, y, w * 0.22, h)
  g.lineStyle(1, STONE_DK, 0.55)
  for (let row = 0; row < Math.floor(h / 14); row++) {
    const top = y + row * 14
    g.lineBetween(x, top + 14, x + w, top + 14)
    for (let jx = x + 9 + (row % 2) * 9; jx < x + w; jx += 18) g.lineBetween(jx, top, jx, top + 14)
  }
}

/** Ledge with square merlons on top of a wall. */
function battlements(g: GameObjects.Graphics, x: number, y: number, w: number) {
  g.fillStyle(STONE_DK, 1)
  g.fillRect(x - 3, y, w + 6, 5)
  g.fillStyle(STONE, 1)
  for (let mx = x; mx < x + w - 6; mx += 14) g.fillRect(mx, y - 10, 8, 10)
  g.fillStyle(STONE_DK, 0.35)
  for (let mx = x; mx < x + w - 6; mx += 14) g.fillRect(mx + 5, y - 10, 3, 10)
}

/** Cone or spire from `y` up to `apex`, lit on its left half. */
function spire(
  g: GameObjects.Graphics,
  x: number,
  w: number,
  y: number,
  apex: number,
  fill: number,
  lit: number,
) {
  const cx = x + w / 2
  poly(
    g,
    [
      [x, y],
      [x + w, y],
      [cx, apex],
    ],
    fill,
  )
  poly(
    g,
    [
      [x, y],
      [cx, y],
      [cx, apex],
    ],
    lit,
  )
  g.fillStyle(GOLD_HI, 1)
  g.fillCircle(cx, apex - 1, 3)
}

function drawBanner(g: GameObjects.Graphics) {
  panelFrame(g, 8, 8, W - 16, 54)
}

/** Half-ellipse hill on the horizon, clipped to the picture. */
function hill(g: GameObjects.Graphics, cx: number, w: number, h: number, fill: number) {
  const pts: [number, number][] = []
  const from = Math.max(0, cx - w / 2)
  const to = Math.min(W, cx + w / 2)
  for (let x = from; x < to + 8; x += 8) {
    const dx = (Math.min(x, to) - cx) / (w / 2)
    pts.push([Math.min(x, to), GROUND - h * Math.sqrt(1 - dx * dx)])
  }
  pts.push([to, GROUND], [from, GROUND])
  poly(g, pts, fill)
}

/** Sky, far hills, grass and a few round trees. */
function drawLandscape(g: GameObjects.Graphics) {
  g.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1)
  g.fillRect(0, 0, W, GROUND)
  hill(g, 120, 460, 75, HILL_FAR)
  hill(g, 600, 520, 95, HILL_FAR)
  hill(g, 360, 760, 30, HILL)
  g.fillStyle(GRASS, 1)
  g.fillRect(0, GROUND, W, H - GROUND)
  for (const [x, y, r] of [
    [46, 446, 20],
    [92, 452, 14],
    [672, 446, 20],
    [626, 452, 14],
  ] as const) {
    g.fillStyle(WOOD_DK, 1)
    g.fillRect(x - 3, y, 6, 14)
    g.fillStyle(COLORS.success, 1)
    g.fillCircle(x, y, r)
    g.fillStyle(0x000000, 0.18)
    g.fillCircle(x + r * 0.3, y + r * 0.2, r * 0.7)
  }
}

/** Round tower with a conical red roof and a pennant. */
function roundTower(g: GameObjects.Graphics, x: number, top: number, w: number, roofH: number) {
  masonry(g, x, top, w, GROUND - top)
  g.fillStyle(STONE_DK, 1)
  g.fillRect(x - 5, top, w + 10, 6)
  arch(g, x + w / 2 - 7, top + 70, 14, top + 34, GLASS)
  spire(g, x - 8, w + 16, top, top - roofH, RED, 0xb8403a)
  g.lineStyle(2, WOOD_DK, 1)
  g.lineBetween(x + w / 2, top - roofH, x + w / 2, top - roofH - 22)
  poly(
    g,
    [
      [x + w / 2, top - roofH - 22],
      [x + w / 2 + 22, top - roofH - 16],
      [x + w / 2, top - roofH - 10],
    ],
    GOLD,
  )
}

/** Medieval palace: keep with turret, two tower pairs, walls, gate and moat. */
export function drawPalace(g: GameObjects.Graphics) {
  drawLandscape(g)

  for (const x of [58, 458]) {
    masonry(g, x, 300, 202, GROUND - 300)
    battlements(g, x, 300, 202)
    for (const sx of [x + 40, x + 100, x + 160]) {
      g.fillStyle(WOOD_DK, 1)
      g.fillRect(sx, 326, 5, 26)
    }
  }
  roundTower(g, 22, 226, 62, 62)
  roundTower(g, 634, 226, 62, 62)
  roundTower(g, 208, 196, 68, 70)
  roundTower(g, 442, 196, 68, 70)

  // Central keep with great windows and a crowned turret.
  masonry(g, 286, 152, 146, GROUND - 152, STONE_LIT)
  battlements(g, 286, 152, 146)
  masonry(g, 322, 118, 74, 34, STONE_LIT)
  spire(g, 314, 90, 118, 78, RED, 0xb8403a)
  for (const row of [
    [172, 214],
    [236, 278],
  ] as const) {
    for (const wx of [304, 351, 398]) arch(g, wx, row[1], 16, row[0], GLASS)
  }
  g.fillStyle(GLASS_HI, 0.5)
  for (const wx of [304, 351, 398]) g.fillRect(wx + 3, 190, 4, 22)

  // Gate on a drawbridge over the moat.
  g.fillStyle(WATER, 1)
  g.fillRect(0, GROUND, W, 14)
  g.fillStyle(0xffffff, 0.25)
  for (let x = 10; x < W; x += 46) g.fillRect(x, GROUND + 5, 20, 2)
  poly(
    g,
    [
      [334, GROUND],
      [384, GROUND],
      [394, GROUND + 14],
      [324, GROUND + 14],
    ],
    WOOD,
  )
  poly(
    g,
    [
      [324, GROUND + 14],
      [394, GROUND + 14],
      [430, H],
      [288, H],
    ],
    PATH,
  )
  arch(g, 329, GROUND, 60, 300, WOOD_DK, GOLD)
  g.lineStyle(2, GOLD, 1)
  for (let x = 339; x < 389; x += 10) g.lineBetween(x, 318, x, GROUND)
  for (const y of [330, 350, 372]) g.lineBetween(331, y, 387, y)
}

/** Gothic cathedral: twin spires, rose window, portals, aisles and buttresses. */
export function drawCathedral(g: GameObjects.Graphics) {
  drawLandscape(g)
  g.fillStyle(PATH, 1)
  g.fillRect(0, GROUND, W, 22)

  // Central spire behind the gable, with a gold cross.
  poly(
    g,
    [
      [349, 156],
      [369, 156],
      [359, 76],
    ],
    SLATE,
  )
  g.fillStyle(GOLD_HI, 1)
  g.fillRect(357, 62, 4, 16)
  g.fillRect(352, 67, 14, 4)

  // Side aisles, roofs, piers and flying buttresses.
  for (const m of [1, -1]) {
    const x = (v: number) => (m === 1 ? v : W - v)
    const left = (v: number, w: number) => (m === 1 ? v : W - v - w)
    masonry(g, left(96, 94), 318, 94, GROUND - 318)
    poly(
      g,
      [
        [x(88), 322],
        [x(190), 286],
        [x(190), 322],
      ],
      SLATE,
    )
    for (const wx of [118, 152]) arch(g, left(wx, 18), 384, 18, 338, GLASS)
    g.fillStyle(STONE_DK, 1)
    g.fillRect(left(84, 14), 300, 14, GROUND - 300)
    poly(
      g,
      [
        [x(80), 300],
        [x(102), 300],
        [x(91), 268],
      ],
      STONE,
    )
    poly(
      g,
      [
        [x(98), 306],
        [x(98), 322],
        [x(190), 290],
        [x(190), 276],
      ],
      STONE_DK,
    )
  }

  // Central body: gable, rose window, gallery, portals.
  masonry(g, 276, 230, 166, GROUND - 230, STONE_LIT)
  poly(
    g,
    [
      [276, 230],
      [442, 230],
      [359, 150],
    ],
    STONE_LIT,
  )
  g.lineStyle(4, STONE_DK, 1)
  g.lineBetween(276, 230, 359, 150)
  g.lineBetween(359, 150, 442, 230)
  arch(g, 351, 222, 16, 178, GLASS)
  g.fillStyle(GOLD, 1)
  g.fillCircle(359, 268, 34)
  g.fillStyle(STONE_DK, 1)
  g.fillCircle(359, 268, 31)
  g.fillStyle(GLASS, 1)
  g.fillCircle(359, 268, 28)
  g.lineStyle(3, GLASS_HI, 1)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.lineBetween(359, 268, 359 + 28 * Math.cos(a), 268 + 28 * Math.sin(a))
  }
  g.strokeCircle(359, 268, 15)
  g.fillStyle(GOLD_HI, 1)
  g.fillCircle(359, 268, 5)
  g.fillStyle(STONE_DK, 1)
  g.fillRect(276, 306, 166, 6)
  arch(g, 328, GROUND, 62, 322, WOOD_DK)
  g.lineStyle(2, GOLD, 1)
  g.lineBetween(359, 362, 359, GROUND)
  g.beginPath()
  archPoints(336, GROUND, 46, 338).forEach(([x, y], i) => {
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  })
  g.strokePath()
  for (const x of [284, 406]) arch(g, x, GROUND, 26, 356, WOOD_DK)

  // Twin towers with belfry windows, pinnacles and slate spires.
  for (const x of [190, 448]) {
    masonry(g, x, 170, 80, GROUND - 170)
    g.fillStyle(STONE_DK, 1)
    g.fillRect(x - 4, 170, 88, 7)
    for (const wx of [x + 16, x + 48]) arch(g, wx, 262, 16, 202, GLASS)
    arch(g, x + 32, 340, 16, 292, GLASS)
    for (const px of [x - 4, x + 74]) {
      poly(
        g,
        [
          [px, 170],
          [px + 10, 170],
          [px + 5, 148],
        ],
        STONE,
      )
    }
    spire(g, x - 2, 84, 170, 84, SLATE, 0x6b7a90)
  }

  // Steps.
  for (const [i, w] of [284, 304, 324].entries()) {
    g.fillStyle(i % 2 ? STONE : STONE_LIT, 1)
    g.fillRect(W / 2 - w / 2, GROUND + i * 7, w, 7)
  }
}

/**
 * Picture of a finished palace or cathedral, shown when a ruler buys the last
 * part (KAISER4 #GESCHAFT has no such screen). Continue returns to Business.
 */
export class Monument extends GameScene {
  constructor() {
    super("Monument")
  }

  create(data: MonumentData) {
    const palace = data.kind !== "dom"
    playTrack(palace ? "palace" : "cathedral")
    const group = new FocusGroup(this)
    continueAction(this, group, () => toBusiness(this.scene))

    const scale = (CANVAS_H - 2 * MARGIN - 72 - PAD * 2) / H
    const panelW = W * scale + PAD * 2
    const panelX = (CANVAS_W - panelW) / 2
    panelFrame(this.add.graphics(), panelX, MARGIN, panelW, H * scale + PAD * 2)
    const pic = this.add.container(panelX + PAD, MARGIN + PAD).setScale(scale)

    const art = this.add.graphics()
    ;(palace ? drawPalace : drawCathedral)(art)
    drawBanner(art)
    art.lineStyle(4, WOOD_DK, 1)
    art.strokeRect(0, 0, W, H)
    pic.add(art)

    const banner = label(
      this,
      W / 2,
      BANNER_MID_Y,
      t(palace ? "monument.palace" : "monument.cathedral"),
      {
        size: 26,
        weight: "bold",
        display: true,
        color: COLORS.text,
        origin: 0.5,
      },
    )
    banner.setAlpha(0)
    banner.setScale(Math.min(1, (W - 48) / banner.width))
    pic.add(banner)

    const flash = this.add.rectangle(W / 2, H / 2, W, H, FLASH, 0.55)
    pic.add(flash)
    this.tweens.add({ targets: flash, alpha: 0, duration: 900 })
    this.tweens.add({ targets: banner, alpha: 1, duration: 900, delay: 300 })

    // Golden sparks burst from the top of the building.
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2
      const reach = 50 + ((i * 37) % 40)
      const dot = this.add.rectangle(BURST.x, BURST.y, 4, 4, i % 2 ? GOLD_HI : STONE_LIT)
      pic.add(dot)
      this.tweens.add({
        targets: dot,
        x: BURST.x + Math.cos(angle) * reach,
        y: BURST.y + Math.sin(angle) * reach * 0.8,
        alpha: 0,
        duration: 1300,
        ease: "Cubic.out",
        onComplete: () => dot.destroy(),
      })
    }
  }
}
