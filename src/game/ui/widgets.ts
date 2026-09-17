import type Phaser from "phaser";
import { GameObjects, Geom, type Scene } from "phaser";
import type { Focusable, FocusGroup } from "./focus";
import { drawTradeIcon } from "./icon";
import { panelFrame, panelTitle } from "./ornament";
import { label } from "./text";
import { COLORS, css, FS, RADIUS, SPACE } from "./theme";

const CONTAINS = Geom.Rectangle.Contains as Phaser.Types.Input.HitAreaCallback;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Base for interactive, focusable widgets laid out from their top-left. */
export abstract class Widget
  extends GameObjects.Container
  implements Focusable
{
  protected focused = false;
  protected hovered = false;
  protected disabled = false;
  private group?: FocusGroup;
  private focusListener?: () => void;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  bind(group: FocusGroup, focus = true): this {
    this.group = group;
    group.add(this, focus);
    return this;
  }

  /** Called whenever the widget gains keyboard focus (e.g. to update a footer). */
  onFocus(listener: () => void): this {
    this.focusListener = listener;
    return this;
  }

  protected focusSelf(): void {
    this.group?.focus(this);
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.redraw();
    return this;
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.redraw();
    if (focused) this.focusListener?.();
  }

  handleKey(_event: KeyboardEvent): boolean {
    return false;
  }

  protected abstract redraw(): void;

  protected enablePointer(w: number, h: number): void {
    this.setInteractive({
      hitArea: new Geom.Rectangle(0, 0, w, h),
      hitAreaCallback: CONTAINS,
      useHandCursor: true,
    });
    this.on("pointerover", () => {
      if (this.disabled) return;
      this.hovered = true;
      this.redraw();
    });
    this.on("pointerout", () => {
      this.hovered = false;
      this.redraw();
    });
  }
}

/** Rounded surface with a 1px border and an optional title. */
export class Panel extends GameObjects.Container {
  constructor(
    scene: Scene,
    x: number,
    y: number,
    readonly w: number,
    readonly h: number,
    title?: string,
  ) {
    super(scene, x, y);
    scene.add.existing(this);
    const g = scene.add.graphics();
    panelFrame(g, 0, 0, w, h);
    this.add(g);
    if (title) {
      this.add(panelTitle(scene, SPACE.lg, SPACE.md, w - SPACE.lg * 2, title));
    }
  }
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonOptions {
  variant?: ButtonVariant;
  onClick?: () => void;
}

export class Button extends Widget {
  private readonly bg: GameObjects.Graphics;
  private readonly text: GameObjects.Text;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    private readonly bw: number,
    private readonly bh: number,
    text: string,
    private readonly opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.text = label(scene, bw / 2, bh / 2, text, {
      weight: "bold",
      display: true,
      origin: 0.5,
    });
    this.text.setOrigin(0.5);
    this.add(this.text);
    this.enablePointer(bw, bh);
    this.on("pointerdown", () => {
      if (this.disabled) return;
      this.focusSelf();
      this.activate();
    });
    this.redraw();
  }

  activate(): void {
    if (!this.disabled) this.opts.onClick?.();
  }

  setText(text: string): this {
    this.text.setText(text);
    return this;
  }

  handleKey(event: KeyboardEvent): boolean {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.activate();
      return true;
    }
    return false;
  }

  protected redraw(): void {
    const variant = this.opts.variant ?? "secondary";
    let fill: number = COLORS.surfaceAlt;
    let border: number = COLORS.wood;
    let textColor: number = COLORS.text;
    if (variant === "primary") {
      fill = COLORS.accent;
      border = COLORS.woodDark;
      textColor = COLORS.accentText;
    } else if (variant === "danger") {
      border = COLORS.danger;
      textColor = COLORS.danger;
    } else if (variant === "ghost") {
      fill = COLORS.surface;
    }
    if (this.hovered && !this.disabled) {
      fill = variant === "primary" ? COLORS.accentHover : COLORS.hover;
    }
    if (this.disabled) textColor = COLORS.muted;

    const g = this.bg;
    g.clear();
    // Outer wood plate, then the parchment/gold face inset into it.
    g.fillStyle(COLORS.woodDark, 1);
    g.fillRoundedRect(0, 0, this.bw, this.bh, RADIUS + 1);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(2, 2, this.bw - 4, this.bh - 4, RADIUS);
    // Emboss: lit top-left edge, shadowed bottom-right edge.
    g.lineStyle(2, 0xffffff, 0.18);
    g.lineBetween(4, this.bh - 4, 4, 4);
    g.lineBetween(4, 4, this.bw - 4, 4);
    g.lineStyle(2, 0x000000, 0.22);
    g.lineBetween(4, this.bh - 4, this.bw - 4, this.bh - 4);
    g.lineBetween(this.bw - 4, this.bh - 4, this.bw - 4, 4);
    g.lineStyle(2, this.focused ? COLORS.accent : border, 1);
    g.strokeRoundedRect(2, 2, this.bw - 4, this.bh - 4, RADIUS);
    if (this.focused) {
      g.lineStyle(1, COLORS.accent, 0.6);
      g.strokeRoundedRect(0.5, 0.5, this.bw - 1, this.bh - 1, RADIUS + 1);
    }
    this.text.setColor(css(textColor));
  }
}

