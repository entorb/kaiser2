# Kaiser 2 Remake — Progress Tracker

Historical record of the web re-implementation of Kaiser 2 (Phaser v4 + Vite +
TypeScript). Frozen: kept for reference, not updated. Source of truth for rules:
`atari/src/*.TUR`; for intended behaviour and UI text: `atari/manual/index.md`.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

## Status summary

| Phase | State | Notes |
| --- | --- | --- |
| 0 — Assets + config | `[x]` | config.ts, partial screens rendered |
| 1 — Model + UI kit | `[x]` | pure rules + tests, i18n, widgets, save |
| 2 — Vertical slice | `[x]` | playable yearly loop, verified in Chromium |
| 3 — Full parity | `[~]` | turn loop complete; secret service + polish left |
| 4 — Polish / checks | `[~]` | run_checks.sh green; docs pending |

## Decisions log

- **Player count: 6 (source)**, adjustable via `src/game/config.ts`
  (`maxPlayers`, default 6). Manual §intro says 1–4; source arrays/name entry
  allow 6. 6 is a superset, config keeps it tunable.
- **Modern font**, not the extracted `.FNT` bitmap font. Monospace at the
  native 8px cell so the 40×24 grid / Atari layout coordinates stay valid.
  German chars are plain Unicode (ATASCII escapes normalized at port time).
- **Hotseat only** (faithful); no AI.
- **German + English toggle**, keyed string table (`i18n/strings.ts`).
- **Copy protection (Lenslock, `TESTER.TUR`) intentionally skipped** — manual
  supplies the code table, but it is anti-piracy UI, not gameplay.
- **Keyboard input added** by design; the original required a joystick.
- **Modern flat-dark UI overhaul.** The 40x24 grid is no longer the layout
  system; scenes compose a widget kit (`Panel`, `Button`, `ListMenu`,
  `StatRow`, `NumberField`, `TextField`, `SegmentedControl`, modals) in canvas
  pixels. All widgets are pointer **and** keyboard driven (`FocusGroup`).
  Wording/layout may differ from the original; rules and flow do not.
- **No Atari graphics or sounds.** Maps, portraits and chrome are drawn
  procedurally with Phaser Graphics; the extraction pipeline is kept only as an
  archival reference. Text is rasterized at the on-screen upscale so it stays
  sharp (`ui/text.ts`).
- **Coat of arms = ruler identity.** Each ruler picks one of eight heraldic
  shields (`ui/icon.ts`), each with its own charge and color; the pick is
  `portrait`, an index into `PLAYER_COLORS`. Icons are unique per ruler (taken
  shields are dimmed/not selectable) and the status bar shows the current
  ruler's shield instead of a color tint.
- **Unicode names.** `TextField` accepts any Unicode letter/digit/space, so
  `ä ö ü ß` etc. work in ruler names.
- **Sliders for amounts.** Korn and Kornausgabe are one screen: a trade slider
  (left = sell, right = buy, default 0, step 500) with a red marker at the
  trade that reaches the required stock, plus a distribution slider
  between the 20 % minimum and 80 % maximum with Min/Needed/Max ticks,
  defaulting to the demand. Trading updates the granary
  (`KORNSPEICH`, filled by `stock / required stock` = `lkorn/klager`,
  KAISER3:20540) and the distribution bounds live; one `Weiter` settles the
  trade, gives the grain, then leaves for land. Each land kind uses one combined buy/sell slider
  (step 10); the tax rates use the same `Slider` widget and Handelsdaten uses it
  for the offered amount. Prices are shown in their source units (`/ 500` for
  grain, `/ 10ha` for land). Sliders consume Left/Right only, so Up/Down stays
  with the `FocusGroup` to move between lines (Staatseinnahmen). `ListMenu`
  releases Up/Down at the first/last row so the shared bottom action button is
  reachable by keyboard; the focus chain does not wrap, so ArrowDown on that
  button is ignored. Every screen's forward navigation uses the same
  `primaryAction` component (`Weiter` / `Zurück`). Trading-house tribute is a
  slider from 0 to the current fortune, defaulting to the demanded sum when the
  fortune covers it (else `max(0, fortune)`); it may be paid **once per screen**
  (deliberate deviation from the source, which allowed repeat payments).
  Hire/dismiss is one combined slider (left = dismiss, right = hire). The info
  box tops out with the annual wage bill (`50 × servants`) and shows the servant
  count (`needed = 5*HH+1`, KAISERB:1170), which turns red while understaffed;
  the requirement is in the footer. The house row reads
  `Handelshaus kaufen` and is grayed when the 5000 price is not covered. Sliders
  never show a cancel button — Escape resets them to their default position.
