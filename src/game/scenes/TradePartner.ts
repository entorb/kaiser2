import { toGrain } from "../flow";
import { t } from "../i18n/i18n";
import { at } from "../lookup";
import { playerColor } from "../model/constants";
import { getState } from "../model/session";
import {
  refreshEmperorStock,
  shownPrice,
  updateEmperorPrices,
} from "../model/trade";
import { type GameState, playerAt } from "../model/types";
import { FocusGroup } from "../ui/focus";
import {
  drawAcreIcon,
  drawBuildingIcon,
  drawCoinsIcon,
  drawGrainIcon,
} from "../ui/icon";
import { frame } from "../ui/layout";
import { COLORS, SPACE } from "../ui/theme";
import { type ListCell, type ListItem, ListMenu, Panel } from "../ui/widgets";
import { GameScene } from "./base";
import { actionFooter, screenTitle, statusBar } from "./common";

export class TradePartner extends GameScene {
  constructor() {
    super("TradePartner");
  }

  async create() {
    const state = getState(this);
    refreshEmperorStock(state);
    updateEmperorPrices(state, state.sp);

    // Single player: the Emperor is the only counterparty (KAISER3 HANDEL).
    if (state.count <= 1) {
      this.finish(state, 0);
      return;
    }

    let chosen = -1;
    while (chosen < 0) {
      this.clearScreen();
      const group = new FocusGroup(this);
      const { content } = frame();
      statusBar(this, state, group);
      screenTitle(this, t("partner.title"), content.y);

      // A table: one row per partner, the three goods' prices as icon columns.
      const top = content.y + 54;
      const panel = new Panel(this, content.x, top, content.w, content.h - 54);
      const tableW = content.w - SPACE.lg * 2;
      // Per good: the price (coin first) and the most the partner offers.
      const groupX = [0, 1, 2].map((i) => 250 + (620 * (i + 0.5)) / 3);
      const cellX = groupX.flatMap((x) => [x - 45, x + 55]);
      const g = this.add.graphics();
      [drawGrainIcon, drawAcreIcon, drawBuildingIcon].forEach((draw, c) => {
        draw(g, SPACE.lg + at(groupX, c), 32, 28);
      });
      panel.add(g);
      const rule = this.add.graphics();
      rule.lineStyle(1, COLORS.border, 0.5);
      rule.lineBetween(SPACE.lg, 56, SPACE.lg + tableW, 56);
      panel.add(rule);
      const footer = actionFooter(
        this,
        state.rules === "remake" ? t("partner.bid") : "",
      );

      const cellPair = (price: number, offer: number): ListCell[] => [
        { text: `${price}`, icon: drawCoinsIcon },
        { text: `${t("partner.max")} ${Math.trunc(offer)}`, muted: true },
      ];
      const items: ListItem[] = [];
      const ids: number[] = [];
      for (let w = 0; w <= state.count; w++) {
        if (w === state.sp) continue;
        const p = playerAt(state, w);
        items.push({
          label: w === 0 ? "der Kaiser" : p.name,
          cells: [
            ...cellPair(p.kpreis, p.verkorn),
            ...cellPair(shownPrice("acker", p.apreis), p.verAcker),
            ...cellPair(shownPrice("land", p.lpreis), p.verBau),
          ],
          color: playerColor(p.portrait),
        });
        ids.push(w);
      }

      const idx = await new Promise<number>((resolve) => {
        const menu = new ListMenu(
          this,
          content.x + SPACE.lg,
          top + 68,
          tableW,
          items,
          { rowH: 48, gap: 8, cellX, onSelect: resolve },
        );
        menu.bind(group);
        group.focus(menu);
      });
      footer.destroy();
      group.destroy();
      chosen = at(ids, idx);
    }

    this.finish(state, chosen);
  }

  /** Store the chosen partner and continue. */
  private finish(state: GameState, chosen: number): void {
    state.turn.han = chosen;
    toGrain(this.scene);
  }
}
