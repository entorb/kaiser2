import type Phaser from "phaser";
import { isMuted, onMuteChange, toggleMute } from "../audio/music";
import { toHighscore } from "../flow";
import { t } from "../i18n/i18n";
import { TITLES } from "../model/constants";
import { landShortage } from "../model/rules";
import { clearSave } from "../model/save";
import type { GameState } from "../model/types";
import { alert } from "../ui/dialog";
import { FocusGroup } from "../ui/focus";
import { fullscreenButton } from "../ui/fullscreen";
import {
  drawArrowIcon,
  drawCoinsIcon,
  drawCrowdIcon,
  drawGearIcon,
  drawPointsIcon,
  drawShield,
  type IconDraw,
} from "../ui/icon";
import { CANVAS_H, CANVAS_W, frame } from "../ui/layout";
import { label } from "../ui/text";
import { COLORS, css, FS, RADIUS, SPACE } from "../ui/theme";
import { Button, Panel } from "../ui/widgets";

export function titleName(titel: number): string {
  return TITLES[Math.min(titel, TITLES.length - 1)] ?? "";
}

/**
 * One right-aligned status figure with its unit icon to the left of it, so the
 * HUD carries no unit words. `right` is the right edge in container coords.
 */
function statusFigure(
  scene: Phaser.Scene,
  c: Phaser.GameObjects.Container,
  right: number,
  cy: number,
  value: string,
  draw: IconDraw,
  color: number = COLORS.text,
): void {
  const text = label(scene, right, cy, value, {
    mono: true,
    size: FS.heading,
    color,
  });
  text.setOrigin(1, 0.5);
  c.add(text);
  const size = 20;
  const g = scene.add.graphics();
  draw(g, right - text.width - 10 - size / 2, cy, size);
  c.add(g);
}

/**
 * Shared in-game chrome: the top status bar (ruler identity on the left,
 * money/points/population on the right) and a gear button in the bottom-left
 * of the action bar that opens the pause menu (click or Escape; the button is
 * not in the focus ring).
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

  // The year leads the bar, big; the ruler's shield and name follow.
  const year = label(scene, SPACE.lg, header.h / 2, `${state.jahr}`, {
    size: FS.title,
    weight: "bold",
    display: true,
    color: COLORS.accent,
  }).setOrigin(0, 0.5);
  c.add(year);
  const rulerX = SPACE.lg + year.width + SPACE.lg;

  const icon = scene.add.graphics();
  drawShield(icon, rulerX + 20, header.h / 2, 32, p.portrait);
  c.add(icon);

  const textX = rulerX + 48;
  c.add(
    label(scene, textX, 10, p.name, {
      size: FS.heading,
      weight: "bold",
      color: COLORS.text,
    }),
  );
  c.add(
    label(scene, textX, 32, `${titleName(p.titel)} · ${p.kingdom}`, {
      color: COLORS.muted,
      size: FS.small,
    }),
  );

  const cy = header.h / 2;
  const right = header.w - SPACE.lg;
  // Money keeps its gold accent; the other two stay ink.
  statusFigure(
    scene,
    c,
    right,
    cy,
    `${Math.trunc(p.geld)}`,
    drawCoinsIcon,
    COLORS.accent,
  );
  statusFigure(
    scene,
    c,
    right - 190,
    cy,
    `${Math.trunc(p.punkte)}`,
    drawPointsIcon,
  );
  statusFigure(
    scene,
    c,
    right - 380,
    cy,
    `${Math.trunc(p.leute)}`,
    drawCrowdIcon,
  );

  gameMenuButton(scene, group);

  return c;
}

/** One Escape listener per scene: each screen rebuild replaces the last. */
const menuEscape = new WeakMap<Phaser.Scene, () => void>();

/**
 * Bottom-left gear button; opens the pause menu. It stays out of the focus
 * ring, so the arrow keys never reach it: mouse click or Escape only.
 */
export function gameMenuButton(scene: Phaser.Scene, group: FocusGroup): Button {
  const { action } = frame();
  const menu = new Button(
    scene,
    action.x,
    action.y + (action.h - 48) / 2,
    56,
    48,
    "",
    { icon: drawGearIcon, onClick: () => openGameMenu(scene) },
  );
  const previous = menuEscape.get(scene);
  if (previous) scene.input.keyboard?.off("keydown-ESC", previous);
  // A dialog or the open menu owns the keyboard: `group` is then inactive.
  const onEsc = () => {
    if (group.active) openGameMenu(scene);
  };
  menuEscape.set(scene, onEsc);
  scene.input.keyboard?.on("keydown-ESC", onEsc);
  return menu;
}

/**
 * Pause overlay for the in-game `Menü` button. Opening it puts its own focus
 * group on top, which suspends the screen behind it (keyboard) and blocks
 * pointer input via the dimming overlay, so the game is paused until resumed.
 */
function openGameMenu(scene: Phaser.Scene): void {
  const w = 420;
  const h = 360;
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
  const fullscreen = fullscreenButton(scene, group, 50, 260, 320, 46);
  if (fullscreen) panel.add(fullscreen);
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

/**
 * Primary button placed in the bottom action bar, right aligned. `icon` is
 * drawn left of the label, or centered when the label is empty.
 */
export function primaryAction(
  scene: Phaser.Scene,
  group: FocusGroup,
  text: string,
  onClick: () => void,
  icon?: IconDraw,
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
    { variant: "primary", onClick, icon },
  );
  btn.bind(group);
  // Start with focus on the advance button so Enter proceeds.
  group.focus(btn);
  return btn;
}

/** The advance button: a right arrow instead of the word "Weiter". */
export function continueAction(
  scene: Phaser.Scene,
  group: FocusGroup,
  onClick: () => void,
): Button {
  return primaryAction(scene, group, "", onClick, drawArrowIcon);
}

/** Font size of a big panel figure. */
const FIGURE_SIZE = 34;

/**
 * A big number with its unit icon, centered as one block in `panel` at height
 * `cy` (panel coords).
 */
export function panelFigure(
  scene: Phaser.Scene,
  panel: Panel,
  cy: number,
  text: string,
  color: number,
  draw: IconDraw,
): void {
  const figure = label(scene, 0, cy, text, {
    size: FIGURE_SIZE,
    weight: "bold",
    mono: true,
    color,
  }).setOrigin(0, 0.5);
  const iconSize = 40;
  const gap = 12;
  const left = (panel.w - (iconSize + gap + figure.width)) / 2;
  figure.setX(left + iconSize + gap);
  const g = scene.add.graphics();
  draw(g, left + iconSize / 2, cy, iconSize);
  panel.add(g);
  panel.add(figure);
}

/** Explanatory text in the bottom action bar, between the menu and next button. */
export function actionFooter(
  scene: Phaser.Scene,
  text: string,
): Phaser.GameObjects.Text {
  const { action } = frame();
  return label(scene, action.x + 140, action.y + action.h / 2, text, {
    color: COLORS.onWood,
    size: FS.small,
    wrap: action.w - 360,
  }).setOrigin(0, 0.5);
}
