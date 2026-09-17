import type Phaser from "phaser";
import { Scale } from "phaser";
import { t } from "../i18n/i18n";
import type { FocusGroup } from "./focus";
import { Button } from "./widgets";

/**
 * Button that toggles browser fullscreen and reflects the current state in its
 * label. Returns `undefined` where the Fullscreen API is unavailable (e.g.
 * iPhone Safari), so callers can simply skip it. The button joins `group`.
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

  const label = () => t("menu.fullscreen");
  const button = new Button(scene, x, y, w, h, label(), {
    activateOn: "up",
    onClick: () => scene.scale.toggleFullscreen(),
  });

  const onFullscreenChange = () => button.setText(label());
  scene.scale.on(Scale.Events.ENTER_FULLSCREEN, onFullscreenChange);
  scene.scale.on(Scale.Events.LEAVE_FULLSCREEN, onFullscreenChange);
  scene.events.once("shutdown", () => {
    scene.scale.off(Scale.Events.ENTER_FULLSCREEN, onFullscreenChange);
    scene.scale.off(Scale.Events.LEAVE_FULLSCREEN, onFullscreenChange);
  });

  button.bind(group);
  return button;
}
