// Save games. The original writes DATEN.DAT/NAMEN.DAT to disk; we serialise the
// whole GameState to localStorage. Pure serialise/deserialise is separated from
// storage so it can be unit-tested without a DOM.

import type { GameState } from "./types";

// v2: land prices are per 1000 ha (v1 stored them per 10 ha).
// v3: players carry a `kingdom` name.
export const SAVE_VERSION = 3;
export const SAVE_KEY = "kaiser2.save";

interface SaveFile {
  version: number;
  state: GameState;
}

export function serialize(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return JSON.stringify(file);
}

/** Cheap structural check of the fields every scene dereferences at once. */
function isGameState(s: GameState | undefined): s is GameState {
  return (
    Array.isArray(s?.players) &&
    Number.isInteger(s.count) &&
    s.count >= 1 &&
    s.count < s.players.length &&
    Number.isInteger(s.sp) &&
    s.sp >= 1 &&
    s.sp <= s.count &&
    typeof s.jahr === "number" &&
    typeof s.turn === "object" &&
    s.turn !== null
  );
}

export function deserialize(json: string): GameState | null {
  try {
    const file = JSON.parse(json) as SaveFile;
    if (file.version !== SAVE_VERSION || !isGameState(file.state)) return null;
    // Saves from before the ruleset toggle were all Atari rules.
    return { ...file.state, rules: file.state.rules ?? "atari" };
  } catch {
    return null;
  }
}

export function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  storage()?.setItem(SAVE_KEY, serialize(state));
}

export function loadGame(): GameState | null {
  const raw = storage()?.getItem(SAVE_KEY);
  return raw ? deserialize(raw) : null;
}

export function hasSave(): boolean {
  return storage()?.getItem(SAVE_KEY) != null;
}

/** Drop the stored game (used when a ruler ends the current game early). */
export function clearSave(): void {
  storage()?.removeItem(SAVE_KEY);
}
