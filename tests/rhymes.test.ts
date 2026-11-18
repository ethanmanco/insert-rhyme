import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import profane from "../public/data/words-profane.txt?raw";
import slur from "../public/data/words-slur.txt?raw";
import { nearKey, onset, parsePron, perfectKey, rapKey, rapPhones, slantKey, stressIndex, syllables } from "../src/core/phonetics";
import { allowedTiers, RhymeIndex } from "../src/core/rhymes";

describe("phonetics", () => {
  it("finds the stressed vowel", () => {
    expect(stressIndex(parsePron("N EY1 SH AH0 N"))).toBe(1);
    // Two-part words: the last main stress counts.
    expect(stressIndex(parsePron("B IH0 L IY1 V"))).toBe(3);
    // Unstressed words fall back to their last vowel.
    expect(stressIndex(parsePron("DH AH0"))).toBe(1);
  });

  it("keys perfect and near rhymes", () => {
    expect(perfectKey(parsePron("N AY1 T"))).toBe("AY T");
    expect(nearKey(parsePron("N AY1 T"))).toBe("AY");
    expect(perfectKey(parsePron("N EY1 SH AH0 N"))).toBe("EY SH AH N");
    expect(nearKey(parsePron("N EY1 SH AH0 N"))).toBe("EY AH");
    expect(onset(parsePron("N AY1 T"))).toBe("N");
    expect(onset(parsePron("EY1 T"))).toBe("");
    expect(syllables(parsePron("N EY1 SH AH0 N"))).toBe(2);
  });

  it("says the rhyme part the way rappers do", () => {
    // An unstressed -er is -a: bigger rhymes with killa.
    expect(rapPhones(parsePron("B IH1 G ER0")).join(" ")).toBe("B IH1 G AH0");
    expect(rapKey(parsePron("B IH1 G ER0"))).toBe(rapKey(parsePron("N IH1 G AH0")));
    expect(rapKey(parsePron("D AA1 L ER0 Z"))).toBe("AA L AH Z");
    // A stressed -er stays: "her" is not "huh".
    expect(rapKey(parsePron("HH ER1"))).toBe("ER");
    // -ing is -in.
    expect(rapKey(parsePron("R AH1 N IH0 NG"))).toBe("AH N IH N");
    expect(rapKey(parsePron("R AH1 N IH0 NG Z"))).toBe("AH N IH N Z");
    // A stressed "ing" stays.
    expect(rapKey(parsePron("K IH1 NG"))).toBe("IH NG");
  });

  it("keys slant rhymes by their vowels and ending", () => {
    const key = (p: string) => slantKey(parsePron(p));
    expect(key("D IH1 N ER0")).toBe("IH AH |");
    expect(key("K IH1 L ER0")).toBe(key("D IH1 N ER0"));
    expect(key("V IH1 L AH0")).toBe(key("D IH1 N ER0"));
    expect(key("P IH1 K CH ER0")).toBe(key("D IH1 N ER0"));
    expect(key("M AH1 N IY0")).toBe("AH IY |");
    expect(key("K AH1 N T R IY0")).toBe(key("M AH1 N IY0"));
    expect(key("N AY1 T")).toBe("AY | T");
    // The ending still has to match: middle is not dinner.
    expect(key("M IH1 D AH0 L")).not.toBe(key("D IH1 N ER0"));
  });
});

describe("rhyme lookups on the real dictionary data", () => {
  const index = new RhymeIndex();
  const kids = allowedTiers(false, false);
  beforeAll(() => {
    index.add(clean, "clean");
    index.add(profane, "profane");
    index.add(slur, "slur");
  });

  const cases: [string, string[], string[], string[]][] = [
    // word, some perfect rhymes, some slant rhymes, some near rhymes
    ["light", ["night", "fight", "bright", "right"], [], ["ride", "time", "fly"]],
    ["cat", ["hat", "bat", "flat", "that"], [], ["back", "cap", "bad"]],
    ["money", ["honey", "funny", "sunny"], ["study", "lucky", "country"], []],
    ["nation", ["station", "vacation", "creation"], ["basin", "raisin"], ["patient", "basis"]],
    ["rhyme", ["time", "climb", "dime", "crime"], [], ["mind", "fly"]],
    ["flow", ["go", "show", "slow", "know"], [], ["boat", "cold"]],
    ["mic", ["like", "bike", "strike"], [], ["right", "life"]],
    ["dinner", ["winner", "thinner", "beginner"], ["killer", "picture", "figure", "bigger"], []],
    ["dollar", ["collar", "scholar", "holler", "koala"], ["father", "proper"], []],
    ["running", ["cunning", "stunning"], ["nothing", "something", "button"], []],
  ];

  for (const [word, perfect, slant, near] of cases) {
    it(`finds rhymes for "${word}"`, () => {
      const r = index.lookup(word, kids, 500);
      expect(r.known).toBe(true);
      for (const w of perfect) expect(r.perfect).toContain(w);
      for (const w of slant) expect(r.slant).toContain(w);
      for (const w of near) expect(r.near).toContain(w);
      for (const list of [r.perfect, r.slant, r.near]) expect(list).not.toContain(word);
      // A word is in one list only.
      const seen = [...r.perfect, ...r.slant, ...r.near];
      expect(new Set(seen).size).toBe(seen.length);
    });
  }

  it("ignores foreign extra readings, such as fine said fee-neh", () => {
    const r = index.lookup("dinner", kids, 500);
    expect([...r.perfect, ...r.slant]).not.toContain("fine");
    expect(index.lookup("line", kids, 500).perfect).toContain("fine");
  });

  it("rhymes -er words with -a words, the way rappers say them", () => {
    const r = index.lookup("killer", kids, 500);
    for (const w of ["villa", "gorilla", "vanilla"]) expect([...r.perfect, ...r.slant]).toContain(w);
  });

  it("keeps non-rhymes out of perfect rhymes", () => {
    const r = index.lookup("light", kids, 500);
    for (const w of ["late", "lit", "ride", "lime"]) expect(r.perfect).not.toContain(w);
  });

  it("leaves out homophones and echo rhymes", () => {
    expect(index.lookup("night", kids, 500).perfect).not.toContain("knight");
    // "believe" ends in the same sounds as "leave", including the L: an echo, not a rhyme.
    expect(index.lookup("leave", kids, 500).perfect).not.toContain("believe");
    expect(index.lookup("leave", kids, 500).perfect).toContain("sleeve");
  });

  it("puts common words first", () => {
    const r = index.lookup("light", kids, 5);
    expect(r.perfect).toHaveLength(5);
    for (const w of r.perfect) expect(index.entry(w)!.size).toBeLessThanOrEqual(35);
  });

  it("knows when a word is missing, and that orange has no perfect rhyme", () => {
    expect(index.lookup("zzzxq", kids).known).toBe(false);
    const orange = index.lookup("orange", kids);
    expect(orange.known).toBe(true);
    expect(orange.perfect).toEqual([]);
  });

  it("only shows explicit words when their toggle is on", () => {
    const off = index.lookup("duck", kids, 500);
    const on = index.lookup("duck", allowedTiers(true, false), 500);
    const explicit = on.perfect.filter((w) => !off.perfect.includes(w));
    expect(explicit.length).toBeGreaterThan(0);
    for (const w of explicit) expect(index.entry(w)!.tier).toBe("profane");
  });
});
