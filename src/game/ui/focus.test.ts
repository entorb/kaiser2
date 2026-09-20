import { describe, expect, it, vi } from "vitest"
import { FocusGroup } from "./focus"

vi.mock("../audio/music", () => ({ blip: () => {} }))

function scene() {
  return {
    input: { keyboard: { on: () => {}, off: () => {} } },
    events: { once: () => {} },
  } as never
}

function item() {
  const state = { focused: false }
  return {
    state,
    setFocused: (f: boolean) => {
      state.focused = f
    },
    handleKey: () => false,
  }
}

describe("FocusGroup", () => {
  it("focuses the first item that asks for focus, not the first item", () => {
    const group = new FocusGroup(scene())
    const menu = item()
    const list = item()
    const next = item()
    group.add(menu, false)
    group.add(list)
    group.add(next)
    expect(list.state.focused).toBe(true)
    // Moving focus must release the list, not the unfocused first item.
    group.focus(next)
    expect(list.state.focused).toBe(false)
    expect(next.state.focused).toBe(true)
  })
})
