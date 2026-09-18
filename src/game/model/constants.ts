import { GAME_CONFIG } from "../config";
import { at } from "../lookup";
import { REMAKE_START_TAXES } from "./tax";
import { type GameState, type PlayerState, type Ruleset, rand } from "./types";

/** LAND$ (KAISER3:180) - the six provinces, index 0 = province of player 1. */
export const PROVINCES = [
  "Anloor",
  "Kachjian",
  "Andorin",
  "Garenhell",
  "Semedal",
  "Galador",
] as const;

/**
 * TITEL$ (KAISERB:150) plus the win rank. Index 8 ("Kaiser") is never a resting
 * rank: `titleAdvance` only keeps it on the winning turn (KAISER4:4010).
 */
export const TITLES = [
  "Verwalter",
  "Baron",
  "Landgraf",
  "Markgraf",
  "Herzog",
  "Fürst",
  "Kurfürst",
  "König",
  "Kaiser",
] as const;

export const WIN_TITLE = 8;
export const MAX_BURG = 15;
export const MAX_DOM = 20;

export type BuildingKind = "markt" | "muhl" | "burg" | "dom";

export interface BuildingInfo {
  cost: number;
  /** Building land per building (market/mill) or the total required (palace/cathedral). */
  land: number;
  points: number;
  max?: number;
}

/** KAISER4 #GESCHAFT purchases (rules.md §9.2). */
export const BUILDINGS: Record<BuildingKind, BuildingInfo> = {
  markt: { cost: 1000, land: 600, points: 0.5 },
  muhl: { cost: 2000, land: 1000, points: 0.8 },
  burg: { cost: 5000, land: 20000, points: 1.6, max: MAX_BURG },
  dom: { cost: 9000, land: 30000, points: 2.1, max: MAX_DOM },
};

/** Remake: each palace/cathedral part already owned adds this share of the base price. */
export const PRESTIGE_COST_STEP = 0.05;

/** Price of the next `kind`; remake makes every further palace/cathedral part dearer. */
export function buildingCost(
  p: PlayerState,
  kind: BuildingKind,
  rules: Ruleset,
): number {
  const { cost } = BUILDINGS[kind];
  const prestige = kind === "burg" || kind === "dom";
  return rules === "remake" && prestige
    ? Math.round(cost * (1 + PRESTIGE_COST_STEP * p[kind]))
    : cost;
}

/** Building land needed to add one more of `kind`. */
export function landRequired(p: PlayerState, kind: BuildingKind): number {
  const b = BUILDINGS[kind];
  return kind === "burg" || kind === "dom" ? b.land : (p[kind] + 1) * b.land;
}

/** The count of `kind` is at its maximum (only palace and cathedral have one). */
export function atMaxBuildings(p: PlayerState, kind: BuildingKind): boolean {
  const { max } = BUILDINGS[kind];
  return max !== undefined && p[kind] >= max;
}

/** Pay for and add one building; the caller checked land and maximum. */
export function addBuilding(
  p: PlayerState,
  kind: BuildingKind,
  rules: Ruleset,
): void {
  p.geld -= buildingCost(p, kind, rules);
  p[kind] += 1;
  p.punkte += BUILDINGS[kind].points;
}

/** Distinct ruler colors; a player's `portrait` is an index into this. */
export const PLAYER_COLORS = [
  0xe0a83c, 0x5bc98c, 0x5aa9e0, 0xe0605f, 0xb07ce0, 0x40c9c9, 0xe08a5a,
  0x9aa3b2,
] as const;

export const MAX_PORTRAIT = PLAYER_COLORS.length;

export function playerColor(portrait: number): number {
  const n = PLAYER_COLORS.length;
  return at(PLAYER_COLORS, ((portrait % n) + n) % n);
}

/** Colors already taken by players 1..index-1. */
export function takenColors(
  players: PlayerState[],
  index: number,
): Set<number> {
  const taken = new Set<number>();
  for (let i = 1; i < index; i++) taken.add(at(players, i).portrait);
  return taken;
}

/** First free color, preferring `preferred` (falls back to `preferred` if full). */
export function freeColor(
  players: PlayerState[],
  index: number,
  preferred: number,
): number {
  const taken = takenColors(players, index);
  if (!taken.has(preferred)) return preferred;
  for (let i = 0; i < MAX_PORTRAIT; i++) {
    if (!taken.has(i)) return i;
  }
  return preferred;
}

/** Next free color from `from` in direction `dir` (+1/-1), wrapping. */
export function nextFreeColor(
  taken: Set<number>,
  from: number,
  dir: number,
): number {
  let i = from;
  for (let step = 0; step < MAX_PORTRAIT; step++) {
    i = (((i + dir) % MAX_PORTRAIT) + MAX_PORTRAIT) % MAX_PORTRAIT;
    if (!taken.has(i)) return i;
  }
  return from;
}

/** Validate a player name: max 10 chars, trimmed, unique case-insensitively. */
export function playerNameError(
  name: string,
  taken: string[],
): "empty" | "taken" | null {
  const n = name.trim().toLowerCase();
  if (!n) return "empty";
  if (taken.some((x) => x.trim().toLowerCase() === n)) return "taken";
  return null;
}

/** JUSTIZ names, index 1..4 (KAISER4:280). */
export const JUSTICE = [
  "",
  "Sehr fair",
  "Bescheiden",
  "Hart",
  "Gierig",
] as const;

export const KAISER = 0;

export function createPlayer(name: string, index: number): PlayerState {
  return {
    name,
    kingdom: "",
    portrait: (index - 1 + MAX_PORTRAIT) % MAX_PORTRAIT,
    controller: 0,
    acker: 10000,
    leute: 500,
    krieg: 0,
    lkorn: 15000,
    land: 5000,
    kpreis: 100,
    muhl: 0,
    markt: 0,
    geld: 10000,
    lpreis: 2000,
    apreis: 2000,
    verAcker: 2500,
    punkte: 0,
    verBau: 2500,
    justiz: 2,
    entHob: 0,
    hh: 0,
    bd: 0,
    mwst: 10,
    ein: 5,
    zoll: 25,
    dom: 0,
    burg: 0,
    infant: 0,
    artell: 0,
    kavall: 0,
    manov: 0,
    tod: rand(10) + 35,
    titel: 0,
    verkorn: 10000,
  };
}

/** Build a fresh game: Kaiser at index 0, `count` human rulers at 1..count. */
export function createGameState(
  count: number,
  rules: Ruleset = "atari",
): GameState {
  const players: PlayerState[] = [];
  players[KAISER] = createPlayer("der Kaiser", 0);
  players[KAISER].hh = rand(20) + 30; // HH(0)=RAND(20)+30 (KAISER3:115)
  for (let i = 1; i <= GAME_CONFIG.maxPlayers; i++) {
    const ruler = createPlayer("", i);
    if (rules === "remake") Object.assign(ruler, REMAKE_START_TAXES);
    players[i] = ruler;
  }
  return {
    rules,
    players,
    count,
    sp: 1,
    jahr: GAME_CONFIG.startYear,
    wetter: 5,
    mg1: 0,
    mg2: 0,
    turn: {
      han: KAISER,
      kaus: 0,
      vkorn: 0,
      klager: 0,
      abg: 0,
      zahl: 0,
      gew: 0,
      neu: 0,
      alt: 0,
      faul: 0,
    },
  };
}
