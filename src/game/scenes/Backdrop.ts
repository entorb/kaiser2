import { frameBorder, woodBackground } from "../ui/ornament";
import { GameScene } from "./base";

/**
 * Persistent backdrop rendered behind every screen: the walnut wood texture and
 * the ornamental gold frame. Launched once by `Boot` and never stopped, so it
 * survives the `children.removeAll()` calls in the per-turn scene loops.
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
