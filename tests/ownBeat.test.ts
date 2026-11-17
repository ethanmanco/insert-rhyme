import { describe, expect, it } from "vitest";
import { doubleTempo, halfTempo, shiftBeats, syncFromTaps } from "../src/core/ownBeat";
import { barsIn } from "../src/audio/engine";

describe("fixing an own beat's grid", () => {
  const g = { bpm: 90, start: 0.4 };
  const beat = 60 / 90;

  it("halves and doubles the tempo", () => {
    expect(halfTempo(g).bpm).toBe(45);
    expect(doubleTempo(g).bpm).toBe(180);
  });

  it("moves bar 1 by whole beats and wraps inside the first bar", () => {
    expect(shiftBeats(g, 1).start).toBeCloseTo(0.4 + beat);
    expect(shiftBeats(g, -1).start).toBeCloseTo(0.4 - beat + 4 * beat);
    expect(shiftBeats(g, 4).start).toBeCloseTo(0.4);
  });

  it("counts whole bars after bar 1", () => {
    // 4 bars at 90 BPM is 10.67 s.
    expect(barsIn(11, 90, 0.2)).toBe(4);
    expect(barsIn(1, 90, 0)).toBe(1);
  });
});

describe("tap to sync", () => {
  it("finds the real tempo and beat from taps", () => {
    // The grid thinks 90 BPM from 0.4 s, but the song is 100 BPM with beats at 0.25 + k * 0.6 s.
    const g = { bpm: 90, start: 0.4 };
    const old = 60 / 90;
    const real = (k: number) => 0.25 + k * 0.6;
    // Where those beats sit on the old grid, in old beats (as the bar view would report them).
    const taps = [8, 9, 10, 11, 12, 13, 14, 15].map((k) => (real(k) - g.start) / old);
    const fixed = syncFromTaps(g, taps, 64)!;
    expect(fixed.bpm).toBeCloseTo(100, 1);
    const offBeat = (((fixed.start - 0.25) / 0.6) % 1 + 1) % 1;
    expect(Math.min(offBeat, 1 - offBeat)).toBeLessThan(0.02);
  });

  it("shrugs off a sloppy tap", () => {
    const g = { bpm: 100, start: 0.25 };
    const taps = [4, 5, 6.08, 7, 8, 9, 10];
    const fixed = syncFromTaps(g, taps, 64)!;
    expect(fixed.bpm).toBeCloseTo(100, 0);
  });

  it("needs a few taps first", () => {
    expect(syncFromTaps({ bpm: 90, start: 0 }, [1, 2], 64)).toBeNull();
  });
});
