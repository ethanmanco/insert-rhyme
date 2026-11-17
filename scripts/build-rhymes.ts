// Builds the rhyme word files in public/data from two pinned sources:
//   - CMU Pronouncing Dictionary, cmudict.dict at commit 7479086
//     https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict
//   - SCOWL 2020.12.07 (Spell Checker Oriented Word Lists), its final/ folder
//     https://downloads.sourceforge.net/project/wordlist/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz
//
// Usage (Node 24 runs TypeScript directly):
//   node scripts/build-rhymes.ts <folder with cmudict.dict and scowl-2020.12.07/>
//
// Output, one word per line as "word<TAB>size<TAB>pronunciation|pronunciation":
//   words-clean.txt    everyday words, always loaded
//   words-profane.txt  explicit words, loaded only with that toggle on
//   words-slur.txt     slurs, loaded only with the slur toggle on
// "size" is the SCOWL size the word first appears in: 10 is among the most
// common English words, 60 is still in most dictionaries. Explicit words
// missing from SCOWL get 90.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classify, type Tier } from "../filter/classify.ts";

const src = process.argv[2];
if (!src || !existsSync(join(src, "cmudict.dict"))) throw new Error("Usage: node scripts/build-rhymes.ts <source folder>");

/** Everyday words go up to size 60; explicit words are looked for up to 80. */
const CLEAN_MAX = 60;
const SIZES = [10, 20, 35, 40, 50, 55, 60, 70, 80];
const UNLISTED = 90;

const size = new Map<string, number>();
for (const s of SIZES) {
  for (const list of ["english-words", "american-words"]) {
    const path = join(src, "scowl-2020.12.07", "final", `${list}.${s}`);
    if (!existsSync(path)) continue;
    for (const word of readFileSync(path, "latin1").split(/\r?\n/)) {
      if (/^[a-z]{2,}$/.test(word) && !size.has(word)) size.set(word, s);
    }
  }
}

// cmudict.dict lines: "word pron", with "word(2) pron" for other pronunciations and "#" comments.
const prons = new Map<string, string[]>();
for (const line of readFileSync(join(src, "cmudict.dict"), "utf8").split(/\r?\n/)) {
  const m = /^([a-z]+)(?:\(\d+\))?\s+([A-Z0-9 ]+?)\s*(?:#.*)?$/.exec(line);
  if (!m) continue;
  const [, word, pron] = m as unknown as [string, string, string];
  const list = prons.get(word) ?? [];
  if (!list.includes(pron)) list.push(pron);
  prons.set(word, list);
}

// Fixes where the dictionary misses how rappers say a word.
const OVERRIDES: Record<string, string[]> = {
  mic: ["M AY1 K"],
  mics: ["M AY1 K S"],
};
for (const [word, list] of Object.entries(OVERRIDES)) prons.set(word, list);

// Slang the word lists and dictionary are missing, used by the word categories.
// Each one goes in as an everyday word (size 50).
const EXTRA_WORDS: Record<string, string> = {
  crunk: "K R AH1 NG K",
  bling: "B L IH1 NG",
  opps: "AA1 P S",
  glock: "G L AA1 K",
  bruv: "B R AH1 V",
  garms: "G AA1 R M Z",
  cali: "K AE1 L IY0",
  bap: "B AE1 P",
  app: "AE1 P",
  bot: "B AA1 T",
  fam: "F AE1 M",
};
for (const [word, pron] of Object.entries(EXTRA_WORDS)) {
  prons.set(word, [pron]);
  if (!size.has(word) || size.get(word)! > 50) size.set(word, 50);
}

const out: Record<Tier, string[]> = { clean: [], profane: [], slur: [] };
for (const [word, list] of [...prons].sort(([a], [b]) => (a < b ? -1 : 1))) {
  if (word.length < 2) continue;
  const tier = classify(word);
  const s = size.get(word);
  if (tier === "clean" && (s === undefined || s > CLEAN_MAX)) continue;
  out[tier].push(`${word}\t${s ?? UNLISTED}\t${list.join("|")}`);
}

const dest = join(import.meta.dirname, "..", "public", "data");
mkdirSync(dest, { recursive: true });
for (const tier of ["clean", "profane", "slur"] as Tier[]) {
  writeFileSync(join(dest, `words-${tier}.txt`), out[tier].join("\n") + "\n");
  console.log(`${tier}: ${out[tier].length} words`);
}