export interface ListItem {
  label: string;
  value?: string;
  disabled?: boolean;
  /** Optional accent color (e.g. the owning player's color). */
  color?: number;
}

export interface ListMenuOptions {
  rowH?: number;
  gap?: number;
  onSelect?: (index: number) => void;
  /** Fired when the highlighted row changes (keyboard or pointer). */
  onChange?: (index: number) => void;
}

/** Clickable, keyboard-navigable list. Selected row is highlighted. */
export class ListMenu extends Widget {
  private readonly rows: {
    bg: GameObjects.Graphics;
    label: GameObjects.Text;
    value?: GameObjects.Text;
    item: ListItem;
  }[] = [];
  private selected = 0;
  private hoverIndex = -1;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    private readonly bw: number,
    items: ListItem[],
    private readonly opts: ListMenuOptions = {},
  ) {
    super(scene, x, y);
    const rowH = opts.rowH ?? 40;
    const gap = opts.gap ?? 6;
    items.forEach((item, i) => {
      const rowY = i * (rowH + gap);
      const bg = scene.add.graphics();
      this.add(bg);
      const lab = label(scene, SPACE.lg, rowY + rowH / 2, item.label, {
        origin: 0.5,
      });
      lab.setOrigin(0, 0.5);
      this.add(lab);
      let val: GameObjects.Text | undefined;
      if (item.value !== undefined) {
        val = label(scene, bw - SPACE.lg, rowY + rowH / 2, item.value, {
          mono: true,
          color: COLORS.muted,
        });
        val.setOrigin(1, 0.5);
        this.add(val);
      }
      this.rows.push({ bg, label: lab, value: val, item });
      this.addRowZone(rowY, rowH, i);
    });
    this.redraw();
  }

  get selectedIndex(): number {
    return this.selected;
  }

  setSelected(index: number): void {
    this.selected = clamp(index, 0, this.rows.length - 1);
    this.redraw();
    this.opts.onChange?.(this.selected);
  }

  get totalHeight(): number {
    const rowH = this.opts.rowH ?? 40;
    const gap = this.opts.gap ?? 6;
    return this.rows.length * (rowH + gap) - gap;
  }

  private addRowZone(rowY: number, rowH: number, i: number): void {
    const zone = this.scene.add
      .zone(0, rowY, this.bw, rowH)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.add(zone);
    zone.on("pointerover", () => {
      this.hoverIndex = i;
      this.redraw();
      this.opts.onChange?.(i);
    });
    zone.on("pointerout", () => {
      if (this.hoverIndex === i) this.hoverIndex = -1;
      this.redraw();
    });
    zone.on("pointerdown", () => {
      this.focusSelf();
      this.selected = i;
      this.activate();
    });
  }

  activate(): void {
    if (this.rows[this.selected]?.item.disabled) return;
    this.opts.onSelect?.(this.selected);
  }

  handleKey(event: KeyboardEvent): boolean {
    if (event.key === "ArrowDown") {
      if (this.selected >= this.rows.length - 1) return false;
      event.preventDefault();
      this.move(1);
      return true;
    }
    if (event.key === "ArrowUp") {
      if (this.selected <= 0) return false;
      event.preventDefault();
      this.move(-1);
      return true;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.activate();
      return true;
    }
    return false;
  }

  private move(delta: number): void {
    const n = this.rows.length;
    if (n === 0) return;
    this.selected = (((this.selected + delta) % n) + n) % n;
    this.redraw();
    this.opts.onChange?.(this.selected);
  }

  protected redraw(): void {
    const rowH = this.opts.rowH ?? 40;
    const gap = this.opts.gap ?? 6;
    this.rows.forEach((row, i) => {
      const y = i * (rowH + gap);
      const selected = i === this.selected;
      const highlight = selected && this.focused;
      const disabled = row.item.disabled === true;
      let fill: number = COLORS.surfaceAlt;
      if (disabled) fill = COLORS.surface;
      else if (highlight) fill = COLORS.accent;
      else if (selected || i === this.hoverIndex) fill = COLORS.hover;

      const inset = highlight ? 1 : 0.5;
      row.bg.clear();
      row.bg.fillStyle(fill, 1);
      row.bg.fillRoundedRect(0, y, this.bw, rowH, RADIUS);
      row.bg.lineStyle(
        highlight ? 2 : 1,
        highlight ? COLORS.accent : COLORS.border,
        1,
      );
      row.bg.strokeRoundedRect(
        inset,
        y + inset,
        this.bw - inset * 2,
        rowH - inset * 2,
        RADIUS,
      );
      if (row.item.color !== undefined && !disabled) {
        row.bg.fillStyle(row.item.color, 1);
        row.bg.fillRoundedRect(0, y + 6, 5, rowH - 12, 2.5);
      }

      const textColor = disabled
        ? COLORS.muted
        : highlight
          ? COLORS.accentText
          : (row.item.color ?? COLORS.text);
      row.label.setColor(css(textColor));
      row.value?.setColor(
        css(
          disabled
            ? COLORS.muted
            : highlight
              ? COLORS.accentText
              : COLORS.muted,
        ),
      );
    });
  }
}

