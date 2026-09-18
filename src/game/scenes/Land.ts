import type { GameObjects } from "phaser";
import { playCoins } from "../audio/music";
import { toChronicle } from "../flow";
import { t } from "../i18n/i18n";
import { at } from "../lookup";
import { getState } from "../model/session";
import {
  buyCost,
  dealPrice,
  maxBuy,
  maxSale,
  sellProceeds,
  type TradeGood,
  tradeLand,
} from "../model/trade";
import type { GameState } from "../model/types";
import { playerAt } from "../model/types";
import { FocusGroup } from "../ui/focus";
import {
  drawAcreIcon,
  drawBuildingIcon,
  drawCoinsIcon,
  type IconDraw,
} from "../ui/icon";
import { frame } from "../ui/layout";
import { divider } from "../ui/ornament";
import { label } from "../ui/text";
import { COLORS, css, FS, SPACE } from "../ui/theme";
import { moneyLabel, Panel, Slider } from "../ui/widgets";
import { GameScene } from "./base";
import {
  applyLandShortage,
  continueAction,
  screenTitle,
  statusBar,
} from "./common";

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
    const p = playerAt(state, state.sp);
    const group = new FocusGroup(this);
    const { content } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("land.title"), content.y);

    // Two boxes of the same size.
    const rightW = (content.w - SPACE.lg) / 2;
    const leftW = rightW;
    const rightX = content.x + content.w - rightW;
    // The screen title sits above the two panels.
    const top = content.y + 54;
    const h = content.h - 54;
    const left = new Panel(this, content.x, top, leftW, h);
    Panel.decorate(this, rightX, top, rightW, h);

    const landG = this.add.graphics();
    left.add(landG);
    const buildingY = h - 26;
    const acreY = buildingY - 22;
    const legend = this.add.graphics();
    drawAcreIcon(legend, SPACE.lg + 8, acreY + 8, 20);
    drawBuildingIcon(legend, SPACE.lg + 8, buildingY + 8, 20);
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
        h - 100,
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

    const { han } = state.turn;
    // Buying more raises the price, selling more lowers it (rules-remake.md §3.7).
    const spend = (v: number, good: TradeGood) =>
      v > 0
        ? Math.trunc(buyCost(state, han, good, v))
        : -Math.trunc(sellProceeds(state, han, good, -v));
    // Buying (v > 0) costs money (-), selling (v < 0) earns it (+).
    const cost = (v: number, good: TradeGood) =>
      v === 0 ? "" : moneyLabel(-spend(v, good));
    const costColor = (v: number, good: TradeGood) =>
      v > 0 && spend(v, good) > p.geld ? COLORS.danger : COLORS.accent;
    // The price per 500 ha like the grain price per 500 units; it follows the
    // deal because a big deal moves the price.
    const priceText = (good: TradeGood, v: number) =>
      `${dealPrice(state, han, good, v)}`;

    /**
     * One land kind: big icon top left, its name beside it with the price
     * (coin icon first) under the name, the running cost right of the name
     * and the trade slider below.
     */
    const section = (
      y: number,
      draw: IconDraw,
      name: string,
      good: TradeGood,
      stock: { min: number; max: number },
      onChange: (v: number) => void,
    ): Slider => {
      const head = this.add.graphics();
      draw(head, sliderX + 24, y + 26, 48);
      drawCoinsIcon(head, sliderX + 68, y + 44, 16);
      label(this, sliderX + 62, y - 2, name, {
        size: FS.title,
        weight: "bold",
        display: true,
        color: COLORS.wood,
      });
      const price = label(this, sliderX + 82, y + 33, priceText(good, 0), {
        mono: true,
        size: FS.heading,
      });
      const costIcon = this.add.graphics();
      drawCoinsIcon(costIcon, sliderX + sliderW - 9, y + 14, 18);
      const costText = label(this, sliderX + sliderW - 24, y + 14, "", {
        mono: true,
        size: FS.heading,
      }).setOrigin(1, 0.5);
      const showCost = (v: number) => {
        const text = cost(v, good);
        costText.setText(text);
        price.setText(priceText(good, v));
        costText.setColor(css(costColor(v, good)));
        costIcon.setVisible(text !== "");
      };
      showCost(0);
      return new Slider(this, sliderX, y + 62, sliderW, 56, {
        ...stock,
        step: 500,
        initial: 0,
        minIcon: "minus",
        maxIcon: "plus",
        format: (v) => (v > 0 ? `+${v}` : `${v}`),
        onChange: (v) => {
          showCost(v);
          onChange(v);
        },
        onSubmit: finish,
      });
    };

    const acre = section(
      top + 29,
      drawAcreIcon,
      t("land.acre"),
      "acker",
      {
        min: -Math.trunc(maxSale(state, state.sp, han, "acker")),
        max: Math.trunc(maxBuy(state, han, "acker")),
      },
      (v) => {
        acreAmount = v;
        redraw();
      },
    );
    divider(this, rightX + rightW / 2, top + 161, sliderW);
    const building = section(
      top + 181,
      drawBuildingIcon,
      t("land.building"),
      "land",
      {
        min: -Math.trunc(maxSale(state, state.sp, han, "land")),
        max: Math.trunc(maxBuy(state, han, "land")),
      },
      (v) => {
        buildingAmount = v;
        redraw();
      },
    );

    acre.bind(group);
    building.bind(group);
    await new Promise<void>((resolve) => {
      resolvePlay = resolve;
      continueAction(this, group, finish);
      group.focus(acre);
    });
    group.destroy();

    this.applyLand(state, "land", building.value);
    this.applyLand(state, "acker", acre.value);
  }

  /**
   * One icon per 1000 land, laid out as a disc (nearest cells first) so a
   * large holding looks round. Bricks are building land, wheat is acre.
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
      const { r, c } = at(cells, i);
      const cx = ox + c * cell + pad;
      const cy = oy + r * cell + pad;
      const draw = isBuilding(i) ? drawBuildingIcon : drawAcreIcon;
      draw(g, cx + s / 2, cy + s / 2, s);
    }
  }

  private applyLand(
    state: GameState,
    kind: "land" | "acker",
    amount: number,
  ): void {
    const traded = tradeLand(state, state.sp, state.turn.han, kind, amount);
    if (traded > 0 && amount > 0) playCoins();
  }
}
