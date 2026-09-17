// Pure port of the Atari game rules. Each function takes the game state plus an
// injectable RNG (so tests are deterministic) and mutates the relevant player.
//
// Where the original has a clear bug the *intended* behaviour is ported and the
// deviation is noted inline and in rewrite.md ("Known issues").

import { MAX_BURG, WIN_TITLE } from "./constants";
import { type GameState, type PlayerState, type Rng, rand } from "./types";

// Turbo-BASIC `INT(x)` floors (rounds toward -infinity), not toward zero; the
// difference matters for negative arguments (e.g. the trading-house profit).
const int = Math.floor;
const abs = Math.abs;

export interface HarvestResult {
  faul: number;
  weather: number;
  harvest: number;
  vkorn: number;
  klager: number;
}

/** KAISER3 #KORN: weather, rot and the new grain stock. */
export function harvest(
  state: GameState,
  sp: number,
  rng: Rng = Math.random,
): HarvestResult {
  const p = state.players[sp];
  // BACKER = min(ACKER, LEUTE/5)
  const backer = Math.min(p.acker, p.leute / 5);
  const faul = rand(50, rng) + 1;
  const zpsk = rand(2000, rng) + 1;
  const weather = rand(10, rng) + 1;

  let korn = backer * 1.9 + (p.acker / 10) * weather + zpsk;
  korn = abs(korn - p.krieg * 1000);

  // Source keeps `lkorn*FAUL/100`, but FAUL is the *rotted* percentage per the
  // on-screen text and manual §6. Fixed to keep the surviving share.
  p.lkorn = (p.lkorn * (100 - faul)) / 100 + korn;

  const vkorn = p.leute * 22 + rand(100, rng) + 1;
  const klager = (vkorn * 100) / 80;

  state.wetter = weather;
  state.turn.faul = faul;
  state.turn.vkorn = vkorn;
  state.turn.klager = klager;
  return { faul, weather, harvest: korn, vkorn, klager };
}

/** KAISER3 #KORNAUS: 20% / 80% grain bounds. */
export function grainBounds(p: PlayerState): { p20: number; p80: number } {
  return { p20: int((p.lkorn * 20) / 100), p80: int((p.lkorn * 80) / 100) };
}

/** Give `amount` grain to the people (KORNAUS). */
export function giveGrain(state: GameState, sp: number, amount: number): void {
  const p = state.players[sp];
  p.lkorn = int(p.lkorn - amount);
  state.turn.kaus = amount;
}

export interface LandShortage {
  markt: number;
  muhl: number;
}

/** KAISER4:1860-1880: cities covered by both markets and mills, plus the seat. */
export function cities(p: PlayerState): number {
  return Math.trunc(Math.min(p.markt / 5, p.muhl / 3)) + 1;
}

/** Buildings that hold guards (KAISER5:920-1270 distributes over these). */
export type GuardKind = "muhl" | "markt" | "hh" | "burg";

export interface GuardLayout {
  muhl: number[];
  markt: number[];
  hh: number[];
  burg: number[];
}

/**
 * KAISER5:920-1270: the defender spreads their guards over the buildings
 * before a sabotage attempt, so each building ends up with a random share.
 * The source's spy map is dropped, so the layout is modelled directly. The
 * source only guards mills, markets and trading houses; the palace is included
 * here because the remake lets saboteurs target it.
 */
export function distributeGuards(
  target: PlayerState,
  rng: Rng = Math.random,
): GuardLayout {
  const layout: GuardLayout = {
    muhl: new Array(Math.max(0, target.muhl)).fill(0),
    markt: new Array(Math.max(0, target.markt)).fill(0),
    hh: new Array(Math.max(0, target.hh)).fill(0),
    burg: new Array(Math.max(0, target.burg)).fill(0),
  };
  const slots: [GuardKind, number][] = [];
  for (const kind of ["muhl", "markt", "hh", "burg"] as GuardKind[]) {
    for (let i = 0; i < layout[kind].length; i++) slots.push([kind, i]);
  }
  if (slots.length === 0) return layout;
  for (let g = 0; g < Math.max(0, target.infant); g++) {
    const [kind, i] = slots[Math.floor(rng() * slots.length)];
    layout[kind][i] += 1;
  }
  return layout;
}

/** Guards in the weakest building of `kind` (the spy picks the soft target). */
export function guardsInBuilding(layout: GuardLayout, kind: GuardKind): number {
  const list = layout[kind];
  return list.length === 0 ? 0 : Math.min(...list);
}

/**
 * KAISER4 #LANDMANGEL: a market needs 600 ha and a mill 1000 ha of building
 * land. When the land no longer covers them the surplus is destroyed.
 *
 * The source computes `INT(MARKT - LAND/600)` and then razes one *extra* of
 * both types (KAISER4:1770-1780); that `+1` only compensates for the integer
 * truncation and over-razes whenever `LAND` is an exact multiple. The intended
 * surplus (count minus the integer quotient) is ported instead.
 */
export function landShortage(p: PlayerState): LandShortage {
  const markt = Math.max(0, p.markt - Math.floor(p.land / 600));
  const muhl = Math.max(0, p.muhl - Math.floor(p.land / 1000));
  p.markt -= markt;
  p.muhl -= muhl;
  return { markt, muhl };
}

export interface ChronicleResult {
  geb: number;
  ges: number;
  einw: number;
  ausw: number;
  mg1: number;
  mg2: number;
  sold: number;
  punkte: number;
}

/**
 * KAISER3 #CHRONIK: births, deaths, migration, mill/market profit and secret
 * service cost for the year.
 */
