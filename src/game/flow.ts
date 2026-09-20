import type { BuildingKind } from "./model/constants"

// The slice of Phaser's ScenePlugin the flow needs. Scenes pass `this.scene`;
// tests pass a recorder, so the transitions are testable without Phaser.
export type SceneName =
  | "Boot"
  | "Menu"
  | "NewGame"
  | "TradingHouse"
  | "TradePartner"
  | "Grain"
  | "Land"
  | "Chronicle"
  | "Taxes"
  | "TradeData"
  | "Business"
  | "Promotion"
  | "Coronation"
  | "Monument"
  | "Ranking"
  | "SecretService"
  | "Highscore"

export interface SceneSwitcher {
  start(scene: SceneName, data?: object): void
  stop(scene: SceneName): void
}

/** Any scene → title/menu. */
export function toMenu(switcher: SceneSwitcher): void {
  switcher.start("Menu", { pause: false })
}

/** Menu → new game setup. */
export function toNewGame(switcher: SceneSwitcher): void {
  switcher.start("NewGame")
}

/** Start a ruler's turn at the trading houses. */
export function startTurn(switcher: SceneSwitcher): void {
  switcher.start("TradingHouse")
}

/** Trading houses → pick a trading partner. */
export function toPartner(switcher: SceneSwitcher): void {
  switcher.start("TradePartner")
}

/** Partner → grain (harvest, buy/sell, distribution). */
export function toGrain(switcher: SceneSwitcher): void {
  switcher.start("Grain")
}

/** Grain → land trading. */
export function toLand(switcher: SceneSwitcher): void {
  switcher.start("Land")
}

/** Land → year chronicle. */
export function toChronicle(switcher: SceneSwitcher): void {
  switcher.start("Chronicle")
}

/** Chronicle → state income / taxes (KAISER4 EINNAHM). */
export function toTaxes(switcher: SceneSwitcher): void {
  switcher.start("Taxes")
}

/** Taxes → own trade offers (KAISER4 HA). */
export function toTradeData(switcher: SceneSwitcher): void {
  switcher.start("TradeData")
}

/** Trade data → map / purchases / title (KAISER4 KARTE + GESCHAFT). */
export function toBusiness(switcher: SceneSwitcher): void {
  switcher.start("Business")
}

/** Business → promotion screen when a ruler gains a new title. */
export function toPromotion(
  switcher: SceneSwitcher,
  data: {
    name: string
    title: string
    kingdom: string
    /** Title rank 1..7; picks the picture. */
    rank: number
    portrait: number
    /** True when the year rolled over, so the ranking page follows. */
    nextRanking: boolean
  },
): void {
  switcher.start("Promotion", data)
}

/** Business → coronation animation when a ruler wins the game. */
export function toCoronation(switcher: SceneSwitcher, data: { name: string }): void {
  switcher.start("Coronation", data)
}

/** Business → picture of the finished palace or cathedral, then back. */
export function toMonument(switcher: SceneSwitcher, data: { kind: BuildingKind }): void {
  switcher.start("Monument", data)
}

/** Business → player ranking. */
export function toRanking(switcher: SceneSwitcher): void {
  switcher.start("Ranking")
}

/** Business → secret service (KAISER5). */
export function toSecretService(switcher: SceneSwitcher): void {
  switcher.start("SecretService")
}

/** Business/SecretService → next ruler (player/year advanced beforehand). */
export function nextTurn(switcher: SceneSwitcher): void {
  switcher.start("TradingHouse")
}

/** End of game (or coronation) → highscore. */
export function toHighscore(switcher: SceneSwitcher): void {
  switcher.start("Highscore")
}
