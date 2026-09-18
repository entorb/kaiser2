import { GAME_CONFIG } from "../config";
import { startTurn } from "../flow";
import { t } from "../i18n/i18n";
import {
  createGameState,
  freeColor,
  MAX_PORTRAIT,
  nextFreeColor,
  PROVINCES,
  playerNameError,
  takenColors,
} from "../model/constants";
import { loadProfiles, type Profile, saveProfiles } from "../model/profiles";
import { saveGame } from "../model/save";
import { setState } from "../model/session";
import { reportGameStart } from "../model/stats";
import { startRuler } from "../model/turn";
import type { GameState } from "../model/types";
import { playerAt } from "../model/types";
import { type Focusable, FocusGroup } from "../ui/focus";
import { drawShield } from "../ui/icon";
import { frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, css, FONT_UI, FS, RADIUS, SPACE } from "../ui/theme";
import { Button, Slider } from "../ui/widgets";
import { GameScene } from "./base";
import { primaryAction, screenTitle } from "./common";

export class NewGame extends GameScene {
  constructor() {
    super("NewGame");
  }

  async create() {
    const state = createGameState(GAME_CONFIG.maxPlayers);
    setState(this, state);

    state.count = await this.askPlayerCount();
    // Last game's rulers come back prefilled (name, kingdom, coat of arms).
    const profiles = loadProfiles();
    for (let i = 1; i <= state.count; i++)
      await this.setupPlayer(state, i, profiles[i - 1] ?? null);
    saveProfiles(state.players, state.count);
    state.sp = 1;
    reportGameStart();

    // KAISERB:2380 - the first ruler also ages and scores on their first turn.
    startRuler(state);
    saveGame(state);
    startTurn(this.scene);
  }

  /** How many rulers play: a 1..N slider, confirmed with OK. */
  private async askPlayerCount(): Promise<number> {
    const group = new FocusGroup(this);
    const { content } = frame();
    screenTitle(this, t("newGame.prompt"), content.y);
    label(this, content.x, content.y + 48, t("newGame.playerCount"), {
      size: FS.heading,
      color: COLORS.accent,
      weight: "bold",
    });

    let finish: () => void = () => {};
    const control = new Slider(this, content.x, content.y + 92, content.w, 88, {
      min: GAME_CONFIG.minPlayers,
      max: GAME_CONFIG.maxPlayers,
      initial: GAME_CONFIG.minPlayers,
      format: String,
      ticks: Array.from(
        { length: GAME_CONFIG.maxPlayers - GAME_CONFIG.minPlayers + 1 },
        (_, i) => ({
          value: GAME_CONFIG.minPlayers + i,
          label: String(GAME_CONFIG.minPlayers + i),
        }),
      ),
      onSubmit: () => finish(),
    });
    control.bind(group);

    const count = await new Promise<number>((resolve) => {
      finish = () => resolve(control.value);
      primaryAction(this, group, t("ui.ok"), finish);
      group.focus(control);
    });
    group.destroy();
    return count;
  }

