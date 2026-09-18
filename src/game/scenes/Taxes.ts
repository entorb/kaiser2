import { toTradeData } from "../flow";
import { t } from "../i18n/i18n";
import { at } from "../lookup";
import { JUSTICE } from "../model/constants";
import { stateIncome } from "../model/rules";
import { getState } from "../model/session";
import { playerAt } from "../model/types";
import { FocusGroup } from "../ui/focus";
import { drawCoinsIcon } from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, SPACE } from "../ui/theme";
import { Panel, SegmentedControl, Slider } from "../ui/widgets";
import { GameScene } from "./base";
import {
  actionFooter,
  continueAction,
  panelFigure,
  screenTitle,
  statusBar,
} from "./common";

/** Height of a titled panel's heading (title plus rule). */
const TITLE_H = 28;

export class Taxes extends GameScene {
  constructor() {
    super("Taxes");
  }

  async create() {
    const state = getState(this);
    const p = playerAt(state, state.sp);
    const se = stateIncome(state, state.sp);

    const group = new FocusGroup(this);
    const { content } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("tax.title"), content.y);

    // Two boxes: this year's income (read-only) and next year's tax inputs.
    const top = content.y + 54;
    const h = content.h - 54;
    const incomeW = 300;
    const income = new Panel(this, content.x, top, incomeW, h, t("tax.income"));
    panelFigure(
      this,
      income,
      (h + TITLE_H) / 2,
      `${se}`,
      COLORS.accent,
      drawCoinsIcon,
    );
    const panelW = content.w - incomeW - SPACE.lg;
    const panel = new Panel(
      this,
      content.x + incomeW + SPACE.lg,
      top,
      panelW,
      h,
      t("tax.nextYear"),
    );

    let finish!: () => void;
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });

    // Footer: the effect of whichever option is focused. The three tax rates
    // share one formula (and one set of limits), so their hints share a note.
    const limits = t("tax.limits");
    const hints = [
      `${t("tax.customsHint")} ${limits}`,
      `${t("tax.vatHint")} ${limits}`,
      `${t("tax.incomeTaxHint")} ${limits}`,
      t("tax.justiceHint"),
    ];
    const footer = actionFooter(this, at(hints, 0));

    const fields: [string, number, (v: number) => void][] = [
      [t("tax.customs"), p.zoll, (v) => (p.zoll = v)],
      [t("tax.vat"), p.mwst, (v) => (p.mwst = v)],
      [t("tax.incomeTax"), p.ein, (v) => (p.ein = v)],
    ];
    fields.forEach(([text, value, set], i) => {
      const y = 56 + i * 58;
      const field = new Slider(this, SPACE.lg, y, panelW - SPACE.lg * 2, 52, {
        label: `${text} (%)`,
        min: 0,
        max: 99,
        initial: value,
        format: (v) => `${v} %`,
        onChange: set,
        onSubmit: finish,
      });
      panel.add(field);
      field.onFocus(() => footer.setText(at(hints, i)));
      field.bind(group);
    });

    const justiceY = 56 + fields.length * 58 + 6;
    panel.add(
      label(this, SPACE.lg, justiceY + 14, t("tax.justice"), {
        color: COLORS.muted,
      }),
    );
    const justice = new SegmentedControl(
      this,
      panelW - SPACE.lg - 400,
      justiceY,
      400,
      44,
      [JUSTICE[1], JUSTICE[2], JUSTICE[3], JUSTICE[4]],
      {
        selected: p.justiz - 1,
        onChange: (i) => (p.justiz = i + 1),
        onSubmit: finish,
      },
    );
    panel.add(justice);
    justice.onFocus(() => footer.setText(at(hints, 3)));
    justice.bind(group);

    continueAction(this, group, finish);
    await done;
    group.destroy();

    toTradeData(this.scene);
  }
}
