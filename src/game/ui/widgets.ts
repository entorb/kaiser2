import type Phaser from "phaser";
import { GameObjects, Geom, type Scene } from "phaser";
import type { Focusable, FocusGroup } from "./focus";
import { drawCoinsIcon, drawTradeIcon, type IconDraw } from "./icon";
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

  /** Draw a bare panel frame with no container, for pure background decoration. */
  static decorate(
    scene: Scene,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const g = scene.add.graphics();
    g.setPosition(x, y);
    panelFrame(g, 0, 0, w, h);
  }
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonOptions {
  variant?: ButtonVariant;
  onClick?: () => void;
  /** Enter runs this instead of `onClick` (Space and pointer still click). */
  onSubmit?: () => void;
  /**
   * Pointer gesture that activates the button. Defaults to `"down"`. Use
   * `"up"` for actions the browser only allows from a pointerup gesture (e.g.
   * the Fullscreen API).
   */
  activateOn?: "down" | "up";
  /** Decoration drawn to the left of the centered label; the label stays. */
  icon?: IconDraw;
}

const BUTTON_ICON = 26;
const BUTTON_ICON_GAP = 8;

export class Button extends Widget {
  private readonly bg: GameObjects.Graphics;
  private readonly text: GameObjects.Text;
  private readonly iconG?: GameObjects.Graphics;

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
    if (opts.icon) {
      this.iconG = scene.add.graphics();
      this.add(this.iconG);
      this.layoutIcon(opts.icon);
    }
    this.enablePointer(bw, bh);
    this.on("pointerdown", () => {
      if (this.disabled) return;
      this.focusSelf();
      if (this.opts.activateOn !== "up") this.activate();
    });
    this.on("pointerup", () => {
      if (this.disabled) return;
      if (this.opts.activateOn === "up") this.activate();
    });
    this.redraw();
  }

  activate(): void {
    if (!this.disabled) this.opts.onClick?.();
  }

  setText(text: string): this {
    this.text.setText(text);
    if (this.opts.icon) this.layoutIcon(this.opts.icon);
    return this;
  }

  /** Swap the decoration, e.g. a sound toggle between on and off. */
  setIcon(icon: IconDraw): this {
    this.opts.icon = icon;
    this.layoutIcon(icon);
    return this;
  }

  /** Restyle the button, e.g. to show a toggle as on (`primary`) or off. */
  setVariant(variant: ButtonVariant): this {
    this.opts.variant = variant;
    this.redraw();
    return this;
  }

  /** Center icon + gap + label as one block. */
  private layoutIcon(draw: IconDraw): void {
    if (!this.iconG) return;
    const size = this.text.text
      ? BUTTON_ICON
      : Math.min(this.bh - 16, BUTTON_ICON * 2);
    const gap = this.text.text ? BUTTON_ICON_GAP : 0;
    const block = size + gap + this.text.width;
    const left = (this.bw - block) / 2;
    this.text.setX(left + size + gap + this.text.width / 2);
    this.iconG.clear();
    draw(this.iconG, left + size / 2, this.bh / 2, size);
  }

  handleKey(event: KeyboardEvent): boolean {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (event.key === "Enter" && this.opts.onSubmit && !this.disabled)
        this.opts.onSubmit();
      else this.activate();
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
    this.iconG?.setAlpha(this.disabled ? 0.45 : 1);
  }
}

/** One table cell of a list row: text, optionally led by a unit icon. */
export interface ListCell {
  text: string;
  icon?: IconDraw;
  /** Secondary figure: muted unless the row is highlighted. */
  muted?: boolean;
}

export interface ListItem {
  label: string;
  value?: string;
  /** Count shown before the icon, right-aligned in a shared lead column. */
  lead?: string;
  /** Unit icon drawn before `value`, e.g. `drawCoinsIcon` for a price. */
  valueIcon?: IconDraw;
  /** Table columns: centered on `ListMenuOptions.cellX`. */
  cells?: ListCell[];
  /** Pictogram drawn before the label, e.g. the building kind. */
  icon?: IconDraw;
  disabled?: boolean;
  /** Optional accent color (e.g. the owning player's color). */
  color?: number;
}

const LIST_ICON = 24;
const LIST_ICON_GAP = 10;
const LIST_LEAD = 64;
const LIST_VALUE_ICON = 18;

export interface ListMenuOptions {
  rowH?: number;
  gap?: number;
  /** Center of each `ListItem.cells` column, in row coordinates. */
  cellX?: number[];
  /** Font size of the cell figures; default `FS.mono`. */
  cellSize?: number;
  onSelect?: (index: number) => void;
  /** Fired when the highlighted row changes (keyboard or pointer). */
  onChange?: (index: number) => void;
}

