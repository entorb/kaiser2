import { playCoins } from "../audio/music";
import { toCoronation, toMonument, toSecretService } from "../flow";
import { t } from "../i18n/i18n";
import { at } from "../lookup";
import {
  addBuilding,
  atMaxBuildings,
  BUILDINGS,
  type BuildingKind,
  buildingCost,
  landRequired,
} from "../model/constants";
import { applyInterest, depose, die, interest, pawn } from "../model/events";
import { titleAdvance } from "../model/rules";
import { getState } from "../model/session";
import type { GameState } from "../model/types";
import { playerAt } from "../model/types";
import { alert } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import {
  drawBuildingIcon,
  drawCoinsIcon,
  drawEventIcon,
  drawPointsIcon,
} from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, css } from "../ui/theme";
import { type ListItem, ListMenu } from "../ui/widgets";
import { GameScene } from "./base";
import {
  BUILDING_ICON,
  BUILDING_LABEL,
  closeTurn,
  FOOTER_X,
  primaryAction,
  screenTitle,
  statusBar,
} from "./common";

const BUILDING_ORDER: BuildingKind[] = ["markt", "muhl", "burg", "dom"];

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
        const cost = buildingCost(p, kind, state.rules);
        const maxed = b.max !== undefined && p[kind] >= b.max;
        const count =
          kind === "burg" || kind === "dom"
            ? `${p[kind]}/${b.max}`
            : `${p[kind]}`;
        return {
          label: t(BUILDING_LABEL[kind]),
          lead: count,
          icon: BUILDING_ICON[kind],
          value: `${cost}`,
          valueIcon: drawCoinsIcon,
          disabled: maxed || p.geld < cost || p.land < required,
        };
      });
      options.push({
        label: t("secret.title"),
        icon: (g, x, y, size) => drawEventIcon(g, x, y, size, "spy"),
      });
      const zins = Math.trunc(interest(p.geld));
      options.push({
        label: t("business.interest"),
        icon: drawCoinsIcon,
        value: `${zins}`,
        valueIcon: drawCoinsIcon,
        disabled: true,
      });

      // Footer: requirements and benefit of the highlighted building. Cost and
      // land turn red when the ruler cannot afford / does not own enough.
      const footerY = action.y + action.h / 2;
      // Three groups (icon + figure) share the bar between the gear and the
      // advance button.
      const groupW = (action.w - FOOTER_X - 240) / 3;
      const groupX = (i: number) => action.x + FOOTER_X + i * groupW;
      const costIcon = this.add.graphics();
      drawCoinsIcon(costIcon, groupX(0) + 14, footerY, 26);
      const costLabel = label(this, groupX(0) + 36, footerY, "", {
        color: COLORS.onWood,
      });
      const landIcon = this.add.graphics();
      drawBuildingIcon(landIcon, groupX(1) + 14, footerY, 26);
      const landLabel = label(this, groupX(1) + 36, footerY, "", {
        color: COLORS.onWood,
      });
      const pointsIcon = this.add.graphics();
      drawPointsIcon(pointsIcon, groupX(2) + 14, footerY, 26);
      const pointsLabel = label(this, groupX(2) + 36, footerY, "", {
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
        const cost = buildingCost(p, kind, state.rules);
        const required =
          kind === "burg" || kind === "dom" ? b.land : (p[kind] + 1) * b.land;
        for (const icon of [costIcon, landIcon, pointsIcon])
          icon.setVisible(true);
        costLabel.setText(`${cost}`);
        costLabel.setColor(css(p.geld < cost ? COLORS.danger : COLORS.onWood));
        landLabel.setText(`${required} / ${Math.trunc(p.land)}`);
        landLabel.setColor(
          css(p.land < required ? COLORS.danger : COLORS.onWood),
        );
        pointsLabel.setText(`+${b.points}`);
      };
      describe(0);

      // Buildings and the secret service are one list; the expected interest
      // sits in its own strip below the last row.
      const rowH = 46;
      const gap = 6;
      const listY = content.y + 54;
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
        const kind = at(BUILDING_ORDER, choice);
        if (await this.buyBuilding(state, kind)) {
          toMonument(this.scene, { kind });
          return;
        }
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

  /**
   * Market/mill need land per building; palace/cathedral need a land total.
   * Returns true when this purchase completed the palace or cathedral.
   */
  private async buyBuilding(
    state: GameState,
    kind: BuildingKind,
  ): Promise<boolean> {
    const p = playerAt(state, state.sp);
    if (atMaxBuildings(p, kind)) return false;
    if (p.land < landRequired(p, kind)) {
      await alert(this, t("business.noLand"));
      return false;
    }
    playCoins();
    addBuilding(p, kind, state.rules);
    return atMaxBuildings(p, kind);
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
      toCoronation(this.scene, { name: p.name });
      return;
    }

    closeTurn(this, state, p, p.titel > beforeTitel);
  }
}
