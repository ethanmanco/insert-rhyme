import { describe, expect, it } from "vitest";
import {
  barPlan,
  BLOCK,
  paceAt,
  schemeAt,
  SEGMENT,
  INTRO_BARS,
  layoutName,
  LINE_END_BEAT,
  MID_BEAT,
  PACES,
  readLayout,
  SCHEMES,
  upcomingBars,
  type BarPlan,
  type Layout,
  type PaceId,
  type SchemeId,
} from "../src/core/schemes";

/** One letter per target in order, "-" for a bar with none: "A A B B", "- A - A" and so on. */
const shape = (plans: BarPlan[]) => plans.map((p) => (p.targets.length ? p.targets.map((t) => t.letter).join("") : "-")).join(" ");
const lines = (scheme: SchemeId, pace: PaceId, bars: number) => upcomingBars({ scheme, pace }, INTRO_BARS, bars);
const groups = (plans: BarPlan[]) => plans.flatMap((p) => p.targets.map((t) => t.group));

const ALL: Layout[] = SCHEMES.flatMap((s) => PACES.flatMap((p) => [1, 2, 3].map((seed) => ({ scheme: s.id, pace: p.id, seed }))));
const FIXED = ALL.filter((l) => l.scheme !== "mix" && l.pace !== "mix" && l.seed === 1);

describe("every layout", () => {
  for (const layout of ALL) {
    const name = `${layoutName(layout)} (seed ${layout.seed})`;
    it(`${name} starts with a count-in bar with no targets`, () => {
      const plan = barPlan(layout, 0);
      expect(plan.intro).toBe(true);
      expect(plan.targets).toEqual([]);
    });

    it(`${name} fills each group's slots in order, and every group gets at least two rhymes`, () => {
      const slots = new Map<number, number[]>();
      for (const plan of upcomingBars(layout, INTRO_BARS, 96)) for (const t of plan.targets) slots.set(t.group, [...(slots.get(t.group) ?? []), t.slot]);
      for (const list of slots.values()) {
        expect(list).toEqual(list.map((_, i) => i));
        expect(list.length).toBeGreaterThanOrEqual(2);
      }
    });

    it(`${name} only puts targets on real beats`, () => {
      for (const plan of upcomingBars(layout, INTRO_BARS, 16)) for (const t of plan.targets) expect([MID_BEAT, LINE_END_BEAT]).toContain(t.beat);
    });
  }

  it("all fixed layouts look different from each other", () => {
    const looks = FIXED.map((l) => `${shape(upcomingBars(l, INTRO_BARS, 16))} ${groups(upcomingBars(l, INTRO_BARS, 16)).join(",")}`);
    expect(new Set(looks).size).toBe(FIXED.length);
  });
});

describe("every line", () => {
  it("AABB: couplets", () => {
    expect(shape(lines("aabb", "every", 8))).toBe("A A B B A A B B");
    expect(groups(lines("aabb", "every", 4))).toEqual([0, 0, 1, 1]);
  });

  it("ABAB: alternating lines", () => {
    expect(shape(lines("abab", "every", 8))).toBe("A B A B A B A B");
    expect(groups(lines("abab", "every", 4))).toEqual([0, 1, 0, 1]);
  });

  it("AAAA: one sound for four lines", () => {
    expect(shape(lines("aaaa", "every", 4))).toBe("A A A A");
    const g = groups(lines("aaaa", "every", 8));
    expect(new Set(g.slice(0, 4)).size).toBe(1);
    expect(g[4]).not.toBe(g[0]);
  });

  it("ABBA: a couplet inside another sound", () => {
    expect(shape(lines("abba", "every", 4))).toBe("A B B A");
    expect(groups(lines("abba", "every", 4))).toEqual([0, 1, 1, 0]);
  });

  it("AAXA: line 3 is free", () => {
    expect(shape(lines("aaxa", "every", 8))).toBe("A A - A A A - A");
  });
});

describe("skip a line", () => {
  it("puts a free line before every rhyming line, keeping the scheme", () => {
    expect(shape(lines("aabb", "skip", 8))).toBe("- A - A - B - B");
    expect(shape(lines("abab", "skip", 8))).toBe("- A - B - A - B");
    expect(shape(lines("aaaa", "skip", 8))).toBe("- A - A - A - A");
    expect(shape(lines("abba", "skip", 8))).toBe("- A - B - B - A");
    expect(groups(lines("abab", "skip", 8))).toEqual([0, 1, 0, 1]);
    expect(new Set(groups(lines("aaaa", "skip", 8))).size).toBe(1);
  });

  it("keeps one line per bar", () => {
    expect(lines("aabb", "skip", 4).map((p) => p.line)).toEqual([0, 1, 2, 3]);
  });
});

describe("double-time", () => {
  it("puts two rhymes in each bar, on beats 2 and 4, following the scheme", () => {
    expect(shape(lines("aabb", "double", 4))).toBe("AA BB AA BB");
    expect(shape(lines("abab", "double", 2))).toBe("AB AB");
    expect(shape(lines("aaaa", "double", 2))).toBe("AA AA");
    expect(shape(lines("abba", "double", 2))).toBe("AB BA");
    for (const p of lines("aabb", "double", 4)) expect(p.targets.map((t) => t.beat)).toEqual([MID_BEAT, LINE_END_BEAT]);
  });

  it("drops the free spot of AAXA", () => {
    expect(shape(lines("aaxa", "double", 2))).toBe("AA A");
    expect(lines("aaxa", "double", 2)[1]!.targets.map((t) => t.beat)).toEqual([LINE_END_BEAT]);
  });
});

