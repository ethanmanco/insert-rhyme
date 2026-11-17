import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import profane from "../public/data/words-profane.txt?raw";
import slur from "../public/data/words-slur.txt?raw";
import { classify } from "../filter/classify";
import { CORE_CURSES, cursesFor, EXPLICIT_PROMPTS, RAP_SLURS, STYLES_WITH_CURSES } from "../src/core/explicit";
import { perfectKey } from "../src/core/phonetics";
import { dealableSounds, MIN_FAMILY, PromptDeck, soundOf, soundPools } from "../src/core/prompts";
import { allowedTiers, RhymeIndex } from "../src/core/rhymes";

const index = new RhymeIndex();
const kids = allowedTiers(false, false);
beforeAll(() => {
  index.add(clean, "clean");
  index.add(profane, "profane");
  index.add(slur, "slur");
});

/** True when all the words share at least one rhyme sound. */
const shareSound = (words: string[]) => {
  const sets = words.map((w) => new Set(index.entry(w)!.prons.map(perfectKey)));
  return [...sets[0]!].some((k) => sets.every((s) => s.has(k)));
};

/** Deal `groups` groups and return each group's first four words. */
function deal(deck: PromptDeck, groups: number): string[][] {
  return Array.from({ length: groups }, (_, g) => [0, 1, 2, 3].map((s) => deck.word(g, s)));
}

