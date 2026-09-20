import { describe, expect, it } from "vitest"
import { createGameState } from "./constants"
import { taxDemotion } from "./events"
import { chronicle, stateIncome } from "./rules"
import { burden, fedFactor, taxBreakdown, unrest, unrestLevel } from "./tax"
import { playerAt } from "./types"

const seq = (...v: number[]) => {
  let i = 0
  return () => v[i++ % v.length] ?? 0
}

function remake() {
  const state = createGameState(1, "remake")
  const p = playerAt(state, 1)
  state.turn.kaus = state.turn.vkorn = 10000 // fed
  return { state, p }
}

describe("remake tax", () => {
  it("starts with 20/20 taxes and no customs", () => {
    const { p } = remake()
    expect([p.ein, p.mwst, p.zoll]).toEqual([20, 20, 0])
  })

  it("taxes people, buildings and fines (rules-remake.md example)", () => {
    const { state, p } = remake()
    p.leute = 1000
    p.muhl = 10
    p.markt = 10
    p.ein = p.mwst = 15
    expect(taxBreakdown(state, p)).toEqual({
      head: 1500,
      building: 825,
      fines: 500,
      total: 2825,
    })
    const geld = p.geld
    expect(stateIncome(state, 1)).toBe(2825)
    expect(p.geld).toBe(geld + 2825)
  })

  it("starving people pay at most half the head tax", () => {
    const { state, p } = remake()
    state.turn.kaus = 0
    expect(fedFactor(state)).toBe(0.5)
    state.turn.kaus = 5000 // half fed
    expect(fedFactor(state)).toBe(0.5)
    state.turn.kaus = 8000
    expect(fedFactor(state)).toBe(0.8)
    p.leute = 1000
    p.ein = 15
    expect(taxBreakdown(state, p).head).toBe(1200)
  })

  it("unrest is zero in the comfort zone and quadratic above it", () => {
    const { p } = remake()
    p.justiz = 2
    p.mwst = 0
    for (const [ein, u] of [
      [30, 0],
      [40, 0.04],
      [50, 0.16],
      [80, 1],
    ] as const) {
      p.ein = ein
      expect(unrest(p)).toBeCloseTo(u)
    }
    p.ein = 60
    p.justiz = 1 // fair: 5 points of headroom
    expect(burden(p)).toBe(55)
    p.justiz = 4
    expect(burden(p)).toBe(80)
    expect(unrestLevel(0)).toBe(0)
    expect(unrestLevel(0.16)).toBe(1)
    expect(unrestLevel(0.24)).toBe(1)
    expect(unrestLevel(0.31)).toBe(2) // burden 58: already halves the wins
    expect(unrestLevel(0.5)).toBe(2)
    expect(unrestLevel(1.44)).toBe(3)
  })

  it("high unrest cuts births, stops immigration and drives emigration", () => {
    const calm = remake()
    calm.p.leute = 2000
    calm.p.ein = calm.p.mwst = 15 // burden 30: comfort zone
    const rest = chronicle(calm.state, 1, seq(0))
    expect(rest.ausw).toBe(0)

    const angry = remake()
    angry.p.leute = 2000
    angry.p.ein = 60
    angry.p.mwst = 20 // burden 80 -> unrest 1
    angry.state.turn.kaus = 40000 // huge surplus would attract immigrants
    const r = chronicle(angry.state, 1, seq(0))
    expect(r.geb).toBe(0)
    expect(r.einw).toBe(0)
    expect(r.ausw).toBe(55) // 1847 left after 153 deaths, * 1 * 3 %
  })

  it("demotes above burden 70 in Remake, sum above 80 in Atari", () => {
    const { p } = remake()
    p.ein = 50
    p.mwst = 20
    expect(taxDemotion(p, "remake")).toBe(false) // burden 70
    p.justiz = 3
    expect(taxDemotion(p, "remake")).toBe(true) // burden 78
    const old = createGameState(1)
    const q = playerAt(old, 1)
    q.mwst = 40
    q.ein = 40
    q.zoll = 1
    expect(taxDemotion(q)).toBe(true)
  })
})

describe("chronicle population floor", () => {
  it("never lets the population fall below zero", () => {
    for (const rules of ["atari", "remake"] as const) {
      const state = createGameState(1, rules)
      const p = playerAt(state, 1)
      p.leute = 3
      state.wetter = 1 // deaths floor RAND(5)*(10-WETTER) is up to 36
      state.turn.kaus = state.turn.vkorn = 100
      const r = chronicle(state, 1, seq(0.99))
      expect(p.leute).toBe(0)
      expect(r.ausw).toBe(0)
    }
  })
})
