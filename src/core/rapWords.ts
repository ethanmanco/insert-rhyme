import type { Category } from "./categories";

/**
 * Words rap leans on in every scene: money, cars, jewelry, the block, the
 * crew, the booth. In a rap style's prompt groups they come right after the
 * style's own words, ahead of everyday rhymes, so a group sounds like a
 * verse instead of a dictionary. Drug and weapon words are kept apart and
 * only join with explicit words on.
 */

const w = (text: string) => text.split(/\s+/).filter(Boolean);

export const RAP_WORDS = w(`
  money cash bread guap racks bands stacks paper cheese check rich broke bank vault safe count flip bag
  hustle grind work boss block hood street corner city town side trap
  whip car coupe benz wheels rims chrome ride foreign truck roof drop
  ice chain drip fresh fly flex shine gold diamond watch wrist stone rock piece link jewels pearls icy bling gleam
  crew gang squad team fam bro homie dawg dog real fake snake hater rat loyal trust
  beat track mic flow bars verse hook rhyme spit booth stage crowd fans fame star
  game player king queen throne crown top win shot dream stunt ball style clout hype buzz
  night club party bottle war beef heat jail cell judge case court free cop cops feds
  mama pray bless lord pain struggle truth facts cap lie
  slide pull spin bounce wave vibe cold hot fire flame lit grill
  stack rack mill ticket pound chase paid mansion yacht jet plane goat beast legend
  opps grand bills rolex wraith gucci prada bust tough grimy gritty dirty slick sharp clean mean hard raw
  dough bro pro go low glow show dice slice price nice brain gain lane chain phone grown own zone
  stop shop wax tax text necks trip grip skill steel deal meal feel fight tight light sight crime dime time mind line
  sweet feet stash dash flash swag brag tag cream steam scheme team mission vision hunger pressure honey
  hood good could made blade fade shade paid laid bread fed head said dead hit grit split quit
  boss loss cross toss sauce jewel cool rule fool school pool true crew through new view cruise lose
  fly high sky why lie try sly bank tank thank rank break shake take make wake stake
  glory story hungry lonely only homie trophy money funny champ camp stamp lamp
`);

export const RAP_MATURE = w(`
  gun glock strap pistol stick drum blunt weed kush lean pills dope coke brick bricks plug pack bullet clip trigger smoke chopper
`);

/** The rap words that fill a rap style's groups; topics get none. */
export function flavorWords(category: Category | undefined, explicit: boolean): string[] | null {
  if (category?.kind !== "style") return null;
  return explicit ? [...RAP_WORDS, ...RAP_MATURE] : RAP_WORDS;
}
