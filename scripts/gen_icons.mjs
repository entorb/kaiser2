// Generate the PWA app icons (public/icons/*.png) procedurally, matching the
// in-game heraldic crest (see src/game/ui/ornament.ts `crest`). Zero dependency:
// shapes are rasterised by hand and encoded as PNG with node:zlib.
//
//   node scripts/gen_icons.mjs
//
// Rerunnable and deterministic; overwrites the committed PNGs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { crc32, deflateSync } from "node:zlib"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "icons")

// Palette (mirrors src/game/ui/theme.ts).
const BG_TOP = [0x3a, 0x28, 0x14]
const BG_BOTTOM = [0x12, 0x0b, 0x05]
const GOLD = [0xc0, 0x8a, 0x1e]
const RED = [0x9c, 0x2b, 0x24]

const SS = 4 // supersampling factor for anti-aliasing

/** Crest geometry in its own units (crown tip near y=0). */
const CREST = (() => {
  const w = 100
  const crownH = 50
  const bandY = crownH
  const points = []
  for (let i = 0; i < 3; i++) {
    const px = -w / 2 + (w / 2) * i
    const tipY = bandY - 12 - crownH * 0.55
    points.push({
      triangle: [
        [px - 9, bandY - 12],
        [px + 9, bandY - 12],
        [px, tipY],
      ],
      circle: [px, tipY - 3, 5],
    })
  }
  const top = bandY + 6
  const sh = w * 1.15
  const shield = [
    [-w / 2, top],
    [w / 2, top],
    [w / 2, top + sh * 0.55],
    [0, top + sh],
    [-w / 2, top + sh * 0.55],
  ]
  const cw = w * 0.18
  const cross = [
    [-cw / 2, top + sh * 0.12, cw, sh * 0.62],
    [-w / 2 + w * 0.16, top + sh * 0.28, w * 0.68, cw],
  ]
  const band = [-w / 2, bandY - 12, w, 14]
  return { points, shield, cross, band }
})()

// Bounding box of the crest, used to fit it into the icon.
const BBOX = (() => {
  const xs = []
  const ys = []
  const add = (x, y) => {
    xs.push(x)
    ys.push(y)
  }
  for (const { triangle, circle } of CREST.points) {
    for (const [x, y] of triangle) add(x, y)
    add(circle[0] - circle[2], circle[1] - circle[2])
    add(circle[0] + circle[2], circle[1] + circle[2])
  }
  for (const [x, y] of CREST.shield) add(x, y)
  add(CREST.band[0], CREST.band[1])
  add(CREST.band[0] + CREST.band[2], CREST.band[1] + CREST.band[3])
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
})()

function makeCanvas(w, h) {
  return { w, h, data: new Uint8Array(w * h * 4) }
}

function setPx(c, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return
  const i = (y * c.w + x) * 4
  c.data[i] = r
  c.data[i + 1] = g
  c.data[i + 2] = b
  c.data[i + 3] = 255
}

/** Even-odd scanline fill of a polygon given in canvas coordinates. */
function fillPolygon(c, pts, color) {
  const ys = pts.map((p) => p[1])
  const y0 = Math.max(0, Math.floor(Math.min(...ys)))
  const y1 = Math.min(c.h - 1, Math.ceil(Math.max(...ys)))
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5
    const xs = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      if (ay === by) continue
      const t = (cy - ay) / (by - ay)
      if (t >= 0 && t < 1) xs.push(ax + t * (bx - ax))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i] - 0.5))
      const x1 = Math.min(c.w - 1, Math.floor(xs[i + 1] - 0.5))
      for (let x = x0; x <= x1; x++) setPx(c, x, y, color)
    }
  }
}

function fillRect(c, x, y, w, h, color) {
  fillPolygon(
    c,
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    color,
  )
}

function fillCircle(c, cx, cy, r, color) {
  const x0 = Math.max(0, Math.floor(cx - r))
  const x1 = Math.min(c.w - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const y1 = Math.min(c.h - 1, Math.ceil(cy + r))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= r * r) setPx(c, x, y, color)
    }
  }
}

/** Box-downsample the supersampled canvas to the target size. */
function downsample(c, size) {
  const out = new Uint8Array(size * size * 4)
  const n = SS * SS
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * c.w + (x * SS + sx)) * 4
          r += c.data[i]
          g += c.data[i + 1]
          b += c.data[i + 2]
        }
      }
      const o = (y * size + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = 255
    }
  }
  return out
}

