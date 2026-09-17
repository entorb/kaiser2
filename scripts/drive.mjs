// Generic Playwright driver for the dev build. Prints a text snapshot of the
// active scene (see `__snapshot()` in src/main.ts) so UI changes can be
// verified from JSON instead of screenshots.
//
//   node scripts/drive.mjs Grain press:Enter type:500 wait:300
//   node scripts/drive.mjs Taxes --png
//   node scripts/drive.mjs --flow
//
// Steps (space separated):
//   wait:ms      wait
//   press:Key    key down/up (bare `Enter` also works)
//   type:text    type into the focused element (e.g. the name DOM input)
//   click:x,y    click at canvas coords (960x576)
//   scene:Key    start another scene
//   fixture:{}   inject fixture state (optional JSON overrides)
//   reload       reload the page
//   shot:name    screenshot to tmp/name.png
//   snap         print the snapshot mid-run
//
// Flags:
//   --flow     run the built-in end-to-end walk (Menu -> ... -> TradePartner)
//   --raw      skip the default fixture injection + scene start
//   --png      screenshot the final state to tmp/<scene>.png
//   --url=...  game URL (default http://localhost:5173/kaiser2/)
import { fixtureState, formatSnapshot, openSession } from "./harness.mjs"

const FLOW = [
  "wait:1200",
  "shot:1-menu",
  "click:248,285",
  "wait:500",
  "press:Enter",
  "wait:500",
  "type:Torben",
  "press:Enter",
  "wait:600",
  "shot:2-newgame",
  "reload",
  "fixture",
  "scene:Business",
  "wait:700",
  "shot:3-business",
  "press:ArrowDown",
  "press:ArrowDown",
  "wait:300",
  "shot:4-business-palace",
  "scene:Ranking",
  "wait:700",
  "shot:5-ranking",
  "scene:Land",
  "wait:700",
  "press:Enter",
  "wait:500",
  "press:ArrowRight",
  "press:ArrowRight",
  "wait:300",
  "shot:6-land-prompt",
  "scene:Taxes",
  "wait:700",
  "shot:7-taxes",
  "scene:TradeData",
  "wait:700",
  "shot:7b-tradedata",
  "scene:Grain",
  "wait:700",
  "press:ArrowRight",
  "press:ArrowRight",
  "wait:300",
  "shot:8-grain",
  "press:Enter",
  "wait:500",
  "shot:8b-grain-after-trade",
  "press:Tab",
  "press:Enter",
  "wait:500",
  "shot:8c-grain-dist",
  "scene:SecretService",
  "wait:700",
  "shot:9-secret",
  "scene:TradePartner",
  "wait:700",
  "shot:10-partner",
]

const args = process.argv.slice(2)
const has = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

async function runStep(session, step) {
  const i = step.indexOf(":")
  const kind = i < 0 ? step : step.slice(0, i)
  const arg = i < 0 ? "" : step.slice(i + 1)
  switch (kind) {
    case "wait":
      return session.wait(Number(arg))
    case "type":
      return session.type(arg)
    case "press":
      return session.press(arg)
    case "scene":
      return session.startScene(arg)
    case "click": {
      const [cx, cy] = arg.split(",").map(Number)
      const pt = await session.canvasPoint(cx, cy)
      return session.page.mouse.click(pt.x, pt.y)
    }
    case "shot":
      return session.shot(arg)
    case "fixture":
      return session.inject(fixtureState(arg ? JSON.parse(arg) : {}))
    case "reload": {
      await session.page.reload({ waitUntil: "load" })
      return session.wait(1200)
    }
    case "snap":
      console.log(formatSnapshot(await session.snapshot()))
      return
    default:
      return session.press(step)
  }
}

const flow = has("flow")
const positional = args.filter((a) => !a.startsWith("--"))
const scene = positional[0]
const steps = flow ? FLOW : positional.slice(1)
if (!flow && !scene) {
  console.error(
    "usage: node scripts/drive.mjs <Scene> [step...] [--flow] [--raw] [--png] [--url=...]",
  )
  process.exit(2)
}

const session = await openSession({ url: opt("url") })
let failed = false
try {
  if (!flow && !has("raw")) {
    await session.inject(fixtureState())
    await session.startScene(scene)
    await session.wait(700)
  }
  for (const step of steps) await runStep(session, step)
  if (has("png")) await session.shot(flow ? "flow-final" : scene)
  console.log(formatSnapshot(await session.snapshot()))
} finally {
  if (session.errors.length > 0) {
    console.error(`page errors:\n${session.errors.join("\n")}`)
    failed = true
  }
  await session.close()
}
if (failed) process.exit(1)
