import { playCoins } from "../audio/music"
import { toCoronation, toPartner } from "../flow"
import { t } from "../i18n/i18n"
import { type ComputerEvent, playComputerTurn } from "../model/ai"
import type { BuildingKind } from "../model/constants"
import { expropriate, taxDemotion } from "../model/events"
import {
  canLeaseHouse,
  crewNeeded,
  leaseHouse,
  leasePrice,
  STAFF_PER_HOUSE,
  tributePoints,
  tributeVerdict,
} from "../model/houses"
import { tradeHouse } from "../model/rules"
import { getState } from "../model/session"
import { type GameState, type PlayerState, playerAt } from "../model/types"
import { type AlertLine, alert, sliderPrompt } from "../ui/dialog"
import { FocusGroup } from "../ui/focus"
import {
  drawAcreIcon,
  drawCoinsIcon,
  drawCrowdIcon,
  drawEventIcon,
  drawKontorIcon,
  drawPointsIcon,
  type IconDraw,
} from "../ui/icon"
import { frame } from "../ui/layout"
import { COLORS, SPACE } from "../ui/theme"
import {
  type ListItem,
  ListMenu,
  moneyLabel,
  Panel,
  StatRow,
  type StatRowOptions,
} from "../ui/widgets"
import { GameScene } from "./base"
import {
  actionFooter,
  BUILDING_ICON,
  closeTurn,
  continueAction,
  screenTitle,
  statusBar,
  titleName,
} from "./common"

/** The alert must fit the 576 px screen: 190 px of frame plus 30 px a line. */
const MAX_NOTICES = 10
/** Icon leading each computer-turn event line. */
const EVENT_LINE_ICON: Record<ComputerEvent, IconDraw> = {
  demoted: drawPointsIcon,
  seized: drawKontorIcon,
  pawn: drawCoinsIcon,
  deposedLand: drawAcreIcon,
  deposedTax: drawPointsIcon,
  death: (g, x, y, size) => drawEventIcon(g, x, y, size, "died"),
}
const GOOD_LABEL = {
  grain: "grain.title",
  acker: "land.acre",
  land: "land.building",
} as const

export class TradingHouse extends GameScene {
  constructor() {
    super("TradingHouse")
  }

  async create() {
    const state = getState(this)
    const p = playerAt(state, state.sp)
    if (p.ai) {
      await this.computerTurn(state, p)
      return
    }
    await this.showNotices(p)
    // KAISERB:53 - a tax burden over 80% demotes and suspends at turn start.
    if (taxDemotion(p, state.rules)) {
      await alert(this, t("business.demoted"), [t("business.demotedText")])
    }
    // Trading houses are only available from Landgraf up (KAISERB:54).
    if (p.titel <= 1) {
      toPartner(this.scene)
      return
    }

    const { zahl, gew } = tradeHouse(state, state.sp)
    let leased = false
    let done = false

    // Tribute is the first order of business: the popup opens right away, so
    // it has no menu entry (and can only be paid once per turn).
    await this.payTribute(state, zahl)

    // Like every screen the focus starts on the next button; after buying a
    // house it moves to the servants.
    let focusServants = false
    while (!done) {
      const choice = await this.chooseAction(state, gew, leased, focusServants)
      focusServants = false

      if (choice === "servants") {
        // One combined slider like grain/land: left = dismiss, right = hire.
        const v = await this.servantPrompt(p, crewNeeded(p, state.rules))
        state.turn.neu = Math.max(0, v)
        state.turn.alt = Math.max(0, -v)
      } else if (choice === "lease") {
        if (leaseHouse(state, state.sp)) {
          playCoins()
          leased = true
          focusServants = true
        }
      } else {
        done = true
      }
    }

    p.bd += state.turn.neu - state.turn.alt
    p.punkte += tributePoints(state, state.turn.abg, zahl)
    // KAISERB:620 EXEC ENT - the Emperor may confiscate a house.
    if (expropriate(state, state.sp)) {
      await alert(this, t("trade.expropriation"), [
        t(state.rules === "remake" ? "trade.expropriationTextRemake" : "trade.expropriationText"),
      ])
    }
    toPartner(this.scene)
  }

