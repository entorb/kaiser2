import { playFanfare } from "../audio/music";
import { nextTurn, toRanking } from "../flow";
import { t } from "../i18n/i18n";
import { playerColor } from "../model/constants";
import { FocusGroup } from "../ui/focus";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, FS } from "../ui/theme";
import { Panel } from "../ui/widgets";
import { GameScene } from "./base";
import { continueAction, screenTitle } from "./common";

interface PromotionData {
  name: string;
  title: string;
  portrait: number;
  nextRanking: boolean;
}

/** KAISER4 PROC TITEL: full screen shown when a ruler gains a new title. */
export class Promotion extends GameScene {
  constructor() {
    super("Promotion");
  }

  create(data: PromotionData) {
    playFanfare();
    const group = new FocusGroup(this);
    const { content } = frame();
    screenTitle(this, t("promotion.title"), content.y);

    const panelH = content.h - 54;
    const panel = new Panel(this, content.x, content.y + 54, content.w, panelH);
    const cx = content.w / 2;
    const cy = panelH / 2;

    panel.add(
      label(this, cx, cy - 70, data.name, {
        size: FS.heading,
        color: COLORS.muted,
        origin: 0.5,
      }),
    );
    panel.add(
      label(this, cx, cy - 18, t("promotion.text"), {
        size: FS.body,
        color: COLORS.muted,
        origin: 0.5,
      }),
    );
    panel.add(
      label(this, cx, cy + 40, data.title, {
        size: 56,
        weight: "bold",
        color: playerColor(data.portrait),
        origin: 0.5,
      }),
    );

    continueAction(this, group, () =>
      data.nextRanking ? toRanking(this.scene) : nextTurn(this.scene),
    );
  }
}