export interface StatRowOptions {
  unit?: string;
  valueColor?: number;
  mono?: boolean;
  bold?: boolean;
}

/** A muted label on the left, a value (optionally monospace) on the right. */
export class StatRow extends GameObjects.Container {
  constructor(
    scene: Scene,
    x: number,
    y: number,
    w: number,
    labelText: string,
    valueText: string,
    opts: StatRowOptions = {},
  ) {
    super(scene, x, y);
    scene.add.existing(this);
    const weight = opts.bold ? "bold" : "normal";
    const name = label(scene, 0, 0, labelText, {
      color: COLORS.muted,
      weight,
    });
    this.add(name);
    const value = label(
      scene,
      w,
      0,
      opts.unit ? `${valueText} ${opts.unit}` : valueText,
      {
        color: opts.valueColor ?? COLORS.text,
        mono: opts.mono ?? true,
        weight,
      },
    );
    value.setOrigin(1, 0);
    this.add(value);

    // Ledger leader: dotted rule between the name and the value.
    const startX = name.width + 10;
    const endX = w - value.width - 10;
    if (endX > startX) {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.border, 0.45);
      for (let px = startX; px < endX; px += 7) g.fillCircle(px, 10, 1);
      this.add(g);
    }
  }
}

export interface NumberFieldOptions {
  min?: number;
  max?: number;
  stel?: number;
  step?: number;
  initial?: number;
  /** Fires on every visible change, including while typing. */
  onInput?: (value: number) => void;
  onChange?: (value: number) => void;
  onSubmit?: (value: number) => void;
}

/**
 * Numeric stepper: `−` / value / `+`. Type digits to edit, arrows to step,
 * Enter to submit. Self-contained (no DOM input), so it works inside panels.
 */
