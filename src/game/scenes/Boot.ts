import { GAME_CONFIG } from "../config"
import { setLang } from "../i18n/i18n"
import { loadFonts } from "../ui/text"
import { GameScene } from "./base"

export class Boot extends GameScene {
  constructor() {
    super("Boot")
  }

  async create() {
    setLang(GAME_CONFIG.language)
    // Phaser rasterises canvas text once, so the display fonts must be ready
    // before the Menu creates its labels.
    await loadFonts()
    // Persistent wood backdrop behind every screen (see Backdrop).
    this.scene.launch("Backdrop")
    this.scene.start("Menu")
  }
}
