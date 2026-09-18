import { describe, expect, it } from "vitest";
import { createGameState } from "./constants";
import {
  buyCheapest,
  buyCost,
  dealPrice,
  MARKET,
  maxAfford,
  maxBuy,
  maxSale,
  refreshEmperorStock,
  sellProceeds,
  shownPrice,
  spareLand,
  tradeGrain,
  tradeLand,
  tradePrice,
  updateEmperorPrices,
} from "./trade";
import { playerAt } from "./types";

describe("emperor", () => {
  it("offers grain by weather and land by the roll", () => {
    const state = createGameState(1);
    state.wetter = 5;
    refreshEmperorStock(state, () => 0);
    const k = playerAt(state, 0);
    expect([k.verkorn, k.verAcker, k.verBau]).toEqual([40000, 0, 0]);
    refreshEmperorStock(state, () => 0.99);
    expect([k.verkorn, k.verAcker, k.verBau]).toEqual([40990, 18000, 18000]);
  });

  it("tracks the rulers' average price", () => {
    const state = createGameState(1);
    updateEmperorPrices(state, 1, () => 0);
    const k = playerAt(state, 0);
    expect([k.kpreis, k.apreis, k.lpreis]).toEqual([100, 2000, 2000]);
  });
});

describe("tradeGrain", () => {
  it("buys up to the partner's offer and pays the price per 500", () => {
    const state = createGameState(1);
    const p = playerAt(state, 1);
    const k = playerAt(state, 0);
    k.verkorn = 1000;
    k.kpreis = 100;
    p.geld = 1000;
    p.lkorn = 0;
    expect(tradeGrain(state, 1, 0, 5000)).toBe(1000); // capped by the offer
    expect([p.lkorn, p.geld, k.verkorn]).toEqual([1000, 800, 0]);
    expect(tradeGrain(state, 1, 0, 5000)).toBe(0); // nothing left
  });

  it("sells from the own stock and credits the partner's stock", () => {
    const state = createGameState(1);
    const p = playerAt(state, 1);
    const k = playerAt(state, 0);
    k.kpreis = 100;
    p.lkorn = 500;
    p.geld = 0;
    k.verkorn = 0;
    expect(tradeGrain(state, 1, 0, -2000)).toBe(500);
    expect([p.lkorn, p.geld, k.verkorn]).toEqual([0, 100, 500]);
  });
});

describe("tradeLand", () => {
  it("moves acre land at the price per 1000 ha", () => {
    const state = createGameState(1);
    const p = playerAt(state, 1);
    const k = playerAt(state, 0);
    k.apreis = 2000;
    k.verAcker = 3000;
    p.geld = 10000;
    const acker = p.acker;
    expect(tradeLand(state, 1, 0, "acker", 5000)).toBe(3000);
    expect([p.acker, p.geld]).toEqual([acker + 3000, 4000]);
    expect(tradeLand(state, 1, 0, "acker", -1000)).toBe(1000);
    expect(p.geld).toBe(6000);
  });
});

