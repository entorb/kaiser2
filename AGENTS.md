# Kaiser 2 Remake

Remake of the 1989 Atari game Kaiser 2 in a modern web stack (Phaser v4 +
Vite + TypeScript + pnpm).

## References

* [atari/rules.md](atari/rules.md) — rules extracted from the Atari source code.
* [rules-remake.md](rules-remake.md) — Remake ruleset (start-page toggle `Rules: Atari / Remake`, default Remake; `GameState.rules`, `model/ruleset.ts`); tax model lives in `model/tax.ts`, rule functions branch on `state.rules`.
* [atari/manual/index.md](atari/manual/index.md) — original manual.
* [atari/src/](atari/src.zip) — Atari BASIC source (`*.TUR`).
* [atari/bin/](atari/bin.zip) — original binaries (audio/graphics).
* [rewrite.md](rewrite.md) — frozen progress tracker + known source bugs.
* [improvements.md](improvements.md) — post-parity ideas.

Scratch work goes in `./tmp/` (gitignored), never `/tmp/`. All
extraction/conversion scripts live in [atari/scripts/](atari/scripts/) (see
[README.md](atari/scripts/README.md) for the disk/asset formats).

Use American English, not British

## Commands

`pnpm dev` · `pnpm run build` · `pnpm test` · `pnpm run lint`

`node scripts/sim.mjs` simulates whole games of the computer players (difficulty
ladder, parameter sweeps via `--set`; see [rules-remake.md](rules-remake.md) §4).

`sh scripts/gen_screen_exports.sh` exports a PNG + text snapshot of every game
screen to `tmp/screens/` (`NN-SS`-prefixed per the screen table below, where
`SS` counts the sub-screens/pop-ups); starts the dev server itself when port
8080 is idle. Prefix the call with `--screen=NN` (the screen's two-digit number,
e.g. `07`) to re-export only that screen in place; existing files are
overwritten, never deleted.

After each task run `sh scripts/chk_js_format.sh`; after each feature run
`sh scripts/run_checks.sh` (biome + tsc + knip + pre-commit + vitest). Features
that change a screen's layout also re-export the touched screens in place with
`sh scripts/gen_screen_exports.sh --screen=NN` (one `--screen=NN` per modified
screen) and diff the `.txt`/`.png` against the baseline.

## Architecture

* `src/game/config.ts` — tunables: `maxPlayers` (6), `startYear`, default
  language. The name-entry loop never exceeds `maxPlayers`.
* `src/game/model/` — all rules, Phaser-free and unit-tested (`*.test.ts` next
  to the code): `types.ts` (COMMON block), `constants.ts`
  (provinces/titles/start values), `rules.ts` (harvest, grain, trade, taxes,
  chronicle, title, sabotage, highscore), `events.ts`
  (pawn/depose/death/interest), `turn.ts`, `save.ts` (localStorage),
  `session.ts` (game state in the Phaser registry). Remake ruleset:
  `tax.ts`, `houses.ts`; computer rulers: `ai.ts` (`playComputerTurn`, one
  profile per difficulty; `TradingHouse` runs it, `scripts/sim.mjs` simulates
  it); `trade.ts` (Emperor stock/prices, grain and land transfers shared by
  scenes and computers; `tradePrice` (one quote), `shownPrice` (land shown per
  500 ha), `maxSale` (partner cash cap) and trade notices in the Remake, `rules-remake.md` §3.5;
  Emperor scarcity prices, `spareLand` (land a ruler may part with),
  `buyCheapest` (a computer deals with one partner per good) and `buyCost`/`sellProceeds` (big
  purchases raise the price, big sales lower it), §3.6/§3.7; the `MARKET` and (`rules.ts`)
  `FARMING` tunables are swept with `sim.mjs --tune`).
* `src/game/scenes/` — screens, one per file, see list below.
* `src/game/ui/` — widget kit, see below.
* `src/game/i18n/` — `strings.ts` holds every UI string as `{de,en}`; `t(key)`
  looks it up. German is the original text; add English alongside new keys.
* `src/game/flow.ts` — scene transitions as pure functions taking a
  `SceneSwitcher` (scenes pass `this.scene`; tests pass a recorder), so flow is
  testable without Phaser. Keep `src/game/flow.test.ts` in sync.