describe("random scheme", () => {
  const mix = (seed: number, pace: PaceId = "every"): Layout => ({ scheme: "mix", pace, seed });
  const blocks = (seed: number, count: number) => Array.from({ length: count }, (_, b) => schemeAt(mix(seed), b * BLOCK));

  it(`switches every ${BLOCK} bars, one verse at every-line pace`, () => {
    expect(BLOCK).toBe(4);
    for (const seed of [1, 2, 3]) {
      for (let b = 0; b < 30; b++) for (let n = 1; n < BLOCK; n++) expect(schemeAt(mix(seed), b * BLOCK + n)).toBe(schemeAt(mix(seed), b * BLOCK));
    }
  });

  it("can repeat a scheme once, but never three times in a row", () => {
    let repeats = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const list = blocks(seed, 200);
      for (let b = 2; b < list.length; b++) expect(list[b] === list[b - 1] && list[b] === list[b - 2]).toBe(false);
      repeats += list.filter((p, b) => b > 0 && p === list[b - 1]).length;
    }
    // Repeats happen (about one switch in five), so it is not a strict rotation.
    expect(repeats).toBeGreaterThan(100);
    expect(repeats).toBeLessThan(500);
  });

  it("uses every scheme over a long session, and differs between visits", () => {
    expect(new Set(blocks(7, 60)).size).toBe(SCHEMES.length - 1);
    const runs = [11, 12, 13, 14].map((seed) => blocks(seed, 8).join());
    expect(new Set(runs).size).toBeGreaterThan(1);
  });

  it("lays out bars from the scheme in play, and says which it is", () => {
    for (let bar = INTRO_BARS; bar < INTRO_BARS + 64; bar++) {
      const plan = barPlan(mix(3), bar);
      expect(plan.scheme).toBe(schemeAt(mix(3), bar - INTRO_BARS));
      expect(plan.targets.map((t) => t.group)).toEqual(barPlan({ scheme: plan.scheme, pace: "every" }, bar).targets.map((t) => t.group));
    }
  });

  it(`holds one scheme for a whole ${SEGMENT}-bar verse when skipping lines`, () => {
    for (const seed of [1, 2, 3]) {
      for (let s = 0; s < 12; s++) {
        const first = barPlan(mix(seed, "skip"), INTRO_BARS + s * SEGMENT).scheme;
        for (let n = 1; n < SEGMENT; n++) expect(barPlan(mix(seed, "skip"), INTRO_BARS + s * SEGMENT + n).scheme).toBe(first);
      }
    }
  });
});

describe("random pace", () => {
  const mix = (seed: number): Layout => ({ scheme: "aabb", pace: "mix", seed });

  it(`starts on every line and only changes every ${SEGMENT} bars`, () => {
    for (const seed of [1, 2, 3]) {
      expect(paceAt(mix(seed), 0)).toBe("every");
      for (let n = 0; n < 200; n++) if (n % SEGMENT) expect(paceAt(mix(seed), n)).toBe(paceAt(mix(seed), n - 1));
    }
  });

  it("switches between every line and skip a line, never double-time", () => {
    const paces = Array.from({ length: 40 }, (_, s) => paceAt(mix(5), s * SEGMENT));
    expect(new Set(paces)).toEqual(new Set(["every", "skip"]));
    const flips = paces.filter((p, i) => i > 0 && p !== paces[i - 1]).length;
    expect(flips).toBeGreaterThan(15);
  });

  it("starts every stretch on a fresh verse, so no rhyme is left hanging", () => {
    const plans = upcomingBars(mix(9), INTRO_BARS, 160);
    const open = new Map<number, number>();
    for (const p of plans) for (const t of p.targets) open.set(t.group, Math.floor(p.line / SEGMENT));
    // A group's rhymes all fall inside one stretch.
    for (const p of plans) for (const t of p.targets) expect(Math.floor(p.line / SEGMENT)).toBe(open.get(t.group));
  });
});

describe("saved layouts", () => {
  it("read old settings from before the pace choice", () => {
    expect(readLayout("skip", undefined)).toEqual({ scheme: "aabb", pace: "skip" });
    expect(readLayout("half", undefined)).toEqual({ scheme: "aabb", pace: "skip" });
    expect(readLayout("double", undefined)).toEqual({ scheme: "aaaa", pace: "double" });
    expect(readLayout("abab", undefined)).toEqual({ scheme: "abab", pace: "every" });
    expect(readLayout("nope", "nope")).toEqual({ scheme: "aabb", pace: "every" });
    expect(readLayout("abba", "skip")).toEqual({ scheme: "abba", pace: "skip" });
  });

  it("name themselves for the chip", () => {
    expect(layoutName({ scheme: "aabb", pace: "every" })).toBe("AABB");
    expect(layoutName({ scheme: "abab", pace: "skip" })).toBe("ABAB SKIP");
    expect(layoutName({ scheme: "aaaa", pace: "double" })).toBe("AAAA 2X");
    expect(layoutName({ scheme: "mix", pace: "mix" })).toBe("RANDOM MIXED");
    expect(readLayout("mix", "mix")).toEqual({ scheme: "mix", pace: "mix" });
  });
});
