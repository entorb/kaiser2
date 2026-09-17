// Save games. The original writes DATEN.DAT/NAMEN.DAT to disk; we serialise the
// whole GameState to localStorage. Pure serialise/deserialise is separated from
// storage so it can be unit-tested without a DOM.

import type { GameState } from "./types";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "kaiser2.save";

interface SaveFile {
  version: number;
  state: GameState;
}

export function serialize(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return JSON.stringify(file);
}

export function deserialize(json: string): GameState | null {
  try {
    const file = JSON.parse(json) as SaveFile;
    if (file.version !== SAVE_VERSION || !file.state?.players) return null;
    return file.state;
  } catch {
    return null;
  }
}

function storage(): Storage | null {
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
