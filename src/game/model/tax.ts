// Remake tax model (rules-remake.md §1): a head tax on the population, a
// building tax on mills and markets, justice fines, and a scaling unrest that
// hurts births, immigration and emigration. Pure functions, no Phaser.

import { at } from "../lookup"
import type { GameState, PlayerState } from "./types"

const int = Math.floor

/** Taler a citizen earns per year; the head tax takes `ein` % of it. */
export const WAGE = 10
/** Assessed yearly yield of one mill / market; the building tax takes `mwst` %. */
export const MILL_VALUE = 400
export const MARKT_VALUE = 150
/** Fines per citizen and year, indexed by `justiz` 1..4. */
const FINE = [0, 0, 0.5, 1, 3]
/** Justice as burden points, indexed by `justiz` 1..4 (fair people pay easier). */
const JUSTICE_POINTS = [0, -5, 0, 8, 20]
/** Effective burden up to which the people do not mind. */
const COMFORT = 30
/** Burden points above the comfort zone that make unrest reach 1. */
const UNREST_SCALE = 50
/** Unrest above which the ruler loses a rank (burden above 70; population collapses well before). */
export const UNREST_LIMIT = ((70 - COMFORT) / UNREST_SCALE) ** 2

/** Rates a new Remake game starts with; customs are not used. */
export const REMAKE_START_TAXES = { ein: 20, mwst: 20, zoll: 0 }

/** Effective burden in points: both tax rates plus the justice level. */
export function burden(p: PlayerState): number {
  return p.ein + p.mwst + at(JUSTICE_POINTS, p.justiz)
}

/** Unrest 0..2: zero in the comfort zone, quadratic above it. */
export function unrest(p: PlayerState): number {
  const excess = burden(p) - COMFORT
  return excess <= 0 ? 0 : Math.min(2, (excess / UNREST_SCALE) ** 2)
}

/**
 * Mood word index for the Taxes screen: 0 calm .. 3 revolt. "Leave" starts at
 * burden 55 (u 0.25): the simulation still wins at 54 and loses half the games
 * at 58.
 */
export function unrestLevel(u: number): 0 | 1 | 2 | 3 {
  if (u < 0.1) return 0
  if (u < 0.25) return 1
  return u <= UNREST_LIMIT ? 2 : 3
}

/** Well-fed people pay full head tax, starving people half (0.5..1). */
export function fedFactor(state: GameState): number {
  const { kaus, vkorn } = state.turn
  return vkorn > 0 ? Math.min(1, Math.max(0.5, kaus / vkorn)) : 1
}

export interface TaxBreakdown {
  head: number
  building: number
  fines: number
  total: number
}

/** Yearly tax income at the ruler's current rates. */
export function taxBreakdown(state: GameState, p: PlayerState): TaxBreakdown {
  const head = int((p.leute * WAGE * fedFactor(state) * p.ein) / 100)
  const building = int(((p.muhl * MILL_VALUE + p.markt * MARKT_VALUE) * p.mwst) / 100)
  const fines = int(p.leute * at(FINE, p.justiz))
  return { head, building, fines, total: head + building + fines }
}
