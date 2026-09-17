// Headless balance simulation of the computer rulers (src/game/model/ai.ts):
// they play whole games through the model, in the order of the scenes.
//
//   node scripts/sim.mjs [--n=200] [--turns=150] [--seed=1] [--snap=30]
//                        [--only=solo,duel] [--rules=remake,atari]
//                        [--set=hard.burden=50,easy.idle=0.4] [--trace=hard]
//                        [--tune=market.impact=0.5,farming.acreYield=2]
//
// solo: one computer ruler alone per game (pace of each difficulty).
// duel: Otto, Konrad and Barbarossa in the same game, seats shuffled.
// --set overrides profile fields to try parameters without editing ai.ts.
// The bots are naive next to a human; read the numbers as relative comparisons.
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, "").split("="))
    .map(([k, ...v]) => [k, v.length ? v.join("=") : "1"]),
)
const N = Number(args.n ?? 200)
const MAX_TURNS = Number(args.turns ?? 150)
const SEED = Number(args.seed ?? 1)
const SNAPSHOT = Number(args.snap ?? 30) // year (turn) at which states are compared
const ONLY = args.only ? args.only.split(",") : ["solo", "duel"]
const RULESETS = args.rules ? args.rules.split(",") : ["remake", "atari"]

const vite = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  configFile: false,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false, watch: null },
})
const load = (name) => vite.ssrLoadModule(`/src/game/model/${name}.ts`)
const [constants, turnMod, types, ai, trade, rules] = await Promise.all([
  load("constants"),
  load("turn"),
  load("types"),
  load("ai"),
  load("trade"),
  load("rules"),
])
const { createGameState } = constants
const { rand } = types
const LEVELS = ai.DIFFICULTIES

for (const item of (args.set ?? "").split(",").filter(Boolean)) {
  const [path, value] = item.split("=")
  const [level, field] = path.split(".")
  const profile = ai.AI_PROFILES[level]
  if (!profile || !(field in profile)) throw new Error(`--set: unknown ${path}`)
  profile[field] = typeof profile[field] === "boolean" ? value === "true" : Number(value)
}

// --tune overrides the Remake market and farming tunables (trade.ts, rules.ts).
const TUNABLES = { market: trade.MARKET, farming: rules.FARMING }
for (const item of (args.tune ?? "").split(",").filter(Boolean)) {
  const [path, value] = item.split("=")
  const [group, field] = path.split(".")
  if (!TUNABLES[group] || !(field in TUNABLES[group])) throw new Error(`--tune: unknown ${path}`)
  TUNABLES[group][field] = Number(value)
}

