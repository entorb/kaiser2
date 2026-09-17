# Improvements Ideas

Open proposals for the game. Base rules are in `atari/rules.md`; each idea
names the source rule it would change. The improved rules live in the Remake
ruleset (start-page toggle, default; see [rules-remake.md](rules-remake.md)),
the faithful port stays selectable as `Atari`. What is already implemented is
described in `rules-remake.md` and only marked here as **Done**; everything
else is still open.

The first section is different: those items change no formula, parameter or
turn order, only *what the game shows and when*, so they can ship in both
rulesets.

## Quality of life (no rule changes)

### Reading the state

- **The promotion threshold.** the player sees points but not the target.
  Show `points / needed for <next title>`
- **Thousands separators.** Figures print raw (`${Math.trunc(p.lkorn)}`) while
  grain and money reach six digits. Group digits per locale.

### Making the formulas visible

- **Mark the feeding thresholds on the distribution slider.** Mill profit counts
  only `min(MUHL, KAUS/1000)` mills and market profit `min(MARKT, KAUS/333)`
  markets (`rules.md` §7), so the grain issue quietly decides the year's income.
  `Slider` already supports `markers`: put one at `MUHL*1000` and `MARKT*333`.
- **Count idle buildings.** The chronicle reports mill and market profit but not
  how many were unfed; "7 of 9 mills worked" explains a bad year.
- **Preview the population effect of the grain issue.** The slider only colors
  red below `VKORN`; births, deaths and immigration follow from
  `(KAUS-VKORN)/150` and `/1300` (`rules.md` §7). Show the estimated swing live.
- **Worked land vs owned land.** `BACKER = min(ACKER, LEUTE/5)` means acres
  beyond `LEUTE*5` yield nothing; the Land screen shows only the total. Display
  both so nobody buys dead acres.
- **Building capacity, not just the next requirement.** Business compares the
  *next* building's land need with holdings; the land the existing mills and
  markets need (1000 / 600 ha) stays hidden, so rulers sell land straight into
  the razing of `rules.md` §8.1. Show "markets 12 / 14 covered".
- **Say that new tax rates apply next year.** `stateIncome` credits the income
  with the rates already in force when `Taxes` opens
  (`src/game/scenes/Taxes.ts`), and the figure on screen does not move with the
  sliders. Label it as the sum just collected and preview what the newly chosen
  rates would raise on the same base. **Done for Remake** (live `Erwartet pro
  Jahr` forecast under the sliders); the Atari screen still shows only the
  collected sum.
- **Partner stock, not only prices.** The partner list prints the three prices
  (`src/game/scenes/TradePartner.ts`); the amounts on offer
  (`VERKORN`/`VERALAND`/`VERBLAND`) decide whether the partner can fill the
  order at all and are discovered one screen later, when the choice is locked.

### Warnings before the axe falls

- **Land shortage deposition.** `LAND+ACKER < LEUTE*10` (`rules.md` §11.2) fires
  at the end of the turn without notice, and population grows into it every
  year. Warn while the buffer is thin.
- **Tax band.** The footer names the 20/60/80 limits (`tax.limits`); show the
  live sum of the three rates against them instead of leaving the arithmetic to
  the player. **Done for Remake** (mood gauge from the effective burden, with
  the 30/80/20 limits in the footer); still open for Atari.
- **The bankruptcy line.** Pawn triggers at `GELD < -10000 - TITEL*2000`
  (`rules.md` §11.1). Show that exact limit while the balance is negative.
- **Expropriation expectation.** The Emperor seizes a house when grain was
  hoarded or tribute underpaid (`rules.md` §3), but both tests run after the
  screen closes. State the expectation while the tribute slider is open.
  **Done for Remake** (guide lines and verdict on the slider; an insult is the
  only cause); still open for Atari.
- **Confirm the end of the turn.** "Ende" in Business runs pawn, deposition,
  death and interest immediately. A confirmation that lists the triggers about
  to fire prevents losing a reign to a stray Enter.

