import { type GameObjects, Math as PhaserMath, type Scene } from "phaser"
import { CANVAS_H, CANVAS_W } from "./layout"
import { label } from "./text"
import { COLORS, FS, RADIUS } from "./theme"

/** Deterministic pseudo-random in [0,1) so texture is stable across redraws. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Full-canvas dark walnut backdrop: vertical gradient, plank seams and a soft
 * vignette. Sits at the very back of every medieval screen.
 */
export function woodBackground(scene: Scene): GameObjects.Graphics {
  const g = scene.add.graphics()
  g.setDepth(-1000)

  g.fillGradientStyle(0x3a2814, 0x33240f, 0x160e07, 0x120b05, 1)
  g.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const plank = 72
  for (let y = plank; y < CANVAS_H; y += plank) {
    g.lineStyle(2, COLORS.woodDark, 0.55)
    g.lineBetween(0, y, CANVAS_W, y)
    g.lineStyle(1, 0x5a4020, 0.18)
    g.lineBetween(0, y + 2, CANVAS_W, y + 2)
  }
  // Short vertical joints, staggered per row.
  for (let row = 0; row * plank < CANVAS_H; row++) {
    const joints = 2
    for (let j = 0; j < joints; j++) {
      const x = hash(row * 7 + j) * CANVAS_W
      const y = row * plank
      g.lineStyle(1, COLORS.woodDark, 0.35)
      g.lineBetween(x, y, x, y + plank)
    }
  }

  // Vignette: nested strokes darkening toward the edges.
  const steps = 10
  for (let i = 0; i < steps; i++) {
    g.lineStyle(6, 0x000000, 0.05)
    g.strokeRect(i * 6, i * 6, CANVAS_W - i * 12, CANVAS_H - i * 12)
  }
  return g
}

/** Subtle mottling on a parchment rect (call inside a panel's Graphics). */
export function parchmentTexture(
  g: GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const count = Math.min(48, Math.floor((w * h) / 4200))
  for (let i = 0; i < count; i++) {
    const px = x + hash(i * 3.1 + x) * w
    const py = y + hash(i * 5.7 + y) * h
    const r = 2 + hash(i * 9.3) * 6
    const light = hash(i * 1.7) > 0.5
    g.fillStyle(light ? 0xffffff : 0x8a6b3f, light ? 0.05 : 0.04)
    g.fillCircle(px, py, r)
  }
}

/** Gold L-bracket in one corner; `sx`/`sy` are the inward directions (±1). */
export function cornerFlourish(
  g: GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  sx: number,
  sy: number,
): void {
  g.lineStyle(2, COLORS.accent, 0.9)
  g.beginPath()
  g.moveTo(x + sx * size, y)
  g.lineTo(x, y)
  g.lineTo(x, y + sy * size)
  g.strokePath()
  g.fillStyle(COLORS.accent, 0.9)
  g.fillCircle(x + sx * 10, y + sy * 10, 3)
}

/** Decorative screen frame: dark wood band, gold hairline, corner flourishes. */
export function frameBorder(scene: Scene): GameObjects.Graphics {
  const g = scene.add.graphics()
  const inset = 8
  const w = CANVAS_W - inset * 2
  const h = CANVAS_H - inset * 2
  g.lineStyle(4, COLORS.woodDark, 0.8)
  g.strokeRect(inset, inset, w, h)
  g.lineStyle(1, COLORS.accent, 0.55)
  g.strokeRect(inset + 5, inset + 5, w - 10, h - 10)
  const s = 26
  cornerFlourish(g, inset + 8, inset + 8, s, 1, 1)
  cornerFlourish(g, CANVAS_W - inset - 8, inset + 8, s, -1, 1)
  cornerFlourish(g, inset + 8, CANVAS_H - inset - 8, s, 1, -1)
  cornerFlourish(g, CANVAS_W - inset - 8, CANVAS_H - inset - 8, s, -1, -1)
  return g
}

/** Ornamental horizontal rule with a centre diamond, centred on `cx`. */
export function divider(scene: Scene, cx: number, cy: number, w: number): GameObjects.Container {
  const c = scene.add.container(cx, cy)
  const g = scene.add.graphics()
  const half = w / 2
  g.lineStyle(1, COLORS.accent, 0.7)
  g.lineBetween(-half, 0, -12, 0)
  g.lineBetween(12, 0, half, 0)
  g.fillStyle(COLORS.accent, 0.9)
  g.fillPoints(
    [
      new PhaserMath.Vector2(0, -7),
      new PhaserMath.Vector2(7, 0),
      new PhaserMath.Vector2(0, 7),
      new PhaserMath.Vector2(-7, 0),
    ],
    true,
  )
  g.fillCircle(-half, 0, 2.5)
  g.fillCircle(half, 0, 2.5)
  c.add(g)
  return c
}

