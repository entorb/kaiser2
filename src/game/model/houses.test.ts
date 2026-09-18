import { describe, expect, it } from "vitest";
import { createGameState } from "./constants";
import { expropriate } from "./events";
import {
  canLeaseHouse,
  crewNeeded,
  houseProfit,
  leaseHouse,
  leasePrice,
  remakeTribute,
  staffedHouses,
  tributePoints,
  tributeVerdict,
} from "./houses";
import { tradeHouse } from "./rules";
import { playerAt } from "./types";

describe("remake trading houses", () => {
  it("staffs houses fractionally up to the houses owned", () => {
    const p = playerAt(createGameState(1, "remake"), 1);
    p.hh = 3;
    p.bd = 12;
    expect(staffedHouses(p)).toBe(1.5);
    p.bd = 100;
    expect(staffedHouses(p)).toBe(3);
    p.bd = 0;
    expect(staffedHouses(p)).toBe(0);
  });

  it("pays a predictable profit that follows the weather, no RAND", () => {
    const state = createGameState(1, "remake");
    const p = playerAt(state, 1);
    p.hh = 2;
    p.bd = 8; // one staffed house
    state.wetter = 5;
    expect(houseProfit(state, p)).toBe(1050); // 700 + 70*5
    state.wetter = 10;
    expect(houseProfit(state, p)).toBe(1400);
    // tradeHouse consumes RAND only for the tribute term, none for profit
    expect(tradeHouse(state, 1, () => 0).gew).toBe(1400);
  });

  it("asks for a full crew in Remake, Atari's 5*HH+1 otherwise", () => {
    const p = playerAt(createGameState(1), 1);
    expect(crewNeeded(p, "remake")).toBe(0);
    p.hh = 4;
    expect(crewNeeded(p, "remake")).toBe(32);
    expect(crewNeeded(p, "atari")).toBe(21);
  });
});

describe("remake tribute", () => {
  const realm = () => {
    const state = createGameState(1, "remake");
    state.jahr = 1701; // no Emperor pool reroll, so no RAND at all
    const p = playerAt(state, 1);
    p.leute = 1000;
    p.markt = 10;
    p.muhl = 10;
    p.titel = 2;
    return { state, p };
  };

  it("takes a quarter of the profit plus dues, without wealth surcharge", () => {
    const { p } = realm();
    // 0.25*5400 + 1200 + 100 + 150 + 300
    expect(remakeTribute(p, 5400)).toBe(3100);
  });

  it("demands it in tradeHouse with no random term", () => {
    const { state, p } = realm();
    p.hh = 5;
    p.bd = 40; // five staffed houses, profit 5 * 1050
    const boom = () => {
      throw new Error("no RAND expected");
    };
    const r = tradeHouse(state, 1, boom);
    expect(r.gew).toBe(5250);
    expect(r.zahl).toBe(3062); // 1312.5 + 1200 + 100 + 150 + 300
  });

  it("judges the paid share on a visible ladder", () => {
    const cases: [number, string, number, boolean][] = [
      [1000, "pleased", 1, false],
      [2500, "pleased", 1, false], // more than the demand earns nothing
      [500, "tolerated", 0, false],
      [499, "displeased", -1, false],
      [200, "displeased", -1, false],
      [199, "insulted", -3, true],
    ];
    for (const [paid, verdict, points, seize] of cases)
      expect(tributeVerdict(paid, 1000)).toEqual({ verdict, points, seize });
  });

  it("keeps the Atari coin flip under the Atari rules", () => {
    const atari = createGameState(1);
    expect(tributePoints(atari, 4000, 3000, () => 0.99)).toBe(2);
    expect(tributePoints(atari, 4000, 3000, () => 0)).toBe(-1);
    const remake = createGameState(1, "remake");
    expect(tributePoints(remake, 4000, 3000, () => 0)).toBe(1);
  });

  it("seizes a house for certain after an insult, never otherwise", () => {
    const { state, p } = realm();
    p.hh = 2;
    state.turn.zahl = 1000;
    state.turn.abg = 100;
    expect(expropriate(state, 1, () => 0.99)).toBe(true);
    expect(p.hh).toBe(1);
    state.turn.abg = 1000;
    expect(expropriate(state, 1, () => 0)).toBe(false);
    state.turn.abg = 0;
    p.hh = 0; // nothing left to take
    expect(expropriate(state, 1, () => 0)).toBe(false);
  });
});

describe("leasing a house", () => {
  it("costs 5000 flat in Atari, 1000 more per house owned in Remake", () => {
    const p = playerAt(createGameState(1), 1);
    p.hh = 3;
    expect(leasePrice(p, "atari")).toBe(5000);
    expect(leasePrice(p, "remake")).toBe(8000);
  });

  it("needs the full price and a house left in the Emperor's pool", () => {
    const state = createGameState(1, "remake");
    const p = playerAt(state, 1);
    const kaiser = playerAt(state, 0);
    kaiser.hh = 2;
    p.hh = 2; // price 7000
    p.geld = 6999;
    expect(leaseHouse(state, 1)).toBe(false);
    p.geld = 7000;
    p.punkte = 0;
    expect(canLeaseHouse(state, 1)).toBe(true);
    expect(leaseHouse(state, 1)).toBe(true);
    expect([p.geld, p.hh, kaiser.hh, p.punkte]).toEqual([0, 3, 1, 1.3]);
    kaiser.hh = 0;
    p.geld = 99999;
    expect(leaseHouse(state, 1)).toBe(false);
  });
});
