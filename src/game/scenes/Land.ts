import type { GameObjects } from "phaser";
import { playCoins } from "../audio/music";
import { toChronicle } from "../flow";
import { t } from "../i18n/i18n";
import { getState } from "../model/session";
import type { GameState } from "../model/types";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, SPACE } from "../ui/theme";
import { moneyLabel, Panel, Slider } from "../ui/widgets";
import { GameScene } from "./base";
import {
  applyLandShortage,
  primaryAction,
  screenTitle,
  statusBar,
} from "./common";

const BUILDING_COLOR = 0x8d8d8d;
const ACRE_COLOR = 0xd8b13a;

export class Land extends GameScene {
  constructor() {
    super("Land");
  }

  async create() {
    const state = getState(this);
    await this.play(state);
    await applyLandShortage(this, state);
    toChronicle(this.scene);
  }

  /**
   * One screen with both land kinds: the owned land mass on the left, the buy/
   * sell sliders on the right (change above, cost below, like grain). "Weiter"
   * settles both trades at once.
   */
  private async play(state: GameState): Promise<void> {
    const p = state.players[state.sp];
    const seller = state.players[state.turn.han];
    this.children.removeAll();
    const group = new FocusGroup(this);
    const { content } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("land.title"), content.y);

    const rightW = 420;
    const leftW = content.w - rightW - SPACE.lg;
    const rightX = content.x + content.w - rightW;
    const left = new Panel(this, content.x, content.y, leftW, content.h);
    Panel.decorate(this, rightX, content.y, rightW, content.h);

    const landG = this.add.graphics();
    left.add(landG);
    const buildingY = content.h - 26;
    const acreY = buildingY - 22;
    const legend = this.add.graphics();
    legend.fillStyle(ACRE_COLOR, 1);
    legend.fillRoundedRect(SPACE.lg, acreY, 16, 16, 2);
    legend.fillStyle(BUILDING_COLOR, 1);
    legend.fillRoundedRect(SPACE.lg, buildingY, 16, 16, 2);
    left.add(legend);
    const acreLabel = label(this, SPACE.lg + 22, acreY, "", {
      size: FS.small,
      color: COLORS.muted,
    });
    left.add(acreLabel);
    const buildingLabel = label(this, SPACE.lg + 22, buildingY, "", {
      size: FS.small,
      color: COLORS.muted,
    });
    left.add(buildingLabel);

    let buildingAmount = 0;
    let acreAmount = 0;
    const redraw = () => {
      const building = Math.trunc(p.land) + buildingAmount;
      const acre = Math.trunc(p.acker) + acreAmount;
      this.drawLandMass(
        landG,
        SPACE.lg,
        24,
        leftW - SPACE.lg * 2,
        content.h - 100,
        building,
        acre,
      );
      acreLabel.setText(`${t("land.acre")}: ${acre}`);
      buildingLabel.setText(`${t("land.building")}: ${building}`);
    };
    redraw();

    const sliderX = rightX + SPACE.lg;
    const sliderW = rightW - SPACE.lg * 2;
    let resolvePlay: () => void = () => {};
    const finish = () => resolvePlay();

    const priceLabel = (name: string, price: number) =>
      `${name} · ${price} ${t("land.per10ha")}`;
    const spend = (v: number, price: number) => Math.trunc((v * price) / 10);
    const cost = (v: number, price: number) => {
      if (v === 0) return "";
      return moneyLabel(
        v > 0 ? -spend(v, price) : spend(v, price),
        t("common.taler"),
      );
    };
    const costColor = (v: number, price: number) =>
      v > 0 && spend(v, price) > p.geld ? COLORS.danger : COLORS.accent;

