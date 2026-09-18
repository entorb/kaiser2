import type Phaser from "phaser";
import { blip } from "../audio/music";

/** A widget that can take keyboard focus and optionally consume keys. */
export interface Focusable {
  setFocused(focused: boolean): void;
  /** Handle a key while focused; return true if consumed. */
  handleKey(event: KeyboardEvent): boolean;
}

const stack = new WeakMap<Phaser.Scene, FocusGroup[]>();

/**
 * Linear keyboard focus ring. Tab (and Up/Down when the focused widget does not
 * consume them) moves focus; widgets get first refusal on every key so a list
 * can use the arrows for its own selection.
 *
 * Only the most recently created group on a scene is active, so opening a modal
 * (which builds its own group) automatically suspends the screen behind it.
 */
export class FocusGroup {
  private items: Focusable[] = [];
  private index = -1;
  private isActive = true;
  private readonly handler: (event: KeyboardEvent) => void;

  /** `horizontal`: Left/Right also move focus, for a single row of widgets. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly horizontal = false,
  ) {
    this.handler = (event) => this.onKey(event);
    scene.input.keyboard?.on("keydown", this.handler);
    const groups = stack.get(scene) ?? [];
    groups[groups.length - 1]?.deactivate();
    groups.push(this);
    stack.set(scene, groups);
    scene.events.once("shutdown", () => this.destroy());
  }

  add<T extends Focusable>(item: T, focus = true): T {
    this.items.push(item);
    if (focus && this.index < 0 && this.isActive) {
      this.index = this.items.length - 1;
      item.setFocused(true);
    }
    return item;
  }

  /** True while this is the top group, i.e. no dialog or menu is open over it. */
  get active(): boolean {
    return this.isActive;
  }

  /** Drop all items (widgets were destroyed by the scene) but keep listening. */
  reset(): void {
    for (const item of this.items) item.setFocused(false);
    this.items = [];
    this.index = -1;
  }

  focus(item: Focusable): void {
    const i = this.items.indexOf(item);
    if (i >= 0) this.setIndex(i);
  }

  private setIndex(i: number): void {
    const n = this.items.length;
    if (n === 0) return;
    this.items[this.index]?.setFocused(false);
    this.index = ((i % n) + n) % n;
    this.items[this.index]?.setFocused(true);
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.isActive) return;
    // Phaser can re-dispatch the same native event on a later frame. If a
    // handler rebuilt the screen (new group) in between, the event would fire
    // twice, so tag it once it has been handled.
    const tagged = event as KeyboardEvent & { __focusHandled?: boolean };
    if (tagged.__focusHandled) return;
    tagged.__focusHandled = true;
    const n = this.items.length;
    if (n === 0) return;
    if (event.key === "Tab") {
      event.preventDefault();
      this.setIndex(this.index + (event.shiftKey ? -1 : 1));
      blip("move");
      return;
    }
    if (this.items[this.index]?.handleKey(event)) {
      blip(event.key === "Enter" || event.key === " " ? "click" : "move");
      return;
    }
    const forward =
      event.key === "ArrowDown" ||
      (this.horizontal && event.key === "ArrowRight");
    const back =
      event.key === "ArrowUp" || (this.horizontal && event.key === "ArrowLeft");
    if (forward || back) {
      const next = this.index + (forward ? 1 : -1);
      // No wrapping: ArrowDown on the bottom action (Next/Continue) is ignored.
      if (next < 0 || next >= n) return;
      event.preventDefault();
      this.setIndex(next);
      blip("move");
    }
  }

  private deactivate(): void {
    this.isActive = false;
    for (const item of this.items) item.setFocused(false);
  }

  private activate(): void {
    this.isActive = true;
    if (this.items.length > 0) {
      this.index = Math.max(0, this.index);
      this.items[this.index]?.setFocused(true);
    }
  }

  destroy(): void {
    this.isActive = false;
    this.scene.input.keyboard?.off("keydown", this.handler);
    const groups = stack.get(this.scene);
    if (groups) {
      const i = groups.indexOf(this);
      if (i >= 0) groups.splice(i, 1);
      groups[groups.length - 1]?.activate();
    }
    this.items = [];
    this.index = -1;
  }
}