- **Ranking replaces the map.** `Übersichtskarte` is now a player ranking table
  (`Ranking` scene) with seven data fields; land is shown raw, not /1000. It is
  the **new-year page**, shown when the year rolls over (after the last ruler,
  following a promotion if any); `Staatseinkäufe` no longer links to it.
- **Staatseinkäufe trim.** The panel drops the Ackerland and total-Bauland rows;
  the footer of the highlighted building shows
  `cost Taler · required / total Bauland · +points Punkte`.
- **Autosave.** The manual "Spielstand sichern" entry is gone; `Business` saves
  to localStorage on entry and at end of turn.
- **Player colors.** Partner rows are tinted with `playerColor(portrait)`.
- **BASIC `INT` is floor.** `rules.int` maps to `Math.floor`, not `Math.trunc`;
  the difference shows on negative arguments (e.g. the trading-house profit
  `INT(HH - BD/5)`), where truncation wrongly yields no profit for a single
  staffed house.

## Phase 0 — Assets + config

- [x] `src/game/config.ts` — `maxPlayers` (6), starting year, etc.
- [x] `src/game/ui/palette.ts` — Atari color byte (708–712) → RGB hex.
- [x] `scripts/render_gfx.py` — render partial raw screens (`KORN`,
      `CHRONIK`, `KAISER3`, `KAISER6`, `ANNO1700`, small `KAISERII`).
- [x] Procedural placeholder art (menu, map, portraits) — the extracted
      bitmaps are no longer loaded at runtime.

## Phase 1 — Model + UI kit

- [x] `src/game/model/types.ts` — `PlayerState`, `GameState`.
- [x] `src/game/model/constants.ts` — provinces, titles, start values
      (`KAISER3:111-119`).
- [x] `src/game/model/rules.ts` — pure port of harvest, grain, land, trade,
      taxes, title advance, sabotage, chronicle, death, highscore.
- [x] `src/game/model/rules.test.ts`.
- [x] `src/game/model/save.ts` + test — localStorage, versioned.
- [x] `src/game/i18n/strings.ts`, `i18n.ts`.
- [x] `src/game/ui/` — `text.ts`, `menu.ts`, `prompt.ts`, `layout.ts`
      (numeric entry uses DOM `<input>` via `add.dom`).

## Phase 2 — Vertical slice

- [x] Scenes `Boot → Menu → NewGame → TradingHouse → Partner → Grain → Land →
      Taxes → Chronicle` (a `Title` scene is folded into `Menu`).
- [x] Rewire `flow.ts` + `flow.test.ts`.
- [x] Playwright smoke + full-turn drive (`./tmp/`); `run_checks.sh` green.

## Phase 3 — Full parity

- [x] TradeData (`KAISER4 #HA`), Map (`#KARTE`), Business (`#GESCHAFT`).
- [x] Interest, title advancement (with a `Promotion` screen, `KAISER4 PROC
      TITEL`), win → highscore, pawn/depose/death events.
- [x] Highscore (`KAISER6`), save/continue via localStorage.
- [x] Secret service / sabotage (`KAISER5`) — no map minigame, but guards are
      spread over the target's buildings (per-building defense) and inspecting a
      building costs `RAND(500)+TITEL*500` (`SPPI`).
