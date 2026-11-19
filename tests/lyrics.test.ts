import { existsSync, readdirSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import clean from "../public/data/words-clean.txt?raw";
import profane from "../public/data/words-profane.txt?raw";
import slur from "../public/data/words-slur.txt?raw";
import { categoryWords, CATEGORIES } from "../src/core/categories";
import { LYRIC_SONGS } from "../src/core/lyricCounts";
import { slantKey } from "../src/core/phonetics";
import { PromptDeck } from "../src/core/prompts";
import { flavorWords, isMature, lyricStats, type LyricStats } from "../src/core/rapWords";
import { allowedTiers, RhymeIndex } from "../src/core/rhymes";

const index = new RhymeIndex();
beforeAll(() => {
  index.add(clean, "clean");
  index.add(profane, "profane");
  index.add(slur, "slur");
});

const DIR = "public/data/styles";
const load = (id: string): LyricStats => JSON.parse(readFileSync(`${DIR}/${id}.json`, "utf8"));
const styles = CATEGORIES.filter((c) => c.kind === "style");

describe("lyric stats", () => {
  it("cover every rap style with enough songs, and nothing else", () => {
    const files = readdirSync(DIR).map((f) => f.replace(/\.json$/, ""));
    expect(files.sort()).toEqual(Object.keys(LYRIC_SONGS).sort());
    for (const id of files) expect(styles.some((c) => c.id === id)).toBe(true);
    // Jersey club has too few songs in the data and keeps its hand-picked words.
    expect(LYRIC_SONGS.jersey).toBeUndefined();
    expect(styles.filter((c) => LYRIC_SONGS[c.id]).length).toBeGreaterThanOrEqual(25);
  });

  for (const c of styles.filter((c) => existsSync(`${DIR}/${c.id}.json`))) {
    it(`${c.id}: holds only single known words and rhyme pairs, no lyric lines`, () => {
      const raw = load(c.id);
      expect(Object.keys(raw).sort()).toEqual(["pairs", "words"]);
      expect(raw.words.length).toBeGreaterThanOrEqual(150);
      expect(raw.pairs.length).toBeGreaterThanOrEqual(100);
      for (const [word, weight] of raw.words) {
        expect(word).toMatch(/^[a-z]{3,8}$/);
        expect(weight).toBeGreaterThanOrEqual(1);
        expect(weight).toBeLessThanOrEqual(1000);
        expect([word, !!index.entry(word)]).toEqual([word, true]);
      }
      for (const [a, b, n] of raw.pairs) {
        expect(a).toMatch(/^[a-z]{3,8}$/);
        expect(b).toMatch(/^[a-z]{3,8}$/);
        expect(n).toBeGreaterThanOrEqual(2);
        // The build script's rhyme keys agree with the app's (it is a port of phonetics.ts).
        const keys = (w: string) => new Set(index.entry(w)!.prons.map((p) => slantKey(p, c.accent)));
        const kb = keys(b);
        expect([a, b, [...keys(a)].some((k) => kb.has(k))]).toEqual([a, b, true]);
      }
    });
  }

  it("leave drug and weapon words out unless explicit words are on", () => {
    const raw = load("chicago");
    expect(raw.words.some(([w]) => isMature(w))).toBe(true);
    const kids = lyricStats(raw, false);
    expect(kids.words.some(([w]) => isMature(w))).toBe(false);
    expect(kids.pairs.some(([a, b]) => isMature(a) || isMature(b))).toBe(false);
    expect(lyricStats(raw, true)).toBe(raw);
  });

  it("put words the artists rhymed with the lead right after it", () => {
    for (const id of ["chicago", "trap", "memphis"]) {
      const c = styles.find((x) => x.id === id)!;
      const lyrics = lyricStats(load(id), false);
      const rhymed = new Set(lyrics.pairs.map(([a, b]) => [a, b].sort().join("/")));
      const kids = allowedTiers(false, false);
      const deck = new PromptDeck(index, kids, { seed: 8, theme: categoryWords(c, false), style: id, flavor: flavorWords(c, false), accent: c.accent, lyrics });
      const plain = new PromptDeck(index, kids, { seed: 8, theme: categoryWords(c, false), style: id, flavor: flavorWords(c, false), accent: c.accent });
      const share = (d: PromptDeck) => {
        let hit = 0;
        for (let g = 0; g < 200; g++) if (rhymed.has([d.word(g, 0), d.word(g, 1)].sort().join("/"))) hit++;
        return hit / 200;
      };
      const withLyrics = share(deck);
      expect([id, withLyrics >= 0.4]).toEqual([id, true]);
      expect([id, withLyrics > share(plain) + 0.15]).toEqual([id, true]);
      // Lyric words lead groups, not only the hand-picked ones.
      const picked = new Set(c.words);
      const leads = Array.from({ length: 100 }, (_, g) => deck.word(g + 200, 0));
      expect([id, leads.filter((w) => !picked.has(w)).length >= 30]).toEqual([id, true]);
    }
  });
});
