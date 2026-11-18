import { nearKey, onset, parsePron, rapKey, rapPhones, slantKey, syllables, type Phones } from "./phonetics";

/**
 * The rhyme finder. It loads the word files from public/data (see
 * scripts/build-rhymes.ts) and indexes every pronunciation by its perfect,
 * slant and near rhyme keys, so a lookup is a few map reads. Keys follow
 * how rappers say words (see phonetics.ts): "-er" rhymes with "-a".
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

export class RhymeIndex {
  private words = new Map<string, Entry>();
  private byPerfect = new Map<string, Entry[]>();
  private bySlant = new Map<string, Entry[]>();
  private byNear = new Map<string, Entry[]>();
  readonly loaded = new Set<Tier>();

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
      const keys: [Map<string, Entry[]>, (p: Phones) => string][] = [
        [this.byPerfect, rapKey],
        [this.bySlant, slantKey],
        [this.byNear, (p) => nearKey(rapPhones(p))],
      ];
      for (const [map, keyOf] of keys) {
        for (const key of new Set(entry.prons.map(keyOf))) {
          if (!key) continue;
          const list = map.get(key);
          if (list) list.push(entry);
          else map.set(key, [entry]);
        }
      }
    }
  }

  entry(word: string): Entry | undefined {
    return this.words.get(word.toLowerCase());
  }

  /** Every slant rhyme sound and the words that end in it: the sounds prompts are dealt from. */
  sounds(): IterableIterator<[string, Entry[]]> {
    return this.bySlant.entries();
  }

  /** Every word in one tier. */
  tierWords(tier: Tier): Entry[] {
    return [...this.words.values()].filter((e) => e.tier === tier);
  }

  /** Words that share the perfect rhyme sound of `pron`, for building prompts. */
  family(pron: Phones): Entry[] {
    return this.bySlant.get(slantKey(pron)) ?? [];
  }

  /**
   * Perfect, slant and near rhymes for a word, most common first, then
   * closest in syllables. Only words in the allowed tiers are returned, and
   * none that `hidden` rules out.
   */
  lookup(raw: string, allowed: ReadonlySet<Tier>, limit = 60, hidden?: (word: string) => boolean): Rhymes {
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
      const key = rapKey(pron);
      const start = onset(pron);
      for (const e of this.byPerfect.get(key) ?? []) if (ok(e) && !echo(e, rapKey, key, start)) perfect.add(e);
    }
    const slant = new Set<Entry>();
    for (const pron of self.prons) {
      const key = slantKey(pron);
      const start = onset(pron);
      for (const e of this.bySlant.get(key) ?? []) if (ok(e) && !perfect.has(e) && !echo(e, slantKey, key, start)) slant.add(e);
    }
    const near = new Set<Entry>();
    for (const pron of self.prons) {
      for (const e of this.byNear.get(nearKey(rapPhones(pron))) ?? []) if (ok(e) && !perfect.has(e) && !slant.has(e)) near.add(e);
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
    return { known: true, perfect: order(perfect), slant: order(slant), near: order(near) };
  }
}

/** Which tiers the two toggles allow. */
export function allowedTiers(explicit: boolean, slurs: boolean): Set<Tier> {
  const tiers = new Set<Tier>(["clean"]);
  if (explicit) tiers.add("profane");
  if (slurs) tiers.add("slur");
  return tiers;
}
