// Export a PNG and a text snapshot of every game screen, for UI review.
//
//   node scripts/gen_screen_exports.mjs              # all screens → tmp/screens/
//   node scripts/gen_screen_exports.mjs --url=...    # game URL override
//   node scripts/gen_screen_exports.mjs --screen=07  # one screen only, e.g. 07
//
// Outputs `tmp/screens/<NN>-<SS>-<name>.png` plus a matching `.txt` (the
// `__snapshot()` of every visible text object, focused widget marked `*`).
// `<NN>` is the screen number from the table in AGENTS.md, `<SS>` the
// sub-screen count for that screen; sub-menus and pop-ups get their own
// export. Files are overwritten in place, never deleted, so a `--screen=` run
// leaves the untouched screens' exports as the review baseline. The fixture
// plays one Baron (title 1) who bought one of every available purchase. The
// trading-house screen only renders from Landgraf up (TradingHouse.create
// skips `titel <= 1`), so its exports temporarily promote the ruler to 2.
import { mkdirSync, writeFileSync } from "node:fs";
import { fixtureState, formatSnapshot, openSession } from "./harness.mjs";

const OUT = "tmp/screens";
const START_WAIT = 700;

/** One Baron (title 1) with one of every purchase; partner with targets. */
function baronState(titel = 1) {
  return fixtureState({
    rules: "remake",
    turn: {
      han: 0,
      kaus: 12000,
      vkorn: 14000,
      klager: 0,
      abg: 0,
      zahl: 0,
      gew: 0,
      neu: 0,
      alt: 0,
      faul: 0,
    },
    players: {
      1: {
        titel, // 1 = Baron; the trading-house exports pass 2 (Landgraf).
        geld: 50000,
        land: 50000,
        // One of each Business purchase (Staatseinkäufe) and of each
        // secret-service hire/training (Baron can afford all of them).
        markt: 1,
        muhl: 1,
        burg: 1,
        dom: 1,
        infant: 1,
        artell: 1,
        kavall: 1,
        manov: 1,
        hh: 2,
      },
      // A second ruler with buildings so sabotage targeting lists render.
      2: { name: "Otto", muhl: 2, markt: 3, hh: 1, burg: 1, infant: 5 },
    },
  });
}

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("--url="))?.slice("--url=".length);
const only = args
  .find((a) => a.startsWith("--screen="))
  ?.slice("--screen=".length);

let failed = false;
let errorsMark = 0;

// Headless Chromium has no WebGL2, so Phaser falls back to the Canvas
// renderer, where closing a slider pop-up leaves its next text texture
// without a context (`Frame.updateUVs` → `drawImage` on null), and every
// later screen renders without its text. WebGL2 for real players is fine;
// the export walk avoids it by reloading the page before each section.
const CANVAS_RENDERER_TXT = "reading 'drawImage'";

const section = async (titel = 1) => {
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(
    () => window.__game?.scene?.isActive("Menu"),
    undefined,
    { timeout: 15000 },
  );
  await session.inject(baronState(titel));
};
const startScene = (key) => session.startScene(key);
const startSceneData = (key, data) =>
  page.evaluate(
    ([k, d]) => window.__game.scene.getScenes(true).at(-1).scene.start(k, d),
    [key, data],
  );
const click = async (cx, cy) => {
  const pt = await session.canvasPoint(cx, cy);
  await page.mouse.click(pt.x, pt.y);
};

async function capture(name) {
  await session.shot(`screens/${name}`);
  const fresh = session.errors.slice(errorsMark);
  errorsMark = session.errors.length;
  const broken = fresh.some((e) => !e.includes(CANVAS_RENDERER_TXT));
  if (broken) failed = true;
  else if (fresh.length > 0)
    console.warn(`⚠ ${name}: canvas-renderer pageerror (WebGL2 only)`);
  writeFileSync(
    `${OUT}/${name}.txt`,
    `# ${name}\n${formatSnapshot(await session.snapshot())}`,
  );
  console.log(name);
}

/**
 * One numbered screen walk: a fresh page + fixture, then the scene(s) and
 * pop-ups that make up its exports. `--screen=<id>` runs just that walk.
 */
