// Game state. Mirrors the Atari COMMON block (KAISERB:110-130 etc.).
//
// `players[0]` is the Kaiser (only its trading-house count `hh` is used);
// human rulers live at indices 1..count. This matches the 1-based arrays in
// the source, so ports read almost identically.

export interface PlayerState {
  name: string;
  /** Kingdom name chosen at name entry. */
  kingdom: string;
  /** Portrait index 0..7 chosen at name entry. */
  portrait: number;
  /** Joystick/controller slot chosen at name entry. */
  controller: number;

  acker: number; // ACKER - acre land (hectares)
  leute: number; // LEUTE - population
  krieg: number; // KRIEG - wars
  lkorn: number; // LKORN - grain stock
  land: number; // LAND - building land (hectares)
  kpreis: number; // KPREIS - grain price
  muhl: number; // MUHL - mills
  markt: number; // MARKT - markets
  geld: number; // GELD - money (taler)
  lpreis: number; // LPREIS - building-land price per 1000 ha (original: per 10 ha)
  apreis: number; // APREIS - acre-land price per 1000 ha
  verAcker: number; // VERALAND - acre land offered for trade
  punkte: number; // PUNKTE - score
  verBau: number; // VERBLAND - building land offered for trade
  justiz: number; // JUSTIZ - justice 1..4
  entHob: number; // ENTHOB - years deposed
  hh: number; // HH - trading houses
  bd: number; // BD - servants
  mwst: number; // MWST - VAT %
  ein: number; // EIN - income tax %
  zoll: number; // ZOLL - customs %
  dom: number; // DOM - cathedral parts 0..20
  burg: number; // BURG - castle parts 0..15
  infant: number; // INFANT - guards
  artell: number; // ARTELL - saboteurs
  kavall: number; // KAVALL - guard training
  manov: number; // MANOV - saboteur training
  tod: number; // TOD - year of death
  titel: number; // TITEL - title rank 0..8
  verkorn: number; // VERKORN - grain offered for trade
}

/** Per-turn scratch values (KAISERB / KAISER3). */
export interface TurnState {
  han: number; // HAN - current trading partner (0 = Kaiser)
  kaus: number; // KAUS - grain given to the people
  vkorn: number; // VKORN - grain the people need
  klager: number; // KLAGER - complaint threshold (vkorn*100/80)
  abg: number; // ABG - tribute actually paid
  zahl: number; // ZAHL - tribute demanded
  gew: number; // GEW - trading-house profit
  neu: number; // NEU - servants hired this turn
  alt: number; // ALT - servants fired this turn
  faul: number; // FAUL - % of grain reserves reported as rotted
}

export interface GameState {
  players: PlayerState[];
  /** Number of human rulers (1..maxPlayers). */
  count: number;
  /** Current ruler, 1-based (matches SP). */
  sp: number;
  jahr: number; // JAHR
  wetter: number; // WETTER 1..10
  mg1: number; // MG1 - mill profit (chronicle)
  mg2: number; // MG2 - market profit (chronicle)
  turn: TurnState;
}

export type Rng = () => number;

/** Turbo-BASIC `RAND(n)`: integer in [0, n). */
export function rand(n: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * n);
}
