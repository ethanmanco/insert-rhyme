import { BEATS_PER_BAR } from "./timing";

/**
 * Rhyme schemes as layouts: for any bar, which beats are targets (where a
 * rhyme should land) and which rhyme group each one belongs to. One bar is
 * one line of the verse, except in half-time, where a line takes two bars.
 */

export type SchemeId = "aabb" | "abab" | "aaaa" | "skip" | "half" | "double";

export interface SchemeInfo {
  id: SchemeId;
  name: string;
  /** How the pattern reads, for the picker. */
  hint: string;
}

export const SCHEMES: SchemeInfo[] = [
  { id: "aabb", name: "AABB", hint: "Couplets: two lines rhyme, then the next two." },
  { id: "abab", name: "ABAB", hint: "Every other line rhymes, with two sounds woven together." },
  { id: "aaaa", name: "AAAA", hint: "Four lines in a row on the same sound." },
  { id: "skip", name: "SKIP-LINE", hint: "Only every second line rhymes. The others are free." },
  { id: "half", name: "HALF-TIME", hint: "Slow it down: one rhyme every two bars." },
  { id: "double", name: "DOUBLE-TIME", hint: "Two rhymes in every bar, on beats 2 and 4." },
];

export const isScheme = (id: unknown): id is SchemeId => SCHEMES.some((s) => s.id === id);

/** Bars of count-in before the first line, so you can catch the beat. */
export const INTRO_BARS = 1;

/** The beat a line's end rhyme lands on: beat 4, where the snare usually hits. */
export const LINE_END_BEAT = BEATS_PER_BAR - 1;
/** Double-time adds a rhyme on beat 2. */
export const MID_BEAT = 1;

export interface Target {
  /** 0-based beat inside the bar. */
  beat: number;
  /** A number unique to one rhyme group across the whole session. */
  group: number;
  /** Which word of its group this is: 0 for the first. */
  slot: number;
  /** The group's letter inside its stretch of the scheme (A, B, ...). */
  letter: string;
}

export interface BarPlan {
  bar: number;
  /** A count-in bar: no targets, just the beat. */
  intro: boolean;
  /** 0-based line number of the verse, or -1 during the count-in. */
  line: number;
  targets: Target[];
}

const letter = (i: number) => String.fromCharCode(65 + i);
const end = (group: number, slot: number, l: number): Target => ({ beat: LINE_END_BEAT, group, slot, letter: letter(l) });

/** The targets of one bar, `n` bars after the count-in. */
function targetsFor(scheme: SchemeId, n: number): { line: number; targets: Target[] } {
  const verse = Math.floor(n / 4);
  const pos = n % 4;
  switch (scheme) {
    case "aabb": {
      // Lines 1-2 share group A, lines 3-4 group B.
      const half = Math.floor(pos / 2);
      return { line: n, targets: [end(verse * 2 + half, pos % 2, half)] };
    }
    case "abab": {
      // Lines 1 and 3 share group A, lines 2 and 4 group B.
      const which = pos % 2;
      return { line: n, targets: [end(verse * 2 + which, Math.floor(pos / 2), which)] };
    }
    case "aaaa":
      return { line: n, targets: [end(verse, pos, 0)] };
    case "skip":
      // Lines 2 and 4 rhyme with each other; lines 1 and 3 are free.
      return { line: n, targets: pos % 2 === 1 ? [end(verse, Math.floor(pos / 2), 0)] : [] };
    case "half": {
      // Each line takes two bars and ends on the second one. Lines pair up AABB.
      const line = Math.floor(n / 2);
      if (n % 2 === 0) return { line, targets: [] };
      const hv = Math.floor(line / 4);
      const half = Math.floor((line % 4) / 2);
      return { line, targets: [end(hv * 2 + half, line % 2, half)] };
    }
    case "double": {
      // Beats 2 and 4 of a pair of lines share a group: four rhymes, then a new sound.
      const pair = Math.floor(n / 2);
      const first = (n % 2) * 2;
      const l = pair % 2;
      return {
        line: n,
        targets: [
          { beat: MID_BEAT, group: pair, slot: first, letter: letter(l) },
          { beat: LINE_END_BEAT, group: pair, slot: first + 1, letter: letter(l) },
        ],
      };
    }
  }
}

/** Lay out one bar of a scheme. */
export function barPlan(scheme: SchemeId, bar: number): BarPlan {
  const n = bar - INTRO_BARS;
  if (n < 0) return { bar, intro: true, line: -1, targets: [] };
  return { bar, intro: false, ...targetsFor(scheme, n) };
}

/** A few bars at once: the current one and the ones coming up. */
export function upcomingBars(scheme: SchemeId, fromBar: number, count: number): BarPlan[] {
  return Array.from({ length: count }, (_, i) => barPlan(scheme, fromBar + i));
}
