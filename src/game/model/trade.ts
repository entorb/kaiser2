// Trading with a partner (the Emperor or another ruler): the Emperor's yearly
// stock and prices (KAISER3 #HANDEL) and the grain and land transfers of
// KAISER3 #KORN / #LAND. Shared by the scenes and the computer players.

import { BUILDINGS } from "./constants"
import {
  defaultRng,
  type GameState,
  type PlayerState,
  playerAt,
  type Rng,
  rand,
  type TradeNote,
} from "./types"

/** `KPREIS` is the price of 500 units of grain. */
export const GRAIN_PRICE_UNIT = 500
/** Land prices are per 1000 ha (the original per-10-ha figures times 100). */
export const LAND_PRICE_UNIT = 1000

export type TradeGood = TradeNote["good"]

/**
 * Remake tunables (`scripts/sim.mjs --tune=market.impact=0.5`).
 * `emperorGrain`: the Emperor's grain stock per point of weather (Atari: 8000).
 * `impact`: how much the unit price moves over one deal per `IMPACT_SCALE`
 * units: up for a buyer, down for a seller. The deal pays the average, so a
 * deal of that size costs `impact / 2` more (or pays that much less) than the
 * quoted price.
 */
export const MARKET = { emperorGrain: 5000, impact: 0.5 }
const IMPACT_SCALE = { grain: 20000, acker: 5000, land: 5000 } as const

const OFFERS = { grain: "verkorn", acker: "verAcker", land: "verBau" } as const

const GOODS = {
  grain: { price: "kpreis", holding: "lkorn", unit: GRAIN_PRICE_UNIT },
  acker: { price: "apreis", holding: "acker", unit: LAND_PRICE_UNIT },
  land: { price: "lpreis", holding: "land", unit: LAND_PRICE_UNIT },
} as const

/**
 * The one price `han` quotes for `good`, for buying from him and selling to
 * him alike. `buyCost` and `sellProceeds` move it with the size of the deal.
 */
export function tradePrice(state: GameState, han: number, good: TradeGood): number {
  return playerAt(state, han)[GOODS[good].price]
}

/** The price as shown: per 500 units for grain and for land (stored per 1000 ha). */
export function shownPrice(good: TradeGood, price: number): number {
  return Math.round((price * GRAIN_PRICE_UNIT) / GOODS[good].unit)
}

/**
 * The average price of a deal as shown (per 500 units): what a buyer pays per
 * unit for `units > 0`, what a seller gets for `units < 0`, the quote for 0.
 */
export function dealPrice(state: GameState, han: number, good: TradeGood, units: number): number {
  const n = Math.abs(units)
  if (n === 0) return shownPrice(good, tradePrice(state, han, good))
  const money = units > 0 ? buyCost(state, han, good, n) : sellProceeds(state, han, good, n)
  return Math.round((money / n) * GRAIN_PRICE_UNIT)
}

/**
 * Remake: hectares of `kind` a ruler can part with. Markets and mills keep
 * their building land (`landShortage` razes them otherwise) and land plus acre
 * land stay at 10 ha per head (else he is deposed).
 */
export function spareLand(p: PlayerState, kind: "land" | "acker"): number {
  const room = p.land + p.acker - 10 * p.leute
  const kept =
    kind === "land" ? Math.max(BUILDINGS.markt.land * p.markt, BUILDINGS.muhl.land * p.muhl) : 0
  return Math.max(0, Math.min(p[kind] - kept, room))
}

/**
 * Most units ruler `sp` can sell to `han`. Own holdings cap it (in the Remake
 * land too by `spareLand`); a ruler partner also takes no more than he can pay
 * from his treasury (a rival could otherwise dump goods on him and push him
 * into pawn). The Emperor has no limit.
 */
export function maxSale(state: GameState, sp: number, han: number, good: TradeGood): number {
  const p = playerAt(state, sp)
  const holding = p[GOODS[good].holding]
  const own =
    state.rules === "remake" && good !== "grain" ? Math.min(holding, spareLand(p, good)) : holding
  if (han === 0 || state.rules !== "remake") return own
  const cash = Math.max(0, playerAt(state, han).geld)
  const price = tradePrice(state, han, good)
  return Math.min(own, Math.floor((cash * GOODS[good].unit) / price))
}

/**
 * Most units ruler `sp` can buy from `han`: his offer and, for a ruler in the
 * Remake, the land he can spare. The Emperor's offer is his stock.
 */
export function maxBuy(state: GameState, han: number, good: TradeGood): number {
  const seller = playerAt(state, han)
  const offer = seller[OFFERS[good]]
  return state.rules === "remake" && han > 0 && good !== "grain"
    ? Math.min(offer, spareLand(seller, good))
    : offer
}

