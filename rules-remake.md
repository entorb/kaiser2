# Kaiser 2 — Remake Ruleset

Differences to the original rules in [atari/rules.md](atari/rules.md). Anything
not listed here is unchanged. The ruleset is chosen on the start page
(`Rules: Atari / Remake`, default **Remake**), stored per game in
`GameState.rules` and saved with it. Saves from before the toggle load as
`atari`.

Status: **tax model** (§1), **palace and cathedral prices** (§6), **trading houses** (§3.1 staffing and profit,
§3.2 tribute and verdict, §3.3 lease), **player trading** (§3.5–§3.7) and
**computer players** (§5) implemented. The balance simulation (§4) runs the
computer players and checked the numbers. Open ideas are in §2 (taxes), §3.4
(pool) and §5.4 (computers).

Code: `src/game/model/tax.ts` (formulas and tunable constants),
`houses.ts` (trading houses), `rules.ts` (`stateIncome`, `chronicle`,
`tradeHouse`), `events.ts` (`taxDemotion`, `expropriate`), `constants.ts`
(`createGameState` sets the start rates), `ai.ts` (computer players),
`trade.ts` (Emperor stock and prices, grain and land transfers, the trading
rules of §3.5–§3.7, `buyCheapest`, `buyCost`, the `MARKET` tunables),
`rules.ts` also holds the `FARMING` tunable (§3.7),
`scenes/Taxes.ts`, `scenes/TradingHouse.ts` and `scenes/NewGame.ts` (screens).
Tests: `model/tax.test.ts`, `houses.test.ts`, `ai.test.ts`, `trade.test.ts`.
Drive the screens with
`node scripts/drive.mjs Taxes 'fixture:{"rules":"remake"}' scene:Taxes`.
Simulate whole games with `node scripts/sim.mjs` (§4).

---

## 1. Tax model (replaces atari §9.1 and the tax parts of §3, §7, §11.2)

### 1.1 Why change it

In the Atari game the three taxes (`ZOLL`, `MWST`, `EIN`) are all the same
formula: `(mill profit + market profit) × (sum of rates) / 100`. The names
mean nothing, a ruler without mills earns ≈ 0 (start: ~100 taler/year), and
`JUSTIZ` only adds `RAND(100) × JUSTIZ` taler — a rounding error. The only
punishment for a high burden is a cliff: emigration once the sum passes 60 (or
`JUSTIZ = 4`) and demotion above 80.

### 1.2 Two taxes plus justice fines

| Tax | Slider (0..99 %) | Base | Yield per year |
| --- | --- | --- | --- |
| **Head tax** (Kopfsteuer) | `EIN` | population, fed | `LEUTE × WAGE × FED × EIN / 100` |
| **Building tax** (Gebäudesteuer) | `MWST` | assessed yield of mills and markets | `(MUHL × 400 + MARKT × 150) × MWST / 100` |
| **Fines** (Gerichtsgebühren) | `JUSTIZ` 1..4 | population | `LEUTE × FINE[JUSTIZ]` |

```text
WAGE = 10                      ; tunable, taler per head and year
FINE = [ -, 0, 0.5, 1, 3 ]     ; tunable, per head for Sehr fair..Gierig
FED  = clamp(KAUS / VKORN, 0.5, 1)
```

- **Fed people pay more:** `FED` is the share of the grain the people need
  that they actually got this year (`KAUS / VKORN`, atari §5). Fully fed
  citizens pay the whole head tax; a starving realm pays at least half. `FED`
  is 1 when `VKORN` is 0 (no grain step happened). It only scales the head
  tax, not buildings or fines.
- Palace and cathedral are exempt (they only serve the win condition).
  Trading houses are exempt too: they already pay tribute to the Emperor.
- Rates apply to the coming year, exactly like today: the rates set on the
  Taxes screen are in force during the next chronicle and next income.
- Income is computed **after** the chronicle, so it uses the new population.
- Mill/market profit (`MG1`, `MG2`) is no longer taxed — it is the ruler's own
  income and is added to the treasury as before. Taxes are on top.
- `ZOLL` (customs) is dropped from the Remake: the slider is hidden and the
  field stays 0.
- Defaults for a new game: `EIN = 20`, `MWST = 20`, `JUSTIZ = 2` (burden 40,
  the start of the sweet spot; see §4).

Example (1000 people, fed, 10 mills, 10 markets, `EIN = MWST = 15`,
`JUSTIZ = 2`): head tax 1500 + building tax 825 + fines 500 = 2825 taler on top
of the ≈ 4000 mill/market profit. A ruler with no buildings still earns from
people — the start is no longer income-less.

### 1.3 Unrest: scaling penalty on population

One number, **unrest** `u`, replaces the emigration cliff. It grows
quadratically with the effective burden `E`, so a little more tax is cheap and
a lot more is ruinous.