### Feedback on outcomes

- **The Emperor's verdict on the tribute.** `ABG - 1000 + RAND(2000) > ZAHL`
  silently awards or costs points in `TradingHouse.create`. Report whether the
  tribute pleased him, and the point change. **Done for Remake** (verdict shown
  live on the tribute slider); still open for Atari.
- **Sabotage loot.** The result is a bare success/failure alert
  (`SecretService.operate`) while gold, grain, land and a building change hands.
  List what was taken.
- **What the spy inspection bought.** The inspection is paid for
  (`RAND(500)+TITEL*500`) and the guard count goes straight into the combat roll
  without being shown, although `rules.md` §12.2 says it is displayed. Show the
  scouted guards before the saboteur count is chosen.
- **Tell the victim.** A razed mill only surfaces as a smaller number next turn.
  A start-of-turn notice ("your trading house burned down") keeps a hotseat
  round honest. **Done for trades in the Remake** (`rules-remake.md` §3.5:
  a note for what other rulers bought from or sold to you); sabotage is still
  silent.
- **Break down the final score.** The hall of fame shows one number
  (`src/game/scenes/Highscore.ts`) although the year term
  `(200-(JAHR-1700))*200` dominates everything else. List the components so
  players learn what actually pays.
- **A point ledger.** Points arrive in fractions from a dozen places (buildings
  +0.5..+2.1, tribute, a 50000-unit grain purchase, the free +1 per turn, -0.5
  for visiting the secret service in debt). A per-turn list of where they came
  from makes the score learnable.

### History and trends

- **Keep a per-year record.** `GameState` has no history
  (`src/game/model/types.ts`), so nothing can be compared with last year. A
  small per-ruler log (population, money, grain, points, weather, tax rates)
  kept beside the ported rules model would feed every item below.
- **Deltas in the ranking.** Ranking is a pure snapshot
  (`src/game/scenes/Ranking.ts`); add the change since last year and whether a
  ruler moved up or down.
- **Trend lines.** With the log, population/money/grain curves are a few
  Graphics calls and are the clearest way to spot a slow decline.
- **A chronicle archive.** Each year's chronicle is shown once and then gone;
  make the last years re-readable from the pause menu.

### Rules at hand

- **In-game rules screen.** Per-screen hint footers exist, an overview does not.
  A scrollable reference (harvest, feeding, income, promotion, sabotage) from the
  main menu and the pause overlay, built from the same i18n strings.
- **Per-screen help key.** `?` / `F1` opens the section for the current screen
  and lists the key bindings (arrows, Enter, Escape, `M`), which are currently
  undocumented in the game itself.
- **Explain the labels.** `StatRow` labels are bare terms ("Bedienstete",
  "Kornausgabe"); one explanatory line on focus or hover carries the manual into
  the game.

### Convenience

- **Slider jump keys.** Home/End for the bounds and one key for the "needed"
  value (already computed as the default); dragging a 0..80000 grain slider is
  the slowest part of a turn.
- **Remember last turn's settings.** Tax rates and offers persist, servant
  hiring and the trade partner do not; defaulting to the previous choice cuts
  the clicks without changing what is possible.

## General

- **Implement `KRIEG`.** Read-only and always 0 (`rules.md:25`); only the
  harvest penalty `KORN = ABS(KORN - KRIEG*1000)` and the highscore term
  `-KRIEG*200` use it. War would make the dead variable live: declare war,
  resolve battles, make peace.
- **AI rulers.** **Done** (`rules-remake.md` §5): the new-game dialog adds
  Otto (easy), Konrad (medium) and Barbarossa (hard) to the table. Open: adapt
  taxes to the mood, trade grain and land with other rulers, spend idle cash,
  guards and sabotage (`rules-remake.md` §5.4).
