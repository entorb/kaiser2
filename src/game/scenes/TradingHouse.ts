import { playCoins } from "../audio/music";
import { toPartner } from "../flow";
import { t } from "../i18n/i18n";
import { expropriate, taxDemotion } from "../model/events";
import { tradeHouse } from "../model/rules";
import { getState } from "../model/session";
import {
  type GameState,
  type PlayerState,
  playerAt,
  rand,
} from "../model/types";
import { alert, sliderPrompt } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import { drawCoinsIcon } from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, SPACE } from "../ui/theme";
import {
  type ListItem,
  ListMenu,
  moneyLabel,
  Panel,
  StatRow,
  type StatRowOptions,
} from "../ui/widgets";
import { GameScene } from "./base";
import { continueAction, screenTitle, statusBar } from "./common";

export class TradingHouse extends GameScene {
  constructor() {
    super("TradingHouse");
  }

  async create() {
    const state = getState(this);
    const p = playerAt(state, state.sp);
    // KAISERB:53 - a tax burden over 80% demotes and suspends at turn start.
    if (taxDemotion(p)) {
      await alert(this, t("business.demoted"), [t("business.demotedText")]);
    }
    // Trading houses are only available from Landgraf up (KAISERB:54).
    if (p.titel <= 1) {
      toPartner(this.scene);
      return;
    }

    const { zahl, gew } = tradeHouse(state, state.sp);
    let leased = false;
    let done = false;

    // Tribute is the first order of business: the popup opens right away, so
    // it has no menu entry (and can only be paid once per turn).
    await this.payTribute(state, zahl);

    while (!done) {
      const choice = await this.chooseAction(state, zahl, gew, leased);

      if (choice === 0) {
        // One combined slider like grain/land: left = dismiss, right = hire.
        const v = await this.servantPrompt(p);
        state.turn.neu = Math.max(0, v);
        state.turn.alt = Math.max(0, -v);
      } else if (choice === 1) {
        const kaiser = playerAt(state, 0);
        if (p.geld > 2500 && kaiser.hh > 0) {
          playCoins();
          p.hh += 1;
          kaiser.hh -= 1;
          p.geld -= 5000;
          p.punkte += 1.3;
          leased = true;
        }
      } else {
        done = true;
      }
    }

    p.bd += state.turn.neu - state.turn.alt;
    if (state.turn.abg - 1000 + rand(2000) > zahl) {
      p.punkte += Math.trunc(state.turn.abg / 2000);
    } else {
      p.punkte -= 1;
    }
    // KAISERB:620 EXEC ENT - the Emperor may confiscate a house.
    if (expropriate(state, state.sp)) {
      await alert(this, t("trade.expropriation"), [
        t("trade.expropriationText"),
      ]);
    }
    toPartner(this.scene);
  }