```text
JP     = [ -, -5, 0, +8, +20 ]      ; tunable, justice as burden points
E      = EIN + MWST + JP[JUSTIZ]    ; effective burden, points
u      = 0                                   if E <= 30   ; comfort zone
u      = min(2, ((E - 30) / 50)^2)           otherwise
```

| E | 30 | 40 | 50 | 60 | 70 | 80 | 90 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| u | 0 | 0.04 | 0.16 | 0.36 | 0.64 | 1.00 | 1.44 |

Effects, applied in the chronicle (replaces the `AUSW` rule of atari §7):

```text
GEB  = INT(GEB  * (1 - min(u, 1)))                 ; fewer births
EINW = INT(EINW * max(0, 1 - 2u))                  ; immigration stops at u = 0.5
AUSW = INT(LEUTE * u * (3 + RAND(5)) / 100)        ; emigration, avg 5 % * u
```

`AUSW` uses the population after this year's births and deaths. The
population is clamped at 0 in both rulesets: the yearly deaths have a flat
floor (`RAND(5)·(10−WETTER)`), and with births thinned by unrest a shrinking
realm otherwise went negative.

Reading the table: up to `E = 40` the penalty is noise; at 50 the people leave
about 0.8 % per year and births drop 16 % (≈ −1.2 %/yr net compared with a
balanced year); at 60 it is ≈ −2.6 %/yr, which only a large grain surplus
(≈ +9 %) can offset; at 80 the realm bleeds 5 % per year.

- `Sehr fair` justice buys 5 points of headroom (worth ≈ 5 extra tax points
  before unrest starts) but yields no fines; `Gierig` yields 3 taler per head
  but costs 20 points — 3 taler per head equals a head tax of 30 %, so it is
  only worth it for a short squeeze.
- The old `JUSTIZ = 4 → emigration` special case disappears; it is now just the
  steepest burden term.

### 1.4 Threshold rules (adapted)

- **Tax demotion** (atari §3, at turn start): triggers when `u > 0.64`, i.e.
  `E > 70` (the sim shows the population collapses from `E ≈ 58`, so an `E > 80`
  limit would never fire), instead of `ZOLL + MWST + EIN > 80`. Same penalty: rank −1, two
  years suspended.
- **Deposition for too little tax** (atari §11.2): unchanged formula
  `ZOLL + MWST + EIN < 20`; since `ZOLL` is 0 this is `EIN + MWST < 20`
  (the Emperor still demands a minimum).

### 1.5 Taxes screen

- Left: this year's income with the split head tax / building tax / fines and
  the nutrition share `FED`.
- Right: sliders for head tax and building tax, the justice selector, then a
  live **forecast** (`Erwartet pro Jahr`, total at the current sliders and the
  current population) and a **mood gauge** that fills up to `u = 0.64`:
  `Zufrieden` (u < 0.1) / `Das Volk murrt` (< 0.25, burden 55) / `Bürger wandern ab`
  (≤ 0.64) / `Aufruhr: Rangverlust` (> 0.64).
- The footer explains the focused option and the 30 / 70 / 20 limits.

### 1.6 Balance notes

- The simulation (§4) puts the best static burden at `E ≈ 40–50` (the hard
  computer wins in 48–50 years; 54 needs 55); `E = 58` loses 4 games in 10,
  `E ≥ 62` collapses and `E ≥ 76` empties the realm. The proposed sweet spot
  holds.
- The curve is a guard rail, not a lever: from 40 to 50 the win year does not
  move (more tax buys about +280 taler per point and year at turn 30, a
  seventh of the income, and the realm shrinks by the same amount), so the
  players' real choice is to stay under about 54. The mood gauge follows that:
  `Bürger wandern ab` starts at burden 55, not at 62, because 58 already halves
  the wins while the old label still said `Das Volk murrt`. A softer climb
  (comfort 35 or scale 60) was not needed.
- Start income rises from ≈ 100 to ≈ 1250 taler/year (500 people at 15 %) —
  the early game gets faster. If that trivializes the opening, lower `WAGE`
  to 6–8 rather than the rates.
- The start rates are 20/20 (burden 40). At 15/15 (burden 30) the computer
  wins only 46 % of games in 150 turns against 99 % at 40. Players change the
  rates each year, so this mostly matters for the first year.
- The `Hart` fine was lowered from 1.5 to 1 taler per head: at burden 40 it
  gave `Hart` an edge over `Bescheiden` mostly because it raised the effective
  burden into the optimum, not because of the fines themselves.

---

## 2. Open tax ideas

1. **Tithe (Zehnt)** — a share of the harvest paid in grain. Ties tax
   directly to famine risk: gold now, or people who eat.
2. **Upkeep for palace and cathedral** — a fixed yearly cost per part instead
   of a tax. Makes the win condition a running cost, not only a one-off
   purchase.
