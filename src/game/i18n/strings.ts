// Bilingual UI strings. German is the original text (from the .TUR source and
// the manual); English is the translation. Add new keys here as scenes need
// them. ATASCII escapes in the source (\ ä, ] ö, ^ ü, { ß) are already
// normalised to Unicode.
export type Lang = "de" | "en";

export interface StringEntry {
  de: string;
  en: string;
}

export const STRINGS = {
  "app.title": { de: "KAISER II Remake", en: "KAISER II Remake" },
  "app.subtitle": {
    de: "by Torben",
    en: "by Torben",
  },

  "menu.newGame": { de: "Neues Spiel", en: "New game" },
  "menu.continue": { de: "Spiel fortsetzen", en: "Continue game" },
  "menu.language": { de: "Sprache: Deutsch", en: "Language: English" },
  "menu.rulesAtari": { de: "Regeln: Atari", en: "Rules: Atari" },
  "menu.rulesRemake": { de: "Regeln: Remake", en: "Rules: Remake" },
  "menu.musicOn": { de: "Musik: an", en: "Music: on" },
  "menu.musicOff": { de: "Musik: aus", en: "Music: off" },
  "menu.gamesPlayed": { de: "{n} Spiele gespielt", en: "{n} games played" },
  "menu.share": { de: "Teilen", en: "Share" },
  "menu.shareCopied": { de: "Link kopiert", en: "Link copied" },
  "menu.installTitle": { de: "Als App installieren", en: "Install as app" },
  "menu.install": { de: "Installieren", en: "Install" },
  "menu.installAndroid": { de: "Android:", en: "Android:" },
  "menu.installAndroidText": {
    de: 'Menü (3 Punkte) → "Zum Startbildschirm hinzufügen"',
    en: 'Menu (3 dots) → "Add to Home screen"',
  },
  "menu.installIphone": { de: "iPhone:", en: "iPhone:" },
  "menu.installIphoneText": {
    de: 'Teilen-Symbol → "Zum Home-Bildschirm"',
    en: 'Share icon → "Add to Home Screen"',
  },
  "menu.fullscreen": { de: "Vollbild", en: "Fullscreen" },
  "menu.creditsSource": {
    de: "Basierend auf dem Atari-Quellcode von 1989, freundlicherweise geteilt von",
    en: "Based on the 1989 Atari source code, thankfully shared by",
  },
  "menu.openSource": { de: "OpenSource", en: "OpenSource" },
  "menu.contact": { de: "Kontakt", en: "Contact" },
  "menu.pause": { de: "Menü", en: "Menu" },
  "menu.pauseTitle": { de: "Menü", en: "Menu" },
  "menu.resume": { de: "Weiter", en: "Resume" },
  "menu.endGame": { de: "Spiel beenden", en: "End game" },

  "newGame.prompt": { de: "Neues Spiel", en: "New game" },
  "newGame.playerCount": {
    de: "Anzahl der Spieler",
    en: "Number of players",
  },
  "newGame.player": { de: "Spieler", en: "Player" },
  "newGame.computers": { de: "Computergegner", en: "Computer opponents" },
  "newGame.computersHint": {
    de: "Keinen, einen oder mehrere wählen. Sie spielen ganze Züge selbst und handeln mit dem Kaiser.",
    en: "Pick none, one or several. They play whole turns themselves and trade with the Emperor.",
  },
  "newGame.none": { de: "Keiner", en: "None" },
  "newGame.computersFull": {
    de: "Mehr Plätze gibt es nicht.",
    en: "There are no more seats.",
  },
  "level.easy": { de: "leicht", en: "easy" },
  "level.medium": { de: "mittel", en: "medium" },
  "level.hard": { de: "schwer", en: "hard" },
  "level.easyText": {
    de: "Wirtschaftet knapp und träge.",
    en: "Runs a lean, slow realm.",
  },
  "level.mediumText": {
    de: "Solide, aber ohne Feinschliff.",
    en: "Solid, but not polished.",
  },
  "level.hardText": {
    de: "Hält Steuern, Nahrung und Bauten im Optimum.",
    en: "Keeps taxes, food and building at the optimum.",
  },
  "ai.summary": {
    de: "Bevölkerung {pop}, {geld} Taler, {rank}.",
    en: "Population {pop}, {geld} taler, {rank}.",
  },
  "ai.built": { de: "Gebaut: {list}.", en: "Built: {list}." },
  "ai.leased": {
    de: "Ein Handelshaus gepachtet.",
    en: "Leased a trading house.",
  },
  "ai.demoted": {
    de: "{name} verlor wegen zu hoher Steuern einen Rang.",
    en: "{name} lost a rank to excessive taxes.",
  },
  "ai.seized": {
    de: "Der Kaiser enteignete {name} ein Handelshaus.",
    en: "The Emperor took a trading house from {name}.",
  },
  "ai.pawn": {
    de: "{name} musste Besitz verpfänden.",
    en: "{name} had to pawn possessions.",
  },
  "ai.deposedLand": {
    de: "{name} wurde wegen Landmangels für ein Jahr abgesetzt.",
    en: "{name} was suspended for a year over a lack of land.",
  },
  "ai.deposedTax": {
    de: "{name} wurde wegen zu niedriger Steuern für ein Jahr abgesetzt.",
    en: "{name} was suspended for a year over taxes that were too low.",
  },
  "ai.death": {
    de: "{name} starb, der Erbe übernimmt.",
    en: "{name} died, the heir takes over.",
  },
  "newGame.nameHint": {
    de: "Name (max. 10 Zeichen)",
    en: "Name (max 10 characters)",
  },
  "newGame.kingdomHint": {
    de: "Name des Reiches (max. 12 Zeichen)",
    en: "Kingdom name (max 12 characters)",
  },
  "newGame.kingdomEmpty": {
    de: "Bitte Reichsnamen eingeben",
    en: "Please enter a kingdom name",
  },
  "newGame.nameEmpty": {
    de: "Bitte Namen eingeben",
    en: "Please enter a name",
  },
  "newGame.nameTaken": {
    de: "Name bereits vergeben",
    en: "Name already taken",
  },
  "newGame.chooseIcon": {
    de: "Wähle ein Wappen",
    en: "Choose a coat of arms",
  },

  "common.yes": { de: "JA", en: "YES" },
  "common.no": { de: "NEIN", en: "NO" },
  "common.taler": { de: "Taler", en: "taler" },
  "common.continue": { de: "Weiter", en: "Continue" },
  "common.end": { de: "Ende", en: "End" },
  "common.back": { de: "Zurück", en: "Back" },
  "common.notEnough": { de: "Das ist zuviel!", en: "That is too much!" },
  "common.wait": { de: "Bitte warten", en: "Please wait" },

  "scroll.ruler": { de: "Ihre Majestät,", en: "Your Majesty," },
  "scroll.regentM": { de: "Der Regent von", en: "The regent of" },
  "scroll.regentF": { de: "Die Regentin von", en: "The regent of" },

  "trade.title": { de: "Handelshäuser", en: "Trading houses" },
  "trade.wages": { de: "Lohnkosten", en: "Wage costs" },
  "trade.profit": { de: "Gewinn", en: "Profit" },
  "trade.total": { de: "Gesamt", en: "Total" },
  "trade.houses": { de: "Handelshäuser", en: "Trading houses" },
  "trade.servants": { de: "Bedienstete", en: "Servants" },
  "trade.hire": { de: "Neu einstellen", en: "Hire" },
  "trade.fire": { de: "Entlassen", en: "Dismiss" },
  "trade.noticeTitle": {
    de: "Handel in Ihrer Abwesenheit",
    en: "Trades while you were away",
  },
  "trade.noticeSold": {
    de: "{who} kaufte {units} {good} (+{money} Taler)",
    en: "{who} bought {units} {good} (+{money} taler)",
  },
  "trade.noticeBought": {
    de: "{who} verkaufte Ihnen {units} {good} (-{money} Taler)",
    en: "{who} sold you {units} {good} (-{money} taler)",
  },
  "trade.noticeMore": { de: "… und {n} weitere", en: "… and {n} more" },
  "trade.tributeTitle": {
    de: "Der Kaiser verlangt {zahl} Taler",
    en: "The Emperor demands {zahl} taler",
  },
  "trade.rent": {
    de: "Handelshaus kaufen ({price})",
    en: "Buy trading house ({price})",
  },
  "trade.staffHint": {
    de: "Für Gewinn werden mindestens {need} Bedienstete benötigt.",
    en: "At least {need} servants are needed for a profit.",
  },
  "trade.staffHintRemake": {
    de: "Jedes Haus braucht {per} Bedienstete für vollen Gewinn: {staffed} von {hh} Häusern besetzt.",
    en: "Each house needs {per} servants for full profit: {staffed} of {hh} houses staffed.",
  },
  "trade.staffNoHouse": {
    de: "Noch kein Handelshaus gepachtet.",
    en: "No trading house leased yet.",
  },
  "trade.rentHint": {
    de: "Handelshaus für {price} Taler kaufen, +1.3 Punkte.",
    en: "Buy a trading house for {price} taler, +1.3 points.",
  },
  "trade.verdictPleased": {
    de: "Der Kaiser ist erfreut",
    en: "The Emperor is pleased",
  },
  "trade.verdictTolerated": {
    de: "Der Kaiser duldet es",
    en: "The Emperor tolerates it",
  },
  "trade.verdictDispleased": {
    de: "Der Kaiser ist verstimmt",
    en: "The Emperor is displeased",
  },
  "trade.verdictInsulted": {
    de: "Der Kaiser ist beleidigt: Enteignung",
    en: "The Emperor is insulted: expropriation",
  },
  "trade.expropriationTextRemake": {
    de: "Ihr Tribut war eine Beleidigung: Der Kaiser hat Ihnen eines der Handelshäuser genommen.",
    en: "Your tribute was an insult: the Emperor took one of your trading houses.",
  },
  "trade.expropriation": { de: "Enteignung", en: "Expropriation" },
  "trade.expropriationText": {
    de: "Aufgrund schlechter Handelsgeschäfte wurde Ihnen eines der Handelshäuser enteignet.",
    en: "Due to poor trading you lost one of your trading houses.",
  },

  "grain.title": { de: "Korn", en: "Grain" },
  "grain.trade": { de: "Kornhandel", en: "Grain Trade" },
  "partner.title": { de: "Handelspartner", en: "Trading partner" },
  "partner.max": { de: "max", en: "max" },
  "partner.hint": {
    de: "Sie kaufen und verkaufen Korn und Land zu den Preisen und Angeboten des gewählten Partners.",
    en: "You buy and sell grain and land at the chosen partner's prices and offers.",
  },
  "partner.bid": {
    de: "Ein Preis je 500 Einheiten. Große Käufe treiben ihn hoch, große Verkäufe drücken ihn. Der Kaiser verlangt mehr, wenn sein Vorrat knapp ist.",
    en: "One price per 500 units. Big purchases raise it, big sales lower it. The Emperor charges more when his stock is short.",
  },
  "partner.pick": {
    de: "Ihr Handelspartner ist",
    en: "Your trading partner is",
  },
  "grain.rot": {
    de: "Kornreserven sind verfault:",
    en: "Grain reserves rotted:",
  },
  "grain.buy": { de: "Kaufen", en: "Buy" },
  "grain.sell": { de: "Verkaufen", en: "Sell" },
  "grain.howMuchBuy": {
    de: "Wieviel Korn wollen Sie kaufen?",
    en: "How much grain do you want to buy?",
  },
  "grain.howMuchSell": {
    de: "Wieviel Korn wollen Sie verkaufen?",
    en: "How much grain do you want to sell?",
  },
  "grain.stock": { de: "Bestand", en: "Stock" },
  "grain.reserve": { de: "Kornreserve", en: "Grain reserve" },
  "grain.give": { de: "Ausgabe", en: "Issue" },
  "grain.need": { de: "Nötiges Korn", en: "Needed grain" },
  "grain.exhausted": { de: "Vorräte erschöpft", en: "Out of stock" },
  "grain.distribution": { de: "Kornausgabe", en: "Grain Issue" },
  "grain.distributionHint": {
    de: "20%=Minimum  80%=Maximum  Benötigt=Bedarf  eigene Menge",
    en: "20%=minimum  80%=maximum  needed=demand  custom",
  },
  "grain.tooLittle": { de: "Das ist zuwenig", en: "That is too little" },
  "grain.tooMuch": { de: "Das ist zuviel", en: "That is too much" },
  "grain.buyPrice": { de: "Preis / 500", en: "Price / 500" },
  "grain.giveMax": { de: "Maximum geben (80%)", en: "Give maximum (80%)" },
  "grain.giveMin": { de: "Minimum geben (20%)", en: "Give minimum (20%)" },
  "grain.giveNeeded": { de: "Benötigte Menge", en: "Needed amount" },
  "grain.giveCustom": { de: "Eigene Menge", en: "Custom amount" },
  "weather.1": {
    de: "Ein Orkan vernichtete die Ernte",
    en: "A hurricane destroyed the harvest",
  },
  "weather.2": {
    de: "Eine Dürre zerstörte die Ernte",
    en: "A drought destroyed the harvest",
  },
  "weather.3": {
    de: "Sturm und Regen minderten die Ernte",
    en: "Storm and rain reduced the harvest",
  },
  "weather.4": {
    de: "Schlechtes Wetter - Schlechte Ernte",
    en: "Bad weather - bad harvest",
  },
  "weather.5": {
    de: "Normales Wetter - Normale Ernte",
    en: "Normal weather - normal harvest",
  },
  "weather.6": {
    de: "Wetter O.K. - Durchschnittliche Ernte",
    en: "Weather OK - average harvest",
  },
  "weather.7": {
    de: "Mildes Wetter ergab gute Ernte",
    en: "Mild weather gave a good harvest",
  },
  "weather.8": {
    de: "Gutes Wetter - Reiche Ernte",
    en: "Good weather - rich harvest",
  },
  "weather.9": {
    de: "Hervorragendes Wetter - Rekordernte",
    en: "Excellent weather - record harvest",
  },
  "weather.10": {
    de: "Rekordsommer - sensationelle Ernte",
    en: "Record summer - sensational harvest",
  },

  "land.title": { de: "Land", en: "Land" },
  "land.owns": { de: "Sie besitzen:", en: "You own:" },
  "land.offer": { de: "Angebot:", en: "Offer:" },
  "land.building": { de: "Bauland", en: "Building land" },
  "land.acre": { de: "Ackerland", en: "Acre land" },
  "land.buy": { de: "Kaufen", en: "Buy" },
  "land.sell": { de: "Verkaufen", en: "Sell" },
  "land.tradeHint": {
    de: "Links verkaufen, rechts kaufen",
    en: "Left to sell, right to buy",
  },
  "land.shortageTitle": { de: "Landmangel", en: "Land shortage" },
  "land.shortageText": {
    de: "Wegen Landmangels haben Sie {muhl} Mühle(n) und {markt} Markt/Märkte verloren.",
    en: "Due to a land shortage you lost {muhl} mill(s) and {markt} market(s).",
  },
  "land.buyBuilding": { de: "Bauland kaufen", en: "Buy building land" },
  "land.sellBuilding": { de: "Bauland verkaufen", en: "Sell building land" },
  "land.buyAcre": { de: "Ackerland kaufen", en: "Buy acre land" },
  "land.sellAcre": { de: "Ackerland verkaufen", en: "Sell acre land" },
  "land.howMuchBuyBuilding": {
    de: "Wieviel Bauland wollen Sie kaufen:",
    en: "How much building land to buy:",
  },
  "land.howMuchSellBuilding": {
    de: "Wieviel Bauland verkaufen Sie:",
    en: "How much building land to sell:",
  },
  "land.howMuchBuyAcre": {
    de: "Wieviel Acker kaufen Sie:",
    en: "How much acre land to buy:",
  },
  "land.howMuchSellAcre": {
    de: "Wieviel Acker verkaufen Sie:",
    en: "How much acre land to sell:",
  },

  "tax.title": { de: "Staatseinnahmen", en: "State income" },
  "tax.income": { de: "Einnahmen dieses Jahres", en: "Income this year" },
  "tax.nextYear": {
    de: "Steuern für das nächste Jahr",
    en: "Taxes for next year",
  },
  "tax.customs": { de: "Zoll", en: "Customs" },
  "tax.vat": { de: "Mehrwertsteuer", en: "VAT" },
  "tax.incomeTax": { de: "Einkommensteuer", en: "Income tax" },
  "tax.justice": { de: "Justiz", en: "Justice" },
  "tax.customsHint": {
    de: "Einfuhrzoll: zählt mit Mehrwert- und Einkommensteuer; Grundlage ist der Mühlen- und Marktgewinn.",
    en: "Customs: counts with VAT and income tax; based on mill and market profit.",
  },
  "tax.vatHint": {
    de: "Mehrwertsteuer: zählt mit Zoll und Einkommensteuer; Grundlage ist der Mühlen- und Marktgewinn.",
    en: "VAT: counts with customs and income tax; based on mill and market profit.",
  },
  "tax.incomeTaxHint": {
    de: "Einkommensteuer: zählt mit Zoll und Mehrwertsteuer; Grundlage ist der Mühlen- und Marktgewinn.",
    en: "Income tax: counts with customs and VAT; based on mill and market profit.",
  },
  "tax.justiceHint": {
    de: "Justiz: Zuschlag von 0–99 Talern je Stufe, unabhängig vom Gewinn; 'Gierig' vertreibt Bürger.",
    en: "Justice: bonus of 0–99 talers per level, independent of profit; 'Greedy' drives citizens away.",
  },
  "tax.limits": {
    de: "Alle drei zusammen: über 60 % wandern Bürger aus, über 80 % verlieren Sie einen Rang, unter 20 % werden Sie ein Jahr enthoben.",
    en: "All three combined: above 60% citizens emigrate, above 80% you lose a rank, below 20% you are suspended for a year.",
  },
  "tax.headTax": { de: "Kopfsteuer", en: "Head tax" },
  "tax.buildingTax": { de: "Gebäudesteuer", en: "Building tax" },
  "tax.fines": { de: "Gerichtsgebühren", en: "Court fines" },
  "tax.fed": { de: "Ernährung", en: "Nutrition" },
  "tax.forecast": { de: "Erwartet pro Jahr", en: "Expected per year" },
  "tax.mood": { de: "Stimmung", en: "Mood" },
  "tax.mood0": { de: "Zufrieden", en: "Content" },
  "tax.mood1": { de: "Das Volk murrt", en: "The people grumble" },
  "tax.mood2": { de: "Bürger wandern ab", en: "Citizens leave" },
  "tax.mood3": { de: "Aufruhr: Rangverlust", en: "Revolt: rank lost" },
  "tax.headHint": {
    de: "Kopfsteuer: Anteil am Verdienst von {wage} Talern je Bürger; hungernde Bürger zahlen bis zur Hälfte weniger.",
    en: "Head tax: share of the {wage} talers each citizen earns; starving citizens pay up to half less.",
  },
  "tax.buildingHint": {
    de: "Gebäudesteuer: Anteil am geschätzten Jahresertrag von Mühlen ({mill}) und Märkten ({market}); Palast, Dom und Handelshäuser sind frei.",
    en: "Building tax: share of the assessed yearly yield of mills ({mill}) and markets ({market}); palace, cathedral and trading houses are exempt.",
  },
  "tax.justiceHintRemake": {
    de: "Justiz: Gebühren von 0 bis 3 Talern je Bürger; Härte erhöht die Belastung, Milde senkt sie.",
    en: "Justice: fines of 0 to 3 talers per citizen; severity raises the burden, mildness lowers it.",
  },
  "tax.limitsRemake": {
    de: "Ab 30 Belastungspunkten (beide Steuern plus Justiz) sinken Geburten und Zuzug und mehr Bürger wandern ab; über 70 verlieren Sie einen Rang, unter 20 (nur Steuern) werden Sie ein Jahr enthoben.",
    en: "Above 30 burden points (both taxes plus justice) births and immigration fall and more citizens leave; above 70 you lose a rank, below 20 (taxes only) you are suspended for a year.",
  },
  "tax.changeCustoms": { de: "Zoll ändern", en: "Change customs" },
  "tax.changeVat": { de: "Mehrwertsteuer ändern", en: "Change VAT" },
  "tax.changeIncome": { de: "Einkommensteuer ändern", en: "Change income tax" },
  "tax.changeJustice": { de: "Justiz ändern", en: "Change justice" },

  "tradeData.title": {
    de: "Handel mit Mitspielern: Ihre Angebote",
    en: "Trade with rivals: your offers",
  },
  "tradeData.price": { de: "Preis", en: "Price" },
  "tradeData.amount": { de: "Menge", en: "Amount" },
  "tradeData.priceHint": {
    de: "Preis je Einheit, zu dem Mitspieler bei Ihnen kaufen und Sie bei Mitspielern kaufen.",
    en: "Price per unit at which rivals buy from you and you buy from rivals.",
  },
  "tradeData.priceHintRemake": {
    de: "Preis je Einheit, zu dem Mitspieler und Computer bei Ihnen kaufen und Sie bei Mitspielern kaufen. Käufer wählen den Billigsten, auch den Kaiser.",
    en: "Price per unit at which rivals and computers buy from you and you buy from rivals. Buyers pick the cheapest seller, the Emperor included.",
  },
  "tradeData.amountHintRemake": {
    de: "Menge, die Sie diese Runde anbieten; auch 0 ist erlaubt. Land nur, soweit Mühlen, Märkte und 10 ha je Einwohner gedeckt bleiben.",
    en: "Amount you offer this round; 0 is allowed. Land only as far as mills, markets and 10 ha per head stay covered.",
  },
  "tradeData.amountHint": {
    de: "Menge, die Sie diese Runde anbieten. Mindestens 10 % der Güter müssen angeboten werden.",
    en: "Amount you offer this round. At least 10% of goods must be offered.",
  },

  "business.title": { de: "Staatseinkäufe", en: "State purchases" },
  "business.fortune": { de: "Taler", en: "Taler" },
  "business.market": { de: "Markt", en: "Market" },
  "business.mill": { de: "Mühle", en: "Mill" },
  "business.palace": { de: "Palast", en: "Palace" },
  "business.cathedral": { de: "Kathedrale", en: "Cathedral" },
  "business.interest": { de: "Zinsen", en: "Interest" },
  "business.noLand": { de: "Zu wenig Bauland", en: "Not enough building land" },
  "business.pawn": { de: "Pfändung", en: "Seizure" },
  "business.pawnText": {
    de: "Ihre Gläubiger haben Sie wegen schlechter Finanzpolitik gepfändet!",
    en: "Your creditors have seized your assets due to poor finances!",
  },
  "business.deposedLand": {
    de: "Schlechte Landpolitik",
    en: "Poor land policy",
  },
  "business.deposedLandText": {
    de: "Sie wurden wegen schlechter Landpolitik für ein Jahr Ihres Amtes enthoben.",
    en: "You were suspended for a year due to poor land policy.",
  },
  "business.deposedTax": {
    de: "Schlechte Steuerpolitik",
    en: "Poor tax policy",
  },
  "business.deposedTaxText": {
    de: "Sie wurden wegen schlechter Steuerpolitik für ein Jahr Ihres Amtes enthoben.",
    en: "You were suspended for a year due to poor tax policy.",
  },
  "business.demoted": { de: "STEUERPOLITIK", en: "TAX POLICY" },
  "business.demotedText": {
    de: "Aufgrund Ihrer schlechten Steuerpolitik wurden Sie um zwei Jahre Ihres Amtes enthoben und degradiert!",
    en: "Due to your poor tax policy you were suspended for two years and demoted!",
  },
  "business.death": { de: "Eine schlechte Nachricht.", en: "Bad news." },
  "business.deathText": { de: "Sie sind gestorben!", en: "You have died!" },
  "business.deathHeir": {
    de: "Glücklicherweise haben Sie rechtzeitig einen Erben hinterlassen.",
    en: "Fortunately you left an heir in time.",
  },

  "coronation.text": {
    de: "{name} wird zum Kaiser gekrönt!",
    en: "{name} is crowned Emperor!",
  },

  "monument.palace": { de: "Palast vollendet", en: "Palace completed" },
  "monument.cathedral": {
    de: "Kathedrale vollendet",
    en: "Cathedral completed",
  },
  "promotion.title": {
    de: "{name} wurde zum {titleDat} von {kingdom} ernannt",
    en: "{name} was made {title} of {kingdom}",
  },

  "ranking.title": { de: "Rangliste", en: "Ranking" },
  "ranking.rank": { de: "Platz", en: "Rank" },
  "ranking.ruler": { de: "Herrscher", en: "Ruler" },
  "ranking.points": { de: "Punkte", en: "Points" },
  "ranking.fortune": { de: "Taler", en: "Taler" },
  "ranking.population": { de: "Bevölkerung", en: "Population" },
  "ranking.acre": { de: "Ackerland", en: "Acre land" },
  "ranking.building": { de: "Bauland", en: "Building land" },
  "ranking.markets": { de: "Märkte", en: "Markets" },
  "ranking.mills": { de: "Mühlen", en: "Mills" },
  "ranking.cities": { de: "Städte", en: "Cities" },

  "highscore.title": { de: "Ruhmeshalle", en: "Hall of fame" },
  "highscore.header": {
    de: "PLATZ/STUFE  NAME        JAHR   PUNKTE",
    en: "RANK/TITLE  NAME        YEAR   POINTS",
  },

  "secret.title": { de: "Geheimdienst", en: "Secret service" },
  "secret.guards": { de: "Wachen", en: "Guards" },
  "secret.saboteurs": { de: "Saboteure", en: "Saboteurs" },
  "secret.priceGuards": { de: "Preis der Wachen", en: "Price of guards" },
  "secret.priceSaboteurs": {
    de: "Preis der Saboteure",
    en: "Price of saboteurs",
  },
  "secret.hireGuards": { de: "Wachen einstellen", en: "Hire guards" },
  "secret.hireSaboteurs": { de: "Saboteure einstellen", en: "Hire saboteurs" },
  "secret.trainGuards": { de: "Wachen ausbilden", en: "Train guards" },
  "secret.trainSaboteurs": { de: "Saboteure ausbilden", en: "Train saboteurs" },
  "secret.operations": {
    de: "Geheimdiensttätigkeiten",
    en: "Secret operations",
  },
  "secret.hireGuardsHint": {
    de: "Wachen verteidigen gegen Sabotage. +1 Wache.",
    en: "Guards defend against sabotage. +1 guard.",
  },
  "secret.hireSaboteursHint": {
    de: "Saboteure greifen Mitspieler an. +1 Saboteur.",
    en: "Saboteurs attack rivals. +1 saboteur.",
  },
  "secret.trainGuardsHint": {
    de: "Erhöht die Verteidigungsstärke jeder Wache um 1.",
    en: "Raises each guard's defence strength by 1.",
  },
  "secret.trainSaboteursHint": {
    de: "Erhöht die Angriffsstärke jedes Saboteurs um 1.",
    en: "Raises each saboteur's attack strength by 1.",
  },
  "secret.operationsHint": {
    de: "Sabotage gegen einen Mitspieler starten.",
    en: "Launch sabotage against a rival.",
  },
  "secret.target": {
    de: "Wen wollen Sie angreifen?",
    en: "Whom do you attack?",
  },
  "secret.nobody": { de: "Niemand", en: "Nobody" },
  "secret.building": { de: "Objekt wählen", en: "Choose a target" },
  "secret.house": { de: "Handelshaus", en: "Trading house" },
  "secret.palace": { de: "Schloss", en: "Palace" },
  "secret.amount": { de: "Anzahl Saboteure", en: "Number of saboteurs" },
  "secret.success": { de: "Sabotage erfolgreich!", en: "Sabotage succeeded!" },
  "secret.failed": { de: "Sabotage fehlgeschlagen!", en: "Sabotage failed!" },

  "chronicle.title": { de: "Chronik", en: "Chronicle" },
  "chronicle.population": { de: "Bevölkerung", en: "Population" },
  "chronicle.money": { de: "Taler", en: "Taler" },
  "chronicle.born": {
    de: "Bürger wurden heuer geboren",
    en: "citizens were born this year",
  },
  "chronicle.died": {
    de: "Bürger sind heuer gestorben",
    en: "citizens died this year",
  },
  "chronicle.immigrants": {
    de: "Einwanderer kamen heuer",
    en: "immigrants arrived this year",
  },
  "chronicle.emigrants": {
    de: "verließen das Land",
    en: "left the country",
  },
  "chronicle.millProfit": {
    de: "Gewinn durch die Mühlen",
    en: "profit from the mills",
  },
  "chronicle.marketProfit": {
    de: "Gewinn durch die Märkte",
    en: "profit from the markets",
  },
  "chronicle.secretService": {
    de: "Sold an den Geheimdienst",
    en: "paid to the secret service",
  },
  "chronicle.peopleChange": {
    de: "Bevölkerung",
    en: "Population",
  },
  "chronicle.moneyChange": {
    de: "Taler",
    en: "Taler",
  },

  "ui.ok": { de: "OK", en: "OK" },
  "ui.cancel": { de: "Abbrechen", en: "Cancel" },
  "ui.continue": { de: "Weiter", en: "Continue" },

  "status.year": { de: "Jahr", en: "Year" },
  "status.points": { de: "Punkte", en: "Points" },
  "status.population": { de: "Bevölkerung", en: "Population" },
} as const satisfies Record<string, StringEntry>;

export type StringKey = keyof typeof STRINGS;
