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
