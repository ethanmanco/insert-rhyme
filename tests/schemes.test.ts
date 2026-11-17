import { describe, expect, it } from "vitest";
import { barPlan, INTRO_BARS, LINE_END_BEAT, MID_BEAT, SCHEMES, upcomingBars, type BarPlan, type SchemeId } from "../src/core/schemes";

/** One letter per target in order, "-" for a bar with none: "AABB", "-A-A" and so on. */
const shape = (plans: BarPlan[]) => plans.map((p) => (p.targets.length ? p.targets.map((t) => t.letter).join("") : "-")).join(" ");
const lines = (scheme: SchemeId, bars: number) => upcomingBars(scheme, INTRO_BARS, bars);

describe("every scheme", () => {
  for (const { id } of SCHEMES) {
    it(`${id} starts with a count-in bar with no targets`, () => {
      const plan = barPlan(id, 0);
      expect(plan.intro).toBe(true);
      expect(plan.targets).toEqual([]);
    });

    it(`${id} fills each group's slots in order, with no gaps or repeats`, () => {
      const slots = new Map<number, number[]>();
      for (const plan of lines(id, 32)) for (const t of plan.targets) slots.set(t.group, [...(slots.get(t.group) ?? []), t.slot]);
      for (const list of slots.values()) expect(list).toEqual(list.map((_, i) => i));
    });

    it(`${id} only puts targets on real beats`, () => {
      for (const plan of lines(id, 16)) for (const t of plan.targets) expect([MID_BEAT, LINE_END_BEAT]).toContain(t.beat);
    });
  }
});

describe("layouts", () => {
  it("AABB: couplets", () => {
    expect(shape(lines("aabb", 8))).toBe("A A B B A A B B");
    expect(lines("aabb", 4).map((p) => p.targets[0]!.group)).toEqual([0, 0, 1, 1]);
  });

  it("ABAB: alternating lines", () => {
    expect(shape(lines("abab", 8))).toBe("A B A B A B A B");
    expect(lines("abab", 4).map((p) => p.targets[0]!.group)).toEqual([0, 1, 0, 1]);
  });

  it("AAAA: one sound for four lines", () => {
    expect(shape(lines("aaaa", 4))).toBe("A A A A");
    expect(new Set(lines("aaaa", 4).map((p) => p.targets[0]!.group)).size).toBe(1);
    expect(lines("aaaa", 8)[4]!.targets[0]!.group).toBe(1);
  });

  it("skip-line: only every other line rhymes", () => {
    expect(shape(lines("skip", 8))).toBe("- A - A - A - A");
    const groups = lines("skip", 8).flatMap((p) => p.targets.map((t) => t.group));
    expect(groups).toEqual([0, 0, 1, 1]);
  });

  it("half-time: a rhyme every two bars", () => {
    const plans = lines("half", 16);
    expect(shape(plans)).toBe("- A - A - B - B - A - A - B - B");
    expect(plans.map((p) => p.line)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
  });

  it("double-time: two rhymes per bar, on beats 2 and 4", () => {
    const plans = lines("double", 4);
    expect(shape(plans)).toBe("AA AA BB BB");
    for (const p of plans) expect(p.targets.map((t) => t.beat)).toEqual([MID_BEAT, LINE_END_BEAT]);
    expect(plans[0]!.targets.map((t) => t.group)).toEqual([0, 0]);
    expect(plans[1]!.targets.map((t) => t.slot)).toEqual([2, 3]);
  });
});
