import { describe, expect, it } from "vitest";
import { createGameState, createPlayer } from "./constants";
import {
  chronicle,
  cities,
  distributeGuards,
  grainBounds,
  guardsInBuilding,
  harvest,
  highscoreValue,
  landShortage,
  resolveSabotage,
  stateIncome,
  titleAdvance,
  tradeHouse,
} from "./rules";
import type { Rng } from "./types";

/** RNG that returns a fixed sequence (cycling). */
function seq(...values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("harvest", () => {
  it("computes stock, rot and the people's need", () => {
    const state = createGameState(1);
    const r = harvest(state, 1, seq(0, 0, 0, 0));
    const p = state.players[1];
    expect(r.faul).toBe(1);
    expect(r.weather).toBe(1);
    // backer = min(10000, 500/5) = 100
    // korn = 100*1.9 + (10000/10)*1 + 1 = 1191
    expect(r.harvest).toBeCloseTo(1191, 5);
    // fixed rot: 15000*99/100 + 1191
    expect(p.lkorn).toBeCloseTo(16041, 5);
    expect(r.vkorn).toBe(11001);
  });

  it("reports weather on the state", () => {
    const state = createGameState(1);
    harvest(state, 1, seq(0.999, 0.999, 0.999, 0.999));
    expect(state.wetter).toBe(10);
  });
});

describe("grainBounds", () => {
  it("returns 20% and 80% of the stock", () => {
    const p = createPlayer("x", 1);
    p.lkorn = 1000;
    expect(grainBounds(p)).toEqual({ p20: 200, p80: 800 });
  });
});

describe("landShortage", () => {
  it("keeps markets/mills when the land still covers them", () => {
    const p = createPlayer("x", 1);
    p.land = 5000;
    p.markt = 8; // 5000/600 = 8
    p.muhl = 5; // 5000/1000 = 5
    expect(landShortage(p)).toEqual({ markt: 0, muhl: 0 });
    expect(p.markt).toBe(8);
    expect(p.muhl).toBe(5);
  });

  it("razes the surplus when land drops below the ratio", () => {
    const p = createPlayer("x", 1);
    p.land = 1000;
    p.markt = 8;
    p.muhl = 5;
    // floor(1000/600)=1 market, floor(1000/1000)=1 mill may stay.
    expect(landShortage(p)).toEqual({ markt: 7, muhl: 4 });
    expect(p.markt).toBe(1);
    expect(p.muhl).toBe(1);
  });
});

describe("cities", () => {
  it("counts cities covered by both markets and mills", () => {
    const p = createPlayer("x", 1);
    p.markt = 10;
    p.muhl = 6;
    expect(cities(p)).toBe(3); // min(2, 2) + 1
  });
});

describe("guards", () => {
  it("spreads the guards over the buildings", () => {
    const p = createPlayer("x", 1);
    p.muhl = 2;
    p.infant = 2;
    const layout = distributeGuards(p, seq(0, 0.99));
    expect(layout.muhl).toEqual([1, 1]);
    expect(guardsInBuilding(layout, "muhl")).toBe(1);
  });

  it("reports no guards for a building the ruler does not own", () => {
    const p = createPlayer("x", 1);
    p.muhl = 1;
    const layout = distributeGuards(p, seq(0));
    expect(guardsInBuilding(layout, "markt")).toBe(0);
  });
});

describe("chronicle", () => {
  it("applies births, deaths and migration to the population", () => {
    const state = createGameState(1);
    state.turn.kaus = 10000;
    state.turn.vkorn = 10000;
    const p = state.players[1];
    const before = p.leute;
    const r = chronicle(state, 1, seq(0, 0, 0, 0, 0, 0));
    expect(r.einw).toBe(0); // (kaus-vkorn)/1300 = 0
    expect(p.leute).toBe(before + r.geb - r.ges);
  });
});

describe("tradeHouse", () => {
  it("demands tribute and only profits when overstaffed", () => {
    const state = createGameState(1);
    const p = state.players[1];
    p.hh = 10;
    p.bd = 60; // > hh*5 -> profit
    p.leute = 500;
    const r = tradeHouse(state, 1, seq(0, 0));
    expect(r.gew).toBeGreaterThan(0);
    expect(r.zahl).toBeGreaterThan(0);
  });

  it("gives no profit when understaffed", () => {
    const state = createGameState(1);
    const p = state.players[1];
    p.hh = 10;
    p.bd = 20; // < hh*5
    const r = tradeHouse(state, 1, seq(0, 0));
    expect(r.gew).toBe(0);
  });

  it("profits with a single house at the manual's ~6 servants", () => {
    const state = createGameState(1);
    const p = state.players[1];
    p.hh = 1;
    p.bd = 6; // INT(1 - 6/5) = -1 -> one staffed house
    const r = tradeHouse(state, 1, seq(0, 0, 0));
    expect(r.gew).toBe(200);
  });
});

describe("stateIncome", () => {
  it("scales with trade volume and tax rates", () => {
    const state = createGameState(1);
    state.mg1 = 1000;
    state.mg2 = 1000;
    const p = state.players[1];
    p.zoll = 25;
    p.ein = 5;
    p.mwst = 10;
    const se = stateIncome(state, 1, seq(0));
    // (2000/100)*(25+5+10) + 0 = 800
    expect(se).toBe(800);
  });
});

describe("titleAdvance", () => {
  it("promotes when score and money allow", () => {
    const state = createGameState(1);
    const p = state.players[1];
    p.punkte = 1000;
    p.geld = 1;
    expect(titleAdvance(state, 1)).toBe(false);
    expect(p.titel).toBe(1);
  });

  it("wins at rank 8 with full castle and cathedral", () => {
    const state = createGameState(1);
    const p = state.players[1];
    p.titel = 7;
    p.punkte = 100000;
    p.geld = 1;
    p.dom = 20;
    p.burg = 15;
    expect(titleAdvance(state, 1)).toBe(true);
    expect(p.titel).toBe(8);
  });
});

describe("highscoreValue", () => {
  it("scores holdings and penalises war", () => {
    const p = createPlayer("x", 1);
    p.leute = 100;
    p.krieg = 2;
    expect(highscoreValue(p, 1700)).toBe(200 * 200 + 100 * 100 - 2 * 200);
  });
});

describe("resolveSabotage", () => {
  it("wins when the attacker is stronger", () => {
    const a = createPlayer("a", 1);
    const d = createPlayer("d", 2);
    a.manov = 1;
    d.kavall = 1;
    const r = resolveSabotage(a, d, 10, 5, seq(0, 0));
    expect(r.success).toBe(true);
    expect(r.attackerStrength).toBe(10);
    expect(r.defenderStrength).toBe(5);
  });
});
