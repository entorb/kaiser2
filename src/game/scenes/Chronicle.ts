import { toTaxes } from "../flow";
import { t } from "../i18n/i18n";
import { chronicle } from "../model/rules";
import { getState } from "../model/session";
import { FocusGroup } from "../ui/focus";
import {
  drawCoinsIcon,
  drawCrowdIcon,
  drawEventIcon,
  type EventIcon,
} from "../ui/icon";
import { columns, frame } from "../ui/layout";
import { divider } from "../ui/ornament";
import { label } from "../ui/text";
import { COLORS, FS, SPACE } from "../ui/theme";
import { Panel } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle, statusBar } from "./common";

/** A chronicle row: event icon, the figure, and the sentence. */
type Row = [EventIcon, string, string];

export class Chronicle extends GameScene {
  constructor() {
    super("Chronicle");
  }

  async create() {
    const state = getState(this);
    const c = chronicle(state, state.sp);
    const p = state.players[state.sp];

    this.children.removeAll();
    const group = new FocusGroup(this);
    const { content } = frame();
    statusBar(this, state, group);
    screenTitle(this, `${t("chronicle.title")} · ${p.name}`, content.y);

    const [leftRect, rightRect] = columns(content, 2, SPACE.lg);
    const top = content.y + 54;
    const h = content.h - 54;
    const left = new Panel(this, leftRect.x, top, leftRect.w, h);
    const right = new Panel(this, rightRect.x, top, rightRect.w, h);

    const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
    const people = c.geb - c.ges + c.einw - c.ausw;
    const money = c.mg1 + c.mg2 - c.sold;

    const peopleRows: Row[] = [];
    if (c.geb > 0) peopleRows.push(["born", `${c.geb}`, t("chronicle.born")]);
    if (c.ges > 0) peopleRows.push(["died", `${c.ges}`, t("chronicle.died")]);
    if (c.einw > 0)
      peopleRows.push(["immigrant", `${c.einw}`, t("chronicle.immigrants")]);
    if (c.ausw > 0)
      peopleRows.push(["emigrant", `${c.ausw}`, t("chronicle.emigrants")]);

    const moneyRows: Row[] = [];
    if (c.mg1 > 0)
      moneyRows.push([
        "mill",
        `${c.mg1} ${t("common.taler")}`,
        t("chronicle.millProfit"),
      ]);
    if (c.mg2 > 0)
      moneyRows.push([
        "market",
        `${c.mg2} ${t("common.taler")}`,
        t("chronicle.marketProfit"),
      ]);
    if (c.sold > 0)
      moneyRows.push([
        "spy",
        `-${c.sold} ${t("common.taler")}`,
        t("chronicle.secretService"),
      ]);

    this.section(left, "crowd", t("chronicle.population"), peopleRows, {
      text: `${sign(people)}  ${t("chronicle.peopleChange")}`,
      color: people >= 0 ? COLORS.success : COLORS.danger,
    });
    this.section(right, "coins", t("chronicle.money"), moneyRows, {
      text: `${sign(money)} ${t("common.taler")}`,
      color: money >= 0 ? COLORS.success : COLORS.danger,
    });

    await new Promise<void>((resolve) =>
      primaryAction(this, group, t("ui.continue"), resolve),
    );
    group.destroy();

    toTaxes(this.scene);
  }

  /** One themed column: header, the event rows and a bold total. */
  private section(
    panel: Panel,
    icon: "crowd" | "coins",
    title: string,
    rows: Row[],
    sum: { text: string; color: number },
  ): void {
    const w = panel.w;
    const g = this.add.graphics();
    if (icon === "crowd") drawCrowdIcon(g, SPACE.lg + 12, 22, 24);
    else drawCoinsIcon(g, SPACE.lg + 12, 22, 24);
    panel.add(g);
    panel.add(
      label(this, SPACE.lg + 32, 10, title, {
        size: FS.heading,
        weight: "bold",
        color: COLORS.wood,
      }),
    );
    const rule = this.add.graphics();
    rule.lineStyle(1, COLORS.border, 0.5);
    rule.lineBetween(SPACE.lg, 38, w - SPACE.lg, 38);
    panel.add(rule);

    const top = 60;
    const step = 44;
    rows.forEach(([kind, value, text], i) => {
      const y = top + i * step;
      const ig = this.add.graphics();
      drawEventIcon(ig, SPACE.lg + 11, y + 9, 22, kind);
      panel.add(ig);
      panel.add(
        label(this, SPACE.lg + 32, y, `${value}  ${text}`, {
          size: FS.body,
          color: COLORS.text,
        }),
      );
    });

    const sumY = panel.h - 40;
    panel.add(divider(this, w / 2, sumY - 16, w - SPACE.lg * 2));
    panel.add(
      label(this, w / 2, sumY, sum.text, {
        size: FS.body,
        weight: "bold",
        color: sum.color,
        origin: 0.5,
      }),
    );
  }
}
