/**
 * Tap tempo: for rapping over music from somewhere else. You tap along, it
 * works out the tempo and where the beat falls, and the bars follow with no
 * built-in sound. All times are in seconds on one clock (the page's
 * high-resolution clock, which tap events are stamped with).
 */

export const TAP_MIN_BPM = 50;
export const TAP_MAX_BPM = 200;
/** A pause this long starts a fresh count. */
export const TAP_RESET = 2;
/** Only the latest taps count, so a tempo change is picked up quickly. */
const WINDOW = 8;

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export class TapTempo {
  private taps: number[] = [];
  /** Seconds per beat, once known. */
  private period = 0;
  /** A moment known to be on a beat, and which beat it was. */
  private anchorTime = 0;
  private anchorBeat = 0;
  running = false;

  get bpm(): number | null {
    return this.period ? Math.round(60 / this.period) : null;
  }

  /** Taps so far in this count (resets after a pause). */
  get count(): number {
    return this.taps.length;
  }

  /**
   * Record a tap. Two taps are enough to start; the first tap counts as
   * the first beat of the count-in bar. While running, each tap pulls the
   * nearest beat onto itself, so the bars stay with the music.
   */
  tap(time: number): void {
    const last = this.taps.at(-1);
    if (last !== undefined && time - last > TAP_RESET) this.taps = [];
    this.taps.push(time);
    if (this.taps.length > WINDOW) this.taps.shift();
    if (this.taps.length < 2) {
      if (!this.running) this.anchorTime = time;
      return;
    }
    const gaps = this.taps.slice(1).map((t, i) => t - this.taps[i]!);
    const period = median(gaps);
    if (60 / period < TAP_MIN_BPM || 60 / period > TAP_MAX_BPM) return;
    if (!this.running) {
      // The first tap of the count was beat 0, so this tap is beat count - 1.
      this.period = period;
      this.anchorTime = time;
      this.anchorBeat = this.taps.length - 1;
      this.running = true;
      return;
    }
    // Keep the beat count continuous: snap this tap to the beat it is nearest.
    const beatNow = this.anchorBeat + (time - this.anchorTime) / this.period;
    this.period = period;
    this.anchorTime = time;
    this.anchorBeat = Math.round(beatNow);
  }

  /** Beats since the first tap, at `time`; null until running. */
  beatsAt(time: number): number | null {
    if (!this.running || !this.period) return null;
    return this.anchorBeat + (time - this.anchorTime) / this.period;
  }

  stop(): void {
    this.taps = [];
    this.period = 0;
    this.running = false;
  }
}