- **Variance knob.** Many formulas have huge random swings (rot up to 50 %,
  `ZPSK` up to 2000); a mode could scale the noise.
- **No points for just existing.** `PUNKTE += 1` every turn (`rules.md:129`)
  rewards nothing; score should come from actions.

## Chronicle Income

Unchanged in both rulesets; the Remake only reworked the tax side. Could be
improved:

```plain
maxKorn  = min(muhl,  kaus/1000)              // mills actually fed
mg1      = int(maxKorn  * (280 + RAND(50)) * wetter / 5)   // mill profit
maxMarkt = min(markt, kaus/333)               // markets actually fed
mg2      = int(maxMarkt * (100 + RAND(50)) * wetter / 5)   // market profit
sold     = infant*(kavall+1) + 60 + artell*80*(manov+1)    // secret-service wages
```

## Taxes

**Done in the Remake ruleset** (`rules-remake.md` §1), still open for Atari:

- taxes should affect population influx: unrest from the burden now thins
  births and immigration and drives emigration.
- different tax bases: head tax on the population, building tax on mills and
  markets, fines from justice.
- `RA = RAND(100)*JUSTIZ` windfall: replaced by fines that come with unrest;
  fair justice buys headroom.
- income only from `MG1+MG2`, so taxes paid for the buildings that raise the
  tax base: taxes now stand on people and buildings; mill and market profit is
  the ruler's own income.
- fed people pay more: head tax scales with `KAUS / VKORN`.

Open tax ideas (tithe, palace/cathedral upkeep, customs on trade, servants as
collectors, mood memory, disaster relief) are in `rules-remake.md` §2.

## Harvest / weather (`rules.md` §5.1)

- rot `FAUL = RAND(50)+1` destroys up to half the granary every year, no matter
  the weather, mills or storage. Scale rot with weather and let mills/storage
  reduce it.
- weather multiplies *total* acre land `(ACKER/10)*WETTER`, not the worked land
  `BACKER`, and `ZPSK = RAND(2000)+1` dwarfs the base. Make weather scale
  `BACKER` and shrink the random term.
- `BACKER = min(ACKER, LEUTE/5)` caps farmed land by population; add a way to
  raise it (land improvement, fertilizer).

## Grain trade / prices (`rules.md` §5.2)

- **Done in the Remake** (`rules-remake.md` §3.5): a ruler sells only what the
  partner can pay, the Emperor buys 10 % below his price, computers keep a
  granary reserve and price by scarcity, no free point for 50000 grain.
- prices never move: buying or selling leaves `KPREIS` untouched. Add
  supply/demand drift after large trades. **Partly done in the Remake**
  (`rules-remake.md` §3.6, §3.7): the Emperor's price follows his stock, a
  big purchase raises the price within the deal, computers buy from the
  cheapest partner; no drift that carries over to the next turn yet.
  quote a per-unit price.
- the Emperor's price uses `RAND(running sum)` and symmetric noise
  (`rules.md:213-217`); use a plain average with bounded noise.

## Grain distribution (`rules.md` §5.3)

- shortage only shows up as fewer births/more deaths; add unrest or a revolt
  risk when `KAUS` stays below `VKORN`, so feeding the people is a real choice.
  The Remake already cuts the head tax of starving people (`FED`), but hunger
  itself does not yet feed into unrest.

## Trading houses (`rules.md` §3)

- **Done in the Remake** (`rules-remake.md` §3.1): `AH = -INT(HH - BD/5)` is
  opaque (the screen's `5·HH+1` servants only turn on one house; full effect
  needs `10·HH-4`), replaced by `staffed = min(HH, BD/8)`. Profit no longer
  uses `RAND(JAHR)` (which averages ≈ 850 all game, not a calendar effect: the
  noise dominates the base 200) or `PUNKTE*5`.
