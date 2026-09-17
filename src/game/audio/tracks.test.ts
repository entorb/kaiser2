import { describe, expect, it } from "vitest";
import { BLIPS, COINS, TRACKS, trackForScene } from "./tracks";

describe("score data", () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    it(`${name} is playable`, () => {
      expect(track.bpm).toBeGreaterThan(0);
      expect(track.loopBeats).toBeGreaterThan(0);
      expect(track.notes.length).toBeGreaterThan(0);
      for (const note of track.notes) {
        expect(note.midi).toBeGreaterThanOrEqual(36);
        expect(note.midi).toBeLessThanOrEqual(96);
        expect(note.dur).toBeGreaterThan(0);
        expect(note.beat).toBeGreaterThanOrEqual(0);
        expect(note.beat + note.dur).toBeLessThanOrEqual(track.loopBeats);
      }
    });

    it(`${name} notes are sorted by beat`, () => {
      const beats = track.notes.map((n) => n.beat);
      expect(beats).toEqual([...beats].sort((a, b) => a - b));
    });
  }
});

describe("trackForScene", () => {
  it("uses the menu theme on the title screens", () => {
    expect(trackForScene("Menu")).toBe("menu");
    expect(trackForScene("NewGame")).toBe("menu");
    expect(trackForScene("Highscore")).toBe("menu");
  });

  it("uses the gameplay theme during a turn", () => {
    for (const key of [
      "TradingHouse",
      "Partner",
      "Grain",
      "Land",
      "Chronicle",
      "Taxes",
      "TradeData",
      "Business",
      "Promotion",
      "Ranking",
      "SecretService",
    ]) {
      expect(trackForScene(key)).toBe("game");
    }
  });

  it("stays silent on boot and unknown scenes", () => {
    expect(trackForScene("Boot")).toBeNull();
    expect(trackForScene("Backdrop")).toBeNull();
    expect(trackForScene("nope")).toBeNull();
  });
});

describe("blips", () => {
  it("are audible", () => {
    for (const blip of Object.values(BLIPS)) {
      expect(blip.freq).toBeGreaterThan(0);
      expect(blip.dur).toBeGreaterThan(0);
      expect(blip.gain).toBeGreaterThan(0);
    }
  });
});

describe("coin clink", () => {
  it("has audible, staggered partials", () => {
    expect(COINS.length).toBeGreaterThan(0);
    for (const part of COINS) {
      expect(part.freq).toBeGreaterThan(0);
      expect(part.dur).toBeGreaterThan(0);
      expect(part.gain).toBeGreaterThan(0);
      expect(part.delay).toBeGreaterThanOrEqual(0);
    }
  });
});
