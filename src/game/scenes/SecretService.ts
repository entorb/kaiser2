import { playCoins } from "../audio/music";
import { t } from "../i18n/i18n";
import {
  distributeGuards,
  type GuardKind,
  guardsInBuilding,
  resolveSabotage,
} from "../model/rules";
import { getState } from "../model/session";
import { type GameState, rand } from "../model/types";
import { alert, chooseList, numberPrompt } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import { drawCoinsIcon, drawEventIcon } from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, SPACE } from "../ui/theme";
import { type ListItem, ListMenu, Panel, StatRow } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle, statusBar } from "./common";

type Building = GuardKind;

export class SecretService extends GameScene {
  constructor() {
    super("SecretService");
  }

  async create() {
    const state = getState(this);
    const p = state.players[state.sp];
    const infP = 500 + rand(100);
    const artP = 600 + rand(100);
    const kavP = 100 + rand(50);
    const manP = 200 + rand(80);

    let done = false;
    while (!done) {
      this.children.removeAll();
      const group = new FocusGroup(this);
      const { content, action } = frame();
      statusBar(this, state, group);
      screenTitle(this, t("secret.title"), content.y);

      const panelW = 430;
      const panel = new Panel(
        this,
        content.x,
        content.y + 54,
        panelW,
        content.h - 54,
      );
      const rows: [string, string][] = [
        [t("secret.guards"), `${p.infant}`],
        [t("secret.saboteurs"), `${p.artell}`],
      ];
      rows.forEach(([labelText, value], i) => {
        panel.add(
          new StatRow(
            this,
            SPACE.lg,
            64 + i * 44,
            panelW - SPACE.lg * 2,
            labelText,
            value,
          ),
        );
      });

      const trainG = kavP * p.infant;
      const trainS = manP * p.artell;
      const options: ListItem[] = [
        {
          label: t("secret.hireGuards"),
          value: `${infP}`,
          valueIcon: drawCoinsIcon,
          disabled: p.geld < infP,
        },
        {
          label: t("secret.hireSaboteurs"),
          value: `${artP}`,
          valueIcon: drawCoinsIcon,
          disabled: p.geld < artP,
        },
        {
          label: t("secret.trainGuards"),
          value: `${trainG}`,
          valueIcon: drawCoinsIcon,
          disabled: p.infant <= 0 || p.geld < trainG,
        },
        {
          label: t("secret.trainSaboteurs"),
          value: `${trainS}`,
          valueIcon: drawCoinsIcon,
          disabled: p.artell <= 0 || p.geld < trainS,
        },
        {
          label: t("secret.operations"),
          icon: (g, x, y, size) => drawEventIcon(g, x, y, size, "spy"),
          disabled: p.artell <= 0,
        },
      ];

      // Footer: what the highlighted action does (training raises the strength
      // multiplier used in sabotage resolution).
      const footer = label(this, action.x + 140, action.y + action.h / 2, "", {
        color: COLORS.onWood,
      });
      footer.setOrigin(0, 0.5);
      const hints = [
        t("secret.hireGuardsHint"),
        t("secret.hireSaboteursHint"),
        t("secret.trainGuardsHint"),
        t("secret.trainSaboteursHint"),
        t("secret.operationsHint"),
      ];
      footer.setText(hints[0]);

      const menuW = 420;
      const choice = await new Promise<number>((resolve) => {
        const menu = new ListMenu(
          this,
          content.x + content.w - menuW,
          content.y + 54,
          menuW,
          options,
          {
            rowH: 42,
            gap: 8,
            onSelect: resolve,
            onChange: (i) => footer.setText(hints[i] ?? ""),
          },
        );
        menu.bind(group);
        // "Zurück" is the shared bottom action button, like every other screen.
        primaryAction(this, group, t("common.back"), () => resolve(-1));
      });
      group.destroy();

      if (choice === 0) {
        playCoins();
        p.infant++;
        p.geld -= infP;
      } else if (choice === 1) {
        playCoins();
        p.artell++;
        p.geld -= artP;
      } else if (choice === 2) {
        playCoins();
        p.kavall++;
        p.geld -= kavP * p.infant;
      } else if (choice === 3) {
        playCoins();
        p.manov++;
        p.geld -= manP * p.artell;
      } else if (choice === 4) {
        if (p.artell > 0) await this.operate(state);
      } else {
        done = true;
      }
    }

    this.scene.start("Business");
  }

