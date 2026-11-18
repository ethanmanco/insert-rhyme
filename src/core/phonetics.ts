/**
 * Rhymes by sound, from CMU Pronouncing Dictionary pronunciations such as
 * "N AY1 T" for "night". Vowels carry a stress number: 1 main stress,
 * 2 secondary, 0 none.
 *
 * Perfect rhyme: the same sounds from the stressed vowel to the end, with a
 * different sound just before it (night / light / bite).
 * Near rhyme: the same vowel sounds from the stressed vowel on, while the
 * consonants differ (night / ride / time).
 *
 * Rap rhymes follow how rappers say words (rapPhones): an unstressed "-er"
 * is "-a" (bigger as bigga, so it rhymes with killa), and "-ing" is "-in".
 * A slant rhyme keeps the vowels and the final consonants and lets the
 * consonants in between go: dinner / killer / picture / villa, or money /
 * honey / country / hungry. That is how most rap rhymes.
 *
 * This file imports nothing, so the data build script can use it too.
 */

export type Phones = string[];

export const isVowel = (phone: string) => /\d$/.test(phone);
const bare = (phone: string) => phone.replace(/\d$/, "");

export function parsePron(pron: string): Phones {
  return pron.trim().split(/\s+/).filter(Boolean);
}

/** Index of the vowel a rhyme starts on: the last main stress, else the last secondary, else the last vowel. */
export function stressIndex(phones: Phones): number {
  for (const mark of ["1", "2"]) {
    for (let i = phones.length - 1; i >= 0; i--) if (phones[i]!.endsWith(mark)) return i;
  }
  for (let i = phones.length - 1; i >= 0; i--) if (isVowel(phones[i]!)) return i;
  return -1;
}

/** "AY T" for night: the stressed vowel and everything after it, without stress marks. */
export function perfectKey(phones: Phones): string {
  const i = stressIndex(phones);
  if (i < 0) return "";
  return phones.slice(i).map(bare).join(" ");
}

/** "AY" for night, "EY AH" for nation: only the vowels from the stressed one on. */
export function nearKey(phones: Phones): string {
  const i = stressIndex(phones);
  if (i < 0) return "";
  return phones.slice(i).filter(isVowel).map(bare).join(" ");
}

/** The consonants just before the stressed vowel ("N" in night, "" in eight). */
export function onset(phones: Phones): string {
  const i = stressIndex(phones);
  let j = i;
  while (j > 0 && !isVowel(phones[j - 1]!)) j--;
  return phones.slice(j, Math.max(j, i)).join(" ");
}

export function syllables(phones: Phones): number {
  return phones.filter(isVowel).length;
}

/**
 * A pronunciation the way rappers say its rhyme part: an unstressed "-er"
 * after the stressed vowel becomes "-a" ("B IH1 G ER0" as bigga), and a
 * final "-ing" or "-ings" becomes "-in" ("R AH1 N IH0 NG" as runnin).
 */
export function rapPhones(phones: Phones): Phones {
  const i = stressIndex(phones);
  if (i < 0) return phones;
  const out = phones.map((p, k) => (k > i && p === "ER0" ? "AH0" : p));
  const n = out.length;
  if (n - 2 > i && out[n - 2] === "IH0" && out[n - 1] === "NG") out[n - 1] = "N";
  else if (n - 3 > i && out[n - 3] === "IH0" && out[n - 2] === "NG" && out[n - 1] === "Z") out[n - 2] = "N";
  return out;
}

/** The perfect rhyme key of the rap pronunciation: bigger and nigga are both "IH G AH". */
export function rapKey(phones: Phones): string {
  return perfectKey(rapPhones(phones));
}

/** Unstressed vowels that blur into one "uh" when rapped. */
const SCHWA = new Set(["AH0", "IH0", "UH0"]);

/**
 * The slant rhyme key: the vowels from the stressed one on (unstressed
 * "uh" sounds counted as one), then the consonants after the last vowel.
 * "IH AH |" for dinner, killer and villa; "AH IY |" for money and country;
 * "AY | T" for night.
 */
export function slantKey(phones: Phones): string {
  const p = rapPhones(phones);
  const i = stressIndex(p);
  if (i < 0) return "";
  const tail = p.slice(i);
  let j = tail.length;
  while (j > 0 && !isVowel(tail[j - 1]!)) j--;
  const vowels = tail.filter(isVowel).map((v, k) => (k > 0 && SCHWA.has(v) ? "AH" : bare(v)));
  return [...vowels, "|", ...tail.slice(j)].join(" ");
}