  /** One menu pass: redraw the stats, let the player pick, return the choice. */
  private async chooseAction(
    state: GameState,
    zahl: number,
    gew: number,
    leased: boolean,
  ): Promise<number> {
    const p = playerAt(state, state.sp);
    this.clearScreen();
    const group = new FocusGroup(this);
    const { content, action } = frame();
    statusBar(this, state, group);
    screenTitle(this, t("trade.title"), content.y);

    // Servants needed for the houses to turn a profit: `INT(HH - BD/5) < 0`
    // is the source's profitability test (KAISERB:1170), i.e. BD > HH*5.
    const needed = p.hh > 0 ? 5 * p.hh + 1 : 0;
    const staffNow = p.bd + state.turn.neu - state.turn.alt;
    const understaffed = needed > 0 && staffNow < needed;
    // Annual wage bill: 50 taler per servant (KAISERB:1190).
    const wages = staffNow * 50;

    const panelW = 430;
    const panel = new Panel(
      this,
      content.x,
      content.y + 54,
      panelW,
      content.h - 54,
    );
    const money: StatRowOptions = { icon: drawCoinsIcon };
    const rows: [string, string, StatRowOptions?][] = [
      [t("trade.wages"), `${wages}`, money],
      [t("trade.fortune"), `${Math.trunc(p.geld)}`, money],
      [t("trade.profit"), `${gew}`, money],
      [t("trade.demands"), `${zahl}`, { ...money, valueColor: COLORS.danger }],
      [t("trade.give"), `${state.turn.abg}`, money],
      [t("trade.houses"), `${p.hh}`],
      [
        t("trade.servants"),
        `${staffNow}`,
        understaffed ? { valueColor: COLORS.danger } : undefined,
      ],
    ];
    rows.forEach(([labelText, value, opts], i) => {
      panel.add(
        new StatRow(
          this,
          SPACE.lg,
          64 + i * 40,
          panelW - SPACE.lg * 2,
          labelText,
          value,
          opts,
        ),
      );
    });

    // Only buy when the 5000 taler price is covered (grey otherwise).
    const canLease = p.geld >= 5000 && playerAt(state, 0).hh > 0;
    const options: ListItem[] = [
      { label: t("trade.servants"), value: `${staffNow}` },
    ];
    if (!leased) options.push({ label: t("trade.rent"), disabled: !canLease });

    // Footer: what the highlighted action does.
    const footer = label(this, action.x + 140, action.y + action.h / 2, "", {
      color: COLORS.onWood,
    });
    footer.setOrigin(0, 0.5);
    const describe = (index: number): string => {
      if (index === 0)
        return needed > 0
          ? t("trade.staffHint", { need: needed })
          : t("trade.staffNoHouse");
      if (index === 1) return t("trade.rentHint");
      return "";
    };
    footer.setText(describe(0));

    const choice = await this.choose(group, options, content, (i) =>
      footer.setText(describe(i)),
    );
    group.destroy();
    return choice;
  }

  /** Hire/fire slider: positive hires, negative fires. Returns the delta. */
  private servantPrompt(p: PlayerState): Promise<number> {
    const needed = p.hh > 0 ? 5 * p.hh + 1 : 0;
    return sliderPrompt(this, {
      title: t("trade.servants"),
      min: -Math.trunc(p.bd),
      max: 99,
      step: 1,
      initial: 0,
      minLabel: t("trade.fire"),
      maxLabel: t("trade.hire"),
      format: (v) => (v > 0 ? `+${v}` : `${v}`),
      info: (v) => `${t("trade.servants")}: ${p.bd + v}`,
      infoColor: (v) =>
        needed > 0 && p.bd + v < needed ? COLORS.danger : COLORS.success,
    });
  }

  /** Tribute popup. Red marker on the demanded sum; 0 (refusal) allowed. */
  private async payTribute(state: GameState, zahl: number): Promise<void> {
    const p = playerAt(state, state.sp);
    const budget = Math.max(0, Math.trunc(p.geld));
    const n = await sliderPrompt(this, {
      title: t("trade.tributeTitle", { zahl }),
      min: 0,
      max: budget,
      step: 100,
      // Open at the minimum the Emperor expects.
      initial: Math.min(budget, zahl),
      minLabel: "0",
      maxLabel: `${budget}`,
      format: (v) => `${v}`,
      valueIcon: drawCoinsIcon,
      cost: (v) => (v === 0 ? "" : moneyLabel(-v)),
      costColor: (v) => (v >= zahl ? COLORS.success : COLORS.danger),
      markers: [{ value: zahl, color: COLORS.danger }],
    });
    if (n > 0) {
      playCoins();
      state.turn.abg += n;
      p.geld -= n;
    }
  }

  private choose(
    group: FocusGroup,
    options: ListItem[],
    content: { x: number; y: number; w: number },
    onChange: (index: number) => void,
  ): Promise<number> {
    const menuW = 420;
    const x = content.x + content.w - menuW;
    return new Promise((resolve) => {
      const menu = new ListMenu(this, x, content.y + 54, menuW, options, {
        rowH: 48,
        gap: 8,
        onSelect: resolve,
        onChange,
      });
      menu.bind(group);
      // The common next button lives in the shared bottom action bar.
      continueAction(this, group, () => resolve(-1));
    });
  }
}
