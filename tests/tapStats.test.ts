import { describe, expect, it } from "vitest";
import { addSession, cleanStats, currentStreak, dayKey, daysBetween, EMPTY_STATS, MIN_SESSION } from "../src/core/stats";
import { median, TAP_RESET, TapTempo } from "../src/core/tapTempo";

describe("tap tempo", () => {
  it("finds the tempo from steady taps", () => {
    const t = new TapTempo();
    for (let i = 0; i < 6; i++) t.tap(10 + i * 0.6);
    expect(t.bpm).toBe(100);
  });

  it("starts on the second tap, counting the first tap as beat 0", () => {
    const t = new TapTempo();
    t.tap(5);
    expect(t.running).toBe(false);
    expect(t.beatsAt(5)).toBeNull();
    t.tap(5.5);
    expect(t.running).toBe(true);
    expect(t.beatsAt(5.5)).toBe(1);
    expect(t.beatsAt(7)).toBe(4);
  });

  it("shrugs off one sloppy tap (median, not average)", () => {
    expect(median([0.5, 0.5, 0.9, 0.5])).toBe(0.5);
    const t = new TapTempo();
    [0, 0.5, 1.0, 1.62, 2.0, 2.5].forEach((x) => t.tap(x));
    expect(t.bpm).toBe(120);
  });

  it("stays on the beat count while taps nudge it", () => {
    const t = new TapTempo();
    [0, 0.5, 1.0, 1.5].forEach((x) => t.tap(x));
    // A slightly late tap near beat 4 snaps to beat 4.
    t.tap(2.03);
    expect(t.beatsAt(2.03)).toBe(4);
    // With no taps, it keeps going at the tempo.
    expect(t.beatsAt(2.03 + 5)).toBeCloseTo(14, 1);
  });

  it("starts a fresh count after a long pause", () => {
    const t = new TapTempo();
    [0, 0.5, 1.0].forEach((x) => t.tap(x));
    t.tap(1 + TAP_RESET + 1);
    expect(t.count).toBe(1);
  });

  it("ignores impossible tempos", () => {
    const t = new TapTempo();
    t.tap(0);
    t.tap(0.1); // 600 BPM
    expect(t.running).toBe(false);
  });

  it("stops cleanly", () => {
    const t = new TapTempo();
    [0, 0.5, 1].forEach((x) => t.tap(x));
    t.stop();
    expect(t.running).toBe(false);
    expect(t.bpm).toBeNull();
  });
});

describe("stats and streak", () => {
  it("formats local days and counts days between them", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    // Across a daylight saving change (US, March 8 2026).
    expect(daysBetween("2026-03-07", "2026-03-08")).toBe(1);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("ignores sessions that are too short", () => {
    expect(addSession(EMPTY_STATS, MIN_SESSION - 1, "2026-11-16")).toEqual(EMPTY_STATS);
  });

  it("grows the streak on back-to-back days and resets after a gap", () => {
    let s = addSession(EMPTY_STATS, 60, "2026-11-14");
    expect(s.streak).toBe(1);
    s = addSession(s, 60, "2026-11-14");
    expect(s.streak).toBe(1);
    expect(s.sessions).toBe(2);
    s = addSession(s, 60, "2026-11-15");
    s = addSession(s, 60, "2026-11-16");
    expect(s.streak).toBe(3);
    expect(s.best).toBe(3);
    s = addSession(s, 60, "2026-11-20");
    expect(s.streak).toBe(1);
    expect(s.best).toBe(3);
    expect(s.seconds).toBe(300);
  });

  it("shows a broken streak as 0 until the next session", () => {
    const s = addSession(EMPTY_STATS, 60, "2026-11-14");
    expect(currentStreak(s, "2026-11-15")).toBe(1);
    expect(currentStreak(s, "2026-11-16")).toBe(0);
    expect(currentStreak(EMPTY_STATS, "2026-11-16")).toBe(0);
  });

  it("survives broken saved data", () => {
    expect(cleanStats(null)).toEqual(EMPTY_STATS);
    expect(cleanStats({ sessions: "lots", seconds: -5, lastDay: "yesterday" })).toEqual(EMPTY_STATS);
    expect(cleanStats({ sessions: 3, seconds: 90, streak: 2, best: 4, lastDay: "2026-11-16" })).toEqual({
      sessions: 3,
      seconds: 90,
      streak: 2,
      best: 4,
      lastDay: "2026-11-16",
    });
  });
});
