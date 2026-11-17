import { nearKey, onset, parsePron, perfectKey, syllables, type Phones } from "./phonetics";

/**
 * The rhyme finder. It loads the word files from public/data (see
 * scripts/build-rhymes.ts) and indexes every pronunciation by its perfect
 * and near rhyme keys, so a lookup is a couple of map reads.
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
  perfect: string[];
  near: string[];
}

export class RhymeIndex {
  private words = new Map<string, Entry>();
  private byPerfect = new Map<string, Entry[]>();
  private byNear = new Map<string, Entry[]>();
  readonly loaded = new Set<Tier>();

  /** Add one word file ("word<TAB>size<TAB>pron|pron" per line). */
  add(text: string, tier: Tier): void {
    if (this.loaded.has(tier)) return;
    this.loaded.add(tier);
    for (const line of text.split("\n")) {
      const [word, size, prons] = line.split("\t");
      if (!word || !size || !prons) continue;
      const entry: Entry = { word, size: Number(size), tier, prons: prons.split("|").map(parsePron) };
      this.words.set(word, entry);
      for (const map of [this.byPerfect, this.byNear]) {
        const keyOf = map === this.byPerfect ? perfectKey : nearKey;
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

  /** Words that share the perfect rhyme sound of `pron`, for building prompts. */
  family(pron: Phones): Entry[] {
    return this.byPerfect.get(perfectKey(pron)) ?? [];
  }

  /**
   * Perfect and near rhymes for a word, most common first, then closest in
   * syllables. Only words in the allowed tiers are returned.
   */
  lookup(raw: string, allowed: ReadonlySet<Tier>, limit = 60): Rhymes {
    const word = raw.trim().toLowerCase();
    const self = this.words.get(word);
    if (!self) return { known: false, perfect: [], near: [] };
    const selfProns = new Set(self.prons.map((p) => p.join(" ")));
    const sylls = Math.min(...self.prons.map(syllables));
    const ok = (e: Entry) => e.word !== word && allowed.has(e.tier) && !e.prons.some((p) => selfProns.has(p.join(" ")));

    const perfect = new Set<Entry>();
    for (const pron of self.prons) {
      const key = perfectKey(pron);
      const start = onset(pron);
      for (const e of this.byPerfect.get(key) ?? []) {
        if (!ok(e)) continue;
        // Same sound before the vowel too ("leave" and "believe") is an echo, not a rhyme.
        if (e.prons.some((p) => perfectKey(p) === key && onset(p) !== start)) perfect.add(e);
      }
    }
    const near = new Set<Entry>();
    for (const pron of self.prons) {
      for (const e of this.byNear.get(nearKey(pron)) ?? []) if (ok(e) && !perfect.has(e)) near.add(e);
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
    return { known: true, perfect: order(perfect), near: order(near) };
  }
}

/** Which tiers the two toggles allow. */
export function allowedTiers(explicit: boolean, slurs: boolean): Set<Tier> {
  const tiers = new Set<Tier>(["clean"]);
  if (explicit) tiers.add("profane");
  if (slurs) tiers.add("slur");
  return tiers;
}
