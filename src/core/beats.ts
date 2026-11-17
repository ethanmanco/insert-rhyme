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

/** Night trap: half-time snare on 3, rolling 808 hats, a heavy 808 and a cold bell line in C minor. */
const trap: Beat = {
  id: "trap",
  name: "Night trap",
  bpm: 140,
  swing: 0,
  bars: 2,
  drums: [
    { drum: "kick808", pattern: "x......x.x......" + "x.....x.......x.", volume: -3 },
    { drum: "snare808", pattern: "........x......." + "........x......o", volume: -2 },
    { drum: "clap808", pattern: "........x......." + "........x.......", volume: -6 },
    { drum: "hat808", pattern: "x.x.x.x.x.x.xxxx" + "x.x.x.x.xxx.x.x.", volume: -6 },
  ],
  parts: [
    {
      synth: "b808",
      volume: -6,
      events: [hit(0, [36], 6), hit(7, [36], 2, 0.7), hit(9, [39], 6), hit(16, [32], 6), hit(22, [32], 6, 0.7), hit(30, [31], 2)],
    },
    {
      synth: "bell",
      volume: -16,
      events: [
        hit(0, [72], 2, 0.6), hit(3, [75], 2, 0.6), hit(6, [79], 2, 0.6), hit(10, [77], 4, 0.6),
        hit(16, [68], 2, 0.6), hit(19, [72], 2, 0.6), hit(22, [75], 2, 0.6), hit(26, [74], 4, 0.6),
      ],
    },
  ],
};

/** Rainy lo-fi: slow and swung, a rimshot instead of a snare, soft jazzy piano chords. */
const lofi: Beat = {
  id: "lofi",
  name: "Rainy lo-fi",
  bpm: 78,
  swing: 0.6,
  bars: 2,
  drums: [
    { drum: "kick", pattern: "x.........x....." + "x......x..x.....", volume: -2 },
    { drum: "rim", pattern: "....x.......x..." + "....x.......x...", volume: -8 },
    { drum: "chat", pattern: "x.o.x.o.x.o.x.o." + "x.o.x.o.x.o.x.o.", volume: -10 },
  ],
  parts: [
    {
      synth: "piano",
      volume: -6,
      cutoff: 1800,
      events: [hit(0, [53, 57, 60, 64], 15, 0.6), hit(16, [52, 55, 59, 62], 7, 0.6), hit(24, [50, 53, 57, 60, 64], 8, 0.6)],
    },
    {
      synth: "sub",
      volume: -10,
      events: [hit(0, [41], 8), hit(10, [41], 4, 0.7), hit(16, [40], 6), hit(24, [38], 8)],
    },
  ],
};

/** Bounce house: offbeat hats, claps on 2 and 4, a bright console melody and a hopping bass. */
const bounce: Beat = {
  id: "bounce",
  name: "Bounce house",
  bpm: 102,
  swing: 0.2,
  bars: 2,
  drums: [
    { drum: "kick", pattern: "x.....x.x.x....." + "x.....x...x..x..", volume: 0 },
    { drum: "clap", pattern: "....x.......x..." + "....x.......x...", volume: -4 },
    { drum: "chat", pattern: "..x...x...x...x." + "..x...x...x.x.x.", volume: -8 },
    { drum: "cowbell", pattern: "..........x..x.." + "..........x.....", volume: -16 },
  ],
  parts: [
    {
      synth: "chip",
      volume: -6,
      events: [
        hit(0, [67], 1, 0.7), hit(2, [71], 1, 0.7), hit(4, [74], 2, 0.7), hit(7, [71], 1, 0.7), hit(8, [69], 2, 0.7), hit(11, [67], 1, 0.7), hit(12, [64], 2, 0.7),
        hit(16, [67], 1, 0.7), hit(18, [71], 1, 0.7), hit(20, [74], 2, 0.7), hit(23, [76], 2, 0.7), hit(26, [74], 1, 0.7), hit(28, [71], 2, 0.7),
      ],
    },
    {
      synth: "sub",
      volume: -6,
      events: [hit(0, [43], 3), hit(6, [43], 2), hit(10, [55], 2, 0.7), hit(16, [40], 3), hit(22, [40], 2), hit(26, [52], 2, 0.7), hit(30, [38], 2)],
    },
  ],
};