export function chronicle(
  state: GameState,
  sp: number,
  rng: Rng = Math.random,
): ChronicleResult {
  const p = state.players[sp];
  const { kaus, vkorn } = state.turn;

  const geb =
    abs(int(p.leute / 44 + (kaus - vkorn) / 150)) + rand(2, rng) * state.wetter;
  const ges =
    abs(int(p.leute / 42.55 + (vkorn - kaus) / 150)) +
    rand(5, rng) * (10 - state.wetter);

  let einw = int((kaus - vkorn) / 1300);
  einw = (einw + rand(10, rng)) * (einw > 0 ? 1 : 0);
  // Source adds points twice (KAISER3:11911 and 11941); kept, with EINW
  // computed before the first addition (source used last year's value).
  p.punkte += int(geb / 10 - ges / 10 + einw / 5);

  p.leute += geb - ges;

  // Source tests the scalar JUSTIZ (always 0) instead of JUSTIZ(SP); fixed.
  const ausw =
    p.mwst + p.ein + p.zoll > 60 || p.justiz === 4
      ? int((rand(10, rng) * p.leute) / 100)
      : 0;

  const maxKorn = Math.min(p.muhl, kaus / 1000);
  const mg1 = int((maxKorn * (280 + rand(50, rng)) * state.wetter) / 5);
  const maxMarkt = Math.min(p.markt, kaus / 333);
  const mg2 = int((maxMarkt * (100 + rand(50, rng)) * state.wetter) / 5);
  p.leute += einw - ausw;

  const sold = p.infant * (p.kavall + 1) + 60 + p.artell * 80 * (p.manov + 1);

  p.punkte += int(geb / 10 - ges / 10 + einw / 5);
  p.geld = int(p.geld + mg1 + mg2 - sold);

  state.mg1 = mg1;
  state.mg2 = mg2;

  return { geb, ges, einw, ausw, mg1, mg2, sold, punkte: p.punkte };
}

export interface TradeResult {
  zahl: number;
  gew: number;
}

/** KAISERB #HANDEL: yearly trading-house profit and tribute demand. */
export function tradeHouse(
  state: GameState,
  sp: number,
  rng: Rng = Math.random,
): TradeResult {
  const p = state.players[sp];
  const kaiser = state.players[0];
  if (state.jahr === 1700) kaiser.hh = rand(10, rng) + 10;

  let zahl =
    p.hh * 50 +
    p.leute * 1.2 +
    p.markt * 10 +
    p.muhl * 15 +
    p.burg * 80 +
    p.dom * 110 +
    rand(100, rng) +
    p.titel * 150;
  zahl = int(zahl);

  let ah = -int(p.hh - p.bd / 5);
  if (ah > p.hh) ah = p.hh;
  const active = ah > 0 ? 1 : 0;
  const gew =
    p.hh > 0
      ? int(ah * (200 + rand(state.jahr, rng) + p.punkte * 5) * active) + 0
      : 0;

  p.geld = p.geld - p.bd * 50;
  p.geld = p.geld + gew;
  zahl = zahl + int((p.geld * 14) / 100);
  if (zahl > p.geld) zahl = int(zahl - (zahl - p.geld) * 1.123);
  if (zahl < 0) zahl = 1;

  state.turn.zahl = zahl;
  state.turn.gew = gew;
  return { zahl, gew };
}

/** KAISER4 EINNAHM: state income from trade volume and taxes. */
export function stateIncome(
  state: GameState,
  sp: number,
  rng: Rng = Math.random,
): number {
  const p = state.players[sp];
  const ra = rand(100, rng) * p.justiz;
  const se = int(
    ((state.mg1 + state.mg2) / 100) * (p.zoll + p.ein + p.mwst) + ra,
  );
  p.geld = int(p.geld + se);
  return se;
}

/** KAISER4 TITEL: promote when score and money allow; true on winning. */
export function titleAdvance(state: GameState, sp: number): boolean {
  const p = state.players[sp];
  const need = 15 + p.titel * 9 + (((p.titel + 1) * p.titel) / 2) * 4.5;
  if (p.punkte > need && p.geld > 0) {
    p.titel += 1;
    if (p.titel === WIN_TITLE && p.dom === 20 && p.burg === MAX_BURG)
      return true;
    if (p.titel === WIN_TITLE) p.titel = 7;
  }
  return false;
}

/** KAISER6 WERT: final score. */
export function highscoreValue(p: PlayerState, jahr: number): number {
  return (
    (200 - (jahr - 1700)) * 200 +
    p.markt * 200 +
    p.muhl * 300 +
    p.hh * 500 +
    p.leute * 100 +
    p.dom * 1000 +
    p.burg * 800 -
    p.krieg * 200
  );
}

export interface SabotageResult {
  success: boolean;
  attackerStrength: number;
  defenderStrength: number;
}

/**
 * KAISER5: resolve a sabotage attempt.
 *
 * Source computes the defence as `WW*KAVALL(SP)` - the *attacker's* guard
 * training. Fixed to use the defender's KAVALL, which is what the manual §14
 * describes.
 */
export function resolveSabotage(
  attacker: PlayerState,
  defender: PlayerState,
  saboteurs: number,
  guards: number,
  rng: Rng = Math.random,
): SabotageResult {
  const sabo =
    saboteurs * attacker.manov + rand(6, rng) * (saboteurs > 0 ? 1 : 0);
  const wach = guards * defender.kavall + rand(6, rng) * (guards > 0 ? 1 : 0);
  return {
    success: sabo > wach,
    attackerStrength: sabo,
    defenderStrength: wach,
  };
}