  private async operate(state: GameState): Promise<void> {
    const p = state.players[state.sp];
    const names: ListItem[] = [];
    const indices: number[] = [];
    for (let i = 1; i <= state.count; i++) {
      if (i === state.sp) continue;
      names.push({ label: state.players[i].name });
      indices.push(i);
    }
    names.push({ label: t("secret.nobody") });

    const who = await chooseList(this, t("secret.target"), names, {
      cancel: true,
    });
    if (who < 0 || who >= indices.length) return;
    const target = state.players[indices[who]];

    const kinds: Building[] = ["muhl", "markt", "hh", "burg"];
    const counts = [target.muhl, target.markt, target.hh, target.burg];
    const labels = [
      t("business.mill"),
      t("business.market"),
      t("secret.house"),
      t("secret.palace"),
    ];
    const kind = await chooseList(
      this,
      t("secret.building"),
      labels.map((label, i) => ({
        label: `${label} (${counts[i]})`,
        disabled: counts[i] <= 0,
      })),
      { cancel: true },
    );
    if (kind < 0) return;
    const building = kinds[kind];

    // KAISER5:1630 - inspecting a building costs SPPI = RAND(500)+TITEL*500.
    playCoins();
    p.geld -= rand(500) + p.titel * 500;

    // KAISER5:920-1270 - the defender's guards are spread over the buildings;
    // the spy picks the weakest one, whose guards form the defence (WW).
    const guards = guardsInBuilding(distributeGuards(target), building);

    const sab = await numberPrompt(this, {
      title: t("secret.amount"),
      stel: 3,
      min: 1,
      max: p.artell,
    });
    if (sab === null || sab <= 0) return;
    const used = Math.min(sab, p.artell);
    if (used <= 0) return;

    const res = resolveSabotage(p, target, used, guards);
    p.artell -= used; // consumed either way (source only on failure; see bugs)

    if (res.success) {
      this.applyGains(state, building, target);
      // KAISER5:2120 - the guards in the razed building are killed.
      target.infant = Math.max(0, target.infant - guards);
      await alert(this, t("secret.success"));
    } else {
      await alert(this, t("secret.failed"));
    }
  }

  private applyGains(
    state: GameState,
    building: Building,
    target: GameState["players"][number],
  ): void {
    const p = state.players[state.sp];
    let lg = 0;
    let gg = 0;
    let kg = 0;
    if (building === "muhl") {
      lg = 1000 + rand(500);
      gg = 800 + rand(200);
      kg = 2000 + rand(1000);
      target.muhl = Math.max(0, target.muhl - 1);
    } else if (building === "markt") {
      lg = 2000;
      gg = 1600 + rand(400);
      kg = 4000 + rand(2000);
      target.markt = Math.max(0, target.markt - 1);
    } else if (building === "hh") {
      lg = 500 + rand(200);
      gg = 5600 + rand(900);
      kg = 1000 + rand(500);
      target.hh = Math.max(0, target.hh - 1);
    } else {
      lg = 1500 + rand(500);
      gg = 3000 + rand(1000);
      kg = 1500 + rand(800);
      target.burg = Math.max(0, target.burg - 1);
    }

    p.geld += gg;
    p.lkorn += kg;
    p.land += Math.trunc(lg / 2);
    p.acker += Math.trunc(lg / 2);
    target.geld -= gg;
    target.lkorn = Math.max(0, target.lkorn - kg);
    target.land = Math.max(0, target.land - Math.trunc(lg / 2));
    target.acker = Math.max(0, target.acker - Math.trunc(lg / 2));
  }
}