* `src/game/audio/` — procedural music + UI blips, no audio files:
  `tracks.ts` holds the original score data (notes, scene→track map, blip
  specs) and is unit-tested; `music.ts` synthesizes it with Web Audio
  oscillators on Phaser's own `AudioContext` (so Phaser handles the autoplay
  unlock) via a lookahead scheduler. `GameScene.init()` calls
  `attachSceneMusic` to switch tracks per screen; `Menu` toggles mute and the
  `M` key does too (persisted in `localStorage`). `Promotion`/`Coronation`/`Highscore`
  play a fanfare (`Coronation` also has a `brass` voice track); `playCoins` is the clinking-taler effect for every purchase.
  `src/list-audio.html` auditions all tracks and effects (served at
  `/kaiser2/list-audio.html`, built as a second Vite entry). All calls no-op
  without Web Audio.
* `src/list-icon.html` shows every icon from `ui/icon.ts` at several sizes on
  parchment and wood (served at `/kaiser2/list-icon.html`, built as a third Vite
  entry, precached by the PWA like `list-audio.html`). It is driven by
  `ICON_SECTIONS` in `debug/icon-gallery.ts` — register new icons there; that file
  is a knip `entry` because knip does not follow the HTML.
* `src/list-image.html` shows the full-screen pictures (promotion per title from
  `ui/ruler.ts`: a ruler who ages with each title, plus `ui/regalia.ts` headgear; finished palace/cathedral from `scenes/Monument.ts`) at
  `/kaiser2/list-image.html`, a fourth Vite entry. It is driven by
  `IMAGE_SECTIONS` in `debug/image-gallery.ts` — register new pictures there
  (also a knip `entry`). `debug/gallery.ts` boots both list pages (Phaser must not capture wheel/touch, or the page will not scroll). The coronation is animated and not listed.
* PWA / offline play — `vite/config.prod.mjs` adds `vite-plugin-pwa`
  (`registerType: "autoUpdate"`, `injectRegister: "script-defer"`): the
  production build emits `manifest.webmanifest`, `sw.js` and a Workbox precache
  of every hashed asset, while `pnpm dev` stays uncached. App icons are drawn
  procedurally by `scripts/gen_icons.mjs` into `public/icons/` (committed,
  regenerated by `pnpm run icons`). `src/game/pwa.ts` captures
  `beforeinstallprompt`; the Menu install button fires the native prompt when
  available and otherwise falls back to the Android/iPhone instructions. Test
  the SW with `pnpm run build && pnpm preview` (localhost only; the deployed
  site needs HTTPS).
* `src/main.ts` exposes `window.__game` only under `import.meta.env.DEV` for
  Playwright debugging; stripped from production builds.

### Screens

| # | File | DE | EN |
| - | ---- | -- | -- |
| 1 | `Boot.ts` | (kein Titel) | (no title) |
| — | `Backdrop.ts` | (Hintergrund) | (backdrop) |
| 2 | `Menu.ts` | KAISER II Remake | KAISER II Remake |
| 3 | `NewGame.ts` | Neues Spiel | New game |
| 4 | `TradingHouse.ts` | Handelshäuser | Trading houses |
| 5 | `TradePartner.ts` | Handelspartner | Trading partner |
| 6 | `Grain.ts` | Korn, Kornausgabe | Grain, Grain issue |
| 7 | `Land.ts` | Land | Land |
| 8 | `Chronicle.ts` | Chronik | Chronicle |
| 9 | `Taxes.ts` | Staatseinnahmen | State income |
| 10 | `TradeData.ts` | Handelsdaten | Trade data |
| 11 | `Business.ts` | Staatseinkäufe | State purchases |
| 12 | `Promotion.ts` | Beförderung | Promotion |
| — | `Coronation.ts` | (Krönung) | (coronation) |
| — | `Monument.ts` | (Palast/Kathedrale vollendet) | (palace/cathedral completed) |
| 13 | `Ranking.ts` | Rangliste | Ranking |
| 14 | `SecretService.ts` | Geheimdienst | Secret service |
| 15 | `Highscore.ts` | Ruhmeshalle | Hall of fame |

Per-ruler flow: `TradingHouse → TradePartner → Grain → Land → Chronicle → Taxes →
TradeData → Business` (→ `Map`/`SecretService`) → `Promotion` (only when the
title advanced) → next ruler; on winning `Coronation` (winged crown descends
onto the enthroned ruler, C64-style; own `coronation` track) → `Highscore`. Buying the last palace or cathedral part inside `Business` shows `Monument` (picture, own `palace` / `cathedral` hymn) and returns to `Business`. With one ruler, `TradePartner`
and `TradeData` are skipped/auto-resolved (the Emperor is the only counterparty,
and Handelsdaten is multiplayer-only — `KAISER4:765`). `Grain.ts` merges the
original Korn (`#KORN`) and Kornausgabe (`#KORNAUS`, manual §6/§7) into one
`play()`: trade and distribution sliders are live together, trading updates the
granary and distribution bounds, and one `Weiter` settles both.