3. **Customs on trade** — `ZOLL` becomes a share of the taler you *earn*
   selling grain/land to other rulers. Only meaningful in multiplayer.
4. **Collection efficiency from servants** — servants (`BD`, now only useful in
   trading houses) collect taxes: yield × `(0.8 + min(0.2, BD/500))`.
5. **Mood memory** — `u` carries 50 % into next year, so a squeeze lingers.
   Needs a new saved field; the memoryless version above is simpler.
6. **Relief after disaster** — after weather ≤ 2 the burden counts as −10 for
   a year.
7. **Balance pass** — simulate a full game per strategy (low tax / sweet spot /
   squeeze) to tune `WAGE`, the building values, `FINE` and the comfort
   threshold.

---

## 3. Trading houses (replaces the staffing and profit parts of atari §3)

### 3.1 Implemented: staffing and profit

What the Atari code really does: effective houses are
`min(HH, ceil(BD/5 − HH))`. The screen asks for `5·HH + 1` servants, which
turns on only **one** house; all houses run at `10·HH − 4` servants (96 for
10 houses). The profit `200 + RAND(JAHR) + PUNKTE·5` per house is mostly noise
(`JAHR` stays around 1700, so `RAND(JAHR)` averages ≈ 850 all game, 0..1700)
plus a term that makes high scores richer.

```text
STAFF  = 8                          ; tunable, servants per house
staffed = min(HH, BD / STAFF)       ; fractional, no cliff
profit  = INT(staffed * (700 + 70 * WETTER))   ; tunable
wages   = 50 per servant            ; unchanged
```

- `WETTER` is the weather of the **last harvest rolled** (harvests come after
  the trading-house screen; in hotseat it is the previous ruler's roll).
- No random term and no dependency on `PUNKTE` or the calendar.
- The screen asks for a full crew (`8·HH` servants, red below it) and its footer
  says how many houses are staffed (`1.0 von 2`).
- The menu lists `Handelshaus kaufen` first, then `Bedienstete`. The focus starts
  on the next button like on every screen and moves to the servants after a
  purchase. The hire slider ends at the full crew; the entry is greyed while the
  crew is full (also right after hiring it) or no house exists, and the focus
  then falls back to the next button.

Net per year at full staffing (Atari assumes 40 points and average noise):

| Houses | Atari net (servants) | Remake net (servants) |
| --- | --- | --- |
| 1 | 950 (6) | 685 (8) |
| 5 | 3950 (46) | 3425 (40) |
| 10 | 7700 (96) | 6850 (80) |

Remake pays 10–25 % less on average, without the cliff or the ±500 swing per
house.

### 3.2 Implemented: tribute and verdict

Findings on the Atari rules: paying no tribute costs −1 point and about a 5 %
chance per turn to lose a house at 1500 demanded (`1/6 × P(RAND(5000) < ZAHL)`),
and paying is a coin flip for `INT(ABG/2000)` points, so the outcome is mostly
noise: in the simulation (§4) no tribute policy is clearly best under Atari
rules. The 14 % wealth surcharge in `ZAHL` also fights the 2 % interest.

**Tribute follows trade.** No random term, no wealth surcharge; the 500
minimum and the cap at the ruler's wealth stay.

```text
ZAHL = 0.25 * profit + 1.2*LEUTE + 10*MARKT + 15*MUHL + 80*BURG
       + 110*DOM + 150*TITEL
```

**Visible verdict ladder** (replaces the coin flip `ABG − 1000 + RAND(2000)
> ZAHL`, the `INT(ABG/2000)` points, the invisible 1/6 expropriation roll and
the grain-hoarding test). With `r = ABG / ZAHL`:

| `r` | Verdict | Result |
| --- | --- | --- |
| ≥ 1 | pleased | +1 point |
| 0.5–1 | tolerates it | 0 points |
| 0.2–0.5 | displeased | −1 point |
| < 0.2 | insulted | −3 points and the Emperor takes a house, certain |

- The tribute slider has guide lines at 0.2, 0.5 and 1 of the demand and shows
  the verdict live (`Der Kaiser ist verstimmt (-1)`). It ends at the demand:
  paying more earns nothing. (An earlier ladder gave `+floor(r)` points up to
  +3, about 3000 taler per extra point; that bonus is gone. The computers pay at
  most half the demand, so the simulation is unaffected.)
- One full tribute buys about 1 point at about 3000 taler, the price of
  buildings (2000–4300 per point). Example: 5 houses, 1000 people, 10 mills,
  10 markets, Landgraf gives `ZAHL ≈ 3060`; avoiding displeasure costs 1530.
- A ruler without houses has nothing to seize: an insult only costs points.
- The seized house goes back to the Emperor's pool (as in Atari).

### 3.3 Implemented: lease

The next house costs `5000 + 1000·HH` (Atari: a flat 5000), one per turn, and
needs the full price in the treasury and a house left in the Emperor's pool.
The rule lives in the model (`canLeaseHouse`, `leaseHouse`, `leasePrice`); the
screen shows the price in the menu entry and the footer. The source tests
`GELD > 2500` against the 5000 price (KAISERB:1590); the screen always greyed
the button below the price, so the full price is the rule in both rulesets.
A lease still gives +1.3 points.

### 3.4 Open proposals

1. **T6 Pool (optional).** The Emperor's pool becomes
   `5·count + 5 + RAND(5)` instead of 10–19 for any player count; houses
   burned by sabotage return to the pool.

---

### 3.5 Implemented: player trading

Findings on the Atari rules (`trade.ts`): a sale to a ruler was capped only by
the seller's stock. The partner is absent (hotseat) and his price counts both
ways, so a rival could dump any amount on him at his own price, push his
treasury under the pawn line and halve his points. The Emperor bought and sold
at one price without limit, so he beat every ruler as a partner, and the
`+1` point for a purchase over 50000 grain could be farmed by two rulers
passing the same grain back and forth.

1. **Buyers pay what they can.** A ruler sells to a ruler partner no more than
   `max(0, GELD) × unit / price` (unit 500 for grain, 1000 for land) at the
   partner's price. The sliders on `Grain` and `Land` end there. The Emperor is
   still unlimited, and so is Atari.
2. **Trade notice.** A ruler who traded with a human partner leaves a
   `TradeNote` (`PlayerState.notices`, saved with the game). It is shown as
   the first thing of the partner's next turn (`Handel in Ihrer Abwesenheit`, at
   most 10 lines) and then dropped. Trades with the Emperor and with computers
   leave none.
