import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEATS, beatById } from "../src/core/beats";

describe("built-in beats", () => {
  it("have unique ids", () => {
    expect(new Set(BEATS.map((b) => b.id)).size).toBe(BEATS.length);
    expect(BEATS.length).toBeGreaterThan(0);
  });

  for (const b of BEATS) {
    it(`${b.id}: has its loop file, a sane tempo and whole bars`, () => {
      const path = `public/beats/${b.file}`;
      expect(existsSync(path)).toBe(true);
      // Small enough for phones: well under 2 MB per loop.
      expect(statSync(path).size).toBeLessThan(2_000_000);
      expect(b.bpm).toBeGreaterThanOrEqual(60);
      expect(b.bpm).toBeLessThanOrEqual(180);
      expect(Number.isInteger(b.bars)).toBe(true);
      expect(b.bars).toBeGreaterThanOrEqual(8);
      expect(b.start).toBeGreaterThanOrEqual(0);
    });

    it(`${b.id}: is free to share, with a credit`, () => {
      expect(["CC0 1.0", "CC BY 3.0", "CC BY 4.0"]).toContain(b.credit.license);
      expect(b.credit.url).toMatch(/^https:\/\//);
      expect(b.credit.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(b.credit.artist.length).toBeGreaterThan(0);
    });
  }

  it("falls back to the first beat for an unknown id", () => {
    expect(beatById("nope")).toBe(BEATS[0]);
  });
});
