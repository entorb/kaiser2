import { GAME_CONFIG } from "../config"
import { type Lang, STRINGS, type StringKey } from "./strings"

let current: Lang = GAME_CONFIG.language

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  current = lang
}

/** Translate a key, interpolating `{name}` placeholders. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const entry = STRINGS[key]
  let text: string = entry[current] ?? entry.de
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}