3. **Emperor spread (replaced by §3.7 item 3).** He first sold at his price and
   bought at 90 % of it, and `Grain` and `Land` showed `buy / sell`. Now every
   partner quotes one price and the size of the deal moves it.
4. **Computers keep a reserve** (§5.2).
5. **No point for a big grain purchase.** The `+1` for buying more than 50000
   grain (atari §5.2) is dropped.

### 3.6 Implemented: a market worth offering to

Findings (§3.5 left the offer screen with nothing to win): computers only bought
from the Emperor, so nobody bought a human's offer in a game with computers; a
ruler posts one price for both directions and buyers take the cheaper of him and
the Emperor; the Emperor's price only tracked the rulers' average (±20 % noise)
and never reacted to his stock; the band was 75..125 (grain) and 1500..2500
(land), so the best case was +25 % on surplus the ruler could otherwise dump on
the Emperor at 90 %; and a ruler's own posted price fed the Emperor's average,
so posting the maximum lifted the price the Emperor paid him.

1. **Computers buy from the cheapest partner** (`buyCheapest` in `trade.ts`).
   For grain, acre land and building land a computer asks the Emperor and every
   other ruler with something on offer, sorts by price (ties go to the lower
   seat) and buys from the cheapest first until the want or the cash is used up.
   A human seller gets the usual trade notice (§3.5) and keeps the offer
   screen's amount as his cap. Since §3.7 a computer deals with one partner per
   good. Under Atari rules the computers still trade with the Emperor only.
2. **Emperor scarcity pricing.** The Emperor's stock is rolled per ruler's turn
   (`refreshEmperorStock`, now called *before* `updateEmperorPrices`), and the
   average of the rulers' prices is scaled by his stock:

   ```text
   factor = clamp(1 + 0.4 * (normal - stock) / normal, 0.85, 1.35)
   normal = 28000 grain (5000 per weather point × 5.5 + 500), 9000 ha acre
            land, 9000 ha building land
   ```

   | Weather of the last harvest | 1 | 3 | 5 | 7 | 9 |
   | --- | --- | --- | --- | --- | --- |
   | Emperor grain stock | 5500 | 15500 | 25500 | 35500 | 45500 |
   | Price factor | 1.32 | 1.18 | 1.04 | 0.89 | 0.85 |

   Land stock is `2000 × RAND(10)`, factor 1.35 (0 ha) down to 0.85 (14000 ha
   and up) in steps of 2000 ha. He buys at the same price he sells at (§3.7), so
   a ruler who sells grain in a bad year gets up to 1.32 times the normal price,
   one who sells in a glut 0.85. Buying in a glut and selling in a shortage is
   the intended speculation; it needs cash and a year of storage (the granary
   rots 1–50 % at every harvest, about 25 % on average), and the simulation does
   not cover it (the computers never speculate). Atari keeps factor 1.
3. **A ruler cannot move the price he trades at.** In the Remake with two or
   more rulers, the Emperor's average leaves out the ruler whose turn it is
   (`updateEmperorPrices(state, trader)`). The others' posted prices still count,
   so a rival can nudge the Emperor against you (weight `1 / (rulers - 1)`).
