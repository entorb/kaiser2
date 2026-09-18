import { playCoins } from "../audio/music";
import {
  nextTurn,
  toHighscore,
  toPromotion,
  toRanking,
  toSecretService,
} from "../flow";
import { t } from "../i18n/i18n";
import type { StringKey } from "../i18n/strings";
import { at } from "../lookup";
import { MAX_BURG, MAX_DOM } from "../model/constants";
import { applyInterest, depose, die, interest, pawn } from "../model/events";
import { titleAdvance } from "../model/rules";
import { saveGame } from "../model/save";
import { getState } from "../model/session";
import { advancePlayer } from "../model/turn";
import type { GameState } from "../model/types";
import { playerAt } from "../model/types";
import { alert } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import {
  drawBuildingIcon,
  drawCathedralIcon,
  drawCoinsIcon,
  drawEventIcon,
  drawPalaceIcon,
  drawPointsIcon,
  type IconDraw,
} from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, css, SPACE } from "../ui/theme";
import { type ListItem, ListMenu, Panel, StatRow } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle, statusBar, titleName } from "./common";

type BuildingKind = "markt" | "muhl" | "burg" | "dom";

interface BuildingInfo {
  cost: number;
  /** Building land per building (market/mill) or the total required (palace/cathedral). */
  land: number;
  points: number;
  max?: number;
}

const BUILDINGS: Record<BuildingKind, BuildingInfo> = {
  markt: { cost: 1000, land: 600, points: 0.5 },
  muhl: { cost: 2000, land: 1000, points: 0.8 },
  burg: { cost: 5000, land: 20000, points: 1.6, max: MAX_BURG },
  dom: { cost: 9000, land: 30000, points: 2.1, max: MAX_DOM },
};
const BUILDING_ORDER: BuildingKind[] = ["markt", "muhl", "burg", "dom"];

const BUILDING_LABEL: Record<BuildingKind, StringKey> = {
  markt: "business.market",
  muhl: "business.mill",
  burg: "business.palace",
  dom: "business.cathedral",
};

const BUILDING_ICON: Record<BuildingKind, IconDraw> = {
  markt: (g, x, y, size) => drawEventIcon(g, x, y, size, "market"),
  muhl: (g, x, y, size) => drawEventIcon(g, x, y, size, "mill"),
  burg: drawPalaceIcon,
  dom: drawCathedralIcon,
};

export class Business extends GameScene {
  constructor() {
    super("Business");
  }