export class NumberField extends Widget {
  value: number;
  private editing = false;
  private buffer = "";
  private readonly bg: GameObjects.Graphics;
  private readonly valueText: GameObjects.Text;
  private readonly min: number;
  private readonly max: number;
  private readonly stel: number;
  private readonly step: number;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    private readonly bw: number,
    private readonly bh: number,
    private readonly opts: NumberFieldOptions = {},
  ) {
    super(scene, x, y);
    this.stel = opts.stel ?? 6;
    this.min = opts.min ?? 0;
    this.max = opts.max ?? 10 ** this.stel - 1;
    this.step = opts.step ?? 1;
    this.value = clamp(opts.initial ?? 0, this.min, this.max);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    const btn = Math.min(bh, 44);
    this.addStepButton(SPACE.sm, (bh - btn) / 2, btn, "−", -1);
    this.addStepButton(bw - SPACE.sm - btn, (bh - btn) / 2, btn, "+", 1);

    this.valueText = label(scene, bw / 2, bh / 2, "", {
      mono: true,
      size: FS.mono,
      origin: 0.5,
    });
    this.valueText.setOrigin(0.5);
    this.add(this.valueText);
    this.updateText();

    const zone = scene.add
      .zone(bw / 2 - 50, 0, 100, bh)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.add(zone);
    zone.on("pointerdown", () => {
      this.focusSelf();
      this.beginEdit();
    });
    this.redraw();
  }

  private addStepButton(
    x: number,
    y: number,
    size: number,
    glyph: string,
    delta: number,
  ): void {
    const g = this.scene.add.graphics();
    g.fillStyle(COLORS.surfaceAlt, 1);
    g.fillRoundedRect(x, y, size, size, RADIUS);
    this.add(g);
    const text = label(this.scene, x + size / 2, y + size / 2, glyph, {
      size: FS.heading,
      weight: "bold",
      origin: 0.5,
    });
    text.setOrigin(0.5);
    this.add(text);
    const zone = this.scene.add
      .zone(x, y, size, size)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.add(zone);
    zone.on("pointerdown", () => {
      this.focusSelf();
      this.stepBy(delta);
    });
  }

  setValue(value: number): void {
    this.value = clamp(Math.round(value), this.min, this.max);
    this.updateText();
    this.opts.onChange?.(this.value);
  }

  /** Commit any in-progress typing and return the resulting value. */
  commitValue(): number {
    this.commit();
    return this.value;
  }

  private stepBy(delta: number): void {
    this.editing = false;
    this.setValue(this.value + delta * this.step);
  }

  private beginEdit(): void {
    this.editing = true;
    this.buffer = String(this.value);
    this.updateText();
  }

  private commit(): void {
    if (this.editing && this.buffer !== "") {
      this.value = clamp(Math.floor(Number(this.buffer)), this.min, this.max);
    }
    this.editing = false;
    this.updateText();
    this.opts.onChange?.(this.value);
  }

  private updateText(): void {
    const shown = this.editing ? `${this.buffer}▌` : String(this.value);
    this.valueText.setText(shown);
    this.opts.onInput?.(this.effectiveValue());
  }

  /** The value as currently shown: the live buffer while editing, else `value`. */
  private effectiveValue(): number {
    if (!this.editing || this.buffer === "") return this.value;
    return clamp(Math.floor(Number(this.buffer)), this.min, this.max);
  }

  handleKey(event: KeyboardEvent): boolean {
    if (this.editing) {
      if (/^[0-9]$/.test(event.key)) {
        if (this.buffer.length < this.stel) this.buffer += event.key;
      } else if (event.key === "Backspace") {
        this.buffer = this.buffer.slice(0, -1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        this.commit();
        this.opts.onSubmit?.(this.value);
      } else if (event.key === "Escape") {
        this.editing = false;
      } else {
        return true;
      }
      this.updateText();
      return true;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      this.stepBy(1);
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      this.stepBy(-1);
      return true;
    }
    if (/^[0-9]$/.test(event.key)) {
      this.beginEdit();
      this.buffer = event.key;
      this.updateText();
      return true;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.opts.onSubmit?.(this.value);
      return true;
    }
    return false;
  }

  protected redraw(): void {
    this.bg.clear();
    this.bg.fillStyle(COLORS.surfaceAlt, 1);
    this.bg.fillRoundedRect(0, 0, this.bw, this.bh, RADIUS);
    this.bg.lineStyle(
      this.focused ? 2 : 1,
      this.focused ? COLORS.accent : COLORS.border,
      1,
    );
    this.bg.strokeRoundedRect(0.5, 0.5, this.bw - 1, this.bh - 1, RADIUS);
  }
}

export interface SliderTick {
  value: number;
  label: string;
}

/** Coin icon shown at a slider end (plus = gain, minus = give away). */
export type SliderTradeIcon = "plus" | "minus";

