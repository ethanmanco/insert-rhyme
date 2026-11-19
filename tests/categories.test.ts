import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import { classify } from "../filter/classify";
import { categoryWords, CATEGORIES, isCategory } from "../src/core/categories";
import { slantKey } from "../src/core/phonetics";
import { family, MAX_LETTERS, PromptDeck } from "../src/core/prompts";
import { flavorWords, RAP_MATURE, RAP_WORDS } from "../src/core/rapWords";
import { allowedTiers, RhymeIndex } from "../src/core/rhymes";

const index = new RhymeIndex();
const kids = allowedTiers(false, false);
beforeAll(() => index.add(clean, "clean"));

describe("word categories", () => {
  it("have unique ids, both kinds, and plenty of them", () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
    expect(CATEGORIES.filter((c) => c.kind === "style").length).toBeGreaterThanOrEqual(8);
    expect(CATEGORIES.filter((c) => c.kind === "topic").length).toBeGreaterThanOrEqual(12);
    expect(isCategory("any")).toBe(true);
    expect(isCategory("food")).toBe(true);
    expect(isCategory("nope")).toBe(false);
  });

  for (const c of CATEGORIES) {
    it(`${c.id}: every word is known, short, clean, and has at least 3 easy rhymes`, () => {
      const all = categoryWords(c, true);
      expect(new Set(all).size).toBe(all.length);
      expect(c.words.length).toBeGreaterThanOrEqual(12);
      for (const word of all) {
        expect([word, !!index.entry(word)]).toEqual([word, true]);
        expect(word.length).toBeLessThanOrEqual(MAX_LETTERS);
        expect([word, classify(word)]).toEqual([word, "clean"]);
        const rhymes = family(index, word, kids, c.accent).filter((w) => w !== word);
        expect([word, rhymes.length >= 3]).toEqual([word, true]);
      }
    });
  }

  it("gives every rap style plenty of its own words", () => {
    for (const c of CATEGORIES.filter((c) => c.kind === "style")) expect([c.id, c.words.length >= 25]).toEqual([c.id, true]);
  });

  it("has rap words that are known, short and clean, with drug and weapon words apart", () => {
    expect(new Set(RAP_WORDS).size).toBeGreaterThan(250);
    for (const word of [...RAP_WORDS, ...RAP_MATURE]) {
      expect([word, !!index.entry(word)]).toEqual([word, true]);
      expect(word.length).toBeLessThanOrEqual(MAX_LETTERS);
      expect([word, classify(word)]).toEqual([word, "clean"]);
    }
    const trap = CATEGORIES.find((c) => c.id === "trap")!;
    expect(flavorWords(trap, false)).not.toContain("glock");
    expect(flavorWords(trap, true)).toContain("glock");
    expect(flavorWords(CATEGORIES.find((c) => c.id === "food"), true)).toBeNull();
  });

  it("keeps mature words out unless explicit words are on", () => {
    const houston = CATEGORIES.find((c) => c.id === "houston")!;
    expect(categoryWords(houston, false)).not.toContain("lean");
    expect(categoryWords(houston, true)).toContain("lean");
  });
});

describe("a themed deck", () => {
  it("starts every group with a theme word, followed by words that rhyme with it", () => {
    const food = CATEGORIES.find((c) => c.id === "food")!;
    const deck = new PromptDeck(index, kids, { seed: 3, theme: categoryWords(food, false) });
    for (let g = 0; g < 20; g++) {
      const words = [0, 1, 2, 3].map((slot) => deck.word(g, slot));
      expect(food.words).toContain(words[0]);
      const sets = words.map((w) => new Set(index.entry(w)!.prons.map((p) => slantKey(p))));
      expect([words, [...sets[0]!].some((k) => sets.every((s) => s.has(k)))]).toEqual([words, true]);
    }
  });

  it("fills a rap style's groups with its own words and rap words, not dictionary words", () => {
    for (const id of ["chicago", "ukdrill", "houston", "underground"]) {
      const c = CATEGORIES.find((x) => x.id === id)!;
      const genre = new Set([...c.words, ...RAP_WORDS]);
      const share = (deck: PromptDeck) => {
        let hit = 0;
        for (let g = 0; g < 200; g++) for (const slot of [0, 1, 2]) if (genre.has(deck.word(g, slot))) hit++;
        return hit / 600;
      };
      const styled = new PromptDeck(index, kids, { seed: 4, theme: c.words, style: id, flavor: flavorWords(c, false), accent: c.accent });
      const plain = new PromptDeck(index, kids, { seed: 4, theme: c.words, style: id });
      const a = share(styled);
      expect([id, a > 0.55]).toEqual([id, true]);
      expect([id, a > share(plain) + 0.1]).toEqual([id, true]);
    }
  });

  it("rhymes UK styles the UK way", () => {
    const uk = CATEGORIES.find((c) => c.id === "ukdrill")!;
    expect(uk.accent).toBe("uk");
    const deck = new PromptDeck(index, kids, { seed: 2, theme: uk.words, style: uk.id, flavor: flavorWords(uk, false), accent: "uk" });
    for (let g = 0; g < 40; g++) {
      const words = [0, 1, 2, 3].map((slot) => deck.word(g, slot));
      const sets = words.map((w) => new Set(index.entry(w)!.prons.map((p) => slantKey(p, "uk"))));
      expect([words, [...sets[0]!].some((k) => sets.every((s) => s.has(k)))]).toEqual([words, true]);
    }
  });

  it("moves through the theme instead of repeating one word", () => {
    const cars = CATEGORIES.find((c) => c.id === "cars")!;
    const deck = new PromptDeck(index, kids, { seed: 9, theme: cars.words });
    const firsts = new Set(Array.from({ length: 12 }, (_, g) => deck.word(g, 0)));
    expect(firsts.size).toBeGreaterThanOrEqual(10);
  });
});
