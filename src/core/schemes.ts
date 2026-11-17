import { BEATS_PER_BAR } from "./timing";

/**
 * Rhyme schemes as layouts: for any bar, which beats are targets (where a
 * rhyme should land) and which rhyme group each one belongs to. One bar is
 * one line of the verse.
 */

export type SchemeId = "aabb";

export interface SchemeInfo {
  id: SchemeId;
  name: string;
  /** How the pattern reads, for the picker. */
  hint: string;
}

export const SCHEMES: SchemeInfo[] = [{ id: "aabb", name: "AABB", hint: "Couplets: two lines rhyme, then the next two." }];

/** Bars of count-in before the first line, so you can catch the beat. */
export const INTRO_BARS = 1;

/** The beat a line's end rhyme lands on: beat 4, where the snare usually hits. */
export const LINE_END_BEAT = BEATS_PER_BAR - 1;

export interface Target {
  /** 0-based beat inside the bar. */
  beat: number;
  /** A number unique to one rhyme group across the whole session. */
  group: number;
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

/** Lay out one bar of a scheme. */
export function barPlan(scheme: SchemeId, bar: number): BarPlan {
  const line = bar - INTRO_BARS;
  if (line < 0) return { bar, intro: true, line: -1, targets: [] };
  switch (scheme) {
    case "aabb": {
      // Four-line verses: lines 1-2 share group A, lines 3-4 share group B.
      const verse = Math.floor(line / 4);
      const half = Math.floor((line % 4) / 2);
      return {
        bar,
        intro: false,
        line,
        targets: [{ beat: LINE_END_BEAT, group: verse * 2 + half, letter: letter(half) }],
      };
    }
  }
}

/** A few bars at once: the current one and the ones coming up. */
export function upcomingBars(scheme: SchemeId, fromBar: number, count: number): BarPlan[] {
  return Array.from({ length: count }, (_, i) => barPlan(scheme, fromBar + i));
}
