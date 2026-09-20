import type { GameObjects } from "phaser"
import { playCoins } from "../audio/music"
import { toLand } from "../flow"
import { t } from "../i18n/i18n"
import type { StringKey } from "../i18n/strings"
import { giveGrain, grainBounds, harvest } from "../model/rules"
import { getState } from "../model/session"
import { buyCost, dealPrice, maxSale, sellProceeds, tradeGrain } from "../model/trade"
import type { GameState } from "../model/types"
import { playerAt } from "../model/types"
import { FocusGroup } from "../ui/focus"
import { drawCoinsIcon, drawGrainIcon, drawWeatherIcon } from "../ui/icon"
import { frame } from "../ui/layout"
import { label } from "../ui/text"
import { COLORS, FS, RADIUS, SPACE } from "../ui/theme"
import { moneyLabel, Panel, Slider, StatRow, type StatRowOptions } from "../ui/widgets"
import { GameScene } from "./base"
import { continueAction, screenTitle, statusBar } from "./common"

export class Grain extends GameScene {
  private granary?: GameObjects.Graphics

  constructor() {
    super("Grain")
  }

  async create() {
    const state = getState(this)
    const result = harvest(state, state.sp)

    await this.play(state, result.vkorn)
    toLand(this.scene)
  }

  /**
   * Combined trade + distribution screen (KAISER3 #KORN then #KORNAUS). Both
   * sliders are live at once: left/right trade changes the granary and the
   * distribution bounds, and a single "Weiter" settles the trade, hands the
   * chosen amount to the people, then leaves for land.
   */
  private async play(state: GameState, vkorn: number): Promise<void> {
    const p = playerAt(state, state.sp)
    const seller = playerAt(state, state.turn.han)
    this.granary = undefined
    const group = new FocusGroup(this)
    const { content } = frame()
    statusBar(this, state, group)
    screenTitle(this, t("grain.title"), content.y)
    this.drawGranary(state, p.lkorn)

    // Required stock includes the 20% the ruler keeps (max give is 80%).
    const required = Math.trunc(state.turn.klager)
    const maxSell = Math.trunc(maxSale(state, state.sp, state.turn.han, "grain"))
    const maxBuy = Math.trunc(seller.verkorn)
    const step = 500
    // Buying more raises the price, selling more lowers it (rules-remake.md §3.7).
    const total = (v: number) =>
      Math.trunc(
        v > 0
          ? buyCost(state, state.turn.han, "grain", v)
          : sellProceeds(state, state.turn.han, "grain", -v),
      )
    const priceOf = (v: number) => `${dealPrice(state, state.turn.han, "grain", v)}`
    // Distribution bounds for the stock that results from a given trade.
    const boundsFor = (traded: number) => grainBounds({ ...p, lkorn: p.lkorn + traded })
    const neededFor = (traded: number) => {
      const { p20, p80 } = boundsFor(traded)
      return Math.max(p20, Math.min(p80, Math.min(vkorn, p80)))
    }
    const distStep = (traded: number) => {
      const { p20, p80 } = boundsFor(traded)
      return Math.max(1, Math.round(Math.max(p80 - p20, 1) / 100))
    }

    const panelW = 340
    const panel = new Panel(this, content.x + 220, content.y + 54, panelW, 316)
    const grain: StatRowOptions = { icon: drawGrainIcon }
    const rows: [string, string, StatRowOptions?][] = [
      [t("grain.rot"), `${state.turn.faul} %`, { valueColor: COLORS.danger }],
      [t(`weather.${state.wetter}` as StringKey), "", { valueColor: COLORS.info }],
      [t("grain.reserve"), `${Math.trunc(p.lkorn)}`, grain],
      [t("grain.need"), `${required}`, grain],
    ]
    rows.forEach(([labelText, value, opts], i) => {
      panel.add(
        new StatRow(this, SPACE.lg, 64 + i * 40, panelW - SPACE.lg * 2, labelText, value, opts),
      )
    })

    // Weather effect gets its own icon beside the row.
    const weatherG = this.add.graphics()
    panel.add(weatherG)
    drawWeatherIcon(weatherG, panelW - 26, 112, 26, state.wetter)

    const controlsX = content.x + 572
    const controlsW = content.w - 572
    Panel.decorate(this, controlsX, content.y + 54, controlsW, 316)

    const sliderX = controlsX + 24
    const sliderW = controlsW - 48
    const b0 = boundsFor(0)

    await new Promise<void>((resolve) => {
      let trade: Slider
      let dist: Slider
      let tradeAmount = 0
      const finish = () => {
        this.applyTrade(state, trade.value)
        giveGrain(state, state.sp, dist.value)
        resolve()
      }

      dist = new Slider(this, sliderX, content.y + 220, sliderW, 130, {
        label: t("grain.distribution"),
        min: b0.p20,
        max: b0.p80,
        step: distStep(0),
        initial: neededFor(0),
        format: (v) => `${v}`,
        // Red while giving the people less than they need.
        valueColor: (v) => (v < neededFor(tradeAmount) ? COLORS.danger : COLORS.success),
        // What the people need; the slider starts there.
        markers: [{ value: vkorn, color: COLORS.danger }],
        onSubmit: finish,
      })

      // The price per unit under the trade slider's left end, like on `Land`;
      // it follows the deal because a big deal moves the price.
      const priceY = content.y + 70 + 62
      const coin = this.add.graphics()
      drawCoinsIcon(coin, sliderX + 34, priceY + 11, 16)
      const priceText = label(this, sliderX + 48, priceY, priceOf(0), {
        mono: true,
        size: FS.heading,
      })

      // Trade needed to bring the stock up to the required amount.
      const needMark = required - Math.trunc(p.lkorn)
      trade = new Slider(this, sliderX, content.y + 70, sliderW, 130, {
        label: t("grain.trade"),
        min: -maxSell,
        max: maxBuy,
        step,
        initial: 0,
        minIcon: "minus",
        maxIcon: "plus",
        markers: [{ value: needMark, color: COLORS.danger }],
        format: (v) => (v > 0 ? `+${v}` : `${v}`),
        // Red while the resulting stock stays under the required amount.
        valueColor: (v) => (p.lkorn + v < required ? COLORS.danger : COLORS.success),
        cost: (v) => {
          if (v === 0) return ""
          return moneyLabel(v > 0 ? -total(v) : total(v))
        },
        costColor: (v) => (v > 0 && total(v) > p.geld ? COLORS.danger : COLORS.accent),
        onChange: (v) => {
          tradeAmount = v
          priceText.setText(priceOf(v))
          const b = boundsFor(v)
          dist.setRange(b.p20, b.p80, distStep(v))
          // Reset distribution default: the need, rounded up to the step so a
          // sufficient stock never shows red just from rounding down.
          const need = neededFor(v)
          const step = distStep(v)
          dist.setValue(Math.ceil(need / step) * step)
          this.drawGranary(state, p.lkorn + v)
        },
        onSubmit: finish,
      })

      trade.bind(group)
      dist.bind(group)
      continueAction(this, group, finish)
      group.focus(trade)
    })
    group.destroy()
  }