  /** Remake: what other rulers traded with this one since their last turn. */
  private async showNotices(p: PlayerState): Promise<void> {
    const notices = p.notices ?? []
    delete p.notices
    if (notices.length === 0) return
    const lines = notices.slice(0, MAX_NOTICES).map((n) =>
      t(n.sold ? "trade.noticeSold" : "trade.noticeBought", {
        who: n.who,
        units: Math.trunc(n.units),
        good: t(GOOD_LABEL[n.good]),
        money: Math.trunc(n.money),
      }),
    )
    if (notices.length > MAX_NOTICES)
      lines.push(t("trade.noticeMore", { n: notices.length - MAX_NOTICES }))
    await alert(this, t("trade.noticeTitle"), lines)
  }

  /** A computer ruler plays the whole turn; the humans get a short report. */
  private async computerTurn(state: GameState, p: PlayerState): Promise<void> {
    const report = playComputerTurn(state, state.sp)
    const group = new FocusGroup(this)
    statusBar(this, state, group)
    const name = { name: p.name }
    const lines: AlertLine[] = [
      { icon: drawCrowdIcon, text: `${Math.trunc(p.leute)}` },
      { icon: drawCoinsIcon, text: `${Math.trunc(p.geld)}` },
      { icon: drawPointsIcon, text: titleName(p.titel) },
    ]
    for (const kind of Object.keys(report.built) as BuildingKind[]) {
      if (report.built[kind] > 0)
        lines.push({
          icon: BUILDING_ICON[kind],
          text: `${report.built[kind]}×`,
        })
    }
    if (report.leased > 0) lines.push({ icon: drawKontorIcon, text: "1×" })
    for (const event of report.events)
      lines.push({
        icon: EVENT_LINE_ICON[event],
        text: t(`ai.${event}`, name),
      })
    const levelLabel = t(`level.${p.ai ?? "medium"}`)
    await alert(this, `${p.name} (${levelLabel})`, lines)
    group.destroy()
    if (report.won) {
      toCoronation(this.scene, name)
      return
    }
    closeTurn(this, state, p, report.promoted)
  }

  /** One menu pass: redraw the stats, let the player pick, return the choice. */
  private async chooseAction(
    state: GameState,
    gew: number,
    leased: boolean,
    focusServants: boolean,
  ): Promise<"lease" | "servants" | "done"> {
    const p = playerAt(state, state.sp)
    this.clearScreen()
    const group = new FocusGroup(this)
    const { content } = frame()
    statusBar(this, state, group)
    screenTitle(this, t("trade.title"), content.y)

    const needed = crewNeeded(p, state.rules)
    const staffNow = p.bd + state.turn.neu - state.turn.alt
    const understaffed = needed > 0 && staffNow < needed
    // Annual wage bill: 50 taler per servant (KAISERB:1190).
    const wages = staffNow * 50

    const panelW = 430
    const panel = new Panel(this, content.x, content.y + 54, panelW, content.h - 54)
    const money: StatRowOptions = { icon: drawCoinsIcon }
    const rows: [string, string, StatRowOptions?][] = [
      [t("trade.houses"), `${p.hh}`, { icon: drawKontorIcon }],
      [
        t("trade.servants"),
        `${staffNow}`,
        {
          icon: drawCrowdIcon,
          valueColor: understaffed ? COLORS.danger : undefined,
        },
      ],
      [t("trade.wages"), `${wages}`, money],
      [t("trade.profit"), `${gew}`, money],
    ]
    rows.forEach(([labelText, value, opts], i) => {
      panel.add(
        new StatRow(this, SPACE.lg, 64 + i * 40, panelW - SPACE.lg * 2, labelText, value, opts),
      )
    })

    // Buying comes first, and only while the price is covered (grey otherwise).
    // Servants are greyed while the houses are fully staffed (or none exist).
    const price = leasePrice(p, state.rules)
    const staffed = staffNow === needed
    const entries: { id: "lease" | "servants"; item: ListItem }[] = []
    if (!leased)
      entries.push({
        id: "lease",
        item: {
          label: t("trade.rent", { price }),
          disabled: !canLeaseHouse(state, state.sp),
        },
      })
    entries.push({
      id: "servants",
      item: {
        label: t("trade.servants"),
        value: `${staffNow}`,
        disabled: staffed,
      },
    })

    // Footer: what the highlighted action does.
    const footer = actionFooter(this, "")
    const describe = (index: number): string => {
      const id = entries[index]?.id
      if (id === "servants") return this.staffHint(state, p, needed, staffNow)
      return ""
    }
    footer.setText(describe(0))

    const choice = await this.choose(
      group,
      entries.map((e) => e.item),
      content,
      (i) => footer.setText(describe(i)),
      focusServants && !staffed,
    )
    group.destroy()
    return entries[choice]?.id ?? "done"
  }