/** Signed money label for slider cost lines, e.g. "+123 Taler" / "-123 Taler". */
export function moneyLabel(delta: number, taler: string): string {
  const n = Math.trunc(Math.abs(delta));
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}${n} ${taler}`;
}

export interface SliderOptions {
  min?: number;
  max?: number;
  /** Arrow-key increment (default 1). */
  step?: number;
  initial?: number;
  /** Muted name shown top-left; the value then moves top-right. */
  label?: string;
  /** Formats the value shown at the top. */
  format?: (value: number) => string;
  /** Color of the value shown at the top (e.g. below/above a target). */
  valueColor?: (value: number) => number;
  /** Live line under the track (e.g. the calculated total cost). */
  info?: (value: number) => string;
  /** Color of the live info line (e.g. red when it exceeds the budget). */
  infoColor?: (value: number) => number;
  /** Live cost line right below the track, larger than `info` (e.g. "+123 Taler"). */
  cost?: (value: number) => string;
  /** Color of the cost line (e.g. red when it exceeds the budget). */
  costColor?: (value: number) => number;
  /** Labelled marks under the track. */
  ticks?: SliderTick[];
  /** Full-height guide lines on the track (e.g. a target), like the zero line. */
  markers?: { value: number; color?: number }[];
  /** Caption under the left end (e.g. "Sell"). */
  minLabel?: string;
  /** Caption under the right end (e.g. "Buy"). */
  maxLabel?: string;
  /** Coin icon at the track's left end, instead of a `minLabel` caption. */
  minIcon?: SliderTradeIcon;
  /** Coin icon at the track's right end, instead of a `maxLabel` caption. */
  maxIcon?: SliderTradeIcon;
  onChange?: (value: number) => void;
  onSubmit?: (value: number) => void;
}

/**
 * Horizontal slider. Drag/click the track or use Left/Right to change the value
 * and Enter to submit. Up/Down are deliberately left to the FocusGroup so the
 * keyboard ring can move between fields (see the taxes screen).
 */
export class Slider extends Widget {
  value: number;
  private readonly bg: GameObjects.Graphics;
  private readonly valueText: GameObjects.Text;
  private readonly infoText?: GameObjects.Text;
  private readonly costText?: GameObjects.Text;
  private min: number;
  private max: number;
  private step: number;
  private readonly initial: number;
  private minLabelText?: GameObjects.Text;
  private maxLabelText?: GameObjects.Text;
  private readonly trackX = 26;
  private readonly trackY = 32;
  private readonly trackW: number;
  private dragging = false;
  private readonly onUp: () => void;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    bw: number,
    bh: number,
    private readonly opts: SliderOptions = {},
  ) {
    super(scene, x, y);
    this.min = opts.min ?? 0;
    this.max = opts.max ?? 100;
    this.step = opts.step ?? 1;
    this.trackW = bw - this.trackX * 2;
    this.initial = clamp(opts.initial ?? 0, this.min, this.max);
    this.value = this.initial;

    this.bg = scene.add.graphics();
    this.add(this.bg);

    if (opts.label) {
      this.add(
        label(scene, 0, 0, opts.label, {
          size: FS.body,
          color: COLORS.muted,
        }),
      );
    }
    this.valueText = label(scene, opts.label ? bw : bw / 2, 0, "", {
      mono: true,
      size: FS.heading,
      origin: opts.label ? 1 : 0.5,
    });
    this.valueText.setOrigin(opts.label ? 1 : 0.5, 0);
    this.add(this.valueText);

    if (opts.minLabel) {
      const l = label(scene, this.trackX, this.trackY + 16, opts.minLabel, {
        size: FS.small,
        color: COLORS.muted,
      });
      l.setOrigin(0, 0);
      this.add(l);
      this.minLabelText = l;
    }
    if (opts.maxLabel) {
      const l = label(
        scene,
        bw - this.trackX,
        this.trackY + 16,
        opts.maxLabel,
        { size: FS.small, color: COLORS.muted },
      );
      l.setOrigin(1, 0);
      this.add(l);
      this.maxLabelText = l;
    }
    for (const tick of opts.ticks ?? []) {
      if (tick.value < this.min || tick.value > this.max) continue;
      const l = label(
        scene,
        this.tickX(tick.value),
        this.trackY + 16,
        tick.label,
        { size: FS.small, color: COLORS.muted, origin: 0.5 },
      );
      l.setOrigin(0.5, 0);
      this.add(l);
    }

    const zone = scene.add
      .zone(this.trackX - 14, this.trackY - 18, this.trackW + 28, 46)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.add(zone);
    zone.on("pointerdown", (_p: Phaser.Input.Pointer, localX: number) => {
      this.focusSelf();
      this.dragging = true;
      this.setFromLocal(localX - 14);
    });
    zone.on("pointermove", (_p: Phaser.Input.Pointer, localX: number) => {
      if (this.dragging) this.setFromLocal(localX - 14);
    });

    this.onUp = () => {
      this.dragging = false;
    };
    scene.input.on("pointerup", this.onUp);

    if (opts.info) {
      this.infoText = label(scene, bw / 2, bh - 18, opts.info(this.value), {
        color: opts.infoColor?.(this.value) ?? COLORS.accent,
        size: FS.small,
        origin: 0.5,
      });
      this.infoText.setOrigin(0.5, 0);
      this.add(this.infoText);
    }

    if (opts.cost) {
      this.costText = label(
        scene,
        bw / 2,
        this.trackY + 30,
        opts.cost(this.value),
        {
          color: opts.costColor?.(this.value) ?? COLORS.accent,
          size: FS.heading,
          origin: 0.5,
        },
      );
      this.costText.setOrigin(0.5, 0);
      this.add(this.costText);
    }

    this.updateTexts();
    this.redraw();
  }

  private ratio(value: number): number {
    if (this.max === this.min) return 0;
    return (value - this.min) / (this.max - this.min);
  }

  private tickX(value: number): number {
    return this.trackX + this.ratio(value) * this.trackW;
  }

  private setFromLocal(localX: number): void {
    const r = clamp(localX / this.trackW, 0, 1);
    this.setValue(this.min + r * (this.max - this.min));
  }

  private snap(raw: number): number {
    return Math.round(raw / this.step) * this.step;
  }

  setValue(value: number): void {
    const v = clamp(this.snap(value), this.min, this.max);
    this.value = v;
    this.updateTexts();
    this.redraw();
    this.opts.onChange?.(v);
  }

  /** Return to the initial/default position (Escape). */
  reset(): void {
    this.setValue(this.initial);
  }

  /**
   * Move the track ends (e.g. a linked slider changed the allowed range) and
   * clamp the value into it. Does not fire `onChange`.
   */
  setRange(min: number, max: number, step = this.step): void {
    this.min = min;
    this.max = max;
    this.step = step;
    this.value = clamp(this.snap(this.value), min, max);
    this.updateTexts();
    this.redraw();
  }

  /** Replace the end captions (e.g. show new 20%/80% amounts after a trade). */
  setEndLabels(min: string, max: string): void {
    this.minLabelText?.setText(min);
    this.maxLabelText?.setText(max);
  }

  private updateTexts(): void {
    this.valueText.setText(
      this.opts.format?.(this.value) ?? String(this.value),
    );
    this.valueText.setColor(
      css(this.opts.valueColor?.(this.value) ?? COLORS.text),
    );
    this.infoText?.setText(this.opts.info?.(this.value) ?? "");
    if (this.infoText)
      this.infoText.setColor(
        css(this.opts.infoColor?.(this.value) ?? COLORS.accent),
      );
    this.costText?.setText(this.opts.cost?.(this.value) ?? "");
    if (this.costText)
      this.costText.setColor(
        css(this.opts.costColor?.(this.value) ?? COLORS.accent),
      );
  }

  handleKey(event: KeyboardEvent): boolean {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.setValue(this.value - this.step);
      return true;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.setValue(this.value + this.step);
      return true;
    }
    if (event.key === "Home") {
      event.preventDefault();
      this.setValue(this.min);
      return true;
    }
    if (event.key === "End") {
      event.preventDefault();
      this.setValue(this.max);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.reset();
      return true;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.opts.onSubmit?.(this.value);
      return true;
    }
    return false;
  }

  destroy(fromScene?: boolean): void {
    const scene = this.scene as Scene | undefined;
    scene?.input?.off("pointerup", this.onUp);
    super.destroy(fromScene);
  }

  protected redraw(): void {
    const g = this.bg;
    g.clear();
    // Recessed groove: dark rim, parchment channel, lit lower lip.
    g.fillStyle(COLORS.woodDark, 1);
    g.fillRoundedRect(this.trackX, this.trackY - 2, this.trackW, 12, 6);
    g.fillStyle(COLORS.surfaceAlt, 1);
    g.fillRoundedRect(this.trackX, this.trackY, this.trackW, 8, 4);
    const tx = this.tickX(this.value);
    g.fillStyle(COLORS.accent, 1);
    g.fillRoundedRect(
      this.trackX,
      this.trackY,
      Math.max(4, tx - this.trackX),
      8,
      4,
    );
    if (this.min < 0 && this.max > 0) {
      const zx = this.tickX(0);
      g.lineStyle(2, COLORS.muted, 1);
      g.lineBetween(zx, this.trackY - 8, zx, this.trackY + 16);
    }
    for (const marker of this.opts.markers ?? []) {
      if (marker.value < this.min || marker.value > this.max) continue;
      const mx = this.tickX(marker.value);
      g.lineStyle(2, marker.color ?? COLORS.muted, 1);
      g.lineBetween(mx, this.trackY - 8, mx, this.trackY + 16);
    }
    for (const tick of this.opts.ticks ?? []) {
      if (tick.value < this.min || tick.value > this.max) continue;
      g.lineStyle(1, COLORS.border, 1);
      g.lineBetween(
        this.tickX(tick.value),
        this.trackY + 8,
        this.tickX(tick.value),
        this.trackY + 14,
      );
    }
    // Buy/sell coin icons sit just inside the track ends, so the track keeps
    // its full width and the knob never overlaps them.
    if (this.opts.minIcon)
      drawTradeIcon(
        g,
        9,
        this.trackY + 4,
        14,
        this.opts.minIcon === "plus" ? 1 : -1,
      );
    if (this.opts.maxIcon)
      drawTradeIcon(
        g,
        this.trackW + this.trackX * 2 - 9,
        this.trackY + 4,
        14,
        this.opts.maxIcon === "plus" ? 1 : -1,
      );
    // Brass knob: shadow, body, ring and a highlight pip.
    const ky = this.trackY + 4;
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(tx, ky + 2, 11);
    g.fillStyle(COLORS.accent, 1);
    g.fillCircle(tx, ky, 10);
    g.lineStyle(2, COLORS.woodDark, 1);
    g.strokeCircle(tx, ky, 10);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(tx - 3, ky - 3, 3);
    if (this.focused) {
      g.lineStyle(2, COLORS.accentHover, 1);
      g.strokeCircle(tx, ky, 13);
    }
  }
}

export interface SegmentedOptions {
  selected?: number;
  onChange?: (index: number) => void;
  onSubmit?: () => void;
}

/** Horizontal radio group (e.g. the justice level). */
export class SegmentedControl extends Widget {
  private selected: number;
  private readonly segments: {
    x: number;
    w: number;
    bg: GameObjects.Graphics;
    text: GameObjects.Text;
  }[] = [];

  constructor(
    scene: Scene,
    x: number,
    y: number,
    w: number,
    private readonly bh: number,
    options: string[],
    private readonly opts: SegmentedOptions = {},
  ) {
    super(scene, x, y);
    this.selected = opts.selected ?? 0;
    const gap = 6;
    const segW = (w - gap * (options.length - 1)) / options.length;
    options.forEach((text, i) => {
      const sx = i * (segW + gap);
      const bg = scene.add.graphics();
      this.add(bg);
      const lab = label(scene, sx + segW / 2, bh / 2, text, {
        size: FS.small,
        weight: "bold",
        origin: 0.5,
      });
      lab.setOrigin(0.5);
      this.add(lab);
      this.segments.push({ x: sx, w: segW, bg, text: lab });
      const zone = scene.add
        .zone(sx, 0, segW, bh)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      this.add(zone);
      zone.on("pointerdown", () => {
        this.focusSelf();
        this.select(i);
      });
    });
    this.redraw();
  }

  get selectedIndex(): number {
    return this.selected;
  }

  select(index: number): void {
    this.selected = index;
    this.redraw();
    this.opts.onChange?.(index);
  }

  handleKey(event: KeyboardEvent): boolean {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.select((this.selected + 1) % this.segments.length);
      return true;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.select(
        (this.selected - 1 + this.segments.length) % this.segments.length,
      );
      return true;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.opts.onSubmit?.();
      return true;
    }
    return false;
  }

  protected redraw(): void {
    this.segments.forEach((seg, i) => {
      const selected = i === this.selected;
      seg.bg.clear();
      seg.bg.fillStyle(selected ? COLORS.accent : COLORS.surfaceAlt, 1);
      seg.bg.fillRoundedRect(seg.x, 0, seg.w, this.bh, RADIUS);
      seg.bg.lineStyle(
        this.focused && selected ? 2 : 1,
        selected ? COLORS.accent : COLORS.border,
        1,
      );
      seg.bg.strokeRoundedRect(
        seg.x + 0.5,
        0.5,
        seg.w - 1,
        this.bh - 1,
        RADIUS,
      );
      seg.text.setColor(css(selected ? COLORS.accentText : COLORS.text));
    });
  }
}
