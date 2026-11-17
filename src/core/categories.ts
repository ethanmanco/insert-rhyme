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
  // ---------- More styles ----------
  {
    id: "hyphy",
    name: "BAY AREA HYPHY",
    kind: "style",
    hint: "Go dumb: ghost rides, scrapers and sideshows.",
    words: w("ghost ride scraper bay whip mob dumb shades yay town slaps rap thump bang swerve spin wild loud crowd dip"),
    mature: w("thizz"),
  },
  {
    id: "bounce",
    name: "NEW ORLEANS BOUNCE",
    kind: "style",
    hint: "Second lines, brass and a call-and-response bounce.",
    words: w("bounce brass parade shake wobble drum crowd chant call jazz street beads spice heat swamp boat river line twerk wave beat"),
  },
  {
    id: "detroit",
    name: "DETROIT",
    kind: "style",
    hint: "Motor City grit: steel, cold and the grind.",
    words: w("steel grind cold chrome plant shift line block mile freeze lake grit hustle shop beat raw tough flint bone work ice"),
  },
  {
    id: "philly",
    name: "PHILLY",
    kind: "style",
    hint: "Row homes, cheesesteaks and freestyle battles.",
    words: w("jawn steak bell broad block row stoop cheese rocky eagle wit bar battle street train ride grind proud loud"),
  },
  {
    id: "brooklyn",
    name: "BROOKLYN DRILL",
    kind: "style",
    hint: "Woo, sliding 808s and a dance to match.",
    words: w("woo slide dance drip gang dior block train stoop brook bounce bag wave rich ice chain spin crew tough"),
    mature: w("opps glock smoke"),
  },
  {
    id: "ukdrill",
    name: "UK DRILL",
    kind: "style",
    hint: "Roads, mandem energy and sliding basses.",
    words: w("roads ends bruv fam trap splash bars wave drip ting slide link block pack gang cold rain"),
    mature: w("opps shank"),
  },
  {
    id: "miami",
    name: "MIAMI BASS",
    kind: "style",
    hint: "Booming 808s, beach heat and a big bounce.",
    words: w("bass booty beach heat sand palm wave boom shake drop sun tan boat ocean pink drive vice speaker trunk bounce"),
  },
  {
    id: "chopper",
    name: "MIDWEST CHOPPER",
    kind: "style",
    hint: "Rapid-fire flows: fast, twisty and tight.",
    words: w("chop fast quick spit tongue twist speed flash blink race tight rush rip zip snap burst blast whip"),
  },
  {
    id: "battle",
    name: "BATTLE RAP",
    kind: "style",
    hint: "Punchlines, angles and a crowd that reacts.",
    words: w("battle punch line bars crowd round scheme angle react roast flip shot burn clown joke weak pen pad mic win lose"),
  },
  {
    id: "conscious",
    name: "CONSCIOUS",
    kind: "style",
    hint: "Truth, roots and a message.",
    words: w("truth mind soul free peace roots wise hope change power rise teach path light youth book struggle"),
  },
  {
    id: "horror",
    name: "HORRORCORE",
    kind: "style",
    hint: "Ghosts, graves and things in the dark.",
    words: w("ghost grave skull bones night fear scream crypt witch demon creep dark fog moon howl chain haunt tomb rot"),
    mature: w("blood knife"),
  },
  {
    id: "emo",
    name: "EMO RAP",
    kind: "style",
    hint: "Heartbreak, rain and late-night feelings.",
    words: w("tears heart pain sad broke rain sleep dream ghost rose cold numb hurt cry fade gone alone lost scar black"),
    mature: w("pills lean"),
  },
  {
    id: "rage",
    name: "RAGE",
    kind: "style",
    hint: "Mosh pits, loud synths and chaos.",
    words: w("rage pit punk vamp slime jump wild crowd loud red stage scream fire spin crash flip"),
  },
  {
    id: "afroswing",
    name: "AFROSWING",
    kind: "style",
    hint: "Smooth vibes, sweet melodies and a whine.",
    words: w("vibe wine dance sweet honey sun waist move groove whine shine beach slow palm love"),
  },
  {
    id: "jersey",
    name: "JERSEY CLUB",
    kind: "style",
    hint: "Fast kicks, bed squeaks and a club bounce.",
    words: w("club kick bounce shore bed squeak dance slide stomp jump sweat fast beat crowd drop loop chop"),
  },

  // ---------- More topics ----------
  {
    id: "family",
    name: "FAMILY",
    kind: "topic",
    hint: "Mom, pops and the people at home.",
    words: w("mom pop son kin home house kids aunt niece wife twin brother dad bond love blood roots"),
  },
  {
    id: "friends",
    name: "FRIENDS AND CREW",
    kind: "topic",
    hint: "Day ones, the squad and loyalty.",
    words: w("crew squad team friend bro fam gang click trust real day ride side back true tight bond"),
  },
  {
    id: "hustle",
    name: "HUSTLE",
    kind: "topic",
    hint: "Grind, work and getting it done.",
    words: w("grind work hustle shift job boss goal plan rise early late sweat paid earn build climb drive gain"),
  },
  {
    id: "party",
    name: "PARTY",
    kind: "topic",
    hint: "Lights down, music up.",
    words: w("dance light drink loud crowd floor beat cake friends night late wild jump spin drop bass vibe glow snack"),
  },
  {
    id: "love",
    name: "LOVE",
    kind: "topic",
    hint: "Crushes, dates and heartbreak.",
    words: w("love heart kiss date rose crush touch dream sweet hold miss call text ring true near dear fall"),
  },
  {
    id: "travel",
    name: "TRAVEL",
    kind: "topic",
    hint: "Planes, trains and somewhere new.",
    words: w("plane train trip map road bag pack flight ride sea beach town hotel pass gate fly far tour view boat"),
  },
  {
    id: "movies",
    name: "MOVIES",
    kind: "topic",
    hint: "Lights, camera, popcorn.",
    words: w("scene star cast role plot script set lights screen ticket fight chase end show seat"),
  },
  {
    id: "body",
    name: "BODY",
    kind: "topic",
    hint: "Head to toe.",
    words: w("head hand feet heart chest arm leg knee back neck face eyes nose lips teeth hair skin bone brain"),
  },
  {
    id: "pirates",
    name: "PIRATES",
    kind: "topic",
    hint: "Ships, maps and buried gold.",
    words: w("ship sail sea map gold chest crew deck plank hook mast flag storm wave treasure parrot sword coin"),
  },
  {
    id: "heroes",
    name: "SUPERHEROES",
    kind: "topic",
    hint: "Powers, capes and saving the day.",
    words: w("cape mask power fly strong speed save fight city night shield beam team sign tower suit"),
  },
  {
    id: "holidays",
    name: "HOLIDAYS",
    kind: "topic",
    hint: "Gifts, feasts and family time.",
    words: w("gift tree snow feast cake candle card bell sleigh toy wrap lights star cheer treat parade fire"),
  },
  {
    id: "jobs",
    name: "JOBS",
    kind: "topic",
    hint: "Chefs, cops, coaches and more.",
    words: w("cook coach nurse judge clerk teacher cop guard boss baker singer writer miner"),
  },
  {
    id: "science",
    name: "SCIENCE",
    kind: "topic",
    hint: "Labs, atoms and big ideas.",
    words: w("lab test cell light heat cold gas mass force wave sound code brain germ plant star space mind"),
  },
  {
    id: "summer",
    name: "SUMMER",
    kind: "topic",
    hint: "Heat, pools and long days.",
    words: w("sun heat beach pool sand wave tan shade ice cream fan swim trip camp grill park late break burn"),
  },
  {
    id: "winter",
    name: "WINTER",
    kind: "topic",
    hint: "Snow, ice and cold nights.",
    words: w("snow ice cold frost sled coat glove fire freeze chill skate flake storm wind white night hot"),
  },
  {
    id: "halloween",
    name: "HALLOWEEN",
    kind: "topic",
    hint: "Costumes, candy and a scare.",
    words: w("candy treat trick mask ghost witch bat cat moon night scare scream cape spell broom fang bone grave"),
  },
];

export const isCategory = (id: unknown): boolean => id === "any" || CATEGORIES.some((c) => c.id === id);

/** A category's words for the current toggle: mature words only with explicit words on. */
export function categoryWords(category: Category, explicit: boolean): string[] {
  return explicit && category.mature ? [...category.words, ...category.mature] : category.words;
}