/**
 * Relative price change over one deal. Atari: none. Remake: the unit price
 * moves linearly with the size of the deal, so the deal pays the quoted price
 * times `1 + impact * units / (2 * scale)` (a buyer) or divided by it (a
 * seller). One deal per good and turn keeps it from being split.
 */
function dealRise(state: GameState, good: TradeGood, units: number): number {
  return state.rules === "remake" ? (MARKET.impact * units) / (2 * IMPACT_SCALE[good]) : 0
}

const flatValue = (state: GameState, han: number, good: TradeGood, n: number) =>
  (n * tradePrice(state, han, good)) / GOODS[good].unit

/** Money for buying `units` from `han` in one deal. */
export function buyCost(state: GameState, han: number, good: TradeGood, units: number): number {
  return flatValue(state, han, good, units) * (1 + dealRise(state, good, units))
}

/** Money for selling `units` to `han` in one deal. */
export function sellProceeds(
  state: GameState,
  han: number,
  good: TradeGood,
  units: number,
): number {
  return flatValue(state, han, good, units) / (1 + dealRise(state, good, units))
}

/** Most units `cash` buys from `han` in one deal (whole units). */
export function maxAfford(state: GameState, han: number, good: TradeGood, cash: number): number {
  if (cash <= 0) return 0
  const a = tradePrice(state, han, good) / GOODS[good].unit
  const b = state.rules === "remake" ? (a * MARKET.impact) / (2 * IMPACT_SCALE[good]) : 0
  const q = b > 0 ? (Math.sqrt(a * a + 4 * b * cash) - a) / (2 * b) : cash / a
  let units = Math.floor(q)
  while (units > 0 && buyCost(state, han, good, units) > cash) units--
  return units
}

/**
 * Pay for a deal (`selling`: the ruler sells to `han`). In the Remake a human
 * partner who was not there gets a note for his next turn.
 */
function settle(
  state: GameState,
  sp: number,
  han: number,
  good: TradeGood,
  selling: boolean,
  units: number,
  money: number,
): void {
  const p = playerAt(state, sp)
  const partner = playerAt(state, han)
  p.geld += selling ? money : -money
  partner.geld += selling ? -money : money
  if (state.rules === "remake" && han > 0 && !partner.ai)
    notify(partner, { who: p.name, good, sold: !selling, units, money })
}

function notify(p: PlayerState, note: TradeNote): void {
  p.notices ??= []
  p.notices.push(note)
}

/** The Emperor's stock for this round; his offer is shown on the table. */
export function refreshEmperorStock(state: GameState, rng: Rng = defaultRng): void {
  const kaiser = playerAt(state, 0)
  const perWeather = state.rules === "remake" ? MARKET.emperorGrain : 8000
  kaiser.verkorn = perWeather * state.wetter + rand(1000, rng)
  kaiser.lkorn = kaiser.verkorn
  kaiser.acker = 2000 * rand(10, rng)
  kaiser.verAcker = kaiser.acker
  kaiser.land = 2000 * rand(10, rng)
  kaiser.verBau = kaiser.land
}

/** Remake: the Emperor stock (per good) that leaves his prices unchanged. */
function normalStock(good: TradeGood): number {
  return good === "grain" ? MARKET.emperorGrain * 5.5 + 500 : 9000
}

/**
 * Remake: factor on the Emperor's price for his stock this turn: +40 % per
 * whole normal stock missing, from -15 % in a glut to +35 % when he is short.
 */
function scarcity(state: GameState, good: TradeGood, stock: number): number {
  if (state.rules !== "remake") return 1
  const normal = normalStock(good)
  return Math.min(1.35, Math.max(0.85, 1 + (0.4 * (normal - stock)) / normal))
}

/**
 * KAISER3:20970-21041 - the Emperor's prices track the players' average. Call
 * after `refreshEmperorStock`: in the Remake a short stock raises his prices.
 * `trader` is the ruler whose turn it is; in the Remake his own prices do not
 * count, or he would post the highest price and sell to the Emperor at 90 % of
 * the inflated average.
 */
export function updateEmperorPrices(state: GameState, trader: number, rng: Rng = defaultRng): void {
  const kaiser = playerAt(state, 0)
  const skip = state.rules === "remake" && state.count > 1 ? trader : 0
  const average = (price: "kpreis" | "apreis" | "lpreis"): number => {
    let sum = 0
    let n = 0
    for (let u = 1; u <= state.count; u++) {
      if (u === skip) continue
      sum += playerAt(state, u)[price]
      n++
    }
    return Math.trunc(sum / n)
  }
  const quote = (
    price: "kpreis" | "apreis" | "lpreis",
    good: TradeGood,
    stock: number,
    noise: number,
  ): number => {
    const base = Math.trunc(average(price) * scarcity(state, good, stock))
    const spread = Math.trunc(base / noise)
    return base + rand(spread, rng) - rand(spread, rng)
  }
  kaiser.kpreis = quote("kpreis", "grain", kaiser.verkorn, 5)
  if (kaiser.kpreis < 80) kaiser.kpreis = 80 + rand(10, rng)
  kaiser.apreis = quote("apreis", "acker", kaiser.verAcker, 10)
  if (kaiser.apreis < 1600) kaiser.apreis = 1600 + rand(1000, rng)
  kaiser.lpreis = quote("lpreis", "land", kaiser.verBau, 10)
  if (kaiser.lpreis < 1600) kaiser.lpreis = 1600 + rand(1000, rng)
}

