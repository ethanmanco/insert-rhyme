/**
 * Explicit prompt words, ranked by how much regular rap uses them. A word's
 * number is its weight: higher comes up more. Each rap style has its own
 * list (UK styles curse like UK rappers); topics and "any words" use the
 * core list. Slur prompts are only the slurs rap actually uses, not every
 * word in the slur file (that file still feeds the rhyme helper).
 *
 * Stored in ROT13 like the filter's lists (filter/lists.ts), so the
 * repository does not show them as plain text.
 */

export interface Weighted {
  word: string;
  weight: number;
}

const rot13 = (text: string) => text.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));

const decode = (encoded: string): Weighted[] =>
  rot13(encoded)
    .split(/\s+/)
    .filter(Boolean)
    .map((item) => {
      const [word, weight] = item.split(":");
      return { word: word!, weight: Number(weight) };
    });

/** Everyday rap cursing, most used first. For topics and "any words". */
export const CORE_CURSES = decode("fuvg:10 shpx:9 ovgpu:9 nff:6 ovgpurf:5 ubrf:4 ubr:4 qnza:4 chffl:4 shpxvat:3 shpxva:3 uryy:3 qvpx:3 gubg:3 shpxrq:3 ohyyfuvg:2 shpxf:2 gubgf:1 tbqqnza:1 cvffrq:1 qhzonff:1 onqnff:1 onfgneq:1 wnpxnff:1 fxrrg:1 fuvgf:1");

