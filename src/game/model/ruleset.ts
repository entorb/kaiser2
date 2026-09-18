import { storage } from "./save";
import type { Ruleset } from "./types";

const KEY = "kaiser2.rules";

/** Rules for the next new game: Remake unless the player picked Atari. */
export function getRuleset(): Ruleset {
  return storage()?.getItem(KEY) === "atari" ? "atari" : "remake";
}

/** Flip the stored preference and return the new value. */
export function toggleRuleset(): Ruleset {
  const next = getRuleset() === "atari" ? "remake" : "atari";
  storage()?.setItem(KEY, next);
  return next;
}