- [x] Turn events: Enteignung (`KAISERB ENT`), high-tax demotion (`ENTHOB2`)
      and the deposed-ruler turn skip.
- [x] Death heir suffix: the heir keeps the name and gains a generation
      (`Torben II.`, `Torben III.`, ...); no manual name prompt.
- [ ] Startbild scroll + `ANNO1700` title animation.
- [x] Music + SFX beyond the title tune (menu blips).

## Phase 4 — Polish / checks

- [x] `sh scripts/run_checks.sh` clean.
- [x] UI overhaul: modern flat-dark widget kit, freeform canvas layout, pointer
      + keyboard + touch input, modal dialogs, shared status bar.
- [ ] Update `README.md`.

## Known issues / bugs (from source + manual)

Each item: source ref, observed behaviour, intended behavior, resolution.

1. **Player count mismatch** — manual §intro: 1–4; source `COM ...(6)` and name
   entry `G=6` allow 6. → Config, default 6.
2. **Trading-house unlock off by one** — manual §4 says unlock at *Markgraf*;
   `KAISERB:54` gates on `TITEL(SP)>1` (= *Landgraf*). → Port source value,
   note deviation; revisit if playtesting wants manual's gate.
3. **Death/heir differs from manual** — manual §15: heir starts at 0 points,
   same rank; `KAISER4:5090-5100` drops the title by 1 and awards points from
   the title. → Port source effects; instead of the manual name prompt the heir
   keeps the name with a generation suffix (`events.heirName`).
4. **Selling grain to a partner is broken** — `KAISER3:10580-10587`: the
   `GOTO 10180` fires first, so the partner's grain/money/stock updates are
   dead code. → Port the *intended* buyer/seller update and note the fix.
5. **Handelsdaten is multiplayer-only** — `KAISER4:765` tests
   `VAL(NAMEN$(1,1))=1`, i.e. the player count stored in the first name byte
   (`KAISER2:710`, read as `ANZAHL` in `KAISER3:160`), to skip the trade-data UI
   for a single ruler. → `TradeData` redirects to `Business` when `count <= 1`.
   (Earlier read as a wrong-player-index bug; it is the single-player gate.)
6. **Trade-data init flag never set** — `KAISER4:76/730`: `P` reset to 0 and
   never set to 1, so `IF P=1 THEN 770` is always false. → Init once on entry.
7. **Saboteurs not consumed on success** — `KAISER5:2110-2290`: `ARTELL(SP)`
   debited only on failure; on success used `US` saboteurs remain. → Decide and
   document.
