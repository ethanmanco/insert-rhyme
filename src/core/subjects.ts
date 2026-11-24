/**
 * Loose subjects that hold for 8 or 16 bars at a time, so a stretch of
 * prompts hangs together (money for a while, then the ride, then the crew)
 * instead of jumping between unrelated words every line. They are broad on
 * purpose: most groups in a stretch lead with a word from its subject, and
 * subject words that rhyme join the group, but everyday rhymes still fill
 * the rest, so there is always room to go anywhere.
 *
 * Subjects only shape prompts when no topic is picked (a topic already is
 * one) or a rap style is picked (its own words that fit the subject lead
 * first). Every word is a clean everyday word; drug, weapon and swear words
 * stay with the explicit settings.
 */

export interface Subject {
  id: string;
  /** Shown above the bars. */
  name: string;
  words: string[];
}

const w = (text: string) => [...new Set(text.split(/\s+/).filter(Boolean))];

export const SUBJECTS: Subject[] = [
  {
    id: "money",
    name: "MONEY",
    words: w(`
      money cash bread bank bills coin gold rich broke deal save spend stack check pay paid change cost price earn loan
      rent bag boss trade bet sale vault dough paper cheese racks bands grand mill count flip stocks profit tax wealth
      fortune poor debt job work hustle grind wage market store shop buy sold sell cents dime penny dollar bucks
      hundred million billion safe wallet tip fee jackpot owner business bonus raise payday greed chase ticket tag
      cheap mansion yacht estate empire bread invest bank account cashed rack band stacks
    `),
  },
  {
    id: "ride",
    name: "THE RIDE",
    words: w(`
      car ride wheel wheels rims gas brake speed race lane drive road tires hood trunk seat gear shift chrome coupe
      truck jeep fast crash horn lights park mile miles tank boost whip benz engine motor highway turn curb map trip
      plane jet train flight fly route exit toll cruise swerve skid drift spin steer pedal pump oil coast keys key
      garage paint leather tint roof drop top driver window mirror backseat parked speeding pull
    `),
  },
  {
    id: "drip",
    name: "DRIP",
    words: w(`
      shoes kicks shirt hat coat jeans chain ring watch style fresh drip fit dress suit tie lace gold rocks shades cap
      socks brand ice diamond wrist neck pearl pearls bling shine glow flex stone stones jewels silk mink fur boots
      hoodie jacket gloves belt mirror closet fitted crisp clean sharp swag look outfit red blue black white pink
      green gucci prada fly icy glossy wave
    `),
  },
  {
    id: "block",
    name: "THE BLOCK",
    words: w(`
      street block train bus town cab lights crowd noise roof tower park store sign rent hood night alley mall square
      corner city side home house porch stoop stairs window door gate fence wall brick concrete building lot yard
      court cops siren police neighbor mail lamp dark late subway project towers landlord ghetto uptown downtown
      east west north south deli bodega trap streets
    `),
  },
  {
    id: "crew",
    name: "THE CREW",
    words: w(`
      crew gang squad team fam bro brother sister cousin homie dawg friend friends mama mom dad pops father mother son
      kids family loyal trust real fake snake rat true ride die hold side love blood bond tight close circle partner
      guys boys girls day one back down twins grew raised day ones solid
    `),
  },
  {
    id: "beef",
    name: "BEEF",
    words: w(`
      war beef fight battle enemy foe rival hater haters jealous envy hate heat fire storm clash punch hit swing knock
      box ring round bell crush beat defeat win lose lost loss fierce brave fear scared coward bully tough hard rough
      grudge revenge payback score threat warn guard armor shield attack defend army soldier troops front line target
      aim opps smoke step test pressure
    `),
  },
  {
    id: "fame",
    name: "FAME",
    words: w(`
      stage mic crowd fans fame star stars light lights camera flash photo show tour record song songs track beat bars
      verse hook booth studio album single hit hits chart charts radio scream famous legend icon name sign carpet award
      trophy platinum gold rap rapper voice sing dance encore fan press viral clout buzz hype
    `),
  },
  {
    id: "love",
    name: "LOVE",
    words: w(`
      love heart kiss girl boy babe baby honey sweet date dinner rose roses ring wife husband bride wedding text phone
      call miss lonely together forever never ever eyes smile lips hug hold hand touch crush flirt cute pretty beauty
      lady queen chase broke jealous trust lie lies cheat tears cry sorry alone night stay leave gone back
      single shorty
    `),
  },
  {
    id: "comeup",
    name: "THE COME UP",
    words: w(`
      pain rain pray prayer god faith hope dream dreams grind hustle struggle hungry hunger starve poor broke tired
      late shift job work hard rise climb top bottom start ladder mountain hill fall fell fail try chance shot goal
      goals vision mission plan plans future past mama tears scars heal pressure stress weight storm sun light dark
      tunnel road journey nothing made grew proud blessed
    `),
  },
  {
    id: "party",
    name: "THE PARTY",
    words: w(`
      party club night dance floor lights music bass beat crowd bottle toast cheers ball weekend late wild loud
      fun vibe vibes mood move moves groove spin pool beach house roof line door bounce jump shake wave hands sweat
      glow neon tonight morning sunrise drop speaker turn lit
    `),
  },
  {
    id: "sports",
    name: "SPORTS",
    words: w(`
      ball game team score win goal court field coach play shot hoop dunk race track kick pass throw catch swing bat
      run gym fan champ crown pitch net rings ring trophy league draft rookie jersey jump sprint gold medal title season
      finals final buzzer clutch point points block steal foul ref bench star sweat glove helmet
    `),
  },
  {
    id: "nature",
    name: "NATURE",
    words: w(`
      rain snow storm wind cloud sun heat cold ice hail fog mist frost thunder flash bright warm cool chill dry wet flood
      dawn tree leaf grass stone rock hill sky moon star lake sea wave sand seed root flower bloom wood field stream
      cave cliff breeze river ocean shore desert fire flame ash earth dust dirt mud mountain wild
    `),
  },
  {
    id: "throne",
    name: "THE THRONE",
    words: w(`
      king queen crown throne kingdom castle empire rule reign royal gold legend goat beast lion wolf shark snake eagle
      hawk tiger bear dragon giant boss top peak power force strength pride glory hero god sword shield knight war army
      rule ruler prince jewels palace
    `),
  },
  {
    id: "food",
    name: "FOOD",
    words: w(`
      cake steak bread rice pie fries cheese meat toast jam beans corn plate spoon taste sauce grill bake fish shrimp
      roll wings tea cream sweet nuts peach grape lime pear snack lunch feast spice chicken chips pizza burger taco salt
      pepper honey butter milk juice soda candy sugar dessert dinner kitchen cook chef oven pan pot bowl fork plate
      hungry seconds
    `),
  },
  {
    id: "time",
    name: "TIME",
    words: w(`
      time clock watch hour minute day night year life soul mind thought past future young old age grow change late
      early soon now then wait moment second forever never always tomorrow today memory remember forget
      history legacy end start ticking last first pace slow fast
    `),
  },
];

/** Shortest and longest subject stretches, in stretches of 8 bars (schemes.ts SEGMENT). */
export const SUBJECT_STRETCHES = [1, 2] as const;
