import { describe, expect, it } from "vitest";
import { DRUM_IDS, SYNTH_IDS } from "../src/audio/steplab/types";
import { BEATS, beatSteps, eventsAt } from "../src/core/beats";
import { MAX_BPM, MIN_BPM } from "../src/core/timing";

describe("built-in beats", () => {
  it("have unique ids and tempos inside the slider range", () => {
    expect(new Set(BEATS.map((b) => b.id)).size).toBe(BEATS.length);
    for (const b of BEATS) {
      expect(b.bpm).toBeGreaterThanOrEqual(MIN_BPM);
      expect(b.bpm).toBeLessThanOrEqual(MAX_BPM);
      expect(b.swing).toBeGreaterThanOrEqual(0);
      expect(b.swing).toBeLessThanOrEqual(1);
    }
  });

  it("have a drum pattern of exactly one character per step, in x, o and .", () => {
    for (const b of BEATS) {
      for (const line of b.drums) {
        expect(line.pattern).toHaveLength(beatSteps(b));
        expect(line.pattern).toMatch(/^[xo.]+$/);
        expect(DRUM_IDS).toContain(line.drum);
      }
    }
  });

  it("keep every note inside the loop", () => {
    for (const b of BEATS) {
      for (const part of b.parts) {
        expect(SYNTH_IDS).toContain(part.synth);
        for (const e of part.events) {
          expect(e.step).toBeGreaterThanOrEqual(0);
          expect(e.step + e.length).toBeLessThanOrEqual(beatSteps(b));
          expect(e.notes.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("land a kick on the first downbeat", () => {
    for (const b of BEATS) {
      expect(eventsAt(b, 0).drums.map((d) => d.drum).some((d) => d.startsWith("kick"))).toBe(true);
    }
  });
});

describe("eventsAt", () => {
  const beat = BEATS[0]!;

  it("wraps steps past the end of the loop", () => {
    const steps = beatSteps(beat);
    expect(eventsAt(beat, steps + 4)).toEqual(eventsAt(beat, 4));
    expect(eventsAt(beat, steps * 50 + 12)).toEqual(eventsAt(beat, 12));
  });

  it("reads soft hits quieter than full ones", () => {
    const soft = eventsAt(beat, 2).drums.find((d) => d.drum === "chat");
    const full = eventsAt(beat, 0).drums.find((d) => d.drum === "chat");
    expect(soft!.velocity).toBeLessThan(full!.velocity);
  });
});
