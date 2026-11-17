/**
 * Tempo and beat finding for recorded beats. It works on plain sample
 * arrays, so it runs the same in the browser (for a beat you load yourself)
 * and in tests.
 *
 * 1. Onset envelope: how much new sound starts in each short frame
 *    (energy rising across the spectrum, so drum hits stand out).
 * 2. Tempo: the beat period whose repeats (1, 2 and 4 beats apart) line up
 *    best with the envelope.
 * 3. Phase: where in the first beat the hits land, so the bars can be
 *    drawn on the music.
 */

export interface Envelope {
  values: Float32Array;
  /** The same rise, for the low band (kicks) and the mid band (snares and claps). */
  low: Float32Array;
  mid: Float32Array;
  /** Frames per second. */
  fps: number;
}

/** A small real FFT-free onset measure: rectified rise in energy across a few bands. */
export function onsetEnvelope(samples: Float32Array, sampleRate: number, hop = 128): Envelope {
  const fps = sampleRate / hop;
  const frames = Math.max(0, Math.floor(samples.length / hop) - 1);
  // Band energies from simple one-pole filters: low (kicks), mid (snares), high (hats).
  const bands = 3;
  const energy = new Float32Array(frames * bands);
  const coef = [Math.exp((-2 * Math.PI * 150) / sampleRate), Math.exp((-2 * Math.PI * 2000) / sampleRate)];
  let low = 0;
  let mid = 0;
  for (let f = 0; f < frames; f++) {
    let e0 = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      const x = samples[i]!;
      low = coef[0]! * low + (1 - coef[0]!) * x;
      mid = coef[1]! * mid + (1 - coef[1]!) * x;
      e0 += low * low;
      e1 += (mid - low) * (mid - low);
      e2 += (x - mid) * (x - mid);
    }
    energy[f * bands] = Math.log1p(e0 * 100);
    energy[f * bands + 1] = Math.log1p(e1 * 100);
    energy[f * bands + 2] = Math.log1p(e2 * 100);
  }
  const values = new Float32Array(frames);
  const lowRise = new Float32Array(frames);
  const midRise = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    let rise = 0;
    for (let b = 0; b < bands; b++) rise += Math.max(0, energy[f * bands + b]! - energy[(f - 1) * bands + b]!);
    values[f] = rise;
    lowRise[f] = Math.max(0, energy[f * bands]! - energy[(f - 1) * bands]!);
    midRise[f] = Math.max(0, energy[f * bands + 1]! - energy[(f - 1) * bands + 1]!);
  }
  // Take away the slow-moving average so only sharp hits remain.
  const win = Math.max(1, Math.round(fps * 0.1));
  const out = new Float32Array(frames);
  let sum = 0;
  for (let f = 0; f < frames; f++) {
    sum += values[f]!;
    if (f >= win) sum -= values[f - win]!;
    out[f] = Math.max(0, values[f]! - sum / Math.min(f + 1, win));
  }
  return { values: out, low: lowRise, mid: midRise, fps };
}

/** Envelope value at a fractional frame, linearly interpolated. */
function at(values: Float32Array, frame: number): number {
  const i = Math.floor(frame);
  if (i < 0 || i + 1 >= values.length) return 0;
  const t = frame - i;
  return values[i]! * (1 - t) + values[i + 1]! * t;
}

/** How well a beat period and phase fit: the average envelope on the beat grid. */
function gridScore(env: Envelope, period: number, phase: number): number {
  let sum = 0;
  let n = 0;
  for (let t = phase; t * env.fps < env.values.length - 1; t += period) {
    // Allow a frame either way, since hits are not perfectly on the grid.
    const f = t * env.fps;
    sum += Math.max(at(env.values, f - 1), at(env.values, f), at(env.values, f + 1));
    n++;
  }
  return n ? sum / n : 0;
}

/**
 * The tempo in BPM, between min and max. Tempos are tried in quarter-BPM
 * steps and then refined, and a whole-number tempo wins when it fits almost
 * as well (most beats are made at one).
 */