  /** KORNSPEICH (KAISER3:20490): silo filled by stock / required stock. */
  private drawGranary(state: GameState, lkorn: number): void {
    const { content } = frame()
    const w = 200
    const h = 300
    const x = content.x
    const y = content.y + 54
    if (!this.granary) this.granary = this.add.graphics()
    const g = this.granary
    g.clear()

    const bodyX = x + 24
    const bodyW = w - 48
    const bodyTop = y + 56
    const bodyBottom = y + h
    const apexY = y + 2

    // Thatched conical roof.
    g.fillStyle(0x7a5a2e, 1)
    g.fillTriangle(x + w / 2, apexY, x + 10, bodyTop, x + w - 10, bodyTop)
    g.lineStyle(1, 0x5a4020, 0.6)
    const roofH = bodyTop - apexY
    const half = (w - 20) / 2
    for (let i = 1; i <= 5; i++) {
      const t = i / 6
      const yy = apexY + roofH * t
      const hw = half * t
      g.lineBetween(x + w / 2 - hw, yy, x + w / 2 + hw, yy)
    }
    g.lineStyle(3, COLORS.woodDark, 1)
    g.strokeTriangle(x + w / 2, apexY, x + 10, bodyTop, x + w - 10, bodyTop)

    // Stone plinth under the silo.
    g.fillStyle(0x8a8578, 1)
    g.fillRoundedRect(bodyX - 6, bodyBottom - 14, bodyW + 12, 18, 2)
    g.lineStyle(2, COLORS.woodDark, 1)
    g.strokeRoundedRect(bodyX - 6, bodyBottom - 14, bodyW + 12, 18, 2)

    // Wooden wall with vertical plank seams.
    g.fillStyle(COLORS.surfaceAlt, 1)
    g.fillRoundedRect(bodyX, bodyTop, bodyW, bodyBottom - bodyTop, RADIUS)
    g.lineStyle(1, COLORS.border, 0.35)
    for (let px = bodyX + 14; px < bodyX + bodyW - 2; px += 14) {
      g.lineBetween(px, bodyTop + 3, px, bodyBottom - 15)
    }

    const klager = state.turn.klager
    const frac = klager > 0 ? Math.min(1, lkorn / klager) : 0
    const innerTop = bodyTop + 6
    const innerBottom = bodyBottom - 16
    const fillH = (innerBottom - innerTop) * frac
    if (fillH > 0) {
      const fy = innerBottom - fillH
      g.fillStyle(COLORS.accent, 1)
      g.fillRect(bodyX + 2, fy, bodyW - 4, fillH)
      // Grain texture.
      g.fillStyle(0x8a6b1f, 0.45)
      for (let i = 0; i < Math.min(60, Math.floor(fillH / 5)); i++) {
        const gx = bodyX + 6 + ((i * 37) % (bodyW - 12))
        const gy = fy + 4 + ((i * 53) % Math.max(1, fillH - 6))
        g.fillCircle(gx, gy, 1.4)
      }
      // Heaped surface: a row of rounded grains at the fill line.
      g.fillStyle(COLORS.accentHover, 0.9)
      for (let gx = bodyX + 8; gx < bodyX + bodyW - 6; gx += 7) {
        g.fillCircle(gx, fy + 1, 4)
      }
    }

    // Fill-level ticks (25/50/75 %).
    g.lineStyle(1, COLORS.woodDark, 0.5)
    for (let i = 1; i < 4; i++) {
      const ty = innerBottom - (innerBottom - innerTop) * (i / 4)
      g.lineBetween(bodyX + 2, ty, bodyX + 12, ty)
    }

    g.lineStyle(3, COLORS.woodDark, 1)
    g.strokeRoundedRect(bodyX, bodyTop, bodyW, bodyBottom - bodyTop, RADIUS)
  }

  private applyTrade(state: GameState, amount: number): void {
    const traded = tradeGrain(state, state.sp, state.turn.han, amount)
    if (traded > 0 && amount > 0) playCoins()
  }
}
