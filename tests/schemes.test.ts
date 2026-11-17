import { describe, expect, it } from "vitest";
import { barPlan, INTRO_BARS, LINE_END_BEAT, upcomingBars } from "../src/core/schemes";

describe("count-in", () => {
  it("starts with a bar of beat and no targets", () => {
    for (let bar = 0; bar < INTRO_BARS; bar++) {
      const plan = barPlan("aabb", bar);
      expect(plan.intro).toBe(true);
      expect(plan.targets).toEqual([]);
      expect(plan.line).toBe(-1);
    }
  });
});

describe("AABB", () => {
  const lines = upcomingBars("aabb", INTRO_BARS, 8);

  it("puts one target on beat 4 of every line", () => {
    for (const plan of lines) {
      expect(plan.targets).toHaveLength(1);
      expect(plan.targets[0]!.beat).toBe(LINE_END_BEAT);
    }
  });

  it("reads A A B B, then starts fresh groups", () => {
    expect(lines.map((p) => p.targets[0]!.letter).join("")).toBe("AABBAABB");
    const groups = lines.map((p) => p.targets[0]!.group);
    expect(groups).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("numbers lines from the first bar after the count-in", () => {
    expect(lines.map((p) => p.line)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
