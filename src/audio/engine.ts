import * as Tone from "tone";
import { BEATS_PER_BAR, secondsPerBeat } from "../core/timing";

/**
 * Plays recorded beats. A beat is an audio buffer plus where its first bar
 * starts, its own tempo and how many bars it holds.
 *
 * Tempo works like a turntable: the speed and pitch move together. Tone's
 * transport keeps the bar count on the audio clock at the chosen tempo, and
 * every loop is restarted exactly on its bar line from that clock, so the
 * music and the bars can never drift apart, even after a tempo change. The
 * visualizer asks heardBeats() where the music is each frame, which reads
 * the same clock.
 */

export interface Loop {
  buffer: AudioBuffer;
  /** The tempo the recording plays at its own speed. */
  bpm: number;
  /** Seconds into the buffer where bar 1 starts. */
  start: number;
  /** Bars in one pass of the loop. */
  bars: number;
}

/** How far the speed can move from the recording's own tempo. */
export const MIN_RATE = 0.6;
export const MAX_RATE = 1.6;
/** Short fades at loop seams, so a restart never clicks. */
const FADE = 0.004;

/**
 * Phones and tablets: a bigger audio buffer and a longer look-ahead, so a
 * slow processor never crackles or drags (Steplab's fix for budget phones).
 * Run it before any sound is made.
 */
export function useRelaxedAudioTiming(): void {
  Tone.setContext(new Tone.Context({ latencyHint: "playback", lookAhead: 0.2 }), true);
}

const raw = () => Tone.getContext().rawContext as AudioContext;

/** Decode an audio file (from the site or the player's device). */
export async function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  return raw().decodeAudioData(data);
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class Engine {
  private master?: Tone.Gain;
  private loop: Loop | null = null;
  private bpm: number;
  private startAt = 0;
  private repeatId: number | null = null;
  private voices: Voice[] = [];
  private levelMeter?: Tone.Meter;
  playing = false;

  constructor(bpm: number) {
    this.bpm = bpm;
  }

  /** Must run inside a tap: browsers keep audio locked until the user acts. */
  async start(): Promise<void> {
    await Tone.start();
    if (this.master) return;
    // iPhones mute web audio with the ringer switch unless the page says it plays media.
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      // Not supported here.
    }
    const limiter = new Tone.Limiter(-1).toDestination();
    this.master = new Tone.Gain(0.9).connect(limiter);
    Tone.getTransport().bpm.value = this.bpm;
  }

  /** The full mix, for recording. Null until audio has started. */
  get mix(): Tone.ToneAudioNode | null {
    return this.master ?? null;
  }

  get hasLoop(): boolean {
    return this.loop !== null;
  }

  /** Speed against the recording's own tempo. */
  rate(bpm = this.bpm): number {
    if (!this.loop) return 1;
    return Math.min(MAX_RATE, Math.max(MIN_RATE, bpm / this.loop.bpm));
  }

  /** Swap the beat. While playing, it starts again from bar 1. */
  setLoop(loop: Loop | null): void {
    const wasPlaying = this.playing;
    if (wasPlaying) this.stop();
    this.loop = loop;
    if (wasPlaying && loop) this.play();
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    Tone.getTransport().bpm.value = bpm;
    const now = Tone.now();
    for (const v of this.voices) v.source.playbackRate.setValueAtTime(this.rate(), now);
  }

  play(): void {
    if (!this.master || !this.loop || this.playing) return;
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    transport.bpm.value = this.bpm;
    const loop = this.loop;
    this.repeatId = transport.scheduleRepeat((time) => this.launch(loop, time), `${loop.bars}m`, 0);
    // A short lead so the first downbeat is booked in time, never late.
    this.startAt = Tone.now() + 0.1;
    transport.start(this.startAt);
    this.playing = true;
  }

  /** Start one pass of the loop on a bar line, and fade out the pass before it. */
  private launch(loop: Loop, time: number) {
    if (!this.master) return;
    const ctx = raw();
    for (const v of this.voices) this.fadeOut(v, time);
    const source = ctx.createBufferSource();
    source.buffer = loop.buffer;
    source.playbackRate.value = this.rate();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + FADE);
    source.connect(gain);
    Tone.connect(gain, this.master);
    source.start(time, loop.start);
    const voice = { source, gain };
    source.onended = () => {
      gain.disconnect();
      this.voices = this.voices.filter((v) => v !== voice);
    };
    this.voices.push(voice);
  }

  private fadeOut(v: Voice, time: number) {
    v.gain.gain.cancelScheduledValues(time);
    v.gain.gain.setValueAtTime(1, time);
    v.gain.gain.linearRampToValueAtTime(0, time + FADE);
    try {
      v.source.stop(time + FADE * 2);
    } catch {
      // Already stopped.
    }
  }

  stop(): void {
    if (!this.playing) return;
    const transport = Tone.getTransport();
    if (this.repeatId !== null) transport.clear(this.repeatId);
    this.repeatId = null;
    transport.stop();
    transport.position = 0;
    const now = Tone.now();
    for (const v of this.voices) this.fadeOut(v, now);
    this.playing = false;
  }

  /** Loudness of the mix right now in dB, for the browser check script. */
  level(): number {
    if (!this.master) return -Infinity;
    if (!this.levelMeter) {
      this.levelMeter = new Tone.Meter({ smoothing: 0.5 });
      this.master.connect(this.levelMeter);
    }
    return this.levelMeter.getValue() as number;
  }

  /**
   * Where the music is as you hear it, in beats since playback started.
   * Sound leaves the browser's buffer and then the device before it reaches
   * your ears, so both delays are taken off. Negative just before the first
   * beat; null when stopped.
   */
  heardBeats(): number | null {
    if (!this.playing) return null;
    const ctx = raw();
    const now = Tone.immediate() - (ctx.baseLatency || 0) - (ctx.outputLatency || 0);
    if (now < this.startAt) return (now - this.startAt) / secondsPerBeat(this.bpm);
    const transport = Tone.getTransport();
    return transport.getTicksAtTime(now) / transport.PPQ;
  }
}

/** Bars that fit in a buffer after `start`, at its own tempo (at least one). */
export function barsIn(duration: number, bpm: number, start: number): number {
  const bar = secondsPerBeat(bpm) * BEATS_PER_BAR;
  return Math.max(1, Math.floor((duration - start) / bar));
}