  /** Footer text for the servants entry. */
  private staffHint(state: GameState, p: PlayerState, needed: number, staffNow: number): string {
    if (needed === 0) return t("trade.staffNoHouse")
    if (state.rules !== "remake") return t("trade.staffHint", { need: needed })
    const staffed = Math.min(p.hh, staffNow / STAFF_PER_HOUSE)
    return t("trade.staffHintRemake", {
      per: STAFF_PER_HOUSE,
      staffed: staffed.toFixed(1),
      hh: p.hh,
    })
  }

  /** Hire/fire slider: positive hires, negative fires. Returns the delta. */
  private servantPrompt(p: PlayerState, needed: number): Promise<number> {
    return sliderPrompt(this, {
      title: t("trade.servants"),
      min: -Math.trunc(p.bd),
      // Hire at most what the houses still need.
      max: Math.max(0, needed - p.bd),
      step: 1,
      initial: 0,
      minLabel: t("trade.fire"),
      maxLabel: t("trade.hire"),
      format: (v) => (v > 0 ? `+${v}` : `${v}`),
      info: (v) => `${t("trade.servants")}: ${p.bd + v}`,
      infoColor: (v) => (needed > 0 && p.bd + v < needed ? COLORS.danger : COLORS.success),
    })
  }

  /** Tribute popup. Red marker on the demanded sum; 0 (refusal) allowed. */
  private async payTribute(state: GameState, zahl: number): Promise<void> {
    const p = playerAt(state, state.sp)
    // Remake: more than the demand earns nothing, so the slider stops there.
    const cash = Math.max(0, Math.trunc(p.geld))
    const budget = state.rules === "remake" ? Math.min(cash, zahl) : cash
    const n = await sliderPrompt(this, {
      title: t("trade.tributeTitle", { zahl }),
      min: 0,
      max: budget,
      step: 100,
      // Open at the minimum the Emperor expects.
      initial: Math.min(budget, zahl),
      minLabel: "0",
      maxLabel: `${budget}`,
      format: (v) => `${v}`,
      valueIcon: drawCoinsIcon,
      cost: (v) => (v === 0 ? "" : moneyLabel(-v)),
      costColor: (v) => (v >= zahl ? COLORS.success : COLORS.danger),
      ...(state.rules === "remake"
        ? this.verdictOptions(zahl)
        : { markers: [{ value: zahl, color: COLORS.danger }] }),
    })
    if (n > 0) {
      playCoins()
      state.turn.abg += n
      p.geld -= n
    }
  }

  /** Remake tribute slider: guide lines where the verdict changes, and the verdict live. */
  private verdictOptions(zahl: number) {
    const color = {
      pleased: COLORS.success,
      tolerated: COLORS.muted,
      displeased: COLORS.accent,
      insulted: COLORS.danger,
    }
    const words = {
      pleased: t("trade.verdictPleased"),
      tolerated: t("trade.verdictTolerated"),
      displeased: t("trade.verdictDispleased"),
      insulted: t("trade.verdictInsulted"),
    }
    return {
      markers: [
        { value: zahl * 0.2, color: COLORS.danger },
        { value: zahl * 0.5, color: COLORS.accent },
        { value: zahl, color: COLORS.success },
      ],
      info: (v: number) => {
        const { verdict, points } = tributeVerdict(v, zahl)
        if (points === 0) return words[verdict]
        const sign = points > 0 ? "+" : ""
        return `${words[verdict]} (${sign}${points})`
      },
      infoColor: (v: number) => color[tributeVerdict(v, zahl).verdict],
    }
  }

  private choose(
    group: FocusGroup,
    options: ListItem[],
    content: { x: number; y: number; w: number },
    onChange: (index: number) => void,
    focusMenu: boolean,
  ): Promise<number> {
    const menuW = 420
    const x = content.x + content.w - menuW
    return new Promise((resolve) => {
      const menu = new ListMenu(this, x, content.y + 54, menuW, options, {
        rowH: 56,
        gap: 8,
        onSelect: resolve,
        onChange,
      })
      menu.bind(group)
      // The common next button lives in the shared bottom action bar.
      const next = continueAction(this, group, () => resolve(-1))
      group.focus(focusMenu ? menu : next)
    })
  }
}
