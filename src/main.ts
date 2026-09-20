import type { Game as PhaserGame } from "phaser"
import { attachMusic, isMuted, toggleMute } from "./game/audio/music"
import { snapshotScenes } from "./game/debug/snapshot"
import { t } from "./game/i18n/i18n"
import StartGame from "./game/main"
import { captureInstallPrompt } from "./game/pwa"

// iOS < 15.4 has no svh, so #app stays 100vh (the large viewport) and the FIT
// canvas runs behind Safari's toolbar. Size it from the visual viewport there.
function fitViewport(game: PhaserGame): void {
  const app = document.getElementById("app")
  if (!app || CSS.supports("height", "100svh") || !window.visualViewport) return
  const apply = () => {
    app.style.height = `${window.visualViewport?.height ?? window.innerHeight}px`
    game.scale.refresh()
  }
  apply()
  game.events.once("ready", apply)
  window.visualViewport.addEventListener("resize", apply)
  window.addEventListener("orientationchange", apply)
}

// The portrait overlay is plain HTML; fill it from the game's language, and
// again whenever it is about to show (the player may have switched language).
function syncRotateText(): void {
  const title = document.getElementById("rotate-title")
  const sub = document.getElementById("rotate-sub")
  if (title) title.textContent = t("rotate.title")
  if (sub) sub.textContent = t("rotate.sub")
}

document.addEventListener("DOMContentLoaded", () => {
  syncRotateText()
  window.matchMedia("(orientation: portrait)").addEventListener("change", syncRotateText)
  captureInstallPrompt()
  const game = StartGame("game-container")
  fitViewport(game)
  attachMusic(game)
  // Dev-only handles for browser debugging (Playwright `page.evaluate`).
  if (import.meta.env.DEV) {
    const w = window as unknown as {
      __game: unknown
      __snapshot: () => unknown
      __music: { isMuted: () => boolean; toggleMute: () => void }
    }
    w.__game = game
    w.__snapshot = () => snapshotScenes(game)
    w.__music = { isMuted, toggleMute }
  }
})