export function estimateBpm(env: Envelope, min = 70, max = 160): number {
  const { values, fps } = env;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const centered = values.map((v) => v - mean);
  // Autocorrelation at a lag, sampled sparsely for speed on long songs.
  const step = Math.max(1, Math.floor(n / 40000));
  const ac = (lag: number) => {
    let s = 0;
    const whole = Math.floor(lag);
    const frac = lag - whole;
    for (let i = 0; i + whole + 1 < n; i += step) {
      const v = centered[i + whole]! * (1 - frac) + centered[i + whole + 1]! * frac;
      s += centered[i]! * v;
    }
    return s;
  };
  let best = min;
  let bestScore = -Infinity;
  const scoreOf = (bpm: number) => {
    const lag = (60 / bpm) * fps;
    return ac(lag) + ac(lag * 2) + ac(lag * 4) + ac(lag * 8);
  };
  for (let bpm = min; bpm <= max; bpm += 0.25) {
    const s = scoreOf(bpm);
    if (s > bestScore) {
      bestScore = s;
      best = bpm;
    }
  }
  let refined = best;
  let refinedScore = bestScore;
  for (let bpm = best - 0.25; bpm <= best + 0.25; bpm += 0.02) {
    const s = scoreOf(bpm);
    if (s > refinedScore) {
      refinedScore = s;
      refined = bpm;
    }
  }
  const whole = Math.round(refined);
  const tempo = scoreOf(whole) >= refinedScore * 0.97 ? whole : Math.round(refined * 100) / 100;
  // Half or double the tempo can fit nearly as well. Rap beats put the kick
  // on beats 1 and 3 and the snare on 2 and 4, so pick the one where kicks
  // and snares take turns.
  const options = [tempo, tempo / 2, tempo * 2].filter((b) => b >= min && b <= max && scoreOf(b) >= bestScore * 0.5);
  let pick = tempo;
  let pickScore = -Infinity;
  for (const b of options) {
    const s = backbeat(env, b, beatPhase(env, b));
    if (s > pickScore + 0.02) {
      pickScore = s;
      pick = b;
    }
  }
  return pick;
}

/**
 * How strongly kicks and snares alternate beat by beat on this grid, 0..1.
 * High at the true tempo; low at half tempo (every beat lands on a kick) or
 * double tempo (the in-between beats are only hats).
 */
export function backbeat(env: Envelope, bpm: number, phase: number): number {
  const period = 60 / bpm;
  let diff = 0;
  let total = 0;
  let k = 0;
  for (let t = phase; t * env.fps < env.values.length - 1; t += period, k++) {
    const f = t * env.fps;
    const low = Math.max(at(env.low, f - 1), at(env.low, f), at(env.low, f + 1));
    const mid = Math.max(at(env.mid, f - 1), at(env.mid, f), at(env.mid, f + 1));
    diff += (k % 2 === 0 ? 1 : -1) * (low - mid);
    total += low + mid;
  }
  return total ? Math.abs(diff) / total : 0;
}

/** Seconds from the start to the first beat of the grid (0 up to one beat). */
export function beatPhase(env: Envelope, bpm: number): number {
  const period = 60 / bpm;
  let best = 0;
  let bestScore = -Infinity;
  const stepSec = 1 / env.fps / 2;
  for (let phase = 0; phase < period; phase += stepSec) {
    const s = gridScore(env, period, phase);
    if (s > bestScore) {
      bestScore = s;
      best = phase;
    }
  }
  return best;
}

/**
 * Which of the four beats in a bar is most likely the downbeat: the one
 * whose hits are strongest in the low band is usually where the kick lands.
 * Returns 0..3, the number of beats after `phase` where bar 1 starts.
 */
export function downbeat(env: Envelope, bpm: number, phase: number): number {
  const period = 60 / bpm;
  const totals = [0, 0, 0, 0];
  let k = 0;
  for (let t = phase; t * env.fps < env.values.length - 1; t += period, k++) totals[k % 4]! += at(env.values, t * env.fps);
  return totals.indexOf(Math.max(...totals));
}
