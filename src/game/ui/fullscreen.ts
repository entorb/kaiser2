import type Phaser from "phaser";
import type { FocusGroup } from "./focus";
import { drawExpandIcon } from "./icon";
import { Button } from "./widgets";

/**
 * Icon button that toggles browser fullscreen. Returns `undefined` where the
 * Fullscreen API is unavailable (e.g. iPhone Safari), so callers can simply
 * skip it. The button joins `group`.
 */
export function fullscreenButton(
  scene: Phaser.Scene,
  group: FocusGroup,
  x: number,
  y: number,
  w: number,
  h: number,
): Button | undefined {
  if (!scene.game.device.fullscreen.available) return undefined;

  const button = new Button(scene, x, y, w, h, "", {
    icon: drawExpandIcon,
    activateOn: "up",
    onClick: () => scene.scale.toggleFullscreen(),
  });
  button.bind(group);
  return button;
}
