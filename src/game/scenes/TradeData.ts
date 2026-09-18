import { toBusiness } from "../flow";
import { t } from "../i18n/i18n";
import { getState } from "../model/session";
import { shownPrice, spareLand, type TradeGood } from "../model/trade";
import { playerAt } from "../model/types";
import { FocusGroup } from "../ui/focus";
import {
  drawAcreIcon,
  drawBuildingIcon,
  drawCoinsIcon,
  drawGrainIcon,
  type IconDraw,
} from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, SPACE } from "../ui/theme";
import { Panel, Slider } from "../ui/widgets";
import { GameScene } from "./base";
import {
  actionFooter,
  applyLandShortage,
  continueAction,
  screenTitle,
  statusBar,
} from "./common";

type PriceKey = "kpreis" | "apreis" | "lpreis";
type AmountKey = "verkorn" | "verAcker" | "verBau";
type MaxKey = "lkorn" | "acker" | "land";

export class TradeData extends GameScene {
  constructor() {
    super("TradeData");
  }

  async create() {
    const state = getState(this);
    // Handelsdaten only exists with multiple rulers (manual §11, KAISER4:765).
    if (state.count <= 1) {
      toBusiness(this.scene);
      return;
    }
    // KAISER4:765 - raze markets/mills the building land no longer covers.
    await applyLandShortage(this, state);
    const p = playerAt(state, state.sp);
    const remake = state.rules === "remake";
    // KAISER4:740-760 - refresh the offer on entry; must offer at least 10%.
    p.verkorn = p.lkorn;
    p.verAcker = Math.trunc(p.acker / 10);
    p.verBau = Math.trunc(p.land / 10);

    const group = new FocusGroup(this);
    const { content } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("tradeData.title"), content.y);

    const panel = new Panel(
      this,
      content.x,
      content.y + 54,
      content.w,
      content.h - 54,
    );
    const rows: {
      label: string;
      good: TradeGood;
      icon: IconDraw;
      price: PriceKey;
      amount: AmountKey;
      max: MaxKey;
      range: [number, number];
      step: number;
    }[] = [
      {
        label: t("grain.title"),
        good: "grain",
        icon: drawGrainIcon,
        price: "kpreis",
        amount: "verkorn",
        max: "lkorn",
        range: remake ? [50, 200] : [75, 125],
        step: remake ? 5 : 1,
      },
      {
        label: t("land.acre"),
        good: "acker",
        icon: drawAcreIcon,
        price: "apreis",
        amount: "verAcker",
        max: "acker",
        // Land prices are per 1000 ha.
        range: remake ? [1000, 4000] : [1500, 2500],
        step: 100,
      },
      {
        label: t("land.building"),
        good: "land",
        icon: drawBuildingIcon,
        price: "lpreis",
        amount: "verBau",
        max: "land",
        range: remake ? [1000, 4000] : [1500, 2500],
        step: 100,
      },
    ];

    const priceX = 240;
    const priceW = 210;
    const amountX = 480;
    const amountW = panel.w - amountX - SPACE.lg;
    const head = {
      color: COLORS.accent,
      size: FS.heading,
      weight: "bold",
    } as const;
    panel.add(label(this, priceX, 8, t("tradeData.price"), head));
    panel.add(label(this, amountX, 8, t("tradeData.amount"), head));

    const priceHint = t(
      remake ? "tradeData.priceHintRemake" : "tradeData.priceHint",
    );
    const amountHint = t(
      remake ? "tradeData.amountHintRemake" : "tradeData.amountHint",
    );
    const footer = actionFooter(this, priceHint);
    let finish: () => void = () => {};
    let first: Slider | undefined;
    rows.forEach((row, i) => {
      const y = 40 + i * 78;
      const goods = this.add.graphics();
      row.icon(goods, SPACE.lg + 14, y + 30, 28);
      panel.add(goods);
      panel.add(
        label(this, SPACE.lg + 40, y + 20, row.label, {
          size: FS.heading,
          weight: "bold",
        }),
      );
      const held = Math.trunc(p[row.max]);
      // Remake: only land the buildings and the 10 ha per head do not need.
      const max = remake && row.max !== "lkorn" ? spareLand(p, row.max) : held;
      // Atari: at least 10 % must be offered. Remake: any amount, 10 % to start.
      const min = remake ? 0 : Math.trunc(max / 10);
      const [pmin, pmax] = row.range;
      const price = new Slider(this, priceX, y, priceW, 60, {
        min: pmin,
        max: pmax,
        step: row.step,
        initial: p[row.price],
        // Land prices are stored per 1000 ha and shown per 500, like grain.
        format: (v) => `${shownPrice(row.good, v)}`,
        valueIcon: drawCoinsIcon,
        onChange: (v) => (p[row.price] = v),
        onSubmit: () => finish(),
      });
      // Amount defaults to the minimum offer (10% of the holdings).
      const amount = new Slider(this, amountX, y, amountW, 60, {
        min,
        max,
        step: 1,
        initial: remake ? Math.min(max, Math.trunc(held / 10)) : min,
        format: (v) => `${v}`,
        onChange: (v) => (p[row.amount] = v),
        onSubmit: () => finish(),
      });
      p[row.price] = price.value;
      p[row.amount] = amount.value;
      panel.add(price);
      panel.add(amount);
      price.onFocus(() => footer.setText(priceHint));
      amount.onFocus(() => footer.setText(amountHint));
      price.bind(group);
      amount.bind(group);
      first ??= price;
    });

    await new Promise<void>((resolve) => {
      finish = resolve;
      continueAction(this, group, finish);
      if (first) group.focus(first);
    });
    group.destroy();

    toBusiness(this.scene);
  }
}