    const acre = new Slider(this, sliderX, content.y + 48, sliderW, 150, {
      label: priceLabel(t("land.acre"), seller.apreis),
      min: -Math.trunc(p.acker),
      max: Math.trunc(seller.verAcker),
      step: 500,
      initial: 0,
      minIcon: "minus",
      maxIcon: "plus",
      format: (v) => (v > 0 ? `+${v}` : `${v}`),
      cost: (v) => cost(v, seller.apreis),
      costColor: (v) => costColor(v, seller.apreis),
      onChange: (v) => {
        acreAmount = v;
        redraw();
      },
      onSubmit: finish,
    });

    const building = new Slider(this, sliderX, content.y + 226, sliderW, 150, {
      label: priceLabel(t("land.building"), seller.lpreis),
      min: -Math.trunc(p.land),
      max: Math.trunc(seller.verBau),
      step: 500,
      initial: 0,
      minIcon: "minus",
      maxIcon: "plus",
      format: (v) => (v > 0 ? `+${v}` : `${v}`),
      cost: (v) => cost(v, seller.lpreis),
      costColor: (v) => costColor(v, seller.lpreis),
      onChange: (v) => {
        buildingAmount = v;
        redraw();
      },
      onSubmit: finish,
    });

    acre.bind(group);
    building.bind(group);
    await new Promise<void>((resolve) => {
      resolvePlay = resolve;
      primaryAction(this, group, t("common.continue"), finish);
      group.focus(acre);
    });
    group.destroy();

    this.applyLand(state, "land", building.value, seller.lpreis);
    this.applyLand(state, "acker", acre.value, seller.apreis);
  }

  /**
   * One square per 1000 land, laid out as a disc (nearest cells first) so a
   * large holding looks round. Grey squares are building land, yellow acre.
   */
  private drawLandMass(
    g: GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    building: number,
    farming: number,
  ): void {
    g.clear();
    const cap = 100;
    const b = Math.max(0, Math.floor(building / 1000));
    const f = Math.max(0, Math.floor(farming / 1000));
    const total = Math.min(cap, b + f);
    if (total === 0) return;

    const grid = 12;
    const cell = Math.min(w / grid, h / grid);
    const ox = x + (w - cell * grid) / 2;
    const oy = y + (h - cell * grid) / 2;
    const mid = (grid - 1) / 2;

    const cells: { r: number; c: number; d: number }[] = [];
    for (let r = 0; r < grid; r++)
      for (let c = 0; c < grid; c++)
        cells.push({ r, c, d: (r - mid) ** 2 + (c - mid) ** 2 });
    cells.sort((a, b2) => a.d - b2.d);

    const bCells = Math.round((b / (b + f)) * total);
    const isBuilding = (i: number) =>
      Math.floor(((i + 1) * bCells) / total) > Math.floor((i * bCells) / total);
    const pad = Math.max(1, cell * 0.08);
    const s = cell - pad * 2;
    for (let i = 0; i < total; i++) {
      const { r, c } = cells[i];
      const cx = ox + c * cell + pad;
      const cy = oy + r * cell + pad;
      g.fillStyle(isBuilding(i) ? BUILDING_COLOR : ACRE_COLOR, 1);
      g.fillRoundedRect(cx, cy, s, s, 1.5);
      g.lineStyle(1, COLORS.woodDark, 0.35);
      g.strokeRoundedRect(cx, cy, s, s, 1.5);
    }
  }

  private applyLand(
    state: GameState,
    kind: "land" | "acker",
    amount: number,
    price: number,
  ): void {
    const p = state.players[state.sp];
    const s = state.players[state.turn.han];
    const avail: "verBau" | "verAcker" =
      kind === "land" ? "verBau" : "verAcker";
    if (amount > 0) {
      const e = Math.min(amount, s[avail]);
      if (e <= 0) return;
      playCoins();
      p[kind] += e;
      s[kind] -= e;
      s[avail] -= e;
      p.geld -= (e * price) / 10;
      s.geld += (e * price) / 10;
    } else if (amount < 0) {
      const e = Math.min(-amount, p[kind]);
      p[kind] -= e;
      s[kind] += e;
      s[avail] += e;
      p.geld += (e * price) / 10;
      s.geld -= (e * price) / 10;
    }
  }
}
