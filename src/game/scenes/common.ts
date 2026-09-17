import type Phaser from "phaser";
import { isMuted, onMuteChange, toggleMute } from "../audio/music";
import { toHighscore } from "../flow";
import { t } from "../i18n/i18n";
import { PROVINCES, TITLES } from "../model/constants";
import { landShortage } from "../model/rules";
import { clearSave } from "../model/save";
import type { GameState } from "../model/types";
import { alert } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import { drawShield } from "../ui/icon";
import { CANVAS_H, CANVAS_W, frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, css, FS, RADIUS, SPACE } from "../ui/theme";
import { Button, Panel } from "../ui/widgets";

export function provinceName(sp: number): string {
  return PROVINCES[sp - 1] ?? "";
}

export function titleName(titel: number): string {
  return TITLES[Math.min(titel, TITLES.length - 1)] ?? "";
}

/**
 * Shared in-game chrome: the top status bar (ruler identity on the left,
 * money/points/population on the right) and a `Menü` button in the bottom-left
 * of the action bar that opens the pause menu. The button joins the scene's
 * focus ring without taking initial focus, so the screen's own first widget
 * still leads.
 */
export function statusBar(
  scene: Phaser.Scene,
  state: GameState,
  group: FocusGroup,
): Phaser.GameObjects.Container {
  const { header } = frame();
  const p = state.players[state.sp];
  const c = scene.add.container(header.x, header.y);

  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.surface, 1);
  bg.fillRoundedRect(0, 0, header.w, header.h, RADIUS);
  bg.lineStyle(2, COLORS.wood, 1);
  bg.strokeRoundedRect(1, 1, header.w - 2, header.h - 2, RADIUS);
  c.add(bg);

  const icon = scene.add.graphics();
  drawShield(icon, SPACE.lg + 20, header.h / 2, 32, p.portrait);
  c.add(icon);

  const textX = SPACE.lg + 48;
  c.add(
    label(scene, textX, 10, p.name, {
      size: FS.heading,
      weight: "bold",
      color: COLORS.text,
    }),
  );
  c.add(
    label(
      scene,
      textX,
      32,
      `${titleName(p.titel)} · ${provinceName(state.sp)} · ${t("status.year")} ${state.jahr}`,
      { color: COLORS.muted, size: FS.small },
    ),
  );

  const money = label(scene, header.w - SPACE.lg, 10, `${Math.trunc(p.geld)}`, {
    mono: true,
    size: FS.heading,
    color: COLORS.accent,
  });
  money.setOrigin(1, 0);
  c.add(money);
  const moneyLabel = label(scene, header.w - SPACE.lg, 32, t("common.taler"), {
    color: COLORS.muted,
    size: FS.small,
  });
  moneyLabel.setOrigin(1, 0);
  c.add(moneyLabel);

  const points = label(
    scene,
    header.w - SPACE.lg - 190,
    10,
    `${Math.trunc(p.punkte)}`,
    { mono: true, size: FS.heading },
  );
  points.setOrigin(1, 0);
  c.add(points);
  const pointsLabel = label(
    scene,
    header.w - SPACE.lg - 190,
    32,
    t("status.points"),
    { color: COLORS.muted, size: FS.small },
  );
  pointsLabel.setOrigin(1, 0);
  c.add(pointsLabel);

  const population = label(
    scene,
    header.w - SPACE.lg - 380,
    10,
    `${Math.trunc(p.leute)}`,
    { mono: true, size: FS.heading },
  );
  population.setOrigin(1, 0);
  c.add(population);
  const populationLabel = label(
    scene,
    header.w - SPACE.lg - 380,
    32,
    t("status.population"),
    { color: COLORS.muted, size: FS.small },
  );
  populationLabel.setOrigin(1, 0);
  c.add(populationLabel);

  gameMenuButton(scene, group);

  return c;
}

/** Bottom-left `Menü` button; opens the pause menu. Joins the focus ring. */
export function gameMenuButton(scene: Phaser.Scene, group: FocusGroup): Button {
  const { action } = frame();
  const menu = new Button(
    scene,
    action.x,
    action.y + (action.h - 40) / 2,
    120,
    40,
    t("menu.pause"),
    { onClick: () => openGameMenu(scene) },
  );
  menu.bind(group, false);
  return menu;
}

/**
 * Pause overlay for the in-game `Menü` button. Opening it puts its own focus
 * group on top, which suspends the screen behind it (keyboard) and blocks
 * pointer input via the dimming overlay, so the game is paused until resumed.
 */
function openGameMenu(scene: Phaser.Scene): void {
  const w = 420;
  const h = 300;
  const x = (CANVAS_W - w) / 2;
  const y = (CANVAS_H - h) / 2;
  const overlay = scene.add
    .rectangle(0, 0, CANVAS_W, CANVAS_H, 0x000000, 0.65)
    .setOrigin(0, 0)
    .setInteractive();
  const panel = new Panel(scene, x, y, w, h, t("menu.pauseTitle"));
  const group = new FocusGroup(scene);

  const musicLabel = () => t(isMuted() ? "menu.musicOff" : "menu.musicOn");
  const music = new Button(scene, 50, 80, 320, 46, musicLabel(), {
    onClick: () => toggleMute(),
  });
  const end = new Button(scene, 50, 140, 320, 46, t("menu.endGame"), {
    variant: "danger",
    onClick: () => {
      close();
      clearSave();
      toHighscore(scene.scene);
    },
  });
  const resume = new Button(scene, 50, 200, 320, 46, t("menu.resume"), {
    variant: "primary",
    onClick: () => close(),
  });
  panel.add(music);
  panel.add(end);
  panel.add(resume);
  music.bind(group);
  end.bind(group);
  resume.bind(group);
  group.focus(resume);

  const stopWatchingMute = onMuteChange(() => music.setText(musicLabel()));
  const onEsc = () => close();
  scene.input.keyboard?.on("keydown-ESC", onEsc);
  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    stopWatchingMute();
    scene.input.keyboard?.off("keydown-ESC", onEsc);
    group.destroy();
    overlay.destroy();
    panel.destroy();
  }
}

/** Raze surplus markets/mills when building land no longer covers them. */
export async function applyLandShortage(
  scene: Phaser.Scene,
  state: GameState,
): Promise<void> {
  const lost = landShortage(state.players[state.sp]);
  if (lost.markt === 0 && lost.muhl === 0) return;
  await alert(scene, t("land.shortageTitle"), [
    t("land.shortageText", { markt: lost.markt, muhl: lost.muhl }),
  ]);
}

/** Screen heading aligned to the content area's left edge. */
export function screenTitle(
  scene: Phaser.Scene,
  text: string,
  y: number,
): Phaser.GameObjects.Text {
  return label(scene, frame().content.x, y, text, {
    size: FS.title,
    weight: "bold",
    display: true,
    color: COLORS.accent,
  }).setShadow(0, 2, css(COLORS.woodDark), 4);
}

/** Primary button placed in the bottom action bar, right aligned. */
export function primaryAction(
  scene: Phaser.Scene,
  group: FocusGroup,
  text: string,
  onClick: () => void,
): Button {
  const { action } = frame();
  const w = 200;
  const h = 52;
  const btn = new Button(
    scene,
    action.x + action.w - w,
    action.y + (action.h - h) / 2,
    w,
    h,
    text,
    { variant: "primary", onClick },
  );
  btn.bind(group);
  // Start with focus on the advance button so Enter proceeds.
  group.focus(btn);
  return btn;
}
