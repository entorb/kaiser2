import { describe, expect, it } from "vitest";
import { createGameState } from "./constants";
import { advancePlayer, startRuler } from "./turn";

describe("advancePlayer", () => {
  it("moves to the next ruler", () => {
    const state = createGameState(3);
    state.sp = 1;
    advancePlayer(state);
    expect(state.sp).toBe(2);
    expect(state.jahr).toBe(1700);
  });

  it("rolls the year over after the last ruler", () => {
    const state = createGameState(2);
    state.sp = 2;
    advancePlayer(state);
    expect(state.sp).toBe(1);
    expect(state.jahr).toBe(1701);
  });

  it("ages and scores the ruler who starts the turn", () => {
    const state = createGameState(3);
    state.sp = 1;
    state.players[2].tod = 40;
    state.players[2].punkte = 5;
    advancePlayer(state);
    expect(state.players[2].tod).toBe(39);
    expect(state.players[2].punkte).toBe(6);
  });

  it("skips a deposed ruler and consumes the suspension", () => {
    const state = createGameState(2);
    state.sp = 1;
    state.players[2].entHob = 1;
    advancePlayer(state);
    expect(state.sp).toBe(1);
    expect(state.players[2].entHob).toBe(0);
  });

  it("does not age a skipped ruler", () => {
    const state = createGameState(2);
    state.sp = 1;
    state.players[1].tod = 40;
    state.players[1].punkte = 5;
    state.players[2].entHob = 1;
    state.players[2].tod = 40;
    state.players[2].punkte = 5;
    advancePlayer(state);
    expect(state.players[2].tod).toBe(40);
    expect(state.players[2].punkte).toBe(5);
    expect(state.players[1].tod).toBe(39);
    expect(state.players[1].punkte).toBe(6);
  });

  it("skips a two-year suspension one turn at a time", () => {
    const state = createGameState(2);
    state.sp = 1;
    state.players[2].entHob = 2;
    advancePlayer(state);
    expect(state.players[2].entHob).toBe(1);
    state.sp = 1;
    advancePlayer(state);
    expect(state.players[2].entHob).toBe(0);
  });

  it("never skips the only ruler", () => {
    const state = createGameState(1);
    state.players[1].entHob = 1;
    advancePlayer(state);
    expect(state.sp).toBe(1);
    expect(state.players[1].entHob).toBe(1);
  });
});

describe("startRuler", () => {
  it("ages and scores the current ruler", () => {
    const state = createGameState(2);
    state.sp = 2;
    state.players[2].tod = 40;
    state.players[2].punkte = 5;
    startRuler(state);
    expect(state.players[2].tod).toBe(39);
    expect(state.players[2].punkte).toBe(6);
  });
});
