import { describe, expect, it } from "vitest"
import { createGameState } from "./constants"
import { grainNeed, grainPlan, stockForGrainNeed } from "./grain"

describe("grain need", () => {
  it("uses VKORN as the population need", () => {
    const state = createGameState(1, "remake")
    state.turn.vkorn = 6000
    state.turn.klager = 7500
    expect(grainNeed(state)).toBe(6000)
  })

  it("targets the need while it is reachable", () => {
    const state = createGameState(1, "remake")
    state.turn.vkorn = 6000
    expect(grainPlan(state, 10000)).toEqual({
      min: 2000,
      max: 8000,
      need: 6000,
      donation: 6000,
      marker: 6000,
      sufficient: true,
    })
  })

  it("pins the donation and marker to the maximum while grain is short", () => {
    const state = createGameState(1, "remake")
    state.turn.vkorn = 6000
    expect(grainPlan(state, 7000)).toEqual({
      min: 1400,
      max: 5600,
      need: 6000,
      donation: 5600,
      marker: 5600,
      sufficient: false,
    })
  })

  it("turns sufficient exactly where 80% of the stock meets the need", () => {
    const state = createGameState(1, "remake")
    state.turn.vkorn = 6000
    expect(grainPlan(state, 7499).sufficient).toBe(false)
    expect(grainPlan(state, 7500)).toMatchObject({
      max: 6000,
      donation: 6000,
      marker: 6000,
      sufficient: true,
    })
    expect(grainPlan(state, 8000)).toMatchObject({
      max: 6400,
      donation: 6000,
      marker: 6000,
      sufficient: true,
    })
  })

  it("computes the stock at which the 80% maximum exactly meets the need", () => {
    expect(stockForGrainNeed(6000)).toBe(7500)
  })
})
