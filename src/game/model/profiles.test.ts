import { describe, expect, it } from "vitest";
import { parseProfiles } from "./profiles";

describe("parseProfiles", () => {
  it("keeps valid slots and nulls the rest", () => {
    const json = JSON.stringify([
      { name: "Anna", kingdom: "Anloor", portrait: 2 },
      { name: "x", kingdom: "y", portrait: 99 },
      "junk",
    ]);
    const list = parseProfiles(json);
    expect(list[0]).toEqual({ name: "Anna", kingdom: "Anloor", portrait: 2 });
    expect(list[1]).toBeNull();
    expect(list[2]).toBeNull();
    expect(list).toHaveLength(6);
  });

  it("survives missing or corrupt storage", () => {
    expect(parseProfiles(null).every((p) => p === null)).toBe(true);
    expect(parseProfiles("{oops").every((p) => p === null)).toBe(true);
  });
});
