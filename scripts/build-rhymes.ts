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
import { classify, rot13, type Tier } from "../filter/classify.ts";

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
  yay: "Y EY1",
  thizz: "TH IH1 Z",
  twerk: "T W ER1 K",
  jawn: "JH AO1 N",
  dior: "D IY0 AO1 R",
  bro: "B R OW1",
  // Rap slang and places for the rap styles and rap words (src/core/rapWords.ts).
  guap: "G W AA1 P",
  benz: "B EH1 N Z",
  homie: "HH OW1 M IY0",
  homies: "HH OW1 M IY0 Z",
  dawg: "D AO1 G",
  rolex: "R OW1 L EH2 K S",
  gucci: "G UW1 CH IY0",
  prada: "P R AA1 D AH0",
  wraith: "R EY1 TH",
  turnt: "T ER1 N T",
  swang: "S W AE1 NG",
  caddy: "K AE1 D IY0",
  playa: "P L EY1 AH0",
  texas: "T EH1 K S AH0 S",
  codeine: "K OW1 D IY2 N",
  phonk: "F AA1 NG K",
  hoodie: "HH UH1 D IY0",
  sosa: "S OW1 S AH0",
  glizzy: "G L IH1 Z IY0",
  bando: "B AE1 N D OW0",
  glo: "G L OW1",
  wock: "W AA1 K",
  foenem: "F OW1 N AH0 M",
  blick: "B L IH1 K",
  perc: "P ER1 K",
  london: "L AH1 N D AH0 N",
  mandem: "M AE1 N D EH0 M",
  peng: "P EH1 NG",
  innit: "IH1 N IH0 T",
  blud: "B L AH1 D",
  riddim: "R IH1 D IH0 M",
  creps: "K R EH1 P S",
  compton: "K AA1 M P T AH0 N",
  bandana: "B AE0 N D AE1 N AH0",
  locs: "L OW1 K S",
  chucks: "CH AH1 K S",
  cuz: "K AH1 Z",
  harlem: "HH AA1 R L AH0 M",
  bronx: "B R AA1 NG K S",
  shaolin: "SH AW1 L IH0 N",
  cypher: "S AY1 F ER0",
  timbs: "T IH1 M Z",
  gat: "G AE1 T",
  skrrt: "S K ER1 T",
  lambo: "L AE1 M B OW0",
  jugg: "JH AH1 G",
  adidas: "AH0 D IY1 D AH0 S",
  def: "D EH1 F",
  donut: "D OW1 N AH2 T",
  oakland: "OW1 K L AH0 N D",
  frisco: "F R IH1 S K OW0",
  yee: "Y IY1",
  nola: "N OW1 L AH0",
  krewe: "K R UW1",
  juvie: "JH UW1 V IY0",
  crawfish: "K R AO1 F IH2 SH",
  motown: "M OW1 T AW2 N",
  cartier: "K AA2 R T IY0 EY1",
  wheelie: "W IY1 L IY0",
  hoagie: "HH OW1 G IY0",
  canarsie: "K AH0 N AA1 R S IY0",
  flatbush: "F L AE1 T B UH2 SH",
  shmoney: "SH M AH1 N IY0",
  opp: "AA1 P",
  skeng: "S K EH1 NG",
  postcode: "P OW1 S T K OW2 D",
  yute: "Y UW1 T",
  pree: "P R IY1",
  wavey: "W EY1 V IY0",
  dade: "D EY1 D",
  haiti: "HH EY1 T IY0",
  maybach: "M AY1 B AA2 K",
  tech: "T EH1 K",
  synth: "S IH1 N TH",
  xan: "Z AE1 N",
  naija: "N AY1 JH AH0",
  ghana: "G AA1 N AH0",
  jollof: "JH AA1 L AH0 F",
  afro: "AE1 F R OW0",
  gyal: "G Y AA1 L",
  bashment: "B AE1 SH M AH0 N T",
  newark: "N UW1 ER0 K",
  grillz: "G R IH1 L Z",
  ringtone: "R IH1 NG T OW2 N",
  toronto: "T ER0 AA1 N T OW0",
  kush: "K UH1 SH",
  hella: "HH EH1 L AH0",
  hyphy: "HH AY1 F IY0",
  swag: "S W AE1 G",
};
// Rap words the dictionary lacks, kept in their own tier by the filter. The
// n-word ends in "-a"; the rhyme keys say "-er" as "-a" too, so it still
// rhymes with "bigger" and "trigger" (see src/core/phonetics.ts).
// Stored in ROT13 like the filter's lists.
const RAP_EXTRAS: Record<string, string> = {
  avttn: "N IH1 G AH0",
  avttnf: "N IH1 G AH0 Z",
  gubg: "TH AA1 T",
  gubgf: "TH AA1 T S",
};
for (const [encoded, pron] of Object.entries(RAP_EXTRAS)) {
  const word = rot13(encoded);
  prons.set(word, [pron]);
  if (!size.has(word)) size.set(word, 50);
}

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
