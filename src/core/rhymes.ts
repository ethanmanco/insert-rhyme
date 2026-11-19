import { onset, parsePron, rapKey, rapNearKey, slantKey, syllables, type Accent, type Phones } from "./phonetics";

/**
 * The rhyme finder. It loads the word files from public/data (see
 * scripts/build-rhymes.ts) and indexes every pronunciation by its perfect,
 * slant and near rhyme keys, so a lookup is a few map reads. Keys follow
 * how rappers say words (see phonetics.ts): "-er" rhymes with "-a". Each
 * accent (UK, Southern) gets its own keys, built the first time it is used.
 */

export type Tier = "clean" | "profane" | "slur";

export interface Entry {
  word: string;
  /** SCOWL size: lower is more common. */
  size: number;
  tier: Tier;
  prons: Phones[];
}

export interface Rhymes {
  /** False when the word is not in the loaded data. */
  known: boolean;
  /** Same sounds from the stressed vowel on, the way rappers say them. */
  perfect: string[];
  /** Same vowels and the same ending, other consonants in between. */
  slant: string[];
  /** Same vowels, any consonants. */
  near: string[];
}

/** Words by rhyme key, for one accent. */
interface Keyed {
  perfect: Map<string, Entry[]>;
  slant: Map<string, Entry[]>;
  near: Map<string, Entry[]>;
}

const keyFns = (accent: Accent): [keyof Keyed, (p: Phones) => string][] => [
  ["perfect", (p) => rapKey(p, accent)],
  ["slant", (p) => slantKey(p, accent)],
  ["near", (p) => rapNearKey(p, accent)],
];

function addKeys(keyed: Keyed, entry: Entry, accent: Accent) {
  for (const [name, keyOf] of keyFns(accent)) {
    const map = keyed[name];
    for (const key of new Set(entry.prons.map(keyOf))) {
      if (!key) continue;
      const list = map.get(key);
      if (list) list.push(entry);
      else map.set(key, [entry]);
    }
  }
}

export class RhymeIndex {
  private words = new Map<string, Entry>();
  private keyed = new Map<Accent, Keyed>();
  readonly loaded = new Set<Tier>();

  /** The rhyme keys for an accent, built on first use and kept up to date as tiers load. */
  private keys(accent: Accent = "us"): Keyed {
    let keyed = this.keyed.get(accent);
    if (!keyed) {
      keyed = { perfect: new Map(), slant: new Map(), near: new Map() };
      for (const entry of this.words.values()) addKeys(keyed, entry, accent);
      this.keyed.set(accent, keyed);
    }
    return keyed;
  }

  /** Add one word file ("word<TAB>size<TAB>pron|pron" per line). */
  add(text: string, tier: Tier): void {
    if (this.loaded.has(tier)) return;
    this.loaded.add(tier);
    for (const line of text.split("\n")) {
      const [word, size, prons] = line.split("\t");
      if (!word || !size || !prons) continue;
      // Extra readings with a different syllable count are mostly foreign ones
      // ("fine" said fee-neh, which would rhyme with dinner): keep the main one's length.
      const all = prons.split("|").map(parsePron);
      const keep = all.filter((p) => syllables(p) === syllables(all[0]!));
      const entry: Entry = { word, size: Number(size), tier, prons: keep };
      this.words.set(word, entry);
      for (const [accent, keyed] of this.keyed) addKeys(keyed, entry, accent);
    }
    this.keys("us");
  }

  entry(word: string): Entry | undefined {
    return this.words.get(word.toLowerCase());
  }

  /** Every slant rhyme sound and the words that end in it: the sounds prompts are dealt from. */
  sounds(accent: Accent = "us"): IterableIterator<[string, Entry[]]> {
    return this.keys(accent).slant.entries();
  }

  /**
   * Known words that start with what has been typed so far, most common
   * first, then shortest: suggestions while a word is half typed.
   */
  complete(raw: string, allowed: ReadonlySet<Tier>, limit = 12, hidden?: (word: string) => boolean): string[] {
    const start = raw.trim().toLowerCase();
    if (!start) return [];
    const found: Entry[] = [];
    for (const e of this.words.values()) {
      if (e.word.startsWith(start) && e.word !== start && allowed.has(e.tier) && !hidden?.(e.word)) found.push(e);
    }
    return found
      .sort((a, b) => a.size - b.size || a.word.length - b.word.length || (a.word < b.word ? -1 : 1))
      .slice(0, limit)
      .map((e) => e.word);
  }

  /** Every word in one tier. */
  tierWords(tier: Tier): Entry[] {
    return [...this.words.values()].filter((e) => e.tier === tier);
  }

  /**
   * Perfect, slant and near rhymes for a word, most common first, then
   * closest in syllables. Only words in the allowed tiers are returned, and
   * none that `hidden` rules out. `accent` says the words the way a scene does.
   */
  lookup(raw: string, allowed: ReadonlySet<Tier>, limit = 60, hidden?: (word: string) => boolean, accent: Accent = "us"): Rhymes {
    const keyed = this.keys(accent);
    const perfectKey = (p: Phones) => rapKey(p, accent);
    const slant = (p: Phones) => slantKey(p, accent);
    const word = raw.trim().toLowerCase();
    const self = this.words.get(word);
    if (!self) return { known: false, perfect: [], slant: [], near: [] };
    const selfProns = new Set(self.prons.map((p) => p.join(" ")));
    const sylls = Math.min(...self.prons.map(syllables));
    const ok = (e: Entry) => e.word !== word && allowed.has(e.tier) && !hidden?.(e.word) && !e.prons.some((p) => selfProns.has(p.join(" ")));

    const perfect = new Set<Entry>();
    // Same sound before the vowel too ("leave" and "believe") is an echo, not a rhyme.
    const echo = (e: Entry, keyOf: (p: Phones) => string, key: string, start: string) =>
      e.prons.every((p) => keyOf(p) !== key || onset(p) === start);
    for (const pron of self.prons) {
      const key = perfectKey(pron);
      const start = onset(pron);
      for (const e of keyed.perfect.get(key) ?? []) if (ok(e) && !echo(e, perfectKey, key, start)) perfect.add(e);
    }
    const slants = new Set<Entry>();
    for (const pron of self.prons) {
      const key = slant(pron);
      const start = onset(pron);
      for (const e of keyed.slant.get(key) ?? []) if (ok(e) && !perfect.has(e) && !echo(e, slant, key, start)) slants.add(e);
    }
    const near = new Set<Entry>();
    for (const pron of self.prons) {
      for (const e of keyed.near.get(rapNearKey(pron, accent)) ?? []) if (ok(e) && !perfect.has(e) && !slants.has(e)) near.add(e);
    }
    const order = (list: Set<Entry>) =>
      [...list]
        .sort(
          (a, b) =>
            a.size - b.size ||
            Math.abs(Math.min(...a.prons.map(syllables)) - sylls) - Math.abs(Math.min(...b.prons.map(syllables)) - sylls) ||
            (a.word < b.word ? -1 : 1),
        )
        .slice(0, limit)
        .map((e) => e.word);
    return { known: true, perfect: order(perfect), slant: order(slants), near: order(near) };
  }
}

/** Which tiers the two toggles allow. */
export function allowedTiers(explicit: boolean, slurs: boolean): Set<Tier> {
  const tiers = new Set<Tier>(["clean"]);
  if (explicit) tiers.add("profane");
  if (slurs) tiers.add("slur");
  return tiers;
}
