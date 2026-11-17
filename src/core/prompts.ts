import { EXPLICIT_PROMPTS } from "./explicit";
import { perfectKey, syllables } from "./phonetics";
import type { Entry, RhymeIndex, Tier } from "./rhymes";

/**
 * Prompt words. Every rhyme group in a verse gets a rhyme SOUND (like the
 * "-ight" in night), and its blocks get words with that sound.
 *
 * Variety comes from three rules:
 * 1. Sounds are dealt like cards: shuffled, and none comes back until the
 *    rest of the deck has been played (hundreds of groups).
 * 2. Each sound has a big pool of everyday words (up to 40), and a group
 *    draws a few at random, leaning toward common words and skipping words
 *    seen recently.
 * 3. The recent sounds and words are remembered between visits.
 *
 * With explicit words on, a good share of groups starts with a swear word
 * (and swear words that rhyme get mixed into other groups); with slurs on,
 * slurs are mixed in the same way.
 */

/** Longest word that still reads on a block. */
export const MAX_LETTERS = 8;
/** Everyday words only: SCOWL size 35 and below. */
export const COMMON_SIZE = 35;
/** A sound needs this many words to be dealt, so every scheme can fill its groups. */
export const MIN_FAMILY = 8;
/** Most words kept per sound. */
export const POOL_SIZE = 40;
/** How many recent sounds and words are remembered. */
const RECENT_SOUNDS = 150;
const RECENT_WORDS = 240;
/** Share of groups that start with a swear word (explicit on) or a slur (slurs on). */
export const EXPLICIT_RATE = 0.35;
export const SLUR_RATE = 0.2;

/** Short sounds that are words in a dictionary but not good prompts. */
const SKIP = new Set([
  "re", "mi", "fa", "la", "ti", "ma", "pa", "ha", "ah", "eh", "er", "um", "hm", "uh", "nay", "ye", "dos", "bras",
  "dike", "the", "an", "than", "nor", "oh", "owe", "doe", "lain", "bloc", "ting", "ohm", "czar", "char", "par",
  "dross", "leach", "lop", "bop", "tome", "loam", "lance", "bred", "doled", "sowed", "cowed", "vat", "ounce",
  "ere", "thee", "thy", "thou", "nigh", "yon", "ewe", "sic", "per", "via", "vie", "ole", "awl", "ail", "writ", "pi", "fourths",
]);

const fitsBlock = (e: Entry) => e.word.length <= MAX_LETTERS && !SKIP.has(e.word) && Math.min(...e.prons.map(syllables)) <= 2;
const isCommonClean = (e: Entry) => e.tier === "clean" && e.size <= COMMON_SIZE && fitsBlock(e);

/**
 * The rhyme sound to use for a word. A word with two pronunciations ("cost"
 * as cawst or cost) takes the one with the most everyday rhymes.
 */
export function soundOf(index: RhymeIndex, word: string, allowed: ReadonlySet<Tier> = new Set(["clean"])): string | null {
  const e = index.entry(word);
  if (!e?.prons.length) return null;
  const pools = soundPools(index, allowed);
  const keys = [...new Set(e.prons.map(perfectKey))];
  return keys.reduce((best, k) => ((pools.get(k)?.clean.length ?? 0) > (pools.get(best)?.clean.length ?? 0) ? k : best), keys[0]!);
}

export interface Sound {
  key: string;
  /** Everyday clean words, most common first. */
  clean: Entry[];
  /** Allowed explicit words (swears or slurs) with this sound. */
  explicit: Entry[];
}

const PROMPT_SWEARS = new Set(EXPLICIT_PROMPTS);
const poolCache = new WeakMap<RhymeIndex, { sig: string; pools: Map<string, Sound> }>();

/**
 * All sounds with their word pools, for the allowed tiers. Explicit pools
 * only take everyday swear words (EXPLICIT_PROMPTS) and slurs, not every
 * word the filter catches. Cached until the tiers or the data change.
 */
