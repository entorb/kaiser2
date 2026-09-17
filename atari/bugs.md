# Known issues / bugs (from source + manual)

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