8. **Lenslock copy protection** — `TESTER.TUR`. → Intentionally skipped.
9. **Keyboard unsupported in original** — manual §2. → Added by design.
10. **Detokenizer notes** — `.TUR` uses `%n` = integer literal `n`; ATASCII
    escapes `\`=ä, `]`=ö, `^`=ü, `{`=ß. → Normalize to Unicode at port time.
11. **Grain rot inverted** — `KAISER3:10150` keeps `LKORN*FAUL/100` while
    `FAUL` is displayed/manual-described as the *rotted* percentage. → Ported as
    keep `(100-FAUL)%` (`rules.harvest`).
12. **Chronicle uses scalar `JUSTIZ`** — `KAISER3:11950` tests `JUSTIZ=4`
    (always 0) instead of `JUSTIZ(SP)` for emigration. → Fixed to `p.justiz`.
13. **Chronicle uses `EINW` before computing it** — `KAISER3:11911` adds points
    with last year's `EINW`; `11941` adds again. → Kept both additions but
    computed `EINW` first.
14. **Sabotage defense uses attacker's training** — `KAISER5:2000`
    `WACH=WW*KAVALL(SP)` uses the *attacker's* KAVALL. → `resolveSabotage` takes
    the defender and uses `defender.kavall`.
15. **Price scaling looks like a bug but is source** — grain costs
    `amount*KPREIS/500` (`KAISER3:10492/10500`) and land costs
    `amount*LPREIS/10` (`KAISER3:11230`), so price 104 makes 1000 grain cost 208
    and price 20 makes 1 land cost 2. Intentional in the source; the sliders
    show the resulting total and the labels state the unit (`Preis / 500`,
    `Preis / 10ha`) so the UI is no longer misleading.
16. **Trading-house lease threshold** — `KAISERB:1590` allows the lease at
    `GELD>2500` but charges 5000, so it can push the ruler into debt. Kept as
    source (it is a playable risk), flagged for a balance decision.
17. **Partner screen skipped in single player** — source always runs
    `EXEC HANDEL` (`KAISER3:230`) and offers only the Emperor. → Deliberate
    deviation: auto-select the Emperor and skip the screen when `count <= 1`.
18. **LANDMANGEL never triggers in single player** — `KAISER4:1660-1800` razes
    surplus markets/mills when `LAND` falls below 600/1000 ha each, but it is
    only invoked at `KAISER4:765` inside the Handelsdaten entry, which a single
    ruler skips (item 5), so buildings survived selling their land. → Ported as
    `rules.landShortage`, called after selling building land (`Land`) and on
    `TradeData` entry. The source's `+1` over-raze (it fires on exact multiples
    of 600/1000) is fixed to the intended surplus.
19. **Enteignung ported** — `KAISERB:2530-2680` (`PROC ENT`): after the
    trading-house screen a Landgraf+ ruler loses one house when they hoarded
    grain (`VERKORN+RAND(5000)<LKORN`) or underpaid tribute
    (`ABG+RAND(5000)<ZAHL`), at a 1/6 chance. → `events.expropriate`, called
    from `TradingHouse`.
20. **High-tax demotion ported** — `KAISERB:2710-2900` (`ENTHOB2`): a tax burden
    over 80 % costs a rank and suspends for two years. → `events.taxDemotion`,
    run at turn start in `TradingHouse` (before the Landgraf gate, as source).
21. **Deposed rulers now sit out their term** — `KAISERB:2370` only skipped
    `ENTHOB=1`, so an `ENTHOB2` (two-year) suspension never skipped and the
    counter never cleared. → `turn.advancePlayer` consumes any suspension one
    turn at a time (single player is never skipped).
22. **Secret-service debt penalty** — `KAISER4:3151`: entering the secret
    service with negative money costs 0.5 points. → `Business`.
23. **Guard distribution / spy cost** — `KAISER5:920-1270` spreads the
    defender's guards over the buildings and `KAISER5:1630` charges
    `SPPI=RAND(500)+TITEL*500` per inspected building; on success the guards in
    the razed building die (`KAISER5:2120`). → `rules.distributeGuards` /
    `rules.guardsInBuilding` + `SecretService`. The map minigame is still
    dropped; the palace is added to the guarded set (source guards only mills,
    markets and trading houses) and the attacker takes the weakest building.
24. **Cities stat restored** — `KAISER4:1860` `Städte =
    INT(min(MARKT/5, MUHL/3))+1`; the ranking table (map replacement) now shows
    it (`rules.cities`).
25. **Deposition must not shorten a suspension** — `depose` overwrote `ENTHOB`
    with 1, so a >80 % demotion (`ENTHOB2` = 2 years, set at turn start) was cut
    to one year whenever a land/tax deposition fired at the end of the same
    turn. → `events.depose` keeps `max(entHob, 1)`.
26. **Per-turn aging/scoring was missing** — `KAISERB:2380` `TOD(SP) -= 1` and
    `PUNKTE(SP) += 1` at the start of each ruler's turn were not ported, so
    `TOD` only ever dropped on pawn and the death event never fired. →
    `turn.startRuler`, called by `advancePlayer` (for the ruler who actually
    plays, after skips) and by `NewGame` for the first ruler.
