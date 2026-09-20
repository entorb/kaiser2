import { describe, expect, it } from "vitest"
import { collectText, type SceneNode, type SnapshotText } from "./snapshot"

describe("collectText", () => {
  it("flattens nested text with canvas offsets and marks focus", () => {
    const root: SceneNode = {
      x: 10,
      y: 20,
      list: [
        { x: 5, y: 5, text: "hello" },
        {
          x: 100,
          y: 0,
          focused: true,
          list: [{ x: 0, y: 40, text: "focused child" }],
        },
        { x: 0, y: 0, visible: false, text: "hidden" },
        { x: 0, y: 0, text: "" },
      ],
    }
    const out: SnapshotText[] = []
    collectText(root, 0, 0, false, out)
    expect(out).toEqual([
      { x: 15, y: 25, text: "hello" },
      { x: 110, y: 60, text: "focused child", focused: true },
    ])
  })
})
