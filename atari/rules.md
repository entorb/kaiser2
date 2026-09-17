# Kaiser 2 — Game Rules (extracted from `atari/src/*.TUR`)

Reverse-engineered reference for the web port. Every rule is taken from the
Atari Turbo-BASIC source; `FILE:line` points at the defining statement. Where the
source has an obvious bug the *intended* rule is marked **[BUG]** and the port
decision is noted (see also `rewrite.md` → "Known issues").

Notation: Turbo-BASIC `%n` = integer literal `n`. `RAND(n)` = integer in
`[0, n)`. `INT(x)` = floor (round toward −∞, as in Atari BASIC). Array variables
are 1-based
(`X(1)..X(6)`); index `0` is the Emperor/Kaiser slot. ATASCII escapes:
`\`=ä, `]`=ö, `^`=ü, `{`=ß.

---

## 1. Game data model

The COMMON block (`KAISERB:110-130`, repeated in every later program) defines
one record per ruler (indices 1..6) plus the Emperor at index 0.

| Var | Meaning |
| --- | --- |
| `ACKER` | acre land (ha) |
| `LEUTE` | population |
| `KRIEG` | wars — **read-only, never modified in the source** (`KAISER3:10140`, `KAISER6:1440`); always 0 |
| `LKORN` | grain stock |
| `LAND` | building land (ha) |
| `KPREIS` | grain price (per 500 units) |
| `MUHL` | mills |
| `MARKT` | markets |
| `GELD` | money (taler) |
| `LPREIS` | building-land price (per 10 ha) |
| `APREIS` | acre-land price (per 10 ha) |
| `VERALAND` | acre land offered on the market |
| `VERBLAND` | building land offered on the market |
| `VERKORN` | grain offered on the market |
| `PUNKTE` | score |
| `JUSTIZ` | justice 1..4 |
| `ENTHOB` | years suspended/deposed |
| `HH` | trading houses |
| `BD` | servants (Bedienstete) |
| `MWST` / `EIN` / `ZOLL` | VAT % / income tax % / customs % |
| `DOM` | cathedral parts (0..20) |
| `BURG` | castle/palace parts (0..15) |
| `INFANT` | guards (Wachen) |
| `ARTELL` | saboteurs (Saboteure) |
| `KAVALL` | guard training level |
| `MANOV` | saboteur training level |
| `TOD` | years left to live (death when ≤ 0) |
| `TITEL` | rank 0..8 |

Turn/global scratch: `SP` (current ruler, 1-based), `JAHR` (year),
`WETTER` (1..10), `MG1`/`MG2` (mill/market profit), `HAN` (current trading
partner), `KAUS` (grain given to people), `VKORN` (grain people need),
`KLAGER` (`VKORN*100/80`), `ZAHL`/`ABG` (tribute demanded/paid),
`GEW` (trading-house profit), `NEU`/`ALT` (servants hired/fired),
`FAUL` (grain rot %), `ANZAHL` (number of human rulers).

### 1.1 Provinces and ranks

`LAND$` (`KAISER3:180`): Anloor, Kachjian, Andorin, Garenhell, Semedal, Galador
(index 0 = player 1).

`TITEL$` (`KAISERB:150`), 10-char fields:
`Verwalter · Baron · Landgraf · Markgraf · Herzog · Fürst · Kurfürst · König`.
Index 8 (`Kaiser`) is the win rank; the promotion screen relabels index 0 as
`Herrscher` (`KAISER4:4000`).

### 1.2 Player count

Name entry allows **1..6** rulers (`KAISER2:690` `UNTIL FN$="" ... OR G=6`,
arrays sized `(6)`). The count is stored in `NAME$(1,1)` (`KAISER2:710`) and read
back as `ANZAHL` (`KAISER3:160`). The manual says 1–4; the source is the
superset.

### 1.3 Starting values (`KAISER3:111-119`)

Per ruler `U=1..6`:

| Var | Value | Var | Value |
| --- | --- | --- | --- |
| `ACKER` | 10000 | `GELD` | 10000 |
| `LEUTE` | 500 | `LPREIS` | 20 |
| `LKORN` | 15000 | `APREIS` | 20 |
| `LAND` | 5000 | `PUNKTE` | 0 |
| `JUSTIZ` | 2 | `MWST` | 10 |
| `KPREIS` | 100 | `EIN` | 5 |
| `ZOLL` | 25 | `INFANT` | 1 |
| `TOD` | `RAND(10)+35` | `VERKORN` | 10000 |
| `VERALAND` | 2500 | `VERBLAND` | 2500 |

Globals: `JAHR=1700`, `WETTER=5`, Emperor `HH(0)=RAND(20)+30`. All other
per-ruler values (`HH`, `BD`, `MUHL`, `MARKT`, `DOM`, `BURG`, `KRIEG`, `KAVALL`,
`MANOV`, `ARTELL`, `ENTHOB`) start at 0. The Emperor also has his `HH` reset to
`RAND(10)+10` the first time a ruler reaches the trading house in 1700
(`KAISERB:1141`).

### 1.4 New game / naming (`KAISER2`)

For each ruler in turn: enter a name 2–10 characters (`KAISER2:650`, longer is
rejected), choose joystick port 1/2 (`STICK`), pick one of 8 portraits
(`BILD`), each portrait usable once (`K(BILD)`). Empty name ends entry. Names are
written to `NAMEN.DAT` (160 bytes names + 6 bytes joystick ports).

---

## 2. Turn sequence

One ruler's turn (`KAISERB → KAISER3 → KAISER4`, optionally `KAISER5`):

1. **`KAISERB`** — load state; `NAMEN` banner; tax-demotion check; if
   `TITEL>1` trading-house screen + expropriation check.
2. **`KAISER3`** — choose trading partner; harvest (`KORN`); grain distribution
   (`KORNAUS`); land trade (`LAND`); chronicle (`CHRONIK`).
3. **`KAISER4`** — state income/taxes (`EINNAHM`); trade data (`HA`, multiplayer
   only); land-shortage check; status map (`KARTE`); purchases (`GESCHAFT`);
   end-of-turn events.
4. **`KAISER5`** — secret service/sabotage, entered from `GESCHAFT` (once/turn).
5. Next ruler: `SP=SP+1`; when `SP>ANZAHL`, `SP=1` and `JAHR=JAHR+1`
   (`KAISERB:2310`).

Start of each ruler's turn (`KAISERB PROC NAMEN`, `2310-2500`):

- Wrap the year as above.
- If `ENTHOB(SP)=1` and more than one ruler, clear it and skip to the next
  ruler (`2370`). **[BUG]** only `=1` is skipped, so a 2-year suspension
  (`ENTHOB2`) never actually skips; the port consumes the counter one turn at a
  time.
- `TOD(SP)=TOD(SP)-1` and `PUNKTE(SP)=PUNKTE(SP)+1` (`2380`): every ruler ages
  one year and scores one point per turn.

End of turn (`KAISER4 #GESCHAFT`, `W=14`, `3080-3130`):

1. If `GELD < -10000 - TITEL*2000` → **Pawn** (§11.1).
2. If `LAND+ACKER < LEUTE*10` and `LAND>0` → **depose** (§11.2).
3. If `ZOLL+MWST+EIN < 20` → **depose** (§11.2).
4. If `TOD<=0` → **death** (§11.3).
5. Interest (§11.4).
6. Promotion check (§10).
7. `SP=SP+1`, save, next ruler.

---

## 3. Trading houses (`KAISERB PROC HANDEL`, `1140-1950`)

Only runs for `TITEL>1` (**Landgraf** or higher, `KAISERB:620`). Manual §4 says
the gate should be Markgraf; the source value wins.

Each turn, before the screen:

- Emperor's houses: if `JAHR=1700`, `HH(0)=RAND(10)+10`.

**Profit** (`GEW`), `1150-1210`:

```text
AH  = -INT(HH - BD/5)                 ; effective houses (overstaffing gives +)
if AH > HH: AH = HH
GEW = INT(AH * (200 + RAND(JAHR) + PUNKTE*5) * (AH>0))   if HH>0 else 0
GELD = GELD - BD*50                    ; servant wages
GELD = GELD + GEW
```

So a house only turns a profit when it has **more than 5 servants per house**
(manual: ~6–14). Wages are 50 taler/servant.

**Tribute demanded** (`ZAHL`), `1150-1230`:

```text
ZAHL = INT(HH*50 + LEUTE*1.2 + MARKT*10 + MUHL*15 + BURG*80 + DOM*110
           + RAND(100) + TITEL*150)
ZAHL = ZAHL + INT(GELD*14/100)         ; wealth surcharge
if ZAHL > GELD: ZAHL = INT(ZAHL - (ZAHL-GELD)*1.123)   ; capped to fortune
if ZAHL < 0:   ZAHL = 1                ; symbolic taler (manual §4)
```

**Actions**:

- **Lease a house** (`1590`): one per turn. Requires `GELD>2500` and `HH(0)>0`;
  costs 5000, `HH+1`, `HH(0)-1`, `PUNKTE+1.3`. **[BUG]** the 2500 test is below
  the 5000 cost, so it can push into debt.
- **Hire/fire servants** (`1850`): `NEU`/`ALT` at 50 each;
  `BD = BD + NEU - ALT`.
- **Pay tribute** (`ABG`, `1790`): free amount, allowed while `GELD-ABG > -10000`.

**Tribute verdict** (`1900`):

```text
if ABG - 1000 + RAND(2000) > ZAHL: PUNKTE += INT(ABG/2000)
else:                              PUNKTE -= 1
```

**Expropriation** (`PROC ENT`, `2530-2680`), after the screen, Landgraf+ only:
1/6 chance (`IF RAND(6)<5 THEN skip`). Then, if `HH>0` **and** the ruler either
hoarded grain or underpaid tribute:

```text
hoarded   = VERKORN + RAND(5000) < LKORN
underpaid = ABG + RAND(5000) < ZAHL
if hoarded or underpaid: HH(SP)-1 ; HH(0)+1
```

**Tax demotion** (`PROC ENTHOB2`, `2710-2900`), at turn start:
if `MWST+EIN+ZOLL > 80`: `ENTHOB=2` (two years), `PUNKTE -= TITEL*5`,
`TITEL -= 1` (floor 0), `PUNKTE` floor 0.

---

## 4. Trading partner (`KAISER3 PROC HANDEL`, `20900-21280`)

The Emperor's prices are the **average** of all rulers' prices, with noise:

```text
KPREIS(0) = INT(sum(KPREIS(1..ANZAHL))/ANZAHL)
            + RAND(KPREIS(0)/5) - RAND(KPREIS(0)/5)
if KPREIS(0) < 80: KPREIS(0) = 80 + RAND(10)
APREIS(0) likewise, floor 16 + RAND(10)
LPREIS(0) likewise, floor 16 + RAND(10)
```

(The `RAND` argument uses the running sum, a source quirk.)

Player picks partner `HAN` from the Emperor (`W=0`) and the other rulers;
the current ruler cannot be picked (`KAISER3:21190`).

Emperor's per-turn offers (`21240-21270`):

```text
VERKORN(0)  = 8000*WETTER + RAND(1000) ;  LKORN(0)  = VERKORN(0)
ACKER(0)    = 2000*RAND(10)            ;  VERALAND(0) = ACKER(0)
LAND(0)     = 2000*RAND(10)            ;  VERBLAND(0) = LAND(0)
```

Other rulers offer their own `VERKORN`/`VERALAND`/`VERBLAND` (set in trade data,
§8).

---

## 5. Grain

### 5.1 Harvest (`KAISER3 #KORN`, `10010-10180`)

```text
BACKER = min(ACKER, LEUTE/5)           ; arable land actually worked
FAUL   = RAND(50) + 1                  ; % reported as rotted
ZPSK   = RAND(2000) + 1
WETTER = RAND(10) + 1                  ; 1..10
KORN   = BACKER*1.9 + (ACKER/10)*WETTER + ZPSK
KORN   = ABS(KORN - KRIEG*1000)        ; war penalty (KRIEG always 0)
LKORN  = LKORN*FAUL/100 + KORN         ; **[BUG]** see below
VKORN  = LEUTE*22 + RAND(100) + 1      ; grain the people need
KLAGER = VKORN*100/80                  ; needed stock incl. 20% reserve
```

**[BUG]** the source *keeps* `FAUL`% of the stock, but `FAUL` is described
(on-screen and manual §6) as the **rotted** share. The port keeps
`(100-FAUL)%` (`rules.harvest`).

Weather text has 10 levels (`KAISER3:20680-20760`), from "Ein Orkan
vernichtete die Ernte" to "Rekordsommer – sensationelle Ernte".

The granary picture is filled by `LKORN/KLAGER` (`KORNSPEICH`, `20540`); only a
full granary (`LKORN ≥ 1.25*VKORN`, i.e. 20% reserve) covers the people.

### 5.2 Grain trade (`KAISER3 #KORN`, `10410-10590`)

Price scale is **`KPREIS/500`** per unit.

- **Buy** from `HAN`: amount capped at `VERKORN(HAN)` ("Vorräte erschöpft").
  `LKORN(SP)+=amt`, `LKORN(HAN)-=amt`, `VERKORN(HAN)-=amt`,
  `GELD(SP)-=amt*KPREIS(HAN)/500`, `GELD(HAN)+=amt*KPREIS(HAN)/500`.
  If `amt>50000`: `PUNKTE+1`.
- **Sell** to `HAN`: amount ≤ `LKORN(SP)`.
  `LKORN(SP)-=amt`, `GELD(SP)+=amt*KPREIS(HAN)/500`.
  **[BUG]** the buyer-side updates (`VERKORN(HAN)+=`, `LKORN(HAN)+=`,
  `GELD(HAN)-=`) sit after a `GOTO` and are dead code; the port applies the
  intended transfer.

### 5.3 Grain distribution (`KAISER3 #KORNAUS`, `10630-10880`)

```text
P20 = INT(LKORN*20/100)
P80 = INT(LKORN*80/100)
```

Player chooses: **max** = `P80`, **min** = `P20`, **needed** = `VKORN`
(error if `VKORN>P80`), or a **custom** amount that must lie in `[P20, P80]`.
`KAUS = amount`; `LKORN -= KAUS`.

---

## 6. Land trade (`KAISER3 #LAND`, `10900-11740`)

Price scale is **`LPREIS/10`** (building) and **`APREIS/10`** (acre) per ha.
Two-sided against `HAN`; buying is capped by the partner's offer, selling by the
ruler's own holdings.

| Action | Effect |
| --- | --- |
| Buy building land | `LAND(SP)+=amt`, `LAND(HAN)-=amt`, `VERBLAND(HAN)-=amt`, `GELD(SP)-=amt*LPREIS(HAN)/10`, `GELD(HAN)+=...` |
| Sell building land | reverse; `VERBLAND(HAN)+=amt` |
| Buy acre land | `ACKER(SP)+=amt`, `ACKER(HAN)-=amt`, `VERALAND(HAN)-=amt`, `GELD(SP)-=amt*APREIS(HAN)/10`, `GELD(HAN)+=...` |
| Sell acre land | reverse; `VERALAND(HAN)+=amt` |

If a requested amount exceeds the offer/holding, the whole remaining offer is
taken instead ("das ist zuviel") and the transfer still completes.

---

## 7. Chronicle (`KAISER3 #CHRONIK`, `11760-12520`)

Annual summary and the main population/economy update:

```text
GEB  = ABS(INT(LEUTE/44 + (KAUS-VKORN)/150)) + RAND(2)*WETTER      ; births
GES  = ABS(INT(LEUTE/42.55 + (VKORN-KAUS)/150)) + RAND(5)*(10-WETTER) ; deaths
PUNKTE += INT(GEB/10 - GES/10 + EINW/5)          ; (uses previous EINW) [BUG]
LEUTE  += GEB - GES
EINW  = INT((KAUS-VKORN)/1300); EINW = (EINW+RAND(10))*(EINW>0)    ; immigrants
PUNKTE += INT(GEB/10 - GES/10 + EINW/5)
AUSW  = INT(RAND(10)*LEUTE/100)  if MWST+EIN+ZOLL>60 or JUSTIZ=4 else 0
MAXK  = min(MUHL,  KAUS/1000); MG1 = INT(MAXK*(280+RAND(50))*WETTER/5) ; mills
MAXK  = min(MARKT, KAUS/333);  MG2 = INT(MAXK*(100+RAND(50))*WETTER/5) ; markets
LEUTE += EINW - AUSW
SOLD  = INFANT*(KAVALL+1) + 60 + ARTELL*80*(MANOV+1)               ; spy wages
GELD  = INT(GELD + MG1 + MG2 - SOLD)
```

- `KAUS` = grain distributed (§5.3); surplus `KAUS-VKORN` drives births,
  immigration and mill/market profit; a deficit drives deaths.
- **[BUG]** `11950` tests the scalar `JUSTIZ` (always 0) instead of `JUSTIZ(SP)`;
  the port uses the ruler's justice.
- **[BUG]** points are added twice and the first addition uses the previous
  year's `EINW`; the port keeps both additions but computes `EINW` first.
- Emigration trigger: tax burden over 60% **or** `JUSTIZ=4` (Gierig).

---

## 8. Trade data / Handelsdaten (`KAISER4 #HA`, `720-1650`)

**Multiplayer only**: skipped when `VAL(NAMEN$(1,1))=1` (single ruler)
(`KAISER4:765`).

On entry, offers are reset to at least 10% of holdings (manual §11):

```text
VERKORN(SP)  = LKORN(SP)
VERALAND(SP) = INT(ACKER(SP)/10)
VERBLAND(SP) = INT(LAND(SP)/10)
```

The ruler may then set `KPREIS`, `APREIS`, `LPREIS` and each offer, with floors
`VERKORN ≥ LKORN/10`, `VERALAND ≥ ACKER/10`, `VERBLAND ≥ LAND/10`.

### 8.1 Land shortage (`PROC LANDMANGEL`, `1660-1800`)

Called on trade-data entry. A market needs 600 ha and a mill 1000 ha of building
land:

```text
VMUHL = INT(MUHL - LAND/1000); if VMUHL<2: VMUHL=0
VMARK = INT(MARKT - LAND/600); if VMARK<2: VMARK=0
if VMUHL>0 or VMARK>0: MUHL -= VMUHL+1 ; MARKT -= VMARK+1
```

**[BUG]** the `+1` over-razes whenever land is an exact multiple; the port
removes only the true surplus.

---

## 9. State income and purchases

### 9.1 Taxes (`KAISER4 #EINNAHM`, `101-700`)

```text
RA = RAND(100) * JUSTIZ(SP)
SE = INT((MG1+MG2)/100 * (ZOLL+EIN+MWST) + RA)
GELD += SE
```

`JUSTIZ` labels (`KAISER4:280`): 1 Sehr fair, 2 Bescheiden, 3 Hart, 4 Gierig.
The ruler sets `ZOLL`, `MWST`, `EIN` (0..99) and `JUSTIZ` freely. Income scales
with the mill/market profit `MG1+MG2` from the chronicle.

### 9.2 Purchases (`KAISER4 #GESCHAFT`, `2280-3200`)

| Item | Cost | Effect | Land requirement | Points |
| --- | --- | --- | --- | --- |
| Markt (market) | 1000 | `MARKT+1` | `LAND/600 ≥ MARKT` | +0.5 |
| Mühle (mill) | 2000 | `MUHL+1` | `LAND/1000 ≥ MUHL` | +0.8 |
| Palast (`BURG`) | 5000 | `BURG+1` (max 15) | `LAND ≥ 20000` | +1.6 |
| Kathedrale (`DOM`) | 9000 | `DOM+1` (max 20) | `LAND ≥ 30000` | +2.1 |

Failed land checks refund money and building ("zu wenig bauland"). Other menu
entries: **Geheimdienst** (§12), **Spielstand** (standings table, `PROC STAND`),
**Ende** (end of turn, §2).

### 9.3 Status map (`KAISER4 #KARTE`, `1820-2262`)

```text
Städte = INT(min(MARKT/5, MUHL/3)) + 1
```

Displays markets, mills, acre land (in thousands), building land (in
thousands), population, money, points, with bar charts (`FBALK`). The map
graphic (`MAP0..MAP3`) is chosen by ruler and shows castle/cathedral if built.

---

## 10. Promotion and winning (`KAISER4 PROC TITEL`, `3980-4290`)

```text
need = 15 + TITEL*9 + ((TITEL+1)*TITEL/2)*4.5
if PUNKTE > need and GELD > 0:
    TITEL += 1
    if TITEL = 8 and DOM = 20 and BURG = 15:  WIN → KAISER6 (coronation)
    elif TITEL = 8: TITEL = 7                  ; cannot be Kaiser without both
```

To win: reach `TITEL=8` (Kaiser) with a full cathedral (`DOM=20`) and castle
(`BURG=15`) and a positive balance. Otherwise the rank caps at König (7).

---

## 11. End-of-turn events (`KAISER4`, `KAISERB`)

### 11.1 Pawn (`PROC PFAND`, `4460-4580`)

Triggered when `GELD < -10000 - TITEL*2000`.

```text
GELD = MUHL*200 + MARKT*100 + BURG*500 + DOM*900
MUHL=0; MARKT=0; ARTELL=0; KAVALL=0; INFANT=0; DOM=0; BURG=0
ACKER = ACKER/100 * (RAND(50)+50)      ; lose ~half the land
LAND  = LAND/100  * (RAND(50)+50)
TOD  -= 1
LEUTE = 200 + RAND(300)
PUNKTE = INT(PUNKTE/2)
```

### 11.2 Deposition (`PROC ENTHOBEN` / `ENT2`, `4600-4790`)

`ENTHOB=1`; `PUNKTE -= TITEL*10`. Triggered by `LAND+ACKER < LEUTE*10` (with
`LAND>0`) or by total tax burden `ZOLL+MWST+EIN < 20`. A deposed ruler sits out
the turn (see §2).

### 11.3 Death and heir (`PROC TOD`, `4810-5120`)

Triggered when `TOD<=0`. Prompt for an heir name (≤10 chars), then:

```text
TOD   = RAND(10) + 35
TITEL = max(0, TITEL-1)
PUNKTE = INT(TITEL*9 + ((TITEL+1)/2)*4.5) + RAND(30)
```

Manual §15 says the heir keeps the same rank and starts at 0 points; the source
drops the rank by 1 and re-awards points from the new rank. The port follows the
source.

### 11.4 Interest (`KAISER4:3121-3122`)

`GELD>0`: `GELD += GELD*2/100`. `GELD<0`: `GELD += GELD*8/100` (debt grows).

---

## 12. Secret service and sabotage (`KAISER5`)

Entered from `GESCHAFT` (once per turn, `PEEK(1628)=0`); entering with
`GELD<0` costs 0.5 points (`KAISER4:3151`).

### 12.1 Prices (rolled on entry, `KAISER5:280-310`)

| Item | Price |
| --- | --- |
| Guard (`INFANT`) | `INFP = 500 + RAND(100)` |
| Saboteur (`ARTELL`) | `ARTP = 600 + RAND(100)` |
| Guard training (`KAVALL+1`) | `KAVP = 100 + RAND(50)` per guard |
| Saboteur training (`MANOV+1`) | `MANP = 200 + RAND(80)` per saboteur |

Actions: hire guards (`INFANT+1`, `GELD-INFP`); hire saboteurs (`ARTELL+1`,
`GELD-ARTP`); train guards (`KAVALL+1`, `GELD -= KAVP*INFANT`); train saboteurs
(`MANOV+1`, `GELD -= MANP*ARTELL`); start operations (needs `ARTELL>0`).

### 12.2 Spy phase (`KAISER5 #GEHEIM`, `850-1640`)

1. Choose a target `SPI` (not self).
2. The defender's guards `INFANT(SPI)` are **spread randomly** over their
   buildings: mills, markets and trading houses (`MUHL`, `MARKT`, `HH`)
   (`920-1270`).
3. The attacker moves a cursor over the target's map and inspects buildings; the
   guard count in the selected building is shown. Each inspection costs
   `SPPI = RAND(500) + TITEL(SP)*500` (`1630`). Buildings: mill, market,
   trading house, castle.

### 12.3 Sabotage phase (`KAISER5 #SABO`, `1650-2430`)

Choose a building and a number of saboteurs `SAB` (≤ `ARTELL(SP)-US`, where `US`
counts saboteurs already spent). Combat:

```text
SABO = SAB*MANOV(SP) + RAND(6)*(SAB>0)     ; attacker strength
WACH = WW*KAVALL(SP) + RAND(6)*(WW>0)      ; defense (WW = guards in building)
```

**[BUG]** defense uses the *attacker's* `KAVALL`; the port uses the defender's
(manual §14).

**Success** (`SABO>WACH`): the building burns; guards inside die
(`INFANT(SPI)-=WW`); loot by building:

```text
market  : LG+=1000+RAND(500); GG+=800+RAND(200);   KG+=2000+RAND(1000); MARKT(SPI)-1
mill    : LG+=2000 "AND (800)" [BUG];              GG+=1600+RAND(400);  KG+=4000+RAND(2000); MUHL(SPI)-1
trading : LG+=500+RAND(200);                       GG+=5600+RAND(900);  KG+=1000+RAND(500);  HH(SPI)-1
```

`GG` = gold, `KG` = grain, `LG` = land loot (split half acre / half building
land). Loot is transferred from the target to the attacker, each target resource
floored at 0:

```text
GELD(SP)+=GG; LKORN(SP)+=KG; LAND(SP)+=INT(LG/2); ACKER(SP)+=INT(LG/2)
GELD(SPI)-=GG; LKORN(SPI)-=KG; LAND(SPI)-=INT(LG/2); ACKER(SPI)-=INT(LG/2)
```

**[BUG]** on success the used saboteurs (`US`) are not consumed; only a failed
attempt removes them (`ARTELL(SP)-=SAB`). The port follows the source and flags
it.

---

## 13. Highscore (`KAISER6`)

Final score per ruler (`PROC WERT`, `1350-1450`):

```text
PU = (200 - (JAHR-1700))*200     ; earlier is better
   + MARKT*200 + MUHL*300 + HH*500 + LEUTE*100 + DOM*1000 + BURG*800
   - KRIEG*200
```

Entries are insertion-sorted (descending) into a top-100 table with year and
rank (`EINSORT`), persisted in `KAISER.DAT`, and shown 10 per screen with
scroll. The winner gets a coronation animation (`PROC KROENUNG`) before the
list.

---

## 14. Program / scene map

| File | Role |
| --- | --- |
| `AUTORUN.BAS` | boot stub → `KAISERII.TUR` |
| `KAISERII.TUR` | title screen + music |
| `TESTER.TUR` | copy protection (Lenslock) + music driver |
| `KAISER0.TUR` | second title screen, loads compressed art |
| `KAISER1.TUR` / `XF551KL1.TUR` | credits, copy pics to RAMDISK |
| `KAISER2.TUR` | name entry, joystick/portrait, writes `NAMEN.DAT` |
| `KAISERB.TUR` | trading house, tribute, expropriation, tax demotion |
| `KAISER3.TUR` | partner, harvest, grain, land, chronicle |
| `KAISER4.TUR` | taxes, trade data, land shortage, map, purchases, end-of-turn |
| `KAISER5.TUR` | secret service and sabotage |
| `KAISER6.TUR` | coronation, highscore |

The copy protection (`TESTER.TUR`) is anti-piracy UI, not gameplay, and is
intentionally not ported.

---

## 15. Source bugs / port decisions (summary)

Full detail in `rewrite.md` → "Known issues". Rule-relevant ones:

| # | Source | Intended (ported) |
| --- | --- | --- |
| 1 | `KAISER3:10150` keeps `FAUL`% of grain | keep `(100-FAUL)%` |
| 2 | `KAISER3:10580` dead seller-side updates | apply the full transfer |
| 3 | `KAISER3:11950` tests scalar `JUSTIZ` | test `JUSTIZ(SP)` |
| 4 | `KAISER3:11911` uses previous `EINW` | compute `EINW` first |
| 5 | `KAISER4:1770` `+1` over-raze | remove true surplus |
| 6 | `KAISERB:1590` lease gate 2500 vs cost 5000 | kept as source |
| 7 | `KAISERB:2370` only skips `ENTHOB=1` | consume any suspension |
| 8 | `KAISER5:2000` defense uses attacker `KAVALL` | use defender's |
| 9 | `KAISER5:2110` saboteurs survive success | kept as source, flagged |
| 10 | `KAISER4:765` single-player trade-data gate | skip trade data when 1 ruler |
| 11 | `KAISER5:2140` `2000 AND (800)` | treat as `2000+RAND(800)` land loot |
