import { playFanfare } from "../audio/music";
import { toMenu } from "../flow";
import { t } from "../i18n/i18n";
import { playerColor } from "../model/constants";
import { highscoreValue } from "../model/rules";
import { getState } from "../model/session";
import { playerAt } from "../model/types";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, RADIUS, SPACE } from "../ui/theme";
import { Panel } from "../ui/widgets";
import { GameScene } from "./base";
import { continueAction, screenTitle, titleName } from "./common";

/** End-of-game ranking of the rulers (hall of fame), sorted by points. */
export class Highscore extends GameScene {
  constructor() {
    super("Highscore");
  }

  async create() {
    playFanfare();
    const state = getState(this);
    const entries = [];
    for (let i = 1; i <= state.count; i++) {
      const p = playerAt(state, i);
      entries.push({
        p,
        jahr: state.jahr,
        score: Math.trunc(highscoreValue(p, state.jahr)),
      });
    }
    entries.sort((a, b) => b.score - a.score);

    const group = new FocusGroup(this);
    const { content } = frame();
    // The final page: the screen heading with the hall of fame below it.
    screenTitle(this, t("highscore.title"), content.y);
    const panel = new Panel(
      this,
      content.x,
      content.y + 54,
      content.w,
      content.h - 54,
      `${t("status.year")} ${state.jahr}`,
    );

    const rankW = 70;
    const nameW = 190;
    const colW = (content.w - SPACE.lg * 2 - rankW - nameW) / 2;
    const yearCx = SPACE.lg + rankW + nameW + colW / 2;
    const pointsCx = yearCx + colW;
    const headY = 56;
    const rowY0 = 100;
    const rowH = 42;

    const stripes = this.add.graphics();
    entries.forEach((_e, i) => {
      if (i % 2 === 1) {
        stripes.fillStyle(COLORS.surfaceAlt, 1);
        stripes.fillRoundedRect(
          SPACE.lg,
          rowY0 + i * rowH - 6,
          content.w - SPACE.lg * 2,
          rowH - 4,
          RADIUS,
        );
      }
    });
    panel.add(stripes);

    panel.add(
      label(this, SPACE.lg, headY, t("ranking.rank"), {
        color: COLORS.muted,
        size: FS.small,
        weight: "bold",
      }),
    );
    panel.add(
      label(this, SPACE.lg + rankW, headY, t("ranking.ruler"), {
        color: COLORS.muted,
        size: FS.small,
        weight: "bold",
      }),
    );
    panel.add(
      label(this, yearCx, headY, t("status.year"), {
        color: COLORS.muted,
        size: FS.small,
        weight: "bold",
        mono: true,
      }).setOrigin(0.5, 0),
    );
    panel.add(
      label(this, pointsCx, headY, t("status.points"), {
        color: COLORS.muted,
        size: FS.small,
        weight: "bold",
        mono: true,
      }).setOrigin(0.5, 0),
    );

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS.border, 1);
    sep.lineBetween(SPACE.lg, headY + 24, content.w - SPACE.lg, headY + 24);
    panel.add(sep);

    entries.forEach((e, i) => {
      const y = rowY0 + i * rowH;
      const color = playerColor(e.p.portrait);
      panel.add(
        label(this, SPACE.lg, y, `${i + 1}`, {
          color: COLORS.muted,
          mono: true,
        }),
      );
      panel.add(
        label(
          this,
          SPACE.lg + rankW,
          y,
          `${titleName(e.p.titel)} ${e.p.name}`,
          { color, weight: "bold" },
        ),
      );
      panel.add(
        label(this, yearCx, y, `${e.jahr}`, { mono: true }).setOrigin(0.5, 0),
      );
      panel.add(
        label(this, pointsCx, y, `${e.score}`, { mono: true }).setOrigin(
          0.5,
          0,
        ),
      );
    });

    await new Promise<void>((resolve) => continueAction(this, group, resolve));
    group.destroy();

    toMenu(this.scene);
  }
}
