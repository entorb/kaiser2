import { AUTO, Game, Scale, type Types } from "phaser"
import { Backdrop } from "./scenes/Backdrop.ts"
import { Boot } from "./scenes/Boot.ts"
import { Business } from "./scenes/Business.ts"
import { Chronicle } from "./scenes/Chronicle.ts"
import { Coronation } from "./scenes/Coronation.ts"
import { Grain } from "./scenes/Grain.ts"
import { Highscore } from "./scenes/Highscore.ts"
import { Land } from "./scenes/Land.ts"
import { Menu } from "./scenes/Menu.ts"
import { Monument } from "./scenes/Monument.ts"
import { NewGame } from "./scenes/NewGame.ts"
import { Promotion } from "./scenes/Promotion.ts"
import { Ranking } from "./scenes/Ranking.ts"
import { SecretService } from "./scenes/SecretService.ts"
import { Taxes } from "./scenes/Taxes.ts"
import { TradeData } from "./scenes/TradeData.ts"
import { TradePartner } from "./scenes/TradePartner.ts"
import { TradingHouse } from "./scenes/TradingHouse.ts"
import { fitCanvas, GAME_H, GAME_W, landscapeAspect } from "./ui/layout.ts"
import { COLORS, css } from "./ui/theme.ts"

// The layout uses a 576-high design space at least 960 wide (the original
// 320x192 at SCALE 3), widened to the window's aspect and rendered at
// RENDER_SCALE times that for crisp text and vector art (see layout.ts);
// scenes zoom their camera to match.
const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: "game-container",
  backgroundColor: css(COLORS.bg),
  pixelArt: false,
  fullscreenTarget: "app",
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [
    Boot,
    Backdrop,
    Menu,
    NewGame,
    TradingHouse,
    TradePartner,
    Grain,
    Land,
    Chronicle,
    Taxes,
    TradeData,
    Business,
    Promotion,
    Coronation,
    Monument,
    Ranking,
    SecretService,
    Highscore,
  ],
}

const StartGame = (parent: string) => {
  fitCanvas(landscapeAspect(window.innerWidth, window.innerHeight))
  return new Game({ ...config, parent, width: GAME_W, height: GAME_H })
}

export default StartGame
