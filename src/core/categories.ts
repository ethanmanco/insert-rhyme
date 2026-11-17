/**
 * Word categories: themes for the prompt words. With a category picked, the
 * first word of every rhyme group comes from that theme, and the rest of the
 * group are its everyday rhymes (other theme words first, when they rhyme).
 *
 * Styles lean on each scene's own vocabulary. Words about drugs or weapons
 * are listed as `mature` and only show with explicit words turned on.
 * Slang the dictionary does not know gets its pronunciation in
 * scripts/build-rhymes.ts (EXTRA_WORDS).
 */

export interface Category {
  id: string;
  name: string;
  kind: "style" | "topic";
  hint: string;
  words: string[];
  /** Only used with explicit words on. */
  mature?: string[];
}

const w = (text: string) => text.split(/\s+/).filter(Boolean);

export const CATEGORIES: Category[] = [
  // ---------- Styles ----------
  {
    id: "crunk",
    name: "CRUNK",
    kind: "style",
    hint: "Atlanta club energy: loud, hype, bounce.",
    words: w("crunk club crowd loud bounce jump floor wall sweat stomp shake wild hype yell chant shout chain grill bling crazy hands low snap bass speaker drop heat"),
  },
  {
    id: "houston",
    name: "HOUSTON SLAB",
    kind: "style",
    hint: "Slow, low and candy painted: screwed and chopped.",
    words: w("slab candy paint grill screw chop slow trunk pop wood wheel boat lane cruise bang ride poke tip bump drawl hold main chrome shine glide float"),
    mature: w("drank lean cup"),
  },
  {
    id: "memphis",
    name: "MEMPHIS",
    kind: "style",
    hint: "Dark tapes, cowbells and late-night haze.",
    words: w("buck tape dark smoke haunt ghost night bass gang walk mask fog creep grave tomb river bluff cold six blade fade chant hood crypt"),
    mature: w("blunt gun"),
  },
  {
    id: "chicago",
    name: "CHICAGO DRILL",
    kind: "style",
    hint: "Cold winds, the block and the grind.",
    words: w("drill block cold wind lake side gang ice chain slide trench real grind drip flex sauce bands glide city snow mask hood team pack spin"),
    mature: w("opps glock smoke stick drum"),
  },
  {
    id: "grime",
    name: "UK GRIME",
    kind: "style",
    hint: "London bars: ends, mandem and pirate radio.",
    words: w("ends bars mic set clash garage east rain tea bruv dub gassed peak long bare ting grime chicken estate bus fam garms mate chips"),
    mature: w("shank"),
  },
  {
    id: "westcoast",
    name: "WEST COAST",
    kind: "style",
    hint: "Sunshine, lowriders and a laid-back bounce.",
    words: w("palm bounce cruise beach coast wave chill cali hop switch khaki ocean breeze funk roll lean gold"),
  },
  {
    id: "nyc",
    name: "NEW YORK BOOM BAP",
    kind: "style",
    hint: "Subways, bodegas and dusty breaks.",
    words: w("block stoop crate break queens beat rhyme mic flow verse scratch wax train concrete hustle grind boom bap"),
  },
  {
    id: "trap",
    name: "ATLANTA TRAP",
    kind: "style",
    hint: "Drip, ice and big money talk.",
    words: w("trap drip ice bands flex sauce wrist whip stack racks chain rich vault coupe pull up slime spend splash cash bag shine gold lit motion count"),
    mature: w("plug brick pack"),
  },
  {
    id: "oldschool",
    name: "OLD SCHOOL",
    kind: "style",
    hint: "Block parties, boomboxes and breakdance.",
    words: w("break dance sneaker crew block scratch spin cassette rock jam funk groove fresh fly dope beat shell toe"),
  },

  // ---------- Topics ----------
  {
    id: "food",
    name: "FOOD",
    kind: "topic",
    hint: "From breakfast to dessert.",
    words: w("cake steak bread rice pie fries cheese meat toast jam beans corn plate spoon taste sauce grill bake fish shrimp roll wings tea cream sweet nuts peach grape lime pear snack lunch feast spice"),
  },
  {
    id: "cars",
    name: "CARS",
    kind: "topic",
    hint: "Engines, rims and the open road.",
    words: w("car ride wheel rims gas brake speed race lane drive road tires hood trunk seat gear shift chrome coupe truck jeep fast crash horn lights park mile tank boost"),
  },
  {
    id: "money",
    name: "MONEY",
    kind: "topic",
    hint: "Cash, deals and big plans.",
    words: w("cash bills bank coin gold rich deal save spend stack check pay change cost price earn loan rent bag green paid boss trade bet sale vault"),
  },
  {
    id: "sports",
    name: "SPORTS",
    kind: "topic",
    hint: "Courts, fields and finals.",
    words: w("ball game team score win goal court field coach play shot hoop dunk race track kick pass throw catch swing bat run gym fan champ crown pitch net"),
  },
  {
    id: "animals",
    name: "ANIMALS",
    kind: "topic",
    hint: "Wild ones and pets.",
    words: w("cat dog bear snake shark bird fish whale fox goat sheep mouse bee bat crow hawk deer frog duck horse cow pig owl seal moose"),
  },
  {
    id: "nature",
    name: "NATURE",
    kind: "topic",
    hint: "Trees, rivers and wide open skies.",
    words: w("tree leaf grass stone rock hill sky sun moon star rain lake sea wave sand seed root flower bloom wood field stream cave cliff snow storm breeze dew"),
  },
  {
    id: "weather",
    name: "WEATHER",
    kind: "topic",
    hint: "Storms, sun and everything between.",
    words: w("rain snow storm wind cloud sun heat cold ice hail fog mist frost thunder flash gray bright warm cool chill dry wet flood blow dawn"),
  },
  {
    id: "space",
    name: "SPACE",
    kind: "topic",
    hint: "Stars, planets and rocket fuel.",
    words: w("star moon sun mars space ship light dark void earth sky fly glow beam crew zone probe dust ring"),
  },
  {
    id: "city",
    name: "CITY LIFE",
    kind: "topic",
    hint: "Streets, trains and bright lights.",
    words: w("street block train bus town cab lights crowd noise roof tower park store sign rent hood night alley mall square"),
  },
  {
    id: "music",
    name: "MUSIC",
    kind: "topic",
    hint: "Beats, bars and the booth.",
    words: w("beat bass drum snare kick song tune note key chord mic stage crowd show band sound loud tape track mix verse hook rhyme flow booth"),
  },
  {
    id: "fashion",
    name: "FASHION",
    kind: "topic",
    hint: "Fits, kicks and fresh drip.",
    words: w("shoes kicks shirt hat coat jeans chain ring watch style fresh drip fit dress suit tie lace gold rocks shades cap socks brand"),
  },
  {
    id: "tech",
    name: "TECH",
    kind: "topic",
    hint: "Phones, code and screens.",
    words: w("phone screen code app chip byte data click scroll text tweet post game bot wire cloud stream link file net drone"),
  },
  {
    id: "school",
    name: "SCHOOL",
    kind: "topic",
    hint: "Class, tests and the bell.",
    words: w("class test grade book pen bell note read write math chalk school rule quiz lunch bus team gym art learn teach"),
  },
  {
    id: "ocean",
    name: "OCEAN",
    kind: "topic",
    hint: "Waves, boats and deep blue.",
    words: w("wave sea shore sand boat ship sail deep blue tide reef shell whale shark fish dive coast bay beach port crab salt foam"),
  },
  {
    id: "fantasy",
    name: "FANTASY",
    kind: "topic",
    hint: "Kings, dragons and magic.",
    words: w("king queen crown throne sword shield knight spell wand castle tower quest gold ghost beast flame wizard elf cave map"),
  },
  {
    id: "feelings",
    name: "FEELINGS",
    kind: "topic",
    hint: "Highs, lows and everything real.",
    words: w("love hate pride fear hope pain joy rage calm proud mad glad sad blue cold heart soul mind dream trust tears smile cry"),
  },
  {
    id: "games",
    name: "VIDEO GAMES",
    kind: "topic",
    hint: "Levels, bosses and high scores.",
    words: w("game boss score coin power quest map save load lag win lose play team spawn loot skill rank screen jump"),
  },
];

export const isCategory = (id: unknown): boolean => id === "any" || CATEGORIES.some((c) => c.id === id);

/** A category's words for the current toggle: mature words only with explicit words on. */
export function categoryWords(category: Category, explicit: boolean): string[] {
  return explicit && category.mature ? [...category.words, ...category.mature] : category.words;
}