/**
 * Heraldic crest: a crown above a shield, used as the start-screen emblem.
 * `cy` is the crown tip; the shield hangs below it.
 */
export function crest(scene: Scene, cx: number, cy: number, size: number): GameObjects.Container {
  const c = scene.add.container(cx, cy)
  const g = scene.add.graphics()
  const w = size
  const crownH = size * 0.5

  // Crown: band with three points and pearls (local coords, origin = tip).
  const bandY = crownH
  g.fillStyle(COLORS.accent, 1)
  g.fillRoundedRect(-w / 2, bandY - 12, w, 14, 3)
  const points = 3
  for (let i = 0; i < points; i++) {
    const px = -w / 2 + (w / (points - 1)) * i
    const tipY = bandY - 12 - crownH * 0.55
    g.fillTriangle(px - 9, bandY - 12, px + 9, bandY - 12, px, tipY)
    g.fillCircle(px, tipY - 3, 5)
  }

  // Shield below the crown.
  const top = bandY + 6
  const sh = size * 1.15
  const left = -w / 2
  const right = w / 2
  const shield = [
    new PhaserMath.Vector2(left, top),
    new PhaserMath.Vector2(right, top),
    new PhaserMath.Vector2(right, top + sh * 0.55),
    new PhaserMath.Vector2(0, top + sh),
    new PhaserMath.Vector2(left, top + sh * 0.55),
  ]
  g.fillStyle(COLORS.danger, 1)
  g.fillPoints(shield, true)
  g.lineStyle(3, COLORS.accent, 1)
  g.strokePoints(shield, true)

  // Gold cross on the shield.
  const cw = w * 0.18
  g.fillStyle(COLORS.accent, 1)
  g.fillRect(-cw / 2, top + sh * 0.12, cw, sh * 0.62)
  g.fillRect(left + w * 0.16, top + sh * 0.28, w * 0.68, cw)

  c.add(g)
  return c
}

/** Small crown glyph for panel headings. */
export function crownGlyph(
  scene: Scene,
  x: number,
  y: number,
  size: number,
): GameObjects.Container {
  const c = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(COLORS.accent, 1)
  g.fillRoundedRect(-size / 2, size * 0.15, size, size * 0.35, 2)
  const pts = 3
  for (let i = 0; i < pts; i++) {
    const px = -size / 2 + (size / (pts - 1)) * i
    g.fillTriangle(px - 4, size * 0.15, px + 4, size * 0.15, px, -size * 0.35)
  }
  c.add(g)
  return c
}

/** Panel heading: a gold title on parchment, with a small crown and rule. */
export function panelTitle(
  scene: Scene,
  x: number,
  y: number,
  w: number,
  text: string,
): GameObjects.Container {
  const c = scene.add.container(x, y)
  const t = label(scene, 0, 0, text, {
    display: true,
    weight: "bold",
    size: FS.heading,
    color: COLORS.wood,
  })
  c.add(t)
  c.add(crownGlyph(scene, t.width + 16, 9, 16))
  const g = scene.add.graphics()
  g.lineStyle(1, COLORS.border, 0.5)
  g.lineBetween(0, 26, w, 26)
  c.add(g)
  return c
}

/** A framed content panel used by scenes: parchment fill + double border. */
export function panelFrame(
  g: GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(COLORS.surface, 1)
  g.fillRoundedRect(x, y, w, h, RADIUS)
  parchmentTexture(g, x, y, w, h)
  g.lineStyle(3, COLORS.wood, 1)
  g.strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, RADIUS)
  g.lineStyle(1, COLORS.accent, 0.7)
  g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, RADIUS)
  // Corner rivets.
  g.fillStyle(COLORS.accent, 0.8)
  for (const [dx, dy] of [
    [10, 10],
    [w - 10, 10],
    [10, h - 10],
    [w - 10, h - 10],
  ] as const) {
    g.fillCircle(x + dx, y + dy, 2.5)
  }
}
