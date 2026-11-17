import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import profane from "../public/data/words-profane.txt?raw";
import slur from "../public/data/words-slur.txt?raw";
import { nearKey, onset, parsePron, perfectKey, stressIndex, syllables } from "../src/core/phonetics";
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
});

describe("rhyme lookups on the real dictionary data", () => {
  const index = new RhymeIndex();
  const kids = allowedTiers(false, false);
  beforeAll(() => {
    index.add(clean, "clean");
    index.add(profane, "profane");
    index.add(slur, "slur");
  });

  const cases: [string, string[], string[]][] = [
    // word, some perfect rhymes, some near rhymes
    ["light", ["night", "fight", "bright", "right"], ["ride", "time", "fly"]],
    ["cat", ["hat", "bat", "flat", "that"], ["back", "cap", "bad"]],
    ["money", ["honey", "funny", "sunny"], ["study", "lucky"]],
    ["nation", ["station", "vacation", "creation"], ["patient", "basis"]],
    ["rhyme", ["time", "climb", "dime", "crime"], ["mind", "fly"]],
    ["flow", ["go", "show", "slow", "know"], ["boat", "cold"]],
    ["mic", ["like", "bike", "strike"], ["right", "life"]],
  ];

  for (const [word, perfect, near] of cases) {
    it(`finds rhymes for "${word}"`, () => {
      const r = index.lookup(word, kids, 500);
      expect(r.known).toBe(true);
      for (const w of perfect) expect(r.perfect).toContain(w);
      for (const w of near) expect(r.near).toContain(w);
      expect(r.perfect).not.toContain(word);
      expect(r.near).not.toContain(word);
      // A word is perfect or near, never both.
      for (const w of r.perfect) expect(r.near).not.toContain(w);
    });
  }

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
