import { toGrain } from "../flow";
import { t } from "../i18n/i18n";
import { playerColor } from "../model/constants";
import { getState } from "../model/session";
import { type GameState, rand } from "../model/types";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { type ListItem, ListMenu } from "../ui/widgets";
import { GameScene } from "./base";
import { screenTitle, statusBar } from "./common";

export class Partner extends GameScene {
  constructor() {
    super("Partner");
  }

  async create() {
    const state = getState(this);
    this.updateKaiserPrices();

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

      const items: ListItem[] = [];
      const ids: number[] = [];
      for (let w = 0; w <= state.count; w++) {
        if (w === state.sp) continue;
        const p = state.players[w];
        const name = w === 0 ? "der Kaiser" : p.name;
        items.push({
          label: name,
          value: `Korn ${p.kpreis}   Land ${p.lpreis}   Acker ${p.apreis}`,
          color: playerColor(p.portrait),
        });
        ids.push(w);
      }

      const menuW = 640;
      const idx = await new Promise<number>((resolve) => {
        const menu = new ListMenu(
          this,
          content.x + (content.w - menuW) / 2,
          content.y + 54,
          menuW,
          items,
          { rowH: 48, gap: 8, onSelect: resolve },
        );
        menu.bind(group);
      });
      group.destroy();
      chosen = ids[idx];
    }

    this.finish(state, chosen);
  }

  /** Store the chosen partner, refresh the Emperor's stock and continue. */
  private finish(state: GameState, chosen: number): void {
    state.turn.han = chosen;
    const kaiser = state.players[0];
    kaiser.verkorn = 8000 * state.wetter + rand(1000);
    kaiser.lkorn = kaiser.verkorn;
    kaiser.acker = 2000 * rand(10);
    kaiser.verAcker = kaiser.acker;
    kaiser.land = 2000 * rand(10);
    kaiser.verBau = kaiser.land;

    toGrain(this.scene);
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
    kaiser.apreis =
      avgA + rand(Math.trunc(avgA / 10)) - rand(Math.trunc(avgA / 10));
    if (kaiser.apreis < 16) kaiser.apreis = 16 + rand(10);
    kaiser.lpreis =
      avgL + rand(Math.trunc(avgL / 10)) - rand(Math.trunc(avgL / 10));
    if (kaiser.lpreis < 16) kaiser.lpreis = 16 + rand(10);
  }
}
