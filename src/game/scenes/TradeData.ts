import { toBusiness } from "../flow";
import { t } from "../i18n/i18n";
import { getState } from "../model/session";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, SPACE } from "../ui/theme";
import { Panel, Slider } from "../ui/widgets";
import { GameScene } from "./base";
import {
  applyLandShortage,
  primaryAction,
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
    const p = state.players[state.sp];
    // KAISER4:740-760 - refresh the offer on entry; must offer at least 10%.
    p.verkorn = p.lkorn;
    p.verAcker = Math.trunc(p.acker / 10);
    p.verBau = Math.trunc(p.land / 10);

    this.children.removeAll();
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
      price: PriceKey;
      amount: AmountKey;
      max: MaxKey;
      range: [number, number];
    }[] = [
      {
        label: t("grain.title"),
        price: "kpreis",
        amount: "verkorn",
        max: "lkorn",
        range: [75, 125],
      },
      {
        label: t("land.acre"),
        price: "apreis",
        amount: "verAcker",
        max: "acker",
        range: [15, 25],
      },
      {
        label: t("land.building"),
        price: "lpreis",
        amount: "verBau",
        max: "land",
        range: [15, 25],
      },
    ];

    const priceX = 240;
    const priceW = 210;
    const amountX = 480;
    const amountW = panel.w - amountX - SPACE.lg;
    panel.add(
      label(this, priceX, 8, t("tradeData.price"), {
        color: COLORS.accent,
        size: FS.heading,
        weight: "bold",
      }),
    );
    panel.add(
      label(this, amountX, 8, t("tradeData.amount"), {
        color: COLORS.accent,
        size: FS.heading,
        weight: "bold",
      }),
    );

    let finish: () => void = () => {};
    let first: Slider | undefined;
    rows.forEach((row, i) => {
      const y = 40 + i * 78;
      panel.add(
        label(this, SPACE.lg, y + 16, row.label, {
          size: FS.heading,
          weight: "bold",
        }),
      );
      const max = Math.trunc(p[row.max]);
      const min = Math.trunc(max / 10);
      const [pmin, pmax] = row.range;
      const price = new Slider(this, priceX, y, priceW, 60, {
        min: pmin,
        max: pmax,
        step: 1,
        initial: p[row.price],
        format: (v) => `${v}`,
        onChange: (v) => (p[row.price] = v),
        onSubmit: () => finish(),
      });
      // Amount defaults to the minimum offer (10% of the holdings).
      const amount = new Slider(this, amountX, y, amountW, 60, {
        min,
        max,
        step: 1,
        initial: min,
        format: (v) => `${v}`,
        onChange: (v) => (p[row.amount] = v),
        onSubmit: () => finish(),
      });
      p[row.price] = price.value;
      p[row.amount] = amount.value;
      panel.add(price);
      panel.add(amount);
      price.bind(group);
      amount.bind(group);
      first ??= price;
    });

    const bottom = content.h - 54;
    panel.add(
      label(this, SPACE.lg, bottom - 60, t("tradeData.rule"), {
        color: COLORS.muted,
        size: FS.small,
      }),
    );
    panel.add(
      label(this, SPACE.lg, bottom - 38, t("tradeData.hint"), {
        color: COLORS.muted,
        size: FS.small,
        wrap: content.w - SPACE.lg * 2,
      }),
    );

    await new Promise<void>((resolve) => {
      finish = resolve;
      primaryAction(this, group, t("ui.continue"), finish);
      if (first) group.focus(first);
    });
    group.destroy();

    toBusiness(this.scene);
  }
}
