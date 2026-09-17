// Central, adjustable game configuration.
//
// Player count: the manual describes 1–4 rulers, but the Atari source supports
// up to 6 (arrays are sized 6). We ship 6 and keep it tunable here.
export interface GameConfig {
  /** Minimum number of rulers in a hotseat game. */
  minPlayers: number;
  /** Maximum number of rulers (source arrays are sized 6). */
  maxPlayers: number;
  /** First year of a new game (KAISER3:115). */
  startYear: number;
  /** Default UI language. */
  language: "de" | "en";
}

export const GAME_CONFIG: GameConfig = {
  minPlayers: 1,
  maxPlayers: 6,
  startYear: 1700,
  language: "de",
};