export function soundPools(index: RhymeIndex, allowed: ReadonlySet<Tier>): Map<string, Sound> {
  const sig = [...allowed].sort().join(",") + "|" + [...index.loaded].sort().join(",");
  const cached = poolCache.get(index);
  if (cached?.sig === sig) return cached.pools;
  const pools = new Map<string, Sound>();
  for (const [key, entries] of index.sounds()) {
    const clean = entries.filter(isCommonClean).sort((a, b) => a.size - b.size || (a.word < b.word ? -1 : 1)).slice(0, POOL_SIZE);
    const explicit = entries.filter(
      (e) => allowed.has(e.tier) && e.word.length <= MAX_LETTERS && ((e.tier === "profane" && PROMPT_SWEARS.has(e.word)) || e.tier === "slur"),
    );
    if (clean.length || explicit.length) pools.set(key, { key, clean, explicit });
  }
  poolCache.set(index, { sig, pools });
  return pools;
}

/** Sounds with enough everyday words to deal as a whole group. */
export function dealableSounds(pools: Map<string, Sound>): string[] {
  return [...pools.values()].filter((s) => s.clean.length >= MIN_FAMILY && s.clean.filter((e) => e.size <= 20).length >= 4).map((s) => s.key);
}

/** A word's rhyming prompt words: itself first, then its sound's everyday words (for theme checks). */
export function family(index: RhymeIndex, word: string, allowed: ReadonlySet<Tier>): string[] {
  const key = soundOf(index, word, allowed);
  if (!key) return [];
  const pool = soundPools(index, allowed).get(key);
  return [word, ...(pool?.clean ?? []).map((e) => e.word).filter((w) => w !== word)];
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

/** Common words are likelier, but rarer ones still come up. */
const weight = (e: Entry) => (e.size <= 10 ? 8 : e.size <= 20 ? 4 : 1);

/** Remembered between visits, so a reload does not bring back the same words. */
export interface Memory {
  sounds: string[];
  words: string[];
}

export interface DeckOptions {
  seed?: number;
  /** A word category's words: each group then starts with one of them. */
  theme?: string[] | null;
  explicit?: boolean;
  slurs?: boolean;
  memory?: Memory;
}

/**
 * Hands out words for rhyme groups as the verse goes. A group keeps its
 * words once chosen, so the bars ahead and the current bar agree.
 */
export class PromptDeck {
  private groups = new Map<number, string[]>();
  private random: () => number;
  private pools: Map<string, Sound>;
  private queue: string[] = [];
  private themeQueue: string[] = [];
  private recentSounds: string[];
  private recentWords: string[];
  private swears: Entry[] = [];
  private slurs: Entry[] = [];
  private theme: string[] | null;

  constructor(
    private index: RhymeIndex,
    private allowed: ReadonlySet<Tier>,
    opts: DeckOptions = {},
  ) {
    this.random = rng(opts.seed ?? Date.now());
    this.pools = soundPools(index, allowed);
    this.recentSounds = [...(opts.memory?.sounds ?? [])].slice(-RECENT_SOUNDS);
    this.recentWords = [...(opts.memory?.words ?? [])].slice(-RECENT_WORDS);
    this.theme = opts.theme?.filter((w) => index.entry(w)) ?? null;
    // Explicit prompts need at least three everyday rhymes to fill a group.
    const rhymable = (e: Entry) => {
      const key = soundOf(index, e.word, allowed);
      return !!key && (this.pools.get(key)?.clean.length ?? 0) >= 3 && e.word.length <= MAX_LETTERS;
    };
    if (opts.explicit && allowed.has("profane")) {
      this.swears = EXPLICIT_PROMPTS.map((w) => index.entry(w)).filter((e): e is Entry => !!e && e.tier === "profane" && rhymable(e));
    }
    if (opts.slurs && allowed.has("slur")) {
      this.slurs = index.tierWords("slur").filter((e) => rhymable(e) && Math.min(...e.prons.map(syllables)) <= 3);
    }
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

  /** What to remember for next time. */
  memory(): Memory {
    return { sounds: this.recentSounds.slice(-RECENT_SOUNDS), words: this.recentWords.slice(-RECENT_WORDS) };
  }

  private remember(key: string, words: string[]) {
    this.recentSounds.push(key);
    this.recentWords.push(...words);
    if (this.recentSounds.length > RECENT_SOUNDS * 2) this.recentSounds.splice(0, this.recentSounds.length - RECENT_SOUNDS);
    if (this.recentWords.length > RECENT_WORDS * 2) this.recentWords.splice(0, this.recentWords.length - RECENT_WORDS);
  }

  /** Draw `count` different words from a pool, weighted toward common ones, avoiding recent words when it can. */
  private pick(pool: Entry[], count: number, exclude: Set<string>): string[] {
    const recent = new Set(this.recentWords.slice(-RECENT_WORDS));
    let candidates = pool.filter((e) => !exclude.has(e.word) && !recent.has(e.word));
    if (candidates.length < count) candidates = pool.filter((e) => !exclude.has(e.word));
    const out: string[] = [];
    const left = [...candidates];
    while (out.length < count && left.length) {
      const total = left.reduce((s, e) => s + weight(e), 0);
      let r = this.random() * total;
      let i = 0;
      while (i < left.length - 1 && (r -= weight(left[i]!)) > 0) i++;
      out.push(left[i]!.word);
      left.splice(i, 1);
    }
    return out;
  }

  /** The next sound from the shuffled deck, refilled (minus recent ones) when it runs out. */
  private nextSound(): Sound {
    if (!this.queue.length) {
      const all = dealableSounds(this.pools);
      const recent = new Set(this.recentSounds.slice(-Math.min(RECENT_SOUNDS, Math.floor(all.length * 0.6))));
      const fresh = all.filter((k) => !recent.has(k));
      this.queue = shuffle(fresh.length >= 10 ? fresh : all, this.random);
    }
    return this.pools.get(this.queue.pop()!)!;
  }

  private draw(): string[] {
    const r = this.random();
    if (this.slurs.length && r < SLUR_RATE) return this.explicitGroup(this.slurs);
    const swearShare = this.slurs.length ? SLUR_RATE + EXPLICIT_RATE : EXPLICIT_RATE;
    if (this.swears.length && r < swearShare) return this.explicitGroup(this.swears);
    if (this.theme?.length) {
      const themed = this.themeGroup();
      if (themed) return themed;
    }
    const sound = this.nextSound();
    const words = this.pick(sound.clean, 6, new Set());
    // With explicit words on, a matching swear or slur sometimes joins in.
    if (sound.explicit.length && this.random() < 0.5) {
      const extra = sound.explicit[Math.floor(this.random() * sound.explicit.length)]!.word;
      words.splice(1 + Math.floor(this.random() * 2), 0, extra);
    }
    this.remember(sound.key, words);
    return words;
  }

  /** A group led by an explicit word, filled with everyday rhymes. */
  private explicitGroup(list: Entry[]): string[] {
    const recent = new Set(this.recentWords);
    const fresh = list.filter((e) => !recent.has(e.word));
    const lead = (fresh.length ? fresh : list)[Math.floor(this.random() * (fresh.length || list.length))]!;
    const key = soundOf(this.index, lead.word, this.allowed)!;
    const pool = this.pools.get(key)!;
    const words = [lead.word, ...this.pick(pool.clean, 5, new Set([lead.word]))];
    const more = pool.explicit.filter((e) => e.word !== lead.word);
    if (more.length && this.random() < 0.5) words.splice(2, 0, more[Math.floor(this.random() * more.length)]!.word);
    this.remember(key, words);
    return words;
  }

  /** A group led by the next theme word, then other theme words that rhyme, then everyday rhymes. */
  private themeGroup(): string[] | null {
    const theme = this.theme!;
    for (let tries = 0; tries < theme.length; tries++) {
      if (!this.themeQueue.length) {
        const recent = new Set(this.recentWords);
        const fresh = theme.filter((w) => !recent.has(w));
        this.themeQueue = shuffle(fresh.length >= 5 ? fresh : theme, this.random);
      }
      const lead = this.themeQueue.pop()!;
      const key = soundOf(this.index, lead, this.allowed);
      const pool = key ? this.pools.get(key) : undefined;
      if (!key || !pool || pool.clean.filter((e) => e.word !== lead).length < 3) continue;
      const themed = shuffle(
        theme.filter((w) => w !== lead && soundOf(this.index, w, this.allowed) === key),
        this.random,
      );
      const rest = this.pick(pool.clean, 5, new Set([lead, ...themed]));
      const words = [lead, ...themed, ...rest];
      if (pool.explicit.length && this.random() < 0.5) words.splice(2, 0, pool.explicit[Math.floor(this.random() * pool.explicit.length)]!.word);
      this.remember(key, words);
      return words;
    }
    return null;
  }
}
