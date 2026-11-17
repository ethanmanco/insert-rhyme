import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import { classify } from "../filter/classify";
import { categoryWords, CATEGORIES, isCategory } from "../src/core/categories";
import { perfectKey } from "../src/core/phonetics";
import { family, MAX_LETTERS, PromptDeck } from "../src/core/prompts";
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
        const rhymes = family(index, word, kids).filter((w) => w !== word);
        expect([word, rhymes.length >= 3]).toEqual([word, true]);
      }
    });
  }

  it("keeps mature words out unless explicit words are on", () => {
    const houston = CATEGORIES.find((c) => c.id === "houston")!;
    expect(categoryWords(houston, false)).not.toContain("lean");
    expect(categoryWords(houston, true)).toContain("lean");
  });
});

describe("a themed deck", () => {
  it("starts every group with a theme word, followed by words that rhyme with it", () => {
    const food = CATEGORIES.find((c) => c.id === "food")!;
    const deck = new PromptDeck(index, kids, 3, categoryWords(food, false));
    for (let g = 0; g < 20; g++) {
      const first = deck.word(g, 0);
      expect(food.words).toContain(first);
      const key = perfectKey(index.entry(first)!.prons[0]!);
      for (let slot = 1; slot < 4; slot++) {
        const w = deck.word(g, slot);
        expect(index.entry(w)!.prons.some((p) => perfectKey(p) === key)).toBe(true);
      }
    }
  });

  it("moves through the theme instead of repeating one word", () => {
    const cars = CATEGORIES.find((c) => c.id === "cars")!;
    const deck = new PromptDeck(index, kids, 9, cars.words);
    const firsts = new Set(Array.from({ length: 12 }, (_, g) => deck.word(g, 0)));
    expect(firsts.size).toBeGreaterThanOrEqual(10);
  });
});
