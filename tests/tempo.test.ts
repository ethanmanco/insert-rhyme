import { describe, expect, it } from "vitest";
import { beatPhase, downbeat, estimateBpm, onsetEnvelope } from "../src/core/tempo";

const SR = 22050;

/** A synthetic beat: kick on 1 and 3, snare on 2 and 4, hats on every eighth, starting `offset` seconds in. */
function makeBeat(bpm: number, offset: number, seconds: number, seed = 1): Float32Array {
  const out = new Float32Array(Math.round(SR * seconds));
  let s = seed;
  const noise = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const beat = 60 / bpm;
  const add = (start: number, length: number, fn: (t: number) => number) => {
    const i0 = Math.round(start * SR);
    for (let i = 0; i < length * SR && i0 + i < out.length; i++) if (i0 + i >= 0) out[i0 + i]! += fn(i / SR);
  };
  for (let k = 0, t = offset; t < seconds; k++, t += beat / 2) {
    const onBeat = k % 2 === 0;
    const beatNo = (k / 2) % 4;
    add(t, 0.04, (x) => noise() * 0.15 * Math.exp(-x * 120)); // hat
    if (onBeat && (beatNo === 0 || beatNo === 2)) add(t, 0.3, (x) => Math.sin(2 * Math.PI * 55 * x) * 0.9 * Math.exp(-x * 12)); // kick
    if (onBeat && (beatNo === 1 || beatNo === 3)) add(t, 0.15, (x) => noise() * 0.5 * Math.exp(-x * 30)); // snare
  }
  return out;
}

const phaseError = (found: number, expected: number, period: number) => {
  const d = Math.abs(found - (expected % period));
  return Math.min(d, period - d);
};

describe("tempo finding", () => {
  for (const [bpm, offset] of [
    [92, 0.37],
    [140, 0.05],
    [75, 1.1],
    [128, 0.8],
  ] as const) {
    it(`finds ${bpm} BPM and where the beat falls`, () => {
      const env = onsetEnvelope(makeBeat(bpm, offset, 30), SR);
      const found = estimateBpm(env);
      expect(Math.abs(found - bpm)).toBeLessThanOrEqual(0.5);
      const phase = beatPhase(env, found);
      expect(phaseError(phase, offset, 60 / found)).toBeLessThan(0.015);
    });
  }

  it("snaps to a whole tempo when one fits", () => {
    const env = onsetEnvelope(makeBeat(100, 0.2, 30), SR);
    expect(estimateBpm(env)).toBe(100);
  });

  it("finds the downbeat from where the kicks land", () => {
    const bpm = 90;
    const offset = 0.3;
    const env = onsetEnvelope(makeBeat(bpm, offset, 30), SR);
    const phase = beatPhase(env, bpm);
    // Kick on 1 and 3 makes beats 0 and 2 the strongest: either reads as a bar start.
    expect([0, 2]).toContain(downbeat(env, bpm, phase));
  });

  it("copes with silence", () => {
    const env = onsetEnvelope(new Float32Array(SR * 5), SR);
    const bpm = estimateBpm(env);
    expect(bpm).toBeGreaterThanOrEqual(70);
    expect(bpm).toBeLessThanOrEqual(160);
  });
});
