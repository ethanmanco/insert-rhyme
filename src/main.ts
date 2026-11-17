import "@fontsource/press-start-2p/400.css";
import "@fontsource/vt323/400.css";
import "./styles/app.css";
import { Engine, useRelaxedAudioTiming } from "./audio/engine";
import { BEATS } from "./core/beats";
import { clampBpm, MAX_BPM, MIN_BPM } from "./core/timing";
import { load, save } from "./storage";
import { Stage } from "./ui/stage";

const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
// On phones, trade a little delay for audio that never crackles or drags.
if (isTouch()) useRelaxedAudioTiming();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const beat = BEATS[0]!;
let bpm = clampBpm(load("bpm", beat.bpm), beat.bpm);
let ballOn = load("ball", !reducedMotion);

const engine = new Engine(beat, bpm);

/* ---------- Screen reader news ---------- */

const live = document.createElement("div");
live.className = "sr-only";
live.setAttribute("aria-live", "polite");
const announce = (text: string) => {
  live.textContent = text;
};

/* ---------- Layout ---------- */

const app = document.querySelector<HTMLDivElement>("#app")!;
app.className = "app";

const top = document.createElement("header");
top.className = "top";
top.innerHTML = `
  <p class="logo">INSERT RHYME</p>
  <div class="chips">
    <span class="chip">${beat.name.toUpperCase()}</span>
    <span class="chip solid" title="Rhyme scheme">AABB</span>
  </div>`;

const stage = new Stage("aabb", announce);
stage.setBallOn(ballOn);

const tempo = document.createElement("section");
tempo.className = "tempo";
tempo.setAttribute("aria-label", "Tempo");
tempo.innerHTML = `
  <button class="btn px" type="button" data-step="-1" aria-label="Slower">-</button>
  <input type="range" min="${MIN_BPM}" max="${MAX_BPM}" step="1" aria-label="Tempo in beats per minute" />
  <button class="btn px" type="button" data-step="1" aria-label="Faster">+</button>
  <output aria-live="off"></output>`;
const slider = tempo.querySelector("input")!;
const readout = tempo.querySelector("output")!;

const toggles = document.createElement("div");
toggles.className = "toggles";
const ballToggle = document.createElement("button");
ballToggle.type = "button";
ballToggle.className = "btn px toggle";

const playBtn = document.createElement("button");
playBtn.type = "button";
playBtn.className = "btn px main";

const hint = document.createElement("p");
hint.className = "hint";
hint.textContent = isTouch() ? "Rap one line per bar. Land the rhyme on the bright block." : "Space plays and stops. Land the rhyme on the bright block.";

toggles.append(ballToggle);
app.append(top, stage.root, tempo, toggles, playBtn, hint, live);

/* ---------- Start screen ---------- */

const start = document.createElement("div");
start.className = "start";
start.innerHTML = `
  <h1>INSERT<br />RHYME</h1>
  <p>Freestyle practice. Rap over the beat and land your rhymes on the bright blocks.</p>
  <button class="btn px main" type="button">PRESS START</button>
  <p class="hint">Sound will play, so turn your volume up.</p>`;
document.body.append(start);

/* ---------- State ---------- */

function showTempo() {
  slider.value = String(bpm);
  readout.textContent = `${bpm} BPM`;
}

function setBpm(value: unknown) {
  bpm = clampBpm(value, bpm);
  engine.setBpm(bpm);
  save("bpm", bpm);
  showTempo();
}

function showBall() {
  ballToggle.textContent = ballOn ? "BALL: ON" : "BALL: OFF";
  ballToggle.setAttribute("aria-pressed", String(ballOn));
  ballToggle.setAttribute("aria-label", "Bouncing ball");
  stage.setBallOn(ballOn);
}

function showPlaying() {
  playBtn.textContent = engine.playing ? "STOP" : "PLAY";
  playBtn.setAttribute("aria-label", engine.playing ? "Stop" : "Play");
}

/* Keep the screen awake while rapping, where the browser allows it. */
let wakeLock: { release(): Promise<void> } | null = null;
async function holdScreen(on: boolean) {
  try {
    if (on && !wakeLock && "wakeLock" in navigator) {
      wakeLock = await (navigator as Navigator & { wakeLock: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock.request("screen");
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

async function togglePlay() {
  await engine.start();
  if (engine.playing) {
    engine.stop();
    stage.reset();
    announce("Stopped.");
  } else {
    engine.play();
    announce("Count in.");
  }
  void holdScreen(engine.playing);
  showPlaying();
}

/* Every frame, ask the audio clock where the music is and draw that. */
function frame() {
  stage.update(engine.heardBeats());
  requestAnimationFrame(frame);
}

/* ---------- Wiring ---------- */

start.querySelector("button")!.addEventListener("click", async () => {
  start.hidden = true;
  await togglePlay();
  playBtn.focus();
});

playBtn.addEventListener("click", () => void togglePlay());
slider.addEventListener("input", () => setBpm(slider.value));
tempo.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
  b.addEventListener("click", () => setBpm(bpm + Number(b.dataset.step))),
);
ballToggle.addEventListener("click", () => {
  ballOn = !ballOn;
  save("ball", ballOn);
  showBall();
});

// Space plays and stops from anywhere. It is caught on key down and key up,
// so a focused button does not also click.
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) {
      start.hidden = true;
      void togglePlay();
    }
  } else if ((e.key === "ArrowUp" || e.key === "ArrowRight") && e.target !== slider) {
    e.preventDefault();
    setBpm(bpm + (e.shiftKey ? 5 : 1));
  } else if ((e.key === "ArrowDown" || e.key === "ArrowLeft") && e.target !== slider) {
    e.preventDefault();
    setBpm(bpm - (e.shiftKey ? 5 : 1));
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space") e.preventDefault();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && engine.playing) void holdScreen(true);
});

// ?debug exposes the engine to the browser check script (scripts/check.mjs).
if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __ir: { engine, stage } });

showTempo();
showBall();
showPlaying();
stage.reset();
requestAnimationFrame(frame);
