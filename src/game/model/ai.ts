// Computer rulers (rules-remake.md §5). Three fixed opponents of rising skill
// play a whole turn through the model, in the order of the scenes, so the same
// code drives the game and scripts/sim.mjs. Their parameters come from the
// balance simulation.

import {
  addBuilding,
  atMaxBuildings,
  BUILDINGS,
  type BuildingKind,
  buildingCost,
  landRequired,
  MAX_DOM,
} from "./constants";
import {
  applyInterest,
  depose,
  die,
  expropriate,
  pawn,
  taxDemotion,
} from "./events";
import {
  canLeaseHouse,
  crewNeeded,
  leaseHouse,
  leasePrice,
  tributePoints,
} from "./houses";
import {
  chronicle,
  FARMING,
  giveGrain,
  grainBounds,
  harvest,
  landShortage,
  stateIncome,
  titleAdvance,
  tradeHouse,
} from "./rules";
import {
  buyCheapest,
  GRAIN_PRICE_UNIT,
  LAND_PRICE_UNIT,
  refreshEmperorStock,
  updateEmperorPrices,
} from "./trade";
import {
  type Difficulty,
  defaultRng,
  type GameState,
  type PlayerState,
  playerAt,
  type Rng,
  type Ruleset,
  rand,
} from "./types";

export interface AiProfile {
  /** Fixed ruler name (at most 10 characters) and kingdom (at most 12). */
  name: string;
  kingdom: string;
  /** Target `EIN + MWST` in the Remake; scaled up for the three Atari rates. */
  burden: number;
  /** Justice level 1..4. */
  justice: number;
  /** Grain per head handed out above the need; 3.5 is the growth peak. */
  surplus: number;
  /** Cash kept back for grain: base plus per head. */
  reserveBase: number;
  reservePerHead: number;
  /** Share of the tribute demand paid; 0.5 is "tolerated" in the Remake. */
  tribute: number;
  /** Leases and staffs trading houses. */
  houses: boolean;
  /** Rank from which land for palace and cathedral is prepared. */
  prestigeFrom: number;
  /** Chance per year that nothing is bought (land or buildings). */
  idle: number;
  /** Remake: share of the grain handed out that he wants to grow himself. */
  farm: number;
}

