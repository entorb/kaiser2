import { nextTurn } from "../flow";
import { t } from "../i18n/i18n";
import { playerColor } from "../model/constants";
import { cities } from "../model/rules";
import { getState } from "../model/session";
import type { PlayerState } from "../model/types";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS, RADIUS, SPACE } from "../ui/theme";
import { Panel } from "../ui/widgets";
import { GameScene } from "./base";
import {
  gameMenuButton,
  primaryAction,
  screenTitle,
  titleName,
} from "./common";

interface Column {
  label: string;
  value: (p: PlayerState) => string;
}

/** Ranking of the human rulers with their key possessions (replaces the map). */
export class Ranking extends GameScene {
  constructor() {
    super("Ranking");
  }

  async create() {
    const state = getState(this);
    const { content } = frame();
    const group = new FocusGroup(this);
    gameMenuButton(this, group);
    // The new-year page: the year heading with the ranking table below it.
    screenTitle(this, `${t("status.year")} ${state.jahr}`, content.y);
    const panel = new Panel(
      this,
      content.x,
      content.y + 54,
      content.w,
      content.h - 54,
      t("ranking.title"),
    );

    const players = state.players
      .slice(1, state.count + 1)
      .sort((a, b) => b.punkte - a.punkte);

    // 7 data fields; land shown raw (not divided by 1000).
    const columns: Column[] = [
      {
        label: t("ranking.points"),
        value: (p) => `${Math.trunc(p.punkte)}`,
      },
      {
        label: t("ranking.fortune"),
        value: (p) => `${Math.trunc(p.geld)}`,
      },
      {
        label: t("ranking.population"),
        value: (p) => `${Math.trunc(p.leute)}`,
      },
      {
        label: t("ranking.acre"),
        value: (p) => `${Math.trunc(p.acker)}`,
      },
      {
        label: t("ranking.building"),
        value: (p) => `${Math.trunc(p.land)}`,
      },
      { label: t("ranking.markets"), value: (p) => `${p.markt}` },
      { label: t("ranking.mills"), value: (p) => `${p.muhl}` },
      { label: t("ranking.cities"), value: (p) => `${cities(p)}` },
    ];

    const rankW = 70;
    const nameW = 190;
    const colW = (content.w - SPACE.lg * 2 - rankW - nameW) / columns.length;
    const colX = (i: number) => SPACE.lg + rankW + nameW + i * colW;
    const headY = 56;
    const rowY0 = 100;
    const rowH = 42;

    const stripes = this.add.graphics();
    players.forEach((_p, i) => {
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
    columns.forEach((col, i) => {
      const l = label(this, colX(i) + colW, headY, col.label, {
        color: COLORS.muted,
        size: FS.small,
        weight: "bold",
        origin: 1,
      });
      l.setOrigin(1, 0);
      panel.add(l);
    });

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS.border, 1);
    sep.lineBetween(SPACE.lg, headY + 24, content.w - SPACE.lg, headY + 24);
    panel.add(sep);

    players.forEach((p, i) => {
      const y = rowY0 + i * rowH;
      const color = playerColor(p.portrait);
      panel.add(
        label(this, SPACE.lg, y, `${i + 1}`, {
          color: COLORS.muted,
          mono: true,
        }),
      );
      panel.add(
        label(this, SPACE.lg + rankW, y, `${titleName(p.titel)} ${p.name}`, {
          color,
          weight: "bold",
        }),
      );
      columns.forEach((col, c) => {
        const l = label(this, colX(c) + colW, y, col.value(p), {
          mono: true,
        });
        l.setOrigin(1, 0);
        panel.add(l);
      });
    });

    await new Promise<void>((resolve) =>
      primaryAction(this, group, t("ui.continue"), resolve),
    );
    group.destroy();

    nextTurn(this.scene);
  }
}
