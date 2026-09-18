// Remake trading houses (rules-remake.md §3): a house needs a full crew and
// earns a predictable, weather-linked profit instead of the Atari staffing
// cliff and `RAND(JAHR)` noise. Pure functions, no Phaser.

import {
  defaultRng,
  type GameState,
  type PlayerState,
  playerAt,
  type Rng,
  type Ruleset,
  rand,
} from "./types";

/** Servants one house needs to run at full profit. */
export const STAFF_PER_HOUSE = 8;
/** Yearly profit of a fully staffed house: base plus a share per weather step. */
const HOUSE_BASE = 700;
const HOUSE_PER_WEATHER = 70;

/** Houses that are actually running: fractional, capped by the houses owned. */
export function staffedHouses(p: PlayerState): number {
  return Math.min(p.hh, Math.max(0, p.bd) / STAFF_PER_HOUSE);
}

/**
 * Yearly profit of the staffed houses. `state.wetter` is the weather of the
 * last harvest rolled (harvests come after the trading-house screen).
 */
export function houseProfit(state: GameState, p: PlayerState): number {
  return Math.floor(
    staffedHouses(p) * (HOUSE_BASE + HOUSE_PER_WEATHER * state.wetter),
  );
}

/**
 * Servants the screen asks for. Atari: one more than 5 per house, which the
 * source's profit test (`BD > HH*5`, KAISERB:1170) needs to turn on a single
 * house. Remake: a full crew per house.
 */
export function crewNeeded(p: PlayerState, rules: Ruleset): number {
  if (p.hh <= 0) return 0;
  return rules === "remake" ? STAFF_PER_HOUSE * p.hh : 5 * p.hh + 1;
}

/** Share of the houses' yearly profit the Emperor takes as tribute. */
const TRIBUTE_SHARE = 0.25;

/**
 * Remake tribute demand: a quarter of the trading-house profit plus dues for
 * people, buildings and rank. No wealth surcharge, no random term.
 */
export function remakeTribute(p: PlayerState, profit: number): number {
  return Math.floor(
    TRIBUTE_SHARE * profit +
      p.leute * 1.2 +
      p.markt * 10 +
      p.muhl * 15 +
      p.burg * 80 +
      p.dom * 110 +
      p.titel * 150,
  );
}

export type Verdict = "pleased" | "tolerated" | "displeased" | "insulted";

export interface TributeVerdict {
  verdict: Verdict;
  /** Score change. */
  points: number;
  /** The Emperor takes a trading house. */
  seize: boolean;
}

/** Paid share of the demand at which the verdict changes. */
const TOLERATED_AT = 0.5;
const DISPLEASED_AT = 0.2;

/** The Emperor's verdict on the tribute paid, from its share of the demand. */
export function tributeVerdict(paid: number, due: number): TributeVerdict {
  const r = due > 0 ? paid / due : 1;
  if (r >= 1) return { verdict: "pleased", points: 1, seize: false };
  if (r >= TOLERATED_AT)
    return { verdict: "tolerated", points: 0, seize: false };
  if (r >= DISPLEASED_AT)
    return { verdict: "displeased", points: -1, seize: false };
  return { verdict: "insulted", points: -3, seize: true };
}

/**
 * Score change for the tribute paid. Atari (KAISERB:1900): a coin flip that
 * rewards `INT(paid/2000)` or costs 1. Remake: the visible verdict ladder.
 */
export function tributePoints(
  state: GameState,
  paid: number,
  due: number,
  rng: Rng = defaultRng,
): number {
  if (state.rules === "remake") return tributeVerdict(paid, due).points;
  return paid - 1000 + rand(2000, rng) > due ? Math.trunc(paid / 2000) : -1;
}

/** Points for leasing a house. */
const LEASE_POINTS = 1.3;
/** Atari: a flat price. Remake: it rises with every house already owned. */
const LEASE_PRICE = 5000;
const LEASE_STEP = 1000;

/** Price of the next house from the Emperor. */
export function leasePrice(p: PlayerState, rules: Ruleset): number {
  return rules === "remake" ? LEASE_PRICE + LEASE_STEP * p.hh : LEASE_PRICE;
}

/**
 * The full price is in the treasury and the Emperor has a house left. The
 * source tests `GELD > 2500` against a 5000 price (KAISERB:1590); the screen
 * always greyed the button below the price, so the full price is the rule.
 */
export function canLeaseHouse(state: GameState, sp: number): boolean {
  const p = state.players[sp];
  const kaiser = state.players[0];
  return (
    p !== undefined &&
    kaiser !== undefined &&
    kaiser.hh > 0 &&
    p.geld >= leasePrice(p, state.rules)
  );
}

/** Lease one house from the Emperor's pool. False when it is not allowed. */
export function leaseHouse(state: GameState, sp: number): boolean {
  if (!canLeaseHouse(state, sp)) return false;
  const p = playerAt(state, sp);
  p.geld -= leasePrice(p, state.rules);
  p.hh += 1;
  playerAt(state, 0).hh -= 1;
  p.punkte += LEASE_POINTS;
  return true;
}
