import { beatById } from "./core/beats";
import { isScheme, type SchemeId } from "./core/schemes";
import { clampBpm } from "./core/timing";
import { load, save } from "./storage";

/** How much of each rhyme group's words the blocks show. */
export type Difficulty = "all" | "first" | "none";
export type Mode = "beat" | "tap";

export interface Settings {
  mode: Mode;
  beat: string;
  bpm: number;
  scheme: SchemeId;
  difficulty: Difficulty;
  /** Swear words and crude words in prompts and rhymes. Off by default. */
  explicit: boolean;
  /** Slurs, a separate toggle. Off by default. */
  slurs: boolean;
  ball: boolean;
  /** Screen reader news about the next rhyme. */
  announce: boolean;
}

export const DIFFICULTIES: { id: Difficulty; name: string; hint: string }[] = [
  { id: "all", name: "ALL WORDS", hint: "Every rhyme word is on its block." },
  { id: "first", name: "FIRST WORD", hint: "Only the first word of each rhyme. You find the rest." },
  { id: "none", name: "NO WORDS", hint: "Free practice: just the scheme." },
];

export function loadSettings(reducedMotion: boolean): Settings {
  const raw = load<Record<string, unknown>>("settings", {});
  const beat = beatById(raw.beat);
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    mode: raw.mode === "tap" ? "tap" : "beat",
    beat: beat.id,
    bpm: clampBpm(raw.bpm, beat.bpm),
    scheme: isScheme(raw.scheme) ? raw.scheme : "aabb",
    difficulty: DIFFICULTIES.some((d) => d.id === raw.difficulty) ? (raw.difficulty as Difficulty) : "all",
    explicit: bool(raw.explicit, false),
    slurs: bool(raw.slurs, false),
    ball: bool(raw.ball, !reducedMotion),
    announce: bool(raw.announce, true),
  };
}

export function saveSettings(s: Settings): void {
  save("settings", s);
}