## Rendering & UI kit

* Canvas uses a fixed 960x576 design space (the Atari 320x192 at `SCALE = 3`,
  see `src/game/ui/layout.ts`) scaled with `Scale.FIT` + `CENTER_BOTH`. Scenes
  are laid out in these **design pixels** using `frame()` / `columns()`.
* The canvas is rendered at `RENDER_SCALE` (2) times the design space
  (`GAME_W`/`GAME_H`) so text and vector art are rasterised near device
  resolution instead of being upscaled by the browser. Every scene extends
  `scenes/base.ts` `GameScene`, whose `init()` zooms and centers the main camera
  to map design units onto the larger canvas — that is the one place to change
  the render scale. The persistent `Backdrop` scene draws `woodBackground` +
  `frameBorder` behind all screens (it survives the `children.removeAll()` calls
  in the per-turn loops).
* **No Atari graphics or sounds at runtime** — maps and portraits are drawn
  procedurally with Phaser Graphics. `main.ts` sets `pixelArt: false`; `label()`
  in `text.ts` rasterizes each text object at the on-screen upscale
  (`scale.displayScale * devicePixelRatio * RENDER_SCALE`, capped) and refreshes
  on resize so glyphs stay sharp.
* `src/game/ui/`: `theme.ts` (medieval palette/spacing/fonts), `layout.ts`
  (`frame`, `columns`), `icon.ts` (procedural `Graphics` icons: shields, units,
  event and weather pictograms — never asset files), `focus.ts` (`FocusGroup` keyboard ring), `text.ts`
  (`label`, `loadFonts`), `ornament.ts` (procedural `woodBackground`,
  `frameBorder`, `crest`, `divider`, `panelFrame`/`panelTitle`),
  `widgets.ts` (`Panel`, `Button`, `ListMenu`, `StatRow`, `NumberField`,
  `SegmentedControl`) and `dialog.ts` (`alert`, `chooseList`, `numberPrompt`
  modals). The shared `statusBar`/`primaryAction`/`screenTitle` live in
  `scenes/common.ts`; every in-game `statusBar` also carries a bottom-left
  `Menü` button whose pause overlay toggles the music and can end the game
  (clears the save, jumps to `Highscore`).
* Theme is parchment-on-wood: dark walnut canvas (`main.ts`
  `backgroundColor`), light parchment panels, gold accents and dark ink text.
  Self-hosted woff2 (Cinzel display, EB Garamond body, mono for numbers) in
  `src/assets/fonts/` via `@font-face` in `style.css`; `Boot` awaits
  `loadFonts()` before the Menu so Phaser rasterizes the real typeface.
* Every widget supports pointer **and** keyboard; only the newest `FocusGroup`
  per scene is active, so modals suspend the screen behind them.
* `NumberField` only commits typed digits on Enter, so `numberPrompt`'s OK button
  must call `field.commitValue()` (a mouse click would otherwise drop the typed
  value). Only the NewGame name prompt uses a native DOM `<input>`
  (`this.add.dom`, so `dom.createContainer` is on) because the canvas has no real
  caret; `#game-container` needs `overflow: hidden` so the canvas's
  auto-centering margin does not collapse through it and double-offset the DOM
  overlay.
* Sliders (`Slider` / `sliderPrompt`) have no cancel button; Escape resets to the
  initial/default position (`Slider.reset()`).

## Browser debugging

`playwright-core` is a dev dependency (no browser bundled); install Chromium
once with `pnpm exec playwright-core install chromium`. Start `pnpm dev` (URL
`http://localhost:8080/kaiser2/`) and use the shared driver instead of writing a
throwaway script per change:

```text
node scripts/drive.mjs Grain press:Enter type:500 wait:300   # one scene, JSON out
node scripts/drive.mjs Taxes --png                            # also tmp/Taxes.png
node scripts/drive.mjs --flow                                 # full end-to-end walk
```

`scripts/drive.mjs` injects a ready fixture (`scripts/harness.mjs`), replays the
space-separated steps (`wait:`, `press:`, `type:`, `click:x,y`, `scene:`,
`fixture:`, `reload`, `shot:`, `snap`) and prints `window.__snapshot()` — every
visible text object of the active scene with canvas coords, `*` marking the
keyboard-focused widget (`src/game/debug/snapshot.ts`). **Verify with the text
snapshot, not a PNG**: it is deterministic and costs a few lines of tokens
instead of a 1512x982@2x image. Only pass `--png` when geometry/visual layout is
what changed. `--raw` skips the fixture/scene bootstrap; `--flow` is the old
whole-flow screenshot walk.

