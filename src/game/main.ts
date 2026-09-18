import { AUTO, Game, Scale, type Types } from "phaser";
import { Backdrop } from "./scenes/Backdrop";
import { Boot } from "./scenes/Boot";
import { Business } from "./scenes/Business";
import { Chronicle } from "./scenes/Chronicle";
import { Coronation } from "./scenes/Coronation";
import { Grain } from "./scenes/Grain";
import { Highscore } from "./scenes/Highscore";
import { Land } from "./scenes/Land";
import { Menu } from "./scenes/Menu";
import { Monument } from "./scenes/Monument";
import { NewGame } from "./scenes/NewGame";
import { Promotion } from "./scenes/Promotion";
import { Ranking } from "./scenes/Ranking";
import { SecretService } from "./scenes/SecretService";
import { Taxes } from "./scenes/Taxes";
import { TradeData } from "./scenes/TradeData";
import { TradePartner } from "./scenes/TradePartner";
import { TradingHouse } from "./scenes/TradingHouse";
import { GAME_H, GAME_W } from "./ui/layout";
import { COLORS, css } from "./ui/theme";

// The layout uses a fixed 960x576 design space (the original 320x192 at
// SCALE 3), rendered at RENDER_SCALE times that for crisp text and vector art
// (see layout.ts); scenes zoom their camera to match.
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_W,
  height: GAME_H,
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
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
