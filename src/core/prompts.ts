import { cursesFor, EXPLICIT_PROMPTS, RAP_SLURS, slursFor, type Weighted } from "./explicit";
import { slantKey, syllables, type Accent } from "./phonetics";
import type { LyricStats } from "./rapWords";
import type { Entry, RhymeIndex, Tier } from "./rhymes";

/**
 * Prompt words. Every rhyme group in a verse gets a rhyme SOUND, and its
 * blocks get words with that sound. Sounds are rap slant rhymes (see
 * phonetics.ts): the same vowels and ending, so one group can hold dinner,
 * killer, picture and bigger, the way rappers rhyme.
 *
 * Variety comes from three rules:
 * 1. Sounds are dealt like cards: shuffled, and none comes back until the
 *    rest of the deck has been played (hundreds of groups).
 * 2. Each sound has a big pool of everyday words (up to 40), and a group
 *    draws a few at random, leaning toward common words and skipping words
 *    seen recently.
 * 3. The recent sounds and words are remembered between visits.
 *
 * With a rap style picked, a group is the style's words first: a style word
 * leads, then other style words that rhyme with it, then rap words that
 * rhyme (`flavor`), and only then everyday words, with rare everyday words
 * held back. Sounds are heard with the style's accent (phonetics.ts).
 * With lyric stats for the style (rapWords.ts), its artists' most used
 * words lead too, the most used most often, and right after the lead come
 * words those artists actually rhymed with it.
 *
 * With explicit words on, a good share of groups starts with a swear word
 * (and swear words that rhyme get mixed into other groups); with slurs on,
 * slurs are mixed in the same way. Which swears, and how often each, follows
 * the chosen rap style (see explicit.ts): the most used ones come up most.
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
export const EXPLICIT_RATE = 0.4;
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
export function soundOf(index: RhymeIndex, word: string, allowed: ReadonlySet<Tier> = new Set(["clean"]), accent: Accent = "us"): string | null {
  const e = index.entry(word);
  if (!e?.prons.length) return null;
  const pools = soundPools(index, allowed, accent);
  const keys = [...new Set(e.prons.map((p) => slantKey(p, accent)))];
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
const PROMPT_SLURS = new Set(RAP_SLURS.map((w) => w.word));
const poolCache = new WeakMap<RhymeIndex, Map<string, Map<string, Sound>>>();

/**
 * All sounds with their word pools, for the allowed tiers. Explicit pools
 * only take the swear words and slurs rap uses (explicit.ts), not every
 * word the filter catches. Cached for each set of tiers, data and accent.
 */
export function soundPools(index: RhymeIndex, allowed: ReadonlySet<Tier>, accent: Accent = "us"): Map<string, Sound> {
  const sig = [...allowed].sort().join(",") + "|" + [...index.loaded].sort().join(",") + "|" + accent;
  let cache = poolCache.get(index);
  if (!cache) poolCache.set(index, (cache = new Map()));
  const cached = cache.get(sig);
  if (cached) return cached;
  const pools = new Map<string, Sound>();
  for (const [key, entries] of index.sounds(accent)) {
    const clean = entries.filter(isCommonClean).sort((a, b) => a.size - b.size || (a.word < b.word ? -1 : 1)).slice(0, POOL_SIZE);
    const explicit = entries.filter(
      (e) => allowed.has(e.tier) && e.word.length <= MAX_LETTERS && ((e.tier === "profane" && PROMPT_SWEARS.has(e.word)) || (e.tier === "slur" && PROMPT_SLURS.has(e.word))),
    );
    if (clean.length || explicit.length) pools.set(key, { key, clean, explicit });
  }
  cache.set(sig, pools);
  return pools;
}

/** Sounds with enough everyday words to deal as a whole group. */
export function dealableSounds(pools: Map<string, Sound>): string[] {
  return [...pools.values()].filter((s) => s.clean.length >= MIN_FAMILY && s.clean.filter((e) => e.size <= 20).length >= 4).map((s) => s.key);
}

