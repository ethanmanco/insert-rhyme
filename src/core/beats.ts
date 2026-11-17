import type { DrumId, SynthId } from "../audio/steplab/types";
import { STEPS_PER_BAR } from "./timing";

/**
 * Built-in beats, written as data. Drum lines are strings with one character
 * per sixteenth: "x" a full hit, "o" a softer one, "." a rest. Melodic parts
 * are lists of notes (MIDI numbers) with a start step and a length in steps.
 */

export interface DrumLine {
  drum: DrumId;
  pattern: string;
  /** Level in dB for this drum. */
  volume: number;
}

export interface NoteEvent {
  step: number;
  notes: number[];
  /** Length in sixteenth steps. */
  length: number;
  velocity: number;
}

export interface Part {
  synth: SynthId;
  volume: number;
  /** Low-pass cutoff in Hz, for darker or dustier sounds. */
  cutoff?: number;
  events: NoteEvent[];
}

export interface Beat {
  id: string;
  name: string;
  /** The tempo the beat was written for. */
  bpm: number;
  /** 0..1, see swingDelay. */
  swing: number;
  /** How many bars before the beat repeats. */
  bars: number;
  drums: DrumLine[];
  parts: Part[];
}

const hit = (step: number, notes: number[], length: number, velocity = 0.8): NoteEvent => ({ step, notes, length, velocity });

/** Dusty boom bap: lazy swung hats, a hard snare on 2 and 4, a minor electric piano loop. */
const boomBap: Beat = {
  id: "boom-bap",
  name: "Dusty boom bap",
  bpm: 92,
  swing: 0.45,
  bars: 2,
  drums: [
    { drum: "kick", pattern: "x......x..x....." + "x.......x.x.....", volume: 0 },
    { drum: "snare", pattern: "....x.......x..." + "....x.......x..o", volume: -2 },
    { drum: "chat", pattern: "x.o.x.o.x.o.x.o." + "x.o.x.o.x.o.x...", volume: -6 },
    { drum: "ohat", pattern: "................" + "..............x.", volume: -12 },
  ],
  parts: [
    {
      synth: "keys",
      volume: -9,
      cutoff: 2400,
      events: [
        // Dm9, then Gm7 into A7: i, iv, V in D minor.
        hit(0, [50, 53, 57, 60, 64], 14, 0.7),
        hit(16, [43, 50, 53, 58], 9, 0.7),
        hit(26, [45, 52, 55, 61], 6, 0.65),
      ],
    },
    {
      synth: "bass",
      volume: -6,
      events: [hit(0, [38], 6), hit(7, [38], 3, 0.6), hit(10, [41], 5), hit(16, [43], 7), hit(24, [43], 2, 0.6), hit(26, [45], 6)],
    },
  ],
};

export const BEATS: Beat[] = [boomBap];

export function beatSteps(beat: Beat): number {
  return beat.bars * STEPS_PER_BAR;
}

export interface StepEvents {
  drums: { drum: DrumId; velocity: number }[];
  notes: { part: number; event: NoteEvent }[];
}

/** Everything that starts on one step of the loop (the step wraps around). */
export function eventsAt(beat: Beat, step: number): StepEvents {
  const total = beatSteps(beat);
  const s = ((step % total) + total) % total;
  const drums: StepEvents["drums"] = [];
  for (const line of beat.drums) {
    const ch = line.pattern[s];
    if (ch === "x") drums.push({ drum: line.drum, velocity: 1 });
    else if (ch === "o") drums.push({ drum: line.drum, velocity: 0.55 });
  }
  const notes: StepEvents["notes"] = [];
  beat.parts.forEach((part, i) => {
    for (const event of part.events) if (event.step === s) notes.push({ part: i, event });
  });
  return { drums, notes };
}
