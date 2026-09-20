import { describe, expect, it } from "vitest"
import { AI_PROFILES, DIFFICULTIES, openTrade, playComputerTurn, setupComputer } from "./ai"
import { createGameState } from "./constants"
import { advancePlayer, startRuler } from "./turn"
import { type Difficulty, playerAt, type Ruleset, rand } from "./types"

/** Seeded PRNG (mulberry32) so the games are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A single computer ruler alone for `turns` years; returns the ruler at the end. */
function play(level: Difficulty, rules: Ruleset, seed: number, turns: number) {
  const rng = mulberry32(seed)
  const state = createGameState(1, rules)
  const p = playerAt(state, 1)
  setupComputer(p, level, rules)
  p.tod = rand(10, rng) + 35
  startRuler(state)
  for (let t = 0; t < turns; t++) {
    if (playComputerTurn(state, 1, rng).won) break
    advancePlayer(state)
  }
  return p
}

describe("computer profiles", () => {
  it("have distinct fixed names that fit the name and kingdom fields", () => {
    const names = DIFFICULTIES.map((d) => AI_PROFILES[d].name)
    expect(new Set(names).size).toBe(3)
    for (const d of DIFFICULTIES) {
      expect(AI_PROFILES[d].name.length).toBeLessThanOrEqual(10)
      expect(AI_PROFILES[d].kingdom.length).toBeLessThanOrEqual(12)
    }
  })

  it("set the opening taxes per ruleset", () => {
    const p = playerAt(createGameState(1), 1)
    setupComputer(p, "hard", "remake")
    expect([p.ai, p.name, p.ein + p.mwst, p.zoll]).toEqual(["hard", "Barbarossa", 46, 0])
    setupComputer(p, "hard", "atari")
    expect(p.zoll + p.mwst + p.ein).toBe(67)
  })
})

describe("computer turns", () => {
  it("are deterministic and keep the realm in a sane state", () => {
    for (const level of DIFFICULTIES) {
      const a = play(level, "remake", 7, 40)
      const b = play(level, "remake", 7, 40)
      expect(a).toEqual(b)
      for (const v of [a.leute, a.geld, a.lkorn, a.land, a.acker])
        expect(Number.isFinite(v)).toBe(true)
      expect(a.leute).toBeGreaterThanOrEqual(0)
      expect(a.lkorn).toBeGreaterThanOrEqual(0)
    }
  })

  it("get the harder ruler further up the ranks than the easy one", () => {
    // Atari hard trades population for speed (rates past the emigration
    // cliff), so compare rank, which both rulesets agree on.
    const rank = (level: Difficulty, rules: Ruleset) => {
      let sum = 0
      for (let seed = 1; seed <= 12; seed++) sum += play(level, rules, seed, 30).titel
      return sum / 12
    }
    for (const rules of ["remake", "atari"] as const)
      expect(rank("hard", rules)).toBeGreaterThan(rank("easy", rules) + 1)
  })

  it("offer land and the grain above a normal granary after the turn", () => {
    const state = createGameState(2, "remake")
    setupComputer(playerAt(state, 2), "medium", "remake")
    state.sp = 2
    startRuler(state)
    playComputerTurn(state, 2, mulberry32(1))
    const p = playerAt(state, 2)
    expect(p.verkorn).toBeLessThan(p.lkorn)
    expect(p.kpreis).toBeGreaterThanOrEqual(75)
    expect(p.kpreis).toBeLessThanOrEqual(125)
    expect(p.verBau).toBe(Math.trunc(p.land / 10))
  })
})

describe("computer habits", () => {
  it("wander from turn to turn but stay the same ruler", () => {
    const rates = new Set<number>()
    for (let seed = 1; seed <= 20; seed++) {
      const state = createGameState(1, "remake")
      const p = playerAt(state, 1)
      setupComputer(p, "hard", "remake")
      startRuler(state)
      playComputerTurn(state, 1, mulberry32(seed))
      rates.add(p.ein + p.mwst)
    }
    expect(rates.size).toBeGreaterThan(2)
    expect(Math.min(...rates)).toBeGreaterThanOrEqual(44)
    expect(Math.max(...rates)).toBeLessThanOrEqual(48)
  })

  it("farm with idle cash in the Remake, never in Atari", () => {
    const acre = (rules: Ruleset) => {
      const state = createGameState(1, rules)
      const p = playerAt(state, 1)
      setupComputer(p, "hard", rules)
      // 20000 ha for 1500 people: the 11 ha per head rule buys nothing.
      Object.assign(p, { leute: 1500, geld: 500000, acker: 15000 })
      startRuler(state)
      for (let seed = 1; seed <= 3; seed++) playComputerTurn(state, 1, mulberry32(seed))
      return p.acker
    }
    expect(acre("remake")).toBeGreaterThan(15000)
    expect(acre("atari")).toBe(15000)
  })
})

describe("openTrade", () => {
  const setup = (rules: Ruleset, lkorn: number) => {
    const state = createGameState(2, rules)
    const p = playerAt(state, 2)
    setupComputer(p, "hard", rules)
    p.leute = 1000
    p.lkorn = lkorn
    state.turn.vkorn = 22000
    return { state, p }
  }

  it("keeps a quarter of the feeding and prices grain by the granary", () => {
    // hard: give = 22000 + 3.5 * 1000 = 25500, so the normal stock is 6375.
    const empty = setup("remake", 0)
    openTrade(empty.state, empty.p, AI_PROFILES.hard)
    expect([empty.p.verkorn, empty.p.kpreis]).toEqual([0, 125])

    const normal = setup("remake", 6375)
    openTrade(normal.state, normal.p, AI_PROFILES.hard)
    expect([normal.p.verkorn, normal.p.kpreis]).toEqual([0, 100])

    const full = setup("remake", 20000)
    openTrade(full.state, full.p, AI_PROFILES.hard)
    expect([full.p.verkorn, full.p.kpreis]).toEqual([13625, 75])
  })

  it("offers all grain at the old price under Atari rules", () => {
    const { state, p } = setup("atari", 6375)
    openTrade(state, p, AI_PROFILES.hard)
    expect([p.verkorn, p.kpreis]).toEqual([6375, 100])
  })
})
