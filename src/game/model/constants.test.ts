import { describe, expect, it } from "vitest"
import {
  addBuilding,
  BUILDINGS,
  buildingCost,
  createPlayer,
  freeColor,
  MAX_PORTRAIT,
  nextFreeColor,
  playerNameError,
  takenColors,
} from "./constants"
import type { PlayerState } from "./types"

function players(...portraits: number[]): PlayerState[] {
  const list = [{} as PlayerState]
  portraits.forEach((portrait) => {
    list.push({ portrait } as PlayerState)
  })
  return list
}

describe("player colors", () => {
  it("keeps a free preferred color", () => {
    expect(freeColor(players(1, 2), 3, 5)).toBe(5)
  })

  it("moves off a color already taken by an earlier player", () => {
    // Player 1 took color 0; player 2's default 0 must be reassigned.
    expect(freeColor(players(0), 2, 0)).toBe(1)
  })

  it("collects taken colors from earlier players only", () => {
    const taken = takenColors(players(0, 3, 1), 3)
    expect([...taken].sort()).toEqual([0, 3])
  })

  it("skips taken colors when stepping, wrapping around", () => {
    const taken = new Set([3, 4])
    expect(nextFreeColor(taken, 2, 1)).toBe(5)
    expect(nextFreeColor(taken, 0, -1)).toBe(MAX_PORTRAIT - 1)
  })
})

describe("playerNameError", () => {
  it("rejects empty or whitespace-only names", () => {
    expect(playerNameError("", [])).toBe("empty")
    expect(playerNameError("   ", [])).toBe("empty")
  })

  it("rejects duplicate names case-insensitively", () => {
    expect(playerNameError("Torben", ["Torben"])).toBe("taken")
    expect(playerNameError("torben", ["Torben"])).toBe("taken")
    expect(playerNameError(" TORBEN ", ["Torben"])).toBe("taken")
  })

  it("accepts a valid unique name", () => {
    expect(playerNameError("Alice", ["Torben", "Bob"])).toBeNull()
    expect(playerNameError("torben", ["Alice", "Bob"])).toBeNull()
  })
})

describe("prestige building prices", () => {
  it("raises each further palace/cathedral part in remake only", () => {
    const p = createPlayer("A", 1)
    expect(buildingCost(p, "burg", "remake")).toBe(BUILDINGS.burg.cost)
    p.burg = 2
    p.dom = 10
    expect(buildingCost(p, "burg", "remake")).toBe(5500)
    expect(buildingCost(p, "dom", "remake")).toBe(13500)
    expect(buildingCost(p, "burg", "atari")).toBe(BUILDINGS.burg.cost)
  })

  it("leaves markets and mills at their base price", () => {
    const p = createPlayer("A", 1)
    p.markt = 5
    expect(buildingCost(p, "markt", "remake")).toBe(BUILDINGS.markt.cost)
  })

  it("charges the raised price when buying", () => {
    const p = createPlayer("A", 1)
    p.burg = 2
    p.geld = 10000
    addBuilding(p, "burg", "remake")
    expect(p.geld).toBe(4500)
    expect(p.burg).toBe(3)
  })
})
