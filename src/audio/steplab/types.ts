/**
 * The few Steplab types the copied audio files need. The files in this
 * folder come from Steplab (github.com/ethanmanco/steplab), the beat maker
 * this app reuses its sound engine from.
 */
export const DRUM_IDS = [
  "kick",
  "snare",
  "chat",
  "ohat",
  "clap",
  "tom",
  "kick808",
  "snare808",
  "hat808",
  "ohat808",
  "clap808",
  "tom808",
  "rim",
  "cowbell",
] as const;
export type DrumId = (typeof DRUM_IDS)[number];

export const SYNTH_IDS = [
  "lead",
  "bass",
  "b808",
  "pluck",
  "pad",
  "keys",
  "piano",
  "strings",
  "brass",
  "bell",
  "organ",
  "supersaw",
  "marimba",
  "flute",
  "sub",
  "reese",
  "chip",
] as const;
export type SynthId = (typeof SYNTH_IDS)[number];

/** A channel's tone knobs, each 0..1 (0.5 keeps the preset as designed). */
export interface ToneShape {
  cutoff: number;
  resonance: number;
  attack: number;
  release: number;
  octave: number;
  glide: number;
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