4. **Wider price band.** The offer screen allows 50..200 for grain (steps of
   5) and 1000..4000 for land (per 1000 ha, shown per 500: 500..2000) instead
   of 75..125 and 1500..2500; Atari keeps the old band. The price is still one
   number for both directions.
5. **An offer can be zero.** No 10 % minimum any more; the amount starts at
   10 % of the holdings as before.
6. **Land keeps buildings and the realm** (`spareLand`, `maxBuy`, `maxSale`).
   Under Atari rules a sale can raze markets and mills (`landShortage`: 600 ha
   of building land per market, 1000 per mill) or depose the seller (land plus
   acre under 10 ha per head), and once computers buy from rulers a bought-up
   offer would do it behind his back. In the Remake a ruler can part with
   `min(holding − kept, land + acker − 10 × LEUTE)` hectares, where `kept` is
   `max(600 × markets, 1000 × mills)` for building land and 0 for acre land.
   The offer slider, the sale slider on `Land` and the purchase slider on
   `Land` (`maxBuy`) end there, and `tradeLand` re-checks it on every deal, so
   two offers cannot add up past the limit. Grain and the Emperor are not
   limited. Atari is unchanged.

Effect in the simulation (300 games, seed 1, computers only): with §3.6 alone
a duel was won by Barbarossa 91 %, Konrad 9 %, Otto 0 %. Without item 6 it had
flattened to 72 / 27 / 1 %: computers bought each other's offered land and razed
buildings. The current numbers, with §3.7, are there.

Not done: separate ask and bid prices per ruler (§3.4 idea).

### 3.7 Implemented: scarce grain, farms, big deals

