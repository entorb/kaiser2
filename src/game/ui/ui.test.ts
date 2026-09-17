import { describe, expect, it } from "vitest";
import { CANVAS_H, CANVAS_W, columns, frame, MARGIN } from "./layout";

describe("frame", () => {
  it("keeps header, content and action inside the canvas margins", () => {
    const { header, content, action } = frame();
    expect(header.x).toBe(MARGIN);
    expect(header.w).toBe(CANVAS_W - MARGIN * 2);
    expect(action.y + action.h).toBe(CANVAS_H - MARGIN);
    expect(content.y).toBeGreaterThan(header.y + header.h);
    expect(content.y + content.h).toBeLessThan(action.y);
  });
});

describe("columns", () => {
  it("splits a rect into equal columns with gaps", () => {
    const rect = { x: 0, y: 0, w: 300, h: 100 };
    const cols = columns(rect, 3, 30);
    expect(cols).toHaveLength(3);
    expect(cols[0].w).toBe(80);
    expect(cols[1].x).toBe(110);
    expect(cols[2].x).toBe(220);
    expect(cols[2].x + cols[2].w).toBe(300);
  });
});
