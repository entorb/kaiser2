import { toGrain } from "../flow";
import { t } from "../i18n/i18n";
import { playerColor } from "../model/constants";
import { getState } from "../model/session";
import { type GameState, rand } from "../model/types";
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
    this.updateKaiserPrices();
    this.refreshKaiserStock(state);

    // Single player: the Emperor is the only counterparty (KAISER3 HANDEL).
    if (state.count <= 1) {
      this.finish(state, 0);
      return;
    }

    let chosen = -1;
    while (chosen < 0) {
      this.children.removeAll();
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
        draw(g, SPACE.lg + groupX[c], 32, 28);
      });
      panel.add(g);
      const rule = this.add.graphics();
      rule.lineStyle(1, COLORS.border, 0.5);
      rule.lineBetween(SPACE.lg, 56, SPACE.lg + tableW, 56);
      panel.add(rule);
      const footer = actionFooter(this, t("partner.hint"));

      const cellPair = (price: number, offer: number): ListCell[] => [
        { text: `${price}`, icon: drawCoinsIcon },
        { text: `${t("partner.max")} ${Math.trunc(offer)}`, muted: true },
      ];
      const items: ListItem[] = [];
      const ids: number[] = [];
      for (let w = 0; w <= state.count; w++) {
        if (w === state.sp) continue;
        const p = state.players[w];
        items.push({
          label: w === 0 ? "der Kaiser" : p.name,
          cells: [
            ...cellPair(p.kpreis, p.verkorn),
            ...cellPair(p.apreis, p.verAcker),
            ...cellPair(p.lpreis, p.verBau),
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
      chosen = ids[idx];
    }

    this.finish(state, chosen);
  }

  /** Store the chosen partner and continue. */
  private finish(state: GameState, chosen: number): void {
    state.turn.han = chosen;
    toGrain(this.scene);
  }

  /** The Emperor's stock for this round; his offer is shown on the table. */
  private refreshKaiserStock(state: GameState): void {
    const kaiser = state.players[0];
    kaiser.verkorn = 8000 * state.wetter + rand(1000);
    kaiser.lkorn = kaiser.verkorn;
    kaiser.acker = 2000 * rand(10);
    kaiser.verAcker = kaiser.acker;
    kaiser.land = 2000 * rand(10);
    kaiser.verBau = kaiser.land;
  }

  /** KAISER3:20970-21041 - the Emperor's prices track the players' average. */
  private updateKaiserPrices(): void {
    const state = getState(this);
    const kaiser = state.players[0];
    let kp = 0;
    let ap = 0;
    let lp = 0;
    for (let u = 1; u <= state.count; u++) {
      kp += state.players[u].kpreis;
      ap += state.players[u].apreis;
      lp += state.players[u].lpreis;
    }
    const avgK = Math.trunc(kp / state.count);
    const avgA = Math.trunc(ap / state.count);
    const avgL = Math.trunc(lp / state.count);
    kaiser.kpreis =
      avgK + rand(Math.trunc(avgK / 5)) - rand(Math.trunc(avgK / 5));
    if (kaiser.kpreis < 80) kaiser.kpreis = 80 + rand(10);
    // Land prices are per 1000 ha, i.e. 100x the original per-10-ha figures.
    kaiser.apreis =
      avgA + rand(Math.trunc(avgA / 10)) - rand(Math.trunc(avgA / 10));
    if (kaiser.apreis < 1600) kaiser.apreis = 1600 + rand(1000);
    kaiser.lpreis =
      avgL + rand(Math.trunc(avgL / 10)) - rand(Math.trunc(avgL / 10));
    if (kaiser.lpreis < 1600) kaiser.lpreis = 1600 + rand(1000);
  }
}