/** Dark alley: a minor string pad, a growling reese bass and one lonely bell. */
const dark: Beat = {
  id: "dark",
  name: "Dark alley",
  bpm: 88,
  swing: 0.15,
  bars: 2,
  drums: [
    { drum: "kick808", pattern: "x.......x.x....." + "x.........x.....", volume: -3 },
    { drum: "snare808", pattern: "....x.......x..." + "....x.......x...", volume: -2 },
    { drum: "hat808", pattern: "x.o.x.o.x.o.x.o." + "x.o.x.o.x.o.x.o.", volume: -8 },
  ],
  parts: [
    { synth: "strings", volume: -12, events: [hit(0, [57, 60, 64], 15, 0.6), hit(16, [53, 57, 60], 7, 0.6), hit(24, [52, 56, 59], 8, 0.6)] },
    { synth: "reese", volume: -8, events: [hit(0, [33], 8), hit(10, [33], 4, 0.7), hit(16, [29], 6), hit(24, [28], 8)] },
    { synth: "bell", volume: -18, events: [hit(12, [76], 3, 0.5), hit(28, [68], 3, 0.5)] },
  ],
};

/** Sunset funk: a laid-back West Coast bounce with a whining lead, keys stabs and a busy bass. */
const funk: Beat = {
  id: "funk",
  name: "Sunset funk",
  bpm: 96,
  swing: 0.35,
  bars: 2,
  drums: [
    { drum: "kick", pattern: "x..x......x....." + "x..x....x.x.....", volume: 0 },
    { drum: "clap", pattern: "....x.......x..." + "....x.......x...", volume: -4 },
    { drum: "chat", pattern: "x.o.x.o.x.o.x.o." + "x.o.x.o.x.o.x.oo", volume: -9 },
    { drum: "ohat", pattern: "................" + "..............x.", volume: -14 },
  ],
  parts: [
    {
      synth: "lead",
      volume: -14,
      events: [hit(0, [74], 3, 0.6), hit(4, [77], 2, 0.6), hit(6, [76], 2, 0.6), hit(8, [74], 6, 0.6), hit(16, [72], 3, 0.6), hit(20, [74], 2, 0.6), hit(22, [72], 2, 0.6), hit(24, [69], 8, 0.6)],
    },
    {
      synth: "keys",
      volume: -12,
      events: [hit(0, [50, 53, 57, 60, 64], 6, 0.6), hit(6, [50, 53, 57, 60, 64], 2, 0.5), hit(16, [55, 58, 62, 65], 6, 0.6), hit(22, [55, 58, 62, 65], 2, 0.5)],
    },
    {
      synth: "bass",
      volume: -8,
      events: [
        hit(0, [38], 2), hit(3, [38], 1, 0.6), hit(6, [50], 1, 0.6), hit(8, [38], 2), hit(11, [41], 1, 0.6), hit(14, [43], 2),
        hit(16, [43], 2), hit(19, [43], 1, 0.6), hit(22, [55], 1, 0.6), hit(24, [45], 2), hit(27, [45], 1, 0.6), hit(30, [48], 2),
      ],
    },
  ],
};

/** Cold drill: skippy hats, a sliding 808 and a dark piano line in F minor. */
const drill: Beat = {
  id: "drill",
  name: "Cold drill",
  bpm: 142,
  swing: 0,
  bars: 2,
  drums: [
    { drum: "kick808", pattern: "x.....x........." + "x.........x.....", volume: -3 },
    { drum: "snare808", pattern: "........x......." + "........x...x...", volume: -2 },
    { drum: "hat808", pattern: "x..x..x.x..x..x." + "x..x..x.xx.x..x.", volume: -7 },
  ],
  parts: [
    { synth: "b808", volume: -6, events: [hit(0, [41], 6), hit(6, [44], 4), hit(10, [39], 6), hit(16, [37], 8), hit(24, [36], 8)] },
    {
      synth: "piano",
      volume: -10,
      cutoff: 3000,
      events: [
        hit(0, [65], 3, 0.6), hit(3, [68], 3, 0.6), hit(6, [72], 2, 0.6), hit(8, [73], 4, 0.6), hit(12, [72], 4, 0.6),
        hit(16, [70], 3, 0.6), hit(19, [68], 3, 0.6), hit(22, [67], 2, 0.6), hit(24, [68], 8, 0.6),
      ],
    },
  ],
};

export const BEATS: Beat[] = [boomBap, trap, lofi, bounce, dark, funk, drill];

export function beatById(id: unknown): Beat {
  return BEATS.find((b) => b.id === id) ?? BEATS[0]!;
}

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
