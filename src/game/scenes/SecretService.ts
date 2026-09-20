import { playCoins } from "../audio/music"
import { t } from "../i18n/i18n"
import { at } from "../lookup"
import { distributeGuards, type GuardKind, guardsInBuilding, resolveSabotage } from "../model/rules"
import { getState } from "../model/session"
import { type GameState, playerAt, rand } from "../model/types"
import { alert, chooseList, sliderPrompt } from "../ui/dialog"
import { FocusGroup } from "../ui/focus"
import {
  drawCoinsIcon,
  drawEventIcon,
  drawKontorIcon,
  drawPalaceIcon,
  drawShield,
  type IconDraw,
} from "../ui/icon"
import { frame } from "../ui/layout"
import { SPACE } from "../ui/theme"
import { type ListItem, ListMenu, Panel, StatRow } from "../ui/widgets"
import { GameScene } from "./base"
import { actionFooter, primaryAction, screenTitle, statusBar } from "./common"

type Building = GuardKind

export class SecretService extends GameScene {
  constructor() {
    super("SecretService")
  }

  async create() {
    const state = getState(this)
    const p = playerAt(state, state.sp)
    const infP = 500 + rand(100)
    const artP = 600 + rand(100)
    const kavP = 100 + rand(50)
    const manP = 200 + rand(80)

    let done = false
    while (!done) {
      this.clearScreen()
      const group = new FocusGroup(this)
      const { content } = frame()
      statusBar(this, state, group)
      screenTitle(this, t("secret.title"), content.y)

      const panelW = 430
      const panel = new Panel(this, content.x, content.y + 54, panelW, content.h - 54)
      // Head counts, each followed by its current training level.
      const rows: [string, string][] = [
        [t("secret.guards"), `${p.infant}`],
        [t("secret.guardLevel"), `${p.kavall}`],
        [t("secret.saboteurs"), `${p.artell}`],
        [t("secret.saboteurLevel"), `${p.manov}`],
      ]
      rows.forEach(([labelText, value], i) => {
        panel.add(new StatRow(this, SPACE.lg, 64 + i * 46, panelW - SPACE.lg * 2, labelText, value))
      })

      const trainG = kavP * p.infant
      const trainS = manP * p.artell
      const options: ListItem[] = [
        {
          label: t("secret.hireGuards"),
          value: `${infP}`,
          valueIcon: drawCoinsIcon,
          disabled: p.geld < infP,
        },
        {
          label: t("secret.hireSaboteurs"),
          value: `${artP}`,
          valueIcon: drawCoinsIcon,
          disabled: p.geld < artP,
        },
        {
          label: t("secret.trainGuards"),
          value: `${trainG}`,
          valueIcon: drawCoinsIcon,
          disabled: p.infant <= 0 || p.geld < trainG,
        },
        {
          label: t("secret.trainSaboteurs"),
          value: `${trainS}`,
          valueIcon: drawCoinsIcon,
          disabled: p.artell <= 0 || p.geld < trainS,
        },
        {
          label: t("secret.operations"),
          icon: (g, x, y, size) => drawEventIcon(g, x, y, size, "spy"),
          disabled: p.artell <= 0,
        },
      ]

      // Footer: what the highlighted action does (training raises the strength
      // multiplier used in sabotage resolution).
      const footer = actionFooter(this, "")
      const hints = [
        t("secret.hireGuardsHint"),
        t("secret.hireSaboteursHint"),
        t("secret.trainGuardsHint"),
        t("secret.trainSaboteursHint"),
        t("secret.operationsHint"),
      ]
      footer.setText(at(hints, 0))

      const menuW = 420
      const choice = await new Promise<number>((resolve) => {
        const menu = new ListMenu(
          this,
          content.x + content.w - menuW,
          content.y + 54,
          menuW,
          options,
          {
            rowH: 52,
            gap: 8,
            onSelect: resolve,
            onChange: (i) => footer.setText(hints[i] ?? ""),
          },
        )
        menu.bind(group)
        // "Zurück" is the shared bottom action button, like every other screen.
        primaryAction(this, group, t("common.back"), () => resolve(-1))
      })
      group.destroy()

      if (choice === 0) {
        playCoins()
        p.infant++
        p.geld -= infP
      } else if (choice === 1) {
        playCoins()
        p.artell++
        p.geld -= artP
      } else if (choice === 2) {
        playCoins()
        p.kavall++
        p.geld -= kavP * p.infant
      } else if (choice === 3) {
        playCoins()
        p.manov++
        p.geld -= manP * p.artell
      } else if (choice === 4) {
        if (p.artell > 0) await this.operate(state)
      } else {
        done = true
      }
    }

    this.scene.start("Business")
  }

