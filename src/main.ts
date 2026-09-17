import { attachMusic, isMuted, toggleMute } from "./game/audio/music";
import { snapshotScenes } from "./game/debug/snapshot";
import StartGame from "./game/main";
import { captureInstallPrompt } from "./game/pwa";

document.addEventListener("DOMContentLoaded", () => {
  captureInstallPrompt();
  const game = StartGame("game-container");
  attachMusic(game);
  // Dev-only handles for browser debugging (Playwright `page.evaluate`).
  if (import.meta.env.DEV) {
    const w = window as unknown as {
      __game: unknown;
      __snapshot: () => unknown;
      __music: { isMuted: () => boolean; toggleMute: () => void };
    };
    w.__game = game;
    w.__snapshot = () => snapshotScenes(game);
    w.__music = { isMuted, toggleMute };
  }
});