/** Seeded PRNG so runs are reproducible (mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function newState(count, ruleset, rng) {
  const state = createGameState(count, ruleset)
  state.players[0].hh = rand(20, rng) + 30
  return state
}

function seat(state, index, level, ruleset, rng) {
  const p = state.players[index]
  ai.setupComputer(p, level, ruleset)
  p.tod = rand(10, rng) + 35
  return p
}

const snapshot = (p) => ({
  leute: p.leute,
  geld: p.geld,
  titel: p.titel,
  punkte: p.punkte,
  hh: p.hh,
  muhl: p.muhl,
  markt: p.markt,
})

const count = (events, name) => events.filter((e) => e === name).length

function soloGame(level, ruleset, seed, trace) {
  const rng = mulberry32(seed)
  const state = newState(1, ruleset, rng)
  const p = seat(state, 1, level, ruleset, rng)
  turnMod.startRuler(state)
  const events = []
  let snap = null
  for (let t = 1; t <= MAX_TURNS; t++) {
    const report = ai.playComputerTurn(state, 1, rng)
    events.push(...report.events)
    if (trace)
      console.log(
        `t${t} pop=${p.leute} korn=${Math.trunc(p.lkorn)} geld=${Math.trunc(p.geld)} acker=${p.acker} land=${p.land} muhl=${p.muhl} markt=${p.markt} hh=${p.hh} dom=${p.dom} burg=${p.burg} pt=${p.punkte.toFixed(1)} titel=${p.titel} ${report.events.join(",")}`,
      )
    if (t === SNAPSHOT) snap = snapshot(p)
    if (report.won) return { won: true, years: t, snap, events }
    turnMod.advancePlayer(state)
  }
  return { won: false, years: MAX_TURNS, snap, events }
}

/** Three computers in one game; seats are shuffled per game. */
function duelGame(ruleset, seed) {
  const rng = mulberry32(seed)
  const state = newState(3, ruleset, rng)
  const order = [...LEVELS]
  for (let i = order.length - 1; i > 0; i--) {
    const j = rand(i + 1, rng)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  order.forEach((level, i) => {
    seat(state, i + 1, level, ruleset, rng)
  })
  turnMod.startRuler(state)
  const snaps = {}
  for (let guard = 0; guard < MAX_TURNS * 3; guard++) {
    const sp = state.sp
    const level = order[sp - 1]
    const report = ai.playComputerTurn(state, sp, rng)
    const year = state.jahr - 1700 + 1
    if (year === SNAPSHOT && !snaps[level]) snaps[level] = snapshot(state.players[sp])
    if (report.won) return { winner: level, seat: sp, years: year, snaps }
    if (year > MAX_TURNS) break
    turnMod.advancePlayer(state)
  }
  return { winner: null, years: MAX_TURNS, snaps }
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN)
const median = (xs) => {
  if (!xs.length) return Number.NaN
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const fmt = (x, d = 0) => (Number.isNaN(x) ? "-" : x.toFixed(d))
const col = (x, w) => String(x).padStart(w)
const label = (level) => `${ai.AI_PROFILES[level].name} (${level})`.padEnd(16)

function solo(ruleset) {
  console.log(
    `\n## solo, ${ruleset} rules  (n=${N}, turns<=${MAX_TURNS}, state at turn ${SNAPSHOT})`,
  )
  console.log(
    `${"computer".padEnd(16)} ${col("win%", 5)} ${col("yrsMed", 6)} ${col("pop", 6)} ${col("geld", 7)} ${col("titel", 5)} ${col("hh", 4)} ${col("mill", 5)} ${col("mkt", 4)} ${col("pawn", 5)} ${col("demot", 5)} ${col("seized", 6)}`,
  )
  for (const level of LEVELS) {
    const games = Array.from({ length: N }, (_, i) => soloGame(level, ruleset, SEED * 100003 + i))
    const won = games.filter((g) => g.won)
    const snaps = games.map((g) => g.snap).filter(Boolean)
    const per = (name) => mean(games.map((g) => count(g.events, name)))
    const avg = (key, d = 0) => fmt(mean(snaps.map((s) => s[key])), d)
    console.log(
      `${label(level)} ${col(fmt((100 * won.length) / N), 5)} ${col(fmt(median(won.map((g) => g.years))), 6)} ${col(avg("leute"), 6)} ${col(avg("geld"), 7)} ${col(avg("titel", 1), 5)} ${col(avg("hh", 1), 4)} ${col(avg("muhl", 1), 5)} ${col(avg("markt", 1), 4)} ${col(fmt(per("pawn"), 2), 5)} ${col(fmt(per("demoted"), 2), 5)} ${col(fmt(per("seized"), 2), 6)}`,
    )
  }
}

function duel(ruleset) {
  console.log(
    `\n## duel (all three in one game), ${ruleset} rules  (n=${N}, state at year ${SNAPSHOT})`,
  )
  console.log(
    `${"computer".padEnd(16)} ${col("wins%", 6)} ${col("yrsMed", 6)} ${col("pop", 6)} ${col("geld", 7)} ${col("titel", 5)} ${col("pts", 5)}`,
  )
  const games = Array.from({ length: N }, (_, i) => duelGame(ruleset, SEED * 100003 + i))
  for (const level of LEVELS) {
    const won = games.filter((g) => g.winner === level)
    const snaps = games.map((g) => g.snaps[level]).filter(Boolean)
    const avg = (key, d = 0) => fmt(mean(snaps.map((s) => s[key])), d)
    console.log(
      `${label(level)} ${col(fmt((100 * won.length) / N), 6)} ${col(fmt(median(won.map((g) => g.years))), 6)} ${col(avg("leute"), 6)} ${col(avg("geld"), 7)} ${col(avg("titel", 1), 5)} ${col(avg("punkte"), 5)}`,
    )
  }
  console.log(
    `${"nobody".padEnd(16)} ${col(fmt((100 * games.filter((g) => !g.winner).length) / N), 6)}`,
  )
  const seats = [1, 2, 3].map((seat) =>
    fmt((100 * games.filter((g) => g.seat === seat).length) / N),
  )
  console.log(`wins by seat (1st, 2nd, 3rd): ${seats.join(" / ")} %`)
}

if (args.trace) {
  soloGame(args.trace, RULESETS[0], SEED, true)
} else {
  for (const ruleset of RULESETS) {
    if (ONLY.includes("solo")) solo(ruleset)
    if (ONLY.includes("duel")) duel(ruleset)
  }
}
await vite.close()