Before revising a UI element, export every screen once and keep the exports as
the review baseline:

```text
sh scripts/gen_screen_exports.sh    # tmp/screens/NN-SS-*.png plus matching .txt
sh scripts/gen_screen_exports.sh --screen=NN   # re-export one screen in place
```

`node scripts/gen_screen_exports.mjs` walks all screens on a Baron fixture who owns
one of each purchase and stores the `__snapshot()` text beside each PNG;
sub-menus/pop-ups export as their own `NN-SS-...` files (`SS` counts them),
and the trading-house screen (Landgraf+) temporarily promotes the ruler.
Each numbered screen is visited in a fresh page load: headless Chromium has
no WebGL2, so Phaser falls back to the Canvas renderer, where closing a
slider pop-up leaks a context-less text texture that kills the next screen's
text. After a UI change re-run only the touched screen (`--screen=NN`) and diff
that `.txt` (deterministic) for content and `.png` for geometry/typography; a
full walk is only needed when the export list itself changes, and it still
overwrites in place (untouched screens keep their baseline exports).

For custom cases import `scripts/harness.mjs` (`openSession`, `fixtureState`)
from a `./tmp/*.mjs` script (gitignored; resolves `playwright-core` from the root
`node_modules`); `session.errors` collects `pageerror` output.

## Phaser v4 notes

* `this.input.keyboard` is nullable; guard before use.
* Keyboard key types are `Phaser.Types.Input.Keyboard.*`.
* Phaser 4 removed the `setTintFill(color)` argument: use
  `setTint(color).setTintMode(TintModes.FILL)` (import `TintModes` from `phaser`).
* `ScenePlugin.start()`/`restart()` with no data reuse the previous scene data;
  pass explicit data to reset `init()`.
* `GameObjects.Sprite` is not a subclass of `GameObjects.Image`; animated objects
  must be typed/created as `Sprite`.

## Tooling gotchas

* `.github/workflows/check.yml` must use the same toolchain as `package.json`.
* `knip.json` `entry` must list `src/main.ts` (vite `root` is `src`, so the HTML
  entry alone is not resolved) or knip reports every `src/` file as unused.
* The game does **not** load extracted Atari graphics/sounds; they are archival
  only. `sh scripts/run_all.sh` extracts `atari/bin/` → `re/`; `pnpm run assets`
  copies `re/assets/` → `public/assets/`. `re/` and `public/assets/` are
  generated and gitignored; `atari/bin/` and `scripts/` are committed.
* `atari/scripts/*.mjs` are dev-only conversion tools; list them under knip
  `ignore`, **not** `entry` (an uninstalled import like `ffmpeg-static` then
  fails `chk_js_dead`).

## SonarQube

* No nested ternaries (`a ? b : c ? d : e`) — extract the inner branch to a
  variable or use `if`/`else`.
* Never instantiate a widget only for its side effect: a bare background panel
  uses `Panel.decorate(...)` (plain `new Panel(...)` is S1848, `void new
  Panel(...)` is S3735).
* Mark every field that is never reassigned `readonly`.
* Prefer `??=`, optional chaining (`a?.b`) and `Math.min`/`Math.max` over the
  hand-written `if`/ternary equivalents.
* No `Math.random` (S2245) — use `crypto.getRandomValues` (see `coinNoise` in
  `audio/music.ts`).
* Keep regexes linear (S8786): anchor on the suffix instead of a lazy `.*?`
  before an alternation, and drop the regex entirely when string methods do the
  job (see `heirName` in `model/events.ts`).
* Extract shared logic when two functions would otherwise be identical (S4144);
  see `settle()` in `ui/dialog.ts`.
* Keep cognitive complexity ≤ 15 per function (S3776) — extract helpers
  (`TradingHouse.chooseAction`, `atr.parse_atr`).
* `str.endswith` takes a tuple, not chained `or`; use `\d`, not `[0-9]`.
* Object spread tolerates `undefined`, so `...(x ?? {})` is redundant.
* Do not disable pinch-zoom via the viewport meta (`user-scalable=no`,
  `maximum-scale`); the canvas already blocks it with `touch-action: none`.
* Treat CLI paths in `atari/scripts/` as untrusted: reduce to
  `os.path.basename` or guard with a repo-root `Path.resolve()` /
  `is_relative_to` check (S8707). The Python scripts must stay under the
  complexity limit too.
* A suppression comment (`# NOSONAR`) must sit on the offending line; a
  standalone or malformed one is itself flagged (S7632). Prefer fixing the
  root cause.