  /**
   * Per ruler: enter a name and a kingdom and pick a coat of arms on one
   * screen. All stay editable until OK. The confirm button sits inline next to
   * the inputs so the on-screen keyboard cannot cover it.
   */
  private setupPlayer(
    state: GameState,
    index: number,
    profile: Profile | null,
  ): Promise<void> {
    this.clearScreen();
    const group = new FocusGroup(this);
    const { content } = frame();
    const p = playerAt(state, index);
    p.portrait = freeColor(
      state.players,
      index,
      profile?.portrait ?? p.portrait,
    );
    const taken = takenColors(state.players, index);
    const usedNames = state.players
      .slice(1, index)
      .map((x) => x.name)
      .filter((n) => n !== "");

    screenTitle(this, `${t("newGame.player")} ${index}:`, content.y);

    // Coat of arms first; the ring marks the current choice and starts focused.
    label(this, content.x, content.y + 44, t("newGame.chooseIcon"), {
      size: FS.heading,
      color: COLORS.accent,
      weight: "bold",
    });

    const cellW = content.w / MAX_PORTRAIT;
    const ph = 128;
    const imageY = content.y + 72;
    const iconSize = Math.min(cellW - 28, 104);

    const icons = this.add.graphics();
    for (let i = 0; i < MAX_PORTRAIT; i++) {
      drawShield(
        icons,
        content.x + i * cellW + cellW / 2,
        imageY + ph / 2,
        iconSize,
        i,
        taken.has(i),
      );
    }

    let iconFocused = false;
    const ring = this.add.graphics();
    const update = () => {
      ring.clear();
      ring.lineStyle(
        iconFocused ? 4 : 3,
        iconFocused ? COLORS.accentHover : COLORS.accent,
        1,
      );
      ring.strokeRoundedRect(
        content.x + p.portrait * cellW + 4,
        imageY + 4,
        cellW - 8,
        ph - 8,
        RADIUS + 2,
      );
    };
    update();

    const onLeft = () => {
      p.portrait = nextFreeColor(taken, p.portrait, -1);
      update();
    };
    const onRight = () => {
      p.portrait = nextFreeColor(taken, p.portrait, 1);
      update();
    };

    // Name and kingdom: native DOM inputs (canvas has no caret), scaled with
    // the camera.
    const inputW = 300;
    const kingdomX = content.x + inputW + 30;
    const heading = {
      size: FS.heading,
      color: COLORS.accent,
      weight: "bold",
    } as const;
    label(this, content.x, content.y + 212, t("newGame.nameHint"), heading);
    label(this, kingdomX, content.y + 212, t("newGame.kingdomHint"), heading);
    const [nameInput, nameField] = this.textInput(
      content.x,
      content.y + 240,
      inputW,
      10,
      profile?.name ?? "",
    );
    const [kingdomInput, kingdomField] = this.textInput(
      kingdomX,
      content.y + 240,
      inputW,
      12,
      profile?.kingdom ?? PROVINCES[index - 1] ?? "",
    );
    const inputs = [nameInput, kingdomInput];

    const err = label(this, content.x, content.y + 288, "", {
      color: COLORS.danger,
      size: FS.small,
    });
    for (const input of inputs)
      input.addEventListener("input", () => err.setText(""));

    // The picker is the first focus target: arrows move the shield, Enter moves
    // on to the name field.
    const iconFocus: Focusable = {
      setFocused: (focused) => {
        iconFocused = focused;
        update();
      },
      handleKey: (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onLeft();
          return true;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onRight();
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          nameInput.focus();
          return true;
        }
        return false;
      },
    };
    group.add(iconFocus);

    for (let i = 0; i < MAX_PORTRAIT; i++) {
      if (taken.has(i)) continue;
      const zone = this.add
        .zone(content.x + i * cellW, imageY, cellW, ph)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        p.portrait = i;
        group.focus(iconFocus);
        update();
      });
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const confirm = () => {
        const name = nameInput.value.trim().slice(0, 10);
        const kingdom = kingdomInput.value.trim().slice(0, 12);
        const nameError = playerNameError(name, usedNames);
        if (nameError || !kingdom) {
          if (nameError) {
            err.setText(
              nameError === "empty"
                ? t("newGame.nameEmpty")
                : t("newGame.nameTaken"),
            );
            nameInput.focus();
          } else {
            err.setText(t("newGame.kingdomEmpty"));
            kingdomInput.focus();
          }
          return;
        }
        if (settled) return;
        settled = true;
        p.name = name;
        p.kingdom = kingdom;
        for (const input of inputs) input.blur();
        nameField.destroy();
        kingdomField.destroy();
        group.destroy();
        resolve();
      };

      const ok = new Button(
        this,
        content.x + content.w - 240,
        content.y + 240,
        240,
        80,
        t("ui.ok"),
        { variant: "primary", onClick: confirm },
      );
      ok.bind(group);

      // Isolate typing from game keys (Phaser listens on window), so arrows do
      // not move the shield and Enter does not double-fire through the group.
      // Enter moves from the name to the kingdom, and confirms from there.
      inputs.forEach((input, i) => {
        input.addEventListener("keydown", (event) => {
          event.stopPropagation();
          if (event.key === "ArrowUp" || event.key === "Escape") {
            event.preventDefault();
            input.blur();
            group.focus(iconFocus);
            return;
          }
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (i === 0) kingdomInput.focus();
          else confirm();
        });
      });
    });
  }

  /** A text input styled like the game UI, as a DOM element in the scene. */
  private textInput(
    x: number,
    y: number,
    width: number,
    maxLength: number,
    value: string,
  ): [HTMLInputElement, Phaser.GameObjects.DOMElement] {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.maxLength = maxLength;
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.enterKeyHint = "done";
    input.inputMode = "text";
    input.placeholder = "_";
    // A prefilled value is replaced by typing.
    input.addEventListener("focus", () => input.select());
    Object.assign(input.style, {
      width: `${width}px`,
      height: "40px",
      boxSizing: "border-box",
      padding: `0 ${SPACE.md}px`,
      fontFamily: FONT_UI,
      fontSize: `${FS.heading}px`,
      color: css(COLORS.text),
      background: css(COLORS.surfaceAlt),
      border: `1px solid ${css(COLORS.border)}`,
      borderRadius: `${RADIUS}px`,
      outline: "none",
    });
    return [input, this.add.dom(x, y, input).setOrigin(0, 0)];
  }
}
