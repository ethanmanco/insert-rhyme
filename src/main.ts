import "@fontsource/press-start-2p/400.css";
import "@fontsource/vt323/400.css";
import "./styles/app.css";
import { barsIn, decode, Engine, MAX_RATE, MIN_RATE, useRelaxedAudioTiming, type Loop } from "./audio/engine";
import { canRecord, Recorder, type Take } from "./audio/recorder";
import { beatById, ENCODER_DELAY, POSTROLL } from "./core/beats";
import { doubleTempo, findGrid, halfTempo, monoOpening, ownGain, shiftBeats, syncFromTaps, type Grid } from "./core/ownBeat";
import { categoryWords, CATEGORIES } from "./core/categories";
import { flavorWords } from "./core/rapWords";
import { isNWord } from "./core/explicit";
import { PromptDeck, type Memory } from "./core/prompts";
import { allowedTiers, RhymeIndex, type Tier } from "./core/rhymes";
import { layoutName } from "./core/schemes";
import { addSession, cleanStats, currentStreak, dayKey, type Stats } from "./core/stats";
import { TapTempo } from "./core/tapTempo";
import { MAX_BPM, MIN_BPM } from "./core/timing";
import { DIFFICULTIES, loadSettings, saveSettings, type Settings } from "./settings";
import { load, save } from "./storage";
import { helperSheet, micExplainer, optionsSheet, type OptionsSection } from "./ui/sheets";
import { Stage } from "./ui/stage";

const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
// On phones, trade a little delay for audio that never crackles or drags.
if (isTouch()) useRelaxedAudioTiming();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let settings = loadSettings(reducedMotion);
let stats: Stats = cleanStats(load("stats", null));

const engine = new Engine(settings.bpm);
const tap = new TapTempo();
const recorder = new Recorder();
let take: Take | null = null;
/** When the current stretch of practice started (performance.now ms), or null. */
let sessionStart: number | null = null;

/* ---------- Beats ---------- */

const loops = new Map<string, Loop>();
let loadingBeat = false;
/** A beat from the player's own device: kept in memory only, never uploaded. */
let own: { name: string; buffer: AudioBuffer; grid: Grid; gain: number } | null = null;

