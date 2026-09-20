import { at } from "../lookup"
// Player profiles: name, kingdom and coat of arms of rulers 1..6 are kept in
// localStorage so the next new game starts with the same setup prefilled.

import { GAME_CONFIG } from "../config"
import { MAX_PORTRAIT } from "./constants"
import { storage } from "./save"
import type { PlayerState } from "./types"

export const PROFILES_KEY = "kaiser2.players"

export interface Profile {
  name: string
  kingdom: string
  portrait: number
}

function isProfile(x: unknown): x is Profile {
  const p = x as Profile | null
  return (
    typeof p?.name === "string" &&
    typeof p.kingdom === "string" &&
    Number.isInteger(p.portrait) &&
    p.portrait >= 0 &&
    p.portrait < MAX_PORTRAIT
  )
}

/** Slot `i` holds ruler `i + 1`; `null` when never stored or malformed. */
export function parseProfiles(json: string | null | undefined): (Profile | null)[] {
  let list: unknown = []
  try {
    list = JSON.parse(json ?? "[]")
  } catch {
    // Corrupt storage: start over.
  }
  const arr = Array.isArray(list) ? list : []
  return Array.from({ length: GAME_CONFIG.maxPlayers }, (_, i) =>
    isProfile(arr[i]) ? arr[i] : null,
  )
}

export function loadProfiles(): (Profile | null)[] {
  return parseProfiles(storage()?.getItem(PROFILES_KEY))
}

/** Store rulers 1..count; slots of rulers who did not play stay untouched. */
export function saveProfiles(players: PlayerState[], count: number): void {
  const profiles = loadProfiles()
  for (let i = 1; i <= count; i++) {
    const { name, kingdom, portrait } = at(players, i)
    profiles[i - 1] = { name, kingdom, portrait }
  }
  storage()?.setItem(PROFILES_KEY, JSON.stringify(profiles))
}
