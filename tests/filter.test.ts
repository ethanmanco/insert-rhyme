import { describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import profane from "../public/data/words-profane.txt?raw";
import slur from "../public/data/words-slur.txt?raw";
import { baseForms, classify, LISTS, rot13 } from "../filter/classify";
import { SEEDS } from "../src/core/prompts";

const wordsOf = (text: string) => text.split("\n").filter(Boolean).map((l) => l.split("\t")[0]!);
const cleanWords = wordsOf(clean);
const profaneWords = wordsOf(profane);
const slurWords = wordsOf(slur);

/** Forms a listed word can take, built the other way round from classify's endings. */
function inflections(word: string): string[] {
  const last = word.at(-1)!;
  const forms = [word, `${word}s`, `${word}es`, `${word}ed`, `${word}er`, `${word}ers`, `${word}ing`, `${word}y`];
  if (/[bcdfgklmnprstvz]/.test(last) && /[aeiou]/.test(word.at(-2) ?? "")) forms.push(`${word}${last}y`, `${word}${last}ing`, `${word}${last}ed`);
  if (last === "e") forms.push(`${word.slice(0, -1)}ing`, `${word}d`);
  if (last === "y") forms.push(`${word.slice(0, -1)}ies`, `${word.slice(0, -1)}ier`);
  return forms;
}

describe("the lists", () => {
  it("are stored in ROT13 and decode to plain lowercase words", () => {
    expect(rot13(rot13("Hello, World"))).toBe("Hello, World");
    for (const list of Object.values(LISTS)) {
      expect(list.length).toBeGreaterThan(0);
      for (const w of list) expect(w).toBe(w.toLowerCase());
    }
  });

  it("include the whole single-word LDNOOBW English list", () => {
    expect(LISTS.ldnoobw.length).toBeGreaterThan(250);
  });
});

describe("classify", () => {
  it("catches every listed word and its common forms", () => {
    const missed: string[] = [];
    for (const word of [...LISTS.ldnoobw, ...LISTS.profane, ...LISTS.slurs]) {
      if (LISTS.allow.includes(word)) continue;
      for (const form of inflections(word)) {
        if (LISTS.allow.includes(form)) continue;
        if (classify(form) === "clean") missed.push(form);
      }
    }
    expect(missed).toEqual([]);
  });

  it("puts slurs in their own tier, above profanity", () => {
    for (const word of LISTS.slurs) expect(classify(word)).toBe("slur");
  });

  it("catches roots hidden inside longer words", () => {
    for (const root of LISTS.containsProfane) {
      expect(classify(`mother${root}er`)).not.toBe("clean");
      expect(classify(`${root}head`)).not.toBe("clean");
    }
    for (const root of LISTS.containsSlur) expect(classify(`x${root}x`)).toBe("slur");
  });

  it("ignores letter case", () => {
    const word = LISTS.profane[0]!;
    expect(classify(word.toUpperCase())).toBe("profane");
  });

  it("leaves innocent words alone, including ones that contain a bad word", () => {
    const innocent = [
      "class", "pass", "assess", "assassin", "bass", "grass", "cocktail", "peacock", "cockpit", "title",
      "butter", "scatter", "button", "rapper", "therapist", "scrape", "grape", "hello", "shell", "snigger",
      "niggle", "spicy", "wristwatch", "swank", "cumin", "hardcore", "fingering", "sussex", "analysis",
      "document", "kite", "skate", "hancock", "dickens", "cockroach", "shuttlecock", "mishit", "rapier",
    ];
    for (const word of innocent) expect([word, classify(word)]).toEqual([word, "clean"]);
  });

  it("strips one ending at a time", () => {
    expect(baseForms("sluttier")).toContain("slut");
    expect(baseForms("raping")).toContain("rape");
    expect(baseForms("titties")).toContain("titty");
    // y stays before -ing, so "busting" does not come from "busty".
    expect(baseForms("busting")).not.toContain("busty");
  });
});

describe("the shipped word files", () => {
  it("keep every explicit word out of the default (clean) file", () => {
    const leaks = cleanWords.filter((w) => classify(w) !== "clean");
    expect(leaks).toEqual([]);
  });

  it("have no listed word and no hidden root in the clean file", () => {
    const listed = new Set([...LISTS.ldnoobw, ...LISTS.profane, ...LISTS.slurs].filter((w) => !LISTS.allow.includes(w)));
    const roots = [...LISTS.containsProfane, ...LISTS.containsSlur];
    const leaks = cleanWords.filter((w) => listed.has(w) || (roots.some((r) => w.includes(r)) && !LISTS.allow.includes(w)));
    expect(leaks).toEqual([]);
  });

  it("sort explicit words into the right files", () => {
    expect(profaneWords.length).toBeGreaterThan(100);
    expect(slurWords.length).toBeGreaterThan(10);
    for (const w of profaneWords) expect(classify(w)).toBe("profane");
    for (const w of slurWords) expect(classify(w)).toBe("slur");
    const overlap = cleanWords.filter((w) => profaneWords.includes(w) || slurWords.includes(w));
    expect(overlap).toEqual([]);
  });

  it("keep prompt seeds clean", () => {
    for (const seed of SEEDS) expect([seed, classify(seed)]).toEqual([seed, "clean"]);
  });
});
