import { BEATS_PER_BAR } from "./timing";

/**
 * Rhyme layouts: for any bar, which beats are targets (where a rhyme should
 * land) and which rhyme group each one belongs to.
 *
 * A layout is two choices. The scheme is the pattern of a four-rhyme verse
 * (AABB, ABAB and so on). The pace says where those rhymes land: at the end
 * of every line, at the end of every second line with a free line between,
 * or twice per line in double-time.
 *
 * Either can be random. A random scheme switches to a different pattern
 * every BLOCK bars; a random pace can flip between every line and skip a
 * line every SEGMENT bars. Both come from a seed, so a bar's plan never
 * changes once worked out, and the bars shown ahead are always right.
 */

export type FixedScheme = "aabb" | "abab" | "aaaa" | "abba" | "aaxa";
export type SchemeId = FixedScheme | "mix";
export type FixedPace = "every" | "skip" | "double";
export type PaceId = FixedPace | "mix";

export interface Layout {
  scheme: SchemeId;
  pace: PaceId;
  /** Picks the random schemes and paces. Any number; 0 when left out. */
  seed?: number;
}

export interface SchemeInfo {
  id: SchemeId;
  name: string;
  /** The verse pattern, one letter per rhyme spot: X is a spot with no rhyme. Empty for random. */
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

/** Bars per stretch of one random scheme. */
export const BLOCK = 16;
/** Bars per stretch of one random pace. Every stretch holds whole verses at any pace. */
export const SEGMENT = 8;

export const SCHEMES: SchemeInfo[] = [
  { id: "aabb", name: "AABB", pattern: "AABB", hint: "Couplets: two rhymes on one sound, then two on the next." },
  { id: "abab", name: "ABAB", pattern: "ABAB", hint: "Two sounds woven together, taking turns." },
  { id: "aaaa", name: "AAAA", pattern: "AAAA", hint: "Four rhymes in a row on the same sound." },
  { id: "abba", name: "ABBA", pattern: "ABBA", hint: "A couplet wrapped inside another sound." },
  { id: "aaxa", name: "AAXA", pattern: "AAXA", hint: "Three rhymes on one sound, with a free spot before the last." },
  { id: "mix", name: "RANDOM", pattern: "", hint: `Switches to a different scheme every ${BLOCK} bars. The bar title says which.` },
];

export const PACES: PaceInfo[] = [
  { id: "every", name: "EVERY LINE", tag: "", hint: "A rhyme at the end of every line." },
  { id: "skip", name: "SKIP A LINE", tag: "SKIP", hint: "A free line, then a rhyming line. Only every second line rhymes." },
  { id: "double", name: "DOUBLE-TIME", tag: "2X", hint: "Two rhymes in every line, on beats 2 and 4." },
  { id: "mix", name: "RANDOM", tag: "MIXED", hint: `Every line or skip a line, picked at random every ${SEGMENT} bars.` },
];

const FIXED = SCHEMES.filter((s) => s.pattern);

export const isScheme = (id: unknown): id is SchemeId => SCHEMES.some((s) => s.id === id);
export const isPace = (id: unknown): id is PaceId => PACES.some((p) => p.id === id);

/** Read a saved layout, including ones saved before the pace was its own choice. */
export function readLayout(scheme: unknown, pace: unknown): Layout {
  if (scheme === "skip" || scheme === "half") return { scheme: "aabb", pace: "skip" };
  if (scheme === "double") return { scheme: "aaaa", pace: "double" };
  return { scheme: isScheme(scheme) ? scheme : "aabb", pace: isPace(pace) ? pace : "every" };
}

/** A layout's short name, for the chip: "AABB", "ABAB SKIP", "AAAA 2X", "RANDOM MIXED". */
export function layoutName(l: Layout): string {
  const tag = PACES.find((p) => p.id === l.pace)!.tag;
  return `${SCHEMES.find((s) => s.id === l.scheme)!.name}${tag ? ` ${tag}` : ""}`;
}

/** A steady random number from 0 to 1 for a seed and a position. */
function noise(seed: number, n: number): number {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((n | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}

/** The scheme in play on line `n`. A random scheme never picks the same pattern twice in a row. */
export function schemeAt(layout: Layout, n: number): FixedScheme {
  if (layout.scheme !== "mix") return layout.scheme;
  const seed = layout.seed ?? 0;
  let i = Math.floor(noise(seed, -1) * FIXED.length);
  for (let b = 1; b <= Math.floor(n / BLOCK); b++) i = (i + 1 + Math.floor(noise(seed, b) * (FIXED.length - 1))) % FIXED.length;
  return FIXED[i]!.id as FixedScheme;
}

/** The pace in play on line `n`. A random pace starts on every line, then flips two times in three. */
export function paceAt(layout: Layout, n: number): FixedPace {
  if (layout.pace !== "mix") return layout.pace;
  const seed = (layout.seed ?? 0) ^ 0x5bd1e995;
  let skip = false;
  for (let s = 1; s <= Math.floor(n / SEGMENT); s++) if (noise(seed, s) < 2 / 3) skip = !skip;
  return skip ? "skip" : "every";
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
  /** The scheme and pace in play on this bar (worked out when random). */
  scheme: FixedScheme;
  pace: FixedPace;
  targets: Target[];
}

/**
 * The target for rhyme spot `k` of a stretch (four spots per verse), or none
 * for a free spot. Groups are numbered by stretch, so they never collide.
 */
function spot(pattern: string, stretch: number, k: number, beat: number): Target | null {
  const pos = k % 4;
  const letter = pattern[pos]!;
  if (letter === "X") return null;
  const slot = [...pattern.slice(0, pos)].filter((c) => c === letter).length;
  // At most 16 spots (4 verses, 2 groups each) fit in one stretch.
  return { beat, group: stretch * 8 + Math.floor(k / 4) * 2 + (letter.charCodeAt(0) - 65), slot, letter };
}

/** The targets of line `n` (0-based, after the count-in). */
function targetsFor(scheme: FixedScheme, pace: FixedPace, n: number): Target[] {
  const { pattern } = SCHEMES.find((s) => s.id === scheme)!;
  const stretch = Math.floor(n / SEGMENT);
  const i = n % SEGMENT;
  const spots: [number, number][] =
    pace === "every" ? [[i, LINE_END_BEAT]]
    : pace === "skip" ? (i % 2 === 1 ? [[(i - 1) / 2, LINE_END_BEAT]] : [])
    : [[i * 2, MID_BEAT], [i * 2 + 1, LINE_END_BEAT]];
  return spots.map(([k, beat]) => spot(pattern, stretch, k, beat)).filter((t): t is Target => t !== null);
}

/** Lay out one bar. Every bar after the count-in is one line of the verse. */
export function barPlan(layout: Layout, bar: number): BarPlan {
  const n = Math.max(0, bar - INTRO_BARS);
  const scheme = schemeAt(layout, n);
  const pace = paceAt(layout, n);
  if (bar < INTRO_BARS) return { bar, intro: true, line: -1, scheme, pace, targets: [] };
  return { bar, intro: false, line: n, scheme, pace, targets: targetsFor(scheme, pace, n) };
}

/** A few bars at once: the current one and the ones coming up. */
export function upcomingBars(layout: Layout, fromBar: number, count: number): BarPlan[] {
  return Array.from({ length: count }, (_, i) => barPlan(layout, fromBar + i));
}