- **Done in the Remake** (`rules-remake.md` §3.2): tribute follows trade, and a
  visible verdict ladder replaces the coin flip `ABG - 1000 + RAND(2000) >
  ZAHL`, the tiny `INT(ABG/2000)` points and the invisible 1/6 expropriation.
  Under the Atari rules the tribute is mostly noise: the simulation finds no
  clearly best policy.
- **Done in the Remake** (`rules-remake.md` §3.3): the lease needs the full
  price, which now rises by 1000 per house owned, and lives in the model.
- open (`rules-remake.md` §3.4): Emperor's pool scaled by player count (T6);
  cap the tribute slider range.

## Promotion (`rules.md` §10)

- `need` grows quadratically while points per turn are tiny; rescale so
  mid-game promotion is reachable.
- the win needs both `DOM=20` and `BURG=15`; consider weighting cathedral vs
  castle or partial credit.

## End-of-turn events (`rules.md` §11)

- pawn sets `LEUTE = 200 + RAND(300)` (near-total population loss) and halves
  points; soften bankruptcy to cost land/buildings, not people.
- interest: debt grows 8 %/year but savings earn 2 % (`rules.md:462`); make it
  symmetric or cap debt. The simulated bot ends games with 160k taler idle
  when nothing is left to buy (2 % a year on that is 3000+): consider capping
  the interest base.
- death/heir: the source drops the rank and re-awards points, the manual §15
  keeps the rank at 0 points (`rules.md:456`); the new mode could follow the
  manual.

## Secret service (`rules.md` §12)

- on success the used saboteurs are not consumed (`rules.md:526`); consume them.
- spy cost `RAND(500)+TITEL*500` per building is steep and random; use a
  flat/known price.
- no counter-espionage: the defender can neither detect nor retaliate; add a
  defense roll or a warning.

## Highscore (`rules.md` §13)

- `(200 - (JAHR-1700))*200` means finishing early dominates every building
  term; rebalance the year weight.
- scores of the two rulesets are not comparable (the Remake start is richer),
  yet both go into one hall of fame. Keep a table per ruleset, or at least
  show the ruleset next to each entry.

## Status map (`rules.md` §9.3)

- `Städte = INT(min(MARKT/5, MUHL/3))+1` ignores population and land; let
  cities depend on those too, or make cities the growth driver.

## Remake follow-ups

Proposals that only exist because of the Remake tax model.

- **Say why people left.** The chronicle prints emigrants but not the cause;
  with unrest it can name it ("burden 62: 41 citizens emigrated, births
  −36 %"). The same line teaches the quadratic penalty.
- **Show the population swing on the Taxes screen.** The mood gauge is a word
  and a bar; the estimated net change per year (births, immigration and
  emigration at the chosen rates) would let players price the tax.
- **Show the ruleset of a saved game.** `Continue game` loads the saved rules
  regardless of the start-page toggle, and nothing on the button says which
  they are; mark it ("Remake" / "Atari").
- **Balance pass.** **First pass done** (`node scripts/sim.mjs` runs the
  computer players, `rules-remake.md` §4): the best static burden is 40–56,
  feeding about 3.5 grain per head above the need is the sharpest lever, paying
  half the tribute is best; start rates and the `Hart` fine are tuned. Still
  open: a softer climb from burden 56 to 66, and a smarter computer (adapts
  taxes to the mood gauge, trades grain) before trusting absolute numbers.
- **Feeding hint.** The simulation shows feeding a surplus decides the game
  (4 % wins at 1.75 grain per head above the need against 99 % at 2.5), yet the
  Grain screen only marks the need. Mark the growth-optimal amount
  (`VKORN + 3.5·LEUTE`) on the distribution slider.
- **Bring more Atari quirks under the toggle.** Each item in the sections
  above (rot, trading-house profit, pawn, interest, promotion curve, sabotage
  upkeep) can become a Remake-only rule the same way the taxes did: a branch
  on `state.rules` next to the Atari formula, a paragraph in
  `rules-remake.md`, one test.