async function loadBeat(id: string): Promise<Loop | null> {
  const beat = beatById(id);
  const cached = loops.get(beat.id);
  if (cached) return cached;
  loadingBeat = true;
  showPlaying();
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}beats/${beat.file}`);
    if (!res.ok) throw new Error(String(res.status));
    const buffer = await decode(await res.arrayBuffer());
    const expected = beat.start + (beat.bars * 240) / beat.bpm + POSTROLL;
    const lead = buffer.duration - expected > 0.02 ? ENCODER_DELAY : 0;
    const loop: Loop = { buffer, bpm: beat.bpm, start: beat.start + lead, bars: beat.bars };
    loops.set(beat.id, loop);
    return loop;
  } catch {
    hint.textContent = "The beat could not load. Check your connection and try again.";
    return null;
  } finally {
    loadingBeat = false;
    showPlaying();
  }
}

const ownLoop = (): Loop | null =>
  own && { buffer: own.buffer, bpm: own.grid.bpm, start: own.grid.start, bars: barsIn(own.buffer.duration, own.grid.bpm, own.grid.start), gain: own.gain };

/** The tempo the current recording plays at its own speed. */
const nativeBpm = () => (settings.mode === "own" ? (own?.grid.bpm ?? 90) : beatById(settings.beat).bpm);

/** Put the chosen beat in the engine (loading it if needed). */
async function useBeat(): Promise<void> {
  if (settings.mode === "tap") return engine.setLoop(null);
  if (settings.mode === "own") return engine.setLoop(ownLoop());
  const loop = await loadBeat(settings.beat);
  if (settings.mode === "beat") engine.setLoop(loop);
}

/* ---------- Words ---------- */

let index: RhymeIndex | null = null;
let deck: PromptDeck | null = null;
const allowed = () => allowedTiers(settings.explicit, settings.slurs);
/** With slurs on and "I'm white" on, the n-word is left out everywhere. */
const hiddenWords = () => (settings.slurs && settings.white ? isNWord : undefined);

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
  if (deck) save("recent", deck.memory());
  if (index)
    deck = new PromptDeck(index, allowed(), {
      theme: category ? categoryWords(category, settings.explicit) : null,
      style: category?.id ?? null,
      explicit: settings.explicit,
      slurs: settings.slurs,
      hidden: hiddenWords(),
      flavor: flavorWords(category, settings.explicit),
      accent: category?.accent ?? "us",
      memory: load<Memory>("recent", { sounds: [], words: [] }),
    });
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

/** Picks the random schemes and paces: new on each visit. */
const layoutSeed = Math.floor(Math.random() * 2 ** 31);

const stage = new Stage({
  layout: { scheme: settings.scheme, pace: settings.pace, seed: layoutSeed },
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

const ownRow = document.createElement("section");
ownRow.className = "ownrow";
ownRow.setAttribute("aria-label", "Your own beat");
ownRow.innerHTML = `
  <label class="btn px file">CHOOSE A BEAT FILE<input type="file" accept="audio/*" /></label>
  <p class="own-name" aria-live="polite">Pick any song or beat on this device. It stays here.</p>
  <div class="own-fix">
    <button class="btn px" type="button" data-own="half" aria-label="Half the tempo">HALF</button>
    <button class="btn px" type="button" data-own="double" aria-label="Double the tempo">DOUBLE</button>
    <button class="btn px" type="button" data-own="back" aria-label="Move bar 1 one beat earlier">BAR -1</button>
    <button class="btn px" type="button" data-own="fwd" aria-label="Move bar 1 one beat later">BAR +1</button>
  </div>
  <button class="btn px sync" type="button" data-own="sync">TAP TO SYNC</button>`;
const fileInput = ownRow.querySelector<HTMLInputElement>("input[type=file]")!;
const ownName = ownRow.querySelector<HTMLParagraphElement>(".own-name")!;
const syncBtn = ownRow.querySelector<HTMLButtonElement>(".sync")!;

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

app.append(top, chips, stage.root, tempo, ownRow, tapRow, tools, dock, takePanel, hint, live);

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
  hiddenWords,
  () => CATEGORIES.find((c) => c.id === settings.category)?.accent ?? "us",
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
  if (settings.mode === "tap") set("beat", "TAP TEMPO", "Tap tempo");
  else if (settings.mode === "own") set("beat", "YOUR BEAT", "Your own beat");
  else set("beat", beat.name.toUpperCase(), `Beat: ${beat.name}`);
  const layout = layoutName(settings);
  set("scheme", layout, `Rhyme scheme: ${layout}`);
  const words = DIFFICULTIES.find((d) => d.id === settings.difficulty)!;
  set("words", words.name, `Words: ${words.name.toLowerCase()}`);
  const theme = CATEGORIES.find((c) => c.id === settings.category);
  set("theme", theme ? theme.name : "ANY THEME", `Word theme: ${theme ? theme.name.toLowerCase() : "any"}`);
  const streak = currentStreak(stats, dayKey(new Date()));
  streakChip.textContent = `STREAK ${streak}`;
  streakChip.setAttribute("aria-label", `${streak} day streak. Open options and stats.`);
}

/** The tempo range for the current beat: turntable speed from 60% to 160%, inside 70 to 160 BPM where it can be. */
function tempoRange(): [number, number] {
  const n = nativeBpm();
  const lo = Math.max(Math.min(MIN_BPM, Math.round(n)), Math.ceil(n * MIN_RATE));
  const hi = Math.min(Math.max(MAX_BPM, Math.round(n)), Math.floor(n * MAX_RATE));
  return [lo, hi];
}

function showTempo() {
  const [lo, hi] = tempoRange();
  slider.min = String(lo);
  slider.max = String(hi);
  slider.value = String(settings.bpm);
  const speed = Math.round((settings.bpm / nativeBpm()) * 100);
  readout.textContent = speed === 100 ? `${settings.bpm} BPM` : `${settings.bpm} BPM (${speed}% SPEED)`;
}

function showOwn() {
  if (!own) {
    ownName.textContent = "Pick any song or beat on this device. It stays here.";
  } else {
    ownName.textContent = `${own.name}: ${Math.round(own.grid.bpm * 10) / 10} BPM. If the bars feel off, try HALF, DOUBLE, BAR -1 or +1, or TAP TO SYNC.`;
  }
  ownRow.querySelectorAll<HTMLButtonElement>(".own-fix button, .sync").forEach((b) => (b.disabled = !own));
}

function showMode() {
  const tapMode = settings.mode === "tap";
  tempo.hidden = tapMode;
  tapRow.hidden = !tapMode;
  ownRow.hidden = settings.mode !== "own";
  showTap();
  showOwn();
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
  } else if (loadingBeat) {
    playBtn.textContent = "LOADING...";
    playBtn.setAttribute("aria-label", "Loading the beat");
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
  if (patch.mode && patch.mode !== before.mode) {
    stop();
    if (settings.mode === "own" && own) settings.bpm = Math.round(own.grid.bpm);
    if (settings.mode === "beat") settings.bpm = beatById(settings.beat).bpm;
    engine.setBpm(settings.bpm);
    showMode();
    void useBeat();
  }
  if (patch.beat && patch.beat !== before.beat) {
    settings.bpm = beatById(patch.beat).bpm;
    engine.setBpm(settings.bpm);
    void useBeat();
  }
  showTempo();
  if (patch.scheme || patch.pace) stage.setLayout({ scheme: settings.scheme, pace: settings.pace, seed: layoutSeed });
  if (patch.ball !== undefined) stage.setBallOn(settings.ball);
  if (patch.announce !== undefined) stage.announceOn = settings.announce;
  if (patch.difficulty) stage.refresh();
  if (patch.explicit !== undefined || patch.slurs !== undefined || patch.white !== undefined || patch.category) void refreshWords();
  saveSettings(settings);
  showChips();
  showPlaying();
}

function setBpm(value: unknown) {
  const [lo, hi] = tempoRange();
  settings.bpm = Math.min(hi, Math.max(lo, Math.round(Number(value)) || settings.bpm));
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
  // Remember recent prompt words, so the next visit starts somewhere new.
  if (deck) save("recent", deck.memory());
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
  if (settings.mode === "own" && !own) {
    fileInput.click();
    return;
  }
  if (!engine.hasLoop) await useBeat();
  if (!engine.hasLoop) return;
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
  if (!isPlaying() && settings.mode !== "tap") await play();
  recorder.start(settings.mode !== "tap" ? engine.mix : null);
  announce("Recording.");
  showRecording();
}

async function finishTake() {
  const result = await recorder.stop(settings.mode !== "tap" ? engine.mix : null);
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
  if (settings.mode !== "tap") await play();
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

/* ---------- Your own beat ---------- */

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  ownName.textContent = `Reading ${file.name}...`;
  try {
    await engine.start();
    const buffer = await decode(await file.arrayBuffer());
    // Let the message paint before the analysis keeps the page busy.
    await new Promise((r) => setTimeout(r, 30));
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    const grid = findGrid(monoOpening(channels, buffer.sampleRate), buffer.sampleRate);
    stop();
    own = { name: file.name.replace(/\.[^.]+$/, ""), buffer, grid, gain: ownGain(channels) };
    settings.bpm = Math.round(grid.bpm);
    engine.setBpm(settings.bpm);
    engine.setLoop(ownLoop());
    showTempo();
    showOwn();
    announce(`Loaded ${own.name} at about ${Math.round(grid.bpm)} BPM.`);
  } catch {
    ownName.textContent = "That file could not be read. Try an MP3, M4A or WAV.";
  }
});

/** Change the grid and start the beat again from bar 1 so the bars match. */
function regrid(grid: Grid) {
  if (!own) return;
  own.grid = grid;
  settings.bpm = Math.max(1, Math.round(grid.bpm));
  engine.setBpm(settings.bpm);
  engine.setLoop(ownLoop());
  showTempo();
  showOwn();
}

let syncTaps: number[] | null = null;
ownRow.addEventListener("click", (e) => {
  const act = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-own]")?.dataset.own;
  if (!own || !act || act === "sync") return;
  if (act === "half") regrid(halfTempo(own.grid));
  if (act === "double") regrid(doubleTempo(own.grid));
  if (act === "back") regrid(shiftBeats(own.grid, -1));
  if (act === "fwd") regrid(shiftBeats(own.grid, 1));
});
// Tap to sync: tap the button on every beat while the song plays.
syncBtn.addEventListener("pointerdown", async (e) => {
  e.preventDefault();
  if (!own) return;
  if (!engine.playing) await play();
  const at = engine.heardBeats();
  if (syncTaps === null) syncTaps = [];
  if (at !== null && at >= 0) syncTaps.push(at);
  const need = 8;
  syncBtn.textContent = `TAP ON THE BEAT ${Math.min(syncTaps.length, need)}/${need}`;
  if (syncTaps.length >= need) {
    const loop = ownLoop();
    const fixed = loop && syncFromTaps(own.grid, syncTaps, loop.bars * 4);
    syncTaps = null;
    syncBtn.textContent = "TAP TO SYNC";
    if (fixed) {
      regrid(fixed);
      announce(`Synced to ${Math.round(fixed.bpm)} BPM.`);
    } else {
      ownName.textContent = "Those taps were too uneven. Try again, tapping on every beat.";
    }
  }
});
tempo.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
  b.addEventListener("click", () => setBpm(settings.bpm + Number(b.dataset.step))),
);
chips.addEventListener("click", (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLButtonElement>(".chip")?.dataset.chip;
  if (!chip) return;
  const sections: Record<string, OptionsSection> = { beat: settings.mode === "beat" ? "beat" : "music", scheme: "scheme", words: "words", theme: "theme" };
  options.open(sections[chip]);
});
streakChip.addEventListener("click", () => options.open("stats"));
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
  } else if (settings.mode !== "tap" && e.target !== slider && (e.key === "ArrowUp" || e.key === "ArrowRight")) {
    e.preventDefault();
    setBpm(settings.bpm + (e.shiftKey ? 5 : 1));
  } else if (settings.mode !== "tap" && e.target !== slider && (e.key === "ArrowDown" || e.key === "ArrowLeft")) {
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
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __ir: { engine, stage, tap, loops, settings: () => settings, own: () => own, deck: () => deck, index: () => index } });

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
