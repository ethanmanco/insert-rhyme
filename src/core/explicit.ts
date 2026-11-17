/**
 * Swear words that make good prompts when the explicit-words switch is on:
 * everyday cursing a rapper would actually say, rather than everything the
 * filter catches. Stored in ROT13 like the filter's lists (filter/lists.ts),
 * so the repository does not show them as plain text. Slur prompts come
 * straight from the slur word file, since that list is already curated.
 */
const ENCODED =
  "shpx shpxf shpxrq shpxvat fuvg fuvgf fuvggl ovgpu ovgpurf nff qnza uryy qvpx qvpxf ubr ubrf chffl cvff cvffrq " +
  "penc onfgneq ohyyfuvg qhzonff onqnff wnpxnff pbpx phz gvgf fyhg fyhgf juber juberf fxnax cevpx wvmm obare ubeal " +
  "gjng jnax gvggl gvggvrf obbof";

const rot13 = (text: string) =>
  text.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));

export const EXPLICIT_PROMPTS: readonly string[] = rot13(ENCODED).split(/\s+/).filter(Boolean);
