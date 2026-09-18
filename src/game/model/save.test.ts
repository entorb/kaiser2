import { describe, expect, it } from "vitest";
import { createGameState } from "./constants";
import { deserialize, serialize } from "./save";
import { playerAt } from "./types";

describe("save", () => {
  it("round-trips a game state", () => {
    const state = createGameState(3);
    playerAt(state, 2).geld = 12345;
    state.jahr = 1712;
    const restored = deserialize(serialize(state));
    expect(restored?.jahr).toBe(1712);
    expect(restored?.players[2]?.geld).toBe(12345);
  });

  it("rejects corrupt input", () => {
    expect(deserialize("not json")).toBeNull();
    expect(deserialize(JSON.stringify({ version: 999 }))).toBeNull();
    const bad = createGameState(2);
    bad.sp = 5;
    expect(deserialize(serialize(bad))).toBeNull();
    bad.sp = 1;
    bad.turn = undefined as never;
    expect(deserialize(serialize(bad))).toBeNull();
  });
});
