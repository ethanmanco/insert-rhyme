/**
 * The built-in beats: free-licensed recordings (CC0 or CC BY), each cut to
 * an exact loop of whole bars by scripts/cut-loop.py, which also evens out
 * their loudness so no sample passes full scale. The files live in
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

const beat = (id: string, name: string, style: string, bpm: number, credit: Credit, bars = 16): Beat => ({
  id,
  name,
  style,
  file: `${id}.mp3`,
  bpm,
  start: 0.25,
  bars,
  credit,
});

export const BEATS: Beat[] = [
  beat("bap-boom", "Bap Boom", "Boom bap", 90, { title: "Bap Boom", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/the-unveiling/bap-boom/` }),
  beat("unwind", "Unwind", "Laid back", 95, { title: "Unwind", artist: "HoliznaCC0", license: "CC0 1.0", licenseUrl: CC0, url: `${FMA}holiznacc0/kick-it-laid-back-hiphop/unwind/` }),
  beat("jazz-for-the-soul", "Jazz For The Soul", "Jazzy", 120, { title: "Jazz For The Soul", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/jazz-for-the-soul/` }),
  beat("gangstazz", "Gang$tazz", "G-funk", 90, { title: "Gang$tazz", artist: "Alexandr Zhelanov", license: "CC BY 4.0", licenseUrl: BY4, url: "https://opengameart.org/content/gangtazz" }),
  beat("soul-trap", "Soul Trap", "Trap", 75, { title: "Soul Trap", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/soul-trap/` }),
  beat("will-make-you-happy", "Will Make You Happy", "Soulful", 80.5, { title: "Will Make You Happy", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/will-make-you-happy/` }),
  beat("carnival-of-souls", "Carnival Of Souls", "Spooky", 80, { title: "Carnival Of Souls", artist: "HoliznaCC0", license: "CC0 1.0", licenseUrl: CC0, url: `${FMA}holiznacc0/beats-from-the-crypt/carnival-of-souls/` }),
  beat("my-deal", "My Deal", "Soulful", 80.5, { title: "My Deal", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/my-deal/` }),
  beat("importance", "Importance", "Boom bap", 85, { title: "Importance", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/importance-1/` }),
  beat("that-feeling", "That Feeling", "Soulful", 80, { title: "That Feeling", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/that-feeling/` }),
  beat("the-road", "The Road", "Boom bap", 91, { title: "The Road", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/the-road-1/` }),
  beat("all-out", "All Out", "Soulful", 79, { title: "All Out", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/all-out/` }),
  beat("ease-back", "Ease Back", "Soulful", 81, { title: "Ease Back", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/ease-back/` }),
  beat("dry-and-high", "Dry and High", "Boom bap", 98, { title: "Dry and High", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/dry-and-high/` }),
  beat("always-faithful", "Always Faithful", "Boom bap", 87, { title: "Always Faithful", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/always-faithful/` }),
  beat("dawn-faded", "Dawn Faded", "Soulful", 80.5, { title: "Dawn Faded", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/dawn-faded/` }),
  beat("tide-turns", "Tide Turns", "Boom bap", 88, { title: "Tide Turns", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/tide-turns/` }),
  beat("the-road-2", "The Road 2", "Boom bap", 91, { title: "The Road 2", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/the-road-2/` }),
  beat("soul-syrup", "Soul Syrup", "Soulful", 79.5, { title: "Soul Syrup", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/soul-syrup/` }),
  beat("overreach", "Overreach", "Boom bap", 85, { title: "Overreach", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/overreach/` }),
  beat("no-quit", "No Quit", "Boom bap", 86, { title: "No Quit", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/no-quit/` }),
  beat("vision-2", "Vision 2", "Uptempo", 110, { title: "Vision 2", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/vision-2-1/` }),
  beat("made-a-way", "Made A Way", "Uptempo", 110, { title: "Made A Way", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/master-builder/made-a-way/` }),
  beat("for-my-soul", "For My Soul", "Uptempo", 106, { title: "For My Soul", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/concrete-flowers/for-my-soul/` }),
  beat("take-me-up", "Take Me Up", "Uptempo", 125, { title: "Take Me Up", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/vintage-beats/take-me-up/` }),
  beat("beat-9", "Beat 9", "Uptempo", 118, { title: "Beat 9", artist: "Kirk Osamayo", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}kirk-osamayo/season-two-orange/beat-9/` }),
  beat("breath", "Breath", "Uptempo", 106, { title: "Breath", artist: "HoliznaCC0", license: "CC0 1.0", licenseUrl: CC0, url: `${FMA}holiznacc0/bassic/breath-1/` }),
  beat("spittin", "Spittin", "Uptempo", 128, { title: "Spittin", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/spittin/` }),
  beat("off-days", "Off Days", "Soulful", 81, { title: "Off Days", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/off-days/` }),
  beat("my-town", "My Town", "Boom bap", 90, { title: "My Town", artist: "Ketsa", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}Ketsa/cc-by-free-to-use-for-anything/my-town/` }),
  beat("mobb-deep", "Mobb Deep", "Gold school", 80, { title: "Mobb Deep", artist: "The Top One Percent", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}the-top-one-percent/late-night-luxury/mobb-deep/` }),
  beat("heavyweights", "Heavyweights", "Gold school", 90.99, { title: "Heavyweights", artist: "JMHBM", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}beat-mekanik/single/heavyweights/` }),
  beat("1999", "1999", "Gold school", 93.34, { title: "1999 | Hiphop Instrumental", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/787697/" }, 16),
  beat("enough-said", "Enough Said", "Bling era", 89.99, { title: "Enough Said", artist: "JMHBM", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}beat-mekanik/single/enough-said/` }),
  beat("reflections", "Reflections", "Trap", 70, { title: "Reflections", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/reflections-7/" }, 16),
  beat("my-way", "My Way", "Trap", 71, { title: "My Way - Hard Trap Beat", artist: "AudioByKB", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freesound.org/people/AudioWay/sounds/482327/" }, 16),
  beat("ambition", "Ambition", "Trap", 70, { title: "Ambition", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/ambition-1/" }, 16),
  beat("mercury", "Mercury", "Trap", 80, { title: "Mercury", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/mercury-5/" }, 16),
  beat("pollen", "Pollen", "Trap", 70, { title: "Pollen", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/pollen/" }, 16),
  beat("vanquish", "Vanquish", "Trap", 80, { title: "Vanquish", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals-vol-2/vanquish-1/" }, 16),
  beat("achilles", "Achilles", "Trap", 65, { title: "Achilles", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/achilles-1/" }, 16),
  beat("recess", "Recess", "Trap", 75, { title: "Recess", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/recess-1/" }, 16),
  beat("tension", "Tension", "Trap", 80, { title: "Tension", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals-vol-2/tension-4/" }, 16),
  beat("sahara", "Sahara", "Trap", 85, { title: "Sahara", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/sahara/" }, 16),
  beat("contra", "Contra", "Trap", 80, { title: "Contra", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/contra/" }, 16),
  beat("nectar", "Nectar", "Trap", 70.0, { title: "Nectar", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/nectar/" }, 16),
  beat("blizzard", "Blizzard", "Trap", 90, { title: "Blizzard", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/blizzard/" }, 16),
  beat("freedom", "Freedom", "Trap", 85, { title: "Freedom", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals-vol-2/freedom-11/" }, 16),
  beat("white-doves", "White Doves", "Trap", 85, { title: "White Doves", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals-vol-2/white-doves/" }, 16),
  beat("city-vibes", "City Vibes", "Trap", 90, { title: "City Vibes - Trap Music", artist: "AurosonMusic", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/aurosonmusic/single/city-vibes-trap-music/" }, 16),
  beat("dynamic", "Dynamic", "Trap", 80, { title: "Dynamic", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals-vol-2/dynamic/" }, 16),
  beat("blame-game", "Blame Game", "Trap", 70, { title: "Free rap trap type beat \"blame game\" e", artist: "MOHMOHRAP", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/mohmohrap/blame-game/free-rap-trap-type-beat-blame-game-e/" }, 16),
  beat("bag", "BAG", "Trap", 72.5, { title: "BAG - Hard Trap Beat", artist: "AudioByKB", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freesound.org/people/AudioWay/sounds/482328/" }, 16),
  beat("venom", "Venom", "Trap", 70, { title: "Venom", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/venom-1/" }, 16),
  beat("bengal", "Bengal", "Trap", 80, { title: "Bengal", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/bengal/" }, 16),
  beat("territorial", "Territorial", "Chicago drill", 65, { title: "Territorial", artist: "JMHBM", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}beat-mekanik/single/territorial/` }, 16),
  beat("runnin", "Runnin'", "Chicago drill", 72.5, { title: "Runnin'", artist: "JMHBM", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}beat-mekanik/single/runnin/` }, 16),
  beat("anticipated", "Anticipated", "Chicago drill", 72.5, { title: "Anticipated (Free Stems)", artist: "JMHBM", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}beat-mekanik/single/anticipated-free-stems/` }, 16),
  beat("fugitive", "Fugitive", "Chicago drill", 72.5, { title: "Fugitive", artist: "JMHBM", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}beat-mekanik/single/fugitive/` }, 16),
  beat("its-a-trap", "Its A Trap", "Chicago drill", 65, { title: "ITS A TRAP", artist: "HoliznaCC0", license: "CC0 1.0", licenseUrl: CC0, url: `${FMA}holiznacc0/after-dark/its-a-trap-1/` }, 12),
  beat("stranger", "Stranger", "Chicago drill", 70, { title: "Stranger", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-melodic-rap-instrumentals/stranger-3/` }, 16),
  beat("tei-pani", "Tei Pani", "UK drill", 70, { title: "Tei Pani", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790935/" }, 16),
  beat("black-wolf", "Black Wolf", "UK drill", 70, { title: "Black Wolf", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790952/" }, 16),
  beat("lose-my-mind", "Lose My Mind", "UK drill", 71, { title: "Lose My Mind", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790941/" }, 16),
  beat("suicide-doors", "Suicide Doors", "UK drill", 70, { title: "Suicide Doors", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790947/" }, 16),
  beat("vape", "Vape", "UK drill", 70, { title: "Vape", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790939/" }, 16),
  beat("blue-print", "Blue Print", "UK drill", 70.5, { title: "Blue Print", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/788622/" }, 12),
  beat("karma", "Karma", "UK drill", 72.5, { title: "Karma", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/788432/" }, 16),
  beat("battleground", "Battleground", "UK drill", 70.5, { title: "Battleground", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790936/" }, 16),
  beat("seizer", "Seizer", "UK drill", 70.02, { title: "Seizer", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790945/" }, 16),
  beat("emergence", "Emergence", "UK drill", 70, { title: "Emergence", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/788645/" }, 12),
  beat("into-the-night", "Into The Night", "UK drill", 70, { title: "Into The Night", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790934/" }, 16),
  beat("gostorge", "Gostorge", "UK drill", 70, { title: "Gostorge", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/788627/" }, 12),
  beat("goat", "Goat", "UK drill", 71, { title: "Goat", artist: "kontraamusic", license: "CC0 1.0", licenseUrl: CC0, url: "https://freesound.org/people/kontraamusic/sounds/790938/" }, 16),
  beat("jungalist", "Jungalist", "Jungle", 85, { title: "Jungalist Drum and bass", artist: "djgriffin", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freesound.org/people/djgriffin/sounds/829889/" }, 16),
  beat("special-forces", "Special Forces", "Jungle", 85, { title: "Special Forces", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-drum-bass-instrumentals/special-forces/` }, 16),
  beat("m-series", "M Series", "Jungle", 85, { title: "M Series", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-drum-bass-instrumentals/m-series/` }, 16),
  beat("inspire-blvd", "Inspire Blvd", "Jungle", 87.5, { title: "Inspire Blvd", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-drum-bass-instrumentals/inspire-blvd/` }, 16),
  beat("devotion", "Devotion", "Jungle", 87.5, { title: "Devotion", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-drum-bass-instrumentals/devotion-2/` }, 16),
  beat("overpower", "Overpower", "Jungle", 85.785, { title: "Overpower", artist: "1000 Handz", license: "CC BY 4.0", licenseUrl: BY4, url: `${FMA}1000-handz/cc-by-free-to-use-drum-bass-instrumentals/overpower/` }, 16),
  beat("racing-game-dnb", "Racing Game DnB", "Jungle", 84, { title: "racing game dnb (long intro)", artist: "simmys_recycle_bin", license: "CC BY 4.0", licenseUrl: BY4, url: "https://freesound.org/people/simmys_recycle_bin/sounds/757345/" }, 16),
];

/** The beat a new player starts on. */
export const DEFAULT_BEAT = "dynamic";

export function beatById(id: unknown): Beat {
  return BEATS.find((b) => b.id === id) ?? BEATS.find((b) => b.id === DEFAULT_BEAT)!;
}

/** "Bap Boom by Ketsa (CC BY 4.0)" */
export function creditLine(beat: Beat): string {
  return `${beat.credit.title} by ${beat.credit.artist} (${beat.credit.license})`;
}