/** Each rap style's cursing, most used first. */
const STYLE_CURSES: Record<string, Weighted[]> = {
  crunk: decode("ovgpu:10 shpx:8 fuvg:8 ubr:6 fxrrg:5 nff:5 ubrf:4 ovgpurf:4 qnza:3 chffl:3 qvpx:2"),
  houston: decode("ovgpu:9 ubr:8 fuvg:8 shpx:6 nff:4 ubrf:4 gubg:3 qnza:3 chffl:3 ovgpurf:3"),
  memphis: decode("ovgpu:10 ubr:8 fuvg:7 shpx:7 chffl:4 nff:4 ubrf:4 ovgpurf:3 qvpx:3 qnza:2"),
  chicago: decode("shpx:10 fuvg:9 ovgpu:8 gubg:6 chffl:5 gubgf:3 nff:3 ovgpurf:3 qvpx:2 qnza:2 shpxrq:2"),
  grime: decode("shpx:10 fuvg:9 chffl:7 gjng:5 cevpx:5 jnaxre:4 nefr:3 obyybpxf:3 qvpxurnq:3 jnax:2 ovgpu:3 shpxvat:3 shpxrq:2 qnza:1 ubr:1"),
  westcoast: decode("ovgpu:10 fuvg:8 shpx:8 ubr:6 nff:5 ubrf:4 ovgpurf:4 qnza:3 qvpx:3 chffl:3 shpxvat:2"),
  nyc: decode("fuvg:10 shpx:9 ovgpu:7 nff:5 qnza:5 ohyyfuvg:4 uryy:3 chffl:3 ubr:3 shpxvat:3"),
  trap: decode("ovgpu:10 fuvg:9 shpx:8 ubr:7 gubg:6 chffl:5 ovgpurf:5 ubrf:4 nff:4 qvpx:3 gubgf:2 qnza:2"),
  oldschool: decode("qnza:10 uryy:8 fuvg:7 nff:5 ovgpu:4 shpx:4 ohyyfuvg:3 onfgneq:2"),
  hyphy: decode("fuvg:9 shpx:8 ovgpu:8 ubr:6 nff:4 qnza:3 ubrf:3 chffl:2 shpxvat:2"),
  bounce: decode("nff:10 ubr:7 fuvg:6 chffl:6 ovgpu:5 qvpx:4 shpx:4 ubrf:3 gubg:3"),
  detroit: decode("fuvg:10 shpx:9 ovgpu:7 nff:5 qnza:4 ohyyfuvg:3 ubr:3 chffl:3 shpxrq:2"),
  philly: decode("fuvg:10 shpx:9 ovgpu:7 nff:5 qnza:4 ubr:3 chffl:3 ohyyfuvg:2 shpxvat:2"),
  brooklyn: decode("fuvg:9 shpx:9 ovgpu:7 gubg:6 chffl:5 nff:4 ubr:3 gubgf:2 qnza:2"),
  ukdrill: decode("shpx:10 fuvg:9 chffl:7 gjng:5 cevpx:5 jnaxre:4 nefr:3 obyybpxf:3 qvpxurnq:3 jnax:2 ovgpu:3 shpxvat:3 shpxrq:2 qnza:1 ubr:1"),
  miami: decode("nff:10 ubr:8 chffl:7 qvpx:6 ovgpu:6 gubg:5 fuvg:4 shpx:4 gvgf:3 ubrf:3"),
  chopper: decode("shpx:10 fuvg:9 ovgpu:6 qnza:5 nff:4 uryy:4 shpxvat:3 shpxrq:2"),
  battle: decode("ovgpu:10 chffl:8 shpx:7 fuvg:6 nff:5 qvpx:4 onfgneq:3 qhzonff:3 wnpxnff:3 cevpx:3 ohyyfuvg:2 qnza:2"),
  conscious: decode("qnza:10 uryy:8 fuvg:7 ohyyfuvg:6 shpx:4 nff:3 ovgpu:2 tbqqnza:2"),
  horror: decode("shpx:10 fuvg:7 uryy:7 qnza:6 ovgpu:5 onfgneq:4 tbqqnza:3 shpxrq:3 nff:2"),
  emo: decode("shpx:10 fuvg:8 qnza:6 uryy:5 shpxrq:4 ovgpu:3 cvffrq:3 shpxvat:3"),
  rage: decode("shpx:10 fuvg:9 ovgpu:7 nff:4 ubr:3 qnza:3 shpxvat:3 shpxrq:2"),
  afroswing: decode("shpx:8 fuvg:7 chffl:6 nff:5 ovgpu:4 ubr:3 qnza:2"),
  jersey: decode("nff:10 fuvg:6 ubr:6 chffl:6 ovgpu:5 shpx:4 gubg:4 qvpx:3"),
  bling: decode("ovgpu:10 fuvg:8 shpx:7 ubr:6 nff:5 fxrrg:4 ubrf:4 ovgpurf:3 qnza:3 chffl:3"),
  batonrouge: decode("fuvg:10 shpx:9 ovgpu:9 ubr:5 nff:4 qnza:3 chffl:3 ovgpurf:3 shpxvat:2"),
  underground: decode("fuvg:10 shpx:8 qnza:6 ovgpu:5 nff:4 uryy:4 ohyyfuvg:3 onfgneq:2"),
  melodic: decode("shpx:10 fuvg:9 ovgpu:7 qnza:4 nff:3 ubr:3 shpxvat:3 shpxrq:2"),
};

/** The slurs regular rap uses, most used first. */
export const RAP_SLURS = decode("avttn:12 avttnf:9 snttbg:1 snt:1 ubzb:1 ergneq:1");

/** The curse words for a word theme (a rap style id), or the core list. */
export function cursesFor(theme: string | null | undefined): Weighted[] {
  return (theme && STYLE_CURSES[theme]) || CORE_CURSES;
}

/** The slurs for a word theme. Rap's slurs are the same across styles. */
export function slursFor(_theme?: string | null): Weighted[] {
  return RAP_SLURS;
}

/** Every curse word any list uses. */
export const EXPLICIT_PROMPTS: readonly string[] = [...new Set([CORE_CURSES, ...Object.values(STYLE_CURSES)].flat().map((w) => w.word))];

/** The style ids that have their own list (for tests). */
export const STYLES_WITH_CURSES = Object.keys(STYLE_CURSES);