  private async operate(state: GameState): Promise<void> {
    const p = playerAt(state, state.sp)
    const names: ListItem[] = []
    const indices: number[] = []
    for (let i = 1; i <= state.count; i++) {
      if (i === state.sp) continue
      const { name, portrait } = playerAt(state, i)
      names.push({
        label: name,
        icon: (g, x, y, size) => drawShield(g, x, y, size, portrait),
      })
      indices.push(i)
    }
    names.push({ label: t("secret.nobody") })

    const who = await chooseList(this, t("secret.target"), names, {
      cancel: true,
    })
    const targetIndex = indices[who]
    if (targetIndex === undefined) return
    const target = playerAt(state, targetIndex)

    const kinds: Building[] = ["muhl", "markt", "hh", "burg"]
    const counts = [target.muhl, target.markt, target.hh, target.burg]
    const labels = [t("business.mill"), t("business.market"), t("secret.house"), t("secret.palace")]
    const icons: IconDraw[] = [
      (g, x, y, size) => drawEventIcon(g, x, y, size, "mill"),
      (g, x, y, size) => drawEventIcon(g, x, y, size, "market"),
      drawKontorIcon,
      drawPalaceIcon,
    ]
    const kind = await chooseList(
      this,
      t("secret.building"),
      labels.map((label, i) => ({
        label: `${label} (${counts[i]})`,
        icon: at(icons, i),
        disabled: (counts[i] ?? 0) <= 0,
      })),
      { cancel: true },
    )
    if (kind < 0) return
    const building = at(kinds, kind)

    // KAISER5:1630 - inspecting a building costs SPPI = RAND(500)+TITEL*500.
    playCoins()
    p.geld -= rand(500) + p.titel * 500

    // KAISER5:920-1270 - the defender's guards are spread over the buildings;
    // the spy picks the weakest one, whose guards form the defence (WW).
    const guards = guardsInBuilding(distributeGuards(target), building)

    // A single saboteur needs no choice (and a one-value slider has no track).
    const used =
      p.artell <= 1
        ? p.artell
        : await sliderPrompt(this, {
            title: t("secret.amount"),
            min: 1,
            max: p.artell,
            initial: p.artell,
            minLabel: "1",
            maxLabel: `${p.artell}`,
          })
    if (used <= 0) return

    const res = resolveSabotage(p, target, used, guards)
    p.artell -= used // consumed either way (source only on failure; see bugs)

    if (res.success) {
      this.applyGains(state, building, target)
      // KAISER5:2120 - the guards in the razed building are killed.
      target.infant = Math.max(0, target.infant - guards)
      await alert(this, t("secret.success"))
    } else {
      await alert(this, t("secret.failed"))
    }
  }

  private applyGains(
    state: GameState,
    building: Building,
    target: GameState["players"][number],
  ): void {
    const p = playerAt(state, state.sp)
    let lg = 0
    let gg = 0
    let kg = 0
    if (building === "muhl") {
      lg = 1000 + rand(500)
      gg = 800 + rand(200)
      kg = 2000 + rand(1000)
      target.muhl = Math.max(0, target.muhl - 1)
    } else if (building === "markt") {
      lg = 2000
      gg = 1600 + rand(400)
      kg = 4000 + rand(2000)
      target.markt = Math.max(0, target.markt - 1)
    } else if (building === "hh") {
      lg = 500 + rand(200)
      gg = 5600 + rand(900)
      kg = 1000 + rand(500)
      target.hh = Math.max(0, target.hh - 1)
    } else {
      lg = 1500 + rand(500)
      gg = 3000 + rand(1000)
      kg = 1500 + rand(800)
      target.burg = Math.max(0, target.burg - 1)
    }

    p.geld += gg
    p.lkorn += kg
    p.land += Math.trunc(lg / 2)
    p.acker += Math.trunc(lg / 2)
    target.geld -= gg
    target.lkorn = Math.max(0, target.lkorn - kg)
    target.land = Math.max(0, target.land - Math.trunc(lg / 2))
    target.acker = Math.max(0, target.acker - Math.trunc(lg / 2))
  }
}