Findings (§3.6 gave the offers a buyer but not a reason): a ruler with 1000
people needs about 25500 grain a year and his 10000 ha of acre land yield about
6900, so every ruler bought about three quarters of his grain from the Emperor,
whose stock (`8000 × weather`, re-rolled for every ruler's turn) covered any
gap. Nobody had a surplus and nobody was short. Farming paid 5.5 % a year (1000
ha for 2000 taler gave about 110 taler of grain), worse than buying grain, so no
farmer could exist. Rot and the surplus bonus are not the cause: rot only hits
stock still unsold at the owner's own harvest, and the growth bonus creates the
demand.

1. **Less Emperor grain.** Remake stock is `MARKET.emperorGrain × WETTER +
   RAND(1000)` with `emperorGrain = 5000` (Atari: 8000). A bad-weather turn
   leaves him with 5500 grain for a realm that still misses about 13000 after the
   farm change below, so the rest must come from rulers.
2. **Better farms.** The acre term of the harvest is multiplied by
   `FARMING.acreYield = 2` in the Remake:
   `KORN = BACKER×1.9 + ACKER/10 × WETTER × 2 + ZPSK`. 1000 ha of acre land now
   pay about 220 taler of grain a year (11 %), so a ruler who buys acre land can
   feed himself and sell the rest. The tilled-land term is unchanged.
3. **One price, moved by the size of the deal** (`buyCost`, `sellProceeds`,
   `maxAfford`). Every partner, the Emperor and the rulers, quotes one price for
   buying and selling; the Emperor's 90 % bid of §3.5 is gone. A deal of `q`
   units moves the unit price linearly through the deal and pays the average,
   with `x = impact × q / (2 × scale)`: a buyer pays the quote times `1 + x`, a
   seller gets the quote divided by `1 + x`. `impact = 0.5`, `scale` 20000
   grain, 5000 ha acre land, 5000 ha building land. Buying 20000 grain costs 25 %
   more than the quote (the last unit 50 %), selling it pays 20 % less; 500
   grain moves it 0.6 %. It applies to computers too. The sliders on `Grain`
   and `Land` show the price per 500 at the top left of each slider (`dealPrice`:
   the quote at 0, then the average price of the deal) and the real cost or
   proceeds on the right, both live. Atari has no impact. A
   sale to a ruler is still capped by his treasury at the quote, which is a
   little more than he pays, so it stays safe.
   **Display unit.** Land prices are stored per 1000 ha but shown per 500 ha
   (`shownPrice`), on `Land`, `TradePartner` and `TradeData`, in both
   rulesets, so grain and land use the same unit of 500.
4. **One deal per good and turn.** A ruler trades grain, acre land and building
   land each with at most one partner, one direction, one amount per turn, or
   splitting a deal would dodge item 3. The screens already work that way (one
   partner per turn, one signed slider per good, applied once on `Weiter`); a
   computer picks one partner per good: among those who can fill his whole want
   the lowest average price, else the one who fills most.

Simulation (`node scripts/sim.mjs --n=300 --seed=1`, computers only; the old
Remake ruleset in brackets, from §3.6 item 6):

| Computer | Solo wins | Median year | Duel wins |
| --- | --- | --- | --- |
| Otto (easy) | 19 % (27) | 92 (112) | 0 % (0) |
| Konrad (medium) | 86 % (91) | 68 (66) | 8 % (9) |
| Barbarossa (hard) | 100 % (100) | 49 (53) | 92 % (91) |

The ladder holds. The starting point was `emperorGrain = 3000`, which starved
the computers (they buy from the Emperor by cash and never farm more): Otto 2 %,
Konrad 42 % solo. A sweep of Emperor stock 4000–6000 against yield 1.5–2.5
showed the yield speeding the game (Barbarossa wins in 39 years at 2.5 against
55 at 1.5) and the Emperor stock setting how hard the computers starve; 5000
with 2 keeps Otto and Konrad near the old rates. The price impact barely moves
the computers (`impact` 0.25 / 0.5 / 1: Otto 23 / 22 / 19 %), so it is mostly a
human's cost. Tune with `--tune=market.emperorGrain=4000,market.impact=1,
farming.acreYield=2.5`. Not measured: what humans do with it. The computers
never farm more, never speculate and never sell more than a leftover stock, so
whether rival trading gets interesting for humans needs a hotseat game.

The computers farm and wander since §5.3; those numbers are in §4. Open: a
stock of Emperor grain shared by all rulers of a year (his stock is still
re-rolled per turn, so nobody competes for it).

## 4. Simulation

`node scripts/sim.mjs [--n=200] [--turns=150] [--seed=1] [--snap=30]
[--only=solo,duel] [--rules=remake,atari] [--set=hard.burden=50]
[--tune=market.impact=1] [--trace=hard]`
plays whole games of the computer players (§5) through the model, in the order
of the scenes, and prints win rate, median year of the win and the average
state at a snapshot turn. `solo` puts one computer alone in a game, `duel` puts
Otto, Konrad and Barbarossa in one game with shuffled seats. `--set` overrides
profile fields (`hard.burden=50,easy.idle=0.4`) to test parameters without
editing `ai.ts`, `--tune` the market and farming tunables of §3.7;
`--trace=hard` prints one solo game turn by turn.

The computers are naive next to a human (§5.3), so read the numbers as
**relative** comparisons. 300 games, seed 1 (seed 2 agrees within 2 points),
at most 150 turns, state at turn 30:

| Computer | Rules | Wins | Median year | Pop | Rank |
| --- | --- | --- | --- | --- | --- |
| Otto (easy) | Remake | 33 % | 113 | 610 | 2.6 |
| Konrad (medium) | Remake | 93 % | 68 | 637 | 3.9 |
| Barbarossa (hard) | Remake | 100 % | 48 | 1122 | 7.0 |
| Otto (easy) | Atari | 28 % | 104 | 590 | 2.3 |
| Konrad (medium) | Atari | 88 % | 65 | 655 | 3.2 |
| Barbarossa (hard) | Atari | 64 % | 33 | 377 | 6.1 |

In a duel Barbarossa wins all Remake games (Konrad and Otto 0 %) and
64 % of the Atari games (Konrad 25 %, Otto 2 %, nobody 9 %). The Atari
Barbarossa lost 9 points to the wander (§5.3): his 67 rate points already sit
past the emigration cliff, and the burden now wanders around them. The sweeps
below were rerun after §3.6, §3.7 and §5.3 (Remake, current ruleset).

Turn order: the sim prints the wins per seat. Three identical computers (all
set to Barbarossa's profile, 600 duels) win 35 / 36 / 30 % (Remake) and
33 / 33 / 27 % (Atari) from the first, second and third seat: the first seat
has no edge, the third one may lose about 4 points (the standard error is
2). Rulers play in a fixed order.

Sweeps of the hard computer (Remake, solo):

| Setting | Wins | Median year |
| --- | --- | --- |
| burden 20 / 30 / 40 | 94 % / 100 % / 100 % | 91 / 59 / 50 |
| burden 46 (default) / 50 / 54 | 100 % / 100 % / 100 % | 48 / 50 / 55 |
| burden 58 / 62 / 66 | 61 % / 0 % / 0 % | 69 / – / – (pop 518 / 333 / 176) |
| burden 76 | 0 % | – (the realm is empty) |
| tribute 0 / ½ / full | 100 % / 100 % / 100 % | 51 / 48 / 52 |
| no trading houses | 100 % | 49 |
| grain surplus per head 1.75 / 2.5 / 3.5 / 4.5 | 19 % / 100 % / 100 % / 100 % | 109 / 55 / 48 / 48 |
| farm 0 / ½ / 1 / 2 | 100 % | 56 / 53 / 48 / 49 |

Findings:

1. **The unrest curve does its job.** The best static burden is 40–50 and the
   cliff sits between 54 and 62; 76 empties the realm. The rates barely change
   the win year inside that band (see §1.6).
2. **Feeding a surplus is the sharpest lever.** Growth peaks at about 3.5
   grain per head above the need (births rise with `(KAUS − VKORN)/150` while
   deaths fall until `LEUTE/42.55 = surplus/150`). At 1.75 the hard computer
   wins 19 % of games, at 2.5 it wins all; feeding exactly the need stagnates
   the population at about 300.
3. **Atari taxes are free money.** The hard computer's 67 rate points (past
   the emigration cliff at 60) win in 34 years, medium's 52 in 65: raising the
   Atari rates only costs the 4.5 % emigration. The best Remake games need
   about 48 years: the Remake is slower on purpose, not easier.
4. **Trading houses barely help the best play.** The hard computer wins in 48
   years with houses and half tribute and in 49 without them; tribute 0 loses
   houses (51 years). Paying exactly half is best; the `+1` point for a
   full tribute costs more than it earns. Under Atari rules the tribute is a
   coin flip and none of the policies is clearly best, so the computers pay
   nothing there.
5. **A population bug surfaced:** `LEUTE` could go negative. Fixed (§1.3).
6. **Justice at equal burden is nearly neutral.** An earlier sweep that kept
   `EIN + MWST` fixed suggested `Hart` dominates; that was confounded by the
   higher effective burden. Estimated per head, at equal burden `Gierig` with
   lower rates gains about 0.5 taler and `Hart` loses about 0.3. Rerun on the
   current ruleset (`--set=hard.justice=J,hard.burden=B` at `E = 46`): 53 years
   48–49 years for every justice level.
7. **Farming pays a strong computer.** Since §3.7 grows acre land, `farm` is
   the lever with the biggest steps: Barbarossa wins in 56 / 53 / 48 years at
   0 / ½ / 1 and gains nothing above 1. Otto swings from 15 % (0) to 36 %
   (½), 90 % (1) and 99 % (1.5) because his 100 000 idle taler have nothing
   else to buy, Konrad from 90 % to 98 % (1). So only Barbarossa's `farm`
   moved to 1; the two others keep ½ to hold the ladder.

Open tuning suggestions (not applied): a softer climb between burden 54 and 62
(comfort zone 35 or scale 60; the gauge label moved instead, §1.6); and a
smarter computer that adapts its taxes to
the mood gauge and trades grain, before trusting the absolute numbers.

---

## 5. Computer players

### 5.1 Setup

The new-game dialog asks for the human rulers first, then for computer
opponents: one toggle per fixed opponent, limited to the seats the humans leave
free (at most 6 rulers in all). They sit after the humans with a fixed name and
kingdom, get the next free coat of arms, and are marked by
`PlayerState.ai` (`"easy" | "medium" | "hard"`; absent for humans, so old saves
load unchanged).

| Difficulty | Name | Kingdom |
| --- | --- | --- |
| easy | Otto | Ostmark |
| medium | Konrad | Franken |
| hard | Barbarossa | Staufen |

A human cannot take one of these names in the same game.

### 5.2 A computer's turn

When a computer ruler's turn starts, `TradingHouse` plays the whole turn
through `playComputerTurn` (`model/ai.ts`, the same function the simulation
runs) and shows a report: population, money and rank, buildings built, a
leased house and events (demotion, expropriation, pawn, deposition, death).
Then the game continues as after a human turn (promotion screen, new-year
ranking, next ruler; a coronation if the computer wins). The order is the one
of the scenes: demotion check, trading houses and tribute (Landgraf and up),
Emperor stock and prices, harvest and grain, land, chronicle, taxes,
buildings, acre land for farming (Remake), end-of-turn events.

The computers buy from one partner per good, the Emperor or a ruler with an
offer (§3.6, §3.7; Atari: the Emperor only). Humans can buy from and sell to
them. After each turn a computer offers a tenth of its land (atari §8) and only
the grain above what a normal feeding leaves in his granary: he hands out
`give` from a stock of `give / 0.8`, so he keeps `give / 4` with
`give = VKORN + surplus × LEUTE`. The grain price follows the granary
(`openTrade` in `ai.ts`):

```text
price = clamp(125 - 25 * LKORN / keep, 75, 125)   ; 125 empty, 100 normal, 75 at twice
offer = max(0, LKORN - keep)
```

So a computer buys grain from a human at up to 125 when he is short, and sells
cheaply once he holds a surplus. A computer runs hand to mouth, so at the normal
stock he offers no grain. Under Atari rules he still offers all grain at his
fixed price. A human's sale to a computer is limited by the computer's cash
(§3.5). They neither sabotage nor defend (no guards).

### 5.3 Parameters

Found with the simulation (§4). The same profile plays both rulesets; under
Atari rules the Remake burden is multiplied by 1.45 and split 5/8 customs, 2/8
VAT, 1/8 income tax (Barbarossa: 67 points), and nobody pays tribute.

| Parameter | Otto | Konrad | Barbarossa | Meaning |
| --- | --- | --- | --- | --- |
| `burden` | 30 | 34 | 46 | target `EIN + MWST`; justice is 2 for all |
| `surplus` | 1.6 | 1.75 | 3.5 | grain per head above the need |
| `reserveBase` + `reservePerHead` | 500 + 2 | 1000 + 4 | 1000 + 5 | cash kept for grain |
| `tribute` | 0.25 | 0.5 | 0.5 | share of the demand paid (Remake) |
| `houses` | no | yes | yes | leases and staffs trading houses |
| `prestigeFrom` | rank 3 | rank 4 | rank 2 | prepares land for palace and cathedral |
| `idle` | 25 % | 15 % | 0 % | chance per year to buy no land or buildings |
| `farm` | 0.5 | 0.5 | 1 | share of the grain handed out that he wants to grow (Remake) |

What the ladder means: Barbarossa feeds the growth-optimal surplus, taxes at
the optimum burden, pays the tolerated tribute and starts on palace and
cathedral early. He also grows all the grain he hands out (`farm` 1, the others half).
Konrad feeds and taxes a little less and starts on prestige late, so he wins
about 20 years later. Otto starves in bad years (small cash
reserve), taxes less, runs no houses and idles a quarter of the years: he wins
about one game in four, very late.

Common behavior: buys grain up to the stock that lets him hand out
`need + surplus × LEUTE`; keeps 11 ha of land per head; builds mills and
markets up to what the fed people support (`KAUS/1000`, `KAUS/333`), then
palace and cathedral.

**Wander.** Each turn the profile is nudged at random (`moodOf` in `ai.ts`,
drawn from the turn's RNG, so the simulation stays reproducible): the burden
by ±2 rate points, the grain surplus by ±15 %, the cash reserve by ±20 % and
the tribute share by up to +20 % (never below the profile's share, so a
tolerated tribute stays tolerated). `idle` already skipped whole years. The
rates therefore move a little every year around the profile's burden.

**Farming (Remake).** At the end of the turn, with the cash above the reserve,
a computer buys acre land until his acre land grows the `farm` share of the
grain he hands out (`farm × give / (0.55 × acreYield)` ha; 0.55 is one tenth of
the average weather 5.5). He buys at most 5000 ha a turn (the price rises with
big deals, §3.7) and only from a partner whose price pays back within 10 years:
at most `1000 × 0.55 × acreYield × grainprice/500 × 10` per 1000 ha, 2200 at
grain price 100. In an expensive turn (the Emperor short of land, §3.6) he
waits. His farms make a leftover harvest that `openTrade` offers to the humans.
The buying itself is the same `buyCheapest` deal as elsewhere. Atari rules: no
farming. In the first decades only Barbarossa buys: the 10000 starting hectares
already grow half of what a realm of 600 people (Otto, Konrad) hands out.

### 5.4 Open ideas

1. **Adaptive taxes.** Raise the burden while the mood gauge is calm, lower it
   when unrest passes about 0.2.
2. **Spend idle cash.** Otto still ends games with 100k taler unspent on 2 %
   interest: farming (§5.3) and trading with rulers (§3.6) do not use it.
3. **Sabotage and defense.** Hire guards, sometimes send saboteurs.
4. **Names and count.** More opponents than three, or the same opponent twice.
5. **Skip the report.** A setting to run consecutive computer turns without
   the report modal, or one combined report per year.

---

## 6. Palace and cathedral prices

Every further palace or cathedral part costs 5 % of its base price more than
the one before (`PRESTIGE_COST_STEP`, `buildingCost` in `constants.ts`):

```text
price = round(BASE × (1 + 0.05 × parts already owned))
palace     5000 .. 8500   (15 parts, 101 250 total instead of 75 000)
cathedral  9000 .. 17550  (20 parts, 265 500 total instead of 180 000)
```

Markets and mills keep their price, the Atari ruleset keeps the flat prices.
The Business screen and the computers (`canBuild`, `addBuilding` in `ai.ts`)
use the same function. The balance sim did not move: solo median win year 52 /
67 / 115 (Barbarossa / Konrad / Otto) against 46 / 68 / 113 before, win rates
100 / 93 / 33 %.

Completing all 15 palace parts or all 20 cathedral parts shows a full-screen
picture (`scenes/Monument.ts`: medieval palace, gothic cathedral) with the
headline "Palace completed" / "Cathedral completed" and its own hymn
(`palace`: courtly march in F major; `cathedral`: slow chorale in D minor), then returns to Business. Computers build silently.
