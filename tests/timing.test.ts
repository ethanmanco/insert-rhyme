import { describe, expect, it } from "vitest";
import {
  ballPoint,
  beatPosition,
  clampBpm,
  MAX_BPM,
  MIN_BPM,
  secondsPerBeat,
  snap,
  stepFromTicks,
  swingDelay,
} from "../src/core/timing";

describe("clampBpm", () => {
  it("keeps tempos inside 70 to 160", () => {
    expect(clampBpm(40)).toBe(MIN_BPM);
    expect(clampBpm(200)).toBe(MAX_BPM);
    expect(clampBpm(92)).toBe(92);
    expect(clampBpm("101.6")).toBe(102);
  });

  it("falls back on unreadable input", () => {
    expect(clampBpm("fast", 90)).toBe(90);
    expect(clampBpm(null, 88)).toBe(88);
    expect(clampBpm(Number.NaN, 95)).toBe(95);
  });
});

describe("beat lengths", () => {
  it("a beat at 120 BPM is half a second", () => {
    expect(secondsPerBeat(120)).toBe(0.5);
    expect(secondsPerBeat(70)).toBeCloseTo(0.857, 3);
  });

  it("swing only delays the off sixteenths", () => {
    expect(swingDelay(0, 1, 120)).toBe(0);
    expect(swingDelay(2, 1, 120)).toBe(0);
    expect(swingDelay(1, 1, 120)).toBeCloseTo(0.125 / 3);
    expect(swingDelay(3, 0, 120)).toBe(0);
  });
});

describe("stepFromTicks", () => {
  it("reads the sixteenth from the transport tick count", () => {
    expect(stepFromTicks(0, 192)).toBe(0);
    expect(stepFromTicks(48, 192)).toBe(1);
    expect(stepFromTicks(192 * 4, 192)).toBe(16);
  });

  it("rounds tiny clock jitter to the nearest step instead of drifting", () => {
    expect(stepFromTicks(47.9999, 192)).toBe(1);
    expect(stepFromTicks(48.0001, 192)).toBe(1);
  });
});

describe("beatPosition", () => {
  it("splits beats into bar, beat and fraction", () => {
    expect(beatPosition(0)).toEqual({ bar: 0, beat: 0, frac: 0 });
    expect(beatPosition(5.25)).toEqual({ bar: 1, beat: 1, frac: 0.25 });
    expect(beatPosition(15.5)).toEqual({ bar: 3, beat: 3, frac: 0.5 });
  });

  it("stays exact far into a long session (no drift from repeated adding)", () => {
    // 2 hours at 160 BPM.
    const beats = 160 * 120 + 2.5;
    const pos = beatPosition(beats);
    expect(pos.bar * 4 + pos.beat + pos.frac).toBeCloseTo(beats, 9);
    expect(pos.beat).toBe(2);
  });
});

describe("ballPoint", () => {
  it("touches block N exactly on beat N", () => {
    for (let beat = 0; beat < 4; beat++) {
      const p = ballPoint({ bar: 0, beat, frac: 0 });
      expect(p.y).toBe(0);
      expect(p.x).toBe(beat);
    }
  });

  it("peaks halfway between beats", () => {
    expect(ballPoint({ bar: 0, beat: 1, frac: 0.5 })).toEqual({ x: 1.5, y: 1, wrap: false });
  });

  it("hops from the last block back to the first by the next downbeat", () => {
    const mid = ballPoint({ bar: 0, beat: 3, frac: 0.5 });
    expect(mid.wrap).toBe(true);
    expect(mid.x).toBe(1.5);
    const almost = ballPoint({ bar: 0, beat: 3, frac: 0.999 });
    expect(almost.x).toBeCloseTo(0, 2);
    expect(almost.y).toBeCloseTo(0, 2);
  });

  it("never leaves the row", () => {
    for (let t = 0; t < 8; t += 0.01) {
      const p = ballPoint(beatPosition(t));
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(3);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });
});

describe("snap", () => {
  it("moves in 4 pixel steps", () => {
    expect(snap(5)).toBe(4);
    expect(snap(7)).toBe(8);
    expect(snap(-1)).toBe(-0);
  });
});