describe("remake trading rules", () => {
  const setup = () => {
    const state = createGameState(2, "remake");
    return { state, a: playerAt(state, 1), b: playerAt(state, 2) };
  };

  it("quotes one price both ways and shows land per 500 ha", () => {
    const { state } = setup();
    const k = playerAt(state, 0);
    k.kpreis = 87;
    k.lpreis = 2000;
    expect(tradePrice(state, 0, "grain")).toBe(87);
    expect(tradePrice(state, 0, "land")).toBe(2000);
    expect(shownPrice("grain", 87)).toBe(87);
    expect(shownPrice("land", 2000)).toBe(1000);
    expect(shownPrice("acker", 2135)).toBe(1068);
  });

  it("pays the quoted price less the impact when selling to the Emperor", () => {
    const { state, a } = setup();
    playerAt(state, 0).kpreis = 100;
    a.lkorn = 5000;
    a.geld = 0;
    tradeGrain(state, 1, 0, -5000);
    // 1000 at the quote, the unit price falls 6.25 % on average over the deal.
    expect(a.geld).toBe(941);
  });

  it("caps a sale to a ruler by his treasury, never to the Emperor", () => {
    const { state, a, b } = setup();
    a.lkorn = 100000;
    b.kpreis = 100;
    b.geld = 1000;
    expect(maxSale(state, 1, 2, "grain")).toBe(5000);
    expect(tradeGrain(state, 1, 2, -100000)).toBe(5000);
    expect(b.geld).toBeGreaterThanOrEqual(0);
    b.geld = 0;
    expect(tradeGrain(state, 1, 2, -100)).toBe(0);
    b.geld = -500; // debt: nothing sells
    expect(maxSale(state, 1, 2, "grain")).toBe(0);
    expect(maxSale(state, 1, 0, "grain")).toBe(95000);
  });

  it("caps land sales by the partner's treasury too", () => {
    const { state, a, b } = setup();
    b.lpreis = 2000;
    b.geld = 3999;
    a.land = 10000;
    expect(tradeLand(state, 1, 2, "land", -10000)).toBe(1999);
    expect(b.geld).toBeGreaterThanOrEqual(0);
  });

  it("does not cap sales under Atari rules", () => {
    const state = createGameState(2);
    const b = playerAt(state, 2);
    b.geld = 0;
    playerAt(state, 1).lkorn = 5000;
    expect(maxSale(state, 1, 2, "grain")).toBe(5000);
    expect(tradeGrain(state, 1, 2, -5000)).toBe(5000);
    expect(b.geld).toBeLessThan(0);
  });

  it("notes trades for an absent human, not for computers or Atari", () => {
    const { state, a, b } = setup();
    b.geld = 10000;
    b.verkorn = 1000;
    b.lkorn = 1000;
    b.kpreis = 100;
    a.name = "Anna";
    tradeGrain(state, 1, 2, 500);
    expect(b.notices).toEqual([
      { who: "Anna", good: "grain", sold: true, units: 500, money: 100 },
    ]);
    tradeLand(state, 1, 2, "land", -1000);
    expect(b.notices?.[1]).toMatchObject({ good: "land", sold: false });
    const c = playerAt(state, 2);
    c.notices = undefined;
    c.ai = "easy";
    tradeGrain(state, 1, 2, 500);
    expect(c.notices).toBeUndefined();
    tradeGrain(state, 1, 0, 500);
    expect(playerAt(state, 0).notices).toBeUndefined();
    const atari = createGameState(2);
    tradeGrain(atari, 1, 2, 500);
    expect(playerAt(atari, 2).notices).toBeUndefined();
  });

  it("gives no point for a big grain purchase, Atari still does", () => {
    const { state, a, b } = setup();
    b.verkorn = 60000;
    b.lkorn = 60000;
    a.geld = 1e6;
    tradeGrain(state, 1, 2, 60000);
    expect(a.punkte).toBe(0);
    const atari = createGameState(2);
    playerAt(atari, 2).verkorn = 60000;
    playerAt(atari, 2).lkorn = 60000;
    playerAt(atari, 1).geld = 1e6;
    tradeGrain(atari, 1, 2, 60000);
    expect(playerAt(atari, 1).punkte).toBe(1);
  });
});