export const AI_PROFILES: Record<Difficulty, AiProfile> = {
  easy: {
    name: "Otto",
    kingdom: "Ostmark",
    burden: 30,
    justice: 2,
    surplus: 1.6,
    reserveBase: 500,
    reservePerHead: 2,
    tribute: 0.25,
    houses: false,
    prestigeFrom: 3,
    idle: 0.25,
    farm: 0.5,
  },
  medium: {
    name: "Konrad",
    kingdom: "Franken",
    burden: 34,
    justice: 2,
    surplus: 1.75,
    reserveBase: 1000,
    reservePerHead: 4,
    tribute: 0.5,
    houses: true,
    prestigeFrom: 4,
    idle: 0.15,
    farm: 0.5,
  },
  hard: {
    name: "Barbarossa",
    kingdom: "Staufen",
    burden: 46,
    justice: 2,
    surplus: 3.5,
    reserveBase: 1000,
    reservePerHead: 5,
    tribute: 0.5,
    houses: true,
    prestigeFrom: 2,
    idle: 0,
    farm: 1,
  },
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/**
 * The Atari rates sum to this multiple of the Remake burden (25/10/5 = 40 is a
 * slow game). The hard ruler lands at 67 points, past the emigration cliff at
 * 60: in the simulation that is still the fastest way to win under Atari rules.
 */
const ATARI_SCALE = 1.45;

function profileOf(p: PlayerState): AiProfile {
  if (!p.ai) throw new Error(`${p.name} is not a computer ruler`);
  return AI_PROFILES[p.ai];
}

/**
 * How far a computer's habits wander from turn to turn (a share of the value),
 * so that two games with the same opponent do not play alike.
 */
const WANDER = { surplus: 0.15, reserve: 0.2, tribute: 0.2 };
/** Tax rate points the burden wanders up or down. */
const BURDEN_WANDER = 2;

/** This turn's profile: the fixed one with its numbers nudged at random. */
function moodOf(ai: AiProfile, rng: Rng): AiProfile {
  const wander = (spread: number) => 1 + (rand(2001, rng) / 1000 - 1) * spread;
  const reserve = wander(WANDER.reserve);
  return {
    ...ai,
    burden: ai.burden + rand(2 * BURDEN_WANDER + 1, rng) - BURDEN_WANDER,
    surplus: ai.surplus * wander(WANDER.surplus),
    reserveBase: ai.reserveBase * reserve,
    reservePerHead: ai.reservePerHead * reserve,
    // Never under the share the Emperor tolerates: only paying more varies.
    tribute: ai.tribute * (1 + (rand(1001, rng) / 1000) * WANDER.tribute),
  };
}

/** Make `p` the computer ruler of the given skill, with its opening taxes. */
export function setupComputer(
  p: PlayerState,
  level: Difficulty,
  rules: Ruleset,
): void {
  const ai = AI_PROFILES[level];
  p.name = ai.name;
  p.kingdom = ai.kingdom;
  p.ai = level;
  setTaxes(p, ai, rules);
}

function setTaxes(p: PlayerState, ai: AiProfile, rules: Ruleset): void {
  p.justiz = ai.justice;
  if (rules === "remake") {
    p.ein = Math.round(ai.burden / 2);
    p.mwst = ai.burden - p.ein;
    p.zoll = 0;
    return;
  }
  const total = Math.round(ai.burden * ATARI_SCALE);
  p.zoll = Math.round(total * 0.625);
  p.mwst = Math.round(total * 0.25);
  p.ein = total - p.zoll - p.mwst;
}

export type ComputerEvent =
  | "demoted"
  | "seized"
  | "pawn"
  | "deposedLand"
  | "deposedTax"
  | "death";

/** What happened in a computer turn, for the summary shown to the humans. */
export interface ComputerReport {
  won: boolean;
  /** Advanced a rank at the end of the turn. */
  promoted: boolean;
  built: Record<BuildingKind, number>;
  leased: number;
  events: ComputerEvent[];
}

const reserveOf = (ai: AiProfile, p: PlayerState) =>
  ai.reserveBase + ai.reservePerHead * p.leute;

/** The Emperor's tribute, staffing and (Landgraf and up) new houses. */
function tradingHouses(
  state: GameState,
  sp: number,
  ai: AiProfile,
  rng: Rng,
  report: ComputerReport,
): void {
  const p = playerAt(state, sp);
  const { zahl } = tradeHouse(state, sp, rng);
  // Under Atari rules the tribute is a coin flip that never paid off in the
  // simulation; the Remake ladder rewards paying the share the profile picks.
  const share = state.rules === "remake" ? ai.tribute : 0;
  const paid = Math.min(
    Math.max(0, Math.trunc(p.geld)),
    Math.round(zahl * share),
  );
  p.geld -= paid;
  state.turn.abg += paid;
  if (ai.houses) {
    const price = leasePrice(p, state.rules);
    if (
      canLeaseHouse(state, sp) &&
      p.geld >= price + reserveOf(ai, p) &&
      leaseHouse(state, sp)
    )
      report.leased += 1;
    // The source runs every house at 10*HH-4 servants; the Remake wants a crew.
    const crew =
      state.rules === "remake"
        ? crewNeeded(p, "remake")
        : Math.max(0, 10 * p.hh - 4);
    state.turn.neu = Math.max(0, crew - p.bd);
    state.turn.alt = Math.max(0, p.bd - crew);
  }
  p.bd += state.turn.neu - state.turn.alt;
  p.punkte += tributePoints(state, state.turn.abg, zahl, rng);
  if (expropriate(state, sp, rng)) report.events.push("seized");
}

/** Harvest, buy the grain to feed the people a surplus, and hand it out. */
function feedPeople(
  state: GameState,
  sp: number,
  ai: AiProfile,
  rng: Rng,
): void {
  const p = playerAt(state, sp);
  const h = harvest(state, sp, rng);
  // Growth peaks at a surplus of ~3.5 grain per head: births rise with
  // (KAUS-VKORN)/150 while deaths fall until |LEUTE/42.55 - surplus/150| = 0.
  const give = h.vkorn + ai.surplus * p.leute;
  const need = Math.max(0, Math.trunc(give / 0.8 - p.lkorn));
  buyCheapest(state, sp, "grain", need, Math.max(0, p.geld));
  const { p20, p80 } = grainBounds(p);
  giveGrain(state, sp, Math.max(p20, Math.min(p80, give)));
}

/** Building land the ruler wants before the next purchases. */
function landGoal(state: GameState, p: PlayerState, ai: AiProfile): number {
  const { kaus } = state.turn;
  let goal = 0;
  if (p.muhl < Math.trunc(kaus / 1000))
    goal = Math.max(goal, landRequired(p, "muhl"));
  if (p.markt < Math.trunc(kaus / 333))
    goal = Math.max(goal, landRequired(p, "markt"));
  if (p.titel >= ai.prestigeFrom)
    goal = Math.max(goal, BUILDINGS[p.dom < MAX_DOM ? "dom" : "burg"].land);
  return goal;
}

/** Keep 10 ha per head (or be deposed) and room for the planned buildings. */
function buyLand(
  state: GameState,
  sp: number,
  ai: AiProfile,
  idle: boolean,
): void {
  const p = playerAt(state, sp);
  const cash = () => Math.max(0, p.geld - reserveOf(ai, p));
  const deficit = Math.trunc(p.leute * 11 - p.land - p.acker);
  if (deficit > 0) buyCheapest(state, sp, "acker", deficit, cash());
  const wanted = landGoal(state, p, ai) - p.land;
  if (wanted > 0 && !idle) buyCheapest(state, sp, "land", wanted, cash());
}

/** Most acre land a computer buys in one turn (big deals cost more, §3.7). */
const FARM_BUY_MAX = 5000;
/** Years in which the grain an acre grows must pay back its price. */
const FARM_PAYBACK = 10;

/**
 * Remake: idle cash goes into acre land while it pays back, until the ruler
 * grows the share `ai.farm` of the grain he hands out. An acre grows about
 * `0.55 × acreYield` grain a year (average weather 5.5), worth the Emperor's
 * grain price; he skips a partner whose land costs more than that pays back
 * within `FARM_PAYBACK` years, so he waits out an expensive turn.
 */
function buyFarmland(state: GameState, sp: number, ai: AiProfile): void {
  if (state.rules !== "remake") return;
  const p = playerAt(state, sp);
  const perHa = 0.55 * FARMING.acreYield;
  const give = state.turn.vkorn + ai.surplus * p.leute;
  const wanted = Math.min(FARM_BUY_MAX, (ai.farm * give) / perHa - p.acker);
  const cash = Math.max(0, p.geld - reserveOf(ai, p));
  const grain = playerAt(state, 0).kpreis / GRAIN_PRICE_UNIT;
  const maxPrice = LAND_PRICE_UNIT * perHa * grain * FARM_PAYBACK;
  if (wanted > 0) buyCheapest(state, sp, "acker", wanted, cash, maxPrice);
}

function canBuild(
  state: GameState,
  p: PlayerState,
  kind: BuildingKind,
  cash: number,
): boolean {
  return (
    !atMaxBuildings(p, kind) &&
    p.land >= landRequired(p, kind) &&
    p.geld >= buildingCost(p, kind, state.rules) + cash
  );
}

/** Productive buildings first (as many as the fed people support), then prestige. */
function nextBuilding(
  state: GameState,
  p: PlayerState,
  ai: AiProfile,
): BuildingKind | null {
  const { kaus } = state.turn;
  const cash = reserveOf(ai, p);
  if (p.muhl < Math.trunc(kaus / 1000) && canBuild(state, p, "muhl", cash))
    return "muhl";
  if (p.markt < Math.trunc(kaus / 333) && canBuild(state, p, "markt", cash))
    return "markt";
  if (p.titel < ai.prestigeFrom) return null;
  const prestige = p.dom <= p.burg * 1.33 ? "dom" : "burg";
  return canBuild(state, p, prestige, cash) ? prestige : null;
}

/** KAISER4 #GESCHAFT end of turn: pawn, deposition, death, interest, title. */
function endOfTurn(
  state: GameState,
  sp: number,
  rng: Rng,
  report: ComputerReport,
): void {
  const p = playerAt(state, sp);
  if (p.geld < -10000 - p.titel * 2000) {
    pawn(p, rng);
    report.events.push("pawn");
  }
  if (p.land + p.acker < p.leute * 10 && p.land > 0) {
    depose(p);
    report.events.push("deposedLand");
  }
  if (p.zoll + p.mwst + p.ein < 20) {
    depose(p);
    report.events.push("deposedTax");
  }
  if (p.tod <= 0) {
    die(p, rng);
    report.events.push("death");
  }
  applyInterest(p);
  const rank = p.titel;
  report.won = titleAdvance(state, sp);
  report.promoted = p.titel > rank;
}

/**
 * Play the whole turn of computer ruler `sp`: trading houses, harvest and
 * feeding, land, chronicle, taxes, buildings and the end-of-turn events. The
 * caller advances to the next ruler afterwards (`advancePlayer`).
 */
export function playComputerTurn(
  state: GameState,
  sp: number,
  rng: Rng = defaultRng,
): ComputerReport {
  const p = playerAt(state, sp);
  const ai = moodOf(profileOf(p), rng);
  const report: ComputerReport = {
    won: false,
    promoted: false,
    built: { markt: 0, muhl: 0, burg: 0, dom: 0 },
    leased: 0,
    events: [],
  };
  state.turn.han = 0;

  if (taxDemotion(p, state.rules)) report.events.push("demoted");
  if (p.titel > 1) tradingHouses(state, sp, ai, rng, report);

  refreshEmperorStock(state, rng);
  updateEmperorPrices(state, sp, rng);
  feedPeople(state, sp, ai, rng);

  const idle = rand(100, rng) < ai.idle * 100;
  landShortage(p);
  buyLand(state, sp, ai, idle);

  chronicle(state, sp, rng);
  stateIncome(state, sp, rng);
  setTaxes(p, ai, state.rules);
  landShortage(p);

  for (let guard = 0; !idle && guard < 200; guard++) {
    const kind = nextBuilding(state, p, ai);
    if (!kind) break;
    addBuilding(p, kind, state.rules);
    report.built[kind] += 1;
  }

  buyFarmland(state, sp, ai);

  endOfTurn(state, sp, rng, report);

  openTrade(state, p, ai);
  return report;
}

/**
 * What other rulers may buy from this one (rules.md §8 defaults: all grain and a
 * tenth of the land). In the Remake the computer keeps the grain a normal
 * feeding leaves in the granary (it hands out `give` from a stock of
 * `give / 0.8`, so a quarter of `give`) and offers only what is above it. The
 * price follows the granary: 125 when empty, 100 at the normal stock, 75 at
 * twice that, so grain sold to him comes back cheaper.
 */
export function openTrade(
  state: GameState,
  p: PlayerState,
  ai: AiProfile,
): void {
  p.verAcker = Math.trunc(p.acker / 10);
  p.verBau = Math.trunc(p.land / 10);
  if (state.rules !== "remake") {
    p.verkorn = p.lkorn;
    return;
  }
  const keep = Math.max(1, (state.turn.vkorn + ai.surplus * p.leute) / 4);
  p.verkorn = Math.max(0, Math.trunc(p.lkorn - keep));
  p.kpreis = Math.min(
    125,
    Math.max(75, Math.round(125 - (25 * p.lkorn) / keep)),
  );
}