describe("the sound deck", () => {
  it("has hundreds of rhyme sounds, each with plenty of everyday words", () => {
    const pools = soundPools(index, kids);
    const sounds = dealableSounds(pools);
    expect(sounds.length).toBeGreaterThanOrEqual(150);
    for (const key of sounds) expect(pools.get(key)!.clean.length).toBeGreaterThanOrEqual(MIN_FAMILY);
  });

  it("gives every group four words that perfectly rhyme", () => {
    const deck = new PromptDeck(index, kids, { seed: 1 });
    for (const words of deal(deck, 40)) expect([words, shareSound(words)]).toEqual([words, true]);
  });

  it("keeps a group's words steady once dealt", () => {
    const deck = new PromptDeck(index, kids, { seed: 2 });
    expect(deck.word(5, 0)).toBe(deck.word(5, 0));
    expect(deck.word(5, 3)).toBe(deck.word(5, 3));
  });

  it("never repeats a sound within a long session", () => {
    const deck = new PromptDeck(index, kids, { seed: 3 });
    deal(deck, 150);
    const keys = deck.memory().sounds;
    expect(keys).toHaveLength(150);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("rarely repeats a word: almost every prompt in 60 groups is new", () => {
    const deck = new PromptDeck(index, kids, { seed: 4 });
    const words = deal(deck, 60).flat();
    expect(new Set(words).size / words.length).toBeGreaterThan(0.97);
  });

  it("does not deal the same few words for a sound every time", () => {
    // The -ay sound, dealt in many decks: the words should vary.
    const key = soundOf(index, "day")!;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const deck = new PromptDeck(index, kids, { seed });
      for (const g of deal(deck, 200)) if (soundOf(index, g[0]!) === key) g.forEach((w) => seen.add(w));
    }
    expect(seen.size).toBeGreaterThanOrEqual(12);
  });

  it("remembers recent sounds between visits", () => {
    const first = new PromptDeck(index, kids, { seed: 5 });
    deal(first, 30);
    const before = new Set(first.memory().sounds);
    const next = new PromptDeck(index, kids, { seed: 6, memory: first.memory() });
    deal(next, 30);
    const after = next.memory().sounds.slice(30);
    expect(after).toHaveLength(30);
    expect(after.filter((k) => before.has(k))).toEqual([]);
  });
});

describe("explicit words and slurs in prompts", () => {
  const countTier = (groups: string[][], tier: string) => groups.filter((g) => g.some((w) => index.entry(w)!.tier === tier)).length;

  it("shows none with both switches off", () => {
    const deck = new PromptDeck(index, kids, { seed: 7, explicit: false, slurs: false });
    const groups = deal(deck, 200);
    for (const w of groups.flat()) expect([w, classify(w)]).toEqual([w, "clean"]);
  });

  it("mixes in a good share of swear words with explicit on", () => {
    const deck = new PromptDeck(index, allowedTiers(true, false), { seed: 8, explicit: true });
    const groups = deal(deck, 100);
    expect(countTier(groups, "profane")).toBeGreaterThanOrEqual(30);
    expect(countTier(groups, "slur")).toBe(0);
    // Each leading swear still has real rhymes after it.
    for (const g of groups.filter((g) => index.entry(g[0]!)!.tier === "profane")) expect([g, shareSound(g)]).toEqual([g, true]);
  });

  it("mixes in slurs only with the slur switch on", () => {
    const both = new PromptDeck(index, allowedTiers(true, true), { seed: 9, explicit: true, slurs: true });
    expect(countTier(deal(both, 100), "slur")).toBeGreaterThanOrEqual(12);
    const slursOnly = new PromptDeck(index, allowedTiers(false, true), { seed: 10, slurs: true });
    const groups = deal(slursOnly, 100);
    expect(countTier(groups, "slur")).toBeGreaterThanOrEqual(12);
    expect(countTier(groups, "profane")).toBe(0);
  });

  it("uses everyday swears that the filter really marks as explicit, and slurs it marks as slurs", () => {
    for (const w of EXPLICIT_PROMPTS) expect([w, classify(w)]).toEqual([w, "profane"]);
    for (const { word } of RAP_SLURS) expect([word, classify(word)]).toEqual([word, "slur"]);
    for (const w of [...EXPLICIT_PROMPTS, ...RAP_SLURS.map((x) => x.word)]) expect([w, !!index.entry(w)]).toEqual([w, true]);
  });

  const leads = (deck: PromptDeck, groups: number, tier: string) =>
    deal(deck, groups).map((g) => g[0]!).filter((w) => index.entry(w)!.tier === tier);
  const share = (words: string[], top: string[]) => words.filter((w) => top.includes(w)).length / words.length;

  it("with any words, leans on the curses regular rap uses most", () => {
    const deck = new PromptDeck(index, allowedTiers(true, false), { seed: 11, explicit: true });
    const led = leads(deck, 400, "profane");
    const core = CORE_CURSES.map((w) => w.word);
    for (const w of led) expect(core).toContain(w);
    expect(share(led, ["shit", "fuck", "bitch", "ass", "bitches"])).toBeGreaterThan(0.45);
    expect(new Set(led).size).toBeGreaterThanOrEqual(10);
  });

  it("follows the chosen rap style: every swear that shows up is on that style's list", () => {
    for (const style of STYLES_WITH_CURSES) {
      const deck = new PromptDeck(index, allowedTiers(true, false), { seed: 12, explicit: true, style });
      const list = cursesFor(style).map((w) => w.word);
      const seen = deal(deck, 150).flat().filter((w) => index.entry(w)!.tier === "profane");
      expect(seen.length).toBeGreaterThan(30);
      for (const w of seen) expect([style, w, list.includes(w)]).toEqual([style, w, true]);
    }
  });

  it("curses like UK rappers in UK styles, and leads with ass in Miami bass", () => {
    const uk = new PromptDeck(index, allowedTiers(true, false), { seed: 13, explicit: true, style: "ukdrill" });
    const ukWords = new Set(deal(uk, 300).flat());
    expect(["twat", "prick", "wanker", "arse"].some((w) => ukWords.has(w))).toBe(true);
    expect(ukWords.has("thot")).toBe(false);
    const miami = new PromptDeck(index, allowedTiers(true, false), { seed: 14, explicit: true, style: "miami" });
    const led = leads(miami, 300, "profane");
    const counts = new Map<string, number>();
    for (const w of led) counts.set(w, (counts.get(w) ?? 0) + 1);
    expect([...counts].sort((a, b) => b[1] - a[1])[0]![0]).toBe("ass");
  });

  it("uses the slurs rap uses, mostly the n-word, rhymed the way rappers say it", () => {
    const deck = new PromptDeck(index, allowedTiers(false, true), { seed: 15, slurs: true, style: "trap" });
    const groups = deal(deck, 300);
    const seen = groups.flat().filter((w) => index.entry(w)!.tier === "slur");
    const rap = RAP_SLURS.map((w) => w.word);
    for (const w of seen) expect(rap).toContain(w);
    expect(share(seen, rap.slice(0, 2))).toBeGreaterThan(0.6);
    expect(index.lookup(rap[0]!, allowedTiers(false, true), 500).perfect).toEqual(expect.arrayContaining(["bigger", "trigger"]));
  });
});
