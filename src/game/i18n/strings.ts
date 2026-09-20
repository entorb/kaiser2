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

  "rotate.title": {
    de: "Dreht Euer Gerät, Herr!",
    en: "Turn thy device, my liege!",
  },
  "rotate.sub": {
    de: "Das Reich verlangt Querformat",
    en: "The realm asks for landscape",
  },

  "menu.newGame": { de: "Neues Reich", en: "New realm" },
  "menu.continue": { de: "Weiterregieren", en: "Reign on" },
  // Shows the current language; a click switches to the other.
  "menu.language": { de: "DE", en: "EN" },
  "menu.rulesAtari": { de: "Regeln: Atari", en: "Rules: Atari" },
  "menu.rulesRemake": { de: "Regeln: Remake", en: "Rules: Remake" },
  "menu.gamesPlayed": { de: "{n} Reiche regiert", en: "{n} realms ruled" },
  "menu.shareCopied": { de: "Gut!", en: "Aye!" },
  "menu.installTitle": { de: "App installieren", en: "Install the app" },
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
  "menu.creditsSource": {
    de: "Nach dem Atari-Quelltext von 1989, geteilt von",
    en: "After the 1989 Atari source, shared by",
  },
  "menu.openSource": { de: "OpenSource", en: "OpenSource" },
  "menu.contact": { de: "Kontakt", en: "Contact" },
  "menu.pause": { de: "Rast", en: "Rest" },
  "menu.pauseTitle": { de: "Rast", en: "Rest" },
  "menu.resume": { de: "Voran", en: "Onward" },
  "menu.endGame": { de: "Thron verlassen", en: "Leave the throne" },

  "newGame.prompt": { de: "Neues Reich", en: "New realm" },
  "newGame.playerCount": { de: "Spieler", en: "Rulers" },
  "newGame.player": { de: "Spieler", en: "Ruler" },
  "newGame.computers": { de: "Gegner", en: "Rivals" },
  "newGame.computersFull": { de: "Kein Platz mehr.", en: "No seats left." },
  "level.easy": { de: "Knappe", en: "Squire" },
  "level.medium": { de: "Ritter", en: "Knight" },
  "level.hard": { de: "Fürst", en: "Prince" },
  "level.easyText": {
    de: "Haushält karg und träge",
    en: "Rules lean and slow",
  },
  "level.mediumText": {
    de: "Ehrbar, doch ungeschliffen",
    en: "Sound, but unpolished",
  },
  "level.hardText": {
    de: "Meistert Abgaben, Korn und Bau",
    en: "Masters levies, grain and works",
  },
  "ai.demoted": {
    de: "{name} verlor durch zu hohe Abgaben einen Rang.",
    en: "{name} lost a rank to crushing levies.",
  },
  "ai.seized": {
    de: "Der Kaiser nahm {name} ein Kontor.",
    en: "The Emperor seized a counting-house from {name}.",
  },
  "ai.pawn": {
    de: "{name} musste Besitz verpfänden.",
    en: "{name} had to pawn possessions.",
  },
  "ai.deposedLand": {
    de: "{name} ward mangels Land ein Jahr abgesetzt.",
    en: "{name} was deposed a year for want of land.",
  },
  "ai.deposedTax": {
    de: "{name} ward wegen zu geringer Abgaben ein Jahr abgesetzt.",
    en: "{name} was deposed a year for meager levies.",
  },
  "ai.death": {
    de: "{name} verschied, der Erbe folgt.",
    en: "{name} has died, the heir succeeds.",
  },
  "newGame.name": { de: "Name", en: "Name" },
  "newGame.kingdom": { de: "Reich", en: "Realm" },
  "newGame.kingdomEmpty": { de: "Nennt Euer Reich", en: "Name thy realm" },
  "newGame.nameEmpty": { de: "Nennt Euren Namen", en: "Name thyself" },
  "newGame.nameTaken": { de: "Name schon vergeben", en: "Name already taken" },
  "newGame.chooseIcon": { de: "Wappen wählen", en: "Choose a crest" },

  "common.yes": { de: "JA", en: "AYE" },
  "common.no": { de: "NAY", en: "NAY" },
  "common.continue": { de: "Voran", en: "Onward" },
  "common.end": { de: "Ende", en: "End" },
  "common.back": { de: "Zurück", en: "Back" },
  "common.notEnough": { de: "Zu viel!", en: "Too much!" },
  "common.wait": { de: "Bitte wartet", en: "Pray wait" },

  "scroll.ruler": { de: "Euer Gnaden,", en: "Sire," },
  "scroll.regentM": { de: "Der Regent von", en: "The regent of" },
  "scroll.regentF": { de: "Die Regentin von", en: "The regent of" },

  "trade.title": { de: "Kontore", en: "Counting-houses" },
  "trade.wages": { de: "Sold", en: "Wages" },
  "trade.profit": { de: "Ertrag", en: "Yield" },
  "trade.total": { de: "Summe", en: "Total" },
  "trade.houses": { de: "Kontore", en: "Counting-houses" },
  "trade.servants": { de: "Gesinde", en: "Retainers" },
  "trade.hire": { de: "Anwerben", en: "Hire" },
  "trade.fire": { de: "Fortjagen", en: "Cast out" },
  "trade.noticeTitle": {
    de: "Handel in Eurer Abwesenheit",
    en: "Trade in thine absence",
  },
  "trade.noticeSold": {
    de: "{who} kaufte {units} {good} (+{money} Taler)",
    en: "{who} bought {units} {good} (+{money} taler)",
  },
  "trade.noticeBought": {
    de: "{who} verkaufte Euch {units} {good} (-{money} Taler)",
    en: "{who} sold thee {units} {good} (-{money} taler)",
  },
  "trade.noticeMore": { de: "… und {n} weitere", en: "… and {n} more" },
  "trade.tributeTitle": {
    de: "Der Kaiser fordert {zahl} Taler",
    en: "The Emperor demands {zahl} taler",
  },
  "trade.rent": {
    de: "Kontor kaufen ({price})",
    en: "Buy counting-house ({price})",
  },
  "trade.staffHint": {
    de: "Für Ertrag braucht es {need} Gesinde.",
    en: "Profit needs {need} retainers.",
  },
  "trade.staffHintRemake": {
    de: "Je Kontor {per} Gesinde: {staffed} von {hh} besetzt.",
    en: "{per} retainers per house: {staffed} of {hh} staffed.",
  },
  "trade.staffNoHouse": {
    de: "Noch kein Kontor gepachtet.",
    en: "No counting-house yet.",
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
    de: "Der Kaiser grollt",
    en: "The Emperor frowns",
  },
  "trade.verdictInsulted": {
    de: "Beleidigt: Enteignung",
    en: "Insulted: seizure",
  },
  "trade.expropriationTextRemake": {
    de: "Euer Tribut war Hohn: Der Kaiser nahm Euch ein Kontor.",
    en: "Thy tribute was an insult: the Emperor seized a counting-house.",
  },
  "trade.expropriation": { de: "Enteignung", en: "Seizure" },
  "trade.expropriationText": {
    de: "Wegen schlechten Handels verlort Ihr ein Kontor.",
    en: "For poor trading thou hast lost a counting-house.",
  },

  "grain.title": { de: "Korn", en: "Grain" },
  "grain.trade": { de: "Kornhandel", en: "Grain trade" },
  "partner.title": { de: "Handelsherr", en: "Merchant" },
  "partner.emperor": { de: "der Kaiser", en: "the Emperor" },
  "partner.pick": { de: "Euer Handelsherr", en: "Thy merchant" },
  "grain.rot": { de: "Korn verdorben:", en: "Grain spoiled:" },
  "grain.buy": { de: "Kaufen", en: "Buy" },
  "grain.sell": { de: "Verkaufen", en: "Sell" },
  "grain.howMuchBuy": {
    de: "Wie viel Korn kaufen?",
    en: "How much grain to buy?",
  },
  "grain.howMuchSell": {
    de: "Wie viel Korn verkaufen?",
    en: "How much grain to sell?",
  },
  "grain.stock": { de: "Vorrat", en: "Stock" },
  "grain.reserve": { de: "Kornspeicher", en: "Granary" },
  "grain.give": { de: "Spende", en: "Dole" },
  "grain.need": { de: "Nötig", en: "Needed" },
  "grain.exhausted": { de: "Speicher leer", en: "Granary empty" },
  "grain.distribution": { de: "Kornspende", en: "Grain dole" },
  "grain.tooLittle": { de: "Zu wenig", en: "Too little" },
  "grain.tooMuch": { de: "Zu viel", en: "Too much" },
  "grain.buyPrice": { de: "Preis / 500", en: "Price / 500" },
  "grain.giveMax": { de: "Höchstmaß (80%)", en: "Maximum (80%)" },
  "grain.giveMin": { de: "Mindestmaß (20%)", en: "Minimum (20%)" },
  "grain.giveNeeded": { de: "Nötiges Maß", en: "Needed amount" },
  "grain.giveCustom": { de: "Eigenes Maß", en: "Custom amount" },
  "weather.1": { de: "Orkan: Ernte dahin", en: "Hurricane: harvest lost" },
  "weather.2": { de: "Dürre: Ernte dahin", en: "Drought: harvest lost" },
  "weather.3": { de: "Sturm mindert Ernte", en: "Storm cuts the harvest" },
  "weather.4": { de: "Karge Ernte", en: "Poor harvest" },
  "weather.5": { de: "Gewöhnliche Ernte", en: "Common harvest" },
  "weather.6": { de: "Mittlere Ernte", en: "Fair harvest" },
  "weather.7": { de: "Milde Zeit, gute Ernte", en: "Mild days, good harvest" },
  "weather.8": { de: "Reiche Ernte", en: "Rich harvest" },
  "weather.9": { de: "Rekordernte!", en: "Record harvest!" },
  "weather.10": { de: "Sagenhafte Ernte!", en: "Legendary harvest!" },

  "land.title": { de: "Land", en: "Land" },
  "land.owns": { de: "Ihr besitzt:", en: "Thou ownest:" },
  "land.offer": { de: "Angebot:", en: "Offer:" },
  "land.building": { de: "Baugrund", en: "Building land" },
  "land.acre": { de: "Acker", en: "Acre" },
  "land.buy": { de: "Kaufen", en: "Buy" },
  "land.sell": { de: "Verkaufen", en: "Sell" },
  "land.shortageTitle": { de: "Landmangel", en: "Land shortage" },
  "land.shortageText": {
    de: "Wegen Landmangels verlort Ihr {muhl} Mühle(n) und {markt} Markt/Märkte.",
    en: "For want of land thou hast lost {muhl} mill(s) and {markt} market(s).",
  },
  "land.buyBuilding": { de: "Baugrund kaufen", en: "Buy building land" },
  "land.sellBuilding": { de: "Baugrund verkaufen", en: "Sell building land" },
  "land.buyAcre": { de: "Acker kaufen", en: "Buy acre" },
  "land.sellAcre": { de: "Acker verkaufen", en: "Sell acre" },
  "land.howMuchBuyBuilding": {
    de: "Wie viel Baugrund kaufen:",
    en: "How much building land to buy:",
  },
  "land.howMuchSellBuilding": {
    de: "Wie viel Baugrund verkaufen:",
    en: "How much building land to sell:",
  },
  "land.howMuchBuyAcre": {
    de: "Wie viel Acker kaufen:",
    en: "How much acre to buy:",
  },
  "land.howMuchSellAcre": {
    de: "Wie viel Acker verkaufen:",
    en: "How much acre to sell:",
  },

  "tax.title": { de: "Schatzkammer", en: "Treasury" },
  "tax.income": { de: "Einkünfte", en: "Income" },
  "tax.nextYear": { de: "Abgaben nächstes Jahr", en: "Next year's levies" },
  "tax.customs": { de: "Zoll", en: "Customs" },
  "tax.vat": { de: "Handelszins", en: "Trade levy" },
  "tax.incomeTax": { de: "Zehnt", en: "Tithe" },
  "tax.justice": { de: "Gericht", en: "Justice" },
  "tax.headTax": { de: "Kopfzins", en: "Poll tax" },
  "tax.buildingTax": { de: "Bauzins", en: "Building tax" },
  "tax.fines": { de: "Bußgelder", en: "Fines" },
  // JUSTIZ levels 1..4 (KAISER4:280), shown on the Taxes screen.
  "justice.1": { de: "Gnädig", en: "Merciful" },
  "justice.2": { de: "Bescheiden", en: "Modest" },
  "justice.3": { de: "Streng", en: "Harsh" },
  "justice.4": { de: "Gierig", en: "Greedy" },
  "tax.fed": { de: "Sättigung", en: "Fed" },
  "tax.forecast": { de: "Erwartet", en: "Expected" },
  "tax.mood": { de: "Laune", en: "Mood" },
  "tax.changeCustoms": { de: "Zoll", en: "Customs" },
  "tax.changeVat": { de: "Handelszins", en: "Trade levy" },
  "tax.changeIncome": { de: "Zehnt", en: "Tithe" },
  "tax.changeJustice": { de: "Gericht", en: "Justice" },

  "tradeData.title": { de: "Eure Angebote", en: "Thine offers" },
  "tradeData.price": { de: "Preis", en: "Price" },
  "tradeData.amount": { de: "Menge", en: "Amount" },

  "business.title": { de: "Hofbauten", en: "Court works" },
  "business.fortune": { de: "Taler", en: "Taler" },
  "business.market": { de: "Markt", en: "Market" },
  "business.mill": { de: "Mühle", en: "Mill" },
  "business.palace": { de: "Burg", en: "Castle" },
  "business.cathedral": { de: "Kathedrale", en: "Cathedral" },
  "business.interest": { de: "Zinsen", en: "Interest" },
  "business.noLand": {
    de: "Zu wenig Baugrund",
    en: "Not enough building land",
  },
  "business.pawn": { de: "Pfändung", en: "Seizure" },
  "business.pawnText": {
    de: "Eure Gläubiger pfändeten Euch wegen schlechter Haushaltung!",
    en: "Thy creditors seized thy goods for poor stewardship!",
  },
  "business.deposedLand": {
    de: "Schlechte Landpolitik",
    en: "Poor land policy",
  },
  "business.deposedLandText": {
    de: "Wegen schlechter Landpolitik wurdet Ihr ein Jahr des Amtes enthoben.",
    en: "For poor land policy thou wert deposed for a year.",
  },
  "business.deposedTax": {
    de: "Schlechte Abgabenpolitik",
    en: "Poor levy policy",
  },
  "business.deposedTaxText": {
    de: "Wegen schlechter Abgabenpolitik wurdet Ihr ein Jahr des Amtes enthoben.",
    en: "For poor levies thou wert deposed for a year.",
  },
  "business.demoted": { de: "ABGABENPOLITIK", en: "LEVY POLICY" },
  "business.demotedText": {
    de: "Wegen Eurer schlechten Abgabenpolitik wurdet Ihr zwei Jahre enthoben und im Rang gesenkt!",
    en: "For thy poor levies thou wert deposed two years and demoted!",
  },
  "business.death": { de: "Schlimme Kunde.", en: "Grim tidings." },
  "business.deathText": { de: "Ihr seid verschieden!", en: "Thou hast died!" },
  "business.deathHeir": {
    de: "Zum Glück habt Ihr einen Erben hinterlassen.",
    en: "Happily thou didst leave an heir.",
  },

  "coronation.text": {
    de: "{name} wird zum Kaiser gekrönt!",
    en: "{name} is crowned Emperor!",
  },

  "monument.palace": { de: "Burg vollendet", en: "Castle completed" },
  "monument.cathedral": {
    de: "Kathedrale vollendet",
    en: "Cathedral completed",
  },
  "promotion.title": {
    de: "{name} wurde zum {titleDat} von {kingdom} ernannt",
    en: "{name} was made {title} of {kingdom}",
  },

  "ranking.title": { de: "Rangfolge", en: "Order of rank" },
  "ranking.rank": { de: "#", en: "#" },
  "ranking.points": { de: "Punkte", en: "Points" },
  "ranking.fortune": { de: "Taler", en: "Taler" },
  "ranking.population": { de: "Volk", en: "Folk" },
  "ranking.acre": { de: "Acker", en: "Acre" },
  "ranking.building": { de: "Baugrund", en: "Building land" },
  "ranking.markets": { de: "Märkte", en: "Markets" },
  "ranking.mills": { de: "Mühlen", en: "Mills" },
  "ranking.cities": { de: "Städte", en: "Cities" },

  "highscore.title": { de: "Ruhmeshalle", en: "Hall of fame" },
  "highscore.header": {
    de: "PLATZ/STUFE  NAME        JAHR   PUNKTE",
    en: "RANK/TITLE  NAME        YEAR   POINTS",
  },

  "secret.title": { de: "Späher", en: "Spies" },
  "secret.guards": { de: "Büttel", en: "Wardens" },
  "secret.guardLevel": { de: "Büttel-Drill", en: "Warden drill" },
  "secret.saboteurLevel": { de: "Brandstifter-Drill", en: "Rogue drill" },
  "secret.saboteurs": { de: "Brandstifter", en: "Rogues" },
  "secret.priceGuards": { de: "Preis je Büttel", en: "Price per warden" },
  "secret.priceSaboteurs": {
    de: "Preis je Brandstifter",
    en: "Price per rogue",
  },
  "secret.hireGuards": { de: "Büttel anwerben", en: "Hire wardens" },
  "secret.hireSaboteurs": { de: "Brandstifter anwerben", en: "Hire rogues" },
  "secret.trainGuards": { de: "Büttel drillen", en: "Drill wardens" },
  "secret.trainSaboteurs": { de: "Brandstifter drillen", en: "Drill rogues" },
  "secret.operations": { de: "Heimliche Umtriebe", en: "Secret deeds" },
  "secret.hireGuardsHint": {
    de: "Büttel wehren Brandstifter ab. +1",
    en: "Wardens repel rogues. +1",
  },
  "secret.hireSaboteursHint": {
    de: "Brandstifter treffen Widersacher. +1",
    en: "Rogues strike foes. +1",
  },
  "secret.trainGuardsHint": {
    de: "Jeder Büttel wird um 1 stärker.",
    en: "Each warden gains 1 strength.",
  },
  "secret.trainSaboteursHint": {
    de: "Jeder Brandstifter wird um 1 stärker.",
    en: "Each rogue gains 1 strength.",
  },
  "secret.operationsHint": {
    de: "Einen Widersacher heimsuchen.",
    en: "Strike at a foe.",
  },
  "secret.target": { de: "Wen trifft es?", en: "Whom shall it strike?" },
  "secret.nobody": { de: "Niemand", en: "Nobody" },
  "secret.building": { de: "Ziel wählen", en: "Choose a target" },
  "secret.house": { de: "Kontor", en: "Counting-house" },
  "secret.palace": { de: "Burg", en: "Castle" },
  "secret.amount": { de: "Brandstifter", en: "Rogues" },
  "secret.success": { de: "Umtrieb gelungen!", en: "Deed done!" },
  "secret.failed": { de: "Umtrieb misslungen!", en: "Deed failed!" },

  "chronicle.title": { de: "Chronik", en: "Chronicle" },
  "chronicle.population": { de: "Volk", en: "Folk" },
  "chronicle.money": { de: "Taler", en: "Taler" },
  "chronicle.born": { de: "geboren", en: "born" },
  "chronicle.died": { de: "gestorben", en: "died" },
  "chronicle.immigrants": { de: "zugezogen", en: "arrived" },
  "chronicle.emigrants": { de: "abgewandert", en: "departed" },
  "chronicle.millProfit": { de: "Mühlenertrag", en: "mill yield" },
  "chronicle.marketProfit": { de: "Marktertrag", en: "market yield" },
  "chronicle.secretService": { de: "Späher-Sold", en: "spy wages" },
  "chronicle.peopleChange": { de: "Volk", en: "Folk" },
  "chronicle.moneyChange": {
    de: "Taler",
    en: "Taler",
  },

  "ui.ok": { de: "Wohlan", en: "Aye" },
  "ui.cancel": { de: "Verwerfen", en: "Forsake" },
  "ui.continue": { de: "Voran", en: "Onward" },

  "status.year": { de: "Jahr", en: "Year" },
  "status.population": { de: "Volk", en: "Folk" },
} as const satisfies Record<string, StringEntry>;

export type StringKey = keyof typeof STRINGS;