interface ListRow {
  bg: GameObjects.Graphics;
  label: GameObjects.Text;
  value?: GameObjects.Text;
  lead?: GameObjects.Text;
  /** Center x of the unit icon before the value. */
  valueIconX?: number;
  valueIcon?: GameObjects.Graphics;
  cells: {
    text: GameObjects.Text;
    icon?: GameObjects.Graphics;
    iconX?: number;
    muted: boolean;
  }[];
  icon?: GameObjects.Graphics;
  item: ListItem;
}

/** Clickable, keyboard-navigable list. Selected row is highlighted. */
export class ListMenu extends Widget {
  private readonly rows: ListRow[] = [];
  private readonly leadW: number;
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
    this.leadW = items.some((item) => item.lead !== undefined) ? LIST_LEAD : 0;
    const iconX = SPACE.lg + this.leadW;
    items.forEach((item, i) => {
      const rowY = i * (rowH + gap);
      const bg = scene.add.graphics();
      this.add(bg);
      const labelX = iconX + (item.icon ? LIST_ICON + LIST_ICON_GAP : 0);
      const lab = label(scene, labelX, rowY + rowH / 2, item.label, {
        origin: 0.5,
      });
      lab.setOrigin(0, 0.5);
      this.add(lab);
      let lead: GameObjects.Text | undefined;
      if (item.lead !== undefined) {
        lead = label(scene, iconX - 14, rowY + rowH / 2, item.lead, {
          mono: true,
        });
        lead.setOrigin(1, 0.5);
        this.add(lead);
      }
      let icon: GameObjects.Graphics | undefined;
      if (item.icon) {
        icon = scene.add.graphics();
        item.icon(icon, iconX + LIST_ICON / 2, rowY + rowH / 2, LIST_ICON);
        this.add(icon);
      }
      let val: GameObjects.Text | undefined;
      let valueIcon: GameObjects.Graphics | undefined;
      let valueIconX: number | undefined;
      if (item.value !== undefined) {
        val = label(scene, bw - SPACE.lg, rowY + rowH / 2, item.value, {
          mono: true,
          color: COLORS.muted,
        });
        val.setOrigin(1, 0.5);
        this.add(val);
        if (item.valueIcon) {
          valueIconX = bw - SPACE.lg - val.width - 8 - LIST_VALUE_ICON / 2;
          valueIcon = scene.add.graphics();
          item.valueIcon(
            valueIcon,
            valueIconX,
            rowY + rowH / 2,
            LIST_VALUE_ICON,
          );
          this.add(valueIcon);
        }
      }
      const cells = (item.cells ?? []).map((cell, c) => {
        const cx = opts.cellX?.[c] ?? bw / 2;
        const cy = rowY + rowH / 2;
        const text = label(scene, cx, cy, cell.text, {
          mono: true,
          size: opts.cellSize,
        });
        this.add(text);
        if (!cell.icon) {
          text.setOrigin(0.5);
          return { text, muted: cell.muted === true };
        }
        // Icon and figure are centered on the column as one block.
        const block = LIST_VALUE_ICON + 6 + text.width;
        const left = cx - block / 2;
        const iconX = left + LIST_VALUE_ICON / 2;
        text.setOrigin(0, 0.5);
        text.setX(left + LIST_VALUE_ICON + 6);
        const icon = scene.add.graphics();
        cell.icon(icon, iconX, cy, LIST_VALUE_ICON);
        this.add(icon);
        return { text, icon, iconX, muted: cell.muted === true };
      });
      this.rows.push({
        bg,
        label: lab,
        value: val,
        lead,
        valueIcon,
        valueIconX,
        cells,
        icon,
        item,
      });
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
      this.drawRow(row, i, rowH, gap);
    });
  }

  private drawRow(row: ListRow, i: number, rowH: number, gap: number): void {
    const y = i * (rowH + gap);
    const selected = i === this.selected;
    const highlight = selected && this.focused;
    const disabled = row.item.disabled === true;
    let fill: number = COLORS.surfaceAlt;
    if (disabled) fill = COLORS.surface;
    else if (highlight) fill = COLORS.accent;
    else if (selected || i === this.hoverIndex) fill = COLORS.hover;
    const inset = highlight ? 1 : 0.5;
    this.drawRowBackground(row, y, rowH, highlight, disabled, fill, inset);
    this.drawRowText(row, highlight, disabled);
  }

  private drawRowBackground(
    row: ListRow,
    y: number,
    rowH: number,
    highlight: boolean,
    disabled: boolean,
    fill: number,
    inset: number,
  ): void {
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
    if (highlight) this.drawRowChips(row, y, rowH);
    if (row.item.color !== undefined && !disabled) {
      row.bg.fillStyle(row.item.color, 1);
      row.bg.fillRoundedRect(0, y + 6, 5, rowH - 12, 2.5);
    }
  }

  private drawRowChips(row: ListRow, y: number, rowH: number): void {
    // Gold pictograms vanish on the gold highlight: seat them on parchment.
    const chips: [number, number][] = [];
    if (row.item.icon)
      chips.push([SPACE.lg + this.leadW + LIST_ICON / 2, LIST_ICON]);
    if (row.valueIconX !== undefined)
      chips.push([row.valueIconX, LIST_VALUE_ICON]);
    for (const cell of row.cells)
      if (cell.iconX !== undefined) chips.push([cell.iconX, LIST_VALUE_ICON]);
    row.bg.fillStyle(COLORS.surface, 1);
    for (const [cx, size] of chips) {
      const chip = size + 6;
      row.bg.fillRoundedRect(
        cx - chip / 2,
        y + (rowH - chip) / 2,
        chip,
        chip,
        RADIUS,
      );
    }
  }

  private drawRowText(
    row: ListRow,
    highlight: boolean,
    disabled: boolean,
  ): void {
    const accent = highlight
      ? COLORS.accentText
      : (row.item.color ?? COLORS.text);
    const textColor = disabled ? COLORS.muted : accent;
    row.label.setColor(css(textColor));
    row.icon?.setAlpha(disabled ? 0.45 : 1);
    row.valueIcon?.setAlpha(disabled ? 0.45 : 1);
    const accentMuted = css(
      !disabled && highlight ? COLORS.accentText : COLORS.muted,
    );
    row.lead?.setColor(accentMuted);
    row.value?.setColor(accentMuted);
    for (const cell of row.cells) {
      let color: number = cell.muted ? COLORS.muted : COLORS.text;
      if (highlight) color = COLORS.accentText;
      cell.text.setColor(css(color));
      cell.icon?.setAlpha(disabled ? 0.45 : 1);
    }
  }
}

