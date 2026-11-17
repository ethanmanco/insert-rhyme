/**
 * The built-in beats: free-licensed recordings (CC0 or CC BY), each cut to
 * an exact loop of whole bars by scripts/cut-loop.py. The files live in
 * public/beats. Credits and licenses are listed here and in the README.
 */

export interface Credit {
  title: string;
  artist: string;
  license: "CC0 1.0" | "CC BY 3.0" | "CC BY 4.0";
  licenseUrl: string;
  /** The track's own page, where the license was checked. */
  url: string;
}

export interface Beat {
  id: string;
  name: string;
  style: string;
  /** File name in public/beats. */
  file: string;
  /** The loop's own tempo. */
  bpm: number;
  /** Seconds of pre-roll before bar 1. */
  start: number;
  /** Bars in the loop. */
  bars: number;
  credit: Credit;
}

const BY4 = "https://creativecommons.org/licenses/by/4.0/";

/** Seconds of real audio kept after the last bar (cut-loop.py's POSTROLL). */
export const POSTROLL = 0.15;
/**
 * The MP3 encoder's lead-in (1105 samples at 44.1 kHz). Most browsers drop
 * it when decoding; if one keeps it, the file comes out longer than expected
 * and bar 1 sits this much later.
 */
export const ENCODER_DELAY = 1105 / 44100;

const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const FMA = "https://freemusicarchive.org/music/";

const beat = (id: string, name: string, style: string, bpm: number, credit: Credit): Beat => ({
  id,
  name,
  style,
  file: `${id}.mp3`,
  bpm,
  start: 0.25,
  bars: 16,
  credit,
});

export const BEATS: Beat[] = [
  beat("bap-boom", "Bap Boom", "Boom bap", 90, { title: "Bap Boom", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/the-unveiling/bap-boom/` }),
  beat("unwind", "Unwind", "Laid back", 95, { title: "Unwind", artist: "HoliznaCC0", license: "CC0 1.0", licenseUrl: CC0, url: `${FMA}holiznacc0/kick-it-laid-back-hiphop/unwind/` }),
  beat("jazz-for-the-soul", "Jazz For The Soul", "Jazzy", 120, { title: "Jazz For The Soul", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/jazz-for-the-soul/` }),
  beat("gangstazz", "Gang$tazz", "G-funk", 90, { title: "Gang$tazz", artist: "Alexandr Zhelanov", license: "CC BY 4.0", licenseUrl: BY4, url: "https://opengameart.org/content/gangtazz" }),
  beat("phonk-remix", "Phonk Remix", "Phonk", 92.03, { title: "Phonk Remix", artist: "HoliznaCC0", license: "CC0 1.0", licenseUrl: CC0, url: `${FMA}holiznacc0/phonk-aura-farming/phonk-remix/` }),
  beat("soul-trap", "Soul Trap", "Trap", 75, { title: "Soul Trap", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/soul-trap/` }),
  beat("trench-work", "Trench Work", "Drill", 110, { title: "Trench Work", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/trench-work/` }),
];

export function beatById(id: unknown): Beat {
  return BEATS.find((b) => b.id === id) ?? BEATS[0]!;
}

/** "Bap Boom by Ketsa (CC BY 4.0)" */
export function creditLine(beat: Beat): string {
  return `${beat.credit.title} by ${beat.credit.artist} (${beat.credit.license})`;
}
