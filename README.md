# Kaiser 2 Remake

This is a modern remake of the 1989 Atari Game Kaiser 2

Hosted and playable at [entorb.net/kaiser2/](https://entorb.net/kaiser2/)

Based on the [source code](atari/src.zip) and [binaries](atari/bin.zip) from [kaiser2.strotmann.de](https://kaiser2.strotmann.de), thankfully provided by Carsten Strotmann. See [atari/](atari/) for more details.

## Tech stack

- TypeScript
- Phaser v4
- Vite
- pnpm
- PWA (app installation and offline support)

Most coding done by AI tools.

## Changes with regards to the original

- All UI and audio elements have been recreated from scratch
- Alternative game rule set [rules-remake.md](rules-remake.md) implemented (changes in taxes etc.), original [atari/rules.md](atari/rules.md) also implemented

## Overview of created UI elements

```sh
pnpm run dev
http://localhost:5173/kaiser2/list-icon.html
http://localhost:5173/kaiser2/list-audio.html
http://localhost:5173/kaiser2/list-image.html
```

Trigger a scene via browser console on the purchases screen.

```js
__game.scene.getScenes(true).at(-1).scene.start("Monument", { kind: "burg" }) // palace
__game.scene.getScenes(true).at(-1).scene.start("Monument", { kind: "dom" })  // cathedral
__game.scene.getScenes(true).at(-1).scene.start("Coronation", { name: "Torben" })

// To see the real flow, give a ruler 14 palace parts, land and money, then buy the last part:
const p = __game.registry.get("kaiser2.state").players[1]
Object.assign(p, { burg: 14, dom: 19, geld: 500000, land: 100000 })
```

## Commands

- `pnpm run dev` — dev server
- `pnpm run build` — production build to `dist/`
- `pnpm run preview` — serve the production build locally
- `pnpm run lint` — biome
- `pnpm run test` — vitest
- `pnpm run icons` — regenerate `public/icons/` from `scripts/gen_icons.mjs` (committed, not run on build)
- `sh scripts/run_checks.sh` — full check suite
- `sh scripts/gen_screen_exports.sh` — export every game screen for UI review
- `sh scripts/scripts/get_sonar_issues.sh` — download SonarQube findings to `tmp/sonar.json`

## Code Checks

- see [scripts/chk_*.sh](scripts/)
- [SonarQube](https://sonarcloud.io/summary/overall?id=entorb_kaiser2)
