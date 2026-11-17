import * as Tone from "tone";
import { beatSteps, eventsAt, type Beat } from "../core/beats";
import { secondsPerBeat, secondsPerStep, stepFromTicks, swingDelay } from "../core/timing";
import { bakedDrumVoice, onBaked, requestBake } from "./steplab/bake";
import { createDrumVoice, type DrumVoice } from "./steplab/drums";
import { createInstrument, type Instrument } from "./steplab/instruments";
import type { DrumId } from "./steplab/types";

/**
 * Plays a beat. Tone's transport runs on the audio clock and schedules a
 * little ahead, so every note is booked for an exact future time. The
 * visualizer never keeps its own count: it asks heardBeats() where the music
 * is each frame, which reads the same clock, so the ball cannot drift.
 */

/**
 * Phones and tablets: a bigger audio buffer and a longer look-ahead, so a
 * slow processor never crackles or drags (Steplab's fix for budget phones).
 * Run it before any sound is made.
 */
export function useRelaxedAudioTiming(): void {
  Tone.setContext(new Tone.Context({ latencyHint: "playback", lookAhead: 0.2 }), true);
}

/** A drum that plays live until its pre-rendered copy is ready, then swaps. */
class DrumSlot {
  private voice: DrumVoice;
  private baked = false;
  /** Per-hit level, set at each hit's exact time, so soft and full hits mix freely. */
  private readonly hit: Tone.Gain;
  readonly volume: Tone.Volume;

  constructor(
    readonly id: DrumId,
    db: number,
    out: Tone.ToneAudioNode,
  ) {
    this.volume = new Tone.Volume(db).connect(out);
    this.hit = new Tone.Gain(1).connect(this.volume);
    this.voice = createDrumVoice(id);
    this.voice.output.connect(this.hit);
    requestBake(id);
    this.swap();
  }

  /** Called when any drum finishes baking. */
  swap(): void {
    if (this.baked) return;
    const baked = bakedDrumVoice(this.id);
    if (!baked) return;
    this.voice.dispose();
    this.voice = baked;
    this.voice.output.connect(this.hit);
    this.baked = true;
  }

  trigger(time: number, velocity: number): void {
    this.hit.gain.setValueAtTime(velocity, time);
    this.voice.trigger(time);
  }

  choke(time: number): void {
    this.voice.choke?.(time);
  }

  dispose(): void {
    this.voice.dispose();
    this.hit.dispose();
    this.volume.dispose();
  }
}

interface PartSlot {
  instrument: Instrument;
  volume: Tone.Volume;
}

export class Engine {
  private master?: Tone.Gain;
  private drums = new Map<DrumId, DrumSlot>();
  private parts: PartSlot[] = [];
  private beat: Beat;
  private bpm: number;
  private startAt = 0;
  playing = false;

  constructor(beat: Beat, bpm: number) {
    this.beat = beat;
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
    onBaked(() => this.drums.forEach((d) => d.swap()));
    this.build();
    const transport = Tone.getTransport();
    transport.bpm.value = this.bpm;
    new Tone.Loop((time) => this.tick(time), "16n").start(0);
  }

  private build() {
    if (!this.master) return;
    this.drums.forEach((d) => d.dispose());
    this.parts.forEach((p) => {
      p.instrument.dispose();
      p.volume.dispose();
    });
    this.drums.clear();
    for (const line of this.beat.drums) {
      if (!this.drums.has(line.drum)) this.drums.set(line.drum, new DrumSlot(line.drum, line.volume, this.master));
    }
    this.parts = this.beat.parts.map((part) => {
      const instrument = createInstrument(part.synth);
      const volume = new Tone.Volume(part.volume).connect(this.master!);
      instrument.output.connect(volume);
      const cutoffKnob = part.cutoff ? Math.log(part.cutoff / 60) / Math.log(20000 / 60) : 1;
      instrument.setTone({ cutoff: cutoffKnob, resonance: 0, attack: 0.5, release: 0.5, octave: 0.5, glide: 0 });
      return { instrument, volume };
    });
  }

  private tick(time: number) {
    const transport = Tone.getTransport();
    const step = stepFromTicks(transport.getTicksAtTime(time), transport.PPQ);
    const at = time + swingDelay(step, this.beat.swing, this.bpm);
    const { drums, notes } = eventsAt(this.beat, step);
    for (const d of drums) {
      // A closed hat cuts off a ringing open hat, as on a drum machine.
      if (d.drum === "chat") this.drums.get("ohat")?.choke(at);
      this.drums.get(d.drum)?.trigger(at, d.velocity);
    }
    const len = secondsPerStep(this.bpm);
    for (const { part, event } of notes) {
      const slot = this.parts[part];
      if (!slot) continue;
      for (const n of event.notes) slot.instrument.play(n, event.length * len * 0.95, at, event.velocity);
    }
  }

  /** The full mix, for recording. Null until audio has started. */
  get mix(): Tone.ToneAudioNode | null {
    return this.master ?? null;
  }

  setBeat(beat: Beat): void {
    this.beat = beat;
    this.build();
  }

  loopSteps(): number {
    return beatSteps(this.beat);
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    Tone.getTransport().bpm.value = bpm;
  }

  play(): void {
    if (!this.master || this.playing) return;
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    // A short lead so the first downbeat is booked in time, never late.
    this.startAt = Tone.now() + 0.1;
    transport.start(this.startAt);
    this.playing = true;
  }

  stop(): void {
    if (!this.playing) return;
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    this.parts.forEach((p) => p.instrument.releaseAll());
    this.playing = false;
  }

  /** Loudness of the mix right now in dB, for the browser check script. */
  private levelMeter?: Tone.Meter;
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
    const raw = Tone.getContext().rawContext as AudioContext;
    const now = Tone.immediate() - (raw.baseLatency || 0) - (raw.outputLatency || 0);
    if (now < this.startAt) return (now - this.startAt) / secondsPerBeat(this.bpm);
    const transport = Tone.getTransport();
    return transport.getTicksAtTime(now) / transport.PPQ;
  }
}
