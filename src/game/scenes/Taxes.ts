import { toTradeData } from "../flow";
import { t } from "../i18n/i18n";
import { JUSTICE } from "../model/constants";
import { stateIncome } from "../model/rules";
import { getState } from "../model/session";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, SPACE } from "../ui/theme";
import { Panel, SegmentedControl, Slider, StatRow } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle, statusBar } from "./common";

export class Taxes extends GameScene {
  constructor() {
    super("Taxes");
  }

  async create() {
    const state = getState(this);
    const p = state.players[state.sp];
    const se = stateIncome(state, state.sp);

    this.children.removeAll();
    const group = new FocusGroup(this);
    const { content, action } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("tax.title"), content.y);

    const panel = new Panel(
      this,
      content.x,
      content.y + 54,
      content.w,
      content.h - 54,
    );
    panel.add(
      new StatRow(
        this,
        SPACE.lg,
        64,
        content.w - SPACE.lg * 2,
        t("tax.income"),
        `${se} ${t("common.taler")}`,
        { valueColor: COLORS.accent },
      ),
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
    const footer = label(
      this,
      action.x + 140,
      action.y + action.h / 2,
      hints[0],
      {
        color: COLORS.onWood,
        size: FS.small,
        wrap: action.w - 360,
      },
    );
    footer.setOrigin(0, 0.5);

    const fields: [string, number, (v: number) => void][] = [
      [t("tax.customs"), p.zoll, (v) => (p.zoll = v)],
      [t("tax.vat"), p.mwst, (v) => (p.mwst = v)],
      [t("tax.incomeTax"), p.ein, (v) => (p.ein = v)],
    ];
    fields.forEach(([text, value, set], i) => {
      const y = 92 + i * 58;
      const field = new Slider(
        this,
        SPACE.lg,
        y,
        content.w - SPACE.lg * 2,
        52,
        {
          label: `${text} (%)`,
          min: 0,
          max: 99,
          initial: value,
          format: (v) => `${v} %`,
          onChange: set,
          onSubmit: finish,
        },
      );
      panel.add(field);
      field.onFocus(() => footer.setText(hints[i]));
      field.bind(group);
    });

    const justiceY = 92 + fields.length * 58;
    panel.add(
      label(this, SPACE.lg, justiceY + 14, t("tax.justice"), {
        color: COLORS.muted,
      }),
    );
    const justice = new SegmentedControl(
      this,
      content.w - SPACE.lg - 400,
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
    justice.onFocus(() => footer.setText(hints[3]));
    justice.bind(group);

    primaryAction(this, group, t("ui.continue"), finish);
    await done;
    group.destroy();

    toTradeData(this.scene);
  }
}
