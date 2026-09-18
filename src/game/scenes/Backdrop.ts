import { frameBorder, woodBackground } from "../ui/ornament";
import { GameScene } from "./base";

/**
 * Persistent backdrop rendered behind every screen: the walnut wood texture and
 * the ornamental gold frame. Launched once by `Boot` and never stopped, so it
 * survives every scene switch and the per-turn rebuilds.
 */
export class Backdrop extends GameScene {
  constructor() {
    super("Backdrop");
  }

  create() {
    woodBackground(this);
    frameBorder(this);
  }
}
