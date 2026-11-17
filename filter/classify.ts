import { ALLOW, CONTAINS_PROFANE, CONTAINS_SLUR, LDNOOBW, PROFANE, SLURS } from "./lists.ts";

/**
 * Sorts every word into one of three tiers. Clean words always show.
 * Profane words only show with the explicit-words toggle on, and slurs only
 * with the separate slur toggle on. Both are off by default.
 *
 * This runs when the rhyme data is built (scripts/build-rhymes.ts), so each
 * tier ships in its own file and the app never downloads explicit words
 * unless a toggle asks for them. It is not part of the app bundle.
 */
export type Tier = "clean" | "profane" | "slur";

const RANK: Record<Tier, number> = { clean: 0, profane: 1, slur: 2 };
const worse = (a: Tier, b: Tier): Tier => (RANK[b] > RANK[a] ? b : a);

/** ROT13: letters shift 13 places, everything else stays. Applying it twice gives back the original. */
export function rot13(text: string): string {
  return text.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

const words = (encoded: string) => rot13(encoded).split(/\s+/).filter(Boolean);

export const LISTS = {
  ldnoobw: words(LDNOOBW),
  slurs: words(SLURS),
  profane: words(PROFANE),
  containsProfane: words(CONTAINS_PROFANE),
  containsSlur: words(CONTAINS_SLUR),
  allow: words(ALLOW),
};

const exact = new Map<string, Tier>();
for (const w of [...LISTS.ldnoobw, ...LISTS.profane]) exact.set(w, "profane");
for (const w of LISTS.slurs) exact.set(w, "slur");
const allow = new Set(LISTS.allow);

/** Endings that turn a listed word into another form of it: plurals, verb forms, -y, -er and so on. */
const SUFFIXES = ["s", "es", "ed", "d", "er", "ers", "ing", "in", "y", "ie", "ies", "ier", "iest", "ish", "ness", "ly", "z"];

/**
 * Words a form could come from: "bitches" from "bitch", "sluttier" from
 * "slut", "raping" from "rape". Only one ending is taken off.
 */
export function baseForms(word: string): string[] {
  const out = [word];
  for (const suffix of SUFFIXES) {
    if (!word.endsWith(suffix) || word.length < suffix.length + 2) continue;
    const base = word.slice(0, -suffix.length);
    out.push(base);
    // A doubled consonant before the ending: "slutty" from "slut".
    if (base.length > 2 && base.at(-1) === base.at(-2) && !/[aeiou]/.test(base.at(-1)!)) out.push(base.slice(0, -1));
    // A silent e dropped before the ending: "raping" from "rape".
    if (/^[aeiouy]/.test(suffix)) out.push(base + "e");
    // y turned to i: "titties" from "titty" (but not -ing, where y stays: "crying").
    if (suffix.startsWith("i") && suffix !== "ing" && suffix !== "in") out.push(base + "y");
  }
  return out;
}

export function classify(raw: string): Tier {
  const word = raw.toLowerCase();
  if (allow.has(word)) return "clean";
  let tier: Tier = "clean";
  for (const base of baseForms(word)) {
    const t = exact.get(base);
    if (t) tier = worse(tier, t);
  }
  for (const root of LISTS.containsProfane) if (word.includes(root)) tier = worse(tier, "profane");
  for (const root of LISTS.containsSlur) if (word.includes(root)) tier = worse(tier, "slur");
  return tier;
}
