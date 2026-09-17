import { describe, expect, it } from "vitest";
import { parseAccessCounts, readGlobalGames, reportGameStart } from "./stats";

describe("stats", () => {
  it("reads a valid accesscounts number", () => {
    expect(parseAccessCounts({ accesscounts: 7 })).toBe(7);
    expect(parseAccessCounts({ accesscounts: 0 })).toBe(0);
  });

  it("rejects malformed bodies", () => {
    expect(parseAccessCounts({ accesscounts: "7" })).toBeNull();
    expect(parseAccessCounts({ accesscounts: Number.NaN })).toBeNull();
    expect(parseAccessCounts({})).toBeNull();
    expect(parseAccessCounts(null)).toBeNull();
    expect(parseAccessCounts("nope")).toBeNull();
  });

  it("returns null when the read request fails", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    expect(await readGlobalGames()).toBeNull();
    globalThis.fetch = original;
  });

  it("does not write in dev mode", () => {
    const original = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response(null, { status: 200 });
    };
    reportGameStart();
    globalThis.fetch = original;
    expect(called).toBe(false);
  });

  it("no-ops when fetch is unavailable", () => {
    const original = globalThis.fetch;
    (globalThis as unknown as { fetch?: typeof fetch }).fetch = undefined;
    expect(() => reportGameStart()).not.toThrow();
    globalThis.fetch = original;
  });
});
