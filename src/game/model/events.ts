// End-of-turn events from KAISER4: pawn, deposition and death. Pure functions
// with an injectable RNG so they can be tested.

import { tributeVerdict } from "./houses";
import { UNREST_LIMIT, unrest } from "./tax";
import {
  defaultRng,
  type GameState,
  type PlayerState,
  playerAt,
  type Rng,
  type Ruleset,
  rand,
} from "./types";

/** KAISER4 PFAND: creditors seize mills, markets and land. */
export function pawn(p: PlayerState, rng: Rng = defaultRng): void {
  p.geld = p.muhl * 200 + p.markt * 100 + p.burg * 500 + p.dom * 900;
  p.muhl = 0;
  p.markt = 0;
  p.artell = 0;
  p.acker = (p.acker / 100) * (rand(50, rng) + 50);
  p.land = (p.land / 100) * (rand(50, rng) + 50);
  p.kavall = 0;
  p.infant = 0;
  p.dom = 0;
  p.burg = 0;
  p.tod = p.tod - 1;
  p.leute = 200 + rand(300, rng);
  p.punkte = Math.trunc(p.punkte / 2);
}

/** KAISER4 ENTHOBEN / ENT2: suspended for a year, loses points. */
export function depose(p: PlayerState): void {
  // Never shorten an ongoing suspension: a ruler demoted for a >80% tax burden
  // (ENTHOB2 = 2 years, set at turn start) must not drop to 1 year when a land
  // or tax deposition also fires at the end of the same turn.
  p.entHob = Math.max(p.entHob, 1);
  p.punkte -= p.titel * 10;
}

/**
 * KAISERB:2710-2900 ENTHOB2: a tax burden above 80% costs the ruler a rank and
 * two years in office (Remake: unrest above 1, i.e. burden above 80). Runs at the start of the turn (KAISERB:53). Returns true
 * when it fired.
 */
export function taxDemotion(p: PlayerState, rules: Ruleset = "atari"): boolean {
  const overtaxed =
    rules === "remake"
      ? unrest(p) > UNREST_LIMIT
      : p.mwst + p.ein + p.zoll > 80;
  if (!overtaxed) return false;
  p.entHob = 2;
  p.punkte = Math.max(0, p.punkte - p.titel * 5);
  p.titel = Math.max(0, p.titel - 1);
  return true;
}

/**
 * KAISERB:2530-2680 PROC ENT: after the trading-house screen the Emperor
 * confiscates a house from a ruler who hoarded grain or underpaid tribute.
 * Only Landgraf+ rulers reach it (KAISERB:620). Returns true when a house
 * changed hands. Remake: no roll; a tribute the Emperor takes as an insult
 * (rules-remake.md §3.2) costs a house for certain.
 */
export function expropriate(
  state: GameState,
  sp: number,
  rng: Rng = defaultRng,
): boolean {
  if (state.rules === "remake")
    return (
      tributeVerdict(state.turn.abg, state.turn.zahl).seize &&
      takeHouse(state, sp)
    );
  // 5/6 of the time the Emperor takes no notice (RAND(6)<5).
  if (rand(6, rng) < 5) return false;
  const p = playerAt(state, sp);
  if (p.hh <= 0) return false;
  const hoarded = p.verkorn + rand(5000, rng) < p.lkorn;
  const underpaid = state.turn.abg + rand(5000, rng) < state.turn.zahl;
  if (!hoarded && !underpaid) return false;
  return takeHouse(state, sp);
}

/** The Emperor takes one of the ruler's houses back into his pool. */
function takeHouse(state: GameState, sp: number): boolean {
  const p = playerAt(state, sp);
  if (p.hh <= 0) return false;
  p.hh -= 1;
  playerAt(state, 0).hh += 1;
  return true;
}

/** Heir generations: `Torben` -> `Torben II.` -> `Torben III.` (caps at X.). */
const HEIR_SUFFIXES = [
  "II.",
  "III.",
  "IV.",
  "V.",
  "VI.",
  "VII.",
  "VIII.",
  "IX.",
  "X.",
];

/** Next heir name: appends or bumps the trailing roman-numeral generation. */
export function heirName(name: string): string {
  const trimmed = name.trim();
  const cut = trimmed.lastIndexOf(" ");
  const idx = cut >= 0 ? HEIR_SUFFIXES.indexOf(trimmed.slice(cut + 1)) : -1;
  const base = idx >= 0 ? trimmed.slice(0, cut).trimEnd() : trimmed;
  const next = idx >= 0 ? idx + 1 : 0;
  return `${base} ${HEIR_SUFFIXES[Math.min(next, HEIR_SUFFIXES.length - 1)]}`;
}

/** KAISER4 TOD: the ruler dies; the heir inherits the rank (source behaviour). */
export function die(p: PlayerState, rng: Rng = defaultRng): void {
  p.tod = rand(10, rng) + 35;
  p.titel = Math.max(0, p.titel - 1);
  p.punkte =
    Math.trunc(p.titel * 9 + ((p.titel + 1) / 2) * 4.5) + rand(30, rng);
  p.name = heirName(p.name);
}

/** KAISER4:3121-3122 - yearly interest on wealth (+2%) or debt (-8%). */
export function interest(geld: number): number {
  if (geld > 0) return (geld * 2) / 100;
  if (geld < 0) return (geld * 8) / 100;
  return 0;
}

/** Apply the yearly interest to the player's balance. */
export function applyInterest(p: PlayerState): void {
  p.geld += interest(p.geld);
}