const SCREENS = [
  {
    id: "02",
    run: async () => {
      await section();
      await startScene("Menu");
      await session.wait(START_WAIT);
      await capture("02-01-menu");
      await click(817, 392); // Installieren (the button is inactive in dev; the alert opens)
      await session.wait(400);
      await capture("02-02-menu-install");
      await session.press("Enter");
      await session.wait(300);
    },
  },
  {
    id: "03",
    run: async () => {
      // NewGame: player count -> computers -> ruler setup.
      await section();
      await startScene("NewGame");
      await session.wait(START_WAIT);
      await capture("03-01-newgame-count");
      await session.press("Enter");
      await session.wait(400);
      await capture("03-02-newgame-computers");
      await click(836, 520); // arrow next, no computers -> ruler setup
      await session.wait(400);
      await capture("03-03-newgame-setup");
      await session.press("Enter"); // coat of arms -> name field
      await session.type("Torben");
      await session.press("Enter"); // name -> kingdom
      await session.type("Reich 1");
      await session.press("Enter"); // confirm, starts the turn
      await session.wait(400);
    },
  },
  {
    id: "04",
    run: async () => {
      // TradingHouse: tribute pop-up, the action list, the servants slider.
      await section(2);
      await startScene("TradingHouse");
      await session.wait(START_WAIT);
      await capture("04-01-tradinghouse-tribute");
      await session.press("Enter"); // pay the demand, closes the pop-up
      await session.wait(400);
      await capture("04-02-tradinghouse");
      await session.press("Shift+Tab"); // "Weiter" -> list (first: lease)
      await session.press("ArrowDown"); // -> servants
      await session.press("Enter"); // open the servants slider
      await session.wait(400);
      await capture("04-03-tradinghouse-servants");
      await session.press("Enter"); // commit 0 and close
    },
  },
  {
    id: "05",
    run: async () => {
      // TradePartner: the partner table.
      await section();
      await startScene("TradePartner");
      await session.wait(START_WAIT);
      await capture("05-01-tradepartner");
    },
  },
  {
    id: "06",
    run: async () => {
      // Grain, plus the shared pause overlay (Menü).
      await section();
      await startScene("Grain");
      await session.wait(START_WAIT);
      await capture("06-01-grain");
      await session.press("Escape");
      await session.wait(400);
      await capture("06-02-grain-menu");
      await session.press("Enter"); // resume
      await session.wait(300);
    },
  },
  {
    id: "07",
    run: async () => {
      // Land.
      await section();
      await startScene("Land");
      await session.wait(START_WAIT);
      await capture("07-01-land");
    },
  },
  {
    id: "08",
    run: async () => {
      // Chronicle.
      await section();
      await startScene("Chronicle");
      await session.wait(START_WAIT);
      await capture("08-01-chronicle");
    },
  },
  {
    id: "09",
    run: async () => {
      // Taxes.
      await section();
      await startScene("Taxes");
      await session.wait(START_WAIT);
      await capture("09-01-taxes");
    },
  },
  {
    id: "10",
    run: async () => {
      // TradeData: the ruler's own offers.
      await section();
      await startScene("TradeData");
      await session.wait(START_WAIT);
      await capture("10-01-tradedata");
    },
  },
  {
    id: "11",
    run: async () => {
      // Business: one of each purchase, then the finished-palace picture.
      await section();
      await startScene("Business");
      await session.wait(START_WAIT);
      await capture("11-01-business");
      await startSceneData("Monument", { kind: "burg" });
      await session.wait(1600); // sparks fade, banner fades in
      await capture("11-02-business-monument");
    },
  },
  {
    id: "12",
    run: async () => {
      // Promotion picture and the coronation animation.
      await section();
      await startSceneData("Promotion", {
        name: "Torben",
        title: "Landgraf",
        kingdom: "Reich 1",
        rank: 2,
        portrait: 1,
        nextRanking: false,
      });
      await session.wait(START_WAIT);
      await capture("12-01-promotion");
      await startSceneData("Coronation", { name: "Torben" });
      await session.wait(8500); // the winged crown has landed
      await capture("12-02-coronation");
    },
  },
  {
    id: "13",
    run: async () => {
      // Ranking.
      await section();
      await startScene("Ranking");
      await session.wait(START_WAIT);
      await capture("13-01-ranking");
    },
  },
  {
    id: "14",
    run: async () => {
      // SecretService, then a full sabotage walk (target, building, amount).
      await section();
      await startScene("SecretService");
      await session.wait(START_WAIT);
      await capture("14-01-secretservice");
      await session.press("Shift+Tab"); // "Zurück" -> list
      for (let i = 0; i < 4; i++) await session.press("ArrowDown"); // -> operations
      await session.press("Enter");
      await session.wait(400);
      await capture("14-02-secretservice-target");
      await session.press("Enter"); // target Otto
      await session.wait(400);
      await capture("14-03-secretservice-building");
      await session.press("Enter"); // saboteur the mill
      await session.wait(400);
      await capture("14-04-secretservice-amount");
      await session.press("Escape"); // cancel the sabotage
      await session.wait(300);
    },
  },
  {
    id: "15",
    run: async () => {
      // Highscore.
      await section();
      await startScene("Highscore");
      await session.wait(START_WAIT);
      await capture("15-01-highscore");
    },
  },
];

if (only && !SCREENS.some(({ id }) => id === only)) {
  console.error(
    `unknown screen ${only}; use one of ${SCREENS.map(({ id }) => id).join(", ")}`,
  );
  process.exit(1);
}

// Overwrite the exported files in place; keep the untouched screens' exports.
mkdirSync(OUT, { recursive: true });

const session = await openSession({ url });
const page = session.page;

try {
  const targets = only ? SCREENS.filter(({ id }) => id === only) : SCREENS;
  for (const screen of targets) await screen.run();
} finally {
  const fresh = session.errors.slice(errorsMark);
  errorsMark = session.errors.length;
  if (fresh.some((e) => !e.includes(CANVAS_RENDERER_TXT))) {
    console.error(`page errors:\n${fresh.join("\n")}`);
    failed = true;
  }
  await session.close();
}
if (failed) process.exit(1);
