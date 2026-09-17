import type Phaser from "phaser";
import type { GameState } from "./types";

const KEY = "kaiser2.state";

export function setState(scene: Phaser.Scene, state: GameState): void {
  scene.registry.set(KEY, state);
}

export function getState(scene: Phaser.Scene): GameState {
  return scene.registry.get(KEY) as GameState;
}
