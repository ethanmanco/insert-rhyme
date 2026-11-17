import { BEATS_PER_BAR } from "./timing";

/**
 * Rhyme layouts: for any bar, which beats are targets (where a rhyme should
 * land) and which rhyme group each one belongs to.
 *
 * A layout is two choices. The scheme is the pattern of a four-rhyme verse
 * (AABB, ABAB and so on). The pace says where those rhymes land: at the end
 * of every line, at the end of every second line with a free line between,
 * or twice per line in double-time.
 */

export type SchemeId = "aabb" | "abab" | "aaaa" | "abba" | "aaxa";
export type PaceId = "every" | "skip" | "double";

export interface Layout {
  scheme: SchemeId;
  pace: PaceId;
}

export interface SchemeInfo {
  id: SchemeId;
  name: string;
  /** The verse pattern, one letter per rhyme spot: X is a spot with no rhyme. */
  pattern: string;
  /** How the pattern reads, for the picker. */
  hint: string;
}

export interface PaceInfo {
  id: PaceId;
  name: string;
  /** A short tag for the chip; empty for the normal pace. */
  tag: string;
  hint: string;
}

export const SCHEMES: SchemeInfo[] = [
  { id: "aabb", name: "AABB", pattern: "AABB", hint: "Couplets: two rhymes on one sound, then two on the next." },
  { id: "abab", name: "ABAB", pattern: "ABAB", hint: "Two sounds woven together, taking turns." },
  { id: "aaaa", name: "AAAA", pattern: "AAAA", hint: "Four rhymes in a row on the same sound." },
  { id: "abba", name: "ABBA", pattern: "ABBA", hint: "A couplet wrapped inside another sound." },
  { id: "aaxa", name: "AAXA", pattern: "AAXA", hint: "Three rhymes on one sound, with a free spot before the last." },
];

export const PACES: PaceInfo[] = [
  { id: "every", name: "EVERY LINE", tag: "", hint: "A rhyme at the end of every line." },
  { id: "skip", name: "SKIP A LINE", tag: "SKIP", hint: "A free line, then a rhyming line. Only every second line rhymes." },
  { id: "double", name: "DOUBLE-TIME", tag: "2X", hint: "Two rhymes in every line, on beats 2 and 4." },
];

export const isScheme = (id: unknown): id is SchemeId => SCHEMES.some((s) => s.id === id);
export const isPace = (id: unknown): id is PaceId => PACES.some((p) => p.id === id);

/** Read a saved layout, including ones saved before the pace was its own choice. */
export function readLayout(scheme: unknown, pace: unknown): Layout {
  if (scheme === "skip" || scheme === "half") return { scheme: "aabb", pace: "skip" };
  if (scheme === "double") return { scheme: "aaaa", pace: "double" };
  return { scheme: isScheme(scheme) ? scheme : "aabb", pace: isPace(pace) ? pace : "every" };
}

/** A layout's short name, for the chip: "AABB", "ABAB SKIP", "AAAA 2X". */
export function layoutName(l: Layout): string {
  const tag = PACES.find((p) => p.id === l.pace)!.tag;
  return `${SCHEMES.find((s) => s.id === l.scheme)!.name}${tag ? ` ${tag}` : ""}`;
}

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
  /** The group's letter inside its verse (A or B). */
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

/** The target for rhyme spot `k` of the session (four spots per verse), or none for a free spot. */
function spot(pattern: string, k: number, beat: number): Target | null {
  const verse = Math.floor(k / 4);
  const pos = k % 4;
  const letter = pattern[pos]!;
  if (letter === "X") return null;
  const slot = [...pattern.slice(0, pos)].filter((c) => c === letter).length;
  return { beat, group: verse * 2 + (letter.charCodeAt(0) - 65), slot, letter };
}

/** The targets of line `n` (0-based, after the count-in). */
function targetsFor(layout: Layout, n: number): Target[] {
  const { pattern } = SCHEMES.find((s) => s.id === layout.scheme)!;
  const spots: [number, number][] =
    layout.pace === "every" ? [[n, LINE_END_BEAT]]
    : layout.pace === "skip" ? (n % 2 === 1 ? [[(n - 1) / 2, LINE_END_BEAT]] : [])
    : [[n * 2, MID_BEAT], [n * 2 + 1, LINE_END_BEAT]];
  return spots.map(([k, beat]) => spot(pattern, k, beat)).filter((t): t is Target => t !== null);
}

/** Lay out one bar. Every bar after the count-in is one line of the verse. */
export function barPlan(layout: Layout, bar: number): BarPlan {
  const n = bar - INTRO_BARS;
  if (n < 0) return { bar, intro: true, line: -1, targets: [] };
  return { bar, intro: false, line: n, targets: targetsFor(layout, n) };
}

/** A few bars at once: the current one and the ones coming up. */
export function upcomingBars(layout: Layout, fromBar: number, count: number): BarPlan[] {
  return Array.from({ length: count }, (_, i) => barPlan(layout, fromBar + i));
}
