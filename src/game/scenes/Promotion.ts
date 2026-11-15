import { playFanfare } from "../audio/music.ts"
import { nextTurn, toRanking } from "../flow.ts"
import { t } from "../i18n/i18n.ts"
import { FocusGroup } from "../ui/focus.ts"
import { frame } from "../ui/layout.ts"
import { drawPromotionArt } from "../ui/ruler.ts"
import { Panel } from "../ui/widgets.ts"
import { GameScene } from "./base.ts"
import { continueAction, screenTitle } from "./common.ts"

/** "zum Landgrafen": German counts these titles among the weak nouns. */
function dative(title: string): string {
  return /(graf|fürst)$/iu.test(title) ? `${title}en` : title
}

interface PromotionData {
  name: string
  title: string
  kingdom: string
  /** Title rank 1..7; picks the headgear. */
  rank: number
  portrait: number
  nextRanking: boolean
}

/** KAISER4 PROC TITEL: full screen shown when a ruler gains a new title. */
export class Promotion extends GameScene {
  constructor() {
    super("Promotion")
  }

  create(data: PromotionData) {
    playFanfare()
    const group = new FocusGroup(this)
    const { content } = frame()
    // The headline is long and breaks onto a second line when it must; the
    // panel takes the room that is left below it.
    const title = screenTitle(
      this,
      t("promotion.title", {
        name: data.name,
        title: data.title,
        titleDat: dative(data.title),
        kingdom: data.kingdom,
      }),
      content.y,
      true,
    )
    const panelTop = content.y + Math.max(54, Math.ceil(title.height) + 12)
    const panelH = content.y + content.h - panelTop
    const panel = new Panel(this, content.x, panelTop, content.w, panelH)
    const cx = content.w / 2
    const cy = panelH / 2

    const art = this.add.graphics()
    drawPromotionArt(art, cx, cy, cy - 8, data.rank, data.portrait)
    panel.add(art)

    continueAction(this, group, () =>
      data.nextRanking ? toRanking(this.scene) : nextTurn(this.scene),
    )
  }
}
