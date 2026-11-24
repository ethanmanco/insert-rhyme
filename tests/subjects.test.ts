import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import profane from "../public/data/words-profane.txt?raw";
import slur from "../public/data/words-slur.txt?raw";
import { categoryWords, CATEGORIES } from "../src/core/categories";
import { PromptDeck, soundOf, soundPools } from "../src/core/prompts";
import { flavorWords, lyricStats, type LyricStats } from "../src/core/rapWords";
import { allowedTiers, RhymeIndex } from "../src/core/rhymes";
import { SUBJECTS } from "../src/core/subjects";

const index = new RhymeIndex();
beforeAll(() => {
  index.add(clean, "clean");
  index.add(profane, "profane");
  index.add(slur, "slur");
});
const kids = allowedTiers(false, false);
const GROUPS = 8; // groups per 8-bar stretch (schemes.ts)

/** Share of groups whose words include one on their stretch's subject. */
function onSubject(deck: PromptDeck, stretches = 40): number {
  let hit = 0;
  let all = 0;
  for (let s = 0; s < stretches; s++) {
    const words = new Set(deck.subjectAt(s)!.words);
    for (let g = s * GROUPS; g < s * GROUPS + 4; g++) {
      all++;
      if ([0, 1, 2, 3].some((slot) => words.has(deck.word(g, slot)))) hit++;
    }
  }
  return hit / all;
}

describe("subjects", () => {
  it("are clean everyday words that fit a block, with plenty that can lead a group", () => {
    const pools = soundPools(index, kids);
    for (const s of SUBJECTS) {
      const bad = s.words.filter((w) => index.entry(w)?.tier !== "clean" || w.length > 8);
      expect([s.id, bad]).toEqual([s.id, []]);
      const leads = s.words.filter((w) => {
        const key = soundOf(index, w, kids);
        return !!key && (pools.get(key)?.clean.filter((e) => e.word !== w).length ?? 0) >= 3;
      });
      expect([s.id, leads.length >= 30]).toEqual([s.id, true]);
      expect(s.name).not.toMatch(/[—–]/);
    }
  });

  it("each hold for 8 or 16 bars, and none comes back within the next few", () => {
    const deck = new PromptDeck(index, kids, { seed: 5, subjects: SUBJECTS });
    const plan = Array.from({ length: 200 }, (_, s) => deck.subjectAt(s)!.id);
    const runs: [string, number][] = [];
    for (const id of plan) {
      const last = runs[runs.length - 1];
      if (last && last[0] === id) last[1]++;
      else runs.push([id, 1]);
    }
    runs.pop(); // the last run may be cut short
    // Two runs of one subject never touch, so every run is one or two stretches.
    for (const [, n] of runs) expect([1, 2]).toContain(n);
    expect(runs.some(([, n]) => n === 1) && runs.some(([, n]) => n === 2)).toBe(true);
    for (let i = 0; i < runs.length; i++) expect(runs.slice(Math.max(0, i - 4), i).map(([id]) => id)).not.toContain(runs[i]![0]);
    // Every subject comes up.
    expect(new Set(plan).size).toBe(SUBJECTS.length);
  });

  it("are planned from the seed alone, whichever words were drawn first", () => {
    const a = new PromptDeck(index, kids, { seed: 9, subjects: SUBJECTS });
    const b = new PromptDeck(index, kids, { seed: 9, subjects: SUBJECTS });
    for (let g = 0; g < 60; g++) a.word(g, 0);
    expect(Array.from({ length: 30 }, (_, s) => a.subjectAt(s)!.id)).toEqual(Array.from({ length: 30 }, (_, s) => b.subjectAt(s)!.id));
    expect(new PromptDeck(index, kids, { seed: 9 }).subjectAt(0)).toBeNull();
  });

  it("keep most groups on the stretch's subject, but not all", () => {
    const share = onSubject(new PromptDeck(index, kids, { seed: 3, subjects: SUBJECTS }));
    expect(share).toBeGreaterThan(0.65);
    expect(share).toBeLessThan(0.97);
    // Without subjects, the same words rarely line up by chance.
    const plain = new PromptDeck(index, kids, { seed: 3 });
    const planned = new PromptDeck(index, kids, { seed: 3, subjects: SUBJECTS });
    let hit = 0;
    for (let s = 0; s < 40; s++) {
      const words = new Set(planned.subjectAt(s)!.words);
      for (let g = s * GROUPS; g < s * GROUPS + 4; g++) if ([0, 1, 2, 3].some((k) => words.has(plain.word(g, k)))) hit++;
    }
    expect(hit / 160).toBeLessThan(share - 0.3);
  });

  it("let a rap style's own words lead on the subject, and stay in the style", () => {
    const c = CATEGORIES.find((x) => x.id === "trap")!;
    const raw: LyricStats = JSON.parse(readFileSync("public/data/styles/trap.json", "utf8"));
    const lyrics = lyricStats(raw, false);
    const style = new Set([...categoryWords(c, false), ...lyrics.words.map(([w]) => w)]);
    const deck = new PromptDeck(index, kids, {
      seed: 4,
      theme: categoryWords(c, false),
      style: c.id,
      flavor: flavorWords(c, false),
      accent: c.accent,
      lyrics,
      subjects: SUBJECTS,
    });
    expect(onSubject(deck)).toBeGreaterThan(0.6);
    const leads = Array.from({ length: 200 }, (_, g) => deck.word(g + 400, 0));
    expect(leads.filter((w) => style.has(w)).length / 200).toBeGreaterThan(0.4);
  });

  it("stay out of a picked topic, which already is one", () => {
    // main.ts passes no subjects with a topic picked; a deck without them has none.
    const food = CATEGORIES.find((x) => x.id === "food")!;
    const deck = new PromptDeck(index, kids, { seed: 2, theme: categoryWords(food, false) });
    expect(deck.subjectAt(0)).toBeNull();
  });
});
