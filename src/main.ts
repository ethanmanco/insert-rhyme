import "@fontsource/press-start-2p/400.css";
import "@fontsource/vt323/400.css";
import "./styles/app.css";
import { Engine, useRelaxedAudioTiming } from "./audio/engine";
import { canRecord, Recorder, type Take } from "./audio/recorder";
import { beatById } from "./core/beats";
import { categoryWords, CATEGORIES } from "./core/categories";
import { PromptDeck } from "./core/prompts";
import { allowedTiers, RhymeIndex, type Tier } from "./core/rhymes";
import { SCHEMES } from "./core/schemes";
import { addSession, cleanStats, currentStreak, dayKey, type Stats } from "./core/stats";
import { TapTempo } from "./core/tapTempo";
import { clampBpm, MAX_BPM, MIN_BPM } from "./core/timing";
import { DIFFICULTIES, loadSettings, saveSettings, type Settings } from "./settings";
import { load, save } from "./storage";
import { helperSheet, micExplainer, optionsSheet } from "./ui/sheets";
import { Stage } from "./ui/stage";

const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
// On phones, trade a little delay for audio that never crackles or drags.
if (isTouch()) useRelaxedAudioTiming();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let settings = loadSettings(reducedMotion);
let stats: Stats = cleanStats(load("stats", null));

const engine = new Engine(beatById(settings.beat), settings.bpm);
const tap = new TapTempo();
const recorder = new Recorder();
let take: Take | null = null;
/** When the current stretch of practice started (performance.now ms), or null. */
let sessionStart: number | null = null;

/* ---------- Words ---------- */

let index: RhymeIndex | null = null;
let deck: PromptDeck | null = null;
const allowed = () => allowedTiers(settings.explicit, settings.slurs);

