import { playFanfare } from "../audio/music";
import { toMenu } from "../flow";
import { t } from "../i18n/i18n";
import { TITLES } from "../model/constants";
import { highscoreValue } from "../model/rules";
import { getState } from "../model/session";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, SPACE } from "../ui/theme";
import { Panel } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle } from "./common";

export class Highscore extends GameScene {
  constructor() {
    super("Highscore");
  }

  async create() {
    playFanfare();
    const state = getState(this);
    const entries = [];
    for (let i = 1; i <= state.count; i++) {
      const p = state.players[i];
      entries.push({
        name: p.name,
        title: TITLES[Math.min(p.titel, TITLES.length - 1)] ?? "",
        jahr: state.jahr,
        score: Math.trunc(highscoreValue(p, state.jahr)),
      });
    }
    entries.sort((a, b) => b.score - a.score);

    this.children.removeAll();
    const group = new FocusGroup(this);
    const { content } = frame();
    screenTitle(this, t("highscore.title"), content.y);

    const panel = new Panel(
      this,
      content.x,
      content.y + 54,
      content.w,
      content.h - 54,
    );
    panel.add(
      label(this, SPACE.lg, 60, t("highscore.header"), {
        color: COLORS.accent,
        size: FS.small,
        weight: "bold",
      }),
    );
    entries.forEach((e, i) => {
      panel.add(
        label(
          this,
          SPACE.lg,
          100 + i * 40,
          `${i + 1}.  ${e.title.padEnd(12)} ${e.name.padEnd(14)} ${e.jahr}   ${e.score}`,
          { mono: true },
        ),
      );
    });

    await new Promise<void>((resolve) =>
      primaryAction(this, group, t("ui.continue"), resolve),
    );
    group.destroy();

    toMenu(this.scene);
  }
}
