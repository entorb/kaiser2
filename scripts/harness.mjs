// Shared Playwright harness for driving the dev build.
//
// Reuse this from a throwaway `./tmp/*.mjs` script or via `scripts/drive.mjs`.
// Start `pnpm dev` first; the game URL defaults to the vite dev server.
import { chromium } from "playwright-core"

export const DEFAULT_URL = "http://localhost:5173/kaiser2/"

/** `VIEWPORT=844x390` runs the whole session at another window size (phones). */
function envViewport() {
  const m = /^(\d+)x(\d+)$/.exec(process.env.VIEWPORT ?? "")
  return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined
}

/**
 * A ready-to-play fixture: one human ruler (index 1) and the Kaiser (index 0).
 * Pass `{ sp, count, jahr, players }` to tweak; `players` is keyed by index,
 * e.g. `fixtureState({ players: { 1: { geld: 500 } } })`.
 */
export function fixtureState(overrides = {}) {
  const {
    sp = 1,
    count = 2,
    jahr = 1700,
    rules = "atari",
    players: playerOverrides = {},
    ...rest
  } = overrides
  const mk = (name, i) => ({
    name,
    kingdom: `Reich ${i}`,
    portrait: i % 8,
    controller: 0,
    acker: 30000,
    leute: 500,
    krieg: 0,
    lkorn: 15000,
    land: 50000,
    kpreis: 100,
    muhl: 0,
    markt: 0,
    geld: 10000,
    lpreis: 2000,
    apreis: 2000,
    verAcker: 2500,
    punkte: 0,
    verBau: 2500,
    justiz: 2,
    entHob: 0,
    hh: 0,
    bd: 0,
    mwst: rules === "remake" ? 20 : 10,
    ein: rules === "remake" ? 20 : 5,
    zoll: rules === "remake" ? 0 : 25,
    dom: 0,
    burg: 0,
    infant: 0,
    artell: 0,
    kavall: 0,
    manov: 0,
    tod: 40,
    titel: 0,
    verkorn: 10000,
    ...playerOverrides[i],
  })
  const players = [mk("der Kaiser", 0)]
  for (let i = 1; i <= 6; i++) players[i] = mk(i === 1 ? "Torben" : "", i)
  return {
    rules,
    players,
    count,
    sp,
    jahr,
    wetter: 5,
    mg1: 0,
    mg2: 0,
    turn: {
      han: 0,
      kaus: 0,
      vkorn: 0,
      klager: 0,
      abg: 0,
      zahl: 0,
      gew: 0,
      neu: 0,
      alt: 0,
      faul: 0,
    },
    ...rest,
  }
}

/**
 * Launch Chromium, open the game and return helpers. Call `close()` when done.
 * `errors` collects `pageerror` messages (Phaser errors surface there).
 */
export async function openSession(options = {}) {
  const {
    url = DEFAULT_URL,
    viewport = envViewport() ?? { width: 1512, height: 982 },
    deviceScaleFactor = 2,
  } = options
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport, deviceScaleFactor })
  const errors = []
  page.on("pageerror", (e) => errors.push(String(e)))
  await page.goto(url, { waitUntil: "load" })
  await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, undefined, {
    timeout: 15000,
  })

  const canvasPoint = async (cx, cy) => {
    // The design size varies with the window aspect (see ui/layout.ts): it is
    // the canvas backing size divided by the scene camera's zoom.
    const r = await page.evaluate(() => {
      const c = document.querySelector("canvas")
      const b = c.getBoundingClientRect()
      const zoom = window.__game.scene.getScenes(true)[0].cameras.main.zoom
      return {
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.height,
        dw: window.__game.scale.width / zoom,
        dh: window.__game.scale.height / zoom,
      }
    })
    return {
      x: r.x + (cx / r.dw) * r.w,
      y: r.y + (cy / r.dh) * r.h,
    }
  }

  return {
    browser,
    page,
    errors,
    canvasPoint,
    inject: (state = fixtureState()) =>
      page.evaluate((s) => window.__game.registry.set("kaiser2.state", s), state),
    startScene: (key) =>
      page.evaluate((k) => {
        window.__game.scene.getScenes(true).at(-1).scene.start(k)
      }, key),
    press: (key) => page.keyboard.press(key),
    type: (text) => page.keyboard.type(text),
    wait: (ms) => page.waitForTimeout(ms),
    shot: (name) => page.screenshot({ path: `./tmp/${name}.png` }),
    snapshot: () => page.evaluate(() => window.__snapshot()),
    close: () => browser.close(),
  }
}

/** Compact, line-oriented rendering of a `__snapshot()` result. */
export function formatSnapshot(snapshots) {
  return snapshots
    .map(({ scene, texts }) =>
      [
        `# ${scene}`,
        ...texts.map((t) => {
          const sizeSuffix = t.size != null ? ` [${t.size}]` : ""
          return `${t.focused ? "*" : " "} ${String(t.y).padStart(3)} ${String(t.x).padStart(
            3,
          )}  ${t.text}${sizeSuffix}`
        }),
      ].join("\n"),
    )
    .join("\n")
}