/** A word's rhyming prompt words: itself first, then its sound's everyday words (for theme checks). */
export function family(index: RhymeIndex, word: string, allowed: ReadonlySet<Tier>, accent: Accent = "us"): string[] {
  const key = soundOf(index, word, allowed, accent);
  if (!key) return [];
  const pool = soundPools(index, allowed, accent).get(key);
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

/** Common words are likelier, but rarer ones still come up (rarely, in a rap style). */
const weight = (e: Entry, rare: number) => (e.size <= 10 ? 8 : e.size <= 20 ? 4 : rare);

/** Weight of a rare everyday word in a rap style's groups: they read like a dictionary, not a verse. */
const STYLE_RARE = 0.15;
/** Most style words, and most rap words, that join a group after its lead. */
const STYLE_MATES = 3;
const FLAVOR_MATES = 3;
/** Most words the artists rhymed with the lead that join its group. */
const PAIR_MATES = 3;
/** How likely a hand-picked style word is to lead, next to lyric words (1 to 10 by use). */
const PICKED_WEIGHT = 3;
/** A theme sound used in this many recent groups is skipped while others are left. */
const RECENT_THEME_SOUNDS = 8;

/** Remembered between visits, so a reload does not bring back the same words. */
export interface Memory {
  sounds: string[];
  words: string[];
}

export interface DeckOptions {
  seed?: number;
  /** A word category's words: each group then starts with one of them. */
  theme?: string[] | null;
  /** The word category's id, which picks the swear words (a rap style's own, or everyday rap cursing). */
  style?: string | null;
  explicit?: boolean;
  slurs?: boolean;
  /** Words to leave out (the n-word with "I'm white" on). */
  hidden?: (word: string) => boolean;
  /** Rap words that fill a style's groups before everyday words (rapWords.ts). */
  flavor?: string[] | null;
  /** How the style says its words, which decides what rhymes. */
  accent?: Accent;
  /** The style's lyric stats: its artists' words and the rhymes they used. */
  lyrics?: LyricStats | null;
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
  private swears: Weighted[] = [];
  private slurs: Weighted[] = [];
  /** Share of groups a slur leads: SLUR_RATE, less any left-out words' share. */
  private slurRate = SLUR_RATE;
  /** Explicit words that may join a group: the ones on this deck's lists. */
  private extras = new Map<string, number>();
  /** The last explicit word that led a group, so it rarely leads twice running. */
  private lastLead = "";
  private topWeight = 1;
  private theme: string[] | null;
  private accent: Accent;
  /** Weight of rare everyday words. */
  private rare = 1;
  /** Theme and flavor words by rhyme sound, for filling groups. */
  private themeBySound = new Map<string, string[]>();
  private flavorBySound = new Map<string, string[]>();
  /** How many other theme and flavor words share each theme word's sound: leads with mates come up more. */
  private mateCount = new Map<string, number>();
  /** How likely each theme word is to lead: lyric words by how much the artists use them. */
  private leadWeight = new Map<string, number>();
  /** For each word, the words the style's artists rhymed with it, and how often. */
  private partners = new Map<string, Map<string, number>>();

  constructor(
    private index: RhymeIndex,
    private allowed: ReadonlySet<Tier>,
    opts: DeckOptions = {},
  ) {
    this.random = rng(opts.seed ?? Date.now());
    this.accent = opts.accent ?? "us";
    this.pools = soundPools(index, allowed, this.accent);
    this.recentSounds = [...(opts.memory?.sounds ?? [])].slice(-RECENT_SOUNDS);
    this.recentWords = [...(opts.memory?.words ?? [])].slice(-RECENT_WORDS);
    const usable = (w: string) => !!index.entry(w) && allowed.has(index.entry(w)!.tier) && !opts.hidden?.(w);
    const cleanWord = (w: string) => w.length <= MAX_LETTERS && index.entry(w)?.tier === "clean" && !opts.hidden?.(w);
    this.theme = opts.theme?.filter(usable) ?? null;
    for (const w of this.theme ?? []) this.leadWeight.set(w, PICKED_WEIGHT);
    if (opts.lyrics) {
      // Lyric words lead alongside the hand-picked ones; swears stay with the explicit groups.
      const lyricWords = opts.lyrics.words.filter(([w]) => cleanWord(w));
      for (const [w, weight] of lyricWords) this.leadWeight.set(w, Math.max(this.leadWeight.get(w) ?? 0, 1 + (9 * weight) / 1000));
      this.theme = [...new Set([...(this.theme ?? []), ...lyricWords.map(([w]) => w)])];
      const link = (a: string, b: string, n: number) => {
        if (!usable(a) || !cleanWord(b)) return;
        const map = this.partners.get(a) ?? new Map<string, number>();
        map.set(b, (map.get(b) ?? 0) + n);
        this.partners.set(a, map);
      };
      for (const [a, b, n] of opts.lyrics.pairs) {
        link(a, b, n);
        link(b, a, n);
      }
    }
    const flavor = (opts.flavor ?? []).filter((w) => usable(w) && w.length <= MAX_LETTERS);
    if (flavor.length) this.rare = STYLE_RARE;
    const bySound = (words: string[], into: Map<string, string[]>) => {
      for (const w of new Set(words))
        for (const key of new Set(index.entry(w)!.prons.map((p) => slantKey(p, this.accent)))) {
          const list = into.get(key);
          if (list) list.push(w);
          else into.set(key, [w]);
        }
    };
    bySound(this.theme ?? [], this.themeBySound);
    bySound(flavor, this.flavorBySound);
    for (const w of this.theme ?? []) {
      const key = soundOf(index, w, allowed, this.accent) ?? "";
      const mates = new Set([...(this.themeBySound.get(key) ?? []), ...(this.flavorBySound.get(key) ?? []), ...(this.partners.get(w)?.keys() ?? [])]);
      mates.delete(w);
      this.mateCount.set(w, mates.size);
    }
    // Explicit prompts need at least three everyday rhymes to lead a group.
    const rhymable = (w: Weighted) => {
      const key = soundOf(index, w.word, allowed, this.accent);
      return !!key && (this.pools.get(key)?.clean.length ?? 0) >= 3 && w.word.length <= MAX_LETTERS;
    };
    const known = (tier: Tier) => (w: Weighted) => index.entry(w.word)?.tier === tier;
    if (opts.explicit && allowed.has("profane")) {
      const list = cursesFor(opts.style).filter(known("profane"));
      list.forEach((w) => this.extras.set(w.word, w.weight));
      this.swears = list.filter(rhymable);
    }
    if (opts.slurs && allowed.has("slur")) {
      const list = slursFor(opts.style).filter((w) => known("slur")(w) && !opts.hidden?.(w.word));
      list.forEach((w) => this.extras.set(w.word, w.weight));
      this.slurs = list.filter(rhymable);
      // Leaving a word out keeps the other slurs as rare as they were.
      const total = (l: Weighted[]) => l.reduce((s, w) => s + w.weight, 0);
      const all = slursFor(opts.style).filter(known("slur"));
      this.slurRate = total(all) ? (SLUR_RATE * total(list)) / total(all) : 0;
    }
    this.topWeight = Math.max(1, ...this.extras.values());
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
    const w = (e: Entry) => weight(e, this.rare);
    while (out.length < count && left.length) {
      const total = left.reduce((s, e) => s + w(e), 0);
      let r = this.random() * total;
      let i = 0;
      while (i < left.length - 1 && (r -= w(left[i]!)) > 0) i++;
      out.push(left[i]!.word);
      left.splice(i, 1);
    }
    return out;
  }

  /**
   * Up to `max` words from `bySound` with this sound, in random order,
   * leaving out `exclude` and (when it can) words seen recently.
   */
  private mates(bySound: Map<string, string[]>, key: string, exclude: Set<string>, max: number): string[] {
    const recent = new Set(this.recentWords.slice(-RECENT_WORDS));
    const all = (bySound.get(key) ?? []).filter((w) => !exclude.has(w));
    const fresh = all.filter((w) => !recent.has(w));
    // Recent words may come back, but only one, and only when nothing fresh rhymes.
    const list = fresh.length ? fresh : all.slice(0, 1);
    return shuffle(list, this.random).slice(0, max);
  }

  /**
   * Up to `max` words the style's artists rhymed with `lead` that have this
   * sound, the most rhymed most likely, fresh ones first.
   */
  private rhymedWith(lead: string, key: string, exclude: Set<string>, max: number): string[] {
    const options = [...(this.partners.get(lead) ?? [])].filter(
      ([w]) => !exclude.has(w) && this.index.entry(w)!.prons.some((p) => slantKey(p, this.accent) === key),
    );
    const recent = new Set(this.recentWords.slice(-RECENT_WORDS));
    const fresh = options.filter(([w]) => !recent.has(w));
    const left = (fresh.length ? fresh : options.slice(0, 1)).map(([word, n]) => ({ word, weight: Math.sqrt(n) }));
    const out: string[] = [];
    while (out.length < max && left.length) {
      const word = this.weighted(left);
      out.push(word);
      left.splice(left.findIndex((x) => x.word === word), 1);
    }
    return out;
  }

  /** A group's words after its lead: words the artists rhymed with it, style words, rap words, then everyday words. */
  private fill(lead: string, key: string, pool: Sound, everyday: number): string[] {
    const taken = new Set([lead]);
    const rhymed = this.rhymedWith(lead, key, taken, PAIR_MATES);
    rhymed.forEach((w) => taken.add(w));
    const style = this.mates(this.themeBySound, key, taken, STYLE_MATES);
    style.forEach((w) => taken.add(w));
    const flavor = this.mates(this.flavorBySound, key, taken, FLAVOR_MATES);
    flavor.forEach((w) => taken.add(w));
    return [lead, ...rhymed, ...style, ...flavor, ...this.pick(pool.clean, everyday, taken)];
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
    if (this.slurs.length && r < this.slurRate) return this.explicitGroup(this.slurs);
    const swearShare = this.slurs.length ? this.slurRate + EXPLICIT_RATE : EXPLICIT_RATE;
    if (this.swears.length && r < swearShare) return this.explicitGroup(this.swears);
    if (this.theme?.length) {
      const themed = this.themeGroup();
      if (themed) return themed;
    }
    const sound = this.nextSound();
    const [first] = this.pick(sound.clean, 1, new Set());
    const words = this.fill(first!, sound.key, sound, 5);
    // With explicit words on, a matching swear or slur sometimes joins in.
    const extra = this.extraFor(sound, words);
    if (extra) words.splice(1 + Math.floor(this.random() * 2), 0, extra);
    this.remember(sound.key, words);
    return words;
  }

  /**
   * Sometimes, a swear or slur from this deck's lists that rhymes with the
   * group: half the time for the most used words, less for rarer ones.
   */
  private extraFor(sound: Sound, taken: string[]): string | null {
    const options = sound.explicit.filter((e) => this.extras.has(e.word) && !taken.includes(e.word));
    if (!options.length) return null;
    const word = this.weighted(options.map((e) => ({ word: e.word, weight: this.extras.get(e.word)! })));
    return this.random() < (0.5 * this.extras.get(word)!) / this.topWeight ? word : null;
  }

  /** One word from a weighted list. */
  private weighted(list: Weighted[]): string {
    const total = list.reduce((s, w) => s + w.weight, 0);
    let r = this.random() * total;
    for (const w of list) if ((r -= w.weight) <= 0) return w.word;
    return list[list.length - 1]!.word;
  }

  /** A group led by an explicit word (the most used ones most often), filled with everyday rhymes. */
  private explicitGroup(list: Weighted[]): string[] {
    // The last lead is less likely to lead again, without ruling it out (one word can rule a style).
    const lead = this.weighted(list.map((w) => (w.word === this.lastLead ? { ...w, weight: w.weight * 0.3 } : w)));
    this.lastLead = lead;
    const key = soundOf(this.index, lead, this.allowed, this.accent)!;
    const pool = this.pools.get(key)!;
    const words = this.fill(lead, key, pool, 5);
    const extra = this.extraFor(pool, words);
    if (extra) words.splice(2, 0, extra);
    this.remember(key, words);
    return words;
  }

  /**
   * A group led by the next theme word, then words the artists rhymed with
   * it, other theme words that rhyme, rap words that rhyme, then everyday
   * rhymes. The artists' most used words and words with more rhyming mates
   * lead more often, so groups stay in the style.
   */
  private themeGroup(): string[] | null {
    const theme = this.theme!;
    for (let tries = 0; tries < theme.length; tries++) {
      if (!this.themeQueue.length) {
        const recent = new Set(this.recentWords);
        const fresh = theme.filter((w) => !recent.has(w));
        // A weighted shuffle: the end of the queue leads first, and words with mates sort toward it.
        const pull = (w: string) => (this.leadWeight.get(w) ?? PICKED_WEIGHT) * (1 + Math.min(4, this.mateCount.get(w) ?? 0));
        const keyed = (fresh.length >= 5 ? fresh : theme).map((w) => ({ w, k: this.random() ** (1 / pull(w)) }));
        this.themeQueue = keyed.sort((a, b) => a.k - b.k).map((x) => x.w);
      }
      const lead = this.themeQueue.pop()!;
      const key = soundOf(this.index, lead, this.allowed, this.accent);
      const pool = key ? this.pools.get(key) : undefined;
      if (!key || !pool || pool.clean.filter((e) => e.word !== lead).length < 3) continue;
      // A sound heard in the last few groups waits its turn (wine, whine and shine all lead the same group).
      if (tries < theme.length / 2 && this.recentSounds.slice(-RECENT_THEME_SOUNDS).includes(key)) continue;
      const words = this.fill(lead, key, pool, 5);
      const extra = this.extraFor(pool, words);
      if (extra) words.splice(2, 0, extra);
      this.remember(key, words);
      return words;
    }
    return null;
  }
}
