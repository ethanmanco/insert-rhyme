import { syllables } from "./phonetics";
import type { Entry, RhymeIndex, Tier } from "./rhymes";

/**
 * Prompt words: everyday words with lots of easy rhymes, so a player never
 * gets stuck on an impossible one. Each rhyme group in a verse takes one of
 * these seeds and fills its blocks with the seed's most common rhymes.
 * A test checks every seed still has at least MIN_FAMILY rhymes to offer.
 */
export const SEEDS = [
  "day", "way", "play", "stay", "say", "night", "light", "right", "fight", "time", "mind", "find", "line",
  "go", "flow", "show", "know", "slow", "see", "free", "me", "be", "tree", "true", "you", "new", "crew",
  "through", "more", "door", "floor", "score", "all", "ball", "call", "fall", "wall", "back", "track",
  "black", "stack", "cat", "hat", "that", "flat", "rain", "pain", "game", "name", "fame", "flame", "cold",
  "gold", "old", "told", "high", "sky", "fly", "try", "eye", "beat", "heat", "street", "feet", "sweet",
  "rock", "block", "clock", "stop", "top", "drop", "shop", "run", "sun", "fun", "one", "done", "best",
  "rest", "test", "chest", "dream", "team", "stream", "seem", "cool", "rule", "school", "pool", "town",
  "down", "crown", "sound", "ground", "round", "found", "fire", "higher", "real", "deal", "feel", "wheel",
  "steal", "mic", "bike", "like", "strike", "cash", "flash", "dash", "crash", "bread", "head", "red",
  "said", "bed", "king", "ring", "sing", "thing", "bring", "beach", "reach", "teach", "speech", "boat",
  "note", "coat", "vote", "wrote", "cake", "make", "take", "shake", "break", "lake", "rhyme", "climb",
  "prime", "dime", "space", "place", "race", "face", "case", "pace", "ice", "nice",
  "price", "dice", "slice", "grow", "snow", "glow", "phone", "zone", "stone", "bone", "alone",
  "loud", "crowd", "proud", "cloud", "bright", "kite", "white", "tight",
  "jump", "pump", "bump", "dance", "chance", "car", "star", "far", "bar", "guitar", "boss",
  "cross", "toss", "lost", "cost", "speed", "need", "lead", "feed", "seed",
  "hand", "band", "land", "stand", "plan", "fan", "man", "van", "can",
];

/** Rhymes a seed must have, so every scheme can fill its groups. */
export const MIN_FAMILY = 8;
/** Longest word that still reads on a block. */
export const MAX_LETTERS = 8;
/** Everyday words only: SCOWL size 35 and below. */
export const COMMON_SIZE = 35;

/** Short sounds that are words in a dictionary but not good prompts. */
const SKIP = new Set([
  "re", "mi", "fa", "la", "ti", "ma", "pa", "ha", "ah", "eh", "er", "um", "hm", "uh", "nay", "ye", "dos", "bras",
  "dike", "the", "an", "than", "nor", "oh", "owe", "doe", "lain", "bloc", "ting", "ohm", "czar", "char", "par",
  "dross", "leach", "lop", "bop", "tome", "loam", "lance", "bred", "doled", "sowed", "cowed", "vat", "ounce",
]);
/** Everyday words first: size 20 and below, topped up from size 35 when a family is small. */
const EVERYDAY = 20;

/** How many of a family's most common words are kept for prompts. */
export const FAMILY_SIZE = 16;

/** Words that can sit on a block for this seed: common, short, at most two syllables, most common first. */
export function family(index: RhymeIndex, seed: string, allowed: ReadonlySet<Tier>): string[] {
  const self = index.entry(seed);
  if (!self) return [];
  const found = new Map<string, Entry>([[seed, self]]);
  const fits = (e: Entry) =>
    allowed.has(e.tier) &&
    !SKIP.has(e.word) &&
    e.word.length <= MAX_LETTERS &&
    // Explicit words are rarer in word lists, so only clean words need to be common.
    (e.tier !== "clean" || e.size <= COMMON_SIZE) &&
    Math.min(...e.prons.map(syllables)) <= 2;
  for (const pron of self.prons) {
    for (const e of index.family(pron)) if (fits(e)) found.set(e.word, e);
  }
  // The near-identical "leave / believe" echoes are fine here: they are separate words to say.
  const sorted = [...found.values()].sort((a, b) => a.size - b.size || (a.word < b.word ? -1 : 1));
  const everyday = sorted.filter((e) => e.size <= EVERYDAY || e.tier !== "clean");
  const pick = everyday.length >= MIN_FAMILY ? everyday : sorted.slice(0, Math.max(MIN_FAMILY, everyday.length));
  return pick.slice(0, FAMILY_SIZE).map((e) => e.word);
}

/** A small seeded random generator, so tests (and replays) are repeatable. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Hands out words for rhyme groups as the verse goes. A group keeps its
 * words once chosen, so the bars ahead and the current bar agree, and seeds
 * are not reused until most of the others have had a turn.
 */
export class PromptDeck {
  private groups = new Map<number, string[]>();
  private recent: string[] = [];
  private random: () => number;

  /**
   * `theme` is a word category's words: each group then starts with one of
   * them (its first word, the one shown in first-word mode), followed by
   * other theme words that rhyme, then everyday rhymes.
   */
  constructor(
    private index: RhymeIndex,
    private allowed: ReadonlySet<Tier>,
    seed = Date.now(),
    private theme: string[] | null = null,
  ) {
    this.random = rng(seed);
  }

  /** The word for one target: the `slot`-th word of its group. */
  word(group: number, slot: number): string {
    let words = this.groups.get(group);
    if (!words) {
      words = this.draw();
      this.groups.set(group, words);
      // Only the bars around the player matter; forget old groups.
      for (const g of this.groups.keys()) if (g < group - 16) this.groups.delete(g);
    }
    return words[slot % words.length]!;
  }

  private draw(): string[] {
    if (this.theme?.length) {
      const theme = this.theme;
      const fresh = theme.filter((s) => !this.recent.includes(s));
      for (const seed of shuffle(fresh.length ? fresh : theme, this.random)) {
        const rhymes = family(this.index, seed, this.allowed).filter((w) => w !== seed);
        if (rhymes.length < 3) continue;
        const themed = rhymes.filter((w) => theme.includes(w));
        const rest = rhymes.filter((w) => !theme.includes(w));
        this.recent.push(seed, ...themed);
        if (this.recent.length > theme.length * 0.6) this.recent.splice(0, this.recent.length - Math.floor(theme.length * 0.4));
        return [seed, ...shuffle(themed, this.random), ...shuffle(rest, this.random)];
      }
    }
    const fresh = SEEDS.filter((s) => !this.recent.includes(s));
    for (const seed of shuffle(fresh, this.random)) {
      const words = family(this.index, seed, this.allowed);
      if (words.length < 4) continue;
      // Remember the seed and all its rhymes, so the next groups sound different.
      this.recent.push(...words.filter((w) => SEEDS.includes(w)));
      if (this.recent.length > SEEDS.length * 0.75) this.recent.splice(0, this.recent.length - Math.floor(SEEDS.length * 0.5));
      return shuffle(words, this.random);
    }
    return ["flow", "show", "go", "know"];
  }
}