/** Encode an RGBA buffer as a PNG (color type 6, no per-scanline filter). */
function encodePng(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const body = Buffer.concat([Buffer.from(type, "ascii"), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0, 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function render(size, { maskable }) {
  const c = makeCanvas(size * SS, size * SS)

  // Walnut gradient background.
  for (let y = 0; y < c.h; y++) {
    const t = y / (c.h - 1)
    const color = BG_TOP.map((v, i) => Math.round(v + (BG_BOTTOM[i] - v) * t))
    fillRect(c, 0, y, c.w, 1, color)
  }

  // Fit the crest into the safe area (maskable keeps more margin).
  const pad = size * SS * (maskable ? 0.22 : 0.11)
  const boxW = size * SS - pad * 2
  const boxH = size * SS - pad * 2
  const scale = Math.min(boxW / (BBOX.maxX - BBOX.minX), boxH / (BBOX.maxY - BBOX.minY))
  const ox = (size * SS - (BBOX.maxX - BBOX.minX) * scale) / 2 - BBOX.minX * scale
  const oy = (size * SS - (BBOX.maxY - BBOX.minY) * scale) / 2 - BBOX.minY * scale
  const tx = (x) => ox + x * scale
  const ty = (y) => oy + y * scale

  // Shield, then crown and cross on top.
  fillPolygon(
    c,
    CREST.shield.map(([x, y]) => [tx(x), ty(y)]),
    RED,
  )
  for (const [x, y, w, h] of CREST.cross) {
    fillRect(c, tx(x), ty(y), w * scale, h * scale, GOLD)
  }
  const [bx, by, bw, bh] = CREST.band
  fillRect(c, tx(bx), ty(by), bw * scale, bh * scale, GOLD)
  for (const { triangle, circle } of CREST.points) {
    fillPolygon(
      c,
      triangle.map(([x, y]) => [tx(x), ty(y)]),
      GOLD,
    )
    fillCircle(c, tx(circle[0]), ty(circle[1]), circle[2] * scale, GOLD)
  }

  // Gold frame on the regular icons only (maskable art must not be cropped).
  if (!maskable) {
    const t = Math.max(2, size * SS * 0.012)
    const inset = size * SS * 0.06
    const w = size * SS - inset * 2
    fillRect(c, inset, inset, w, t, GOLD)
    fillRect(c, inset, inset + w - t, w, t, GOLD)
    fillRect(c, inset, inset, t, w, GOLD)
    fillRect(c, inset + w - t, inset, t, w, GOLD)
  }

  return encodePng(size, downsample(c, size))
}

/** Minimal PNG sanity check: signature and IHDR dimensions. */
function checkPng(buf, size) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!sig.every((b, i) => buf[i] === b)) throw new Error("bad PNG signature")
  if (buf.readUInt32BE(16) !== size || buf.readUInt32BE(20) !== size) {
    throw new Error(`bad IHDR for ${size}`)
  }
}

/** Pack PNG-encoded images into a multi-resolution .ico (Vista+ format). */
function encodeIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = header.length + dir.length
  entries.forEach(({ size, png }, i) => {
    const b = i * 16
    dir[b] = size >= 256 ? 0 : size // width, 0 means 256
    dir[b + 1] = size >= 256 ? 0 : size // height
    dir.writeUInt16LE(1, b + 4) // color planes
    dir.writeUInt16LE(32, b + 6) // bits per pixel
    dir.writeUInt32LE(png.length, b + 8)
    dir.writeUInt32LE(offset, b + 12)
    offset += png.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)])
}

/** Minimal .ico sanity check: directory count, sizes and embedded PNGs. */
function checkIco(buf, sizes) {
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    throw new Error("bad ICO header")
  }
  if (buf.readUInt16LE(4) !== sizes.length) throw new Error("bad ICO count")
  sizes.forEach((size, i) => {
    const b = 6 + i * 16
    if ((buf[b] || 256) !== size) throw new Error(`bad ICO entry ${i}`)
    const len = buf.readUInt32LE(b + 8)
    const off = buf.readUInt32LE(b + 12)
    checkPng(buf.subarray(off, off + len), size)
  })
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
]

mkdirSync(outDir, { recursive: true })
for (const { file, size, maskable } of targets) {
  const png = render(size, { maskable })
  checkPng(png, size)
  writeFileSync(join(outDir, file), png)
}
// Re-read one file to make sure the output is a valid, complete PNG.
checkPng(readFileSync(join(outDir, "icon-512.png")), 512)

// Favicon: one multi-resolution .ico holding 16/32/48px crests.
const faviconSizes = [16, 32, 48]
const ico = encodeIco(
  faviconSizes.map((size) => ({
    size,
    png: render(size, { maskable: false }),
  })),
)
checkIco(ico, faviconSizes)
writeFileSync(join(outDir, "favicon.ico"), ico)

console.log(`icons: ${[...targets.map((t) => t.file), "favicon.ico"].join(", ")}`)