/**
 * Buy (`amount > 0`) or sell (`< 0`) grain with partner `han` at the partner's
 * price (`tradePrice`). Buying is capped by the partner's offer, selling by
 * `maxSale`. Returns the amount that changed hands (always >= 0).
 *
 * The source jumped away before crediting the partner on a sale
 * (KAISER3:10585-10587 was dead code); the intended transfer is applied.
 */
export function tradeGrain(state: GameState, sp: number, han: number, amount: number): number {
  const p = playerAt(state, sp)
  const seller = playerAt(state, han)
  if (amount > 0) {
    const a = Math.min(amount, seller.verkorn)
    if (a <= 0) return 0
    p.lkorn += a
    // Remake: no free point (two rulers could pass 50000 back and forth).
    if (a > 50000 && state.rules === "atari") p.punkte += 1
    seller.lkorn -= a
    seller.verkorn -= a
    settle(state, sp, han, "grain", false, a, Math.trunc(buyCost(state, han, "grain", a)))
    return a
  }
  const a = Math.min(-amount, maxSale(state, sp, han, "grain"))
  if (a <= 0) return 0
  p.lkorn -= a
  seller.verkorn += a
  seller.lkorn += a
  const total = Math.trunc(sellProceeds(state, han, "grain", a))
  settle(state, sp, han, "grain", true, a, total)
  return a
}

/**
 * Buy (`amount > 0`) or sell (`< 0`) building land (`land`) or acre land
 * (`acker`) with partner `han`. Buying is capped by the partner's offer,
 * selling by `maxSale`. Returns the hectares that changed hands.
 */
export function tradeLand(
  state: GameState,
  sp: number,
  han: number,
  kind: "land" | "acker",
  amount: number,
): number {
  const p = playerAt(state, sp)
  const s = playerAt(state, han)
  const avail = OFFERS[kind]
  if (amount > 0) {
    const e = Math.min(amount, maxBuy(state, han, kind))
    if (e <= 0) return 0
    p[kind] += e
    s[kind] -= e
    s[avail] -= e
    const total = Math.trunc(buyCost(state, han, kind, e))
    settle(state, sp, han, kind, false, e, total)
    return e
  }
  const e = Math.min(-amount, maxSale(state, sp, han, kind))
  if (e <= 0) return 0
  p[kind] -= e
  s[kind] += e
  s[avail] += e
  const total = Math.trunc(sellProceeds(state, han, kind, e))
  settle(state, sp, han, kind, true, e, total)
  return e
}

/**
 * A computer buys up to `want` units for at most `cash` in one deal with one
 * partner: the Emperor or, in the Remake, a ruler with an offer. He prefers a
 * partner who can fill the whole want, at the lowest average price; if none
 * can, the one who fills most (a tie goes to the lower seat). Under Atari
 * rules the Emperor is the only partner. A partner whose quoted price is above
 * `maxPrice` is skipped. Returns the units bought.
 */

/** True when computer `c` is a better deal than the current `best`. */
function beatsBest(
  c: { han: number; units: number; unit: number },
  best: { han: number; units: number; unit: number },
  want: number,
): boolean {
  const fills = c.units >= want
  const bestFills = best.units >= want
  if (fills !== bestFills) return fills
  return fills ? c.unit < best.unit : c.units > best.units
}

export function buyCheapest(
  state: GameState,
  sp: number,
  good: TradeGood,
  want: number,
  cash: number,
  maxPrice = Number.POSITIVE_INFINITY,
): number {
  let best = { han: -1, units: 0, unit: Infinity }
  for (let han = 0; han <= state.count; han++) {
    if (han === sp || (han > 0 && state.rules !== "remake")) continue
    if (tradePrice(state, han, good) > maxPrice) continue
    const units = Math.min(want, maxBuy(state, han, good), maxAfford(state, han, good, cash))
    if (units <= 0) continue
    const c = { han, units, unit: buyCost(state, han, good, units) / units }
    if (beatsBest(c, best, want)) best = c
  }
  if (best.han < 0) return 0
  return good === "grain"
    ? tradeGrain(state, sp, best.han, best.units)
    : tradeLand(state, sp, best.han, good, best.units)
}
