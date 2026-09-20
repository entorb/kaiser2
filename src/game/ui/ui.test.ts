import { afterEach, describe, expect, it } from "vitest"
import {
  ACTION_H,
  CANVAS_H,
  CANVAS_W,
  columns,
  fitCanvas,
  frame,
  HEADER_H,
  landscapeAspect,
  MARGIN,
  MAX_CANVAS_W,
} from "./layout"
import { FS } from "./theme"

describe("frame", () => {
  it("keeps header, content and action inside the canvas margins", () => {
    const { header, content, action } = frame()
    expect(header.x).toBe(MARGIN)
    expect(header.w).toBe(CANVAS_W - MARGIN * 2)
    expect(action.y + action.h).toBe(CANVAS_H - MARGIN)
    expect(content.y).toBeGreaterThan(header.y + header.h)
    expect(content.y + content.h).toBeLessThan(action.y)
  })
})

describe("columns", () => {
  it("splits a rect into equal columns with gaps", () => {
    const rect = { x: 0, y: 0, w: 300, h: 100 }
    const cols = columns(rect, 3, 30)
    expect(cols).toHaveLength(3)
    expect(cols[0]?.w).toBe(80)
    expect(cols[1]?.x).toBe(110)
    expect(cols[2]?.x).toBe(220)
    expect((cols[2]?.x ?? 0) + (cols[2]?.w ?? 0)).toBe(300)
  })
})

describe("fitCanvas", () => {
  afterEach(() => fitCanvas(1))

  it("widens to the landscape aspect, within the 960..1380 range", () => {
    const widthAt = (aspect: number) => {
      fitCanvas(aspect)
      return CANVAS_W
    }
    expect(widthAt(5 / 3)).toBe(960)
    expect(widthAt(4 / 3)).toBe(960)
    expect(widthAt(16 / 9)).toBe(1024)
    expect(widthAt(19.5 / 9)).toBe(1248)
    expect(widthAt(3)).toBe(MAX_CANVAS_W)
  })

  it("reports whether the width changed", () => {
    expect(fitCanvas(16 / 9)).toBe(true)
    expect(fitCanvas(16 / 9)).toBe(false)
  })

  it("reads the landscape aspect whichever way the device is held", () => {
    expect(landscapeAspect(844, 390)).toBeCloseTo(landscapeAspect(390, 844))
  })
})

describe("mobile sizing", () => {
  // A phone shows the 576 design units at ~0.68, so 18 stays >= 12 css px.
  it("keeps every font size at 18 design px or more", () => {
    for (const size of Object.values(FS)) expect(size).toBeGreaterThanOrEqual(18)
  })

  it("keeps the header and action bar tall enough to tap", () => {
    expect(HEADER_H).toBeGreaterThanOrEqual(64)
    expect(ACTION_H).toBeGreaterThanOrEqual(72)
  })
})
