import { beatPhase, downbeat, estimateBpm, onsetEnvelope } from "./tempo";
import { BEATS_PER_BAR } from "./timing";

/**
 * A beat the player loads from their own device. Its tempo and first bar are
 * found from the audio, and the player can fix either: half or double the
 * tempo, move bar 1 by a beat, or tap along to sync. Nothing leaves the
 * device.
 */

export interface Grid {
  bpm: number;
  /** Seconds into the file where bar 1 starts. */
  start: number;
}

/** Only this much of the song is analyzed: enough to find the beat, quick on a phone. */
const ANALYZE_SECONDS = 75;

/** Mono samples from the opening of a song. */
export function monoOpening(channels: Float32Array[], sampleRate: number): Float32Array {
  const n = Math.min(channels[0]?.length ?? 0, Math.round(sampleRate * ANALYZE_SECONDS));
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i]! += ch[i]! / channels.length;
  return out;
}

export function findGrid(samples: Float32Array, sampleRate: number): Grid {
  const env = onsetEnvelope(samples, sampleRate);
  const bpm = estimateBpm(env);
  const phase = beatPhase(env, bpm);
  return { bpm, start: phase + downbeat(env, bpm, phase) * (60 / bpm) };
}

const beat = (g: Grid) => 60 / g.bpm;

/** Bar 1 moved by whole beats, kept inside the first bar. */
export function shiftBeats(g: Grid, beats: number): Grid {
  const bar = beat(g) * BEATS_PER_BAR;
  const start = (((g.start + beats * beat(g)) % bar) + bar) % bar;
  return { ...g, start };
}

export function halfTempo(g: Grid): Grid {
  return { ...g, bpm: g.bpm / 2 };
}

export function doubleTempo(g: Grid): Grid {
  return { ...g, bpm: g.bpm * 2 };
}

/**
 * Sync from taps. `taps` are where each tap landed, in beats of the current
 * grid (as the bar view counts them), tapped on every beat of the music.
 * Returns the grid those taps describe: the tempo from the median gap, and
 * bar 1 on the beat nearest the old one. `loopBeats` is the length of one
 * pass of the loop in grid beats, so taps across a loop seam still work.
 */
export function syncFromTaps(g: Grid, taps: number[], loopBeats: number): Grid | null {
  if (taps.length < 4) return null;
  const gaps = taps.slice(1).map((t, i) => t - taps[i]!).filter((d) => d > 0);
  if (gaps.length < 3) return null;
  gaps.sort((a, b) => a - b);
  const c = gaps[gaps.length >> 1]!;
  if (!(c > 0.3 && c < 3)) return null;
  const bpm = Math.round((g.bpm / c) * 100) / 100;
  // Each tap's position in the file, in seconds at the song's own speed.
  const old = beat(g);
  const times = taps.map((p) => g.start + (((p % loopBeats) + loopBeats) % loopBeats) * old);
  const period = 60 / bpm;
  // The beat phase that best matches the taps (circular mean).
  let x = 0;
  let y = 0;
  for (const t of times) {
    const angle = ((2 * Math.PI) / period) * t;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }
  const phase = (((Math.atan2(y, x) / (2 * Math.PI)) * period) % period + period) % period;
  // Keep bar 1 on the beat closest to where it was.
  const k = Math.round((g.start - phase) / period);
  return { bpm, start: Math.max(0, phase + k * period) };
}

/** Loudness (RMS, dBFS) that own beats are brought down to, about where loud built-in trap loops end up. */
export const OWN_TARGET_DB = -12;

/**
 * Volume for a beat from the player's device. Songs mastered very loud are
 * turned down, so they stay clear of the limiter (which would distort their
 * bass); quiet ones are left as they are.
 */
export function ownGain(channels: Float32Array[]): number {
  let sum = 0;
  let count = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i += 4) sum += ch[i]! * ch[i]!;
    count += Math.ceil(ch.length / 4);
  }
  if (!count || !sum) return 1;
  const rmsDb = 10 * Math.log10(sum / count);
  return Math.min(1, 10 ** ((OWN_TARGET_DB - rmsDb) / 20));
}
