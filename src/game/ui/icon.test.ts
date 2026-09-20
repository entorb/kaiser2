import type { GameObjects } from "phaser"
import { describe, expect, it, vi } from "vitest"
import { ICON_SECTIONS } from "../debug/icon-gallery"

// Phaser touches `window` on import; the icons only need Vector2 and Scene.
vi.mock("phaser", () => ({
  AUTO: 0,
  Game: class {},
  Scene: class {},
  Scale: { NONE: 0 },
  Math: {
    Vector2: class {
      constructor(
        readonly x: number,
        readonly y: number,
      ) {}
    },
  },
}))

/** Graphics stand-in that records every method call by name. */
function recorder(): { g: GameObjects.Graphics; calls: string[] } {
  const calls: string[] = []
  const g = new Proxy(
    {},
    {
      get: (_t, name: string) => () => {
        calls.push(name)
      },
    },
  ) as GameObjects.Graphics
  return { g, calls }
}

describe("icon gallery", () => {
  const specs = ICON_SECTIONS.flatMap((s) => s.icons)

  it("has unique names", () => {
    const names = specs.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  for (const spec of specs) {
    it(`${spec.name} draws at 12 and 96 px`, () => {
      for (const size of [12, 96]) {
        const { g, calls } = recorder()
        spec.draw(g, 0, 0, size)
        // Any draw call counts (fills, strokes, lines), not just style setters.
        expect(calls.some((c) => !c.endsWith("Style"))).toBe(true)
      }
    })
  }
})
