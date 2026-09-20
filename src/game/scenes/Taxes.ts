import { toTradeData } from "../flow"
import { t } from "../i18n/i18n"
import { at } from "../lookup"
import { stateIncome } from "../model/rules"
import { getState } from "../model/session"
import { fedFactor, taxBreakdown, UNREST_LIMIT, unrest, unrestLevel } from "../model/tax"
import { type GameState, type PlayerState, playerAt } from "../model/types"
import { FocusGroup } from "../ui/focus"
import { drawCoinsIcon } from "../ui/icon"
import { frame } from "../ui/layout"
import { label } from "../ui/text"
import { COLORS, SPACE } from "../ui/theme"
import { Panel, SegmentedControl, Slider, StatRow } from "../ui/widgets"
import { GameScene } from "./base"
import { continueAction, panelFigure, screenTitle, statusBar } from "./common"

/** Gauge color per `unrestLevel`. */
const MOOD_COLORS = [COLORS.success, COLORS.accent, COLORS.danger, COLORS.danger] as const

/** Height of a titled panel's heading (title plus rule). */
const TITLE_H = 28

export class Taxes extends GameScene {
  constructor() {
    super("Taxes")
  }

  async create() {
    const state = getState(this)
    const p = playerAt(state, state.sp)
    const remake = state.rules === "remake"
    const parts = taxBreakdown(state, p)
    const se = stateIncome(state, state.sp)

    const group = new FocusGroup(this)
    const { content } = frame()
    statusBar(this, state, group)
    screenTitle(this, t("tax.title"), content.y)

    // Two boxes: this year's income (read-only) and next year's tax inputs.
    const top = content.y + 54
    const h = content.h - 54
    const incomeW = 300
    const income = new Panel(this, content.x, top, incomeW, h, t("tax.income"))
    panelFigure(
      this,
      income,
      remake ? 96 : (h + TITLE_H) / 2,
      `${se}`,
      COLORS.accent,
      drawCoinsIcon,
    )
    if (remake) this.incomeRows(income, state, parts)
    const panelW = content.w - incomeW - SPACE.lg
    const panel = new Panel(this, content.x + incomeW + SPACE.lg, top, panelW, h, t("tax.nextYear"))

    let finish!: () => void
    const done = new Promise<void>((resolve) => {
      finish = resolve
    })

    // Remake taxes people (EIN) and buildings (MWST); customs are unused.
    const fields: [string, number, (v: number) => void][] = remake
      ? [
          [t("tax.headTax"), p.ein, (v) => (p.ein = v)],
          [t("tax.buildingTax"), p.mwst, (v) => (p.mwst = v)],
        ]
      : [
          [t("tax.customs"), p.zoll, (v) => (p.zoll = v)],
          [t("tax.vat"), p.mwst, (v) => (p.mwst = v)],
          [t("tax.incomeTax"), p.ein, (v) => (p.ein = v)],
        ]
    const justiceY = 56 + fields.length * 58 + 6
    const refresh = remake ? this.preview(panel, state, p, justiceY + 60) : () => {}
    fields.forEach(([text, value, set], i) => {
      const y = 56 + i * 58
      const field = new Slider(this, SPACE.lg, y, panelW - SPACE.lg * 2, 52, {
        label: text,
        min: 0,
        max: 99,
        initial: value,
        format: (v) => `${v} %`,
        onChange: (v) => {
          set(v)
          refresh()
        },
        onSubmit: finish,
      })
      panel.add(field)
      field.bind(group)
    })

    panel.add(
      label(this, SPACE.lg, justiceY + 14, t("tax.justice"), {
        color: COLORS.muted,
      }),
    )
    const justice = new SegmentedControl(
      this,
      panelW - SPACE.lg - 460,
      justiceY,
      460,
      56,
      [t("justice.1"), t("justice.2"), t("justice.3"), t("justice.4")],
      {
        selected: p.justiz - 1,
        onChange: (i) => {
          p.justiz = i + 1
          refresh()
        },
        onSubmit: finish,
      },
    )
    panel.add(justice)
    justice.bind(group)

    refresh()
    continueAction(this, group, finish)
    await done
    group.destroy()

    toTradeData(this.scene)
  }

  /** Remake: this year's income split by source, and how well fed people pay. */
  private incomeRows(panel: Panel, state: GameState, parts: ReturnType<typeof taxBreakdown>): void {
    const rows: [string, string][] = [
      [t("tax.headTax"), `${parts.head}`],
      [t("tax.buildingTax"), `${parts.building}`],
      [t("tax.fines"), `${parts.fines}`],
      [t("tax.fed"), `${Math.round(fedFactor(state) * 100)} %`],
    ]
    rows.forEach(([name, value], i) => {
      panel.add(
        new StatRow(this, SPACE.lg, 150 + i * 32, panel.w - SPACE.lg * 2, name, value, {
          valueColor: i === 3 ? COLORS.muted : COLORS.text,
        }),
      )
    })
  }

  /**
   * Remake: live forecast of next year's income and the unrest gauge, so the
   * quadratic penalty is visible before it costs people. Returns the refresh.
   */
  private preview(panel: Panel, state: GameState, p: PlayerState, y: number): () => void {
    const right = panel.w - SPACE.lg
    panel.add(label(this, SPACE.lg, y, t("tax.forecast"), { color: COLORS.muted }))
    const total = label(this, right, y, "", {
      color: COLORS.accent,
      mono: true,
      weight: "bold",
    }).setOrigin(1, 0)
    panel.add(total)

    const rowY = y + 34
    panel.add(label(this, SPACE.lg, rowY, t("tax.mood"), { color: COLORS.muted }))
    // The mood gauge starts where the forecast label ends and both end at the
    // panel's right edge, so the bar lines up with the figure above it.
    const gaugeX = SPACE.lg + 130
    const gaugeW = right - gaugeX
    const gauge = this.add.graphics()
    panel.add(gauge)

    return () => {
      total.setText(`${taxBreakdown(state, p).total}`)
      const u = unrest(p)
      const level = unrestLevel(u)
      const color = at(MOOD_COLORS, level)
      gauge.clear()
      drawCoinsIcon(gauge, right - total.width - 20, y + 13, 26)
      gauge.fillStyle(COLORS.surfaceAlt, 1)
      gauge.fillRect(gaugeX, rowY + 5, gaugeW, 16)
      gauge.fillStyle(color, 1)
      gauge.fillRect(gaugeX, rowY + 5, gaugeW * Math.min(1, u / UNREST_LIMIT), 16)
      gauge.lineStyle(1, COLORS.border, 1)
      gauge.strokeRect(gaugeX, rowY + 5, gaugeW, 16)
    }
  }
}