export interface StatRowOptions {
  /** Unit icon drawn before the label, e.g. `drawCoinsIcon` for money rows. */
  icon?: IconDraw;
  unit?: string;
  valueColor?: number;
  mono?: boolean;
  bold?: boolean;
}

const STAT_ICON = 24;
const STAT_ICON_GAP = 10;

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
    const labelX = opts.icon ? STAT_ICON + STAT_ICON_GAP : 0;
    const name = label(scene, labelX, 0, labelText, {
      color: COLORS.muted,
      weight,
    });
    this.add(name);
    if (opts.icon) {
      const ig = scene.add.graphics();
      opts.icon(ig, STAT_ICON / 2, 9, STAT_ICON);
      this.add(ig);
    }
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
    const startX = labelX + name.width + 10;
    const endX = w - value.width - 10;
    if (endX > startX) {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.border, 0.45);
      for (let px = startX; px < endX; px += 7) g.fillCircle(px, 10, 1);
      this.add(g);
    }
  }
}

export interface SliderTick {
  value: number;
  label: string;
}

/** Coin icon shown at a slider end (plus = gain, minus = give away). */
export type SliderTradeIcon = "plus" | "minus";

/** Signed amount for slider cost lines, e.g. "+123"; the Slider adds the taler icon. */
export function moneyLabel(delta: number): string {
  const n = Math.trunc(Math.abs(delta));
  let sign = "";
  if (delta > 0) sign = "+";
  else if (delta < 0) sign = "-";
  return `${sign}${n}`;
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
  /** Unit icon drawn just before the value at the top (e.g. a taler). */
  valueIcon?: IconDraw;
  /** Color of the value shown at the top (e.g. below/above a target). */
  valueColor?: (value: number) => number;
  /** Live line under the track (e.g. the calculated total cost). */
  info?: (value: number) => string;
  /** Color of the live info line (e.g. red when it exceeds the budget). */
  infoColor?: (value: number) => number;
  /** Live cost line below the track, larger than `info`, with a taler icon in front (e.g. "+123"). */
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
  private readonly trackX = 26;
  // Below the value text; a slider without a title has it centered above.
  private readonly trackY: number;
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
    this.trackY = opts.label ? 35 : 42;
    this.trackW = bw - this.trackX * 2;
    this.initial = clamp(opts.initial ?? 0, this.min, this.max);
    this.value = this.initial;

    this.bg = scene.add.graphics();
    this.add(this.bg);

    if (opts.label) {
      const name = label(scene, 0, 0, opts.label, {
        size: FS.body,
        color: COLORS.muted,
      });
      this.add(name);
    }
    this.valueText = label(scene, opts.label ? bw : bw / 2, 0, "", {
      mono: true,
      size: FS.heading,
      origin: opts.label ? 1 : 0.5,
    });
    this.valueText.setOrigin(opts.label ? 1 : 0.5, 0);
    this.add(this.valueText);

    if (opts.minLabel) {
      const l = label(scene, this.trackX, this.trackY + 24, opts.minLabel, {
        size: FS.small,
        color: COLORS.muted,
      });
      l.setOrigin(0, 0);
      this.add(l);
    }
    if (opts.maxLabel) {
      const l = label(
        scene,
        bw - this.trackX,
        this.trackY + 24,
        opts.maxLabel,
        { size: FS.small, color: COLORS.muted },
      );
      l.setOrigin(1, 0);
      this.add(l);
    }
    for (const tick of opts.ticks ?? []) {
      if (tick.value < this.min || tick.value > this.max) continue;
      const l = label(
        scene,
        this.tickX(tick.value),
        this.trackY + 24,
        tick.label,
        { size: FS.small, color: COLORS.muted, origin: 0.5 },
      );
      l.setOrigin(0.5, 0);
      this.add(l);
    }

    const zone = scene.add
      .zone(this.trackX - 14, this.trackY - 30, this.trackW + 28, 70)
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
        this.trackY + 36,
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

  /** Draw a unit icon just left of `text`, vertically centered on it. */
  private drawBefore(
    icon: IconDraw,
    text: GameObjects.Text,
    size: number,
  ): void {
    const left = text.x - text.width * text.originX;
    icon(
      this.bg,
      left - size / 2 - 6,
      text.y + text.height * (0.5 - text.originY),
      size,
    );
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
    g.fillRoundedRect(this.trackX, this.trackY - 2, this.trackW, 14, 7);
    g.fillStyle(COLORS.surfaceAlt, 1);
    g.fillRoundedRect(this.trackX, this.trackY, this.trackW, 10, 5);
    const tx = this.tickX(this.value);
    g.fillStyle(COLORS.accent, 1);
    g.fillRoundedRect(
      this.trackX,
      this.trackY,
      Math.max(4, tx - this.trackX),
      10,
      5,
    );
    this.drawZero();
    this.drawMarkers();
    this.drawSideIcons();
    if (this.costText?.text) this.drawBefore(drawCoinsIcon, this.costText, 14);
    if (this.opts.valueIcon)
      this.drawBefore(this.opts.valueIcon, this.valueText, 16);
    // Brass knob: shadow, body, ring and a highlight pip.
    const ky = this.trackY + 5;
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(tx, ky + 2, 17);
    g.fillStyle(COLORS.accent, 1);
    g.fillCircle(tx, ky, 16);
    g.lineStyle(2, COLORS.woodDark, 1);
    g.strokeCircle(tx, ky, 16);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(tx - 5, ky - 5, 5);
    if (this.focused) {
      g.lineStyle(2, COLORS.accentHover, 1);
      g.strokeCircle(tx, ky, 20);
    }
  }

  private drawZero(): void {
    if (!(this.min < 0 && this.max > 0)) return;
    const zx = this.tickX(0);
    this.bg.lineStyle(2, COLORS.muted, 1);
    this.bg.lineBetween(zx, this.trackY - 8, zx, this.trackY + 16);
  }

  private drawMarkers(): void {
    for (const marker of this.opts.markers ?? []) {
      if (marker.value < this.min || marker.value > this.max) continue;
      const mx = this.tickX(marker.value);
      this.bg.lineStyle(2, marker.color ?? COLORS.muted, 1);
      this.bg.lineBetween(mx, this.trackY - 8, mx, this.trackY + 16);
    }
    for (const tick of this.opts.ticks ?? []) {
      if (tick.value < this.min || tick.value > this.max) continue;
      this.bg.lineStyle(1, COLORS.border, 1);
      this.bg.lineBetween(
        this.tickX(tick.value),
        this.trackY + 8,
        this.tickX(tick.value),
        this.trackY + 14,
      );
    }
  }

  private drawSideIcons(): void {
    // Buy/sell coin icons sit just inside the track ends, so the track keeps
    // its full width and the knob never overlaps them.
    if (this.opts.minIcon)
      drawTradeIcon(
        this.bg,
        9,
        this.trackY + 4,
        14,
        this.opts.minIcon === "plus" ? 1 : -1,
      );
    if (this.opts.maxIcon)
      drawTradeIcon(
        this.bg,
        this.trackW + this.trackX * 2 - 9,
        this.trackY + 4,
        14,
        this.opts.maxIcon === "plus" ? 1 : -1,
      );
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
