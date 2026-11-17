/**
 * Beat math, kept free of audio code so it can be tested. Everything here is
 * a pure function of a position in beats, and that position always comes
 * from the audio clock (see engine.ts), so nothing drawn from it can drift
 * away from what you hear.
 */

export const MIN_BPM = 70;
export const MAX_BPM = 160;
export const BEATS_PER_BAR = 4;
/** The sequencer runs in sixteenth notes: four steps to a beat. */
export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;

/** Round to a whole BPM inside 70..160; anything unreadable gives the fallback. */
export function clampBpm(value: unknown, fallback = 90): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (value === null || value === "" || typeof value === "boolean" || !Number.isFinite(n)) return fallback;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

export function secondsPerStep(bpm: number): number {
  return secondsPerBeat(bpm) / STEPS_PER_BEAT;
}

/**
 * Swing pushes every second sixteenth late. At full swing it lands a third
 * of a step late, a triplet shuffle. (Same rule as Steplab.)
 */
export function swingDelay(step: number, swing: number, bpm: number): number {
  if (step % 2 === 0 || swing <= 0) return 0;
  return (Math.min(1, swing) * secondsPerStep(bpm)) / 3;
}

/** Which sixteenth a transport tick count falls on (rounded, never a drifting counter). */
export function stepFromTicks(ticks: number, ppq: number): number {
  return Math.round(ticks / (ppq / STEPS_PER_BEAT));
}

export interface BeatPosition {
  /** 0-based bar since playback started. */
  bar: number;
  /** 0-based beat inside the bar (0..3). */
  beat: number;
  /** How far through that beat, 0 (on the beat) up to just under 1. */
  frac: number;
}

/** Split a position in beats into bar, beat and the fraction of the beat. */
export function beatPosition(totalBeats: number): BeatPosition {
  const whole = Math.floor(totalBeats);
  const bar = Math.floor(whole / BEATS_PER_BAR);
  const beat = whole - bar * BEATS_PER_BAR;
  return { bar, beat, frac: totalBeats - whole };
}

export interface BallPoint {
  /** Across the row in block units: 0 is the centre of block 1, 3 of block 4. */
  x: number;
  /** Height as a share of the hop's peak: 0 means touching a block. */
  y: number;
  /** True on the long hop from the last block back to the first one. */
  wrap: boolean;
}

/**
 * Where the ball is. It touches block N exactly on beat N (frac 0), arcs
 * to the next block over the beat, and on the last beat makes one long hop
 * back to block 1, landing on the next bar's downbeat.
 */
export function ballPoint(pos: BeatPosition): BallPoint {
  const f = Math.min(Math.max(pos.frac, 0), 1);
  const arc = 4 * f * (1 - f);
  if (pos.beat >= BEATS_PER_BAR - 1) {
    return { x: (BEATS_PER_BAR - 1) * (1 - f), y: arc, wrap: true };
  }
  return { x: pos.beat + f, y: arc, wrap: false };
}

/** Snap a pixel value to the 8-bit grid, so motion moves in chunky steps. */
export function snap(px: number, grid = 4): number {
  return Math.round(px / grid) * grid;
}
