import { describe, expect, it } from "vitest";
import * as Flow from "./flow";

type Call = [name: string, ...args: unknown[]];

function makeSwitcher() {
  const calls: Call[] = [];
  const push = (name: string, ...args: unknown[]) => {
    calls.push([name, ...args]);
  };
  return {
    calls,
    start: (scene: string, data?: object) => push("start", scene, data),
    stop: (scene: string) => push("stop", scene),
  };
}

describe("scene flow", () => {
  it("Menu → NewGame", () => {
    const s = makeSwitcher();
    Flow.toNewGame(s);
    expect(s.calls).toEqual([["start", "NewGame", undefined]]);
  });

  it("walks a ruler's turn through all phases", () => {
    const s = makeSwitcher();
    Flow.startTurn(s);
    Flow.toPartner(s);
    Flow.toGrain(s);
    Flow.toLand(s);
    Flow.toChronicle(s);
    Flow.toTaxes(s);
    Flow.toTradeData(s);
    Flow.toBusiness(s);
    Flow.nextTurn(s);
    expect(s.calls.map((c) => c[1])).toEqual([
      "TradingHouse",
      "TradePartner",
      "Grain",
      "Land",
      "Chronicle",
      "Taxes",
      "TradeData",
      "Business",
      "TradingHouse",
    ]);
  });

  it("shows the promotion screen with the new title", () => {
    const s = makeSwitcher();
    Flow.toPromotion(s, {
      name: "Anna",
      title: "Baron",
      portrait: 2,
      nextRanking: false,
    });
    expect(s.calls).toEqual([
      [
        "start",
        "Promotion",
        { name: "Anna", title: "Baron", portrait: 2, nextRanking: false },
      ],
    ]);
  });

  it("quitting returns to a fresh (non-pause) Menu", () => {
    const s = makeSwitcher();
    Flow.toMenu(s);
    expect(s.calls).toEqual([["start", "Menu", { pause: false }]]);
  });
});