async function loadTier(tier: Tier): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/words-${tier}.txt`);
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    index ??= new RhymeIndex();
    index.add(text, tier);
  } catch {
    announce("The word list could not load. Check your connection and reload.");
  }
}

/** Load whatever the toggles need, then deal fresh prompt words. */
async function refreshWords(): Promise<void> {
  const want = [...allowed()].filter((t) => !index?.loaded.has(t));
  for (const tier of want) await loadTier(tier);
  const category = CATEGORIES.find((c) => c.id === settings.category);
  if (index) deck = new PromptDeck(index, allowed(), Date.now(), category ? categoryWords(category, settings.explicit) : null);
  stage.refresh();
  helper.refresh();
}

/* ---------- Screen reader news ---------- */

const live = document.createElement("div");
live.className = "sr-only";
live.setAttribute("aria-live", "polite");
function announce(text: string) {
  live.textContent = text;
}

/* ---------- Layout ---------- */

const app = document.querySelector<HTMLDivElement>("#app")!;
app.className = "app";

const top = document.createElement("header");
top.className = "top";
top.innerHTML = `
  <h1 class="logo">INSERT RHYME</h1>
  <button class="chip px streak" type="button"></button>`;
const streakChip = top.querySelector<HTMLButtonElement>(".streak")!;

const chips = document.createElement("div");
chips.className = "chips";
chips.innerHTML = `
  <button class="chip px" type="button" data-chip="beat"></button>
  <button class="chip px solid" type="button" data-chip="scheme"></button>
  <button class="chip px" type="button" data-chip="words"></button>
  <button class="chip px" type="button" data-chip="theme"></button>`;

const stage = new Stage({
  scheme: settings.scheme,
  announce,
  onWord: (word) => helper.open(word),
  label(t) {
    if (settings.difficulty === "none" || !deck) return { text: t.letter };
    if (settings.difficulty === "first" && t.slot > 0) return { text: "????" };
    const word = deck.word(t.group, t.slot);
    return { text: word, word };
  },
});

const tempo = document.createElement("section");
tempo.className = "tempo";
tempo.setAttribute("aria-label", "Tempo");
tempo.innerHTML = `
  <button class="btn px" type="button" data-step="-1" aria-label="Slower">-</button>
  <input type="range" min="${MIN_BPM}" max="${MAX_BPM}" step="1" aria-label="Tempo in beats per minute" />
  <button class="btn px" type="button" data-step="1" aria-label="Faster">+</button>
  <output></output>`;
const slider = tempo.querySelector("input")!;
const readout = tempo.querySelector("output")!;

const tapRow = document.createElement("section");
tapRow.className = "taprow";
tapRow.setAttribute("aria-label", "Tap tempo");
tapRow.innerHTML = `
  <button class="btn px tap" type="button">TAP</button>
  <output aria-live="polite"></output>`;
const tapBtn = tapRow.querySelector("button")!;
const tapOut = tapRow.querySelector("output")!;

const tools = document.createElement("div");
tools.className = "tools";
tools.innerHTML = `
  <button class="btn px" type="button" data-tool="options">OPTIONS</button>
  <button class="btn px" type="button" data-tool="rhymes">RHYMES</button>`;

const dock = document.createElement("div");
dock.className = "dock";
dock.innerHTML = `
  <button class="btn px main play" type="button"></button>
  <button class="btn px rec" type="button" aria-label="Record">REC</button>`;
const playBtn = dock.querySelector<HTMLButtonElement>(".play")!;
const recBtn = dock.querySelector<HTMLButtonElement>(".rec")!;

const takePanel = document.createElement("section");
takePanel.className = "take px";
takePanel.setAttribute("aria-label", "Your recording");
takePanel.hidden = true;

const hint = document.createElement("p");
hint.className = "hint";

app.append(top, chips, stage.root, tempo, tapRow, tools, dock, takePanel, hint, live);

/* ---------- Sheets ---------- */

const options = optionsSheet(
  () => settings,
  () => stats,
  (patch) => change(patch),
);
const helper = helperSheet(
  () => index,
  allowed,
  () => settings.explicit,
);
const explainMic = micExplainer();

/* ---------- Start screen ---------- */

const start = document.createElement("div");
start.className = "start";
start.innerHTML = `
  <h1>INSERT<br />RHYME</h1>
  <p>Freestyle practice. Rap over the beat and land your rhymes on the bright blocks.</p>
  <button class="btn px main" type="button">PRESS START</button>
  <p class="hint">Sound will play, so turn your volume up.</p>`;
document.body.append(start);

/* ---------- Showing state ---------- */

const isPlaying = () => (settings.mode === "tap" ? tap.running : engine.playing);

function showChips() {
  const beat = beatById(settings.beat);
  const set = (k: string, text: string, label: string) => {
    const b = chips.querySelector<HTMLButtonElement>(`[data-chip="${k}"]`)!;
    b.textContent = text;
    b.setAttribute("aria-label", `${label}. Open options.`);
  };
  set("beat", settings.mode === "tap" ? "TAP TEMPO" : beat.name.toUpperCase(), settings.mode === "tap" ? "Tap tempo" : `Beat: ${beat.name}`);
  const scheme = SCHEMES.find((s) => s.id === settings.scheme)!;
  set("scheme", scheme.name, `Rhyme scheme: ${scheme.name}`);
  const words = DIFFICULTIES.find((d) => d.id === settings.difficulty)!;
  set("words", words.name, `Words: ${words.name.toLowerCase()}`);
  const theme = CATEGORIES.find((c) => c.id === settings.category);
  set("theme", theme ? theme.name : "ANY THEME", `Word theme: ${theme ? theme.name.toLowerCase() : "any"}`);
  const streak = currentStreak(stats, dayKey(new Date()));
  streakChip.textContent = `STREAK ${streak}`;
  streakChip.setAttribute("aria-label", `${streak} day streak. Open options and stats.`);
}

function showTempo() {
  slider.value = String(settings.bpm);
  readout.textContent = `${settings.bpm} BPM`;
}

function showMode() {
  const tapMode = settings.mode === "tap";
  tempo.hidden = tapMode;
  tapRow.hidden = !tapMode;
  showTap();
  hint.textContent = tapMode
    ? "Start your music, then tap along on the beat. The bars follow."
    : isTouch()
      ? "Rap one line per bar. Land the rhyme on the bright block."
      : "Space plays and stops. Land the rhyme on the bright block.";
}

function showTap() {
  if (tap.running) tapOut.textContent = `${tap.bpm} BPM. Keep tapping to adjust.`;
  else if (tap.count === 1) tapOut.textContent = "Keep tapping...";
  else tapOut.textContent = "Tap 2 or more times on the beat.";
}

function showPlaying() {
  const playing = isPlaying();
  if (settings.mode === "tap") {
    playBtn.textContent = playing ? "STOP" : "TAP TO START";
    playBtn.setAttribute("aria-label", playing ? "Stop" : "Tap along to start");
  } else {
    playBtn.textContent = playing ? "STOP" : "PLAY";
    playBtn.setAttribute("aria-label", playing ? "Stop" : "Play");
  }
}

let recLabel = "";
function showRecording() {
  const s = Math.floor(recorder.elapsed());
  const text = recorder.recording ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "REC";
  if (text === recLabel) return;
  recLabel = text;
  recBtn.textContent = text;
  recBtn.classList.toggle("on", recorder.recording);
  recBtn.setAttribute("aria-label", recorder.recording ? "Stop recording" : "Record");
}

function showTake(message?: string) {
  if (message) {
    takePanel.hidden = false;
    takePanel.innerHTML = `<p>${message}</p>`;
    return;
  }
  if (!take) {
    takePanel.hidden = true;
    takePanel.replaceChildren();
    return;
  }
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const name = `insert-rhyme-${dayKey(d)}-${p(d.getHours())}${p(d.getMinutes())}.${take.extension}`;
  takePanel.hidden = false;
  takePanel.innerHTML = `
    <p>YOUR TAKE (${Math.round(take.seconds)}s)</p>
    <audio controls src="${take.url}"></audio>
    <div class="row-buttons">
      <a class="btn px" href="${take.url}" download="${name}">DOWNLOAD</a>
      <button class="btn px" type="button" data-take="delete">DELETE</button>
    </div>`;
}

/* ---------- Actions ---------- */

function change(patch: Partial<Settings>) {
  const before = settings;
  settings = { ...settings, ...patch };
  if (patch.beat && patch.beat !== before.beat) {
    const beat = beatById(patch.beat);
    settings.bpm = beat.bpm;
    engine.setBeat(beat);
    engine.setBpm(settings.bpm);
    showTempo();
  }
  if (patch.mode && patch.mode !== before.mode) {
    stop();
    showMode();
  }
  if (patch.scheme) stage.setScheme(settings.scheme);
  if (patch.ball !== undefined) stage.setBallOn(settings.ball);
  if (patch.announce !== undefined) stage.announceOn = settings.announce;
  if (patch.difficulty) stage.refresh();
  if (patch.explicit !== undefined || patch.slurs !== undefined || patch.category) void refreshWords();
  saveSettings(settings);
  showChips();
  showPlaying();
}

function setBpm(value: unknown) {
  settings.bpm = clampBpm(value, settings.bpm);
  engine.setBpm(settings.bpm);
  saveSettings(settings);
  showTempo();
}

/* Keep the screen awake while rapping, where the browser allows it. */
type WakeLock = { release(): Promise<void> };
let wakeLock: WakeLock | null = null;
async function holdScreen(on: boolean) {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<WakeLock> } };
    if (on && !wakeLock && nav.wakeLock) wakeLock = await nav.wakeLock.request("screen");
    else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

function beginSession() {
  sessionStart ??= performance.now();
  void holdScreen(true);
}

function endSession() {
  if (sessionStart === null) return;
  const seconds = (performance.now() - sessionStart) / 1000;
  sessionStart = null;
  stats = addSession(stats, seconds, dayKey(new Date()));
  save("stats", stats);
  showChips();
  void holdScreen(false);
}

async function play() {
  if (settings.mode === "tap") return;
  await engine.start();
  engine.play();
  beginSession();
  announce("Count in.");
  showPlaying();
}

function stop() {
  if (recorder.recording) void finishTake();
  engine.stop();
  tap.stop();
  stage.reset();
  endSession();
  showTap();
  showPlaying();
}

async function togglePlay() {
  if (isPlaying()) {
    stop();
    announce("Stopped.");
  } else if (settings.mode === "tap") {
    tapOnce(performance.now());
  } else {
    await play();
  }
}

function tapOnce(ms: number) {
  const was = tap.running;
  tap.tap(ms / 1000);
  if (tap.running && !was) {
    beginSession();
    showPlaying();
  }
  showTap();
}

async function toggleRecord() {
  if (recorder.recording) {
    await finishTake();
    return;
  }
  if (!canRecord()) {
    showTake("Recording is not supported in this browser.");
    return;
  }
  if (!load("micExplained", false)) {
    if (!(await explainMic())) return;
    save("micExplained", true);
  }
  try {
    await engine.start();
    await recorder.open();
  } catch {
    showTake("The microphone is blocked. Allow it in your browser's site settings to record.");
    return;
  }
  if (take) {
    URL.revokeObjectURL(take.url);
    take = null;
    showTake();
  }
  if (!isPlaying() && settings.mode === "beat") await play();
  recorder.start(settings.mode === "beat" ? engine.mix : null);
  announce("Recording.");
  showRecording();
}

async function finishTake() {
  const result = await recorder.stop(settings.mode === "beat" ? engine.mix : null);
  recorder.close();
  take = result;
  showRecording();
  showTake(result ? undefined : "Nothing was recorded. Try again.");
  if (result) announce("Recording saved. Play it back or download it below.");
}

/* Every frame, ask the clock where the music is and draw that. */
function frame() {
  const beats = settings.mode === "tap" ? tap.beatsAt(performance.now() / 1000) : engine.heardBeats();
  stage.update(beats);
  if (recorder.recording) showRecording();
  requestAnimationFrame(frame);
}

/* ---------- Wiring ---------- */

start.querySelector("button")!.addEventListener("click", async () => {
  start.hidden = true;
  if (settings.mode === "beat") await play();
  (settings.mode === "tap" ? tapBtn : playBtn).focus();
});

playBtn.addEventListener("click", () => void togglePlay());
recBtn.addEventListener("click", () => void toggleRecord());
// pointerdown, not click: a tap should count the moment the finger lands.
tapBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  tapOnce(e.timeStamp);
});
tapBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tapOnce(e.timeStamp);
});
slider.addEventListener("input", () => setBpm(slider.value));
tempo.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
  b.addEventListener("click", () => setBpm(settings.bpm + Number(b.dataset.step))),
);
chips.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest(".chip")) options.open();
});
streakChip.addEventListener("click", () => options.open());
tools.addEventListener("click", (e) => {
  const tool = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-tool]")?.dataset.tool;
  if (tool === "options") options.open();
  if (tool === "rhymes") helper.open();
});
takePanel.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("[data-take='delete']") && take) {
    URL.revokeObjectURL(take.url);
    take = null;
    showTake();
    announce("Recording deleted.");
  }
});

// Keys: Space plays and stops, T taps, R records, arrows change the tempo.
// Caught on key down and key up, so a focused button does not also click.
document.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = e.target instanceof HTMLInputElement && e.target.type !== "range";
  if (typing) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (e.repeat) return;
    start.hidden = true;
    if (settings.mode === "tap" && !tap.running) tapOnce(e.timeStamp);
    else void togglePlay();
  } else if (e.key === "t" || e.key === "T") {
    if (settings.mode === "tap") tapOnce(e.timeStamp);
  } else if (e.key === "r" || e.key === "R") {
    start.hidden = true;
    void toggleRecord();
  } else if (settings.mode === "beat" && e.target !== slider && (e.key === "ArrowUp" || e.key === "ArrowRight")) {
    e.preventDefault();
    setBpm(settings.bpm + (e.shiftKey ? 5 : 1));
  } else if (settings.mode === "beat" && e.target !== slider && (e.key === "ArrowDown" || e.key === "ArrowLeft")) {
    e.preventDefault();
    setBpm(settings.bpm - (e.shiftKey ? 5 : 1));
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space" && !document.querySelector("dialog[open]") && !(e.target instanceof HTMLInputElement && e.target.type !== "range")) e.preventDefault();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isPlaying()) void holdScreen(true);
});
// Closing the tab mid-session still counts the practice.
window.addEventListener("pagehide", () => endSession());

// ?debug exposes internals to the browser check script (scripts/check.mjs).
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __ir: { engine, stage, tap, settings: () => settings } });

stage.setBallOn(settings.ball);
stage.announceOn = settings.announce;
showChips();
showTempo();
showMode();
showPlaying();
showRecording();
stage.reset();
requestAnimationFrame(frame);
void refreshWords();