describe("remake market", () => {
  const setup = () => {
    const state = createGameState(3, "remake");
    return { state, k: playerAt(state, 0) };
  };

  it("prices the Emperor by his stock, Atari does not", () => {
    const { state, k } = setup();
    const normal = MARKET.emperorGrain * 5.5 + 500;
    const quote = (stock: number) => {
      k.verkorn = stock;
      k.verAcker = 9000;
      k.verBau = 9000;
      updateEmperorPrices(state, 1, () => 0);
      return [k.kpreis, k.apreis];
    };
    expect(quote(normal)).toEqual([100, 2000]); // normal stock
    expect(quote(5000)[0]).toBe(132); // +32 %: he is short
    expect(quote(0)[0]).toBe(135); // capped at +35 %
    expect(quote(40000)[0]).toBe(85); // glut: capped at -15 %
    k.verAcker = 0;
    updateEmperorPrices(state, 1, () => 0);
    expect(k.apreis).toBe(2700);
    const atari = createGameState(3);
    playerAt(atari, 0).verkorn = 3000;
    updateEmperorPrices(atari, 1, () => 0);
    expect(playerAt(atari, 0).kpreis).toBe(100);
  });

  it("ignores the trader's own prices", () => {
    const { state, k } = setup();
    playerAt(state, 1).kpreis = 200;
    playerAt(state, 2).kpreis = 100;
    playerAt(state, 3).kpreis = 100;
    k.verkorn = MARKET.emperorGrain * 5.5 + 500;
    updateEmperorPrices(state, 1, () => 0);
    expect(k.kpreis).toBe(100);
    updateEmperorPrices(state, 2, () => 0); // rival 1 posted 200
    expect(k.kpreis).toBe(150);
  });

  it("has a computer deal with one partner: the cheapest that fills the want", () => {
    const { state, k } = setup();
    const human = playerAt(state, 2);
    const cpu = playerAt(state, 1);
    cpu.ai = "easy";
    cpu.geld = 1000;
    k.kpreis = 100;
    k.verkorn = 1e6;
    k.lkorn = 1e6;
    human.kpreis = 80;
    human.verkorn = 1000;
    human.lkorn = 1000;
    human.geld = 0;
    // The human is cheaper and fills 1000; the deal pays the impact surcharge.
    expect(buyCheapest(state, 1, "grain", 1000, 1000)).toBe(1000);
    expect([human.verkorn, human.geld]).toEqual([0, 162]);
    expect(cpu.geld).toBe(1000 - 162);
    expect(human.notices).toHaveLength(1);
    // Nobody splits: the Emperor alone fills what the cash allows.
    human.verkorn = 1000;
    cpu.geld = 1000;
    expect(buyCheapest(state, 1, "grain", 5000, 1000)).toBe(4721);
    expect(human.verkorn).toBe(1000);
    // A partner who fills the whole want beats a cheaper one who cannot.
    human.verkorn = 500;
    cpu.geld = 1e6;
    expect(buyCheapest(state, 1, "grain", 1000, 1e6)).toBe(1000);
    expect(human.verkorn).toBe(500);
  });

  it("moves the price with the size of a deal, Atari does not", () => {
    const { state, k } = setup();
    k.kpreis = 100;
    // 20000 grain at 100 per 500 = 4000; impact 0.5 per 20000 pays +25 % on average.
    expect(buyCost(state, 0, "grain", 20000)).toBe(5000);
    expect(buyCost(state, 0, "grain", 500)).toBeCloseTo(100.625);
    k.apreis = 2000;
    expect(buyCost(state, 0, "acker", 5000)).toBe(12500);
    // Selling the same lowers the price by the same factor.
    expect(sellProceeds(state, 0, "grain", 20000)).toBe(3200);
    const atari = createGameState(3);
    playerAt(atari, 0).kpreis = 100;
    expect(buyCost(atari, 0, "grain", 20000)).toBe(4000);
    expect(sellProceeds(atari, 0, "grain", 20000)).toBe(4000);
    expect(maxAfford(atari, 0, "grain", 4000)).toBe(20000);
  });

  it("shows the average price of the deal, per 500", () => {
    const { state, k } = setup();
    k.kpreis = 100;
    k.apreis = 2000;
    expect(dealPrice(state, 0, "grain", 0)).toBe(100);
    expect(dealPrice(state, 0, "acker", 0)).toBe(1000);
    expect(dealPrice(state, 0, "grain", 20000)).toBe(125); // +25 % on average
    expect(dealPrice(state, 0, "grain", -20000)).toBe(80); // -20 %
    expect(dealPrice(state, 0, "acker", 5000)).toBe(1250);
  });

  it("finds what the cash buys despite the rising price", () => {
    const { state, k } = setup();
    k.kpreis = 100;
    const n = maxAfford(state, 0, "grain", 5000);
    expect(n).toBe(20000);
    expect(buyCost(state, 0, "grain", n)).toBeLessThanOrEqual(5000);
    expect(buyCost(state, 0, "grain", n + 1)).toBeGreaterThan(5000);
    expect(maxAfford(state, 0, "grain", 0)).toBe(0);
  });

  it("keeps the Emperor as the only seller under Atari rules", () => {
    const state = createGameState(2);
    const human = playerAt(state, 2);
    human.kpreis = 50;
    human.verkorn = 1000;
    human.lkorn = 1000;
    playerAt(state, 1).geld = 1e6;
    playerAt(state, 0).verkorn = 1000;
    buyCheapest(state, 1, "grain", 500, 1e6);
    expect(human.verkorn).toBe(1000);
  });
});

describe("land that keeps buildings and the realm", () => {
  const setup = () => {
    const state = createGameState(2, "remake");
    const a = playerAt(state, 1);
    Object.assign(a, {
      leute: 1000,
      land: 12000,
      acker: 20000,
      markt: 5,
      muhl: 10,
    });
    return { state, a, b: playerAt(state, 2) };
  };

  it("keeps building land for mills and markets, and 10 ha per head", () => {
    const { a } = setup();
    // 10 mills keep 10000 of the 12000 ha building land.
    expect(spareLand(a, "land")).toBe(2000);
    expect(spareLand(a, "acker")).toBe(20000);
    a.acker = 1000; // 10 ha per head leaves room for 3000, the mills for 2000
    expect(spareLand(a, "land")).toBe(2000);
    a.land = 10000;
    expect(spareLand(a, "land")).toBe(0);
    a.land = 12000;
    a.acker = 0; // nothing to spare in acre land
    expect(spareLand(a, "acker")).toBe(0);
    expect(spareLand(a, "land")).toBe(2000);
  });

  it("caps own sales, even to the Emperor, and purchases from a ruler", () => {
    const { state, a, b } = setup();
    expect(maxSale(state, 1, 0, "land")).toBe(2000);
    expect(tradeLand(state, 1, 0, "land", -9000)).toBe(2000);
    expect(a.land).toBe(10000);
    expect(a.muhl).toBe(10);
    b.geld = 1e6;
    a.land = 12000;
    a.verBau = 6000;
    expect(maxBuy(state, 1, "land")).toBe(2000);
    expect(tradeLand(state, 2, 1, "land", 6000)).toBe(2000);
    expect(tradeLand(state, 2, 1, "land", 6000)).toBe(0);
    // The Emperor's stock is not limited by his holdings.
    expect(maxBuy(state, 0, "land")).toBe(playerAt(state, 0).verBau);
  });

  it("does not limit Atari rulers", () => {
    const state = createGameState(2);
    const a = playerAt(state, 1);
    Object.assign(a, { leute: 1000, land: 12000, muhl: 10 });
    expect(maxSale(state, 1, 0, "land")).toBe(12000);
  });
});
