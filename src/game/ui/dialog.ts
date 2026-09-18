import type { GameObjects, Scene } from "phaser";
import { t } from "../i18n/i18n";
import { FocusGroup } from "./focus";
import { drawArrowIcon } from "./icon";
import { CANVAS_H, CANVAS_W } from "./layout";
import { label } from "./text";
import { COLORS, SPACE } from "./theme";
import {
  Button,
  type ListItem,
  ListMenu,
  NumberField,
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

function addLines(
  scene: Scene,
  panel: Panel,
  lines: string[],
  w: number,
): void {
  lines.forEach((line, i) => {
    panel.add(
      label(scene, SPACE.lg, 72 + i * 30, line, {
        wrap: w - SPACE.lg * 2,
      }),
    );
  });
}

/** Informational modal with a single continue button. */
export function alert(
  scene: Scene,
  title: string,
  lines: string[] = [],
): Promise<void> {
  const w = 560;
  const h = 190 + lines.length * 30;
  return new Promise((resolve) => {
    let m!: Modal;
    const finish = () => {
      m.close();
      resolve();
    };
    m = openModal(scene, title, w, h, finish);
    addLines(scene, m.panel, lines, w);
    const btn = new Button(scene, w - SPACE.lg - 150, h - 66, 150, 44, "", {
      variant: "primary",
      onClick: finish,
      icon: drawArrowIcon,
    });
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
  const rowH = 40;
  const gap = 6;
  const w = 560;
  const listH = items.length * (rowH + gap) - gap;
  const h = 80 + listH + (opts.cancel ? 68 : SPACE.lg);
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
        h - 60,
        150,
        44,
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

export interface NumberPromptOptions {
  title: string;
  initial?: number;
  min?: number;
  max?: number;
  stel?: number;
  step?: number;
  /** Live line under the field, e.g. the calculated total money. */
  info?: (value: number) => string;
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
      h - 66,
      150,
      44,
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

/** Modal numeric stepper; resolves the value, or null when cancelled. */
export function numberPrompt(
  scene: Scene,
  opts: NumberPromptOptions,
): Promise<number | null> {
  const w = 480;
  const h = opts.info ? 286 : 240;
  return new Promise((resolve) => {
    let m!: Modal;
    const finish = settle<number | null>(() => m.close(), resolve);
    m = openModal(scene, opts.title, w, h, () => finish(null));
    let infoText: GameObjects.Text | undefined;
    const field = new NumberField(scene, (w - 260) / 2, 86, 260, 52, {
      initial: opts.initial,
      min: opts.min,
      max: opts.max,
      stel: opts.stel,
      step: opts.step,
      onInput: (value) => infoText?.setText(opts.info?.(value) ?? ""),
      onSubmit: (value) => finish(value),
    });
    m.panel.add(field);
    field.bind(m.group);

    if (opts.info) {
      infoText = label(scene, w / 2, 160, opts.info(field.value), {
        origin: 0.5,
        color: COLORS.accent,
      });
      infoText.setOrigin(0.5);
      m.panel.add(infoText);
    }

    const cancel = new Button(
      scene,
      w - SPACE.lg - 300,
      h - 66,
      140,
      44,
      t("ui.cancel"),
      { onClick: () => finish(null) },
    );
    const ok = new Button(
      scene,
      w - SPACE.lg - 150,
      h - 66,
      150,
      44,
      t("ui.ok"),
      {
        variant: "primary",
        // Commit an in-progress edit so a mouse click on OK keeps the typed value.
        onClick: () => finish(field.commitValue()),
      },
    );
    m.panel.add(cancel);
    m.panel.add(ok);
    cancel.bind(m.group);
    ok.bind(m.group);
  });
}
