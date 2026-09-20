import type { Scene } from "phaser";
import { t } from "../i18n/i18n";
import { FocusGroup } from "./focus";
import type { IconDraw } from "./icon";
import { CANVAS_H, CANVAS_W } from "./layout";
import { label } from "./text";
import { SPACE } from "./theme";
import {
  Button,
  type ListItem,
  ListMenu,
  Panel,
  Slider,
  type SliderOptions,
} from "./widgets";

interface Modal {
  group: FocusGroup;
  panel: Panel;
  close: () => void;
}

function openModal(
  scene: Scene,
  title: string,
  w: number,
  h: number,
  onCancel?: () => void,
): Modal {
  const x = (CANVAS_W - w) / 2;
  const y = (CANVAS_H - h) / 2;
  const overlay = scene.add
    .rectangle(0, 0, CANVAS_W, CANVAS_H, 0x000000, 0.65)
    .setOrigin(0, 0)
    .setInteractive();
  const panel = new Panel(scene, x, y, w, h, title);
  const group = new FocusGroup(scene);
  const onEsc = () => onCancel?.();
  scene.input.keyboard?.on("keydown-ESC", onEsc);
  return {
    group,
    panel,
    close: () => {
      scene.input.keyboard?.off("keydown-ESC", onEsc);
      group.destroy();
      overlay.destroy();
      panel.destroy();
    },
  };
}

/** A modal line: plain text, or text led by an icon. */
export type AlertLine = string | { icon: IconDraw; text: string };

const LINE_ICON = 28;
const LINE_ICON_GAP = 10;

const lineText = (line: AlertLine) =>
  typeof line === "string" ? line : line.text;
const lineIndent = (line: AlertLine) =>
  typeof line === "string" ? 0 : LINE_ICON + LINE_ICON_GAP;

/** Height the wrapped `lines` need, so a modal can be sized to its text. */
function linesHeight(scene: Scene, lines: AlertLine[], w: number): number {
  return lines.reduce((sum, line) => {
    const probe = label(scene, 0, 0, lineText(line), {
      wrap: w - SPACE.lg * 2 - lineIndent(line),
    });
    const h = Math.max(probe.height, lineIndent(line) ? LINE_ICON : 0);
    probe.destroy();
    return sum + h + LINE_GAP;
  }, 0);
}

function addLines(
  scene: Scene,
  panel: Panel,
  lines: AlertLine[],
  w: number,
): void {
  let y = 72;
  for (const line of lines) {
    const indent = lineIndent(line);
    const text = label(scene, SPACE.lg + indent, y, lineText(line), {
      wrap: w - SPACE.lg * 2 - indent,
    });
    const h = Math.max(text.height, indent ? LINE_ICON : 0);
    text.y = y + (h - text.height) / 2;
    panel.add(text);
    if (typeof line !== "string") {
      const g = scene.add.graphics();
      line.icon(g, SPACE.lg + LINE_ICON / 2, y + h / 2, LINE_ICON);
      panel.add(g);
    }
    y += h + LINE_GAP;
  }
}

const LINE_GAP = 12;

/** Informational modal with a single continue button. */
export function alert(
  scene: Scene,
  title: string,
  lines: AlertLine[] = [],
): Promise<void> {
  const w = Math.min(720, CANVAS_W - 96);
  const h = 160 + linesHeight(scene, lines, w);
  return new Promise((resolve) => {
    let m!: Modal;
    const finish = () => {
      m.close();
      resolve();
    };
    m = openModal(scene, title, w, h, finish);
    addLines(scene, m.panel, lines, w);
    const btn = new Button(
      scene,
      w - SPACE.lg - 150,
      h - 76,
      150,
      56,
      t("ui.ok"),
      {
        variant: "primary",
        onClick: finish,
      },
    );
    m.panel.add(btn);
    btn.bind(m.group);
  });
}

export interface ChooseListOptions {
  cancel?: boolean;
}

/** Modal list; resolves the selected index, or -1 when cancelled. */
export function chooseList(
  scene: Scene,
  title: string,
  items: ListItem[],
  opts: ChooseListOptions = {},
): Promise<number> {
  const rowH = 52;
  const gap = 6;
  const w = 560;
  const listH = items.length * (rowH + gap) - gap;
  const h = 80 + listH + (opts.cancel ? 84 : SPACE.lg);
  return new Promise((resolve) => {
    let m!: Modal;
    const finish = (index: number) => {
      m.close();
      resolve(index);
    };
    m = openModal(
      scene,
      title,
      w,
      h,
      opts.cancel ? () => finish(-1) : undefined,
    );
    const list = new ListMenu(scene, SPACE.lg, 72, w - SPACE.lg * 2, items, {
      rowH,
      gap,
      onSelect: finish,
    });
    m.panel.add(list);
    list.bind(m.group);
    if (opts.cancel) {
      const cancel = new Button(
        scene,
        w - SPACE.lg - 150,
        h - 70,
        150,
        56,
        t("ui.cancel"),
        { onClick: () => finish(-1) },
      );
      m.panel.add(cancel);
      cancel.bind(m.group);
    }
  });
}

/** One-shot resolver: closes the modal and resolves on the first call only. */
function settle<T>(
  close: () => void,
  resolve: (value: T) => void,
): (value: T) => void {
  let settled = false;
  return (value) => {
    if (settled) return;
    settled = true;
    close();
    resolve(value);
  };
}

export type SliderPromptOptions = Omit<
  SliderOptions,
  "onChange" | "onSubmit" | "label"
> & { title: string };

/**
 * Modal slider; resolves the committed value. No cancel button — Escape resets
 * the slider to its default position (and the modal stays open).
 */
export function sliderPrompt(
  scene: Scene,
  opts: SliderPromptOptions,
): Promise<number> {
  const w = 560;
  const h = 300;
  const { title, ...sliderOpts } = opts;
  return new Promise((resolve) => {
    let m!: Modal;
    let slider!: Slider;
    const finish = settle<number>(() => m.close(), resolve);
    m = openModal(scene, title, w, h, () => slider.reset());
    slider = new Slider(scene, SPACE.lg, 84, w - SPACE.lg * 2, 130, {
      ...sliderOpts,
      onSubmit: (value) => finish(value),
    });
    m.panel.add(slider);
    slider.bind(m.group);

    const ok = new Button(
      scene,
      w - SPACE.lg - 150,
      h - 76,
      150,
      56,
      t("ui.ok"),
      {
        variant: "primary",
        onClick: () => finish(slider.value),
      },
    );
    m.panel.add(ok);
    ok.bind(m.group);
  });
}
