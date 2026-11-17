import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEATS, beatById, DEFAULT_BEAT } from "../src/core/beats";
import { ownGain } from "../src/core/ownBeat";

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

  it("falls back to Dynamic, the default, for an unknown or removed id", () => {
    expect(DEFAULT_BEAT).toBe("dynamic");
    for (const id of ["nope", "phonk-remix", "trench-work", "kimura", undefined]) expect(beatById(id).id).toBe("dynamic");
  });

  it("are each credited in the README", () => {
    const readme = readFileSync("README.md", "utf8");
    for (const b of BEATS) expect(readme, b.id).toContain(`](${b.credit.url})`);
  });

  it("ship no loop files that no beat uses", () => {
    const files = readdirSync("public/beats").filter((f) => f.endsWith(".mp3"));
    expect(files.sort()).toEqual(BEATS.map((b) => b.file).sort());
  });

});

describe("own beat volume", () => {
  const tone = (amp: number) => Float32Array.from({ length: 44100 }, (_, i) => amp * Math.sin((2 * Math.PI * 55 * i) / 44100));

  it("turns a very loud song down to about the target", () => {
    const g = ownGain([tone(0.99), tone(0.99)]);
    // A full-scale sine is -3 dBFS RMS, so it comes down about 9 dB.
    expect(20 * Math.log10(g)).toBeCloseTo(-9, 0);
  });

  it("leaves quiet songs and silence alone", () => {
    expect(ownGain([tone(0.1)])).toBe(1);
    expect(ownGain([new Float32Array(1000)])).toBe(1);
  });
});