  async create() {
    const state = getState(this);
    const p = playerAt(state, state.sp);
    let done = false;
    // Keep the highlight on the same row after a purchase rebuilds the menu.
    let selected = 0;
    // Only after a purchase should focus stay on the list; on entry it starts
    // on the "Ende" action button.
    let focusList = false;

    while (!done) {
      this.clearScreen();
      const group = new FocusGroup(this);
      const { content, action } = frame();
      statusBar(this, state, group);
      screenTitle(this, t("business.title"), content.y);

      const options: ListItem[] = BUILDING_ORDER.map((kind) => {
        const b = BUILDINGS[kind];
        const required =
          kind === "burg" || kind === "dom" ? b.land : (p[kind] + 1) * b.land;
        const maxed = b.max !== undefined && p[kind] >= b.max;
        const count =
          kind === "burg" || kind === "dom"
            ? `${p[kind]}/${b.max}`
            : `${p[kind]}`;
        return {
          label: t(BUILDING_LABEL[kind]),
          lead: count,
          icon: BUILDING_ICON[kind],
          value: `${b.cost}`,
          valueIcon: drawCoinsIcon,
          disabled: maxed || p.geld < b.cost || p.land < required,
        };
      });
      options.push({
        label: t("secret.title"),
        icon: (g, x, y, size) => drawEventIcon(g, x, y, size, "spy"),
      });

      // Footer: requirements and benefit of the highlighted building. Cost and
      // land turn red when the ruler cannot afford / does not own enough.
      const footerY = action.y + action.h / 2;
      const costIcon = this.add.graphics();
      drawCoinsIcon(costIcon, action.x + 149, footerY, 18);
      const costLabel = label(this, action.x + 168, footerY, "", {
        color: COLORS.onWood,
      });
      const landIcon = this.add.graphics();
      drawBuildingIcon(landIcon, action.x + 349, footerY, 20);
      const landLabel = label(this, action.x + 368, footerY, "", {
        color: COLORS.onWood,
      });
      const pointsIcon = this.add.graphics();
      drawPointsIcon(pointsIcon, action.x + 619, footerY, 20);
      const pointsLabel = label(this, action.x + 638, footerY, "", {
        color: COLORS.onWood,
      });
      [costLabel, landLabel, pointsLabel].forEach((l) => {
        l.setOrigin(0, 0.5);
      });
      const describe = (index: number): void => {
        const kind = BUILDING_ORDER[index];
        if (!kind) {
          for (const icon of [costIcon, landIcon, pointsIcon])
            icon.setVisible(false);
          costLabel.setText("");
          landLabel.setText("");
          pointsLabel.setText("");
          return;
        }
        const b = BUILDINGS[kind];
        const required =
          kind === "burg" || kind === "dom" ? b.land : (p[kind] + 1) * b.land;
        for (const icon of [costIcon, landIcon, pointsIcon])
          icon.setVisible(true);
        costLabel.setText(`${b.cost}`);
        costLabel.setColor(
          css(p.geld < b.cost ? COLORS.danger : COLORS.onWood),
        );
        landLabel.setText(`${required} / ${Math.trunc(p.land)}`);
        landLabel.setColor(
          css(p.land < required ? COLORS.danger : COLORS.onWood),
        );
        pointsLabel.setText(`+${b.points}`);
      };
      describe(0);

      // Buildings and the secret service are one list; the expected interest
      // sits in its own strip below the last row.
      const rowH = 40;
      const gap = 6;
      const listY = content.y + 54;
      const listH = options.length * (rowH + gap) - gap;
      const zins = Math.trunc(interest(p.geld));
      const interestPanel = new Panel(
        this,
        content.x,
        listY + listH + 16,
        content.w,
        52,
      );
      interestPanel.add(
        new StatRow(
          this,
          SPACE.lg,
          14,
          content.w - SPACE.lg * 2,
          t("business.interest"),
          `${zins > 0 ? "+" : ""}${zins}`,
          { icon: drawCoinsIcon },
        ),
      );
      const choice = await new Promise<number>((resolve) => {
        const menu = new ListMenu(this, content.x, listY, content.w, options, {
          rowH,
          gap,
          onSelect: (i) => {
            selected = i;
            resolve(i);
          },
          onChange: (i) => describe(i),
        });
        menu.bind(group);
        menu.setSelected(selected);
        primaryAction(this, group, t("common.end"), () => resolve(-1));
        if (focusList) group.focus(menu);
        focusList = false;
      });
      group.destroy();

      if (choice >= 0 && choice < BUILDING_ORDER.length) {
        await this.buyBuilding(state, at(BUILDING_ORDER, choice));
        focusList = true;
      } else if (choice === 4) {
        // KAISER4:3151 - entering the secret service in debt costs 0.5 points.
        if (p.geld < 0) p.punkte -= 0.5;
        toSecretService(this.scene);
        return;
      } else if (choice < 0) {
        done = true;
      }
    }

    await this.endOfTurn(state);
  }

  /** Market/mill need land per building; palace/cathedral need a land total. */
  private async buyBuilding(
    state: GameState,
    kind: BuildingKind,
  ): Promise<void> {
    const p = playerAt(state, state.sp);
    const b = BUILDINGS[kind];
    if (b.max !== undefined && p[kind] >= b.max) return;
    const required =
      kind === "burg" || kind === "dom" ? b.land : (p[kind] + 1) * b.land;
    if (p.land < required) {
      await alert(this, t("business.noLand"));
      return;
    }
    playCoins();
    p.geld -= b.cost;
    p[kind] += 1;
    p.punkte += b.points;
  }

  private async endOfTurn(state: GameState): Promise<void> {
    const p = playerAt(state, state.sp);

    if (p.geld < -10000 - p.titel * 2000) {
      pawn(p);
      await alert(this, t("business.pawn"), [t("business.pawnText")]);
    }
    if (p.land + p.acker < p.leute * 10 && p.land > 0) {
      depose(p);
      await alert(this, t("business.deposedLand"), [
        t("business.deposedLandText"),
      ]);
    }
    if (p.zoll + p.mwst + p.ein < 20) {
      depose(p);
      await alert(this, t("business.deposedTax"), [
        t("business.deposedTaxText"),
      ]);
    }
    if (p.tod <= 0) {
      die(p);
      await alert(this, t("business.death"), [
        t("business.deathText"),
        t("business.deathHeir"),
      ]);
    }

    applyInterest(p);
    const beforeTitel = p.titel;
    if (titleAdvance(state, state.sp)) {
      await alert(this, t("business.win"));
      toHighscore(this.scene);
      return;
    }

    const year = state.jahr;
    advancePlayer(state);
    // Every ruler has played: checkpoint the new year to localStorage.
    const rolled = state.jahr !== year;
    if (rolled) saveGame(state);

    // KAISER4 PROC TITEL shows the new title before the next ruler starts; the
    // new-year ranking page follows it.
    if (p.titel > beforeTitel) {
      toPromotion(this.scene, {
        name: p.name,
        title: titleName(p.titel),
        portrait: p.portrait,
        nextRanking: rolled,
      });
      return;
    }
    if (rolled) {
      toRanking(this.scene);
      return;
    }
    nextTurn(this.scene);
  }
}
