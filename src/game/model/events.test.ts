import { describe, expect, it } from "vitest";
import { at } from "../lookup";
import { createGameState, createPlayer } from "./constants";
import { depose, die, expropriate, heirName, taxDemotion } from "./events";
import type { Rng } from "./types";
import { playerAt } from "./types";

/** RNG that returns a fixed sequence (cycling). */
function seq(...values: number[]): Rng {
  let i = 0;
  return () => at(values, i++ % values.length);
}

describe("taxDemotion", () => {
  it("demotes and suspends when the tax burden exceeds 80%", () => {
    const p = createPlayer("x", 1);
    p.mwst = 30;
    p.ein = 30;
    p.zoll = 30;
    p.titel = 3;
    p.punkte = 100;
    expect(taxDemotion(p)).toBe(true);
    expect(p.entHob).toBe(2);
    expect(p.titel).toBe(2);
    expect(p.punkte).toBe(85);
  });

  it("does nothing at 80% or below", () => {
    const p = createPlayer("x", 1);
    p.mwst = 30;
    p.ein = 30;
    p.zoll = 20;
    p.titel = 3;
    expect(taxDemotion(p)).toBe(false);
    expect(p.entHob).toBe(0);
    expect(p.titel).toBe(3);
  });
});

describe("depose", () => {
  it("suspends for a year and loses points", () => {
    const p = createPlayer("x", 1);
    p.titel = 3;
    p.punkte = 100;
    depose(p);
    expect(p.entHob).toBe(1);
    expect(p.punkte).toBe(70);
  });

  it("does not shorten a two-year demotion", () => {
    const p = createPlayer("x", 1);
    p.entHob = 2;
    p.titel = 3;
    depose(p);
    expect(p.entHob).toBe(2);
  });
});

describe("heirName", () => {
  it("numbers generations from the base name", () => {
    expect(heirName("Torben")).toBe("Torben II.");
    expect(heirName("Torben II.")).toBe("Torben III.");
    expect(heirName("Torben III.")).toBe("Torben IV.");
  });

  it("caps at the last suffix", () => {
    expect(heirName("Torben X.")).toBe("Torben X.");
  });
});

describe("die", () => {
  it("renames the heir and drops the rank", () => {
    const p = createPlayer("Torben", 1);
    p.titel = 3;
    p.tod = 0;
    die(p, seq(0.5, 0.5));
    expect(p.name).toBe("Torben II.");
    expect(p.titel).toBe(2);
    expect(p.tod).toBeGreaterThan(0);
  });
});

describe("expropriate", () => {
  it("confiscates a house when the ruler hoarded grain", () => {
    const state = createGameState(2);
    const p = playerAt(state, 1);
    const kaiser = playerAt(state, 0);
    const before = kaiser.hh;
    p.hh = 2;
    p.verkorn = 0;
    p.lkorn = 100000;
    // rand(6)=5 (event), rand(5000)=0 (hoarded), rand(5000)=0.
    expect(expropriate(state, 1, seq(0.999, 0, 0))).toBe(true);
    expect(p.hh).toBe(1);
    expect(kaiser.hh).toBe(before + 1);
  });

  it("takes no notice most of the time", () => {
    const state = createGameState(2);
    const p = playerAt(state, 1);
    p.hh = 2;
    p.lkorn = 100000;
    expect(expropriate(state, 1, seq(0))).toBe(false);
    expect(p.hh).toBe(2);
  });

  it("cannot confiscate from a ruler without houses", () => {
    const state = createGameState(2);
    playerAt(state, 1).hh = 0;
    expect(expropriate(state, 1, seq(0.999, 0, 0))).toBe(false);
  });
});
